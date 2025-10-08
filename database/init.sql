-- Script d'initialisation de la base de données SQLite pour BazarKELY PWA
-- Compatible avec OVH Web Cloud

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    preferences TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des comptes
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'MGA',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT,
    type TEXT NOT NULL,
    category TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'MGA',
    description TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    tags TEXT DEFAULT '[]',
    location TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
);

-- Table des budgets
CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    limit_amount REAL NOT NULL,
    current_spent REAL DEFAULT 0,
    currency TEXT DEFAULT 'MGA',
    period TEXT DEFAULT 'monthly',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des objectifs
CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'MGA',
    target_date DATE,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table des catégories de transactions
CREATE TABLE IF NOT EXISTS transaction_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    bg_color TEXT,
    is_active BOOLEAN DEFAULT 1
);

-- Table des types de comptes
CREATE TABLE IF NOT EXISTS account_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    bg_color TEXT,
    is_active BOOLEAN DEFAULT 1
);

-- Insertion des catégories de transactions
INSERT OR IGNORE INTO transaction_categories (id, name, icon, color, bg_color) VALUES
('alimentation', 'Alimentation', 'ShoppingCart', 'text-orange-600', 'bg-orange-50'),
('transport', 'Transport', 'Car', 'text-blue-600', 'bg-blue-50'),
('logement', 'Logement', 'Home', 'text-green-600', 'bg-green-50'),
('sante', 'Santé', 'Heart', 'text-red-600', 'bg-red-50'),
('education', 'Éducation', 'BookOpen', 'text-purple-600', 'bg-purple-50'),
('loisirs', 'Loisirs', 'Gamepad2', 'text-pink-600', 'bg-pink-50'),
('vetements', 'Vêtements', 'Shirt', 'text-indigo-600', 'bg-indigo-50'),
('communication', 'Communication', 'Phone', 'text-cyan-600', 'bg-cyan-50'),
('autres', 'Autres', 'MoreHorizontal', 'text-gray-600', 'bg-gray-50');

-- Insertion des types de comptes
INSERT OR IGNORE INTO account_types (id, name, icon, color, bg_color) VALUES
('especes', 'Espèces', 'Wallet', 'text-green-600', 'bg-green-50'),
('courant', 'Compte Courant', 'CreditCard', 'text-blue-600', 'bg-blue-50'),
('epargne', 'Épargne', 'PiggyBank', 'text-yellow-600', 'bg-yellow-50'),
('orange_money', 'Orange Money', 'Smartphone', 'text-orange-600', 'bg-orange-50'),
('mvola', 'MVola', 'Smartphone', 'text-purple-600', 'bg-purple-50'),
('airtel_money', 'Airtel Money', 'Smartphone', 'text-red-600', 'bg-red-50');

-- Insertion d'un utilisateur de test
INSERT OR IGNORE INTO users (id, username, email, phone, password, role, preferences) VALUES
('user-test-001', 'testuser', 'test@example.com', '+261 34 12 345 67', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', '{"theme":"system","language":"fr","currency":"MGA"}');

-- Insertion de comptes de test
INSERT OR IGNORE INTO accounts (id, user_id, name, type, balance, currency) VALUES
('acc-test-001', 'user-test-001', 'Compte Principal', 'courant', 150000, 'MGA'),
('acc-test-002', 'user-test-001', 'Épargne', 'epargne', 500000, 'MGA'),
('acc-test-003', 'user-test-001', 'Orange Money', 'orange_money', 2500000, 'MGA');

-- Insertion de transactions de test
INSERT OR IGNORE INTO transactions (id, user_id, account_id, type, category, amount, currency, description, tags, location) VALUES
('tx-test-001', 'user-test-001', 'acc-test-001', 'expense', 'alimentation', 15000, 'MGA', 'Achat de riz et légumes', '["courses","alimentation"]', 'Antananarivo'),
('tx-test-002', 'user-test-001', 'acc-test-001', 'income', 'autres', 500000, 'MGA', 'Salaire du mois', '["travail","salaire"]', 'Antananarivo'),
('tx-test-003', 'user-test-001', 'acc-test-001', 'expense', 'transport', 2000, 'MGA', 'Ticket de bus', '["déplacement","transport"]', 'Antananarivo'),
('tx-test-004', 'user-test-001', 'acc-test-002', 'expense', 'logement', 150000, 'MGA', 'Loyer du mois', '["logement","loyer"]', 'Antananarivo'),
('tx-test-005', 'user-test-001', 'acc-test-003', 'expense', 'communication', 5000, 'MGA', 'Recharge Orange Money', '["communication","recharge"]', 'Antananarivo');

-- Insertion de budgets de test
INSERT OR IGNORE INTO budgets (id, user_id, name, category, limit_amount, currency, period) VALUES
('budget-test-001', 'user-test-001', 'Budget Alimentation', 'alimentation', 100000, 'MGA', 'monthly'),
('budget-test-002', 'user-test-001', 'Budget Transport', 'transport', 50000, 'MGA', 'monthly'),
('budget-test-003', 'user-test-001', 'Budget Logement', 'logement', 200000, 'MGA', 'monthly');

-- Insertion d'objectifs de test
INSERT OR IGNORE INTO goals (id, user_id, name, description, target_amount, currency, target_date) VALUES
('goal-test-001', 'user-test-001', 'Vacances', 'Épargner pour les vacances', 1000000, 'MGA', '2025-12-31'),
('goal-test-002', 'user-test-001', 'Urgence', 'Fonds d\'urgence', 500000, 'MGA', '2025-06-30');

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

-- Vues pour les statistiques
CREATE VIEW IF NOT EXISTS user_stats AS
SELECT 
    u.id as user_id,
    u.username,
    COUNT(DISTINCT a.id) as total_accounts,
    COALESCE(SUM(a.balance), 0) as total_balance,
    COUNT(DISTINCT t.id) as total_transactions,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as net_income
FROM users u
LEFT JOIN accounts a ON u.id = a.user_id AND a.is_active = 1
LEFT JOIN transactions t ON u.id = t.user_id
GROUP BY u.id, u.username;

-- Vues pour les budgets
CREATE VIEW IF NOT EXISTS budget_progress AS
SELECT 
    b.id,
    b.user_id,
    b.name,
    b.category,
    b.limit_amount,
    b.current_spent,
    b.currency,
    b.period,
    CASE 
        WHEN b.limit_amount > 0 THEN (b.current_spent / b.limit_amount) * 100
        ELSE 0
    END as progress_percentage,
    b.limit_amount - b.current_spent as remaining_amount
FROM budgets b
WHERE b.is_active = 1;

-- Vues pour les objectifs
CREATE VIEW IF NOT EXISTS goal_progress AS
SELECT 
    g.id,
    g.user_id,
    g.name,
    g.description,
    g.target_amount,
    g.current_amount,
    g.currency,
    g.target_date,
    CASE 
        WHEN g.target_amount > 0 THEN (g.current_amount / g.target_amount) * 100
        ELSE 0
    END as progress_percentage,
    g.target_amount - g.current_amount as remaining_amount,
    CASE 
        WHEN g.target_date IS NOT NULL THEN 
            CASE 
                WHEN date(g.target_date) < date('now') THEN 'overdue'
                WHEN date(g.target_date) <= date('now', '+30 days') THEN 'due_soon'
                ELSE 'on_track'
            END
        ELSE 'no_deadline'
    END as status
FROM goals g
WHERE g.is_active = 1;














