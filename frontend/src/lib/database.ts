import Dexie, { type Table, type Transaction } from 'dexie';
import type {
  User,
  Account,
  Transaction as TransactionType,
  Budget,
  Goal,
  MobileMoneyRate,
  SyncOperation,
  FeeConfiguration,
  RecurringTransaction,
  GoalMilestone
} from '../types';
import type {
  PersonalLoan,
  LoanRepayment,
  LoanInterestPeriod,
  PendingReceipt
} from '../types/loans';

// Types pour les notifications
interface NotificationData {
  id: string;
  type: 'budget_alert' | 'goal_reminder' | 'transaction_alert' | 'daily_summary' | 'sync_notification' | 'security_alert' | 'mobile_money' | 'seasonal' | 'family_event' | 'market_day';
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  timestamp: Date;
  userId: string;
  read: boolean;
  scheduled?: Date;
  priority: 'low' | 'normal' | 'high';
  sent: boolean;
  clickAction?: string;
}

interface NotificationSettings {
  id: string;
  userId: string;
  budgetAlerts: boolean;
  goalReminders: boolean;
  transactionAlerts: boolean;
  dailySummary: boolean;
  syncNotifications: boolean;
  securityAlerts: boolean;
  mobileMoneyAlerts: boolean;
  seasonalReminders: boolean;
  familyEventReminders: boolean;
  marketDayReminders: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  maxDailyNotifications: number;
  createdAt: Date;
  updatedAt: Date;
}

interface NotificationHistory {
  id: string;
  userId: string;
  notificationId: string;
  sentAt: Date;
  clickedAt?: Date;
  dismissedAt?: Date;
  action?: string;
  data?: any;
}

// Types pour la gestion des connexions et verrous
interface ConnectionPool {
  id: string;
  isActive: boolean;
  lastUsed: Date;
  transactionCount: number;
}

interface DatabaseLock {
  id: string;
  table: string;
  recordId: string;
  userId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

interface PerformanceMetrics {
  id?: number;
  operationCount: number;
  averageResponseTime: number;
  concurrentUsers: number;
  memoryUsage: number;
  lastUpdated: Date;
}

// Type pour les célébrations de jalons d'objectifs
interface GoalCelebration {
  goalId: string;
  goalName: string;
  milestonesCompleted: number[]; // Array of MilestoneThreshold (25, 50, 75, 100) - stored as numbers
  lastCelebratedAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export class BazarKELYDB extends Dexie {
  users!: Table<User>;
  accounts!: Table<Account>;
  transactions!: Table<TransactionType>;
  budgets!: Table<Budget>;
  goals!: Table<Goal>;
  mobileMoneyRates!: Table<MobileMoneyRate>;
  syncQueue!: Table<SyncOperation>;
  feeConfigurations!: Table<FeeConfiguration>;
  
  // Nouvelles tables pour la gestion des performances
  connectionPoolTable!: Table<ConnectionPool>;
  databaseLocks!: Table<DatabaseLock>;
  performanceMetrics!: Table<PerformanceMetrics>;
  
  // Tables pour les notifications
  notifications!: Table<NotificationData>;
  notificationSettings!: Table<NotificationSettings>;
  notificationHistory!: Table<NotificationHistory>;
  
  // Table pour les transactions récurrentes (Phase 1 - Infrastructure)
  recurringTransactions!: Table<RecurringTransaction>;
  
  // Table pour les jalons d'objectifs (Goal Suggestions System - S32)
  goalMilestones!: Table<GoalMilestone>;
  
  // Table pour les célébrations de jalons d'objectifs
  goalCelebrations!: Table<GoalCelebration>;

  // Tables pour le module Prêts Familiaux (offline-first — v13)
  personalLoans!: Table<PersonalLoan>;
  loanRepayments!: Table<LoanRepayment>;
  loanInterestPeriods!: Table<LoanInterestPeriod>;
  pendingReceipts!: Table<PendingReceipt>;

  // Gestion des connexions et verrous
  private connectionPool: Map<string, ConnectionPool> = new Map();
  private activeLocks: Map<string, DatabaseLock> = new Map();
  private maxConnections = 50;
  private lockTimeout = 30000; // 30 secondes

  constructor() {
    super('BazarKELYDB');
    
    this.version(1).stores({
      users: 'id, username, email, phone, lastSync',
      accounts: 'id, userId, name, type, balance, currency',
      transactions: 'id, userId, accountId, type, amount, category, date',
      budgets: 'id, userId, category, amount, period, year, month',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee',
      syncQueue: '++id, userId, operation, data, timestamp'
    });

    // Version 2 avec schéma corrigé pour syncQueue
    this.version(2).stores({
      users: 'id, username, email, phone, lastSync',
      accounts: 'id, userId, name, type, balance, currency',
      transactions: 'id, userId, accountId, type, amount, category, date',
      budgets: 'id, userId, category, amount, period, year, month',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status'
    }).upgrade(_trans => {
      console.log('🔄 Migration de la base de données vers la version 2...');
    });

    // Version 3 avec les configurations de frais
    this.version(3).stores({
      users: 'id, username, email, phone, lastSync',
      accounts: 'id, userId, name, type, balance, currency',
      transactions: 'id, userId, accountId, type, amount, category, date',
      budgets: 'id, userId, category, amount, period, year, month',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt'
    }).upgrade(_trans => {
      console.log('🔄 Migration de la base de données vers la version 3...');
    });

    // Version 4 avec support des mots de passe hachés
    this.version(4).stores({
      users: 'id, username, email, phone, passwordHash, lastSync',
      accounts: 'id, userId, name, type, balance, currency',
      transactions: 'id, userId, accountId, type, amount, category, date',
      budgets: 'id, userId, category, amount, period, year, month',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt'
    }).upgrade(async (trans) => {
      console.log('🔄 Migration de la base de données vers la version 4...');
      
      const users = await trans.table('users').toArray();
      console.log(`📊 Migration de ${users.length} utilisateurs existants...`);
      
      for (const user of users) {
        if (!user.passwordHash) {
          const defaultPasswordHash = 'MIGRATION_REQUIRED_' + Date.now();
          await trans.table('users').update(user.id, {
            passwordHash: defaultPasswordHash
          });
          console.log(`✅ Utilisateur ${user.username} migré avec passwordHash temporaire`);
        }
      }
      
      console.log('✅ Migration vers la version 4 terminée');
    });

    // Version 5 - Architecture optimisée pour 100+ utilisateurs concurrents
    this.version(5).stores({
      users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt',
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date]',
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, [userId+deadline]',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, [userId+status], [status+timestamp]',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
      connectionPool: '++id, isActive, lastUsed, transactionCount',
      databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
      performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated'
    }).upgrade(async (trans) => {
      console.log('🔄 Migration vers l\'architecture optimisée pour 100+ utilisateurs concurrents...');
      
      // Ajouter les champs createdAt et updatedAt aux tables existantes
      const tables = ['users', 'accounts', 'transactions', 'budgets', 'goals'];
      
      for (const tableName of tables) {
        const table = trans.table(tableName);
        const records = await table.toArray();
        
        for (const record of records) {
          const updates: any = {};
          if (!record.createdAt) updates.createdAt = new Date();
          if (!record.updatedAt) updates.updatedAt = new Date();
          
          if (Object.keys(updates).length > 0) {
            await table.update(record.id, updates);
          }
        }
      }
      
      // Initialiser les métriques de performance
      await trans.table('performanceMetrics').add({
        operationCount: 0,
        averageResponseTime: 0,
        concurrentUsers: 0,
        memoryUsage: 0,
        lastUpdated: new Date()
      });
      
      console.log('✅ Migration vers l\'architecture optimisée terminée');
    });

    // Version 6 - Support des notifications push
    this.version(6).stores({
      users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt',
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date]',
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, [userId+deadline]',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, [userId+status], [status+timestamp]',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
      connectionPool: '++id, isActive, lastUsed, transactionCount',
      databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
      performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated',
      notifications: 'id, type, userId, timestamp, read, sent, scheduled, [userId+type], [userId+timestamp], [type+timestamp]',
      notificationSettings: 'id, userId, [userId]',
      notificationHistory: 'id, userId, notificationId, sentAt, [userId+sentAt], [notificationId]'
    }).upgrade(async (trans) => {
      console.log('🔄 Migration vers le support des notifications push...');
      
      // Initialiser les paramètres de notification par défaut pour les utilisateurs existants
      const users = await trans.table('users').toArray();
      
      for (const user of users) {
        const defaultSettings: NotificationSettings = {
          id: crypto.randomUUID(),
          userId: user.id,
          budgetAlerts: true,
          goalReminders: true,
          transactionAlerts: true,
          dailySummary: true,
          syncNotifications: false,
          securityAlerts: true,
          mobileMoneyAlerts: true,
          seasonalReminders: true,
          familyEventReminders: true,
          marketDayReminders: true,
          quietHours: {
            enabled: true,
            start: '22:00',
            end: '07:00'
          },
          frequency: 'immediate',
          maxDailyNotifications: 5,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await trans.table('notificationSettings').add(defaultSettings);
      }
      
      console.log('✅ Migration vers le support des notifications push terminée');
    });

    // Version 7 - Support des transactions récurrentes (Phase 1 - Infrastructure)
    this.version(7).stores({
      users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt',
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date], isRecurring, recurringTransactionId',
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, [userId+deadline]',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, [userId+status], [status+timestamp]',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
      connectionPool: '++id, isActive, lastUsed, transactionCount',
      databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
      performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated',
      notifications: 'id, type, userId, timestamp, read, sent, scheduled, [userId+type], [userId+timestamp], [type+timestamp]',
      notificationSettings: 'id, userId, [userId]',
      notificationHistory: 'id, userId, notificationId, sentAt, [userId+sentAt], [notificationId]',
      recurringTransactions: 'id, userId, accountId, frequency, isActive, nextGenerationDate, linkedBudgetId, [userId+isActive], [userId+nextGenerationDate]'
    }).upgrade(async (trans) => {
      console.log('🔄 Migration vers le support des transactions récurrentes (Phase 1)...');
      
      // Ajouter les champs optionnels isRecurring et recurringTransactionId aux transactions existantes
      const transactions = await trans.table('transactions').toArray();
      
      for (const transaction of transactions) {
        const updates: any = {};
        if (transaction.isRecurring === undefined) {
          updates.isRecurring = false;
        }
        if (transaction.recurringTransactionId === undefined) {
          updates.recurringTransactionId = null;
        }
        
        if (Object.keys(updates).length > 0) {
          await trans.table('transactions').update(transaction.id, updates);
        }
      }
      
      console.log('✅ Migration vers le support des transactions récurrentes terminée');
    });

    // Version 8 - PWA Phase 3: Ajout de priority, syncTag, expiresAt à syncQueue
    this.version(8).stores({
      users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt',
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date], isRecurring, recurringTransactionId',
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, [userId+deadline]',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, priority, syncTag, expiresAt, [userId+status], [status+timestamp], [priority+timestamp], [syncTag+status]',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
      connectionPool: '++id, isActive, lastUsed, transactionCount',
      databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
      performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated',
      notifications: 'id, type, userId, timestamp, read, sent, scheduled, [userId+type], [userId+timestamp], [type+timestamp]',
      notificationSettings: 'id, userId, [userId]',
      notificationHistory: 'id, userId, notificationId, sentAt, [userId+sentAt], [notificationId]',
      recurringTransactions: 'id, userId, accountId, frequency, isActive, nextGenerationDate, linkedBudgetId, [userId+isActive], [userId+nextGenerationDate]'
    }).upgrade(async (trans) => {
      console.log('📦 [Database] Migrating syncQueue to v8 - Adding priority, syncTag, expiresAt');
      
      // Migrate existing syncQueue operations with default values
      await trans.table('syncQueue').toCollection().modify(operation => {
        // Set default priority (2 = normal)
        if (operation.priority === undefined) {
          operation.priority = 2;
        }
        // Set default syncTag
        if (operation.syncTag === undefined) {
          operation.syncTag = 'bazarkely-sync';
        }
        // Set default expiresAt (null = never expires)
        if (operation.expiresAt === undefined) {
          operation.expiresAt = null;
        }
      });
      
      console.log('✅ [Database] syncQueue migration to v8 complete');
    });

    // Version 9 - Unified Savings System: Ajout de linkedAccountId dans goals et linkedGoalId/isSavingsAccount dans accounts
    this.version(9).stores({
      users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt, linkedGoalId, isSavingsAccount, [userId+linkedGoalId], [userId+isSavingsAccount]',
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date], isRecurring, recurringTransactionId',
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, linkedAccountId, [userId+deadline], [userId+linkedAccountId]',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, priority, syncTag, expiresAt, [userId+status], [status+timestamp], [priority+timestamp], [syncTag+status]',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
      connectionPool: '++id, isActive, lastUsed, transactionCount',
      databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
      performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated',
      notifications: 'id, type, userId, timestamp, read, sent, scheduled, [userId+type], [userId+timestamp], [type+timestamp]',
      notificationSettings: 'id, userId, [userId]',
      notificationHistory: 'id, userId, notificationId, sentAt, [userId+sentAt], [notificationId]',
      recurringTransactions: 'id, userId, accountId, frequency, isActive, nextGenerationDate, linkedBudgetId, [userId+isActive], [userId+nextGenerationDate]'
    }).upgrade(async (trans) => {
      console.log('🔄 [Database] Migrating to v9 - Adding unified savings system indexes');
      
      // Vérifier que les tables existent avant migration
      const tableNames = ['accounts', 'goals'];
      for (const tableName of tableNames) {
        try {
          const table = trans.table(tableName);
          const records = await table.toArray();
          
          if (tableName === 'accounts') {
            // Initialiser les nouveaux champs pour accounts
            for (const account of records) {
              const updates: any = {};
              // Initialiser linkedGoalId si non défini
              if ((account as any).linkedGoalId === undefined) {
                updates.linkedGoalId = null;
              }
              // Initialiser isSavingsAccount basé sur type='epargne'
              if ((account as any).isSavingsAccount === undefined) {
                updates.isSavingsAccount = (account as any).type === 'epargne';
              }
              
              if (Object.keys(updates).length > 0) {
                await table.update(account.id, updates);
              }
            }
            console.log(`✅ Migrated ${records.length} accounts with new fields`);
          }
          
          if (tableName === 'goals') {
            // Initialiser le nouveau champ pour goals
            for (const goal of records) {
              const updates: any = {};
              // Initialiser linkedAccountId si non défini
              if ((goal as any).linkedAccountId === undefined) {
                updates.linkedAccountId = null;
              }
              
              if (Object.keys(updates).length > 0) {
                await table.update(goal.id, updates);
              }
            }
            console.log(`✅ Migrated ${records.length} goals with new fields`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not migrate table ${tableName}:`, error);
        }
      }
      
      console.log('✅ [Database] Migration to v9 complete - Unified savings system indexes added');
    });

    // Version 10 - Goal Suggestions System: Ajout de goalMilestones et index pour suggestions
    this.version(10).stores({
      users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt, linkedGoalId, isSavingsAccount, [userId+linkedGoalId], [userId+isSavingsAccount]',
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date], isRecurring, recurringTransactionId',
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, linkedAccountId, isSuggested, suggestionType, [userId+deadline], [userId+linkedAccountId], [userId+isSuggested], [userId+suggestionType]',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, priority, syncTag, expiresAt, [userId+status], [status+timestamp], [priority+timestamp], [syncTag+status]',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
      connectionPool: '++id, isActive, lastUsed, transactionCount',
      databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
      performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated',
      notifications: 'id, type, userId, timestamp, read, sent, scheduled, [userId+type], [userId+timestamp], [type+timestamp]',
      notificationSettings: 'id, userId, [userId]',
      notificationHistory: 'id, userId, notificationId, sentAt, [userId+sentAt], [notificationId]',
      recurringTransactions: 'id, userId, accountId, frequency, isActive, nextGenerationDate, linkedBudgetId, [userId+isActive], [userId+nextGenerationDate]',
      goalMilestones: 'id, goalId, orderId, milestoneType, achievedAt, [goalId+orderId], [goalId+milestoneType], [goalId+achievedAt]'
    }).upgrade(async (trans) => {
      console.log('🔄 [Database] Migrating to v10 - Adding goal suggestions system and milestones');
      
      // Initialiser les nouveaux champs pour goals
      try {
        const goalsTable = trans.table('goals');
        const goals = await goalsTable.toArray();
        
        for (const goal of goals) {
          const updates: any = {};
          // Initialiser isSuggested si non défini
          if ((goal as any).isSuggested === undefined) {
            updates.isSuggested = false;
          }
          // Initialiser suggestionType si non défini
          if ((goal as any).suggestionType === undefined) {
            updates.suggestionType = null;
          }
          // Initialiser suggestionAcceptedAt si non défini
          if ((goal as any).suggestionAcceptedAt === undefined) {
            updates.suggestionAcceptedAt = null;
          }
          // Initialiser suggestionDismissedAt si non défini
          if ((goal as any).suggestionDismissedAt === undefined) {
            updates.suggestionDismissedAt = null;
          }
          
          if (Object.keys(updates).length > 0) {
            await goalsTable.update(goal.id, updates);
          }
        }
        
        console.log(`✅ Migrated ${goals.length} goals with suggestion fields`);
      } catch (error) {
        console.warn('⚠️ Could not migrate goals table:', error);
      }
      
      // La table goalMilestones sera créée automatiquement par Dexie
      console.log('✅ [Database] Migration to v10 complete - Goal suggestions system and milestones added');
    });

    // Version 11 - Goal Celebrations System: Ajout de goalCelebrations pour les célébrations de jalons
    this.version(11).stores({
      users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt, linkedGoalId, isSavingsAccount, [userId+linkedGoalId], [userId+isSavingsAccount]',
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date], isRecurring, recurringTransactionId',
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, linkedAccountId, isSuggested, suggestionType, [userId+deadline], [userId+linkedAccountId], [userId+isSuggested], [userId+suggestionType]',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, priority, syncTag, expiresAt, [userId+status], [status+timestamp], [priority+timestamp], [syncTag+status]',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
      connectionPool: '++id, isActive, lastUsed, transactionCount',
      databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
      performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated',
      notifications: 'id, type, userId, timestamp, read, sent, scheduled, [userId+type], [userId+timestamp], [type+timestamp]',
      notificationSettings: 'id, userId, [userId]',
      notificationHistory: 'id, userId, notificationId, sentAt, [userId+sentAt], [notificationId]',
      recurringTransactions: 'id, userId, accountId, frequency, isActive, nextGenerationDate, linkedBudgetId, [userId+isActive], [userId+nextGenerationDate]',
      goalMilestones: 'id, goalId, orderId, milestoneType, achievedAt, [goalId+orderId], [goalId+milestoneType], [goalId+achievedAt]',
      goalCelebrations: 'goalId, goalName, lastCelebratedAt, [goalId+lastCelebratedAt]'
    }).upgrade(async (trans) => {
      console.log('🔄 [Database] Migrating to v11 - Adding goal celebrations system');
      
      // Migration: La table goalCelebrations sera créée automatiquement par Dexie
      // Pas de migration de données nécessaire car c'est une nouvelle table
      
      console.log('✅ [Database] Migration to v11 complete - Goal celebrations system added');
    });

    // Version 12 - Phase B1: Support pour requiredMonthlyContribution dans goals
    // Ajoute le support pour le champ optionnel requiredMonthlyContribution dans le store goals
    // Ce champ permet de stocker la contribution mensuelle requise pour calculer la deadline adaptative
    // Pas de migration de données nécessaire car le champ est optionnel (défaut: undefined)
    this.version(12).stores({
      users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt, linkedGoalId, isSavingsAccount, [userId+linkedGoalId], [userId+isSavingsAccount]',
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date], isRecurring, recurringTransactionId',
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, linkedAccountId, isSuggested, suggestionType, [userId+deadline], [userId+linkedAccountId], [userId+isSuggested], [userId+suggestionType]',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, priority, syncTag, expiresAt, [userId+status], [status+timestamp], [priority+timestamp], [syncTag+status]',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
      connectionPool: '++id, isActive, lastUsed, transactionCount',
      databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
      performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated',
      notifications: 'id, type, userId, timestamp, read, sent, scheduled, [userId+type], [userId+timestamp], [type+timestamp]',
      notificationSettings: 'id, userId, [userId]',
      notificationHistory: 'id, userId, notificationId, sentAt, [userId+sentAt], [notificationId]',
      recurringTransactions: 'id, userId, accountId, frequency, isActive, nextGenerationDate, linkedBudgetId, [userId+isActive], [userId+nextGenerationDate]',
      goalMilestones: 'id, goalId, orderId, milestoneType, achievedAt, [goalId+orderId], [goalId+milestoneType], [goalId+achievedAt]',
      goalCelebrations: 'goalId, goalName, lastCelebratedAt, [goalId+lastCelebratedAt]'
    }).upgrade(async (trans) => {
      console.log('🔄 [Database] Migrating to v12 - Adding support for requiredMonthlyContribution field in goals');
      
      // Migration: Le champ requiredMonthlyContribution est optionnel et n'a pas besoin d'index
      // Les goals existants auront undefined pour ce champ, ce qui est le comportement attendu
      // Pas de transformation de données nécessaire
      
      console.log('✅ [Database] Migration to v12 complete - requiredMonthlyContribution field support added');
    });

    // Version 13 - Offline-first Prêts Familiaux : tables personalLoans, loanRepayments,
    // loanInterestPeriods + pendingReceipts (blobs des justificatifs en attente d'upload)
    this.version(13).stores({
      users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
      accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt, linkedGoalId, isSavingsAccount, [userId+linkedGoalId], [userId+isSavingsAccount]',
      transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date], isRecurring, recurringTransactionId',
      budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
      goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, linkedAccountId, isSuggested, suggestionType, [userId+deadline], [userId+linkedAccountId], [userId+isSuggested], [userId+suggestionType]',
      mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
      syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, priority, syncTag, expiresAt, [userId+status], [status+timestamp], [priority+timestamp], [syncTag+status]',
      feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
      connectionPool: '++id, isActive, lastUsed, transactionCount',
      databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
      performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated',
      notifications: 'id, type, userId, timestamp, read, sent, scheduled, [userId+type], [userId+timestamp], [type+timestamp]',
      notificationSettings: 'id, userId, [userId]',
      notificationHistory: 'id, userId, notificationId, sentAt, [userId+sentAt], [notificationId]',
      recurringTransactions: 'id, userId, accountId, frequency, isActive, nextGenerationDate, linkedBudgetId, [userId+isActive], [userId+nextGenerationDate]',
      goalMilestones: 'id, goalId, orderId, milestoneType, achievedAt, [goalId+orderId], [goalId+milestoneType], [goalId+achievedAt]',
      goalCelebrations: 'goalId, goalName, lastCelebratedAt, [goalId+lastCelebratedAt]',
      personalLoans: 'id, lenderUserId, borrowerUserId, status, transactionId, createdAt, [lenderUserId+status], [borrowerUserId+status]',
      loanRepayments: 'id, loanId, transactionId, paymentDate, confirmedAt, createdAt, [loanId+paymentDate]',
      loanInterestPeriods: 'id, loanId, status, periodStart, [loanId+status]',
      pendingReceipts: 'id, userId, repaymentId, createdAt'
    }).upgrade(async (_trans) => {
      console.log('🔄 [Database] Migrating to v13 - Adding offline-first tables for Personal Loans module');
      // Nouvelles tables vides : aucune transformation de données nécessaire.
      // Le premier chargement online de getMyLoans() peuplera personalLoans / loanRepayments /
      // loanInterestPeriods depuis Supabase. pendingReceipts ne reçoit des entrées qu'à
      // la première tentative d'upload offline d'un justificatif.
      console.log('✅ [Database] Migration to v13 complete - Personal loans tables ready');
    });

    // Initialiser le pool de connexions
    this.initializeConnectionPool();
    
    // Nettoyer les verrous expirés périodiquement
    setInterval(() => this.cleanupExpiredLocks(), 5000);
  }

  // Gestion du pool de connexions
  private initializeConnectionPool(): void {
    for (let i = 0; i < this.maxConnections; i++) {
      const connection: ConnectionPool = {
        id: `conn_${i}`,
        isActive: false,
        lastUsed: new Date(),
        transactionCount: 0
      };
      this.connectionPool.set(connection.id, connection);
    }
  }

  // Acquérir une connexion du pool
  private async acquireConnection(): Promise<string> {
    const availableConnection = Array.from(this.connectionPool.values())
      .find(conn => !conn.isActive);
    
    if (!availableConnection) {
      throw new Error('Aucune connexion disponible dans le pool');
    }
    
    availableConnection.isActive = true;
    availableConnection.lastUsed = new Date();
    availableConnection.transactionCount++;
    
    return availableConnection.id;
  }

  // Libérer une connexion
  private releaseConnection(connectionId: string): void {
    const connection = this.connectionPool.get(connectionId);
    if (connection) {
      connection.isActive = false;
      connection.lastUsed = new Date();
    }
  }

  // Gestion des verrous de base de données
  async acquireLock(table: string, recordId: string, userId: string): Promise<boolean> {
    const lockKey = `${table}_${recordId}`;
    
    // Vérifier si un verrou existe déjà
    const existingLock = this.activeLocks.get(lockKey);
    if (existingLock && existingLock.expiresAt > new Date()) {
      return false; // Verrou déjà acquis
    }
    
    // Créer un nouveau verrou
    const lock: DatabaseLock = {
      id: crypto.randomUUID(),
      table,
      recordId,
      userId,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + this.lockTimeout)
    };
    
    this.activeLocks.set(lockKey, lock);
    
    // Persister le verrou en base
    await this.databaseLocks.add(lock);
    
    return true;
  }

  // Libérer un verrou
  async releaseLock(table: string, recordId: string, userId: string): Promise<void> {
    const lockKey = `${table}_${recordId}`;
    const lock = this.activeLocks.get(lockKey);
    
    if (lock && lock.userId === userId) {
      this.activeLocks.delete(lockKey);
      await this.databaseLocks.delete(lock.id);
    }
  }

  // Nettoyer les verrous expirés
  private async cleanupExpiredLocks(): Promise<void> {
    const now = new Date();
    const expiredLocks: string[] = [];
    
    for (const [key, lock] of Array.from(this.activeLocks.entries())) {
      if (lock.expiresAt <= now) {
        expiredLocks.push(key);
      }
    }
    
    for (const key of expiredLocks) {
      const lock = this.activeLocks.get(key);
      if (lock) {
        this.activeLocks.delete(key);
        await this.databaseLocks.delete(lock.id);
      }
    }
  }

  // Transaction optimisée avec gestion des verrous
  async optimizedTransaction<T>(
    tables: string[],
    operation: (trans: Transaction) => Promise<T>,
    lockKeys?: Array<{ table: string; recordId: string }>
  ): Promise<T> {
    const connectionId = await this.acquireConnection();
    
    try {
      // Acquérir les verrous nécessaires
      if (lockKeys) {
        for (const { table, recordId } of lockKeys) {
          const acquired = await this.acquireLock(table, recordId, 'system');
          if (!acquired) {
            throw new Error(`Impossible d'acquérir le verrou pour ${table}:${recordId}`);
          }
        }
      }
      
      // Exécuter la transaction
      const result = await this.transaction('rw', tables as any, operation);
      
      return result;
    } finally {
      // Libérer les verrous
      if (lockKeys) {
        for (const { table, recordId } of lockKeys) {
          await this.releaseLock(table, recordId, 'system');
        }
      }
      
      // Libérer la connexion
      this.releaseConnection(connectionId);
    }
  }

  // Mise à jour des métriques de performance
  async updatePerformanceMetrics(operationTime: number): Promise<void> {
    const metrics = await this.performanceMetrics.orderBy('lastUpdated').last();
    
    if (metrics) {
      const newOperationCount = metrics.operationCount + 1;
      const newAverageResponseTime = 
        (metrics.averageResponseTime * metrics.operationCount + operationTime) / newOperationCount;
      
      await this.performanceMetrics.update(metrics.id, {
        operationCount: newOperationCount,
        averageResponseTime: newAverageResponseTime,
        concurrentUsers: this.connectionPool.size,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        lastUpdated: new Date()
      });
    }
  }

  // Pagination optimisée pour les grandes datasets
  async getPaginatedData<T>(
    table: Table<T>,
    page: number = 1,
    pageSize: number = 50,
    filters?: any
  ): Promise<{ data: T[]; total: number; hasMore: boolean }> {
    const startTime = performance.now();
    
    try {
      let query: any = table;
      
      // Appliquer les filtres si fournis
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          query = query.where(key).equals(value);
        }
      }
      
      // Compter le total
      const total = await query.count();
      
      // Calculer l'offset
      const offset = (page - 1) * pageSize;
      
      // Récupérer les données paginées
      const data = await query
        .offset(offset)
        .limit(pageSize)
        .toArray();
      
      const hasMore = offset + pageSize < total;
      
      // Mettre à jour les métriques
      const operationTime = performance.now() - startTime;
      await this.updatePerformanceMetrics(operationTime);
      
      return { data, total, hasMore };
    } catch (error) {
      console.error('Erreur lors de la pagination:', error);
      throw error;
    }
  }

  // Compression des données pour optimiser l'espace
  async compressOldData(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Compresser les anciennes transactions en gardant seulement les résumés
    const oldTransactions = await this.transactions
      .where('date')
      .below(cutoffDate)
      .toArray();
    
    if (oldTransactions.length > 0) {
      // Créer des résumés mensuels
      const monthlySummaries = new Map<string, any>();
      
      for (const transaction of oldTransactions) {
        const monthKey = `${transaction.userId}_${transaction.date.getFullYear()}_${transaction.date.getMonth() + 1}`;
        
        if (!monthlySummaries.has(monthKey)) {
          monthlySummaries.set(monthKey, {
            userId: transaction.userId,
            year: transaction.date.getFullYear(),
            month: transaction.date.getMonth() + 1,
            totalIncome: 0,
            totalExpense: 0,
            transactionCount: 0,
            categories: {}
          });
        }
        
        const summary = monthlySummaries.get(monthKey);
        summary.transactionCount++;
        
        if (transaction.type === 'income') {
          summary.totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
          summary.totalExpense += transaction.amount;
          summary.categories[transaction.category] = (summary.categories[transaction.category] || 0) + transaction.amount;
        }
      }
      
      // Sauvegarder les résumés (à implémenter selon les besoins)
      console.log(`📊 Compressé ${oldTransactions.length} transactions en ${monthlySummaries.size} résumés mensuels`);
      
      // Supprimer les anciennes transactions
      await this.transactions
        .where('date')
        .below(cutoffDate)
        .delete();
    }
  }
}

export const db = new BazarKELYDB();

// Fonctions utilitaires pour la base de données
export const dbUtils = {
  // Initialisation des données par défaut
  async initializeDefaultData(userId: string): Promise<void> {
    // Vérifier s'il existe déjà un compte Espèces
    const existingEspecesAccount = await db.accounts
      .where('userId')
      .equals(userId)
      .and(account => account.type === 'especes')
      .first();

    // Créer un compte espèces par défaut SEULEMENT s'il n'en existe aucun
    if (!existingEspecesAccount) {
      const defaultAccount: Account = {
        id: crypto.randomUUID(),
        userId,
        name: 'Espèces',
        type: 'especes',
        balance: 0,
        currency: 'MGA',
        isDefault: true,
        createdAt: new Date()
      };

      await db.accounts.add(defaultAccount);
      console.log('✅ Compte Espèces par défaut créé lors de l\'initialisation');
    } else {
      console.log('ℹ️ Compte Espèces déjà existant, pas de création automatique');
    }

    // Initialiser les tarifs Mobile Money par défaut
    const defaultRates: MobileMoneyRate[] = [
      // Orange Money
      {
        id: crypto.randomUUID(),
        service: 'orange_money',
        minAmount: 0,
        maxAmount: 5000,
        fee: 0,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      {
        id: crypto.randomUUID(),
        service: 'orange_money',
        minAmount: 5001,
        maxAmount: 50000,
        fee: 100,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      {
        id: crypto.randomUUID(),
        service: 'orange_money',
        minAmount: 50001,
        maxAmount: 200000,
        fee: 200,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      {
        id: crypto.randomUUID(),
        service: 'orange_money',
        minAmount: 200001,
        maxAmount: null,
        fee: 500,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      // Mvola
      {
        id: crypto.randomUUID(),
        service: 'mvola',
        minAmount: 0,
        maxAmount: 5000,
        fee: 0,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      {
        id: crypto.randomUUID(),
        service: 'mvola',
        minAmount: 5001,
        maxAmount: 50000,
        fee: 150,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      {
        id: crypto.randomUUID(),
        service: 'mvola',
        minAmount: 50001,
        maxAmount: 200000,
        fee: 300,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      {
        id: crypto.randomUUID(),
        service: 'mvola',
        minAmount: 200001,
        maxAmount: null,
        fee: 600,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      // Airtel Money
      {
        id: crypto.randomUUID(),
        service: 'airtel_money',
        minAmount: 0,
        maxAmount: 5000,
        fee: 0,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      {
        id: crypto.randomUUID(),
        service: 'airtel_money',
        minAmount: 5001,
        maxAmount: 50000,
        fee: 120,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      {
        id: crypto.randomUUID(),
        service: 'airtel_money',
        minAmount: 50001,
        maxAmount: 200000,
        fee: 250,
        lastUpdated: new Date(),
        updatedBy: 'system'
      },
      {
        id: crypto.randomUUID(),
        service: 'airtel_money',
        minAmount: 200001,
        maxAmount: null,
        fee: 550,
        lastUpdated: new Date(),
        updatedBy: 'system'
      }
    ];

    await db.mobileMoneyRates.bulkAdd(defaultRates);
  },

  // Calcul des frais Mobile Money
  async calculateMobileMoneyFee(service: 'orange_money' | 'mvola' | 'airtel_money', amount: number): Promise<number> {
    const rates = await db.mobileMoneyRates
      .where('service')
      .equals(service)
      .toArray();

    for (const rate of rates) {
      if (amount >= rate.minAmount && (rate.maxAmount === null || amount <= rate.maxAmount)) {
        return rate.fee;
      }
    }

    return 0;
  },

  // Nettoyage des données anciennes
  async cleanupOldData(daysToKeep: number = 365): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Nettoyer les opérations de sync anciennes
    await db.syncQueue
      .where('timestamp')
      .below(cutoffDate)
      .delete();

    // Nettoyer les transactions anciennes (optionnel)
    // await db.transactions
    //   .where('date')
    //   .below(cutoffDate)
    //   .delete();
  },

  // Export des données
  async exportData(): Promise<any> {
    const [users, accounts, transactions, budgets, goals] = await Promise.all([
      db.users.toArray(),
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.budgets.toArray(),
      db.goals.toArray()
    ]);

    return {
      users,
      accounts,
      transactions,
      budgets,
      goals,
      exportDate: new Date(),
      version: '1.0.0'
    };
  },

  // Import des données
  async importData(data: any): Promise<void> {
    await db.transaction('rw', [db.users, db.accounts, db.transactions, db.budgets, db.goals], async () => {
      if (data.users) await db.users.bulkPut(data.users);
      if (data.accounts) await db.accounts.bulkPut(data.accounts);
      if (data.transactions) await db.transactions.bulkPut(data.transactions);
      if (data.budgets) await db.budgets.bulkPut(data.budgets);
      if (data.goals) await db.goals.bulkPut(data.goals);
    });
  }
};

// Gestion des erreurs de base de données
export const handleDBError = (error: any): string => {
  if (error.name === 'QuotaExceededError') {
    return 'Espace de stockage insuffisant. Veuillez libérer de l\'espace ou exporter vos données.';
  }
  
  if (error.name === 'ConstraintError') {
    return 'Erreur de contrainte de données. Vérifiez que les données sont valides.';
  }
  
  if (error.name === 'DataError') {
    return 'Erreur de données. Vérifiez le format des données saisies.';
  }
  
  return `Erreur de base de données: ${error.message}`;
};
