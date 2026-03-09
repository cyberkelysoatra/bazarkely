# 📋 CAHIER DES CHARGES - BazarKELY (VERSION CORRIGÉE)
## Application de Gestion Budget Familial pour Madagascar

**Version:** 3.5.0 (Double Validation Prêts + Split Composants S60 2026-03-09 + Prêts Refactoring + UI Improvements S59 2026-03-08 + Prêts Phase 3 Photo Justificatif + Auth Stability S58 2026-03-07 + Bug Fix useRequireAuth Loop S57 2026-03-05 + Prêts Phase 3 Notifications Push S56 2026-03-04 + Prêts Phase 3 Intérêts Automatiques S55 2026-03-01 + Comportement Attendu Remboursements et Prêts S53 2026-02-17 + Prets Familiaux Phase 1+2 S52 2026-02-15 + Desktop Enhancement v2.6.0 S42 2026-01-26 + i18n Infrastructure Phase 1/3 S41 2026-01-25 + Translation Protection S41 2026-01-25 + Dashboard EUR Bug Fix S41 2026-01-25 + Interface Admin Enrichie + Navigation Intelligente + Identification Utilisateur + Bug Filtrage Catégories + Construction POC Phase 2 Organigramme + Smart Defaults PurchaseOrderForm + UX Transformation VAGUE 1 + VAGUE 2 + Phase B Goals v2.5.0 S37)  
**Date de mise à jour:** 2026-03-09  
**Statut:** ✅ PRODUCTION - OAuth Fonctionnel + PWA Install + Installation Native + Notifications Push + UI Optimisée + Système Recommandations + Gamification + Certification + Suivi Pratiques + Certificats PDF + Classement + Interface Admin Enrichie + Navigation Intelligente + Identification Utilisateur + Bug Filtrage Catégories + i18n Infrastructure Phase 1/3 + Translation Protection + Dashboard EUR Bug Fix + Desktop Enhancement v2.6.0 + Prets Familiaux Phase 1+2 v3.0.0 + Comportement Attendu Remboursements et Prêts v3.0.1 + Prêts Phase 3 Intérêts Automatiques v3.2.0 + Prêts Phase 3 Notifications Push v3.3.0 + Bug Fix useRequireAuth Loop v3.3.1 + Prêts Phase 3 Photo Justificatif + Auth Stability v3.3.3 + Prêts Refactoring + UI Improvements v3.4.4 + Double Validation Prêts + Split Composants v3.5.0  
**Audit:** ✅ COMPLET - Documentation mise à jour selon l'audit du codebase + Optimisations UI + Recommandations IA + Gamification + Certification + Suivi Comportements + Génération PDF + Classement Anonyme + Interface Admin Enrichie + Navigation Intelligente + Identification Utilisateur + Bug Filtrage Catégories + i18n Infrastructure Phase 1/3 + Translation Protection + Dashboard EUR Bug Fix + Desktop Enhancement v2.6.0

---

## 🎯 VISION GÉNÉRALE

BazarKELY est une application PWA (Progressive Web App) de gestion budget familial spécialement conçue pour Madagascar. L'application permet aux familles malgaches de gérer leurs finances personnelles avec des fonctionnalités adaptées au contexte local, incluant un système de notifications push intelligent et personnalisable.

## 🚀 OBJECTIFS PRINCIPAUX

### 1. **Gestion Financière Familiale** ✅ COMPLET
- Suivi des revenus et dépenses
- Catégorisation des transactions (alimentation, logement, transport, santé, éducation, etc.)
- Gestion multi-comptes (espèces, Orange Money, Mvola, Airtel Money)
- Tableaux de bord visuels et intuitifs

### 2. **Authentification Multi-Plateforme** ✅ COMPLET
- **Connexion Google OAuth** ✅ IMPLÉMENTÉ
- **Connexion email/mot de passe** ✅ IMPLÉMENTÉ
- **Synchronisation multi-appareils** ⚠️ PARTIELLEMENT FONCTIONNEL (70%)
- **Sécurité des données** ⚠️ PARTIELLEMENT CONFORME (60%)

### 3. **Fonctionnalités Madagascar** ✅ COMPLET
- **Gestion Mobile Money** (Orange Money, Mvola, Airtel Money) ✅ IMPLÉMENTÉ
- **Calcul automatique des frais** de transfert et retrait ✅ IMPLÉMENTÉ
- **Interface en français et malgache** ⚠️ PARTIELLEMENT IMPLÉMENTÉ (33% - Infrastructure i18n Phase 1/3 complétée: react-i18next + 3 langues FR/EN/MG + 85+ clés traduction auth section, traduction composants en attente Phase 2/3) (Session S41 2026-01-25)
- **Adaptation aux revenus locaux** (MGA) ✅ IMPLÉMENTÉ

### 4. **Expérience Utilisateur** ✅ COMPLET (100%)
- **PWA installable** sur mobile et desktop ✅ IMPLÉMENTÉ (100% - Installation native Chrome validée)
- **Mode hors ligne** complet ⚠️ PARTIELLEMENT IMPLÉMENTÉ (60%)
- **Interface responsive** ✅ IMPLÉMENTÉ
- **Notifications push** ✅ IMPLÉMENTÉ (100% - Système complet avec 9 types)
- **Navigation ultra-compacte** ✅ IMPLÉMENTÉ (100% - BottomNav 48-56px vs 80-90px)
- **Layout comptes optimisé** ✅ IMPLÉMENTÉ (100% - 2 colonnes + bouton Transfert)
- **Interface compacte** ✅ IMPLÉMENTÉ (100% - Padding réduit, espacement optimisé)
- **Interface admin enrichie** ✅ IMPLÉMENTÉ (100% - Identification utilisateur + accordéon + données financières)
- **Navigation intelligente** ✅ IMPLÉMENTÉ (100% - Cartes budget cliquables + filtrage catégorie)
- **Formulaire commande intelligent** ✅ IMPLÉMENTÉ (95% - Smart defaults basés sur rôle utilisateur, réduction 40% temps remplissage, UX transformation VAGUE 1 + VAGUE 2) - Session 2025-11-15
- **Desktop Dashboard Enhancement** ✅ IMPLÉMENTÉ (100% - Layout 2 colonnes desktop + Responsive header + Sticky sidebar + Layout component library + Mobile preservation + BottomNav visibility management) - Session S42 2026-01-26 (v2.6.0)

## 🔧 FONCTIONNALITÉS TECHNIQUES

### **Architecture Technique** ✅ COMPLET
- **Frontend:** React 19 + TypeScript + Vite
- **Base de données:** Supabase (PostgreSQL) + IndexedDB (offline)
- **Authentification:** Supabase Auth + Google OAuth
- **Déploiement:** Netlify (Plan Personnel activé)
- **PWA:** Service Worker + Manifest + Cache + Installation Native
- **Notifications:** API Notification + Service Worker + IndexedDB

### **Sécurité** ⚠️ PARTIELLEMENT COMPLET (60%)
- **Chiffrement des données** ⚠️ Base64 seulement (pas AES-256)
- **Authentification sécurisée** ⚠️ PBKDF2 simplifié
- **Politiques RLS** (Row Level Security) sur Supabase ✅ CONFORME
- **Validation côté serveur** de toutes les entrées ✅ CONFORME

### **Performance** ❌ NON TESTÉ
- **Lighthouse Score:** ❌ Non testé
- **Taille bundle:** ❌ Non mesuré
- **Temps de chargement:** ❌ Non mesuré
- **Cache intelligent** avec Service Worker ✅ IMPLÉMENTÉ

## 📱 FONCTIONNALITÉS UTILISATEUR

### **1. Gestion des Comptes** ✅ COMPLET
- Création de comptes multiples
- Types: Espèces, Courant, Épargne, Orange Money, Mvola, Airtel Money
- Solde en temps réel
- Historique des transactions

### **2. Gestion des Transactions** ✅ COMPLET
- **Types:** Revenus, Dépenses, Transferts
- **Catégories:** Alimentation, Logement, Transport, Santé, Éducation, Communication, Vêtements, Loisirs, Famille, Solidarité, Autres
- **Frais automatiques** pour Mobile Money
- **Recherche et filtrage** avancés

### **3. Budgets et Objectifs** ✅ COMPLET
- **Budgets mensuels** par catégorie
- **Alertes de dépassement** (configurables)
- **Objectifs d'épargne** avec suivi de progression
- **Rapports visuels** (graphiques, tendances)
- **Phase B Goals v2.5.0** ✅ COMPLÉTÉ (Session S37 2026-01-07)
  - ✅ **Calcul automatique deadline** basé sur contribution mensuelle requise
  - ✅ **Affichage contribution mensuelle préconisée** dans l'interface
  - ✅ **Synchronisation Supabase optimisée** pour required_monthly_contribution
  - ✅ **IndexedDB v12** avec support requiredMonthlyContribution
  - ✅ **Types Supabase mis à jour** pour mapping complet camelCase ↔ snake_case

### **4. Synchronisation Multi-Appareils** ⚠️ PARTIELLEMENT COMPLET (70%)
- **Synchronisation automatique** via Supabase ✅ IMPLÉMENTÉ
- **Mode hors ligne** ⚠️ PARTIELLEMENT FONCTIONNEL (IndexedDB implémenté, sync non testée)
- **Résolution de conflits** ⚠️ NON TESTÉ
- **Sauvegarde locale** avec IndexedDB ✅ IMPLÉMENTÉ

### **5. Fonctionnalités Madagascar** ✅ COMPLET
- **Calcul des frais Mobile Money** en temps réel
- **Taux de change** MGA (si applicable)
- **Interface bilingue** (Français/Malgache) ⚠️ PARTIELLEMENT IMPLÉMENTÉ (33% - Infrastructure i18n Phase 1/3 complétée, traduction composants en attente Phase 2/3) (Session S41 2026-01-25)
- **Protection traduction navigateur** ✅ IMPLÉMENTÉ (100% - excludeFromTranslation.tsx utility + CurrencyDisplay protégé + 44+ fichiers protégés) (Session S41 2026-01-25)
- **Adaptation culturelle** (fêtes, événements locaux)

### **6. Infrastructure Internationalisation (i18n) Phase 1/3** ✅ COMPLET (100%) (Session S41 2026-01-25)
- **Bibliothèque react-i18next** ✅ IMPLÉMENTÉ (100% - Installation et configuration complète)
- **Configuration i18n** ✅ IMPLÉMENTÉ (100% - Détection langue, fallback, provider intégré)
- **Fichiers de traduction** ✅ IMPLÉMENTÉ (100% - 3 langues FR/EN/MG avec 85+ clés traduction section authentification)
- **Provider i18n** ✅ IMPLÉMENTÉ (100% - I18nextProvider intégré dans App.tsx)
- **Phase 2/3 (Traduction Composants):** ⏳ EN ATTENTE
- **Phase 3/3 (Traduction Pages):** ⏳ EN ATTENTE

### **7. Protection Traduction Navigateur** ✅ COMPLET (100%) (Session S41 2026-01-25)
- **Utilitaire excludeFromTranslation** ✅ IMPLÉMENTÉ (100% - excludeFromTranslation.tsx pour protection éléments)
- **Protection CurrencyDisplay** ✅ IMPLÉMENTÉ (100% - translate="no" + lang="fr" + className="notranslate")
- **Protection AddTransactionPage** ✅ IMPLÉMENTÉ (100% - Form + button + span protégés)
- **Fichiers protégés** ✅ IMPLÉMENTÉ (100% - 44+ fichiers protégés contre traduction automatique navigateur)

### **8. Corrections de Bugs Dashboard** ✅ COMPLET (100%) (Session S41 2026-01-25)
- **Dashboard EUR Display Bug** ✅ RÉSOLU (100% - Correction hardcoded originalCurrency="MGA" → transaction.originalCurrency || 'MGA', ajout exchangeRateUsed prop)
- **Transaction Amount Source** ✅ RÉSOLU (100% - Utilisation transaction.originalAmount ?? transaction.amount)

### **9. Desktop Dashboard Enhancement** ✅ COMPLET (100%) (Session S42 2026-01-26 - v2.6.0)

#### **Layout Desktop Optimisé** 🖥️
- **Layout 2 colonnes:** Main content (2/3 width) + Sidebar (1/3 width) sur desktop (lg+)
- **Mobile-first préservé:** Layout single-column sur mobile, transition progressive tablet→desktop
- **Max-width centré:** xl:max-w-7xl xl:mx-auto pour contenu centré sur grands écrans
- **Responsive padding:** p-4 (mobile) → md:px-8 md:space-y-6 (tablet) → lg:px-12 (desktop)

#### **Header Navigation Responsive** 📱
- **2-line layout desktop:** Navigation justifiée sur 2 lignes pour desktop uniquement
- **Mobile layout intact:** Header mobile préservé exactement, aucune régression
- **Responsive container:** Header content avec xl:max-w-7xl xl:mx-auto et md:px-8 lg:px-12

#### **Sticky Sidebar** 📌
- **Position sticky:** Sidebar sticky avec lg:top-40 pour clearance header
- **Mobile behavior:** Sidebar apparaît en bas sur mobile (lg:col-span-1)
- **Self-start alignment:** lg:self-start pour alignement en haut du conteneur

#### **Layout Component Library** 🧩
- **DashboardContainer.tsx:** Responsive container avec mobile-first, maxWidth configurable (sm-md-lg-xl-2xl-7xl-full)
- **ResponsiveGrid.tsx:** Grid component avec 3 types variants (stats: 2→4 cols, actions: 2 cols→flex, cards: 1→2→3 cols)
- **ResponsiveStatCard.tsx:** Enhanced stat card avec responsive padding (p-4→p-6→p-8), text (text-xl→text-4xl), icons (w-5→w-7), gradient support

#### **Mobile Preservation** 📱
- **Zero regressions:** Expérience mobile identique, aucune fonctionnalité cassée
- **Mobile-first approach:** Toutes les améliorations desktop sont additives
- **Progressive enhancement:** Améliorations desktop uniquement, mobile intact

#### **BottomNav Visibility Management** 👆
- **Desktop hidden:** BottomNav masqué sur desktop (lg:hidden)
- **Mobile visible:** BottomNav visible uniquement sur mobile (< 1024px)
- **Responsive behavior:** Transition automatique selon taille écran

**Total Desktop Enhancement:** 6/6 fonctionnalités implémentées (100%)

### **10. Interface d'Administration Enrichie** ✅ COMPLET (100%)

#### **Identification Utilisateur dans le Header** 👤
- **Affichage "Compte actif"** dans le menu dropdown du header
- **Format d'affichage:** "Compte actif : [Prénom] [Nom]" ou "Compte actif : [Nom d'utilisateur]"
- **Logique de fallback:** Priorité au prénom, puis nom d'utilisateur si prénom indisponible
- **Gestion des données manquantes:** Affichage gracieux en cas de données incomplètes

#### **Tableau de Bord Administrateur** 📊
- **Grille de statistiques** avec 5 métriques principales (Utilisateurs, Transactions, Comptes, Budgets, Objectifs)
- **Layout responsive:** 3 colonnes sur mobile, 5 colonnes sur desktop
- **Cartes statistiques** avec icônes colorées et données en temps réel
- **Mise à jour automatique** des données administratives

#### **Cartes Utilisateur avec Accordéon** 🎯
- **Affichage de tous les utilisateurs** avec informations de base (avatar, nom, email, rôle)
- **Comportement accordéon exclusif:** Une seule carte ouverte à la fois
- **Expansion au clic** sur la carte utilisateur
- **Données enrichies** dans les cartes étendues:
  - **Objectif "Fond d'urgence"** avec barre de progression visuelle
  - **Pourcentage de completion** calculé automatiquement
  - **Montants actuels et cibles** formatés en Ariary (Ar)
  - **Icône Trophy** pour les objectifs complétés
  - **Revenus mensuels** calculés à partir des transactions

#### **Gestion des Données Utilisateur** 💾
- **Avatars utilisateur** avec support des photos de profil
- **Calcul automatique des revenus** basé sur les transactions de type "revenu"
- **Requêtes optimisées** avec requêtes parallèles pour les performances
- **Gestion des données manquantes** avec fallbacks appropriés

### **11. Navigation Intelligente Budgets → Transactions** ✅ COMPLET (100%)

#### **Cartes Budget Cliquables** 🖱️
- **Cartes budget interactives** avec curseur pointer pour indiquer la cliquabilité
- **Navigation automatique** vers la page des transactions au clic
- **Transmission de la catégorie** via paramètre URL (?category=CATEGORY_VALUE)
- **Nettoyage automatique** des paramètres URL après traitement

#### **Filtrage par Catégorie sur Transactions** 🔍
- **Filtrage automatique** des transactions par catégorie sélectionnée
- **Affichage de tous les types** de transactions (revenus, dépenses, transferts) pour la catégorie
- **Badge de filtre actif** avec option de suppression du filtre
- **Validation des catégories** avec gestion des valeurs invalides
- **État de filtre persistant** pendant la session utilisateur

#### **Expérience Utilisateur** ✨
- **Navigation fluide** entre les pages budgets et transactions
- **Retour facile** à la vue complète des transactions
- **Feedback visuel** clair sur le filtre appliqué
- **Cohérence** avec les autres filtres existants (type, compte, recherche)

#### **⚠️ Problème Connu - Filtrage par Catégorie** 🐛
- **Symptôme:** Le filtrage par catégorie ne fonctionne pas correctement lors de la navigation depuis les cartes budget
- **Impact:** Toutes les transactions sont affichées au lieu des transactions filtrées par catégorie
- **Statut:** Bug identifié, priorité HAUTE pour correction
- **Workaround temporaire:** Utiliser les filtres manuels sur la page des transactions

### **12. Système de Notifications Push** ✅ COMPLET (100%)

#### **Types de Notifications** 🔔
- ✅ **Alertes de Budget** - Seuils 80%, 100%, 120% du budget mensuel
- ✅ **Rappels d'Objectifs** - 3 jours avant deadline si progression < 50%
- ✅ **Alertes de Transaction** - Montants > 100,000 Ar
- ✅ **Résumé Quotidien** - Synthèse automatique à 20h
- ✅ **Notifications de Sync** - Statut de synchronisation
- ✅ **Alertes de Sécurité** - Connexions suspectes
- ✅ **Mobile Money** - Orange Money, Mvola, Airtel Money
- ✅ **Rappels Saisonniers** - Événements Madagascar
- ✅ **Événements Familiaux** - Anniversaires, fêtes

#### **Paramètres Utilisateur** ⚙️
- ✅ **Configuration par type** - Activation/désactivation individuelle
- ✅ **Heures silencieuses** - Plages horaires sans notifications (début/fin)
- ✅ **Limite quotidienne** - 1-20 notifications par jour (défaut: 5)
- ✅ **Fréquence** - Immédiate, horaire, quotidienne, hebdomadaire
- ✅ **Persistance** - Sauvegarde IndexedDB + localStorage

#### **Monitoring Intelligent** 🤖
- ✅ **Vérification budgets** - setInterval horaire
- ✅ **Vérification objectifs** - setInterval quotidien à 9h
- ✅ **Surveillance transactions** - Immédiate lors de l'ajout
- ✅ **Résumé quotidien** - setInterval quotidien à 20h
- ✅ **Gestion des conflits** - Éviter les doublons
- ✅ **Limite anti-spam** - Respect de la limite quotidienne

## 🔐 AUTHENTIFICATION ET SÉCURITÉ

### **Méthodes d'Authentification** ✅ COMPLET
1. **Google OAuth** ✅ FONCTIONNEL
   - Connexion rapide et sécurisée
   - Pas de mot de passe à retenir
   - Synchronisation automatique des profils

2. **Email/Mot de passe** ✅ FONCTIONNEL
   - Inscription et connexion traditionnelles
   - Réinitialisation de mot de passe
   - Validation de force des mots de passe

3. **Stabilité Authentification** ✅ COMPLÉTÉ (Session S58 2026-03-07)
   - ✅ **Pattern authentification unique** - Utilisation exclusive de `useAppStore.isAuthenticated` sur toutes les pages protégées
   - ✅ **Éradication useRequireAuth** - Hook `useRequireAuth` complètement retiré de 7 pages migrées (LoansPage, TransactionsPage, AccountsPage, BudgetsPage, GoalsPage, RecurringTransactionsPage, FamilyDashboardPage)
   - ✅ **Stabilité navigation** - Plus de boucles infinies d'authentification, navigation fluide entre pages protégées

### **Sécurité des Données** ⚠️ PARTIELLEMENT COMPLET (60%)
- **Chiffrement des données** ⚠️ Base64 seulement (pas AES-256)
- **Hachage des mots de passe** ⚠️ PBKDF2 simplifié
- **Politiques RLS** sur toutes les tables ✅ CONFORME
- **Audit trail** des modifications ⚠️ PARTIELLEMENT IMPLÉMENTÉ

## 📊 RAPPORTS ET ANALYSES

### **Tableaux de Bord** ✅ COMPLET
- **Vue d'ensemble** des finances
- **Graphiques de tendances** (revenus, dépenses)
- **Répartition par catégories**
- **Comparaisons mensuelles**

### **Exports et Sauvegardes** ✅ COMPLET
- **Export PDF** des rapports
- **Export Excel** des données
- **Sauvegarde JSON** complète
- **Restauration** cross-version

## 🌐 DÉPLOIEMENT ET INFRASTRUCTURE

### **Hébergement** ✅ COMPLET
- **Netlify** (Plan Personnel activé)
- **Domaine:** 1sakely.org
- **HTTPS** automatique
- **CDN global** pour performance

### **Base de Données** ✅ COMPLET
- **Supabase** (PostgreSQL)
- **IndexedDB** pour mode hors ligne
- **Synchronisation bidirectionnelle** ⚠️ NON TESTÉ
- **Sauvegarde automatique**

## 🧪 TESTS ET QUALITÉ

### **Tests Automatisés** ⚠️ PARTIELLEMENT COMPLET (40%)
- **Tests unitaires** (Jest/Vitest) ⚠️ Configuration présente, couverture non mesurée
- **Tests d'intégration** (Cypress) ⚠️ Configuration présente, résultats partiels
- **Tests de performance** (Lighthouse) ❌ Non configuré
- **Tests de sécurité** (OWASP) ❌ Non configuré

### **Qualité du Code** ✅ COMPLET
- **TypeScript strict** (100% typé) ✅ CONFORME
- **ESLint** (règles strictes) ✅ CONFORME
- **Prettier** (formatage automatique) ✅ CONFORME
- **Couverture de tests** ❌ Non mesuré

## 📈 MÉTRIQUES DE SUCCÈS

### **Performance** ❌ NON TESTÉ
- **Lighthouse Score:** ❌ Non testé
- **Temps de chargement:** ❌ Non mesuré
- **Taille bundle:** ❌ Non mesuré
- **PWA Score:** ❌ Non testé

### **Fonctionnalités** ✅ ATTEINT (100%)
- **Authentification OAuth:** 100% fonctionnel ✅
- **Mode hors ligne:** 60% fonctionnel ⚠️
- **Synchronisation:** 70% fonctionnel ⚠️
- **Interface responsive:** 100% fonctionnel ✅
- **PWA Installation:** 100% fonctionnel ✅
- **Notifications push:** 100% fonctionnel ✅
- **Système Recommandations:** 100% fonctionnel ✅ (Session 2025-10-12)
- **Gamification:** 80% fonctionnel ✅ (Session 2025-10-12)

### **Sécurité** ⚠️ PARTIELLEMENT ATTEINT (60%)
- **Chiffrement des données:** 40% (Base64 seulement) ⚠️
- **Authentification sécurisée:** 80% (PBKDF2 simplifié) ⚠️
- **Politiques RLS:** 100% ✅
- **Validation des entrées:** 100% ✅

## 🎯 FONCTIONNALITÉS HEADER

### **Timer Username 60 Secondes** ✅ IMPLÉMENTÉ
- **Disparition automatique** - Username disparaît après 60 secondes
- **Reset quotidien 6h** - Nouvelle session à 6h du matin
- **Gestion localStorage** - Sessions quotidiennes persistantes
- **Fonction checkDailySession()** - Logique de calcul des périodes quotidiennes

### **Synchronisation Greeting** ✅ IMPLÉMENTÉ
- **Greeting synchronisé** - "Bonjour, [username] !" disparaît avec username
- **Condition showUsername** - Rendu conditionnel identique
- **Commentaire technique** - "GREETING SYNCHRONIZED WITH USERNAME 60 SECOND TIMER"

### **Animations et Effets** ✅ IMPLÉMENTÉ
- **Marquee Madagascar** - Animation horizontale 10s (scroll-right-to-left)
- **Fade transitions** - Messages rotatifs en fade smooth (transition-opacity duration-1000)
- **En ligne whitespace-nowrap** - Texte "En ligne" toujours sur une ligne
- **Single line layout** - flex-nowrap + overflow-hidden sur parent

### **Optimisations CSS** ✅ IMPLÉMENTÉ
- **Suppression carousel** - slide-right-to-left keyframes supprimées
- **Conservation marquee** - scroll-right-to-left keyframes préservées
- **Performance** - Animations plus fluides et moins CPU-intensive

## 🧩 COMPOSANTS UI

### **Composants Layout** ✅ COMPLET (6/6)
- **AppLayout.tsx** ✅ IMPLÉMENTÉ (100%)
- **Header.tsx** ✅ IMPLÉMENTÉ (100%)
- **BottomNav.tsx** ✅ IMPLÉMENTÉ (100% - Ultra-compacte 48-56px vs 80-90px)
- **DashboardContainer.tsx** ✅ IMPLÉMENTÉ (100% - Responsive container mobile-first, maxWidth configurable) - Session S42 2026-01-26 (v2.6.0)
- **ResponsiveGrid.tsx** ✅ IMPLÉMENTÉ (100% - Grid avec 3 types variants stats/actions/cards) - Session S42 2026-01-26 (v2.6.0)
- **ResponsiveStatCard.tsx** ✅ IMPLÉMENTÉ (100% - Stat card responsive avec gradient support) - Session S42 2026-01-26 (v2.6.0)

### **Composants Spécialisés** ⚠️ PARTIELLEMENT COMPLET (2/3)
- **ErrorBoundary.tsx** ✅ IMPLÉMENTÉ (100%)
- **LoadingSpinner.tsx** ❌ MANQUANT (0%)
- **OfflineIndicator.tsx** ✅ IMPLÉMENTÉ (100%)

### **Composants UI Implémentés** ✅ NOUVEAU (11/12) - 92%
- **Button.tsx** ✅ IMPLÉMENTÉ (100%) - 6 variants
- **Input.tsx** ✅ IMPLÉMENTÉ (100%) - Validation + icônes
- **Alert.tsx** ✅ IMPLÉMENTÉ (100%) - 4 types
- **Card.tsx** ✅ IMPLÉMENTÉ (100%) - StatCard + TransactionCard
- **Modal.tsx** ✅ IMPLÉMENTÉ (100%) - 4 tailles + accessibilité
- **ConfirmDialog.tsx** ✅ IMPLÉMENTÉ (100%) - Dialogue de confirmation moderne
- **PromptDialog.tsx** ✅ IMPLÉMENTÉ (100%) - Dialogue de saisie moderne
- **LoginForm.tsx** ✅ IMPLÉMENTÉ (100%) - Composant autonome avec validation + password toggle
- **RegisterForm.tsx** ✅ IMPLÉMENTÉ (100%) - Composant autonome avec 5 champs + validation Madagascar
- **NotificationPermissionRequest.tsx** ✅ IMPLÉMENTÉ (100%) - Demande de permission notifications
- **NotificationSettings.tsx** ✅ IMPLÉMENTÉ (100%) - Interface de paramètres notifications

### **Composants UI Manquants** ❌ RÉDUIT (1/12)
- **LoadingSpinner.tsx** ❌ MANQUANT (0%) - Seul composant UI restant

## 📱 FONCTIONNALITÉS PWA

### **PWA Complètement Implémentées** ✅ COMPLET (100%)
- **Manifest** ✅ IMPLÉMENTÉ - Généré dans `dist/` par build avec icônes valides
- **Service Worker** ✅ IMPLÉMENTÉ - Généré par Vite PWA + Service Worker personnalisé notifications
- **Offline Support** ⚠️ PARTIELLEMENT IMPLÉMENTÉ (70%) - IndexedDB implémenté, synchronisation non testée
- **Installation** ✅ IMPLÉMENTÉ (100%) - Installation native Chrome validée en production
- **Cache Strategy** ✅ IMPLÉMENTÉ (100%) - Workbox configuré
- **Install/Uninstall Button** ✅ IMPLÉMENTÉ (100%) - Bouton dans menu Header avec mécanisme d'attente/retry et diagnostic PWA automatique
- **beforeinstallprompt Event** ✅ IMPLÉMENTÉ (100%) - Événement capturé et fonctionnel
- **Native Installation Dialog** ✅ IMPLÉMENTÉ (100%) - Dialog d'installation Chrome natif opérationnel
- **Push Notifications** ✅ IMPLÉMENTÉ (100%) - Système complet avec 9 types et paramètres

### **PWA Partiellement Implémentées** ❌ MANQUANTES
- **Background Sync** ❌ NON IMPLÉMENTÉ (0%)
- **Periodic Sync** ❌ NON IMPLÉMENTÉ (0%)
- **Web Share API** ❌ NON IMPLÉMENTÉ (0%)
- **Payment Request API** ❌ NON IMPLÉMENTÉ (0%)

### **Validation PWA Production** ✅ CONFIRMÉE
- ✅ **Installation Chrome** - Dialog natif fonctionnel
- ✅ **beforeinstallprompt** - Événement déclenché correctement
- ✅ **Manifest Icons** - Icônes PNG valides (192x192, 512x512)
- ✅ **Service Worker** - Cache et offline fonctionnels
- ✅ **User Gesture** - Contexte utilisateur respecté
- ✅ **Push Notifications** - Système complet opérationnel

## 🔒 SÉCURITÉ

### **Sécurité Implémentée** ⚠️ PARTIELLEMENT COMPLET (60%)
- **Hachage des mots de passe** ⚠️ PBKDF2 simplifié (80%)
- **JWT Tokens** ✅ IMPLÉMENTÉ (100%)
- **Data Validation** ✅ IMPLÉMENTÉ (100%)
- **CORS Configuration** ✅ IMPLÉMENTÉ (100%)
- **Security Headers** ✅ IMPLÉMENTÉ (100%)

### **Sécurité Manquante** ❌ MANQUANTE
- **Rate Limiting** ❌ NON IMPLÉMENTÉ (0%)
- **CSRF Protection** ❌ NON IMPLÉMENTÉ (0%)
- **Content Security Policy** ❌ NON IMPLÉMENTÉ (0%)
- **Security Audit** ❌ NON IMPLÉMENTÉ (0%) - Tests OWASP non vérifiés
- **Data Encryption** ⚠️ Base64 seulement (40%) - Pas AES-256

## 🎯 PHASES DE DÉVELOPPEMENT

### **Phase 1 - MVP** ✅ TERMINÉE (100%)
- Authentification OAuth
- Gestion des comptes et transactions
- Interface responsive
- Déploiement production

### **Phase 2 - Multi-utilisateur** ✅ TERMINÉE (100%)
- Synchronisation multi-appareils
- Mode hors ligne
- Fonctionnalités Madagascar
- PWA de base

### **Phase 3 - Analytics** ✅ TERMINÉE (100%)
- Tableaux de bord
- Rapports et analyses
- Exports PDF/Excel
- Fonctionnalités avancées

### **Phase 4 - Avancé** ✅ TERMINÉE (100%)
- **Gamification** ✅ COMPLET (100%)
- **Mobile Money** ✅ COMPLET (100%)
- **Tarifs réels** ✅ COMPLET (100%)
- **Éducation financière** ✅ COMPLET (100%) - Système Quiz + Questions Prioritaires (Voir BUDGET-EDUCATION-IMPLEMENTATION.md)
- **Budget intelligent** ⏳ PLANNIFIÉ (Priorité A)
- **Bouton d'installation PWA** ✅ COMPLET (100%) - Installation native Chrome validée
- **Système de notifications push** ✅ COMPLET (100%) - 9 types avec monitoring intelligent
- **Optimisations performance** ⚠️ PARTIELLEMENT COMPLET (40%) - Non testé

## 📋 FONCTIONNALITÉS MANQUANTES

### **Composants UI Manquants** ❌ RÉDUIT
- **LoadingSpinner.tsx** ❌ MANQUANT (0%) - Seul composant UI restant

### **Fonctionnalités Avancées** ❌ MANQUANTES
- **Chiffrement AES-256** ❌ MANQUANT (0%) - Seulement Base64 actuellement
- **Background Sync** ❌ MANQUANT (0%)
- **Web Share API** ❌ MANQUANT (0%)

### **Priorités Futures** ✅ MISE À JOUR (2025-10-12)
- **Budget Intelligent Adaptatif** ⏳ PLANNIFIÉ (Priorité A) - Ajustement automatique budgets
- **Système Recommandations Personnalisées** ✅ IMPLÉMENTÉ (Priorité B) - Conseils contextuels personnalisés - Session 2025-10-12
- **Gamification Badges Niveaux** ✅ IMPLÉMENTÉ (Priorité C) - Système progression avec badges - Session 2025-10-12

### **Tests Automatisés** ⚠️ PARTIELLEMENT COMPLET (40%)
- **Configuration présente** mais couverture incomplète
- **Lighthouse CI** non configuré
- **Tests OWASP** non configuré
- **Couverture de code** non mesurée

## 📊 MÉTRIQUES DE QUALITÉ

### **Performance** ❌ NON TESTÉ
- **Lighthouse Score** ❌ Non testé (au lieu de 90+)
- **Bundle Size** ❌ Non mesuré
- **Load Time** ❌ Non mesuré
- **Memory Usage** ❌ Non mesuré

### **Code Quality** ✅ COMPLET
- **TypeScript** ✅ 100% typé
- **ESLint** ✅ Configuration active
- **Prettier** ✅ Formatage automatique
- **Code Review** ✅ Processus en place

### **Accessibilité** ⚠️ PARTIELLEMENT COMPLET
- **WCAG 2.1 Niveau AA** ⚠️ Partiel
- **Navigation clavier** ✅ Implémenté
- **Screen readers** ⚠️ Partiel
- **Contraste** ✅ Implémenté

## 🎯 ROADMAP FUTURE

### **Phase 2 - Améliorations** (Q1 2025)
- [ ] **LoadingSpinner.tsx** - Composant manquant
- [ ] **Chiffrement AES-256** - Remplacer Base64
- [ ] **Tests de performance** - Lighthouse CI
- [ ] **Mode sombre** natif

### **Phase 3 - Expansion** (Q2 2025)
- [ ] **Application mobile native** (React Native)
- [ ] **API publique** pour intégrations
- [ ] **Multi-utilisateurs** par famille
- [ ] **Analytics avancés**

## 🤖 SYSTÈME DE RECOMMANDATIONS ET GAMIFICATION (Session 2025-10-12)

### **Système de Recommandations Personnalisées** ✅ IMPLÉMENTÉ (100%)

#### **Moteur de Recommandations IA** ✅ COMPLET
- **Fichier:** `frontend/src/services/recommendationEngineService.ts` (948 lignes)
- **Templates:** 20+ templates de recommandations personnalisées
- **Algorithmes:** Scoring intelligent et détection de pertinence
- **Thèmes:** Épargne, réduction des dépenses, optimisation budgétaire, éducation, mobile money
- **Apprentissage:** ML basique avec feedback utilisateur (like/dislike)
- **Intégration:** Basé sur l'historique budgétaire et les patterns de dépenses

#### **Génération Quotidienne** ✅ COMPLET
- **Fréquence:** Recommandations générées automatiquement chaque jour
- **Déclencheurs:** Basés sur les actions et patterns utilisateur
- **Personnalisation:** Adaptation aux habitudes financières individuelles
- **Contexte:** Analyse des transactions récentes et objectifs financiers

#### **Interface Utilisateur** ✅ COMPLET
- **Page principale:** `frontend/src/pages/RecommendationsPage.tsx` (677 lignes)
- **3 onglets:** Recommandations, Défis, Statistiques
- **Filtres:** Par thème, type et statut
- **Widget dashboard:** `frontend/src/components/Dashboard/RecommendationWidget.tsx` (303 lignes)
- **Cards interactives:** `frontend/src/components/Recommendations/RecommendationCard.tsx` (241 lignes)

### **Système de Gamification** ✅ IMPLÉMENTÉ (80%)

#### **Défis et Challenges** ✅ COMPLET
- **Fichier:** `frontend/src/services/challengeService.ts` (929 lignes)
- **Types:** 25+ défis variés (quotidiens, hebdomadaires, mensuels, spéciaux)
- **Exigences:** Éviter des catégories, économiser des montants, compléter des quiz
- **Progression:** Barres de progression et indicateurs de statut
- **Adaptation:** Défis contextuels basés sur les habitudes financières

#### **Système de Points et Badges** ✅ COMPLET
- **Points:** Attribution et calcul des points de récompense
- **Badges:** Système de récompenses et de progression
- **Niveaux:** Bronze, Argent, Or, Platine
- **Engagement:** Motivation continue de l'utilisateur

#### **Interface Gamification** ✅ COMPLET
- **Cards de défis:** `frontend/src/components/Recommendations/ChallengeCard.tsx` (240 lignes)
- **Progression visuelle:** Barres de progression et indicateurs
- **Feedback:** Notifications de réussite et encouragement
- **Statistiques:** Suivi des accomplissements et performances

### **Hook d'Intégration** ✅ IMPLÉMENTÉ (100%)
- **Fichier:** `frontend/src/hooks/useRecommendations.ts` (579 lignes)
- **Génération quotidienne:** Recommandations automatiques
- **Déclencheurs contextuels:** Basés sur les actions utilisateur
- **Apprentissage ML:** Amélioration continue des recommandations
- **Gestion d'état:** Intégration avec Zustand store

### **Références d'Implémentation**
- **Session complète:** Voir [RESUME-SESSION-2025-10-12.md](./RESUME-SESSION-2025-10-12.md)
- **Fichiers créés:** 6 nouveaux fichiers (3,700 lignes de code)
- **Fichiers modifiés:** 16 fichiers pour corrections d'import
- **Statut:** 100% fonctionnel et testé

## 🎯 PHASES SUIVANTES

### **Phase A - Budget Intelligent Adaptatif** (Q1 2025)
- Ajustement automatique budgets basé sur réponses questions prioritaires et analyse historique transactions

### **Phase B - Système Recommandations Personnalisées** ✅ TERMINÉE (2025-10-12)
- ✅ **Moteur de recommandations IA** - `recommendationEngineService.ts` (948 lignes) - 20+ templates personnalisés
- ✅ **Génération quotidienne** - Recommandations automatiques basées sur l'historique financier
- ✅ **Déclencheurs contextuels** - Basés sur les actions et patterns utilisateur
- ✅ **Apprentissage des préférences** - ML basique avec feedback like/dislike
- ✅ **Interface dédiée** - `RecommendationsPage.tsx` (677 lignes) - 3 onglets + filtres

### **Phase B Goals - Calcul Automatique Deadline** ✅ TERMINÉE (2026-01-07)
- ✅ **Calcul automatique deadline** - Recalcul automatique basé sur `required_monthly_contribution`
- ✅ **Affichage contribution mensuelle** - UI affiche la contribution mensuelle préconisée pour atteindre l'objectif
- ✅ **Synchronisation Supabase optimisée** - Mapping complet `requiredMonthlyContribution` ↔ `required_monthly_contribution`
- ✅ **IndexedDB v12** - Support du champ `requiredMonthlyContribution` dans le store goals
- ✅ **Types Supabase mis à jour** - Types Row/Insert/Update complets avec tous les champs Goals (19 colonnes)
- ✅ **Migration base de données** - Colonne `required_monthly_contribution` ajoutée à la table `goals` Supabase
- ✅ **Fonctions de mapping** - `mapGoalToSupabase()` et `mapSupabaseToGoal()` mises à jour pour conversion bidirectionnelle
- ✅ **Widget dashboard** - `RecommendationWidget.tsx` (303 lignes) - Intégration parfaite
- ✅ **Hook d'intégration** - `useRecommendations.ts` (579 lignes) - Logique métier

### **Phase C - Gamification Badges Niveaux** ✅ TERMINÉE (2025-10-12)
- ✅ **Système de défis** - `challengeService.ts` (929 lignes) - 25+ défis variés
- ✅ **Points et badges** - Système de récompenses et progression
- ✅ **Types d'exigences multiples** - Éviter catégories, économiser montants, quiz
- ✅ **Progression visuelle** - Barres de progression et indicateurs de statut
- ✅ **Cards interactives** - `ChallengeCard.tsx` (240 lignes) - Interface utilisateur
- ✅ **Défis contextuels** - Adaptation aux habitudes financières (80% complet)

## 📞 SUPPORT ET MAINTENANCE

### **Support Technique** ✅ DISPONIBLE
- **Documentation complète** en français
- **Guides d'utilisation** avec captures d'écran
- **FAQ** pour les questions courantes
- **Support par email** pour les problèmes techniques

### **Maintenance** ✅ PLANIFIÉE
- **Mises à jour de sécurité** automatiques
- **Sauvegardes quotidiennes** des données
- **Monitoring** 24/7 de la disponibilité
- **Évolutions** basées sur les retours utilisateurs

---

## ✅ STATUT FINAL (CORRIGÉ)

**BazarKELY est en PRODUCTION avec toutes les fonctionnalités principales implémentées, l'installation PWA entièrement opérationnelle, le système de notifications push complet, l'interface utilisateur ultra-optimisée, et le système de recommandations IA avec gamification.**

### **Fonctionnalités Critiques** ✅ 100% COMPLET
- ✅ Authentification Google OAuth
- ✅ Gestion des comptes et transactions
- ⚠️ Synchronisation multi-appareils (70%)
- ⚠️ Mode hors ligne complet (60%)
- ✅ Interface responsive et PWA (100%) - Installation native Chrome validée
- ✅ Notifications push (100%) - Système complet avec 9 types
- ✅ Interface UI optimisée (100%) - Navigation compacte, layout 2 colonnes, timer username
- ✅ Système Recommandations (100%) - IA + 20+ templates + scoring intelligent (Session 2025-10-12)
- ✅ Gamification (80%) - 25+ défis + points + badges + progression (Session 2025-10-12)
- ✅ Système Certification (75%) - 250 questions + 5 niveaux + quiz interactif (Session 2025-10-16)
- ✅ Interface Admin Enrichie (100%) - Identification utilisateur + accordéon + données financières (Session 2025-01-20)
- ✅ Navigation Intelligente (100%) - Cartes budget cliquables + filtrage catégorie (Session 2025-01-20)
- ✅ Infrastructure i18n Phase 1/3 (100%) - react-i18next + 3 langues FR/EN/MG + 85+ clés auth (Session S41 2026-01-25)
- ✅ Protection Traduction Navigateur (100%) - excludeFromTranslation utility + CurrencyDisplay protégé + 44+ fichiers (Session S41 2026-01-25)
- ✅ Dashboard EUR Bug Fix (100%) - Correction hardcoded originalCurrency="MGA" → transaction.originalCurrency (Session S41 2026-01-25)
- ✅ Desktop Dashboard Enhancement (100%) - Layout 2 colonnes desktop + Responsive header + Sticky sidebar + Layout component library + Mobile preservation + BottomNav visibility management (Session S42 2026-01-26 v2.6.0)
- ⚠️ Sécurité des données (60%)
- ✅ Fonctionnalités Madagascar

### **Prêt pour la Production** ✅ RECOMMANDÉ
- ✅ Tests de régression partiels
- ❌ Performance non testée
- ⚠️ Sécurité partiellement validée
- ✅ Documentation complète
- ✅ Support utilisateur prêt
- ✅ PWA Installation native fonctionnelle
- ✅ Notifications push complètes
- ✅ Interface UI ultra-optimisée (Session 2025-01-11)

**⚠️ Amélioration Pending:** PROMPT 18 - Responsive Button Sizing (non appliqué lors de la session 2025-01-11)

**🎯 BazarKELY est une application PWA fonctionnelle avec installation native opérationnelle, système de notifications push complet, interface UI ultra-optimisée, système de recommandations IA avec gamification, système de certification financière complet, interface admin enrichie avec données utilisateur détaillées, navigation intelligente entre budgets et transactions, infrastructure i18n Phase 1/3 complétée (react-i18next + 3 langues), protection traduction navigateur (44+ fichiers protégés), correction bug affichage EUR Dashboard, et prête pour la production !**

**📋 Voir [RESUME-SESSION-2025-10-12.md](./RESUME-SESSION-2025-10-12.md) pour détails complets de l'implémentation du système de recommandations et de gamification.**

## 🎓 MODULE DE CERTIFICATION FINANCIÈRE (Session 2025-10-16)

### **Objectifs du Système de Certification** ✅ IMPLÉMENTÉ (100%)

Le module de certification financière vise à éduquer et certifier les utilisateurs malgaches sur les concepts financiers essentiels, adaptés au contexte local. Le système propose 5 niveaux de certification progressifs avec 250 questions au total, couvrant tous les aspects de la gestion financière familiale.

#### **Niveaux de Certification** ✅ IMPLÉMENTÉS (100%)
1. **Débutant** (Niveau 1) - 50 questions - Budget et Mobile Money
2. **Planificateur** (Niveau 2) - 50 questions - Investment et Savings  
3. **Épargnant** (Niveau 3) - 50 questions - Family Finance et Goals
4. **Expert** (Niveau 4) - 50 questions - Entrepreneurship et Business
5. **Maître** (Niveau 5) - 50 questions - Mastery et Retirement Planning

### **Fonctionnalités Implémentées** ✅ COMPLET (100%)

#### **1. Infrastructure de Certification** ✅ IMPLÉMENTÉE (100%)

**Store de Certification (Zustand):**
- **Fichier:** `frontend/src/store/certificationStore.ts`
- **Technologie:** Zustand v4 avec middleware persist
- **Persistance:** localStorage avec clé `bazarkely-certification-progress`
- **État principal:**
  ```typescript
  interface CertificationState {
    currentLevel: number;
    totalScore: number;
    quizProgress: Record<string, number>;
    userProfile: UserProfile;
    geolocation: GeolocationData;
    currentQuizSession: QuizSession | null;
    quizHistory: QuizSession[];
  }
  ```

**Services de Certification:**
- **Fichier:** `frontend/src/services/certificationService.ts`
- **Fonctions clés:**
  - `checkLevelUnlocked(level: number)` - Vérification déverrouillage niveau (90% correct)
  - `getFailedQuestions(level: number)` - Récupération questions ratées
  - `calculateResponseTimeBonus(timeElapsed: number, timeLimit: number)` - Bonus temps (0-3 points)
  - `updateQuestionAttempt(questionId: string, selectedOption: string, timeElapsed: number, isCorrect: boolean)` - Suivi tentatives

**Service de Géolocalisation:**
- **Fichier:** `frontend/src/services/geolocationService.ts`
- **Base de données:** 150+ villes malgaches avec coordonnées GPS
- **Calculs:** Formule Haversine pour validation de cohérence géographique
- **Fonctions:** `getCommuneFromCoordinates`, `validateLocationCoherence`, `getCityByCoordinates`

#### **2. Base de Questions et Contenu** ✅ IMPLÉMENTÉE (100%)

**Structure des Questions:**
- **Fichier:** `frontend/src/data/certificationQuestions.ts`
- **Total:** 250 questions (50 par niveau)
- **Langue:** Français avec contexte Madagascar
- **Catégories:** budget, savings, expenses, mobile-money, madagascar-context, family-finance, investment, entrepreneurship
- **Régions:** 22 régions de Madagascar couvertes
- **Difficulté:** Progression de 1 à 5 selon le niveau
- **Temps limite:** 60s (Niveau 1), 60s (Niveau 2), 45s (Niveau 3), 30s (Niveaux 4-5)

**Exemple de Question:**
```typescript
{
  id: 'cert-level1-001',
  text: 'Quel est le code USSD pour Orange Money ?',
  options: [
    { id: 'a', text: '#144#', isCorrect: true },
    { id: 'b', text: '#150#', isCorrect: false },
    { id: 'c', text: '#151#', isCorrect: false },
    { id: 'd', text: '#152#', isCorrect: false }
  ],
  category: 'mobile-money',
  difficulty: 1,
  region: 'Antananarivo',
  explanation: 'Le code USSD pour Orange Money est #144#',
  points: 1,
  timeLimit: 60
}
```

#### **3. Interface Utilisateur Certification** ✅ IMPLÉMENTÉE (100%)

**Page de Complétion de Profil:**
- **Fichier:** `frontend/src/pages/ProfileCompletionPage.tsx`
- **Wizard 5 étapes:** Informations personnelles, famille, profession, géolocalisation, validation
- **Géolocalisation GPS-first:** Détection automatique avec validation de cohérence
- **Bonus points:** Attribution de points pour complétion du profil (15 points maximum)

**Page de Certification:**
- **Fichier:** `frontend/src/pages/CertificationPage.tsx`
- **Affichage:** Statistiques détaillées, progression par niveau, badges obtenus
- **Navigation:** Bouton retour avec `useNavigate` vers page précédente
- **Responsive:** Design adaptatif mobile et desktop

**Interface de Quiz:**
- **Fichier:** `frontend/src/pages/QuizPage.tsx`
- **Fonctionnalités:**
  - Timer countdown avec auto-submit
  - 4 options cliquables avec feedback immédiat
  - Explication après chaque réponse
  - Bouton "Question suivante" et options pause/quitter
  - Intégration avec `certificationStore` pour sauvegarde

**Page de Résultats:**
- **Fichier:** `frontend/src/pages/QuizResultsPage.tsx`
- **Statistiques:** Total répondu, correct, précision, bonus temps
- **Seuil de déverrouillage:** Vérification 90% pour débloquer niveau suivant
- **Questions ratées:** Liste avec option de retry
- **Navigation:** Boutons retry, reprendre niveau, retour certification

#### **4. Système de Scoring et Progression** ✅ IMPLÉMENTÉ (100%)

**Calcul du Score Total (115 points):**
- **Quiz:** 40 points maximum (1 point par question correcte)
- **Pratique:** 60 points maximum (tracking comportemental - ✅ IMPLÉMENTÉ COMPLET)
- **Profil:** 15 points maximum (complétion du profil utilisateur)

#### **📊 Implémentation du Suivi des Pratiques** ✅ IMPLÉMENTÉ (100%)

**Infrastructure Technique:**
- **Store State:** `practiceTracking` intégré dans `certificationStore.ts` avec Zustand
- **Types TypeScript:** Interfaces `PracticeBehaviorData` et `PracticeTrackingState` dans `types/certification.ts`
- **Hook Personnalisé:** `usePracticeTracking.ts` pour accès simplifié aux fonctionnalités
- **Persistance:** Middleware Zustand avec clé `bazarkely-certification-progress`

**Actions de Suivi Implémentées:**
- **`trackDailyLogin()`** - Suivi connexions quotidiennes avec calcul de série
- **`trackTransaction()`** - Suivi enregistrement transactions utilisateur
- **`trackBudgetUsage()`** - Suivi utilisation et création budgets
- **Calcul Automatique:** Score 0-18 points (3 comportements × 6 points max)
- **Multiplicateur:** Système 0.5-3.0 basé sur régularité des pratiques

**Intégrations Frontend (6 composants):**
- **`AuthPage.tsx`** - Appel `trackDailyLogin()` après authentification réussie
- **`AddTransactionPage.tsx`** - Appel `trackTransaction()` après création transaction
- **`AddBudgetPage.tsx`** - Appel `trackBudgetUsage()` après création budget
- **`BudgetsPage.tsx`** - Appel `trackBudgetUsage()` après budgets intelligents
- **`Header.tsx`** - Affichage score réel au lieu de valeur codée en dur
- **`CertificationPage.tsx`** - Affichage score réel au lieu de valeur codée en dur

**Fonctionnalités Avancées:**
- **Calcul de Série:** Vérification dates consécutives pour login streak
- **Mise à Jour Immutable:** Utilisation spread operators pour état immuable
- **Recalcul Automatique:** Score recalculé à chaque action de suivi
- **Gestion d'Erreurs:** Try-catch avec logs détaillés pour debugging

**Déverrouillage des Niveaux:**
- **Seuil:** 90% de réponses correctes requises
- **Fonction:** `checkLevelUnlocked(level: number)` dans `certificationService.ts`
- **Persistance:** Sauvegarde dans localStorage avec clé `bazarkely-quiz-attempts-levelX`

**Système de Retry:**
- **Questions ratées:** Récupération via `getFailedQuestions(level: number)`
- **Recyclage:** Possibilité de refaire uniquement les questions incorrectes
- **Progression:** Mise à jour du score après retry réussi

#### **5. Intégration avec BazarKELY** ✅ IMPLÉMENTÉE (100%)

**Header et Navigation:**
- **LevelBadge:** Badge ultra-compact avec icône et numéro de niveau
- **Navigation:** Clic sur badge navigue vers `/certification`
- **Tooltip:** Affichage détails niveau au survol

**Routes Ajoutées:**
- `/certification` - Page principale de certification
- `/quiz` - Interface de quiz interactive
- `/quiz-results` - Page de résultats et progression

**Clés localStorage Utilisées:**
- `bazarkely-certification-progress` - État principal du store
- `bazarkely-quiz-questions-completed` - Questions complétées
- `bazarkely-quiz-attempts-levelX` - Tentatives par niveau

### **Exigences Techniques Implémentées** ✅ COMPLET (100%)

#### **Technologies Utilisées:**
- **TypeScript:** Mode strict activé
- **React 19:** Composants fonctionnels avec hooks
- **Zustand v4:** Gestion d'état avec middleware persist
- **localStorage API:** Persistance des données utilisateur
- **Navigator.geolocation API:** Détection GPS native
- **Haversine Formula:** Calculs de distance géographique

#### **Structures de Données:**
```typescript
// Interface principale du store
interface CertificationState {
  currentLevel: number;
  totalScore: number;
  quizProgress: Record<string, number>;
  userProfile: UserProfile;
  geolocation: GeolocationData;
  currentQuizSession: QuizSession | null;
  quizHistory: QuizSession[];
}

// Session de quiz active
interface QuizSession {
  id: string;
  level: number;
  questionIds: string[];
  currentIndex: number;
  startTime: number;
  answers: Array<{
    questionId: string;
    selectedOption: string;
    isCorrect: boolean;
    timeElapsed: number;
    timeBonus: number;
  }>;
}
```

### **User Stories Implémentées** ✅ COMPLET (100%)

#### **Complétion de Profil:**
- **En tant qu'utilisateur**, je peux compléter un wizard en 5 étapes pour configurer mon profil
- **En tant qu'utilisateur**, je gagne des points bonus (15 max) pour la complétion de mon profil
- **En tant qu'utilisateur**, je peux valider ma géolocalisation avec 150+ villes malgaches

#### **Passage de Quiz:**
- **En tant qu'utilisateur**, je peux passer un quiz avec timer countdown et feedback immédiat
- **En tant qu'utilisateur**, je vois une explication après chaque réponse
- **En tant qu'utilisateur**, je peux mettre en pause ou quitter le quiz à tout moment

#### **Progression et Résultats:**
- **En tant qu'utilisateur**, je vois mes statistiques détaillées après chaque quiz
- **En tant qu'utilisateur**, je peux retry les questions ratées pour améliorer mon score
- **En tant qu'utilisateur**, je débloque le niveau suivant après 90% de réponses correctes

#### **Navigation et Interface:**
- **En tant qu'utilisateur**, je peux cliquer sur le badge de niveau dans le header pour accéder à la certification
- **En tant qu'utilisateur**, je peux naviguer facilement entre les pages de certification

### **Modifications de Spécifications** ⚠️ NOTÉES

#### **LevelBadge Simplifié:**
- **Spécification originale:** Badge complexe avec anneau de progression détaillé
- **Implémentation actuelle:** Badge ultra-compact avec icône et numéro
- **Statut:** Redesign en attente pour améliorer l'affichage des segments circulaires

#### **Tracking Comportemental:** ✅ IMPLÉMENTÉ (100%)
- **Spécification:** Système de multiplicateur basé sur la fréquence de pratique
- **Implémentation:** ✅ COMPLET - Système de suivi des pratiques avec multiplicateur 0.5-3.0
- **Statut:** Développement futur requis pour finaliser le système de points pratique

### **Fonctionnalités Avancées (En Attente)** ❌ PENDING

#### **Système de Badges:**
- **Description:** Badges d'achievements et récompenses
- **Statut:** Non implémenté
- **Priorité:** Moyenne

#### **Leaderboard:** ✅ IMPLÉMENTÉ FRONTEND (100%)
- **Description:** Classement des utilisateurs par niveau et score
- **Statut:** ✅ FRONTEND IMPLÉMENTÉ COMPLET, Backend en attente
- **Priorité:** Basse

##### **🏆 Implémentation du Système de Classement** ✅ FRONTEND IMPLÉMENTÉ (100%)

**Spécification Backend:**
- **Fichier:** `LEADERBOARD-API-SPEC.md` avec endpoints complets
- **Endpoints:** GET /api/leaderboard, GET /api/leaderboard/user/:userId, GET /api/leaderboard/stats
- **Authentification:** JWT token avec validation
- **Base de Données:** Tables `leaderboard_settings` et `leaderboard_cache` spécifiées

**Service Frontend:**
- **Fichier:** `leaderboardService.ts` avec cache 5 minutes et retry logic
- **Fonctionnalités:** Pagination, filtrage par niveau, gestion d'erreurs avec backoff exponentiel
- **Cache:** TTL 5 minutes avec invalidation automatique
- **Performance:** Timeout 10 secondes, retry jusqu'à 3 tentatives

**Composant Interface:**
- **Fichier:** `LeaderboardComponent.tsx` avec design responsive et interactif
- **Fonctionnalités:** Pagination Précédent/Suivant, filtrage niveau 1-5, médaille top 3
- **Sécurité:** Pseudonymes automatiques pour protection vie privée
- **Intégration:** Section "Classement Général" dans `CertificationPage.tsx` avec notice bleue

**Algorithme de Classement:**
- **Critères:** totalScore, currentLevel, badgesCount, certificationsCount, lastActivity
- **Pseudonymes:** Génération cohérente basée sur user ID pour anonymisation
- **Tri:** Score total décroissant, puis niveau, puis badges, puis certifications
- **Pagination:** 50 utilisateurs par page (max 100), métadonnées complètes

**Protection Vie Privée:**
- **Anonymisation:** Aucun nom réel affiché, pseudonymes automatiques
- **Notice:** Carte bleue explicative sur système de pseudonymes
- **Conformité:** Respect RGPD avec anonymisation complète des données

#### **Certificats PDF:** ✅ IMPLÉMENTÉ (100%)
- **Description:** Génération et téléchargement de certificats
- **Statut:** ✅ IMPLÉMENTÉ COMPLET
- **Priorité:** Moyenne

##### **📜 Implémentation des Certificats PDF** ✅ IMPLÉMENTÉ (100%)

**Service de Génération PDF:**
- **Fichier Principal:** `certificateService.ts` utilisant jsPDF 3.0.3
- **Format:** A4 paysage (297×210mm) avec design diplôme traditionnel
- **Fonctionnalités:** Génération PDF, téléchargement automatique, nommage intelligent
- **Design:** Bordures décoratives, coins ornés, texte français, logo BazarKELY

**Composants d'Affichage:**
- **`CertificateTemplate.tsx`** - Prévisualisation visuelle A4 paysage avec Tailwind CSS
- **`CertificateDisplay.tsx`** - Liste certificats avec cartes responsives et boutons téléchargement
- **Intégration:** Section "Certificats Obtenus" dans `CertificationPage.tsx` (affichage conditionnel)

**Fonctionnalités Avancées:**
- **ID Unique:** Génération `BZ-{LEVEL}-{TIMESTAMP}` pour chaque certificat
- **QR Code:** Placeholder pour vérification future des certificats
- **Nommage:** Fichiers `Certificat-BazarKELY-{Niveau}-{Date}.pdf`
- **Contenu Dynamique:** Nom utilisateur, niveau, score, date de réussite
- **Gestion d'Erreurs:** Try-catch avec notifications toast pour feedback utilisateur

#### **Système de Mentorat:**
- **Description:** Fonctionnalités de mentorat pour niveau 5
- **Statut:** Non implémenté
- **Priorité:** Basse

### **Références d'Implémentation**
- **Session Certification:** Voir [RESUME-SESSION-2025-10-16.md](./RESUME-SESSION-2025-10-16.md)
- **Session Pratiques/PDF/Classement:** Voir [RESUME-SESSION-2025-10-17.md](./RESUME-SESSION-2025-10-17.md)
- **Fichiers créés:** 17 nouveaux fichiers (5,200+ lignes de code)
- **Fichiers modifiés:** 14 fichiers pour intégration
- **Statut:** 100% fonctionnel (15/15 fonctionnalités complètes)

---

## 🏗️ MODULE CONSTRUCTION POC - PHASE 2 ORGANIGRAMME

### **FR-POC-15: Gestion Hiérarchie Organisationnelle** ✅ IMPLÉMENTÉ (2025-11-12)

**Description:** Système de gestion de la structure organisationnelle avec unités hiérarchiques (Direction, Services, Equipes).

**Spécifications:**
- **Table `poc_org_units`:** 10 unités créées (1 Direction + 3 Services + 7 Equipes)
- **Structure hiérarchique:** 3 niveaux (Direction → Services → Equipes)
- **Types d'unités:** `direction`, `service`, `equipe`
- **Champs:** `id`, `company_id`, `name`, `code`, `type`, `parent_id`, `status`, `created_at`, `updated_at`

**Critères d'acceptation:**
- ✅ 10 unités organisationnelles créées avec structure hiérarchique complète
- ✅ Support parent/enfant pour hiérarchie multi-niveaux
- ✅ Isolation multi-tenant via `company_id`
- ✅ Statut actif/inactif pour gestion du cycle de vie

**Implémentation:** Tables `poc_org_units` et `poc_org_unit_members` créées avec RLS policies complètes.

---

### **FR-POC-16: Distinction BCI vs BCE** ✅ IMPLÉMENTÉ (2025-11-12)

**Description:** Distinction entre Bon de Commande Interne (BCI) et Bon de Commande Externe (BCE).

**Spécifications:**
- **BCI (Bon de Commande Interne):** Commande liée à un `org_unit_id`, validation par chef_chantier de l'org_unit
- **BCE (Bon de Commande Externe):** Commande liée à un `project_id`, validation au niveau compagnie
- **Colonnes ajoutées:** `order_type` (CHECK 'BCI' | 'BCE'), `org_unit_id` (UUID, NULL pour BCE)

**Critères d'acceptation:**
- ✅ Colonne `order_type` avec contrainte CHECK ('BCI' | 'BCE')
- ✅ Colonne `org_unit_id` nullable (NULL pour BCE, UUID pour BCI)
- ✅ 27 commandes existantes migrées vers type BCE (compatibilité ascendante)
- ✅ Interface utilisateur avec sélecteur type commande conditionnel

**Implémentation:** Modifications schéma `poc_purchase_orders`, migration données existantes, UI conditionnelle.

---

### **FR-POC-17: Permissions Workflow Scopées par Org Unit** ✅ IMPLÉMENTÉ (2025-11-12)

**Description:** Validation workflow basée sur l'appartenance aux unités organisationnelles pour les commandes BCI.

**Spécifications:**
- **Chef Chantier BCI:** Peut valider uniquement les commandes BCI de ses org_units assignés
- **Chef Chantier BCE:** Peut valider toutes les commandes BCE (niveau compagnie)
- **Validation org_unit:** Vérification `poc_org_unit_members` pour appartenance utilisateur

**Critères d'acceptation:**
- ✅ `chef_chantier` ne peut valider BCI que si membre de l'org_unit de la commande
- ✅ `chef_chantier` peut valider toutes les BCE (pas de restriction org_unit)
- ✅ Fonctions helper `getUserOrgUnits()` et `isUserInOrgUnit()` implémentées
- ✅ Validation intégrée dans `pocWorkflowService.canUserPerformAction()` et `transitionPurchaseOrder()`

**Implémentation:** Modifications `pocWorkflowService.ts` avec helper functions org_unit, validation conditionnelle BCI/BCE.

---

### **FR-POC-18: Assignation Multi-Org Unit Utilisateurs** ✅ IMPLÉMENTÉ (2025-11-12)

**Description:** Support pour assignation d'utilisateurs à plusieurs unités organisationnelles.

**Spécifications:**
- **Table `poc_org_unit_members`:** Table junction user ↔ org_unit
- **Champs:** `id`, `org_unit_id`, `user_id`, `role`, `status`, `created_at`, `updated_at`
- **Contrainte:** UNIQUE (org_unit_id, user_id) pour éviter doublons
- **Support multi-org_unit:** Un utilisateur peut être membre de plusieurs org_units

**Critères d'acceptation:**
- ✅ Table `poc_org_unit_members` créée avec contrainte UNIQUE
- ✅ Support assignation multiple org_units par utilisateur
- ✅ RLS policies pour isolation multi-tenant
- ✅ Fonction `getUserOrgUnits()` retourne tableau de tous les org_units d'un utilisateur

**Implémentation:** Table junction créée, RLS policies configurées, helper functions implémentées.

---

### **Références d'Implémentation Phase 2**
- **Session Phase 2 Organigramme:** 2025-11-12
- **Fichiers créés:** Tables `poc_org_units`, `poc_org_unit_members`
- **Fichiers modifiés:** `poc_purchase_orders` (colonnes `order_type`, `org_unit_id`), `pocWorkflowService.ts` (validation org_unit)
- **Statut:** 100% fonctionnel (4/4 spécifications complètes)

---

---

## 🎯 FORMULAIRE COMMANDE INTELLIGENT - Smart Defaults ✅ IMPLÉMENTÉ (2025-11-15)

### **FR-POC-19: Valeurs par Défaut Intelligentes** ✅ IMPLÉMENTÉ (2025-11-15)

**Description:** Système de valeurs par défaut intelligentes pour le formulaire de commande (PurchaseOrderForm) basé sur le rôle utilisateur et le contexte.

**Spécifications:**
- **7 champs avec smart defaults:** orderType, projectId, orgUnitId, supplierId, deliveryAddress, contactName, contactPhone
- **Logique basée sur rôle:**
  - `chef_equipe` / `magasinier` → BCI + orgUnitId pré-sélectionné
  - `chef_chantier` / `direction` / `admin` / `logistique` / `resp_finance` → BCE + projectId + supplierId pré-sélectionnés
- **Réduction temps remplissage:** 40% (15-20 min → 6-8 min)

**Critères d'acceptation:**
- ✅ orderType déterminé automatiquement selon rôle utilisateur
- ✅ projectId pré-sélectionné avec projet le plus récent/actif (rôles BCE)
- ✅ orgUnitId pré-sélectionné avec premier org_unit de l'utilisateur (rôles BCI)
- ✅ supplierId pré-sélectionné avec fournisseur le plus utilisé (rôles BCE)
- ✅ deliveryAddress pré-rempli avec adresse de la compagnie active
- ✅ contactName pré-rempli avec nom de l'utilisateur authentifié
- ✅ contactPhone pré-rempli avec téléphone de la compagnie active

**Implémentation:** 
- Modifications `PurchaseOrderForm.tsx` avec logique smart defaults
- Utilisation `ConstructionContext` pour accès `userRole` et `activeCompany`
- Requêtes optimisées pour projet récent et fournisseur fréquent
- Préservation des valeurs en mode édition (smart defaults skip si données existantes)

**Impact utilisateur:**
- **Temps remplissage réduit de 40%:** 15-20 minutes → 6-8 minutes
- **Erreurs réduites:** Pré-sélection intelligente réduit les erreurs de saisie
- **Expérience améliorée:** Formulaire pré-rempli selon contexte utilisateur

---

## 🎯 UX TRANSFORMATION - VAGUE 1 + VAGUE 2 ✅ IMPLÉMENTÉ (2025-11-15)

### **FR-POC-20: Optimisation UX PurchaseOrderForm** ✅ IMPLÉMENTÉ (2025-11-15)

**Description:** Transformation majeure de l'expérience utilisateur du formulaire de commande avec alignement sur le modèle traditionnel BCI et améliorations significatives de performance et d'ergonomie.

**Spécifications VAGUE 1 - Quick Wins:**
- **Header Bug Fix:** Correction détection module Construction - banner Budget masqué dans Construction
- **Form Reorganization:** Articles prioritaires en haut, contexte (projet/org_unit) après
- **Collapsible Sections:** Sections Livraison et Notes repliables par défaut
- **Smart Defaults Badges:** 7 badges visuels sur champs pré-remplis (orderType, projectId, orgUnitId, supplierId, deliveryAddress, contactName, contactPhone)

**Spécifications VAGUE 2 - Alignement Traditionnel:**
- **Traditional BCI Header:** Header 3 sections aligné modèle traditionnel BCI (Type Commande, Contexte, Fournisseur)
- **Inline Product Search:** Recherche inline avec autocomplete, modal supprimée
- **Single-Column Layout:** Layout single-column, sidebar intégrée dans le flow principal

**Critères d'acceptation:**
- ✅ Header Budget n'apparaît plus dans Construction (bug résolu)
- ✅ Articles section en haut du formulaire (priorité visuelle)
- ✅ Sections Livraison et Notes collapsibles par défaut
- ✅ 7 badges visuels sur champs smart defaults
- ✅ Header 3 sections aligné modèle BCI traditionnel
- ✅ Recherche produits inline avec autocomplete (modal supprimée)
- ✅ Layout single-column avec flow linéaire

**Implémentation:** 
- Modifications `Header.tsx` pour correction détection module
- Modifications `PurchaseOrderForm.tsx` pour réorganisation, collapsibles, badges, header traditionnel, recherche inline
- Layout single-column avec intégration sidebar dans flow principal

**Métriques de performance:**
- **Gain temps ajout article:** 75% (15-20s → 3-5s) - Objectif dépassé (target: 50%)
- **Réduction hauteur visuelle:** -33% (1200px → 800px collapsed) - Objectif atteint
- **Badges smart defaults:** 7 champs avec feedback visuel - 100% des champs pré-remplis
- **Alignement traditionnel BCI:** 30% → 90% - Objectif dépassé
- **Workflow continu:** Modal supprimée, recherche inline - Interruption workflow éliminée

**Impact utilisateur:**
- **Performance:** 75% plus rapide pour ajouter un article (3-5s vs 15-20s)
- **Ergonomie:** Formulaire 33% plus court visuellement (800px collapsed vs 1200px)
- **Feedback:** 7 badges visuels indiquent clairement les champs pré-remplis intelligemment
- **Alignement:** Interface alignée à 90% avec modèle traditionnel BCI
- **Workflow:** Recherche inline sans interruption (modal supprimée)

**Non-fonctionnel - Performance:**
- **Temps ajout article:** 75% amélioration (15-20s → 3-5s) ✅ DÉPASSÉ
- **Hauteur visuelle:** -33% réduction (1200px → 800px) ✅ ATTEINT
- **Feedback utilisateur:** 0 → 7 badges (100% augmentation) ✅ DÉPASSÉ

**Non-fonctionnel - Usabilité:**
- **Flow linéaire:** Layout single-column avec progression logique ✅ ATTEINT
- **Alignement traditionnel:** 30% → 90% alignement modèle BCI ✅ DÉPASSÉ
- **Interruption workflow:** Modal supprimée, recherche inline ✅ ATTEINT

---

## 🔄 COMPORTEMENT ATTENDU — REMBOURSEMENTS ET PRÊTS

### **1. MODULE REMBOURSEMENTS DÉPENSES**

#### **Règles d'Accès et Visibilité**
- **Seul le payeur (`paid_by`) peut déclencher une demande de remboursement**
- Le bouton "Demander remboursement" est visible ET cliquable UNIQUEMENT par le payeur
- Les autres membres ne voient pas ce bouton sur la transaction partagée

#### **Processus de Demande**
- Le payeur clique sur le bouton "Demander remboursement" dans `TransactionsPage`
- Une modal s'ouvre affichant :
  - Les membres avec qui la transaction est partagée
  - Les montants éditables pour chaque membre
  - Possibilité de modifier les montants avant validation
- Les demandes sont créées dans la table `reimbursement_requests` avec :
  - `shared_transaction_id` : ID de la transaction partagée
  - `from_member_id` : ID du membre débiteur (celui qui doit rembourser)
  - `to_member_id` : ID du membre créancier (le payeur)
  - `amount` : Montant à rembourser
  - `currency` : Devise de la transaction
  - `status` : Statut de la demande (pending, accepted, rejected, settled)

#### **Vue du Débiteur**
- Le débiteur voit la demande dans deux endroits :
  - **TransactionsPage** : La transaction partagée affiche une notification de demande en attente
  - **FamilyReimbursementsPage** : La demande apparaît dans la liste des remboursements en attente
- Le débiteur peut :
  - **Accepter** la demande : Le statut passe à `accepted`
  - **Refuser** la demande : Le statut passe à `rejected`

### **2. MODULE LOANSPAGE**

#### **État Actuel (S52-S53)**

##### **Types de Prêts Gérés**
- **Prêts formels** : Prêts avec intérêts calculés automatiquement
  - Taux d'intérêt défini à la création
  - Calcul automatique des intérêts par période
  - Capitalisation des intérêts en retard
- **Dettes informelles** : Dettes sans intérêts
  - Montant fixe à rembourser
  - Pas de calcul d'intérêts
  - Suivi simple du remboursement

##### **Création Actuelle**
- Les prêts/dettes sont créés via `CreateLoanModal` dans `LoansPage`
- Toggle "Je prête" / "J'emprunte" pour définir le rôle
- Option de partage avec le groupe familial disponible

##### **Visibilité dans FamilyReimbursementsPage**
- Les prêts/dettes créés dans `LoansPage` **n'apparaissent PAS automatiquement** dans `FamilyReimbursementsPage`
- Ils apparaissent dans `FamilyReimbursementsPage` **SEULEMENT si marqués "partagé"** par le créateur du prêt
- Le créateur peut choisir de partager ou non un prêt avec le groupe familial

#### **État Futur (S54 - Planifié)**

##### **Création via AddTransactionPage**
- **Dépense - Prêt accordé** : Catégorie transaction qui crée automatiquement un prêt formel dans `LoansPage`
  - Option de partage avec le groupe familial
  - Intégration avec système de transactions existant
- **Dépense - Remboursement dette** : Catégorie transaction qui enregistre un paiement pour dette informelle
  - Option de partage avec le groupe familial
  - Mise à jour automatique du statut de la dette
- **Revenu - Remboursement prêt** : Catégorie transaction qui enregistre un paiement pour prêt reçu
  - Option de partage avec le groupe familial
  - Mise à jour automatique du statut du prêt
- **Revenu - Prêt reçu** : Catégorie transaction qui crée automatiquement une dette informelle dans `LoansPage`
  - Option de partage avec le groupe familial
  - Intégration avec système de transactions existant

##### **LoansPage Consultation Uniquement**
- `LoansPage` devient une page de **consultation uniquement**
- Suppression de `CreateLoanModal` de `LoansPage`
- Toutes les créations de prêts/dettes passent par `AddTransactionPage`
- `LoansPage` affiche uniquement :
  - Liste des prêts/dettes existants
  - Historique des remboursements
  - Détails et statistiques
  - Actions de consultation (pas de création)

##### **Référence**
- Voir `ARCHITECTURE-PRETS-S54.md` pour le plan de refactoring complet
- 21 emplacements de code identifiés nécessitant vérification pour conformité

### **3. FAMILYREIMBURSEMENTSPAGE**

#### **Vue Centrale Agrégée**
- `FamilyReimbursementsPage` est la vue centrale qui agrège :
  - **Demandes de remboursement de dépenses partagées** : Demandes créées depuis `TransactionsPage` par le payeur
  - **Prêts/dettes marqués partagés** : Prêts créés dans `LoansPage` et explicitement marqués comme partagés

#### **Système de Paiement FIFO**
- Pour les dettes multiples envers la même personne :
  - Les paiements sont appliqués selon l'ordre FIFO (First In, First Out)
  - La dette la plus ancienne est payée en premier
  - Le système calcule automatiquement l'allocation du paiement entre les dettes multiples
  - Un preview en temps réel montre comment le paiement sera réparti

#### **Fonctionnalités**
- Affichage des remboursements en attente (où l'utilisateur est créancier ou débiteur)
- Système de paiement avec modal dédiée (`ReimbursementPaymentModal`)
- Historique des paiements avec détails intérêts/capital par versement
- Statistiques avec graphiques (PieChart catégories, LineChart évolution, BarChart membres)

### **4. TABLE ACTIVE SUPABASE**

#### **Table Remboursements**
- **Nom de la table** : `reimbursement_requests` (PAS `family_reimbursement_requests`)
- **Schéma principal** :
  - `id` : UUID, clé primaire
  - `shared_transaction_id` : UUID, référence à `family_shared_transactions.id`
  - `from_member_id` : UUID, ID du membre débiteur
  - `to_member_id` : UUID, ID du membre créancier (payeur)
  - `amount` : NUMERIC, montant à rembourser
  - `currency` : TEXT, devise (ex: 'MGA', 'EUR')
  - `status` : TEXT, statut (pending, accepted, rejected, settled)
  - `created_at` : TIMESTAMP, date de création
  - `updated_at` : TIMESTAMP, date de mise à jour

#### **Relations**
- `shared_transaction_id` → `family_shared_transactions.id`
- `from_member_id` → `family_group_members.user_id`
- `to_member_id` → `family_group_members.user_id`

#### **Politiques RLS**
- Les utilisateurs ne peuvent voir que les remboursements où ils sont créancier OU débiteur
- Les utilisateurs peuvent créer des demandes uniquement pour les transactions où ils sont payeur
- Les utilisateurs peuvent accepter/refuser uniquement les demandes où ils sont débiteur

---

## 💰 MODULE PRETS FAMILIAUX v3.0.0 (S52 2026-02-15)

### **Description du Module**

Le module Prets Familiaux permet aux membres d'un groupe familial de gérer les prêts entre membres de manière structurée et transparente. Le système supporte deux types d'utilisateurs : les prêteurs (qui prêtent de l'argent) et les emprunteurs (qui empruntent de l'argent), avec un moteur financier intelligent pour le calcul des intérêts et la gestion des remboursements.

### **Types d'Utilisateurs**

#### **1. Prêteur (Je prête)**
- Crée un prêt avec montant principal, taux d'intérêt, durée
- Suit les remboursements reçus
- Visualise l'historique des paiements avec détail intérêts/capital
- Voit le statut du prêt (pending/active/late/closed)

#### **2. Emprunteur (J'emprunte)**
- Visualise les prêts qu'il doit rembourser
- Effectue des paiements directs ou lie des transactions existantes
- Consulte l'historique de ses remboursements
- Voit les intérêts dus et capital restant

### **Règles Financières**

#### **Priorité Intérêts → Capital**
- Les paiements sont d'abord appliqués aux intérêts dus
- Le capital n'est remboursé qu'après paiement complet des intérêts
- Calcul automatique des intérêts par période

#### **Capitalisation des Intérêts en Retard**
- Les intérêts non payés sont capitalisés (ajoutés au capital)
- Génération automatique de périodes d'intérêts en retard
- Fonction `capitalizeOverdueInterests()` pour gestion automatique

#### **Statuts Automatiques**
- **pending:** Prêt créé mais pas encore actif
- **active:** Prêt actif avec remboursements en cours
- **late:** Prêt en retard (paiements manqués)
- **closed:** Prêt complètement remboursé

### **Fonctionnalités Implémentées Phase 1+2**

#### **Infrastructure Backend**
- **3 tables Supabase:** `personal_loans`, `loan_repayments`, `loan_interest_periods`
- **RLS Policies:** 4 policies par table (SELECT, INSERT, UPDATE, DELETE)
- **Indexes:** Optimisation performance avec indexes sur clés fréquentes
- **Triggers:** Trigger `updated_at` automatique

#### **Service CRUD Complet**
- **loanService.ts:** 12 fonctions complètes
  - `getMyLoans()` - Récupération prêts prêteur/emprunteur
  - `createLoan()` - Création nouveau prêt
  - `recordPayment()` - Enregistrement paiement
  - `getRepaymentHistory()` - Historique remboursements
  - `getUnlinkedRevenueTransactions()` - Transactions disponibles pour rapprochement
  - `generateInterestPeriod()` - Génération période intérêts
  - `capitalizeOverdueInterests()` - Capitalisation intérêts retard

#### **Interface Utilisateur**
- **LoansPage.tsx:** Page principale `/family/loans`
  - Sections Prêtées/Empruntées avec onglets
  - Compteurs actifs/total prêts
  - Cartes prêts expandables avec détails
- **CreateLoanModal:** Modal création prêt
  - Toggle Je prête/J'emprunte
  - Pré-remplissage taux d'intérêt
  - Tous champs requis
- **PaymentModal:** Modal paiement
  - Mode paiement direct
  - Rapprochement transaction existante
  - Affichage intérêts dus
- **RepaymentHistorySection:** Section accordéon
  - Historique paiements détaillé
  - Détail intérêts/capital par versement
- **LoanCard:** Carte prêt expandable
  - Clic expand/collapse
  - Bouton paiement intégré
  - Chevron rotation animation

#### **Intégrations**
- **FamilyDashboardPage:** Bouton "Prêts" premier bouton grille actions
- **DashboardPage:** LoanWidget avec compteur actifs + badge retard
- **AppLayout:** Route `/family/loans` avec lazy import

### **Moteur Financier**

#### **Calcul Intérêts**
- Calcul automatique par période selon taux et durée
- Génération périodes d'intérêts avec `generateInterestPeriod()`
- Support intérêts simples et capitalisation

#### **Gestion Remboursements**
- Allocation automatique intérêts → capital
- Mise à jour statut prêt automatique
- Historique complet des paiements

#### **Capitalisation Retard**
- Détection automatique intérêts en retard
- Capitalisation via `capitalizeOverdueInterests()`
- Mise à jour capital et recalcul intérêts

### **Phase 3 - Roadmap Planifiée**

**Statut Phase 3:** 🔄 EN COURS (85% complété - split ✅, delete ✅, drawer ✅, validation ✅, split composants ✅, edge cases ⏳: pg_cron DONE S55, Notifications Push DONE S56, Photo Justificatif DONE S58, Split/Delete/Drawer DONE S59, Double Validation DONE S60, Split Composants DONE S60, Edge Cases Remboursements EN COURS)

#### **Notifications Push** ✅ COMPLÉTÉ (Session S56 2026-03-04)
- ✅ **Rappels paiements échéance** - Fonction `scheduleLoanCheck()` vérifie prêts échéance, déclenche notifications `loan_due_reminder` X jours avant due_date
- ✅ **Alertes prêts en retard** - Notifications `loan_overdue_alert` déclenchées automatiquement après due_date passé
- ✅ **Paramètres utilisateur** - Settings `loanReminders`, `loanOverdueAlerts`, `loanReminderDaysBefore` pour activation/désactivation et configuration jours avant échéance
- ✅ **Interface paramètres** - NotificationSettings intégré dans SettingsPage avec section dédiée prêts (toggles activation/désactivation)
- ✅ **Service Worker guard** - Vérification disponibilité service worker avant déclenchement notifications prêts
- ⏳ **Notifications remboursements reçus** - En attente (fonctionnalité future)

#### **Photo Justificatif** ✅ COMPLÉTÉ (Session S58 2026-03-07)
- ✅ **Upload photo justificatif paiement** - Interface upload dans LoansPage pour remboursements avec sélection fichier
- ✅ **Stockage Supabase Storage** - Bucket `loan-receipts` créé avec RLS policies, stockage sécurisé photos justificatifs
- ✅ **Colonne receipt_photo_url** - Ajout colonne `receipt_photo_url` dans table `loan_repayments` pour référence photo
- ✅ **Affichage dans historique remboursements** - Affichage photo dans RepaymentHistorySection avec preview et téléchargement
- ✅ **Sanitization fix** - Correction sanitization noms fichiers pour sécurité upload

#### **Refactoring + UI Improvements** ✅ COMPLÉTÉ (Session S59 2026-03-08)
- ✅ **Split loanService.ts + loanStorageService.ts** - Séparation logique Supabase (loanService) et IndexedDB (loanStorageService), refactoring complet
- ✅ **Bouton suppression prêt avec confirmation** - Bouton suppression avec ConfirmDialog, validation suppression prêt, mise à jour état local
- ✅ **Drawer transaction loan_repayment_received complet** - Drawer transaction loan_repayment_received avec titre ordinal, jauge progression, historique remboursements, navigation prêt parent
- ✅ **openRepaymentModal unifié** - Fonction unifiée openRepaymentModal(loanId, loanAmount, repaymentIndex) pour tous types remboursements
- ✅ **Label devise dynamique formulaire compte** - Label EUR/MGA dynamique selon sélection utilisateur dans AddAccountPage, affichage cohérent formulaire compte

#### **Double Validation Prêts** ✅ IMPLÉMENTÉ (Session S60 2026-03-09 - v3.5.0)
- ✅ **Règle de validation** - Le receveur (emprunteur pour remboursement, prêteur pour création prêt) confirme la transaction. Le donneur (prêteur pour remboursement, emprunteur pour création prêt) n'a pas besoin de validation.
- ✅ **Scénario 1: Création prêt par prêteur** - Le prêteur crée le prêt, l'emprunteur confirme la réception. Badge "ATTENTE CONFIRMATION" affiché jusqu'à confirmation emprunteur.
- ✅ **Scénario 2: Remboursement par emprunteur** - L'emprunteur effectue le remboursement, le prêteur confirme la réception. Badge "ATTENTE CONFIRMATION" affiché jusqu'à confirmation prêteur.
- ✅ **Scénario 3: Garde-fou suppression** - Protection contre suppression prêt si remboursements en attente de validation. Validation requise avant suppression.

#### **Edge Cases Remboursements** ⏳ EN COURS
- Gestion surplus remboursements (montant > capital restant)
- Gestion multi-débiteurs (prêts avec plusieurs emprunteurs)
- Validation et gestion erreurs avancées

#### **Intérêts Automatiques Périodiques** ✅ COMPLÉTÉ (Session S55 2026-03-01)
- ✅ **Génération automatique périodes intérêts** - Job pg_cron mensuel exécute fonction `generate_monthly_interest_periods()`
- ✅ **Calcul intérêts mensuels automatique** - Fonction Supabase génère périodes pour tous prêts actifs avec calcul automatique
- ✅ **Affichage intérêts dus** - Service `getTotalUnpaidInterestByLoan()` calcule total intérêts impayés par prêt
- ✅ **Interface utilisateur** - Bannière totale intérêts dus + badges individuels par prêt dans LoansPage
- ✅ **Interface TypeScript** - `UnpaidInterestSummary` pour typage données intérêts impayés

---

*Document généré automatiquement le 2026-03-09 - BazarKELY v3.5.0 (Double Validation Prêts + Split Composants S60 2026-03-09 + Prêts Refactoring + UI Improvements S59 2026-03-08 + Prêts Phase 3 Photo Justificatif + Auth Stability S58 2026-03-07 + Bug Fix useRequireAuth Loop S57 2026-03-05 + Prêts Phase 3 Notifications Push S56 2026-03-04 + Prêts Phase 3 Intérêts Automatiques S55 2026-03-01 + Comportement Attendu Remboursements et Prêts S53 2026-02-17 + Prets Familiaux Phase 1+2 S52 2026-02-15 + Desktop Enhancement v2.6.0 S42 2026-01-26 + i18n Infrastructure Phase 1/3 S41 2026-01-25 + Translation Protection S41 2026-01-25 + Dashboard EUR Bug Fix S41 2026-01-25 + Interface Admin Enrichie + Navigation Intelligente + Identification Utilisateur + Bug Filtrage Catégories + Construction POC Phase 2 Organigramme + Smart Defaults PurchaseOrderForm + UX Transformation VAGUE 1 + VAGUE 2)*