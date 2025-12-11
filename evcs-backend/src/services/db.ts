import mysql from 'mysql2/promise';
import { config } from '../config/env';

export const db = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test connection on startup
db.getConnection()
  .then((conn) => {
    console.log('✅ Database pool initialized successfully');
    conn.release();
  })
  .catch((error) => {
    console.error('❌ Failed to initialize database pool:', error);
  });

