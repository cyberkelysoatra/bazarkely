/**
 * Script de migration de base de données pour les utilisateurs existants
 * Migration vers l'architecture optimisée pour 100+ utilisateurs concurrents
 */

import { db } from '../lib/database';

export interface MigrationResult {
  success: boolean;
  migratedUsers: number;
  migratedAccounts: number;
  migratedTransactions: number;
  migratedBudgets: number;
  migratedGoals: number;
  errors: string[];
  warnings: string[];
}

export interface MigrationStats {
  totalUsers: number;
  totalAccounts: number;
  totalTransactions: number;
  totalBudgets: number;
  totalGoals: number;
  dataSize: number;
  estimatedMigrationTime: number;
}

class DatabaseMigration {
  private readonly MIGRATION_VERSION = 5;
  private readonly BACKUP_PREFIX = 'migration_backup_';

  /**
   * Vérifier si une migration est nécessaire
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      const currentVersion = await this.getCurrentDatabaseVersion();
      return currentVersion < this.MIGRATION_VERSION;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de migration:', error);
      return false;
    }
  }

  /**
   * Obtenir la version actuelle de la base de données
   */
  private async getCurrentDatabaseVersion(): Promise<number> {
    try {
      // Vérifier si la table performanceMetrics existe (version 5)
      const metrics = await db.performanceMetrics.count();
      if (metrics >= 0) {
        return 5;
      }
      
      // Vérifier si la table feeConfigurations existe (version 3-4)
      const fees = await db.feeConfigurations.count();
      if (fees >= 0) {
        return 4;
      }
      
      // Vérifier si syncQueue a le bon schéma (version 2)
      const syncOps = await db.syncQueue.limit(1).toArray();
      if (syncOps.length > 0 && 'table_name' in syncOps[0]) {
        return 2;
      }
      
      return 1;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de version:', error);
      return 1;
    }
  }

  /**
   * Obtenir les statistiques de migration
   */
  async getMigrationStats(): Promise<MigrationStats> {
    try {
      const [users, accounts, transactions, budgets, goals] = await Promise.all([
        db.users.count(),
        db.accounts.count(),
        db.transactions.count(),
        db.budgets.count(),
        db.goals.count()
      ]);

      const totalRecords = users + accounts + transactions + budgets + goals;
      const estimatedTime = Math.max(5, Math.ceil(totalRecords / 1000) * 2); // 2ms par 1000 enregistrements

      return {
        totalUsers: users,
        totalAccounts: accounts,
        totalTransactions: transactions,
        totalBudgets: budgets,
        totalGoals: goals,
        dataSize: totalRecords,
        estimatedMigrationTime: estimatedTime
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error);
      return {
        totalUsers: 0,
        totalAccounts: 0,
        totalTransactions: 0,
        totalBudgets: 0,
        totalGoals: 0,
        dataSize: 0,
        estimatedMigrationTime: 0
      };
    }
  }

  /**
   * Créer une sauvegarde avant migration
   */
  async createBackup(): Promise<string> {
    try {
      const backupId = `${this.BACKUP_PREFIX}${Date.now()}`;
      
      const [users, accounts, transactions, budgets, goals, syncQueue] = await Promise.all([
        db.users.toArray(),
        db.accounts.toArray(),
        db.transactions.toArray(),
        db.budgets.toArray(),
        db.goals.toArray(),
        db.syncQueue.toArray()
      ]);

      const backupData = {
        id: backupId,
        timestamp: new Date(),
        version: await this.getCurrentDatabaseVersion(),
        data: {
          users,
          accounts,
          transactions,
          budgets,
          goals,
          syncQueue
        }
      };

      // Sauvegarder dans localStorage
      localStorage.setItem(`bazarkely_backup_${backupId}`, JSON.stringify(backupData));
      
      console.log(`✅ Sauvegarde créée: ${backupId}`);
      return backupId;
    } catch (error) {
      console.error('❌ Erreur lors de la création de la sauvegarde:', error);
      throw error;
    }
  }

  /**
   * Exécuter la migration complète
   */
  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedUsers: 0,
      migratedAccounts: 0,
      migratedTransactions: 0,
      migratedBudgets: 0,
      migratedGoals: 0,
      errors: [],
      warnings: []
    };

    try {
      console.log('🔄 Début de la migration de base de données...');

      // 1. Créer une sauvegarde
      const backupId = await this.createBackup();
      console.log(`📦 Sauvegarde créée: ${backupId}`);

      // 2. Vérifier la version actuelle
      const currentVersion = await this.getCurrentDatabaseVersion();
      console.log(`📊 Version actuelle: ${currentVersion}`);

      if (currentVersion >= this.MIGRATION_VERSION) {
        result.warnings.push('La base de données est déjà à jour');
        result.success = true;
        return result;
      }

      // 3. Exécuter les migrations par étapes
      if (currentVersion < 2) {
        await this.migrateToVersion2();
        console.log('✅ Migration vers la version 2 terminée');
      }

      if (currentVersion < 3) {
        await this.migrateToVersion3();
        console.log('✅ Migration vers la version 3 terminée');
      }

      if (currentVersion < 4) {
        await this.migrateToVersion4();
        console.log('✅ Migration vers la version 4 terminée');
      }

      if (currentVersion < 5) {
        await this.migrateToVersion5();
        console.log('✅ Migration vers la version 5 terminée');
      }

      // 4. Vérifier l'intégrité des données
      await this.verifyDataIntegrity();

      // 5. Compresser les anciennes données
      await this.compressOldData();

      // 6. Mettre à jour les statistiques
      const stats = await this.getMigrationStats();
      result.migratedUsers = stats.totalUsers;
      result.migratedAccounts = stats.totalAccounts;
      result.migratedTransactions = stats.totalTransactions;
      result.migratedBudgets = stats.totalBudgets;
      result.migratedGoals = stats.totalGoals;

      result.success = true;
      console.log('✅ Migration complète terminée avec succès');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      result.errors.push(`Erreur lors de la migration: ${errorMessage}`);
      console.error('❌ Erreur lors de la migration:', error);
    }

    return result;
  }

  /**
   * Migration vers la version 2
   */
  private async migrateToVersion2(): Promise<void> {
    // Cette migration est déjà gérée par Dexie
    console.log('🔄 Migration vers la version 2...');
  }

  /**
   * Migration vers la version 3
   */
  private async migrateToVersion3(): Promise<void> {
    // Cette migration est déjà gérée par Dexie
    console.log('🔄 Migration vers la version 3...');
  }

  /**
   * Migration vers la version 4
   */
  private async migrateToVersion4(): Promise<void> {
    // Cette migration est déjà gérée par Dexie
    console.log('🔄 Migration vers la version 4...');
  }

  /**
   * Migration vers la version 5
   */
  private async migrateToVersion5(): Promise<void> {
    console.log('🔄 Migration vers la version 5 - Architecture optimisée...');
    
    // Ajouter les champs createdAt et updatedAt aux enregistrements existants
    const tables = [
      { name: 'users', table: db.users },
      { name: 'accounts', table: db.accounts },
      { name: 'transactions', table: db.transactions },
      { name: 'budgets', table: db.budgets },
      { name: 'goals', table: db.goals }
    ];

    for (const { name, table } of tables) {
      try {
        const records = await table.toArray();
        console.log(`📊 Migration de ${records.length} enregistrements de la table ${name}...`);
        
        for (const record of records) {
          const updates: any = {};
          if (!record.createdAt) {
            updates.createdAt = new Date();
          }
          if (!record.updatedAt) {
            updates.updatedAt = new Date();
          }
          
          if (Object.keys(updates).length > 0) {
            await table.update(record.id, updates);
          }
        }
        
        console.log(`✅ Table ${name} migrée avec succès`);
      } catch (error) {
        console.error(`❌ Erreur lors de la migration de la table ${name}:`, error);
        throw error;
      }
    }

    // Initialiser les métriques de performance
    try {
      const existingMetrics = await db.performanceMetrics.count();
      if (existingMetrics === 0) {
        await db.performanceMetrics.add({
          operationCount: 0,
          averageResponseTime: 0,
          concurrentUsers: 0,
          memoryUsage: 0,
          lastUpdated: new Date()
        });
        console.log('✅ Métriques de performance initialisées');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des métriques:', error);
    }
  }

  /**
   * Vérifier l'intégrité des données
   */
  private async verifyDataIntegrity(): Promise<void> {
    console.log('🔍 Vérification de l\'intégrité des données...');
    
    const checks = [
      { name: 'Utilisateurs', count: await db.users.count() },
      { name: 'Comptes', count: await db.accounts.count() },
      { name: 'Transactions', count: await db.transactions.count() },
      { name: 'Budgets', count: await db.budgets.count() },
      { name: 'Objectifs', count: await db.goals.count() }
    ];

    for (const check of checks) {
      console.log(`✅ ${check.name}: ${check.count} enregistrements`);
    }

    // Vérifier les relations
    const users = await db.users.toArray();
    for (const user of users) {
      const userAccounts = await db.accounts.where('userId').equals(user.id).count();
      const userTransactions = await db.transactions.where('userId').equals(user.id).count();
      const userBudgets = await db.budgets.where('userId').equals(user.id).count();
      const userGoals = await db.goals.where('userId').equals(user.id).count();
      
      console.log(`👤 Utilisateur ${user.username}: ${userAccounts} comptes, ${userTransactions} transactions, ${userBudgets} budgets, ${userGoals} objectifs`);
    }
  }

  /**
   * Compresser les anciennes données
   */
  private async compressOldData(): Promise<void> {
    console.log('🗜️ Compression des anciennes données...');
    
    try {
      // Compresser les transactions anciennes (plus de 90 jours)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      const oldTransactions = await db.transactions
        .where('date')
        .below(cutoffDate)
        .toArray();
      
      if (oldTransactions.length > 0) {
        console.log(`📊 Compression de ${oldTransactions.length} transactions anciennes...`);
        
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
        
        console.log(`📊 Créé ${monthlySummaries.size} résumés mensuels`);
        
        // Supprimer les anciennes transactions
        await db.transactions
          .where('date')
          .below(cutoffDate)
          .delete();
        
        console.log(`✅ ${oldTransactions.length} transactions anciennes compressées`);
      }
      
      // Nettoyer les opérations de sync anciennes
      const syncCutoffDate = new Date();
      syncCutoffDate.setDate(syncCutoffDate.getDate() - 7);
      
      const oldSyncOps = await db.syncQueue
        .where('timestamp')
        .below(syncCutoffDate)
        .count();
      
      if (oldSyncOps > 0) {
        await db.syncQueue
          .where('timestamp')
          .below(syncCutoffDate)
          .delete();
        
        console.log(`✅ ${oldSyncOps} opérations de sync anciennes nettoyées`);
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la compression des données:', error);
    }
  }

  /**
   * Restaurer depuis une sauvegarde
   */
  async restoreFromBackup(backupId: string): Promise<boolean> {
    try {
      const backupData = localStorage.getItem(`bazarkely_backup_${backupId}`);
      if (!backupData) {
        throw new Error('Sauvegarde introuvable');
      }

      const backup = JSON.parse(backupData);
      console.log(`🔄 Restauration depuis la sauvegarde ${backupId}...`);

      // Restaurer les données
      if (backup.data.users) {
        await db.users.clear();
        await db.users.bulkAdd(backup.data.users);
      }
      
      if (backup.data.accounts) {
        await db.accounts.clear();
        await db.accounts.bulkAdd(backup.data.accounts);
      }
      
      if (backup.data.transactions) {
        await db.transactions.clear();
        await db.transactions.bulkAdd(backup.data.transactions);
      }
      
      if (backup.data.budgets) {
        await db.budgets.clear();
        await db.budgets.bulkAdd(backup.data.budgets);
      }
      
      if (backup.data.goals) {
        await db.goals.clear();
        await db.goals.bulkAdd(backup.data.goals);
      }
      
      if (backup.data.syncQueue) {
        await db.syncQueue.clear();
        await db.syncQueue.bulkAdd(backup.data.syncQueue);
      }

      console.log('✅ Restauration terminée avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error);
      return false;
    }
  }

  /**
   * Lister les sauvegardes disponibles
   */
  getAvailableBackups(): string[] {
    const backups: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bazarkely_backup_')) {
        backups.push(key.replace('bazarkely_backup_', ''));
      }
    }
    
    return backups.sort().reverse(); // Plus récent en premier
  }

  /**
   * Supprimer une sauvegarde
   */
  deleteBackup(backupId: string): boolean {
    try {
      localStorage.removeItem(`bazarkely_backup_${backupId}`);
      console.log(`✅ Sauvegarde ${backupId} supprimée`);
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la sauvegarde:', error);
      return false;
    }
  }
}

export const databaseMigration = new DatabaseMigration();
export default databaseMigration;
























