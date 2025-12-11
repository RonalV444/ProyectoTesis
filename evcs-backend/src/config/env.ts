import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  ocppPort: parseInt(process.env.OCPP_PORT || '9220', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Primary Database (Notifications)
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || undefined,
    database: process.env.DB_DATABASE || 'evcs_db',
  },

  // Steve Database (Charge Points & Transactions)
  steveDb: {
    host: process.env.STEVE_DB_HOST || 'localhost',
    user: process.env.STEVE_DB_USER || 'steve',
    password: process.env.STEVE_DB_PASSWORD || undefined,
    database: process.env.STEVE_DB_DATABASE || 'stevedb',
  },

  // Firebase
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY || '',
  },

  // Polling
  polling: {
    intervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '5000', 10),
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Validation
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validar configuración crítica en producción
if (config.isProduction) {
  if (!config.fcm.serverKey) {
    console.warn('⚠️ FCM_SERVER_KEY no configurado en producción');
  }
}

