import apiService from './apiService';
import type { Transaction } from '../types';
// TEMPORARY FIX: Comment out problematic import to unblock the app
// import notificationService from './notificationService';

// TEMPORARY: Mock notification service to unblock the app
const notificationService = {
  sendNotification: async (notification: any): Promise<boolean> => {
    console.log('🔔 Notification temporarily disabled:', notification?.title || 'Unknown');
    return false;
  }
};

class TransactionService {
  /**
   * Récupérer toutes les transactions
   */
  async getTransactions(): Promise<Transaction[]> {
    try {
      const response = await apiService.getTransactions();
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la récupération des transactions:', response.error);
        return [];
      }
      return (response.data as Transaction[]) || [];
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des transactions:', error);
      return [];
    }
  }

  async getUserTransactions(_userId: string): Promise<Transaction[]> {
    return this.getTransactions();
  }

  /**
   * Récupérer une transaction par ID
   */
  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      // Pour l'instant, on récupère toutes les transactions et on filtre
      const transactions = await this.getTransactions();
      return transactions.find(t => t.id === id) || null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la transaction:', error);
      return null;
    }
  }

  /**
   * Créer une nouvelle transaction
   */
  async createTransaction(userId: string, transactionData: Omit<Transaction, 'id' | 'createdAt' | 'userId'>): Promise<Transaction | null> {
    try {
      const response = await apiService.createTransaction(transactionData);
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la création de la transaction:', response.error);
        return null;
      }

      // Vérifier les alertes de budget après création
      setTimeout(() => {
        notificationService.checkBudgetAlerts(userId);
      }, 1000);

      console.log('✅ Transaction créée avec succès');
      // L'API retourne l'ID de la transaction créée, on reconstruit l'objet
      const transaction: Transaction = {
        ...transactionData,
        id: (response.data as any)?.transactionId || crypto.randomUUID(),
        userId,
        createdAt: new Date()
      };
      return transaction;
    } catch (error) {
      console.error('❌ Erreur lors de la création de la transaction:', error);
      return null;
    }
  }

  /**
   * Mettre à jour une transaction
   */
  async updateTransaction(id: string, transactionData: Partial<Omit<Transaction, 'id' | 'createdAt' | 'userId'>>): Promise<Transaction | null> {
    try {
      const response = await apiService.updateTransaction(id, transactionData);
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la mise à jour de la transaction:', response.error);
        return null;
      }

      console.log('✅ Transaction mise à jour avec succès');
      // Récupérer la transaction mise à jour
      return await this.getTransaction(id);
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la transaction:', error);
      return null;
    }
  }

  /**
   * Supprimer une transaction
   */
  async deleteTransaction(id: string): Promise<boolean> {
    try {
      const response = await apiService.deleteTransaction(id);
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la suppression de la transaction:', response.error);
        return false;
      }

      console.log('✅ Transaction supprimée avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la transaction:', error);
      return false;
    }
  }

  /**
   * Créer un transfert entre comptes
   */
  async createTransfer(
    userId: string,
    transferData: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      description: string;
      notes?: string;
    }
  ): Promise<{ success: boolean; transactions?: Transaction[]; error?: string }> {
    try {
      console.log('💸 Création du transfert:', transferData);

      // Créer la transaction de débit (sortie du compte source)
      const debitTransaction = {
        userId,
        accountId: transferData.fromAccountId,
        type: 'transfer',
        amount: -Math.abs(transferData.amount), // Montant négatif pour la sortie
        description: transferData.description,
        category: 'transfer',
        date: new Date().toISOString(),
        notes: transferData.notes || `Transfert vers ${transferData.toAccountId}`
      };

      // Créer la transaction de crédit (entrée du compte destination)
      const creditTransaction = {
        userId,
        accountId: transferData.toAccountId,
        type: 'transfer',
        amount: Math.abs(transferData.amount), // Montant positif pour l'entrée
        description: transferData.description,
        category: 'transfer',
        date: new Date().toISOString(),
        notes: transferData.notes || `Transfert depuis ${transferData.fromAccountId}`
      };

      // Utiliser l'API de transfert
      const response = await apiService.createTransfer({
        debitTransaction,
        creditTransaction
      });

      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la création du transfert:', response.error);
        return { success: false, error: response.error || 'Erreur lors de la création du transfert' };
      }

      console.log('✅ Transfert créé avec succès');
      return { success: true, transactions: response.data as Transaction[] };
    } catch (error) {
      console.error('❌ Erreur lors de la création du transfert:', error);
      return { success: false, error: 'Erreur lors de la création du transfert' };
    }
  }

  /**
   * Mettre à jour le solde d'un compte (méthode publique)
   */
  async updateAccountBalance(_accountId: string, _amount: number): Promise<boolean> {
    try {
      // Cette méthode est maintenant gérée par l'API
      console.log('ℹ️ Mise à jour du solde gérée par l\'API');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du solde:', error);
      return false;
    }
  }

  /**
   * Mettre à jour le solde d'un compte (méthode publique pour compatibilité)
   */
  async updateAccountBalancePublic(accountId: string, amount: number): Promise<boolean> {
    return this.updateAccountBalance(accountId, amount);
  }
}

export default new TransactionService();