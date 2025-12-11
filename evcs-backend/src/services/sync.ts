import { config } from '../config/env';
import {
  getActiveTransactions,
  getAllChargePoints,
  getUserByTag,
  getTransactionMeterValues,
  SteveTransaction,
} from './steve';
import { sendNotificationToUser, registerDeviceToken } from './notifications';
import { db } from './db';

interface TransactionCache {
  [key: string]: {
    transactionPk: number;
    notificationSent: boolean;
    lastEnergyValue?: number;
  };
}

const transactionCache: TransactionCache = {};
let pollingInterval: NodeJS.Timeout | null = null;

/**
 * Initialize polling of Steve database
 */
export function initializePolling() {
  console.log(`🔄 Initializing transaction polling (interval: ${config.polling.intervalMs}ms)`);

  // Run once immediately
  pollTransactions().catch(err => console.error('Initial polling error:', err));

  // Run periodically
  pollingInterval = setInterval(() => {
    pollTransactions().catch(err => console.error('Polling error:', err));
  }, config.polling.intervalMs);
}

/**
 * Stop polling
 */
export function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    console.log('🛑 Transaction polling stopped');
  }
}

/**
 * Poll Steve database for new/active transactions
 */
async function pollTransactions() {
  try {
    const transactions = await getActiveTransactions();

    for (const transaction of transactions) {
      const txKey = `${transaction.transaction_pk}`;

      // Check if this is a new transaction
      if (!transactionCache[txKey]) {
        await handleNewTransaction(transaction);
        transactionCache[txKey] = {
          transactionPk: transaction.transaction_pk,
          notificationSent: true,
          lastEnergyValue: transaction.startValue ? parseFloat(transaction.startValue) : 0,
        };
      } else {
        // Check for updates on ongoing transaction
        await handleTransactionUpdate(transaction);
      }
    }

    // Check for completed transactions
    await handleCompletedTransactions();
  } catch (error) {
    console.error('❌ Error during transaction polling:', error);
  }
}

/**
 * Handle new transaction start
 */
async function handleNewTransaction(transaction: SteveTransaction) {
  console.log(`⚡ New transaction detected: ${transaction.transaction_pk} (${transaction.idTag})`);

  const user = await getUserByTag(transaction.idTag);

  if (user) {
    // Send start notification
    await sendNotificationToUser({
      userId: transaction.idTag,
      title: '⚡ Carga iniciada',
      body: `Tu sesión de carga ha comenzado en el punto ${transaction.charge_box_id}`,
    });

    // Save transaction event
    try {
      await db.query(
        `INSERT INTO transaction_events (transaction_id, event_type, charge_point_id, user_tag, event_data, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          transaction.transaction_pk,
          'START',
          transaction.charge_box_id,
          transaction.idTag,
          JSON.stringify({
            startValue: transaction.startValue,
            timestamp: transaction.startTimestamp,
          }),
        ]
      );
    } catch (error) {
      console.error('Error saving transaction event:', error);
    }

    console.log(`✅ Notification sent for transaction ${transaction.transaction_pk}`);
  }
}

/**
 * Handle transaction updates (e.g., progress)
 */
async function handleTransactionUpdate(transaction: SteveTransaction) {
  const txKey = `${transaction.transaction_pk}`;
  const cache = transactionCache[txKey];

  if (!cache) return;

  // Get meter values to check progress
  const meterValues = await getTransactionMeterValues(transaction.transaction_pk);

  if (Array.isArray(meterValues) && meterValues.length > 0) {
    const latestValue = meterValues[0] as any;
    const currentEnergy = latestValue.value ? parseFloat(latestValue.value) : 0;

    // Send progress notification if significant change
    if (currentEnergy > (cache.lastEnergyValue || 0) + 5) {
      const user = await getUserByTag(transaction.idTag);
      if (user) {
        await sendNotificationToUser({
          userId: transaction.idTag,
          title: '📊 Carga en progreso',
          body: `Energía cargada: ${currentEnergy.toFixed(2)} kWh`,
        });

        cache.lastEnergyValue = currentEnergy;
        console.log(`📊 Progress notification sent for transaction ${transaction.transaction_pk}`);
      }
    }
  }
}

/**
 * Handle completed transactions
 */
async function handleCompletedTransactions() {
  // Get all cached transactions
  const cachedTxKeys = Object.keys(transactionCache);

  // Get current active transactions
  const activeTransactions = await getActiveTransactions();
  const activeTxIds = new Set(activeTransactions.map(t => `${t.transaction_pk}`));

  // Find completed transactions
  for (const txKey of cachedTxKeys) {
    if (!activeTxIds.has(txKey)) {
      const transaction = await getCompletedTransaction(parseInt(txKey));

      if (transaction) {
        await handleCompletedTransaction(transaction);
      }

      // Remove from cache
      delete transactionCache[txKey];
    }
  }
}

/**
 * Get completed transaction from Steve
 */
async function getCompletedTransaction(transactionPk: number): Promise<SteveTransaction | null> {
  try {
    const [rows] = await (await import('./steve')).steveDb.query(`
      SELECT 
        t.transaction_pk,
        t.connector_pk,
        t.idTag,
        t.startTimestamp,
        t.startValue,
        t.stopTimestamp,
        t.stopValue,
        cb.charge_box_id
      FROM transaction t
      JOIN connector c ON t.connector_pk = c.connector_pk
      JOIN charge_box cb ON c.charge_box_id = cb.charge_box_id
      WHERE t.transaction_pk = ? AND t.stopTimestamp IS NOT NULL
      LIMIT 1
    `, [transactionPk]);

    return (rows as any[]).length > 0 ? (rows as any[])[0] : null;
  } catch (error) {
    console.error('Error fetching completed transaction:', error);
    return null;
  }
}

/**
 * Handle transaction completion
 */
async function handleCompletedTransaction(transaction: SteveTransaction) {
  console.log(`✅ Transaction completed: ${transaction.transaction_pk}`);

  const user = await getUserByTag(transaction.idTag);

  if (user) {
    const energyDelivered = transaction.stopValue
      ? (parseFloat(transaction.stopValue) - (parseFloat(transaction.startValue || '0'))) / 1000
      : 0;

    // Send completion notification
    await sendNotificationToUser({
      userId: transaction.idTag,
      title: '✅ Carga completada',
      body: `Sesión finalizada en ${transaction.charge_box_id}. Energía: ${energyDelivered.toFixed(2)} kWh`,
    });

    // Save transaction event
    try {
      await db.query(
        `INSERT INTO transaction_events (transaction_id, event_type, charge_point_id, user_tag, event_data, created_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          transaction.transaction_pk,
          'STOP',
          transaction.charge_box_id,
          transaction.idTag,
          JSON.stringify({
            stopValue: transaction.stopValue,
            energyDelivered: energyDelivered,
            duration: new Date(transaction.stopTimestamp!).getTime() - new Date(transaction.startTimestamp).getTime(),
            timestamp: transaction.stopTimestamp,
          }),
        ]
      );
    } catch (error) {
      console.error('Error saving transaction event:', error);
    }

    console.log(`✅ Completion notification sent for transaction ${transaction.transaction_pk}`);
  }
}

/**
 * Get polling status
 */
export function getPollingStatus() {
  return {
    isActive: pollingInterval !== null,
    cachedTransactions: Object.keys(transactionCache).length,
    intervalMs: config.polling.intervalMs,
  };
}
