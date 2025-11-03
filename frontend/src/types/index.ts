// Types principaux pour BazarKELY
import type { NotificationSettings } from '../services/notificationService';
import type { CategoryBudgets } from '../services/budgetIntelligenceService';
import type { RecurringTransaction, RecurrenceFrequency } from './recurring';

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  passwordHash: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'fr' | 'mg';
    currency: 'MGA';
    priorityAnswers?: Record<string, string>;
    quizResults?: QuizResult[];
    intelligentBudgets?: CategoryBudgets;
    activeBudgets?: CategoryBudgets;
    lastBudgetCalculation?: Date;
    activeChallenges?: any[]; // ActiveChallenge[] - défini dans challengeService.ts
    challengeHistory?: any[]; // CompletedChallenge[] - défini dans challengeService.ts
    totalPoints?: number;
    recommendationHistory?: any[]; // RecommendationWithFeedback[] - défini dans useRecommendations.ts
    recommendationFeedback?: any[]; // Feedback[] - défini dans useRecommendations.ts
    themePreferences?: Record<string, number>; // Préférences de thèmes pour ML
  };
  notificationPreferences?: NotificationSettings;
  // Extended profile fields for certification system
  detailedProfile?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string; // ISO date string
    age?: number; // Calculated automatically
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'other';
    spouse?: {
      name?: string;
      age?: number;
      occupation?: string;
    };
    numberOfChildren?: number;
    children?: Array<{
      name?: string;
      age?: number;
      gender?: 'male' | 'female' | 'other';
      schoolLevel?: 'preschool' | 'primary' | 'secondary' | 'university';
    }>;
    otherDependents?: Array<{
      name?: string;
      relationship?: string;
      age?: number;
    }>;
    occupation?: string;
    employer?: string;
    employmentStatus?: 'employed' | 'self-employed' | 'unemployed' | 'student' | 'retired';
  };
  geolocation?: {
    region: string; // One of 22 Madagascar regions
    district?: string;
    commune?: string;
    habitatType: 'urban' | 'periurban' | 'rural_town' | 'rural_village' | 'isolated';
  };
  createdAt: Date;
  lastSync?: Date;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money';
  balance: number;
  currency: 'MGA';
  isDefault: boolean;
  createdAt: Date;
}

export type TransactionCategory = 
  | 'alimentation' | 'logement' | 'transport' | 'sante' 
  | 'education' | 'communication' | 'vetements' | 'loisirs' 
  | 'famille' | 'solidarite' | 'autres';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: TransactionCategory;
  date: Date;
  // Pour transferts
  targetAccountId?: string;
  transferFee?: number;
  notes?: string;
  createdAt: Date;
  // Pour transactions récurrentes (Phase 1 - Infrastructure)
  isRecurring?: boolean; // Indique si cette transaction provient d'une transaction récurrente
  recurringTransactionId?: string | null; // Référence vers la transaction récurrente source
}

export interface Budget {
  id: string;
  userId: string;
  category: TransactionCategory;
  amount: number;
  spent: number;
  period: 'monthly';
  year: number;
  month: number;
  alertThreshold: number; // %
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  isCompleted?: boolean;
}

export interface QuizResult {
  quizId: string;
  score: number;
  percentage: number;
  completedAt: Date;
  timeTaken: number; // in seconds
}

export interface MobileMoneyRate {
  id: string;
  service: 'orange_money' | 'mvola' | 'airtel_money';
  minAmount: number;
  maxAmount: number | null; // null = illimité
  fee: number;
  lastUpdated: Date;
  updatedBy: string;
}

export interface SyncOperation {
  id: string;
  userId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table_name: 'accounts' | 'transactions' | 'budgets' | 'goals' | 'fee_configurations';
  data: any;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// Types pour la gestion des frais
export interface FeeConfiguration {
  id: string;
  operator: 'orange_money' | 'mvola' | 'airtel_money' | 'bmoi';
  feeType: 'transfer' | 'withdrawal' | 'payment';
  targetOperator?: 'orange_money' | 'mvola' | 'airtel_money' | 'bmoi' | 'especes';
  amountRanges: FeeRange[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeeRange {
  minAmount: number;
  maxAmount: number;
  feeAmount: number;
  feePercentage?: number; // Pourcentage du montant (optionnel)
}

export interface CalculatedFees {
  transferFee: number;
  withdrawalFee: number;
  totalFees: number;
  breakdown: {
    transferFee: number;
    withdrawalFee: number;
    totalFees: number;
  };
}

// Types pour l'interface utilisateur
export interface NavigationItem {
  path: string;
  icon: string;
  label: string;
  role?: 'user' | 'admin';
}

export interface ThemeConfig {
  colors: {
    primary: Record<string, string>;
    malgache: {
      red: string;
      white: string;
      green: string;
    };
  };
  glassmorphism: {
    backdrop: string;
    border: string;
    shadow: string;
  };
}

// Types pour les formulaires
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface TransactionFormData {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: TransactionCategory;
  accountId: string;
  targetAccountId?: string;
  date: Date;
}

export interface BudgetFormData {
  category: TransactionCategory;
  amount: number;
  alertThreshold: number;
  year: number;
  month: number;
}

export interface GoalFormData {
  name: string;
  targetAmount: number;
  deadline: Date;
  category?: string;
  priority: 'low' | 'medium' | 'high';
}

// Types pour l'état de l'application
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isOnline: boolean;
  lastSync: Date | null;
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'mg';
}

// Types pour les erreurs
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  message?: string;
}

// Types pour la synchronisation
export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  conflicts: ConflictResolution[];
}

export interface ConflictResolution {
  id: string;
  table: string;
  localData: any;
  remoteData: any;
  resolution: 'local' | 'remote' | 'merge';
  timestamp: Date;
}

// Types pour la gamification
export interface UserLevel {
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  minPoints: number;
  maxPoints: number;
  color: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  requirements: {
    type: string;
    value: number;
    description: string;
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  category: 'budget' | 'epargne' | 'investissement' | 'mobile_money';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  localContext: boolean;
}

// Types pour les statistiques
export interface DashboardStats {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  budgetUtilization: number;
  goalsProgress: number;
  recentTransactions: Transaction[];
  budgetAlerts: Budget[];
}

// Types pour les exports
export interface ExportData {
  users: User[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  exportDate: Date;
  version: string;
}

// Types pour les notifications - importés depuis notificationService.ts
// Les interfaces NotificationData et NotificationPreferences sont définies dans notificationService.ts

// Types pour le monitoring des budgets
// AlertHistoryItem est défini dans budgetMonitoringService.ts

// Interface pour l'état global de l'application
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isOnline: boolean;
  lastSync: Date | null;
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'mg';
  alerts: any[]; // AlertHistoryItem[] - défini dans budgetMonitoringService.ts
}

// Réexport des types de transactions récurrentes pour commodité
export type { RecurringTransaction, RecurrenceFrequency } from './recurring';
export type { RecurringTransactionCreate, RecurringTransactionUpdate } from './recurring';
