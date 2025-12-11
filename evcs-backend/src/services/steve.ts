import mysql from 'mysql2/promise';
import { config } from '../config/env';

// Conexión a Steve DB
export const steveDb = mysql.createPool({
  host: config.steveDb.host,
  user: config.steveDb.user,
  password: config.steveDb.password,
  database: config.steveDb.database,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Inicializar conexión
steveDb.getConnection()
  .then((conn) => {
    console.log('✅ Steve database pool initialized successfully');
    conn.release();
  })
  .catch((error) => {
    console.error('❌ Failed to initialize Steve database pool:', error);
  });

// Interfaces
export interface SteveChargePoint {
  charge_box_pk: number;
  charge_box_id: string;
  charge_point_vendor?: string;
  charge_point_model?: string;
  fw_version?: string;
  registration_status: string;
  last_heartbeat_timestamp?: string;
  location_latitude?: number;
  location_longitude?: number;
}

export interface SteveTransaction {
  transaction_pk: number;
  connector_pk: number;
  idTag: string;
  startTimestamp: string;
  startValue?: string;
  stopTimestamp?: string;
  stopValue?: string;
  charge_box_id?: string;
}

export interface SteveUser {
  user_pk: number;
  idTag: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  inTransaction: boolean;
}

// Service Functions

/**
 * Get all charge points from Steve
 */
export async function getAllChargePoints(): Promise<SteveChargePoint[]> {
  try {
    const [rows] = await steveDb.query('SELECT * FROM charge_box');
    return rows as SteveChargePoint[];
  } catch (error) {
    console.error('Error fetching charge points from Steve:', error);
    return [];
  }
}

/**
 * Get charge point by ID
 */
export async function getChargePointById(chargeBoxId: string): Promise<SteveChargePoint | null> {
  try {
    const [rows] = await steveDb.query(
      'SELECT * FROM charge_box WHERE charge_box_id = ?',
      [chargeBoxId]
    );
    const result = rows as SteveChargePoint[];
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Error fetching charge point ${chargeBoxId}:`, error);
    return null;
  }
}

/**
 * Get all active transactions
 */
export async function getActiveTransactions(): Promise<SteveTransaction[]> {
  try {
    const [rows] = await steveDb.query(`
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
      WHERE t.stopTimestamp IS NULL
      ORDER BY t.startTimestamp DESC
    `);
    return rows as SteveTransaction[];
  } catch (error) {
    console.error('Error fetching active transactions:', error);
    return [];
  }
}

/**
 * Get all transactions (completed and active)
 */
export async function getAllTransactions(limit: number = 100): Promise<SteveTransaction[]> {
  try {
    const [rows] = await steveDb.query(`
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
      ORDER BY t.startTimestamp DESC
      LIMIT ?
    `, [limit]);
    return rows as SteveTransaction[];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Get transactions for a specific charge point
 */
export async function getTransactionsByChargePoint(
  chargeBoxId: string,
  limit: number = 50
): Promise<SteveTransaction[]> {
  try {
    const [rows] = await steveDb.query(`
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
      WHERE cb.charge_box_id = ?
      ORDER BY t.startTimestamp DESC
      LIMIT ?
    `, [chargeBoxId, limit]);
    return rows as SteveTransaction[];
  } catch (error) {
    console.error(`Error fetching transactions for ${chargeBoxId}:`, error);
    return [];
  }
}

/**
 * Get user by RFID tag
 */
export async function getUserByTag(idTag: string): Promise<SteveUser | null> {
  try {
    const [rows] = await steveDb.query(
      'SELECT user_pk, idTag, firstName, lastName, email, phone, inTransaction FROM user WHERE idTag = ?',
      [idTag]
    );
    const result = rows as any[];
    if (result.length > 0) {
      return {
        user_pk: result[0].user_pk,
        idTag: result[0].idTag,
        firstName: result[0].firstName,
        lastName: result[0].lastName,
        email: result[0].email,
        phone: result[0].phone,
        inTransaction: result[0].inTransaction === 1,
      };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user ${idTag}:`, error);
    return null;
  }
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<SteveUser[]> {
  try {
    const [rows] = await steveDb.query(
      'SELECT user_pk, idTag, firstName, lastName, email, phone, inTransaction FROM user'
    );
    return (rows as any[]).map(row => ({
      user_pk: row.user_pk,
      idTag: row.idTag,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      inTransaction: row.inTransaction === 1,
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

/**
 * Get users currently in transaction
 */
export async function getUsersInTransaction(): Promise<SteveUser[]> {
  try {
    const [rows] = await steveDb.query(
      'SELECT user_pk, idTag, firstName, lastName, email, phone, inTransaction FROM user WHERE inTransaction = TRUE'
    );
    return (rows as any[]).map(row => ({
      user_pk: row.user_pk,
      idTag: row.idTag,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      inTransaction: row.inTransaction === 1,
    }));
  } catch (error) {
    console.error('Error fetching users in transaction:', error);
    return [];
  }
}

/**
 * Get meter values for a transaction
 */
export async function getTransactionMeterValues(transactionPk: number) {
  try {
    const [rows] = await steveDb.query(`
      SELECT 
        cmv.valueTimestamp,
        cmv.value,
        cmv.readingContext,
        cmv.format,
        cmv.measurand,
        cmv.unit,
        cmv.location,
        cmv.phase
      FROM connector_metervalue cmv
      WHERE cmv.transaction_pk = ?
      ORDER BY cmv.valueTimestamp DESC
      LIMIT 10
    `, [transactionPk]);
    return rows;
  } catch (error) {
    console.error('Error fetching meter values:', error);
    return [];
  }
}

/**
 * Get recent status updates for a charge point
 */
export async function getChargePointStatusUpdates(chargeBoxId: string, minutes: number = 60) {
  try {
    const [rows] = await steveDb.query(`
      SELECT 
        cs.connector_pk,
        cs.status,
        cs.timestamp,
        c.connector_id
      FROM connector_status cs
      JOIN connector c ON cs.connector_pk = c.connector_pk
      WHERE c.charge_box_id = ? 
        AND cs.timestamp > DATE_SUB(NOW(), INTERVAL ? MINUTE)
      ORDER BY cs.timestamp DESC
    `, [chargeBoxId, minutes]);
    return rows;
  } catch (error) {
    console.error('Error fetching status updates:', error);
    return [];
  }
}
