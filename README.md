# 📱 BazarKELY - Gestion Budget Familial Madagascar

> **Application PWA de gestion budgétaire familiale spécialement conçue pour le contexte économique et culturel de Madagascar**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/bazarkely/bazarkely)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-ready-orange.svg)](https://1sakely.org)
[![OVH PRO](https://img.shields.io/badge/hosting-OVH%20PRO-purple.svg)](https://1sakely.org)

## 🎯 À Propos

**BazarKELY** est une Progressive Web App (PWA) de gestion budgétaire familiale développée spécifiquement pour les familles malgaches. L'application intègre le support des services Mobile Money (Orange Money, Mvola, Airtel Money) et s'adapte parfaitement à l'économie mixte formelle/informelle de Madagascar.

### 🌟 Fonctionnalités Principales

- 💰 **Gestion complète du budget familial**
- 📱 **Support Mobile Money** (Orange Money, Mvola, Airtel Money)
- 🔄 **Synchronisation multi-navigateur** (Chrome, Firefox, Safari, Edge)
- 📊 **Tableaux de bord interactifs** avec graphiques
- 🎯 **Objectifs d'épargne** et suivi des progrès
- 🏆 **Système de classement** avec leaderboard et gamification
- 🎮 **Gamification éducative** pour l'inclusion financière
- 🌐 **Fonctionnement offline** prioritaire
- 🇫🇷 **Interface bilingue** français-malgache
- 🔒 **Sécurité robuste** avec chiffrement des données

### 🌟 Fonctionnalités Bonus Madagascar

- 👨‍👩‍👧‍👦 **Budget Familial Collaboratif** : Partage et gestion multi-utilisateurs
- 💰 **Gestion des Tontines** : Cercles d'épargne rotatifs traditionnels
- 🌾 **Planificateur Agricole** : Cultures saisonnières et prêts agricoles
- 🌀 **Plan d'Urgence Cyclone** : Préparation aux catastrophes naturelles
- 🎤 **Interface Vocale** : Saisie vocale en français et malagasy
- 📱 **Générateur QR Code** : Mobile Money et partage de données
- 💱 **Support Multi-Devises** : MGA, EUR, USD pour la diaspora
- 🛒 **Marketplace Communautaire** : Commerce local et partage

## 🏆 Système de Classement et Leaderboard

### Architecture du Leaderboard

Le système de classement de BazarKELY utilise **Supabase** directement pour les requêtes de données, offrant des performances optimales et une synchronisation en temps réel.

**Architecture Technique :**
- **Base de données :** Supabase PostgreSQL
- **Service :** `leaderboardService.ts` (requêtes directes Supabase)
- **Interface :** `LeaderboardComponent.tsx` (React + TypeScript)
- **Cache :** Système de cache client avec TTL de 5 minutes
- **Sécurité :** Pseudonymes automatiques pour la protection de la vie privée

### Nouvelles Colonnes de la Table Users

Le système de classement utilise quatre nouvelles colonnes ajoutées à la table `users` :

| Colonne | Type | Description | Valeur par défaut |
|---------|------|-------------|-------------------|
| `experience_points` | `integer` | Points d'expérience pour le classement | `0` |
| `certification_level` | `integer` | Niveau de certification (1-5) | `1` |
| `profile_picture_url` | `text` | URL de la photo de profil | `NULL` |
| `last_login_at` | `timestamptz` | Dernière connexion | `now()` |

### Fonctionnalités du Leaderboard

**Classement par Points d'Expérience :**
- Tri automatique par `experience_points` (décroissant)
- Calcul du rang utilisateur en temps réel
- Système de percentiles pour le positionnement

**Filtrage par Niveau :**
- Filtrage par niveau de certification (1-5)
- Support de la pagination (50 utilisateurs par page)
- Navigation fluide entre les pages

**Système de Pseudonymes :**
- Génération automatique de pseudonymes basés sur l'ID utilisateur
- Protection complète de la vie privée
- Pseudonymes cohérents et reproductibles

**Cache Intelligent :**
- Cache client avec TTL de 5 minutes
- Réduction des requêtes Supabase
- Mise à jour automatique des données

### Accès au Leaderboard

**Méthode d'Accès :**
1. **Cliquer sur le badge de niveau** dans le header (coin supérieur droit)
2. **Naviguer vers la page Certification** (`/certification`)
3. **Faire défiler vers le bas** jusqu'à la section "Classement Général"
4. **Explorer le leaderboard** avec filtres et pagination

**Interface Utilisateur :**
- Badge de niveau cliquable dans le header
- Section dédiée "Classement Général" sur la page certification
- Notice de confidentialité intégrée
- Design responsive et accessible

## 🚀 Déploiement Production

### 🌐 Application Live
- **URL Production :** [https://1sakely.org](https://1sakely.org)
- **API Backend :** [https://1sakely.org/api/data.php](https://1sakely.org/api/data.php)
- **Hébergement :** OVH PRO avec domaine dédié
- **Configuration :** CORS complet pour synchronisation multi-navigateur

### 🔧 Architecture Technique

```
📁 bazarkely/
├── 📁 frontend/          # React PWA (Vite + TypeScript)
│   ├── 📁 src/
│   │   ├── 📁 pages/     # 7 pages principales
│   │   ├── 📁 components/
│   │   │   └── 📁 Leaderboard/  # Système de classement
│   │   ├── 📁 services/  # Services (leaderboardService.ts)
│   │   ├── 📁 store/     # Zustand stores
│   │   └── 📁 lib/       # Utils + IndexedDB + Supabase
│   └── 📁 public/        # PWA assets
├── 📁 backend/           # Express API (TypeScript)
│   ├── 📁 src/
│   │   ├── 📁 routes/
│   │   ├── 📁 models/
│   │   └── 📁 middleware/
│   └── 📁 migrations/
├── 📁 api/               # API PHP (Production)
│   ├── data.php          # Point d'entrée API
│   ├── sync.php          # Synchronisation
│   └── bazarkely.db      # Base SQLite
└── 📄 .htaccess          # Configuration Apache OVH
```

**Note :** Le système de leaderboard utilise Supabase directement (pas d'API REST intermédiaire) pour des performances optimales et une synchronisation en temps réel.

## 🛠️ Technologies Utilisées

### Frontend
- **React 18.2.0** + **TypeScript 5.8.3**
- **Vite 7.1.5** (Build tool)
- **Tailwind CSS 3.4.17** (Styling)
- **Zustand 5.0.8** (State management)
- **Dexie 4.2.0** (IndexedDB)
- **PWA** (Service Worker + Manifest)

### Backend
- **Express 4.21.2** + **TypeScript 5.8.3**
- **SQLite3 5.1.7** (Base de données)
- **JWT 9.0.2** (Authentification)
- **bcryptjs 2.4.3** (Chiffrement mots de passe)

### Base de Données et Services
- **Supabase PostgreSQL** (Base de données principale)
- **Supabase Auth** (Authentification et gestion des utilisateurs)
- **Supabase Client** (Requêtes directes pour leaderboard et données temps réel)
- **IndexedDB** (Cache local et fonctionnement offline)

### Production
- **OVH PRO** (Hébergement)
- **Apache** (Serveur web)
- **PHP 8.x** (API de production)
- **SQLite** (Base de données)

## 🚀 Installation et Développement

### Prérequis
- **Node.js** 18+ 
- **npm** 9+
- **Git**

### Installation
```bash
# Cloner le repository
git clone https://github.com/bazarkely/bazarkely.git
cd bazarkely

# Installer les dépendances
npm install

# Installer les dépendances frontend
cd frontend
npm install

# Installer les dépendances backend
cd ../backend
npm install
```

### Développement Local
```bash
# Démarrer le frontend (localhost:3000)
cd frontend
npm run dev

# Démarrer le backend (localhost:3001)
cd backend
npm run dev

# Tests
npm run test
```

## 📦 Déploiement OVH

### Script de Déploiement Automatique
```powershell
# Préparer le package de déploiement
.\deploy-ovh.ps1

# Vérifier le déploiement
.\verify-ovh-deployment.ps1

# Tester la configuration CORS
.\test-migration-ovh-final.ps1
```

### Structure de Déploiement OVH
```
www/                    # Frontend PWA
├── index.html
├── assets/
├── manifest.json
├── sw.js
├── .htaccess          # Configuration Apache
└── api/               # Backend API
    ├── data.php
    ├── sync.php
    └── bazarkely.db
```

## 🧪 Tests et Validation

### Tests CORS Multi-Navigateur
- **Test CORS OVH :** [test-cors-ovh.html](test-cors-ovh.html)
- **Synchronisation :** [test-multi-browser-sync.html](test-multi-browser-sync.html)
- **Validation API :** [test-migration-ovh-final.ps1](test-migration-ovh-final.ps1)

### Tests de Déploiement
```bash
# Test complet de déploiement
.\test-migration-ovh-final.ps1

# Test CORS spécifique
start https://1sakely.org/test-cors-ovh.html

# Test de synchronisation
start https://1sakely.org/test-multi-browser-sync.html
```

## 📚 Documentation

- **[Cahier des Charges](CAHIER-DES-CHARGES.md)** - Spécifications complètes
- **[Guide Technique](README-TECHNIQUE.md)** - Documentation technique
- **[Migration OVH](README-MIGRATION-OVH.md)** - Guide de migration
- **[Checklist Migration](MIGRATION-OVH-CHECKLIST.md)** - Checklist de déploiement
- **[État Technique](ETAT-TECHNIQUE.md)** - État actuel du projet

## 🔧 Configuration CORS

L'application est configurée pour supporter la synchronisation multi-navigateur :

- ✅ **localhost:3000** (Développement)
- ✅ **https://1sakely.org** (Production)
- ✅ **Chrome, Firefox, Safari, Edge** (Tous navigateurs)
- ✅ **Synchronisation cross-origin** (Données partagées)

## 🎯 Fonctionnalités Spécifiques Madagascar

### Mobile Money
- **Orange Money** - Tarifs et calculs intégrés
- **Mvola** - Support complet
- **Airtel Money** - Gestion des frais

### Économie Informelle
- **Gestion des petits commerces**
- **Suivi des revenus irréguliers**
- **Catégorisation adaptée** au contexte local

### Interface Bilingue
- **Français** - Interface principale
- **Malgache** - Termes techniques traduits
- **Adaptation culturelle** - Respect des usages locaux

## 🤝 Contribution

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** les changements (`git commit -m 'Add some AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 📞 Support

- **Email :** support@1sakely.org
- **Documentation :** [https://1sakely.org/docs](https://1sakely.org/docs)
- **Issues :** [GitHub Issues](https://github.com/bazarkely/bazarkely/issues)

## 🎉 Remerciements

- **Communauté malgache** pour les retours et suggestions
- **Équipe de développement** pour l'engagement
- **OVH** pour l'hébergement professionnel
- **Contributeurs** open source

---

**🌟 BazarKELY : L'application qui transforme la gestion budgétaire familiale à Madagascar, alliant innovation technologique et compréhension profonde du contexte local pour un impact social positif durable.**

**📱 Déployé sur : [https://1sakely.org](https://1sakely.org)**
