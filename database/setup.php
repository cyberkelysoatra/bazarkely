<?php
/**
 * Script de configuration de la base de données pour BazarKELY PWA
 * Compatible avec OVH Web Cloud
 */

// Configuration
$dbPath = '/tmp/bazarkely.db';
$initSqlFile = __DIR__ . '/init.sql';

// Headers pour l'API
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Gestion des requêtes OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Vérifier que SQLite est disponible
    if (!extension_loaded('pdo_sqlite')) {
        throw new Exception('Extension PDO SQLite non disponible');
    }
    
    // Créer le répertoire si nécessaire
    $dbDir = dirname($dbPath);
    if (!is_dir($dbDir)) {
        if (!mkdir($dbDir, 0755, true)) {
            throw new Exception('Impossible de créer le répertoire de base de données');
        }
    }
    
    // Vérifier les permissions d'écriture
    if (!is_writable($dbDir)) {
        throw new Exception('Permissions insuffisantes pour écrire dans le répertoire de base de données');
    }
    
    // Ouvrir la base de données
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Vérifier si le fichier SQL d'initialisation existe
    if (!file_exists($initSqlFile)) {
        throw new Exception('Fichier d\'initialisation SQL non trouvé: ' . $initSqlFile);
    }
    
    // Lire et exécuter le script SQL
    $sql = file_get_contents($initSqlFile);
    if ($sql === false) {
        throw new Exception('Impossible de lire le fichier d\'initialisation SQL');
    }
    
    // Diviser le script en requêtes individuelles
    $queries = array_filter(array_map('trim', explode(';', $sql)));
    
    $executedQueries = 0;
    $errors = [];
    
    foreach ($queries as $query) {
        if (empty($query) || strpos($query, '--') === 0) {
            continue;
        }
        
        try {
            $pdo->exec($query);
            $executedQueries++;
        } catch (PDOException $e) {
            $errors[] = [
                'query' => substr($query, 0, 100) . '...',
                'error' => $e->getMessage()
            ];
        }
    }
    
    // Vérifier que les tables ont été créées
    $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
    
    // Vérifier les données de test
    $userCount = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $accountCount = $pdo->query("SELECT COUNT(*) FROM accounts")->fetchColumn();
    $transactionCount = $pdo->query("SELECT COUNT(*) FROM transactions")->fetchColumn();
    
    // Informations sur la base de données
    $dbInfo = [
        'path' => $dbPath,
        'size' => file_exists($dbPath) ? filesize($dbPath) : 0,
        'tables' => $tables,
        'data' => [
            'users' => (int)$userCount,
            'accounts' => (int)$accountCount,
            'transactions' => (int)$transactionCount
        ]
    ];
    
    // Réponse de succès
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Base de données configurée avec succès',
        'database' => $dbInfo,
        'execution' => [
            'queries_executed' => $executedQueries,
            'errors' => $errors
        ],
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Réponse d'erreur
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => [
            'code' => 'SETUP_ERROR',
            'message' => $e->getMessage()
        ],
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
?>
















