-- Script de configuration MySQL pour BazarKELY sur OVH Web Cloud
-- À exécuter dans phpMyAdmin ou via ligne de commande MySQL

-- Créer la base de données
CREATE DATABASE IF NOT EXISTS bazarkely_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Créer l'utilisateur (remplacer 'your_password' par un mot de passe sécurisé)
CREATE USER IF NOT EXISTS 'bazarkely_user'@'localhost' IDENTIFIED BY 'BazarKELY2024!';

-- Accorder les privilèges
GRANT ALL PRIVILEGES ON bazarkely_db.* TO 'bazarkely_user'@'localhost';
FLUSH PRIVILEGES;

-- Utiliser la base de données
USE bazarkely_db;

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('user', 'admin') DEFAULT 'user',
    preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_sync TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- Table des comptes
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('courant', 'epargne', 'orange_money', 'airtel_money', 'mvola') NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'MGA',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type)
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    type ENUM('income', 'expense', 'transfer') NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (account_id),
    INDEX idx_date (date),
    INDEX idx_type (type)
);

-- Table des budgets
CREATE TABLE IF NOT EXISTS budgets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    spent DECIMAL(15,2) DEFAULT 0.00,
    period ENUM('monthly', 'weekly', 'yearly') DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category)
);

-- Table des objectifs
CREATE TABLE IF NOT EXISTS goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    current_amount DECIMAL(15,2) DEFAULT 0.00,
    target_date DATE,
    category VARCHAR(50),
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_category (category)
);

-- Table des configurations de frais
CREATE TABLE IF NOT EXISTS fee_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_type VARCHAR(50) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    fee_amount DECIMAL(10,2) NOT NULL,
    fee_percentage DECIMAL(5,2) DEFAULT 0.00,
    min_amount DECIMAL(10,2) DEFAULT 0.00,
    max_amount DECIMAL(10,2) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_type (account_type),
    INDEX idx_transaction_type (transaction_type)
);

-- Insérer des données de test
INSERT IGNORE INTO users (id, username, email, password_hash, phone, role, preferences) VALUES 
(1, 'testuser', 'test@bazarkely.mg', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+261340000000', 'user', '{"theme":"system","language":"fr","currency":"MGA"}');

INSERT IGNORE INTO accounts (id, user_id, name, type, balance, currency) VALUES 
(1, 1, 'Compte Principal', 'courant', 100000.00, 'MGA'),
(2, 1, 'Épargne', 'epargne', 50000.00, 'MGA'),
(3, 1, 'Orange Money', 'orange_money', 25000.00, 'MGA');

INSERT IGNORE INTO transactions (id, user_id, account_id, amount, type, category, description, date) VALUES 
(1, 1, 1, 50000.00, 'income', 'salaire', 'Salaire du mois', CURDATE()),
(2, 1, 1, -15000.00, 'expense', 'alimentation', 'Courses alimentaires', CURDATE()),
(3, 1, 2, 10000.00, 'income', 'epargne', 'Épargne mensuelle', CURDATE());

INSERT IGNORE INTO budgets (id, user_id, name, category, amount, spent, period, start_date) VALUES 
(1, 1, 'Budget Alimentation', 'alimentation', 50000.00, 15000.00, 'monthly', DATE_FORMAT(CURDATE(), '%Y-%m-01')),
(2, 1, 'Budget Transport', 'transport', 20000.00, 5000.00, 'monthly', DATE_FORMAT(CURDATE(), '%Y-%m-01'));

INSERT IGNORE INTO goals (id, user_id, name, target_amount, current_amount, target_date, category, description) VALUES 
(1, 1, 'Vacances', 500000.00, 100000.00, DATE_ADD(CURDATE(), INTERVAL 6 MONTH), 'epargne', 'Épargne pour les vacances'),
(2, 1, 'Études', 1000000.00, 200000.00, DATE_ADD(CURDATE(), INTERVAL 1 YEAR), 'education', 'Fonds pour les études');

INSERT IGNORE INTO fee_configurations (id, account_type, transaction_type, fee_amount, fee_percentage, min_amount, is_active) VALUES 
(1, 'courant', 'transfer', 500.00, 0.00, 1000.00, TRUE),
(2, 'orange_money', 'transfer', 100.00, 0.00, 100.00, TRUE),
(3, 'airtel_money', 'transfer', 100.00, 0.00, 100.00, TRUE);

-- Afficher un message de confirmation
SELECT 'Base de données BazarKELY configurée avec succès!' as message;
























