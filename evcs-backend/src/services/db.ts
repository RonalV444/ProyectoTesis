import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'TU_USUARIO',
  password: process.env.DB_PASSWORD || 'TU_PASSWORD',
  database: process.env.DB_DATABASE || 'TU_BD',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});
