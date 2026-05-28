-- SQL скрипт для создания базы данных и таблиц
-- Для MySQL/MariaDB

-- Создаем базу данных
CREATE DATABASE IF NOT EXISTS drupal_coder_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Используем базу данных
USE drupal_coder_db;

-- Таблица пользователей (для авторизации)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  login VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Таблица отправок формы "Связь с нами"
CREATE TABLE IF NOT EXISTS contact_forms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  message TEXT,
  form_type VARCHAR(100) DEFAULT 'footer_contact',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Пример данных для тестирования (опционально)
-- INSERT INTO users (login, password_hash) VALUES 
-- ('test_user', '$2a$10$...'); -- хеш пароля нужно сгенерировать через bcrypt
