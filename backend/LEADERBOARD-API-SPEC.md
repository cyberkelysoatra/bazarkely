# 🏆 LEADERBOARD API SPECIFICATION - BazarKELY
## Spécification API pour le Système de Classement

**Version:** 1.0  
**Date:** 2025-10-17  
**Auteur:** BazarKELY Team  
**Statut:** Spécification complète pour implémentation backend

---

## 📋 RÉSUMÉ EXÉCUTIF

Cette spécification définit l'API backend pour le système de classement de BazarKELY. L'API permet de récupérer les classements des utilisateurs avec pagination, filtrage par niveau, et protection de la vie privée via pseudonymes automatiques.

### **Fonctionnalités Principales**
- Classement des utilisateurs par score total
- Pagination avec métadonnées complètes
- Filtrage par niveau de certification (1-5)
- Protection vie privée avec pseudonymes automatiques
- Cache intelligent avec TTL configurable
- Statistiques globales du classement

---

## 🔗 ENDPOINTS

### **GET /api/leaderboard**
Récupère la liste des utilisateurs classés avec pagination et filtrage.

#### **Paramètres de Requête**
| Paramètre | Type | Requis | Valeur par défaut | Description |
|-----------|------|--------|-------------------|-------------|
| `page` | integer | Non | 1 | Numéro de page (minimum 1) |
| `limit` | integer | Non | 50 | Nombre d'utilisateurs par page (1-100) |
| `levelFilter` | integer | Non | null | Filtre par niveau (1-5) |

#### **Exemple de Requête**
```http
GET /api/leaderboard?page=1&limit=50&levelFilter=3
Authorization: Bearer <jwt_token>
```

#### **Réponse Succès (200)**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "rank": 1,
        "pseudonym": "ÉconomeAstucieux",
        "totalScore": 1850,
        "currentLevel": 5,
        "badgesCount": 12,
        "certificationsCount": 5,
        "lastActivity": "2025-10-17T14:30:00Z"
      },
      {
        "rank": 2,
        "pseudonym": "BudgetMalin",
        "totalScore": 1720,
        "currentLevel": 4,
        "badgesCount": 10,
        "certificationsCount": 4,
        "lastActivity": "2025-10-17T12:15:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 25,
      "totalUsers": 1247,
      "hasNextPage": true,
      "hasPreviousPage": false,
      "limit": 50
    }
  },
  "timestamp": "2025-10-17T15:00:00Z"
}
```

### **GET /api/leaderboard/user/:userId**
Récupère le classement et les statistiques d'un utilisateur spécifique.

#### **Paramètres de Chemin**
| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `userId` | string | Oui | Identifiant unique de l'utilisateur |

#### **Exemple de Requête**
```http
GET /api/leaderboard/user/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer <jwt_token>
```

#### **Réponse Succès (200)**
```json
{
  "success": true,
  "data": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "rank": 15,
    "pseudonym": "ÉconomeAstucieux",
    "totalScore": 1850,
    "currentLevel": 5,
    "badgesCount": 12,
    "certificationsCount": 5,
    "percentile": 92.5,
    "lastActivity": "2025-10-17T14:30:00Z"
  },
  "timestamp": "2025-10-17T15:00:00Z"
}
```

### **GET /api/leaderboard/stats**
Récupère les statistiques globales du classement.

#### **Exemple de Requête**
```http
GET /api/leaderboard/stats
Authorization: Bearer <jwt_token>
```

#### **Réponse Succès (200)**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1247,
    "averageScore": 1250.5,
    "highestScore": 1850,
    "levelDistribution": {
      "1": 156,
      "2": 234,
      "3": 345,
      "4": 312,
      "5": 200
    },
    "badgesDistribution": {
      "average": 8.5,
      "max": 15
    },
    "certificationsDistribution": {
      "average": 3.2,
      "max": 5
    },
    "lastUpdated": "2025-10-17T14:45:00Z"
  },
  "timestamp": "2025-10-17T15:00:00Z"
}
```

---

## 🗄️ SCHÉMA DE BASE DE DONNÉES

### **Table: leaderboard_settings**
Configuration du système de classement.

```sql
CREATE TABLE leaderboard_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Configuration par défaut
INSERT INTO leaderboard_settings (setting_key, setting_value, description) VALUES
('cache_ttl_minutes', '5', 'Durée de vie du cache en minutes'),
('max_users_per_page', '100', 'Nombre maximum d\'utilisateurs par page'),
('default_page_size', '50', 'Taille de page par défaut'),
('pseudonym_algorithm', 'consistent_hash', 'Algorithme de génération des pseudonymes'),
('ranking_algorithm', 'total_score', 'Algorithme de classement principal');
```

### **Table: leaderboard_cache**
Cache des résultats de classement.

```sql
CREATE TABLE leaderboard_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  cache_data LONGTEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expires_at (expires_at),
  INDEX idx_cache_key (cache_key)
);
```

### **Vue: user_performance_view**
Vue agrégée des performances utilisateur pour le classement.

```sql
CREATE VIEW user_performance_view AS
SELECT 
  u.id as user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.created_at,
  u.last_login_at,
  
  -- Calcul du score total (Quiz + Pratique + Profil)
  COALESCE(quiz_scores.total_quiz_score, 0) + 
  COALESCE(practice_scores.total_practice_score, 0) + 
  COALESCE(profile_scores.total_profile_score, 0) as total_score,
  
  -- Niveau actuel
  COALESCE(cert_levels.current_level, 1) as current_level,
  
  -- Nombre de badges
  COALESCE(badge_counts.badges_count, 0) as badges_count,
  
  -- Nombre de certificats
  COALESCE(cert_counts.certifications_count, 0) as certifications_count,
  
  -- Dernière activité
  GREATEST(
    COALESCE(u.last_login_at, u.created_at),
    COALESCE(quiz_scores.last_quiz_date, u.created_at),
    COALESCE(practice_scores.last_practice_date, u.created_at)
  ) as last_activity

FROM users u

-- Scores de quiz
LEFT JOIN (
  SELECT 
    user_id,
    SUM(score) as total_quiz_score,
    MAX(completed_at) as last_quiz_date
  FROM quiz_attempts 
  WHERE status = 'completed'
  GROUP BY user_id
) quiz_scores ON u.id = quiz_scores.user_id

-- Scores de pratique
LEFT JOIN (
  SELECT 
    user_id,
    practice_score as total_practice_score,
    last_score_calculation as last_practice_date
  FROM practice_tracking
) practice_scores ON u.id = practice_scores.user_id

-- Scores de profil
LEFT JOIN (
  SELECT 
    user_id,
    CASE 
      WHEN first_name IS NOT NULL AND first_name != '' THEN 5 ELSE 0
    END +
    CASE 
      WHEN last_name IS NOT NULL AND last_name != '' THEN 5 ELSE 0
    END +
    CASE 
      WHEN phone IS NOT NULL AND phone != '' THEN 5 ELSE 0
    END as total_profile_score
  FROM user_profiles
) profile_scores ON u.id = profile_scores.user_id

-- Niveau de certification actuel
LEFT JOIN (
  SELECT 
    user_id,
    MAX(level_id) as current_level
  FROM certifications
  WHERE status = 'completed'
  GROUP BY user_id
) cert_levels ON u.id = cert_levels.user_id

-- Nombre de badges
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as badges_count
  FROM user_badges
  GROUP BY user_id
) badge_counts ON u.id = badge_counts.user_id

-- Nombre de certificats
LEFT JOIN (
  SELECT 
    user_id,
    COUNT(*) as certifications_count
  FROM certifications
  WHERE status = 'completed'
  GROUP BY user_id
) cert_counts ON u.id = cert_counts.user_id

WHERE u.status = 'active'
  AND u.email_verified = true;
```

---

## 🔐 AUTHENTIFICATION

### **JWT Token Requis**
Tous les endpoints nécessitent un token JWT valide dans l'en-tête Authorization.

```http
Authorization: Bearer <jwt_token>
```

### **Validation du Token**
- Vérification de la signature
- Vérification de l'expiration
- Vérification de l'utilisateur actif

---

## ⚡ GESTION D'ERREURS

### **Codes de Statut HTTP**

| Code | Description | Exemple |
|------|-------------|---------|
| 200 | Succès | Données récupérées avec succès |
| 400 | Requête invalide | Paramètres manquants ou invalides |
| 401 | Non autorisé | Token JWT manquant ou invalide |
| 403 | Interdit | Accès refusé |
| 404 | Non trouvé | Utilisateur ou ressource introuvable |
| 429 | Trop de requêtes | Limite de taux dépassée |
| 500 | Erreur serveur | Erreur interne du serveur |

### **Format d'Erreur**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Les paramètres de requête sont invalides",
    "details": {
      "page": "Doit être un entier positif",
      "limit": "Doit être entre 1 et 100"
    }
  },
  "timestamp": "2025-10-17T15:00:00Z"
}
```

---

## 🚦 LIMITATION DE TAUX

### **Limites par Utilisateur**
- **100 requêtes/heure** par utilisateur authentifié
- **10 requêtes/minute** pour les endpoints de statistiques
- **50 requêtes/minute** pour les endpoints de classement

### **Headers de Limitation**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 🏆 ALGORITHME DE CLASSEMENT

### **Critères de Classement**
1. **Score Total** (décroissant) - Critère principal
2. **Niveau Actuel** (décroissant) - Critère secondaire
3. **Nombre de Badges** (décroissant) - Critère tertiaire
4. **Nombre de Certificats** (décroissant) - Critère quaternaire
5. **Dernière Activité** (décroissant) - Critère de départage

### **Calcul du Score Total**
```sql
total_score = quiz_score + practice_score + profile_score

-- Quiz Score (0-40 points)
quiz_score = SUM(quiz_attempts.score) WHERE status = 'completed'

-- Practice Score (0-60 points)
practice_score = practice_tracking.practice_score

-- Profile Score (0-15 points)
profile_score = 
  CASE WHEN first_name IS NOT NULL THEN 5 ELSE 0 END +
  CASE WHEN last_name IS NOT NULL THEN 5 ELSE 0 END +
  CASE WHEN phone IS NOT NULL THEN 5 ELSE 0 END
```

---

## 🎭 GÉNÉRATION DE PSEUDONYMES

### **Algorithme de Hachage Cohérent**
```php
function generatePseudonym($userId, $salt = 'bazarkely_leaderboard_2025') {
    $hash = hash('sha256', $userId . $salt);
    $adjectives = [
        'Économe', 'Malin', 'Astucieux', 'Sage', 'Prudent', 'Habile',
        'Intelligent', 'Rusé', 'Financier', 'Budget', 'Épargnant', 'Investisseur'
    ];
    $nouns = [
        'Astucieux', 'Malin', 'Sage', 'Prudent', 'Habile', 'Intelligent',
        'Rusé', 'Financier', 'Budget', 'Épargnant', 'Investisseur', 'Expert'
    ];
    
    $adjIndex = hexdec(substr($hash, 0, 2)) % count($adjectives);
    $nounIndex = hexdec(substr($hash, 2, 2)) % count($nouns);
    
    return $adjectives[$adjIndex] . $nouns[$nounIndex];
}
```

### **Propriétés des Pseudonymes**
- **Cohérence:** Même utilisateur = même pseudonyme
- **Unicité:** Probabilité de collision < 0.1%
- **Anonymat:** Aucune information personnelle révélée
- **Lisibilité:** Format "AdjectifNom" en français

---

## 📊 STRATÉGIE DE CACHE

### **Cache à Deux Niveaux**

#### **1. Cache Application (Redis/Memcached)**
- **TTL:** 5 minutes
- **Clés:** `leaderboard:page:{page}:limit:{limit}:level:{level}`
- **Données:** Résultats complets de classement

#### **2. Cache Base de Données**
- **Table:** `leaderboard_cache`
- **TTL:** 10 minutes
- **Nettoyage:** Tâche cron toutes les 5 minutes

### **Invalidation du Cache**
- **Automatique:** Après TTL
- **Manuelle:** Via endpoint admin
- **Événements:** Nouvelle certification, mise à jour profil

---

## 🔧 IMPLÉMENTATION BACKEND

### **Technologies Recommandées**
- **Langage:** PHP 8.1+
- **Framework:** Laravel 10+ ou Symfony 6+
- **Base de données:** MySQL 8.0+
- **Cache:** Redis 6.0+
- **Queue:** Laravel Queue ou Symfony Messenger

### **Structure de Fichiers**
```
backend/
├── app/
│   ├── Http/Controllers/
│   │   └── LeaderboardController.php
│   ├── Services/
│   │   ├── LeaderboardService.php
│   │   ├── PseudonymService.php
│   │   └── CacheService.php
│   └── Models/
│       ├── LeaderboardEntry.php
│       └── UserPerformance.php
├── database/
│   ├── migrations/
│   │   ├── create_leaderboard_settings_table.php
│   │   └── create_leaderboard_cache_table.php
│   └── seeders/
│       └── LeaderboardSettingsSeeder.php
└── routes/
    └── api.php
```

### **Exemple d'Implémentation (Laravel)**
```php
<?php

namespace App\Http\Controllers;

use App\Services\LeaderboardService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class LeaderboardController extends Controller
{
    public function __construct(
        private LeaderboardService $leaderboardService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $page = $request->get('page', 1);
        $limit = min($request->get('limit', 50), 100);
        $levelFilter = $request->get('levelFilter');

        $result = $this->leaderboardService->getLeaderboard(
            $page, 
            $limit, 
            $levelFilter
        );

        return response()->json([
            'success' => true,
            'data' => $result,
            'timestamp' => now()->toISOString()
        ]);
    }

    public function user(string $userId): JsonResponse
    {
        $result = $this->leaderboardService->getUserRank($userId);

        return response()->json([
            'success' => true,
            'data' => $result,
            'timestamp' => now()->toISOString()
        ]);
    }

    public function stats(): JsonResponse
    {
        $result = $this->leaderboardService->getStats();

        return response()->json([
            'success' => true,
            'data' => $result,
            'timestamp' => now()->toISOString()
        ]);
    }
}
```

---

## 🧪 TESTS

### **Tests Unitaires**
- Génération de pseudonymes
- Calcul de scores
- Algorithme de classement
- Gestion du cache

### **Tests d'Intégration**
- Endpoints API
- Authentification JWT
- Limitation de taux
- Gestion d'erreurs

### **Tests de Performance**
- Temps de réponse < 200ms
- Charge: 1000 requêtes/minute
- Cache hit ratio > 80%

---

## 📈 MÉTRIQUES ET MONITORING

### **Métriques Clés**
- Temps de réponse par endpoint
- Taux d'erreur par type
- Utilisation du cache
- Nombre d'utilisateurs actifs

### **Alertes**
- Temps de réponse > 500ms
- Taux d'erreur > 5%
- Cache hit ratio < 70%
- Erreurs 5xx > 10/minute

---

## 🔒 SÉCURITÉ

### **Protection des Données**
- Pseudonymisation automatique
- Aucune donnée personnelle exposée
- Chiffrement des tokens JWT
- Validation stricte des entrées

### **Audit et Logs**
- Logs de toutes les requêtes
- Traçabilité des accès
- Détection d'anomalies
- Rotation des logs

---

## 📚 RÉFÉRENCES

- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Laravel Documentation](https://laravel.com/docs)
- [MySQL 8.0 Reference Manual](https://dev.mysql.com/doc/refman/8.0/en/)

---

**Document généré automatiquement le 2025-10-17 - BazarKELY v2.8 (Système de Suivi des Pratiques + Certificats PDF + Classement)**
