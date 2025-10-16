// Constantes de l'application BazarKELY

// Types de comptes supportés
export const ACCOUNT_TYPES = {
  especes: { 
    name: 'Espèces', 
    icon: 'Wallet', 
    allowNegative: false,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  courant: { 
    name: 'Compte Courant', 
    icon: 'CreditCard', 
    allowNegative: true,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  epargne: { 
    name: 'Épargne', 
    icon: 'PiggyBank', 
    allowNegative: false,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  orange_money: { 
    name: 'Orange Money', 
    icon: 'Smartphone', 
    allowNegative: false,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    progressColor: 'bg-orange-600'
  },
  mvola: { 
    name: 'Mvola', 
    icon: 'Smartphone', 
    allowNegative: false,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  airtel_money: { 
    name: 'Airtel Money', 
    icon: 'Smartphone', 
    allowNegative: false,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  }
} as const;

// Catégories de transactions
export const TRANSACTION_CATEGORIES = {
  alimentation: { 
    name: 'Alimentation', 
    icon: 'Utensils', 
    color: 'text-red-500',
    bgColor: 'bg-red-50'
  },
  logement: { 
    name: 'Logement', 
    icon: 'Home', 
    color: 'text-blue-500',
    bgColor: 'bg-blue-50'
  },
  transport: { 
    name: 'Transport', 
    icon: 'Car', 
    color: 'text-green-500',
    bgColor: 'bg-green-50'
  },
  sante: { 
    name: 'Santé', 
    icon: 'Heart', 
    color: 'text-pink-500',
    bgColor: 'bg-pink-50'
  },
  education: { 
    name: 'Éducation', 
    icon: 'GraduationCap', 
    color: 'text-purple-500',
    bgColor: 'bg-purple-50'
  },
  communication: { 
    name: 'Communication', 
    icon: 'Phone', 
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50'
  },
  vetements: { 
    name: 'Vêtements', 
    icon: 'Shirt', 
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50'
  },
  loisirs: { 
    name: 'Loisirs', 
    icon: 'Gamepad2', 
    color: 'text-orange-500',
    bgColor: 'bg-orange-50'
  },
  famille: { 
    name: 'Famille', 
    icon: 'Users', 
    color: 'text-teal-500',
    bgColor: 'bg-teal-50'
  },
  solidarite: { 
    name: 'Solidarité', 
    icon: 'HandHeart', 
    color: 'text-rose-500',
    bgColor: 'bg-rose-50'
  },
  autres: { 
    name: 'Autres', 
    icon: 'MoreHorizontal', 
    color: 'text-slate-500',
    bgColor: 'bg-slate-50'
  },
  // Ajout des catégories avec accents pour compatibilité avec l'intelligence budgétaire
  'Habillement': { 
    name: 'Habillement', 
    icon: 'Shirt', 
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50'
  },
  'Épargne': { 
    name: 'Épargne', 
    icon: 'PiggyBank', 
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50'
  },
  'Solidarité': { 
    name: 'Solidarité', 
    icon: 'HandHeart', 
    color: 'text-rose-500',
    bgColor: 'bg-rose-50'
  }
} as const;

// Navigation mobile
export const BOTTOM_NAV_ITEMS = [
  { path: '/dashboard', icon: 'Home', label: 'Accueil' },
  { path: '/accounts', icon: 'Wallet', label: 'Comptes' },
  { path: '/transactions', icon: 'ArrowUpDown', label: 'Transactions' },
  { path: '/budgets', icon: 'PieChart', label: 'Budgets' },
  { path: '/goals', icon: 'Target', label: 'Objectifs' }
] as const;

// Navigation analytics
export const ANALYTICS_NAV_ITEMS = [
  { path: '/analytics', icon: 'BarChart3', label: 'Analytics' },
  { path: '/insights', icon: 'Lightbulb', label: 'Insights' },
  { path: '/reports', icon: 'FileText', label: 'Rapports' }
] as const;

// Navigation secondaire
export const SECONDARY_NAV_ITEMS = [
  { path: '/education', icon: 'GraduationCap', label: 'Éducation' },
  { path: '/settings', icon: 'Settings', label: 'Paramètres' },
  { path: '/admin', icon: 'Shield', label: 'Admin', role: 'admin' as const }
] as const;

// Configuration PWA
export const PWA_CONFIG = {
  name: 'BazarKELY',
  shortName: 'BazarKELY',
  description: 'Gestion budget familial - Madagascar',
  themeColor: '#3b82f6',
  backgroundColor: '#ffffff',
  display: 'standalone',
  startUrl: '/bazarkely/',
  scope: '/bazarkely/',
  orientation: 'portrait-primary'
} as const;

// Configuration API - Now using Supabase
export const API_CONFIG = {
  supabase: true,
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000
} as const;

// Configuration de synchronisation
export const SYNC_CONFIG = {
  interval: 30000, // 30 secondes
  maxRetries: 3,
  retryDelay: 5000, // 5 secondes
  batchSize: 50
} as const;

// Configuration des alertes de budget
export const BUDGET_ALERT_CONFIG = {
  warningThreshold: 0.8, // 80% du budget
  dangerThreshold: 0.95, // 95% du budget
  checkInterval: 60000 // 1 minute
} as const;

// Configuration de la gamification
export const GAMIFICATION_CONFIG = {
  levels: {
    bronze: { min: 0, max: 25, color: '#cd7f32' },
    silver: { min: 26, max: 50, color: '#c0c0c0' },
    gold: { min: 51, max: 75, color: '#ffd700' },
    platinum: { min: 76, max: 100, color: '#e5e4e2' }
  },
  points: {
    dailyTransactionEntry: 2,
    weeklyBudgetRespect: 5,
    goalAchievement: 10,
    quizCompletion: 3,
    consecutiveDays: 1
  }
} as const;

// Configuration des quiz éducatifs
export const QUIZ_CONFIG = {
  maxPerDay: 1,
  unlockDelay: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
  maxConsecutive: 5,
  categories: ['budget', 'epargne', 'investissement', 'mobile_money'] as const
} as const;

// Configuration des thèmes
export const THEME_CONFIG = {
  light: {
    primary: '#3b82f6',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b'
  },
  dark: {
    primary: '#60a5fa',
    secondary: '#94a3b8',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9'
  }
} as const;

// Configuration des langues
export const LANGUAGE_CONFIG = {
  default: 'fr',
  supported: ['fr', 'mg'] as const,
  fallback: 'fr'
} as const;

// Configuration des devises
export const CURRENCY_CONFIG = {
  default: 'MGA',
  symbol: 'Ar',
  decimals: 0,
  format: (amount: number) => `${amount.toLocaleString('fr-FR')} Ar`
} as const;

// Configuration des dates
export const DATE_CONFIG = {
  format: 'DD/MM/YYYY',
  timeFormat: 'HH:mm',
  locale: 'fr-FR'
} as const;

// Messages d'erreur
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre connexion internet.',
  AUTH_ERROR: 'Erreur d\'authentification. Veuillez vous reconnecter.',
  VALIDATION_ERROR: 'Données invalides. Vérifiez vos saisies.',
  DATABASE_ERROR: 'Erreur de base de données. Réessayez plus tard.',
  SYNC_ERROR: 'Erreur de synchronisation. Vos données seront synchronisées plus tard.',
  QUOTA_ERROR: 'Espace de stockage insuffisant. Exportez vos données.',
  UNKNOWN_ERROR: 'Une erreur inattendue s\'est produite.'
} as const;

// Messages de succès
export const SUCCESS_MESSAGES = {
  SAVED: 'Données sauvegardées avec succès.',
  SYNCED: 'Données synchronisées avec succès.',
  EXPORTED: 'Données exportées avec succès.',
  IMPORTED: 'Données importées avec succès.',
  DELETED: 'Élément supprimé avec succès.',
  UPDATED: 'Mise à jour effectuée avec succès.'
} as const;

// Configuration des limites
export const LIMITS = {
  MAX_TRANSACTIONS_PER_PAGE: 50,
  MAX_ACCOUNTS: 10,
  MAX_BUDGETS_PER_MONTH: 20,
  MAX_GOALS: 15,
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_AMOUNT: 999999999,
  MIN_AMOUNT: 1
} as const;

// Configuration des animations
export const ANIMATION_CONFIG = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  easing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
} as const;

// Configuration des breakpoints
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const;

// Configuration des z-index
export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
  toast: 1070
} as const;
