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
- 👤 **Identification utilisateur** dans le menu header
- 🎯 **Navigation intelligente** entre budgets et transactions
- 📊 **Interface admin enrichie** avec données détaillées

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

## 🎨 Interface Utilisateur et Navigation

### Identification Utilisateur dans le Header

**Fonctionnalité :** Affichage intelligent de l'identité utilisateur dans le menu déroulant du header.

**Comportement :**
- **Priorité 1 :** Affiche `firstName` si disponible dans les préférences utilisateur
- **Priorité 2 :** Affiche `username` comme fallback si `firstName` n'est pas défini
- **Format :** "Compte actif : [firstName/username]"
- **Localisation :** Menu déroulant du header (coin supérieur droit)

**Implémentation Technique :**
- **Composant :** `Header.tsx`
- **Logique :** `user?.preferences?.firstName || user?.username`
- **Fallback :** Gestion gracieuse des données manquantes

### Navigation Intelligente Budgets → Transactions

**Fonctionnalité :** Cartes de budget cliquables avec filtrage automatique par catégorie.

**Comportement :**
- **Clic sur carte budget** → Navigation vers page transactions
- **Filtrage automatique** par catégorie du budget sélectionné
- **URL dynamique :** `/transactions?category=CATEGORY_VALUE`
- **Préservation URL :** Paramètre category conservé pour bookmarkabilité
- **Case-insensitive :** Filtrage insensible à la casse pour robustesse

**Implémentation Technique :**
- **Composant Budgets :** `BudgetsPage.tsx` - Gestionnaire de clic
- **Composant Transactions :** `TransactionsPage.tsx` - Filtrage par catégorie avec badge actif
- **Navigation :** React Router `useNavigate()` avec paramètres URL
- **Filtrage :** Validation contre `TransactionCategory` array avec comparaison case-insensitive
- **État :** Gestion via `useState` et `useEffect` pour les paramètres URL
- **Badge actif :** Affichage de la catégorie filtrée avec bouton de suppression

**Types de Filtrage Supportés :**
- **Toutes catégories :** `alimentation`, `logement`, `transport`, `sante`
- **Étendues :** `education`, `communication`, `vetements`, `loisirs`
- **Spécialisées :** `famille`, `solidarite`, `autres`

### TransactionsPage - Fonctionnalités Avancées [31/10/2025]

**Filtrage par Catégorie Corrigé :**
- **Fix race condition :** Suppression nettoyage URL automatique
- **Case-insensitive :** Comparaison insensible à la casse
- **Badge actif :** Affichage catégorie filtrée avec bouton reset

**Indicateur de Chargement :**
- **Loader2 :** Composant lucide-react avec animation spin
- **Message :** "Chargement des transactions..." affiché pendant isLoading
- **Return anticipé :** Affichage conditionnel avec early return

**Export CSV :**
- **Bouton Export :** Icône Download avec fonctionnalité complète
- **Formatage :** Colonnes Date, Description, Catégorie, Type, Montant, Compte
- **Filtres respectés :** Export basé sur transactions filtrées (sortedTransactions)
- **Compatibilité Excel :** BOM UTF-8 pour ouverture correcte
- **Nom fichier :** `transactions-YYYY-MM-DD.csv`
- **Format date :** Format ISO (YYYY-MM-DD)

**Implémentation Technique :**
- **Fichier :** `frontend/src/pages/TransactionsPage.tsx`
- **Helpers :** `escapeCSV()` et `formatDateForCSV()`
- **Service :** `accountService.getUserAccounts()` pour noms comptes

### TransactionDetailPage - Navigation Intelligente [31/10/2025]

**Navigation de Retour Préservant Contexte :**
- **navigate(-1) :** Utilisation historique navigateur pour préserver filtres
- **Fallback :** Navigation vers `/transactions` si pas d'historique
- **Préservation :** Filtres actifs et état page conservés après retour

**Implémentation Technique :**
- **Fichier :** `frontend/src/pages/TransactionDetailPage.tsx`
- **Vérification :** `window.history.length > 1` avant navigate(-1)
- **UX :** Amélioration navigation contextuelle utilisateur

### Interface Admin Enrichie

**Fonctionnalité :** Tableau de bord administrateur avec données utilisateur détaillées et interface accordéon.

**Améliorations de Layout :**
- **Grille mobile :** Passage de 2 à 3 colonnes sur mobile (`grid-cols-3`)
- **Grille desktop :** Maintien de 5 colonnes sur desktop (`md:grid-cols-5`)
- **Responsive :** Adaptation optimale des statistiques admin

**Cartes Utilisateur Accordéon :**
- **Comportement :** Expansion exclusive (une seule carte ouverte à la fois)
- **Données affichées :** Avatar, nom d'utilisateur, email, rôle, objectifs d'épargne
- **Objectif prioritaire :** Affichage spécial du "Fond d'urgence" avec barre de progression
- **Revenus mensuels :** Calcul et affichage des revenus du mois en cours

**Données Enrichies :**
- **Avatars :** Support des photos de profil (`profile_picture_url`)
- **Objectifs :** Array complet des objectifs d'épargne avec progression
- **Revenus :** Calcul automatique basé sur les transactions de type `income`
- **Fallback :** Données de préférences utilisateur si transactions indisponibles

**Implémentation Technique :**
- **Composant :** `AdminPage.tsx` - Interface accordéon
- **Service :** `adminService.ts` - Enrichissement des données utilisateur
- **État :** `expandedUserId` pour gestion accordéon exclusive
- **Formatage :** `Intl.NumberFormat` pour devises malgaches (MGA)
- **Icônes :** Lucide React pour interface cohérente

## 🚀 Déploiement Production

### 🌐 Application Live
- **URL Production :** [https://1sakely.org](https://1sakely.org)
- **API Backend :** [https://1sakely.org/api/data.php](https://1sakely.org/api/data.php)
- **Hébergement :** OVH PRO avec domaine dédié
- **Configuration :** CORS complet pour synchronisation multi-navigateur

### 🔧 Architecture Technique

**Développement Multi-Agents :**
- **Git Worktrees** : Isolation automatique pour développement parallèle
- **Cursor 2.0 Multi-Agent** : Workflows validés pour développement parallèle
- **Scripts d'automation** : `setup-multiagent-test.ps1` et `cleanup-worktrees.ps1`
- **Documentation** : `MULTI-AGENT-WORKFLOWS.md` et `CURSOR-2.0-CONFIG.md`

```
📁 bazarkely/
├── 📁 frontend/          # React PWA (Vite + TypeScript)
│   ├── 📁 src/
│   │   ├── 📁 pages/     # Pages principales
│   │   │   ├── AdminPage.tsx        # Interface admin avec accordéon
│   │   │   ├── BudgetsPage.tsx      # Navigation intelligente
│   │   │   ├── TransactionsPage.tsx # Filtrage par catégorie + Loading + CSV Export
│   │   │   └── TransactionDetailPage.tsx # Navigation intelligente préservant filtres
│   │   ├── 📁 components/
│   │   │   ├── 📁 Layout/
│   │   │   │   └── Header.tsx       # Identification utilisateur
│   │   │   └── 📁 Leaderboard/      # Système de classement
│   │   ├── 📁 services/  # Services
│   │   │   ├── leaderboardService.ts
│   │   │   └── adminService.ts      # Données enrichies admin
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

### 📊 Structures de Données Enrichies

**Interface AdminUser (adminService.ts) :**
```typescript
interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_sync: string | null;
  isCurrentUser: boolean;
  profilePictureUrl: string | null;    // Nouveau
  goals: UserGoal[];                  // Nouveau
  monthlyIncome: number | null;       // Nouveau
}

interface UserGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  priority: string;
  isCompleted: boolean;
}
```

**Navigation et Filtrage :**
- **URL Parameters :** Support des paramètres `category` et `filter`
- **State Management :** `useState` pour `filterCategory` et `filterType`
- **URL Cleanup :** `window.history.replaceState()` pour nettoyage automatique
- **Validation :** Array `TransactionCategory` pour validation des catégories

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
- **React Router v6** (Navigation avec paramètres URL)
- **Lucide React** (Icônes et interface utilisateur)

### Production
- **OVH PRO** (Hébergement)
- **Apache** (Serveur web)
- **PHP 8.x** (API de production)
- **SQLite** (Base de données)

## 🚀 Installation et Développement

### Développement Multi-Agents

**BazarKELY utilise Cursor 2.0 avec workflows multi-agents validés :**
- **Git Worktrees :** Isolation automatique pour développement parallèle
- **3 agents parallèles :** Développement de features indépendantes en parallèle
- **Gain de temps :** 43% de gain vs développement séquentiel
- **Documentation :** Voir `MULTI-AGENT-WORKFLOWS.md` pour workflows détaillés

**Scripts d'Automation :**
- **setup-multiagent-test.ps1 :** Automatisation création worktrees pour multi-agents
- **cleanup-worktrees.ps1 :** Nettoyage automatique des worktrees après développement

**Session Validée (31/10/2025) :**
- 3 features développées en parallèle (fix filter + loading + CSV export)
- 3 conflits résolus avec succès
- 4/4 tests réussis
- Déploiement production réussi

### Prérequis
- **Node.js** 18+ 
- **npm** 9+
- **Git**
- **Cursor 2.0** (optionnel, pour développement multi-agents)

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
- **[Multi-Agent Workflows](MULTI-AGENT-WORKFLOWS.md)** - Workflows multi-agents validés [31/10/2025]
- **[Cursor 2.0 Config](CURSOR-2.0-CONFIG.md)** - Configuration Cursor 2.0 [31/10/2025]
- **[Résumé Session 31/10](RESUME-SESSION-2025-10-31.md)** - Détails session multi-agents [31/10/2025]

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

---

*Dernière mise à jour : 31 octobre 2025*
