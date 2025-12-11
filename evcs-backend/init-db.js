const mysql = require('mysql2/promise');

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evcs_db'
  });

  const tables = [
    `CREATE TABLE IF NOT EXISTS charge_points (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Unavailable',
      last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      charge_point_id VARCHAR(255),
      user_id VARCHAR(255),
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      stop_time TIMESTAMP NULL,
      status VARCHAR(50) DEFAULT 'Active',
      energy_delivered DECIMAL(10, 3) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (charge_point_id) REFERENCES charge_points(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS transaction_events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id INT,
      event_type VARCHAR(50),
      event_data JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255),
      fcm_token VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(255),
      title VARCHAR(255),
      body TEXT,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`
  ];

  try {
    for (const table of tables) {
      await connection.query(table);
      console.log('✅ Tabla creada');
    }
    console.log('✅ Base de datos inicializada correctamente');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await connection.end();
  }
}

initializeDatabase();
