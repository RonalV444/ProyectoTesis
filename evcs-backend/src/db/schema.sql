-- Create database
CREATE DATABASE IF NOT EXISTS evcs_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE evcs_db;

-- Device Tokens Table (para notificaciones push)
CREATE TABLE IF NOT EXISTS device_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  token TEXT NOT NULL UNIQUE COMMENT 'Firebase Cloud Messaging token',
  device_name VARCHAR(255) COMMENT 'Device name/model',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications Log Table
CREATE TABLE IF NOT EXISTS notifications_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_token_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('Sent', 'Failed', 'Pending') DEFAULT 'Pending',
  error_message TEXT,
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (device_token_id) REFERENCES device_tokens(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transaction Events Table (para tracking de eventos de Steve)
CREATE TABLE IF NOT EXISTS transaction_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL COMMENT 'Reference to Steve transaction_pk',
  event_type ENUM('START', 'STOP', 'PROGRESS', 'ERROR') NOT NULL,
  charge_point_id VARCHAR(255) NOT NULL COMMENT 'Reference to Steve charge_box_id',
  user_tag VARCHAR(36) NOT NULL COMMENT 'Reference to Steve user idTag',
  event_data JSON COMMENT 'Event details in JSON format',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_charge_point_id (charge_point_id),
  INDEX idx_user_tag (user_tag),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Polling Status Table (para track del estado de sincronización)
CREATE TABLE IF NOT EXISTS polling_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  last_poll_time TIMESTAMP NULL,
  transactions_processed INT DEFAULT 0,
  last_error TEXT,
  status ENUM('ACTIVE', 'PAUSED', 'ERROR') DEFAULT 'ACTIVE',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_id (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial polling status
INSERT IGNORE INTO polling_status (id, status) VALUES (1, 'ACTIVE');
