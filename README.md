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
- 🎯 **Objectifs d'épargne** et suivi des progrès - **Phase B (v2.5.0)** : Synchronisation automatique des deadlines basée sur la contribution mensuelle préconisée, recalcul automatique lors des modifications, migration automatique pour les objectifs existants, affichage de la contribution mensuelle dans l'interface
- 🔁 **Transactions récurrentes** - Automatisation complète des transactions périodiques
- 📈 **Statistiques budgétaires multi-années** - Comparaisons année sur année, détection de catégories problématiques
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

## 🔁 Transactions Récurrentes

**BazarKELY** intègre un système complet de transactions récurrentes permettant d'automatiser les revenus et dépenses périodiques.

### Fonctionnalités

- ✅ **5 fréquences supportées** : Quotidien, Hebdomadaire, Mensuel, Trimestriel, Annuel
- ✅ **Génération automatique** : Création automatique des transactions à la date prévue
- ✅ **Notifications intelligentes** : Alertes configurable X jours avant chaque occurrence
- ✅ **Configuration flexible** : Dates de début/fin, jours spécifiques, liaison budgets
- ✅ **Gestion complète** : Activation/désactivation, modification, suppression
- ✅ **Historique** : Suivi des transactions générées et prochaines occurrences
- ✅ **Intégration dashboard** : Widget affichant les 3 prochaines transactions récurrentes

### Architecture Technique

**Base de Données :**
- **Table Supabase :** `recurring_transactions` (20 champs)
- **Extension transactions :** `is_recurring` (boolean), `recurring_transaction_id` (UUID)
- **IndexedDB Version 7 :** Table `recurringTransactions` avec indexation optimisée

**Services :**
- **recurringTransactionService.ts** (500 lignes) - CRUD complet, calcul de dates, génération automatique
- **recurringTransactionMonitoringService.ts** (200 lignes) - Monitoring automatique toutes les 12h
- **recurringUtils.ts** (440 lignes) - Utilitaires dates, validation, formatage

**Interface Utilisateur :**
- **RecurringConfigSection** - Configuration complète (fréquence, dates, notifications)
- **RecurringTransactionsPage** - Page de gestion avec filtres (Toutes, Actives, Inactives, Par fréquence)
- **RecurringTransactionDetailPage** - Détails, historique, actions (modifier, supprimer, générer)
- **RecurringTransactionsList** - Liste avec cartes, toggles actif/inactif
- **RecurringBadge** - Badge réutilisable pour transactions récurrentes
- **RecurringTransactionsWidget** - Widget dashboard avec prochaines occurrences

**Intégration :**
- **AddTransactionPage** - Toggle "Transaction récurrente" avec configuration complète
- **TransactionsPage** - Badge récurrent + filtre "Récurrentes"
- **Routes :** `/recurring` (liste), `/recurring/:id` (détail)

**Monitoring :**
- **Vérification automatique** toutes les 12 heures
- **Génération automatique** si `autoCreate = true`
- **Notifications** si `notifyBeforeDays > 0`

**Types TypeScript :**
```typescript
interface RecurringTransaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date | null;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  notifyBeforeDays: number;
  autoCreate: boolean;
  linkedBudgetId: string | null;
  isActive: boolean;
  lastGeneratedDate: Date | null;
  nextGenerationDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Session d'implémentation :** 2025-11-03 (Phase 1: Infrastructure + Phase 2: Services + Phase 3: UI)

## 📈 Statistiques Budgétaires Multi-Années

**BazarKELY** intègre un système complet d'analyse statistique budgétaire permettant des comparaisons multi-années et la détection de catégories problématiques.

### Fonctionnalités

- ✅ **Comparaison de périodes** - Comparaison année sur année, mois sur mois, ou plages personnalisées
- ✅ **Détection de catégories problématiques** - Identification automatique des catégories avec dépassements récurrents
- ✅ **Évolution temporelle** - Graphiques d'évolution annuelle et mensuelle avec tendances
- ✅ **Métriques avancées** - Taux d'épargne, taux de conformité, analyse de tendances
- ✅ **Barres de progression bicolores** - Affichage visuel des budgets dépassés (vert + orange)
- ✅ **Indicateurs de dépassement** - Affichage "Dépassé: -XXX Ar" pour budgets dépassés

### Architecture Technique

**Hook personnalisé:**
- **useMultiYearBudgetData.ts** (~890 lignes) - Hook pour statistiques multi-années avec comparaison de périodes, détection de catégories problématiques, calcul d'évolution temporelle

**Page de statistiques:**
- **BudgetStatisticsPage.tsx** (~690 lignes) - Page complète avec sélecteurs de périodes, graphiques d'évolution, liste des catégories problématiques, métriques comparatives

**Améliorations UI:**
- **Barres de progression bicolores** - Affichage vert pour budget respecté, orange pour dépassement dans BudgetsPage.tsx
- **Icône épargne corrigée** - Utilisation de PiggyBank pour la catégorie épargne
- **Suppression chevrons select** - Classe CSS `select-no-arrow` appliquée dans module Budget

**Session d'implémentation :** 2025-12-31 (Session S28)

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
│   │   │   ├── TransactionsPage.tsx # Filtrage par catégorie + Loading + CSV Export + Badge récurrent
│   │   │   ├── TransactionDetailPage.tsx # Navigation intelligente préservant filtres
│   │   │   ├── RecurringTransactionsPage.tsx # Gestion transactions récurrentes
│   │   │   └── RecurringTransactionDetailPage.tsx # Détails transaction récurrente
│   │   ├── 📁 components/
│   │   │   ├── 📁 Layout/
│   │   │   │   └── Header.tsx       # Identification utilisateur + Context Switcher trigger
│   │   │   ├── 📁 Navigation/
│   │   │   │   └── BottomNav.tsx    # Navigation + Context Switcher mode
│   │   │   └── 📁 Leaderboard/      # Système de classement
│   │   ├── 📁 contexts/
│   │   │   └── ModuleSwitcherContext.tsx # Context Switcher state management
│   │   ├── 📁 services/  # Services
│   │   │   ├── leaderboardService.ts
│   │   │   ├── adminService.ts      # Données enrichies admin
│   │   │   ├── recurringTransactionService.ts # CRUD transactions récurrentes
│   │   │   └── recurringTransactionMonitoringService.ts # Monitoring automatique
│   │   ├── 📁 store/     # Zustand stores
│   │   ├── 📁 lib/       # Utils + IndexedDB + Supabase
│   │   │   └── database.ts # IndexedDB Version 7 avec table recurringTransactions
│   │   ├── 📁 utils/     # Utilitaires
│   │   │   └── recurringUtils.ts # Utilitaires dates/validation transactions récurrentes
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

## 🏗️ Module Construction POC

### Description

Module isolé pour la gestion du workflow de validation des bons de commande avec machine à états complète, intégration de vérification automatique du stock, et gestion manuelle de l'inventaire.

### Architecture Workflow

**Machine à états avec 17 statuts:**
- **Niveau 1 - Création:** `draft`, `pending_site_manager`
- **Niveau 2 - Validation Chef Chantier:** `approved_site_manager`, `checking_stock`
- **Niveau 3 - Vérification Stock:** `fulfilled_internal`, `needs_external_order`
- **Niveau 4 - Validation Direction (conditionnelle):** `pending_management`, `rejected_management`, `approved_management`
- **Niveau 5 - Validation Fournisseur:** `submitted_to_supplier`, `pending_supplier`, `accepted_supplier`, `rejected_supplier`
- **États finaux:** `in_transit`, `delivered`, `completed`, `cancelled`

**Règles métier:**
- Validation Direction requise si montant total >= 5,000,000 MGA
- Vérification automatique du stock après approbation Chef Chantier
- Historique complet des transitions enregistré dans `poc_purchase_order_workflow_history`

### Services Implémentés

1. **pocWorkflowService.ts** (953 lignes)
   - Machine à états avec 17 statuts
   - Matrice de transitions validée
   - Permissions basées sur 6 rôles (chef_equipe, chef_chantier, direction, magasinier, supplier_member, admin)
   - 5 fonctions principales: `validateTransition`, `transitionPurchaseOrder`, `canUserPerformAction`, `checkStockAvailability`, `getAvailableActions`

2. **authHelpers.ts** (~200 lignes)
   - 4 fonctions d'authentification: `getAuthenticatedUserId`, `getUserCompany`, `isUserMemberOfCompany`, `getUserRole`
   - Intégration avec Supabase Auth
   - Gestion des permissions et rôles

3. **pocStockService.ts** (complement +125 lignes)
   - Fonction `fulfillFromStock` pour déduction du stock interne
   - Gestion atomique des mouvements de stock
   - Vérification de disponibilité avant déduction

### Tests

**Couverture complète avec 81 tests:**
- **pocWorkflowService.core.test.ts** (~600 lignes) - 23 tests pour workflow core
- **pocWorkflowService.permissions.test.ts** (~800 lignes) - 33 tests pour permissions et règles métier
- **authHelpers.test.ts** (~700 lignes) - 25 tests pour auth helpers et fulfillFromStock

**Tests validés:**
- Tous les 17 statuts et transitions
- Permissions basées sur les rôles
- Logique de vérification de stock
- Helpers d'authentification
- Atomicité de la déduction de stock

### Interface Utilisateur (Phase 2 Step 3) ✅

**Composants Créés (11 fichiers, ~3,500 lignes):**

1. **Context & Infrastructure**
   - `ConstructionContext.tsx` - Context Provider pour état global Construction
   - `ContextSwitcher.tsx` - Sélecteur contexte Personnel/Entreprise

2. **Dashboard & Overview**
   - `POCDashboard.tsx` - Tableau de bord principal avec KPIs et statistiques

3. **Catalogue & Commandes**
   - `ProductCatalog.tsx` - Catalogue produits avec recherche et filtres
   - `PurchaseOrderForm.tsx` - Formulaire création bons de commande
   - `POCOrdersList.tsx` - Liste commandes avec filtres et actions workflow

4. **Workflow Visualization**
   - `WorkflowStatusDisplay.tsx` - Affichage statut workflow avec timeline
   - `WorkflowHistory.tsx` - Historique complet des transitions

5. **Gestion Stock**
   - `StockManager.tsx` - Interface gestion inventaire avec entrées/sorties
   - `StockTransactions.tsx` - Historique complet mouvements stock

**Fonctionnalités UI:**
- Dashboard temps réel avec KPIs
- Catalogue produits avec recherche et filtres
- Création/gestion bons de commande
- Workflow visuel avec timeline et actions
- Gestion stock interne complète
- Historique audit trail complet
- Responsive design (mobile et desktop)
- Messages en français
- Thème purple cohérent

**Statut des Composants (Session 2025-11-15):**
- ✅ **POCOrdersList.tsx** - STABLE (Bug WorkflowAction résolu, import fix AGENT10)
- ✅ **OrderDetailPage.tsx** - STABLE (Bug WorkflowAction résolu)
- ✅ **PurchaseOrderForm.tsx** - UX OPTIMISÉE (Smart Defaults + VAGUE 1 + VAGUE 2, alignement traditionnel BCI)
  - Phase dropdown: Recherche en temps réel avec filtrage, catégorisation en 4 groupes (Gros Œuvre 7, Second Œuvre 6, Finitions 6, Extérieurs 2)
  - Logging diagnostic actif pour chargement et catégorisation des phases
  - ⚠️ **PROBLÈME CONNU:** UI affiche seulement 1 phase par catégorie malgré chargement correct de 21 phases (confirmé par logs console)
  - ⚠️ **PROBLÈME CONNU:** Couleurs de fond des catégories ne s'appliquent pas correctement (toutes apparaissent de la même couleur malgré styles inline)
- ✅ **Header.tsx** - STABLE (Bug budget banner résolu AGENT09, Construction cleanup completé PM session - 8 corrections AGENT09)

**Smart Defaults PurchaseOrderForm (Session 2025-11-15):**
- ✅ **orderType basé sur rôle:** chef_equipe/magasinier → BCI, autres → BCE
- ✅ **projectId auto-sélection:** Si 1 seul projet disponible
- ✅ **orgUnitId auto-sélection:** Si 1 seule org_unit (+ requête membership pour chef_equipe)
- ✅ **supplierId auto-sélection:** Si 1 seul fournisseur disponible
- ✅ **deliveryAddress auto-fill:** Depuis activeCompany.address
- ✅ **contactName auto-fill:** Depuis user metadata (Supabase Auth)
- ✅ **contactPhone auto-fill:** Depuis activeCompany.contactPhone
- **Impact:** Réduction temps de saisie de 15-20 min → 2-3 min pour nouveaux utilisateurs

**Améliorations UX PurchaseOrderForm (Session 2025-11-15):**

**VAGUE 1 - Quick Wins (AGENT09, AGENT11, AGENT12):**
- ✅ **Header bug fix (AGENT09):** Détection pathname-based pour affichage budget banner
- ✅ **Réorganisation formulaire (AGENT11):** Articles déplacés position 4 (au lieu de 7) pour accès rapide
- ✅ **Sections repliables (AGENT12):** Livraison et Notes collapsibles, réduction hauteur visuelle -33%
- ✅ **Badges smart defaults (AGENT12):** 7 badges visuels indiquant champs auto-remplis (orderType, projectId, orgUnitId, supplierId, deliveryAddress, contactName, contactPhone)

**VAGUE 2 - Alignement Traditionnel (AGENT09, AGENT11, AGENT12):**
- ✅ **Header BCI traditionnel (AGENT09):** Format 3 sections "Supplier | BCI# | Date" aligné avec pratiques BCI traditionnelles
- ✅ **Recherche inline (AGENT11):** Modal supprimée, recherche intégrée directement dans section Articles, réduction temps ajout article -75% (15-20s → 3-5s)
- ✅ **Layout single-column (AGENT12):** Sidebar intégrée inline, flux vertical unique, résumé commande intégré dans formulaire

**Métriques UX:**
- Hauteur visuelle: -33% (sections repliables)
- Temps ajout article: -75% (15-20s → 3-5s avec recherche inline)
- Feedback visuel: 7 badges smart defaults ajoutés
- Flow utilisateur: Single-column pour meilleure continuité

### Conventions UX Construction POC (Session 2025-11-15)

**Patterns Implémentés:**

**1. Recherche Inline avec Debounce:**
- Recherche intégrée directement dans les sections (pas de modal)
- Debounce 300ms pour optimiser requêtes API
- Feedback visuel immédiat (loading state, résultats inline)
- Exemple: Section Articles PurchaseOrderForm avec recherche produits inline

**2. Sections Repliables (Collapsibles):**
- Sections secondaires repliables pour réduire hauteur visuelle
- Icône chevron indiquant état (ouvert/fermé)
- État par défaut: replié pour sections optionnelles
- Exemple: Sections Livraison et Notes dans PurchaseOrderForm

**3. Badges Feedback Smart Defaults:**
- Badges visuels indiquant champs auto-remplis
- Couleur distincte (purple) pour différencier des champs manuels
- Tooltip optionnel expliquant source du smart default
- Exemple: 7 badges dans PurchaseOrderForm (orderType, projectId, orgUnitId, supplierId, deliveryAddress, contactName, contactPhone)

**4. Header BCI Traditionnel:**
- Format 3 sections: "Supplier | BCI# | Date"
- Aligné avec pratiques BCI traditionnelles
- Informations clés visibles en un coup d'œil
- Exemple: Header PurchaseOrderForm en mode BCI

**5. Layout Single-Column:**
- Flux vertical unique pour meilleure continuité
- Sidebar intégrée inline (pas de colonne séparée)
- Résumé intégré dans formulaire principal
- Exemple: PurchaseOrderForm avec résumé commande inline

**6. Détection Pathname-Based:**
- Détection basée sur pathname pour affichage conditionnel
- Plus robuste que vérification state/context
- Exemple: Header.tsx budget banner affiché uniquement sur pages Budget

**7. Masquage Complet Éléments Budget dans Construction:**
- Pattern: Tous les éléments Budget masqués dans module Construction pour UI propre
- Implémentation: Vérification `!isConstructionModule` pour chaque élément Budget
- Éléments masqués: LevelBadge, QuizQuestionPopup, useEffect checkUserBudgets, containers Budget
- Exemple: Header.tsx avec 8 corrections (AGENT09 PM session) pour masquer tous éléments Budget en Construction
- Résultat: Header Construction propre avec uniquement éléments Construction, Header Budget inchangé

### Problèmes Connus (Known Issues)

**Purchase Order Form - Phases Dropdown (Session 2025-11-23):**
- **Problème:** Le dropdown des phases présente un décalage entre les données chargées et l'affichage visuel
- **Symptômes:**
  - 21 phases chargées correctement dans l'état (confirmé par logs console)
  - Catégorisation fonctionnelle: 4 groupes créés (Gros Œuvre 7, Second Œuvre 6, Finitions 6, Extérieurs 2)
  - UI n'affiche que 1 phase par catégorie au lieu de toutes les phases
  - Couleurs de fond des catégories ne s'appliquent pas correctement (toutes apparaissent de la même couleur malgré styles inline)
- **Cause suspectée:** Problème de positionnement CSS ou de stacking (z-index) empêchant l'affichage complet
- **Fichier concerné:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`
- **Priorité:** HAUTE (bloque workflow utilisateur)
- **Statut:** Diagnostic logging actif, investigation en cours

### Phase 2 - Organigramme et Structure Organisationnelle ✅ (12 novembre 2025)

**Structure organisationnelle hiérarchique:**
- **Niveau 1 - Direction Générale (DG):** Direction centrale de l'entreprise
- **Niveau 2 - Services (3):**
  - Service Achats (ACHAT) - Gestion des achats et approvisionnements
  - Service Technique (TECH) - Gestion des chantiers et maintenance
  - Service Administratif (ADMIN) - Support administratif et RH
- **Niveau 3 - Équipes (7):**
  - Équipe Approvisionnement (APPRO) - Sous Service Achats
  - Équipe Logistique (LOGI) - Sous Service Achats
  - Équipe Chantier Site A (SITE-A) - Sous Service Technique
  - Équipe Chantier Site B (SITE-B) - Sous Service Technique
  - Équipe Maintenance (MAINT) - Sous Service Technique
  - Équipe Comptabilité (COMPTA) - Sous Service Administratif
  - Équipe RH (RH) - Sous Service Administratif

**Total: 10 unités organisationnelles** (1 Direction + 3 Services + 7 Équipes)

**Distinction BCI vs BCE:**
- **BCI (Bon de Commande Interne):** Commandes internes avec `org_unit_id` pour utilisation du stock existant
- **BCE (Bon de Commande Externe):** Commandes externes avec `project_id` pour achat auprès de fournisseurs

**Nouvelles tables de base de données:**
- `poc_org_units` - Unités organisationnelles (départements et équipes) avec hiérarchie parent/enfant
- `poc_org_unit_members` - Table de jonction user ↔ org_unit permettant plusieurs unités par utilisateur

**Modifications `poc_purchase_orders`:**
- `order_type` (TEXT CHECK: 'BCI' | 'BCE') - Type de commande
- `org_unit_id` (UUID) - Référence à l'unité organisationnelle (NULL pour BCE)
- `supplier_company_id` (UUID, nullable) - Référence au fournisseur (NULL pour BCI, requis pour BCE)
- **Contrainte:** `check_supplier_by_order_type` - Vérifie que supplier_company_id est NULL pour BCI
- **Trigger:** `validate_poc_purchase_order_supplier_type` - Validation automatique du type de commande

**Workflow modifié:**
- Validation `chef_chantier` limitée aux commandes BCI de ses unités assignées
- Scoping organisationnel: Les chefs de chantier ne valident que les commandes de leurs équipes
- Migration automatique: 27 commandes existantes marquées BCE avec `org_unit_id = NULL`

**Politiques RLS:**
- 4 politiques sur `poc_org_units` pour isolation multi-tenant
- 4 politiques sur `poc_org_unit_members` pour gestion des membres avec vérification `company_id`

**Composants frontend modifiés:**
- `PurchaseOrderForm.tsx` - Sélecteur conditionnel BCI/BCE avec affichage org_unit ou projet
- `POCOrdersList.tsx` - Filtre par unité organisationnelle pour commandes BCI
- `OrderDetailPage.tsx` - Affichage conditionnel org_unit vs projet selon type de commande

**Services backend modifiés:**
- `pocWorkflowService.ts` - Helpers `getUserOrgUnits`, `isUserInOrgUnit`, `isBCIOrder` pour scoping organisationnel
- Validation workflow adaptée pour vérifier l'appartenance à l'unité organisationnelle

### Phase 3 - Sécurité et Contrôles ✅ (12 novembre 2025)

**Fonctionnalités de sécurité implémentées:**
- **Masquage des prix pour Chef Équipe:** Les chefs d'équipe ne voient pas les montants (subtotal, tax, delivery_fee, total) dans les bons de commande. Les valeurs sont masquées via la vue `poc_purchase_orders_masked` qui retourne NULL pour ces colonnes.
- **Seuils configurables:** Seuils d'approbation configurables par compagnie ou unité organisationnelle. Support de 3 niveaux: `site_manager`, `management`, `direction`.
- **Plans de consommation:** Suivi des quantités planifiées vs réelles avec alertes automatiques. Support de 3 périodes: `monthly`, `quarterly`, `yearly`.
- **Système d'alertes:** Alertes automatiques pour seuils dépassés, consommation excessive, stock faible. 3 types: `threshold_exceeded`, `consumption_warning`, `stock_low`.

**Nouvelles tables de base de données:**
- `poc_price_thresholds` - Seuils d'approbation configurables (compagnie ou org_unit)
  - Colonnes: `id`, `company_id`, `org_unit_id` (nullable), `threshold_amount`, `currency`, `approval_level`, `created_by`, `created_at`, `updated_at`
  - Contrainte: Un seul seuil par niveau d'approbation par compagnie/org_unit
- `poc_consumption_plans` - Plans de consommation prévisionnels (quantités planifiées)
  - Colonnes: `id`, `company_id`, `org_unit_id` (nullable), `project_id` (nullable), `product_id`, `planned_quantity`, `planned_period`, `alert_threshold_percentage`, `created_by`, `created_at`, `updated_at`
- `poc_alerts` - Alertes système (threshold_exceeded, consumption_warning, stock_low)
  - Colonnes: `id`, `company_id`, `alert_type` (TEXT CHECK: 'threshold_exceeded' | 'consumption_warning' | 'stock_low'), `purchase_order_id` (nullable), `consumption_plan_id` (nullable), `threshold_exceeded_amount` (nullable), `message`, `severity`, `notified_users` (array UUID), `is_read`, `created_at`
  - **Note:** Colonne `alert_type` ajoutée via migration SQL (Session 2025-11-14 PM)

**Nouvelle vue:**
- `poc_purchase_orders_masked` - Vue masquant les prix (subtotal, tax, delivery_fee, total) pour le rôle `chef_equipe`
  - Utilise la fonction `get_user_role_in_company()` pour déterminer le rôle
  - Retourne NULL pour les colonnes de prix si rôle = `chef_equipe`
  - Toutes les autres colonnes sont préservées

**Nouvelle fonction:**
- `get_user_role_in_company(user_id UUID, company_id UUID)` SECURITY DEFINER
  - Récupère le rôle d'un utilisateur dans une compagnie depuis `poc_company_members`
  - Retourne `'none'` si utilisateur non membre ou inactif
  - Utilisée dans les politiques RLS et la vue de masquage

**Politiques RLS:**
- **poc_price_thresholds:** 4 politiques (SELECT, INSERT, UPDATE, DELETE)
  - SELECT: Membres de la compagnie ou admin
  - INSERT/UPDATE/DELETE: Admin ou direction uniquement
- **poc_consumption_plans:** 4 politiques (SELECT, INSERT, UPDATE, DELETE)
  - SELECT: Membres de la compagnie ou admin
  - INSERT/UPDATE/DELETE: Admin ou direction uniquement
- **poc_alerts:** 4 politiques (SELECT, INSERT, UPDATE, DELETE)
  - SELECT: Utilisateurs notifiés, admin ou direction
  - INSERT: Système uniquement (via fonctions SECURITY DEFINER)
  - UPDATE/DELETE: Admin ou direction uniquement
- **Total: 12 politiques RLS** pour isolation multi-tenant et sécurité des données

**Nouveaux services backend (4 services, 22 fonctions totales):**
1. **pocPriceThresholdService.ts** (~580 lignes) - Gestion des seuils configurables
   - `getThresholds(companyId, orgUnitId?)` - Liste des seuils
   - `getThreshold(id)` - Détails d'un seuil
   - `createThreshold(data)` - Création d'un seuil
   - `updateThreshold(id, data)` - Mise à jour d'un seuil
   - `deleteThreshold(id)` - Suppression d'un seuil
   - `checkThresholdExceeded(amount, companyId, orgUnitId?)` - Vérification si montant dépasse seuil
2. **pocConsumptionPlanService.ts** (~890 lignes) - Gestion des plans de consommation
   - `getPlans(companyId, orgUnitId?, projectId?)` - Liste des plans
   - `getPlan(id)` - Détails d'un plan
   - `createPlan(data)` - Création d'un plan
   - `updatePlan(id, data)` - Mise à jour d'un plan
   - `deletePlan(id)` - Suppression d'un plan
   - `getConsumptionSummary(planId, period)` - Résumé consommation vs planifié
   - `checkConsumptionAlerts(companyId)` - Vérification alertes consommation
3. **pocAlertService.ts** (~765 lignes) - Gestion des alertes système
   - `getAlerts(companyId, filters?)` - Liste des alertes avec filtres
   - `getAlert(id)` - Détails d'une alerte
   - `createAlert(data)` - Création d'une alerte (système)
   - `markAsRead(id)` - Marquer alerte comme lue
   - `getUnreadAlertsCount(companyId)` - Nombre d'alertes non lues
   - `deleteAlert(id)` - Suppression d'une alerte
4. **priceMasking.ts** (helper) - Utilitaires de masquage des prix
   - `canViewFullPrice(userRole)` - Vérifie si rôle peut voir prix complets
   - `getPriceMaskingMessage()` - Message d'information masquage
   - `maskPrice(price, userRole)` - Masque un prix selon le rôle

**Nouveaux composants frontend (3 composants réutilisables):**
- `ThresholdAlert.tsx` - Composant d'alerte pour seuils dépassés avec icône et message
- `ConsumptionPlanCard.tsx` - Carte affichant le résumé d'un plan de consommation (planifié vs réel)
- `PriceMaskingWrapper.tsx` - Wrapper masquant les prix pour chef_equipe avec message informatif

**Service modifié:**
- `pocPurchaseOrderService.ts` - `createDraft()` accepte maintenant `orderType: 'BCI' | 'BCE'` et `orgUnitId?: string` pour support BCI/BCE complet

**Pages modifiées (4 pages avec intégration Phase 3):**
- `PurchaseOrderForm.tsx` - Vérification seuils avant soumission + affichage plans consommation + alertes contextuelles
- `POCOrdersList.tsx` - Masquage prix via vue masquée + affichage alertes non lues + badges seuils
- `OrderDetailPage.tsx` - Masquage prix conditionnel + alertes seuil dépassé + impact consommation
- `POCDashboard.tsx` - Compteur alertes non lues + liste alertes récentes + résumé consommation par plan

**Données de test:**
- Joel (UUID: `5020b356-7281-4007-bec6-30a956b8a347`) assigné à 3 org_units:
  - Site A (SITE-A) - Rôle: `chef_equipe`
  - Site B (SITE-B) - Rôle: `chef_chantier`
  - Direction Générale (DG) - Rôle: `direction`
- 3 seuils de prix d'exemple créés:
  - Compagnie-wide: 5,000,000 MGA pour approbation `management`
  - SITE-A: 1,000,000 MGA pour approbation `site_manager`
  - DG: 10,000,000 MGA pour approbation `direction`

### Progression

- **Phase 1 - Base de données et données:** 100% complète
- **Phase 2 Step 1 - Services et tests:** 100% complète
- **Phase 2 Step 2 - Workflow et tests:** 100% complète (8 novembre 2025)
- **Phase 2 - Organigramme:** 100% complète (12 novembre 2025)
- **Phase 3 - Sécurité:** 100% complète (12 novembre 2025)
- **Progression globale POC:** 80% complète

### Structure

```
frontend/src/modules/construction-poc/
├── types/
│   └── construction.ts          # Types TypeScript complets
├── services/
│   ├── pocWorkflowService.ts     # Machine à états workflow
│   ├── pocPurchaseOrderService.ts # Service bons de commande (support BCI/BCE, bugs corrigés)
│   ├── pocStockService.ts        # Service stock (avec fulfillFromStock, bugs corrigés)
│   ├── pocProductService.ts      # Service catalogue produits (bugs corrigés)
│   ├── pocPriceThresholdService.ts # Service seuils configurables (Phase 3)
│   ├── pocConsumptionPlanService.ts # Service plans consommation (Phase 3)
│   ├── pocAlertService.ts        # Service alertes système (Phase 3)
│   └── authHelpers.ts            # Helpers authentification
├── utils/
│   └── priceMasking.ts           # Utilitaires masquage prix (Phase 3)
├── components/
│   ├── ThresholdAlert.tsx        # Composant alerte seuil (Phase 3)
│   ├── ConsumptionPlanCard.tsx   # Carte plan consommation (Phase 3)
│   └── PriceMaskingWrapper.tsx   # Wrapper masquage prix (Phase 3)
└── services/__tests__/
    ├── pocWorkflowService.core.test.ts
    ├── pocWorkflowService.permissions.test.ts
    └── authHelpers.test.ts
```

## 🎉 Remerciements

- **Communauté malgache** pour les retours et suggestions
- **Équipe de développement** pour l'engagement
- **OVH** pour l'hébergement professionnel
- **Contributeurs** open source

---

**🌟 BazarKELY : L'application qui transforme la gestion budgétaire familiale à Madagascar, alliant innovation technologique et compréhension profonde du contexte local pour un impact social positif durable.**

**📱 Déployé sur : [https://1sakely.org](https://1sakely.org)**

---

*Dernière mise à jour : 7 janvier 2026 (Phase B Goals Deadline Sync - Session S37 - v2.5.0)*
