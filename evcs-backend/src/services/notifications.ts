import fetch from 'node-fetch';
import { config } from '../config/env';
import { db } from './db';

const FCM_URL = "https://fcm.googleapis.com/fcm/send";

export async function sendPushNotification({ 
  title, 
  body, 
  token 
}: { 
  title: string; 
  body: string; 
  token: string 
}) {
  if (!config.fcm.serverKey || config.fcm.serverKey.startsWith('your_')) {
    console.error('⚠️ FCM Server Key not configured.');
    return {
      success: false,
      error: 'FCM Server Key not configured'
    };
  }

  const message = {
    to: token,
    notification: { title, body },
    data: {
      timestamp: new Date().toISOString(),
    },
  };

  try {
    const response = await fetch(FCM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${config.fcm.serverKey}`,
      },
      body: JSON.stringify(message),
    });

    const data = await response.json() as { failure?: number; success?: number; [key: string]: any };

    if (data?.failure) {
      console.error('❌ Failed to send FCM notification:', data);
      return {
        success: false,
        error: 'FCM delivery failed',
        details: data
      };
    } else {
      console.log('✅ FCM notification sent successfully:', data);
      return {
        success: true,
        details: data
      };
    }
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error);
    return {
      success: false,
      error: 'Network error',
      details: error
    };
  }
}

export async function sendNotificationToUser({ 
  userId, 
  title, 
  body 
}: { 
  userId: string; 
  title: string; 
  body: string 
}) {
  try {
    // Get user's active device tokens
    const [tokens] = await db.query(
      'SELECT id, token FROM device_tokens WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if ((tokens as any[]).length === 0) {
      console.warn(`⚠️ No active device tokens found for user ${userId}`);
      return {
        success: false,
        error: 'No active device tokens found'
      };
    }

    // Send to all devices
    const results = [];
    for (const { id, token } of tokens as any[]) {
      const result = await sendPushNotification({ title, body, token });
      
      // Log notification
      await db.query(
        'INSERT INTO notifications_log (device_token_id, title, body, status) VALUES (?, ?, ?, ?)',
        [id, title, body, result.success ? 'Sent' : 'Failed']
      );

      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`📤 Sent notifications to ${successCount}/${results.length} devices`);

    return {
      success: successCount > 0,
      sent: successCount,
      failed: results.length - successCount
    };
  } catch (error) {
    console.error('❌ Error sending notification to user:', error);
    return {
      success: false,
      error: 'Internal error'
    };
  }
}

export async function registerDeviceToken({ 
  userId, 
  token, 
  deviceName 
}: { 
  userId: string; 
  token: string; 
  deviceName?: string 
}) {
  try {
    // Check if token already exists
    const [existing] = await db.query(
      'SELECT id FROM device_tokens WHERE token = ?',
      [token]
    );

    if ((existing as any[]).length > 0) {
      // Update last used
      await db.query(
        'UPDATE device_tokens SET last_used = CURRENT_TIMESTAMP WHERE token = ?',
        [token]
      );
      console.log('📱 Device token updated');
      return { success: true, action: 'updated' };
    }

    // Register new token
    await db.query(
      'INSERT INTO device_tokens (user_id, token, device_name) VALUES (?, ?, ?)',
      [userId, token, deviceName || 'Unknown Device']
    );

    console.log('✅ Device token registered successfully');
    return { success: true, action: 'created' };
  } catch (error) {
    console.error('❌ Error registering device token:', error);
    return { success: false, error: 'Internal error' };
  }
}
