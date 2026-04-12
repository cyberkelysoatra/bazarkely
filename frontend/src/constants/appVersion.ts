export const APP_VERSION = '3.5.11';
export const APP_VERSION_NAME = 'Fix connexion Google — timeout DB query loadUserFromSupabase';
export const LAST_UPDATED = '2026-04-13';
export const APP_BUILD_DATE = '2026-04-13';
export const VERSION_HISTORY = [
  {
    version: '3.5.11',
    date: '2026-04-13',
    description: 'Fix connexion Google — timeout 5s sur requête DB users',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() — la requête Supabase users table ne throwait pas, elle hangait indéfiniment. Ajout d\'un Promise.race() avec timeout 5s : après 5s sans réponse, setAuthenticated(true) est appelé via le catch, la session reste valide',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.10',
    date: '2026-04-13',
    description: 'Fix connexion Google — detectSessionInUrl false',
    changes: [
      'Fix (supabase.ts): detectSessionInUrl: true causait un conflit avec captureOAuthTokens() — le client Supabase traitait les tokens du hash en parallèle de setSession(), bloquant ce dernier indéfiniment',
      'Fix: désactivé detectSessionInUrl car main.tsx gère déjà la capture manuelle des tokens OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.9',
    date: '2026-04-13',
    description: 'Fix connexion Google — bypass waitForUserProfile bloquant',
    changes: [
      'Fix (AuthPage.tsx): authService.handleOAuthCallback() appelait waitForUserProfile() qui pollait la table users sans timeout — si la connexion DB traînait, le flux OAuth restait bloqué indéfiniment sur Chargement...',
      'Fix (AuthPage.tsx): remplacé par navigation directe après setSession() — profil complet chargé par App.tsx SIGNED_IN handler de manière asynchrone',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.8',
    date: '2026-04-13',
    description: 'Fix connexion Google — setAuthenticated après erreur réseau',
    changes: [
      'Fix (App.tsx): loadUserFromSupabase() appelait setAuthenticated(true) uniquement dans le cas succès/profil absent, mais PAS dans le bloc catch — si la requête Supabase échouait, l\'utilisateur restait bloqué indéfiniment sur la page d\'authentification',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.7',
    date: '2026-04-13',
    description: 'Fix connexion Google — approche auth simplifiée',
    changes: [
      'Fix (App.tsx): Retour à getSession() dans initializeApp() SANS appel setAuthenticated(false) — préserve le flux OAuth Google existant tout en évitant la boucle de rechargement',
      'Fix (App.tsx): Suppression du handler INITIAL_SESSION qui bloquait le callback Google OAuth',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.6',
    date: '2026-04-13',
    description: 'Fix connexion Google bloquée',
    changes: [
      'Fix (supabase.ts): Suppression du timeout global fetch 8s — avortait setSession() OAuth sans rejeter la promesse → isLoading bloqué sur true indéfiniment',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.5',
    date: '2026-04-12',
    description: 'Fix boucle de chargement — INITIAL_SESSION auth',
    changes: [
      'Fix (App.tsx): onAuthStateChange INITIAL_SESSION comme source de vérité auth — élimine flash isAuthenticated false→true qui causait remontage du Dashboard en boucle',
      'Fix (App.tsx): Suppression setUser(null) dans initializeApp() — évite kick vers /auth pendant refresh token Supabase',
      'Fix (supabase.ts): Timeout global 8s sur toutes les requêtes Supabase — empêche blocage infini sur réseau lent',
      'Fix (authService.ts): Nettoyage localStorage avant signOut Supabase — déconnexion garantie même hors ligne',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.4',
    date: '2026-04-12',
    description: 'Fix cause racine du dashboard bloqué — dépendance useEffect sur userId au lieu de user',
    changes: [
      'Fix: useEffect([user]) remplacé par useEffect([userId]) dans DashboardPage — Supabase appelait setUser() 2x au démarrage (getSession + onAuthStateChange SIGNED_IN), chaque appel créait une nouvelle référence objet, re-déclenchant le fetch et annulant le précédent via cancelled=true',
      'Fix: Même correction appliquée aux 3 useEffects (notifications, données, prêts)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.3',
    date: '2026-04-12',
    description: 'Fix robuste du dashboard bloqué en chargement (intermittent)',
    changes: [
      'Fix: scheduleTransactionWatch retiré du chemin critique (était await dans une boucle — bloquait le finally si réseau lent)',
      'Fix: Flag cancelled ajouté pour ignorer les mises à jour d\'un fetch devenu obsolète (exécutions concurrentes)',
      'Fix: Timeout de sécurité 10s — isLoading forcé à false quoi qu\'il arrive',
      'Fix: Script bump-version.js converti en ESM (était cassé depuis passage type:module)',
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.2',
    date: '2026-04-12',
    description: 'Correction du dashboard bloqué sur "Chargement..." et du bouton Déconnexion inaccessible',
    changes: [
      'Fix: Dashboard - Race condition sur les setInterval de notifications empêchant le chargement des données (ajout clearInterval dans le cleanup)',
      'Fix: Dashboard - setIsLoading(false) manquant quand aucun utilisateur connecté → blocage infini résolu',
      'Fix: Dashboard - Cartes Solde/Revenus/Dépenses/Budget affichaient 0 pendant le chargement → skeleton animé ajouté',
      'Fix: Header - Bouton Déconnexion inaccessible car dropdown positionné hors zone cliquable → wrapper relative corrigé'
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.1',
    date: '2026-03-07',
    description: 'Loans Transaction View S54',
    changes: [
      'Feature: Loan acknowledgment system - WhatsApp confirmation link',
      'Feature: Public /loan-confirm/:token page',
      'Feature: borrowerPhone in AddTransactionPage',
      'Refactor: Remove CreateLoanModal'
    ],
    type: 'patch' as const
  },
  {
    version: '3.5.0',
    date: '2026-03-09',
    description: 'Double validation prêts - badge ATTENTE CONFIRMATION, split LoansPage 1044L→407L, confirmation emprunteur/prêteur',
    changes: [
      'Double validation prêts - badge ATTENTE CONFIRMATION, split LoansPage 1044L→407L, confirmation emprunteur/prêteur'
    ],
    type: 'minor' as const
  },
  {
    version: '3.0.0',
    date: '2026-02-15',
    changes: [
      'Feature: Module Prets Familiaux Phase 1+2 - Système complet de gestion des prêts personnels',
      'Feature: Page LoansPage.tsx - Interface de gestion des prêts avec sections "J\'ai prêté" et "J\'ai emprunté"',
      'Feature: CreateLoanModal - Modal de création de prêt avec gestion taux d\'intérêt, fréquences, et échéances',
      'Feature: PaymentModal - Enregistrement de paiements (direct ou lié à transaction) avec calcul intérêts courus',
      'Feature: RepaymentHistorySection - Historique des remboursements avec accordéon collapsible',
      'Feature: LoanCard expansion - Cartes de prêt cliquables avec détails étendus (paiements, historique)',
      'Feature: Intégration loanService.ts - Service complet pour CRUD prêts, paiements, et calculs d\'intérêts',
      'Technical: Architecture modulaire - Composants modaux extraits au niveau top-level pour éviter re-mount',
      'Technical: Gestion état avancée - selectedLoanId, showPaymentModal pour contrôle expansion et modals',
      'UI Enhancement: Badges de statut (pending, active, late, closed) avec couleurs distinctes',
      'UI Enhancement: Barres de progression pour visualisation remboursement',
      'UI Enhancement: Affichage multi-devises (MGA/EUR) avec CurrencyDisplay',
      'Session: Module Prets Familiaux Phase 1+2 complète'
    ],
    type: 'major' as const
  },
  {
    version: '2.8.1',
    date: '2026-02-12',
    changes: [
      'Cleanup: Removed 17 debug console.log statements from ReimbursementPaymentModal.tsx and FamilyReimbursementsPage.tsx',
      'Session: S48 (2026-02-12) - Debug cleanup patch'
    ],
    type: 'patch' as const
  },
  {
    version: '2.8.0',
    date: '2026-02-12',
    changes: [
      'Feature: Collapsible Payment History - Payment history section now collapsible for better UI organization',
      'Feature: Progress Bars in Allocation Preview - Visual progress bars showing allocation distribution across requests',
      'Feature: Amount Parsing Fix - Improved amount parsing logic for better accuracy in payment processing',
      'Feature: Payment Status Indicators - Visual indicators showing payment status (pending, settled, partial)',
      'UI Enhancement: Better organization of payment information with collapsible sections',
      'UI Enhancement: Visual feedback for payment allocations with progress bars',
      'Technical: Enhanced amount parsing for multi-currency support',
      'Technical: Payment status tracking improvements',
      'Session: S44 (2026-02-12) - Payment allocation UI enhancements'
    ],
    type: 'minor' as const
  },
  {
    version: '2.7.0',
    date: '2026-01-27',
    changes: [
      'Feature: Budget Gauge AddTransaction - Affichage temps réel jauge budgétaire lors sélection catégorie dépense',
      'Feature: Budget Gauge AddTransaction - Affichage pourcentage utilisé et montant restant en temps réel',
      'Feature: useBudgetGauge hook - Création hook custom avec logique réactive (fetch budget, calcul spent, statut)',
      'Feature: useBudgetGauge hook - Réactivité automatique sur changements category/amount/date',
      'Feature: BudgetGauge component - Composant présentationnel avec layout inline (barre et texte même ligne)',
      'Feature: BudgetGauge component - Barre de progression bicolore (vert + rouge) si dépassement budgétaire',
      'Feature: BudgetGauge component - Couleurs dynamiques selon statut (vert bon, jaune attention, rouge dépassé)',
      'Feature: getBudgetByCategory service - Extension budgetService avec méthode récupération budget par catégorie/mois/année',
      'Feature: getBudgetByCategory service - Pattern offline-first via getBudgets() existant',
      'Feature: Layout optimisations - 4 itérations pour layout optimal (label gauche, gauge extensible, texte droite)',
      'Feature: Layout optimisations - Structure flex-1 pour extension complète barre entre label et texte',
      'Feature: Logique Épargne inversée - Statut inversé pour catégorie Épargne (0% = dépassé rouge, 100% = bon vert)',
      'Feature: Conversion multi-devises - Conversion EUR vers MGA utilisant exchangeRateUsed stocké dans transactions',
      'Feature: Masquage automatique - Jauge masquée si type Revenu ou catégorie vide',
      'Feature: Gestion états - Loading, error, no-budget states gérés avec messages informatifs',
      'Technical: Architecture modulaire - Service-hook-component-integration pattern réutilisable',
      'Technical: Matching case-insensitive - Comparaison catégories normalisée pour robustesse',
      'Technical: Mobile préservé 100% - Zéro régression mobile confirmé',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, PROJECT-STRUCTURE-TREE.md, FEATURE-MATRIX.md, CURSOR-2.0-CONFIG.md mis à jour',
      'Workflow: Multi-agent workflows utilisés (Agents 01, 02, 03, 04, 05, 06, 09, 10, 11, 12)',
      'Workflow: Documentation 5-agents parallèles (NOUVEAU pattern) - Gain temps 70%',
      'Session: S43 (2026-01-27) - Budget Gauge Feature complète'
    ],
    type: 'minor' as const
  },
  {
    version: '2.6.0',
    date: '2026-01-26',
    changes: [
      'Feature: Desktop Enhancement - Layout 2 colonnes desktop (main 70% + sidebar 30%)',
      'Feature: Desktop Enhancement - Header 2 lignes avec navigation intégrée (6 liens: Accueil, Comptes, Transactions, Budgets, Famille, Objectifs)',
      'Feature: Desktop Enhancement - Sidebar sticky avec clearance optimale (lg:sticky lg:top-40)',
      'Feature: Desktop Enhancement - BottomNav caché desktop, visible mobile (lg:hidden)',
      'Feature: Desktop Enhancement - 3 composants layout créés (DashboardContainer, ResponsiveGrid, ResponsiveStatCard)',
      'Feature: Desktop Enhancement - Grille statistiques responsive (2 colonnes mobile → 4 colonnes desktop)',
      'Feature: Desktop Enhancement - Padding responsive sur cartes statistiques (p-4 md:p-6 lg:p-8)',
      'Feature: Desktop Enhancement - Actions rapides layout flex horizontal desktop (lg:flex lg:justify-center)',
      'Fix: Import path case sensitivity - Correction layout → Layout pour compatibilité Linux/Netlify',
      'Technical: Architecture multi-agents - 3 approches testées (conservative, modulaire, intégrée)',
      'Technical: Approche intégrée retenue pour meilleure UX desktop',
      'Technical: Mobile préservé 100% - Zéro régression mobile',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md mis à jour',
      'Workflow: Multi-agent workflows utilisés (Agents 09, 10, 11)',
      'Session: S42 (2026-01-26) - Desktop Enhancement complète'
    ],
    type: 'minor' as const
  },
  {
    version: '2.5.0',
    date: '2026-01-25',
    changes: [
      'Feature: Infrastructure i18n Multi-Langues (Phase 1/3) - Système react-i18next opérationnel',
      'Feature: Configuration i18n.ts avec détection automatique langue depuis appStore',
      'Feature: Support 3 langues: Français, English, Malagasy',
      'Feature: Fichiers traduction fr.json, en.json, mg.json (85+ clés section auth)',
      'Feature: Provider I18nextProvider intégré dans App.tsx',
      'Feature: Protection Anti-Traduction - Sécurisation données financières',
      'Feature: Utility excludeFromTranslation.tsx (10 fonctions utilitaires)',
      'Feature: CurrencyDisplay protégé automatiquement (44+ fichiers)',
      'Feature: Protection multi-couches: translate="no", notranslate, lang, data attributes',
      'Fix: Dashboard EUR Display - Correction originalCurrency hardcodé "MGA" → transaction.originalCurrency',
      'Fix: Dashboard EUR Display - Utilisation transaction.originalAmount pour montants corrects',
      'Fix: Dashboard EUR Display - Résultat: 100,00 EUR affiché correctement (au lieu de 0,20 EUR)',
      'Fix: i18next Initialization Error - Correction pattern new LanguageDetector() → LanguageDetector direct',
      'Technical: Configuration détection langue via getAppStoreLanguage()',
      'Technical: Application charge sans erreur i18n',
      'Documentation: README.md, ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md, FEATURE-MATRIX.md mis à jour',
      'Workflow: 13 agents multi-agents utilisés (7 workflows parallèles, 70% temps économisé)',
      'Session: S41 (2026-01-25) - Infrastructure i18n Phase 1 complète'
    ],
    type: 'minor' as const
  },
  {
    version: '2.4.10',
    date: '2026-01-24',
    changes: [
      'Fix: Version synchronization between package.json and appVersion.ts',
      'Deployment: Force Netlify deployment for documentation updates'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.9',
    date: '2026-01-23',
    changes: [
      'UI Optimization: Header spacing reduced in search container (mt-4 p-4 → mt-2 p-3) for more compact interface',
      'UI Optimization: Connection status layout changed from horizontal to vertical centered (icon above text)',
      'UI Optimization: Reduced vertical spacing between icon and text (space-y-2 → space-y-1) for compact display',
      'Technical: Modified Header.tsx line 918: mt-2 p-3 classes',
      'Technical: Modified Header.tsx line 963: flex flex-col items-center justify-center space-y-1',
      'Technical: Modified Header.tsx line 969: added text-center to span',
      'Design System: mt-2 p-3 pattern used 3x in project for consistency',
      'Layout Pattern: flex flex-col items-center used 7x in project',
      'Session: S41 (2026-01-23) - Header UI optimizations'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.8',
    date: '2026-01-21',
    changes: [
      'Bug Fix: CurrencyDisplay HTML Nesting - Fixed invalid HTML structure causing currency toggle malfunction',
      'Bug Fix: Changed wrapper element from <div> to <span> for HTML5 compliance',
      'Bug Fix: Resolved validation errors when CurrencyDisplay used inside <p> or <button> tags',
      'Bug Fix: AccountsPage Button Nesting - Fixed button-in-button HTML error blocking currency toggle',
      'Bug Fix: Replaced <button> parent with <div role="button"> for accessibility',
      'Enhancement: Currency Toggle for Especes Accounts - Enabled currency conversion for cash accounts',
      'Enhancement: Removed conditional rendering that excluded especes accounts from CurrencyDisplay',
      'Technical: HTML5 Compliance - All CurrencyDisplay usages now pass HTML validation',
      'Technical: Accessibility - Enhanced keyboard navigation for account cards',
      'Validation: 30 CurrencyDisplay instances validated (100% pass rate, 0 regressions)',
      'Documentation: Updated ETAT-TECHNIQUE-COMPLET.md, GAP-TECHNIQUE-COMPLET.md, FEATURE-MATRIX.md',
      'Session: S40 (2026-01-21) - Multi-agent fix (AGENT 09, 10, 11, 12)',
      'Commit: dd55724 - 6 files modified (+408 / -43 lines)'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.7',
    date: '2026-01-20',
    changes: [
      'Fix: EUR double conversion bug in TransactionsPage',
      'Fix: EUR transactions now display correctly with global currency toggle',
      'Fix: 100 EUR correctly shows as 495,000 Ar (not 2,450,250,000 Ar)',
      'Technical: Pass originalAmount directly to CurrencyDisplay',
      'Technical: Eliminate double conversion in transaction display logic'
    ],
    type: 'patch' as const
  },
  {
    version: '2.4.6',
    date: '2026-01-18',
    changes: [
      'Major Feature: Complete multi-currency support - Accounts can now hold both EUR and MGA transactions',
      'PROMPT 1: Modified account schema to support multi-currency (currency field now optional/nullable)',
      'PROMPT 1: Accounts with currency=null accept transactions in any currency',
      'PROMPT 2: Transaction services now capture originalCurrency from form currency toggle',
      'PROMPT 2: Exchange rates retrieved at transaction date (not current date)',
      'PROMPT 2: Store originalAmount, originalCurrency, exchangeRateUsed for every transaction',
      'PROMPT 3: Created currencyConversion.ts utility with convertAmountWithStoredRate()',
      'PROMPT 3: Display logic uses stored exchangeRateUsed (never recalculates with current rate)',
      'PROMPT 3: Transaction amounts convert correctly based on /settings displayCurrency',
      'PROMPT 3: Created WalletBalanceDisplay component for dual currency display (X € + Y Ar)',
      'PROMPT 4: TransferPage and AddTransactionPage now pass originalCurrency from form toggle',
      'PROMPT 4: Form submission logs show currency source (form toggle, not /settings)',
      'PROMPT 5: Fixed currency toggle button - clicking Ar/€ symbol now switches currency correctly',
      'PROMPT 5: Added setDisplayCurrency call in onCurrencyChange handlers',
      'PROMPT 5: Comprehensive debug logs for currency toggle flow',
      'PROMPT 6: Fixed transfer display bug - debit transactions now show red arrow out, credit show green arrow in',
      'PROMPT 6: Display logic uses transaction.amount (original) instead of converted amount for icon determination',
      'Bug Fix: Replaced toast.warning() with toast() (react-hot-toast compatibility)',
      'Architecture: Currency in /settings is UI display preference only, not account constraint',
      'Architecture: Form currency toggle determines transaction originalCurrency, independent of /settings',
      'Architecture: Historical exchange rates preserved in exchangeRateUsed field',
      'Testing: Verified EUR→EUR transfers maintain 100€ without unwanted conversion',
      'Breaking Change: None - Fully backward compatible with existing accounts and transactions'
    ]
  },
  {
    version: '2.4.5',
    date: '2026-01-18',
    changes: [
      'Bug Fix: EUR transfer bug - amounts no longer incorrectly converted when transferring between EUR accounts',
      'STEP 1: Added multi-currency columns to Supabase transactions table (original_currency, original_amount, exchange_rate_used)',
      'STEP 1: Regenerated TypeScript types to match new Supabase schema',
      'STEP 1: Created migration SQL: supabase/migrations/20260118134130_add_multi_currency_columns_to_transactions.sql',
      'STEP 2: Fixed fallback MGA bug in transactionService.ts - removed || "MGA" fallback that caused incorrect conversions',
      'STEP 2: Added strict currency validation - transfers now require both accounts to have explicit currency defined',
      'STEP 2: Enhanced logging in createTransfer() - comprehensive debugging logs for currency validation and conversion',
      'STEP 3: Added frontend validation in TransferPage.tsx - early detection of currency issues before service call',
      'STEP 3: Added currency mismatch warnings - toast notifications inform user of display currency vs account currency differences',
      'STEP 3: Improved error messages - user-friendly error handling with actionable next steps',
      'Root Cause: Fallback to MGA when account.currency was undefined caused EUR amounts to be treated as MGA and incorrectly converted',
      'Impact: Transfers between EUR accounts now preserve original amounts without unwanted currency conversion',
      'Testing: Recommended to test EUR→EUR, MGA→MGA, and cross-currency EUR→MGA transfers'
    ]
  },
  {
    version: '2.5.0',
    date: '2026-01-07',
    changes: [
      'Phase B Complete: Automatic goal deadline synchronization based on requiredMonthlyContribution',
      'Phase B1: Added requiredMonthlyContribution field to Goal schema (TypeScript + IndexedDB v12 + Supabase)',
      'Phase B2: Created centralized recalculateDeadline() function in goalService',
      'Phase B3.1: Persist requiredMonthlyContribution when accepting suggestions',
      'Phase B3.2: Auto-recalculate deadline on goal creation',
      'Phase B3.3: Auto-recalculate deadline when contribution or target amount changes',
      'Phase B3.4: One-time migration to sync existing goals with outdated deadlines',
      'Formula: deadline = today + ceil((targetAmount - currentAmount) / requiredMonthlyContribution) months',
      'Edge cases handled: goal achieved, no contribution, duration limits (1-120 months)',
      'Backward compatible: manual deadlines preserved if no requiredMonthlyContribution'
    ]
  },
  {
    version: '2.4.3',
    date: '2026-01-02',
    changes: [
      'Fix: Projection graphique Goals recalculée selon contribution mensuelle',
      'Fix: Jours restants affiche durée réaliste (360j au lieu de 1825j)',
      'Fix: Suggestion mensualité conservative (15% au lieu de 30%)',
      'Amélioration: calculateRealisticContribution avec min 5% / max 25%'
    ]
  },
  { version: '2.4.2', date: '2025-01-02', changes: 'Flux épargne intelligent, bouton suggérer objectifs, fix PGRST116/PGRST204, conversion camelCase→snake_case' },
  { version: '2.4.1', date: '2025-01-02', changes: 'Graphique évolution épargne, système célébrations jalons' },
  { version: '2.4.0', date: '2025-01-01', changes: 'Widget Dashboard objectifs, suggestions automatiques' }
];
