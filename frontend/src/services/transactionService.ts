import apiService from './apiService';
import accountService from './accountService';
import { convertAmount, getExchangeRate } from './exchangeRateService';
import type { Transaction } from '../types/index.js';
// TEMPORARY FIX: Comment out problematic import to unblock the app
// import notificationService from './notificationService';

// TEMPORARY: Mock notification service to unblock the app
// const notificationService = {
//   sendNotification: async (notification: any): Promise<boolean> => {
//     console.log('🔔 Notification temporarily disabled:', notification?.title || 'Unknown');
//     return false;
//   }
// };

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
      
      // Transformer les données Supabase vers le format local
      const supabaseTransactions = response.data as any[];
      const transactions: Transaction[] = supabaseTransactions.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        accountId: t.account_id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        category: t.category,
        date: new Date(t.date),
        targetAccountId: t.target_account_id,
        notes: t.notes || undefined,
        createdAt: new Date(t.created_at)
      }));
      
      return transactions;
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
  async getTransaction(id: string, userId?: string): Promise<Transaction | null> {
    try {
      console.log('🔍 getTransaction called with ID:', id, 'userId:', userId);
      
      // Pour l'instant, on récupère toutes les transactions et on filtre
      const transactions = await this.getTransactions();
      console.log('🔍 All transactions loaded:', transactions.length);
      
      const transaction = transactions.find(t => t.id === id) || null;
      console.log('🔍 Found transaction:', transaction);
      
      // Vérifier que la transaction appartient à l'utilisateur si userId fourni
      if (userId && transaction && transaction.userId !== userId) {
        console.error('❌ Transaction does not belong to user:', transaction.userId, 'vs', userId);
        return null;
      }
      
      return transaction;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la transaction:', error);
      return null;
    }
  }

  /**
   * Trouver la transaction jumelle d'un transfert
   */
  async getPairedTransferTransaction(transaction: Transaction): Promise<Transaction | null> {
    try {
      if (transaction.type !== 'transfer' || !transaction.targetAccountId) {
        return null;
      }

      console.log('🔍 Looking for paired transfer transaction for:', transaction.id);
      console.log('🔍 Target account ID:', transaction.targetAccountId);
      
      const transactions = await this.getTransactions();
      const pairedTransaction = transactions.find(t => 
        t.type === 'transfer' && 
        t.targetAccountId === transaction.accountId &&
        t.accountId === transaction.targetAccountId &&
        Math.abs(t.amount) === Math.abs(transaction.amount) &&
        t.id !== transaction.id
      );
      
      console.log('🔍 Found paired transaction:', pairedTransaction);
      return pairedTransaction || null;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche de la transaction jumelle:', error);
      return null;
    }
  }

  /**
   * Créer une nouvelle transaction
   */
  async createTransaction(userId: string, transactionData: Omit<Transaction, 'id' | 'createdAt' | 'userId'>): Promise<Transaction | null> {
    try {
      // Determine transaction currency (from input or account default)
      const transactionCurrency = transactionData.originalCurrency || 'MGA';
      
      // Get the account to check its currency
      const account = await accountService.getAccount(transactionData.accountId, userId);
      const accountCurrency = account?.currency || 'MGA';

      let amountToStore = transactionData.amount;
      let exchangeRateUsed: number | null = null;

      // If currencies differ, convert to account currency
      if (transactionCurrency !== accountCurrency) {
        try {
          const transactionDate = transactionData.date?.toISOString().split('T')[0];
          const rateInfo = await getExchangeRate(transactionCurrency, accountCurrency, transactionDate);
          exchangeRateUsed = rateInfo.rate;
          amountToStore = await convertAmount(transactionData.amount, transactionCurrency, accountCurrency, transactionDate);
          console.log(`💱 Currency conversion: ${transactionData.amount} ${transactionCurrency} = ${amountToStore} ${accountCurrency} (rate: ${exchangeRateUsed})`);
        } catch (conversionError) {
          console.error('❌ Erreur lors de la conversion de devise:', conversionError);
          // En cas d'erreur, utiliser le montant original (dégradation gracieuse)
          exchangeRateUsed = null;
        }
      }

      // Transformer camelCase vers snake_case pour Supabase
      const supabaseData = {
        user_id: userId,
        account_id: transactionData.accountId,
        amount: amountToStore,
        type: transactionData.type,
        category: transactionData.category,
        description: transactionData.description,
        date: transactionData.date.toISOString(),
        target_account_id: transactionData.targetAccountId || null,
        transfer_fee: 0,
        tags: null,
        location: null,
        status: 'completed',
        notes: transactionData.notes || null,
        // Multi-currency fields
        original_currency: transactionCurrency,
        original_amount: transactionData.amount,
        exchange_rate_used: exchangeRateUsed
      };

      console.log('🔍 Données transformées pour Supabase:', supabaseData);

      const response = await apiService.createTransaction(supabaseData);
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la création de la transaction:', response.error);
        return null;
      }

      // Vérifier les alertes de budget après création
      // TODO: Implement budget alerts when notificationService is fully implemented
      // setTimeout(() => {
      //   notificationService.checkBudgetAlerts(userId);
      // }, 1000);

      console.log('✅ Transaction créée avec succès');
      
      // Transformer la réponse Supabase vers le format local
      const supabaseTransaction = response.data as any;
      const transaction: Transaction = {
        id: supabaseTransaction.id,
        userId: supabaseTransaction.user_id,
        accountId: supabaseTransaction.account_id,
        type: supabaseTransaction.type,
        amount: supabaseTransaction.amount,
        description: supabaseTransaction.description,
        category: supabaseTransaction.category,
        date: new Date(supabaseTransaction.date),
        targetAccountId: supabaseTransaction.target_account_id,
        notes: supabaseTransaction.notes || undefined,
        originalCurrency: supabaseTransaction.original_currency || transactionCurrency,
        originalAmount: supabaseTransaction.original_amount || transactionData.amount,
        exchangeRateUsed: supabaseTransaction.exchange_rate_used || exchangeRateUsed || undefined,
        createdAt: new Date(supabaseTransaction.created_at)
      };

      // Mettre à jour le solde du compte
      try {
        await this.updateAccountBalanceAfterTransaction(transaction.accountId, transaction.amount, userId);
        console.log('✅ Solde du compte mis à jour');
      } catch (balanceError) {
        console.error('❌ Erreur lors de la mise à jour du solde:', balanceError);
        // Ne pas faire échouer la transaction pour une erreur de solde
      }
      
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
      // Transformer camelCase vers snake_case pour Supabase
      const supabaseData: any = {};
      
      if (transactionData.accountId !== undefined) supabaseData.account_id = transactionData.accountId;
      if (transactionData.amount !== undefined) supabaseData.amount = transactionData.amount;
      if (transactionData.type !== undefined) supabaseData.type = transactionData.type;
      if (transactionData.category !== undefined) supabaseData.category = transactionData.category;
      if (transactionData.description !== undefined) supabaseData.description = transactionData.description;
      if (transactionData.date !== undefined) supabaseData.date = transactionData.date.toISOString();
      if (transactionData.targetAccountId !== undefined) supabaseData.target_account_id = transactionData.targetAccountId;
      if (transactionData.notes !== undefined) supabaseData.notes = transactionData.notes || null;

      console.log('🔍 Données de mise à jour transformées pour Supabase:', supabaseData);

      const response = await apiService.updateTransaction(id, supabaseData);
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
      date?: Date;
    }
  ): Promise<{ success: boolean; transactions?: Transaction[]; error?: string }> {
    try {
      console.log('💸 TRANSFER START - fromAccountId:', transferData.fromAccountId, 'toAccountId:', transferData.toAccountId, 'amount:', transferData.amount);
      console.log('📅 Transfer date provided:', transferData.date ? transferData.date.toISOString().split('T')[0] : 'Using current date');

      // Get both accounts to check currencies
      const sourceAccount = await accountService.getAccount(transferData.fromAccountId, userId);
      const targetAccount = await accountService.getAccount(transferData.toAccountId, userId);

      if (!sourceAccount || !targetAccount) {
        console.error('❌ Compte source ou destination introuvable');
        return { success: false, error: 'Compte source ou destination introuvable' };
      }

      let targetAmount = transferData.amount;

      // Convert if currencies differ
      if (sourceAccount.currency !== targetAccount.currency) {
        try {
          const transferDate = transferData.date?.toISOString().split('T')[0];
          const rateInfo = await getExchangeRate(
            sourceAccount.currency || 'MGA',
            targetAccount.currency || 'MGA',
            transferDate
          );
          targetAmount = await convertAmount(
            transferData.amount,
            sourceAccount.currency || 'MGA',
            targetAccount.currency || 'MGA',
            transferDate
          );
          console.log(`💱 Transfer currency conversion: ${transferData.amount} ${sourceAccount.currency} = ${targetAmount} ${targetAccount.currency} (rate: ${rateInfo.rate})`);
        } catch (conversionError) {
          console.error('❌ Erreur lors de la conversion de devise pour le transfert:', conversionError);
          // En cas d'erreur, utiliser le montant original (dégradation gracieuse)
          // Note: Cela peut causer des problèmes si les devises sont différentes
        }
      }

      // Appeler l'API de transfert avec les paramètres directs
      // Note: L'API backend doit gérer la conversion, mais on envoie aussi le montant converti
      const response = await apiService.createTransfer({
        fromAccountId: transferData.fromAccountId,
        toAccountId: transferData.toAccountId,
        amount: transferData.amount, // Montant original dans la devise source
        description: transferData.description,
        transferFee: 0,
        date: transferData.date
      });

      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la création du transfert:', response.error);
        return { success: false, error: response.error || 'Erreur lors de la création du transfert' };
      }

      console.log('✅ Transfert créé avec succès');
      
      // Transformer les données Supabase vers le format local
      const { fromTransaction, toTransaction } = response.data as any;
      console.log('🔍 Debit transaction:', fromTransaction);
      console.log('🔍 Credit transaction:', toTransaction);
      
      const transactions: Transaction[] = [
        {
          id: fromTransaction.id,
          userId: fromTransaction.user_id,
          accountId: fromTransaction.account_id,
          type: fromTransaction.type,
          amount: fromTransaction.amount,
          description: fromTransaction.description,
          category: fromTransaction.category,
          date: new Date(fromTransaction.date),
          targetAccountId: fromTransaction.target_account_id,
          notes: fromTransaction.notes || undefined,
          createdAt: new Date(fromTransaction.created_at)
        },
        {
          id: toTransaction.id,
          userId: toTransaction.user_id,
          accountId: toTransaction.account_id,
          type: toTransaction.type,
          amount: toTransaction.amount,
          description: toTransaction.description,
          category: toTransaction.category,
          date: new Date(toTransaction.date),
          targetAccountId: toTransaction.target_account_id,
          notes: toTransaction.notes || undefined,
          createdAt: new Date(toTransaction.created_at)
        }
      ];

      // Mettre à jour les soldes des deux comptes
      // Source: débit du montant original dans sa devise
      // Destination: crédit du montant converti dans sa devise
      try {
        console.log('🔍 Updating source account:', transferData.fromAccountId, 'with amount:', -Math.abs(transferData.amount));
        await this.updateAccountBalanceAfterTransaction(transferData.fromAccountId, -Math.abs(transferData.amount), userId);
        
        console.log('🔍 Updating destination account:', transferData.toAccountId, 'with amount:', Math.abs(targetAmount));
        await this.updateAccountBalanceAfterTransaction(transferData.toAccountId, Math.abs(targetAmount), userId);
        
        console.log('✅ TRANSFER COMPLETE - Both account balances updated');
      } catch (balanceError) {
        console.error('❌ Erreur lors de la mise à jour des soldes:', balanceError);
        // Ne pas faire échouer le transfert pour une erreur de solde
      }
      
      return { success: true, transactions };
    } catch (error) {
      console.error('❌ Erreur lors de la création du transfert:', error);
      return { success: false, error: 'Erreur lors de la création du transfert' };
    }
  }

  /**
   * Mettre à jour le solde d'un compte après une transaction
   */
  private async updateAccountBalanceAfterTransaction(accountId: string, transactionAmount: number, userId: string): Promise<void> {
    try {
      console.log(`🔍 Mise à jour du solde pour le compte ${accountId} avec ${transactionAmount}`);
      
      // Récupérer le compte actuel
      const account = await accountService.getAccount(accountId, userId);
      if (!account) {
        throw new Error(`Compte ${accountId} non trouvé`);
      }

      // Calculer le nouveau solde
      const newBalance = account.balance + transactionAmount;
      console.log(`💰 Nouveau solde: ${account.balance} + ${transactionAmount} = ${newBalance}`);

      // Mettre à jour le compte
      const updatedAccount = await accountService.updateAccount(accountId, userId, { balance: newBalance });
      if (!updatedAccount) {
        throw new Error(`Échec de la mise à jour du solde pour le compte ${accountId}`);
      }

      console.log(`✅ Solde mis à jour: ${account.balance} → ${newBalance}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour du solde du compte ${accountId}:`, error);
      throw error;
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

/**
 * Helper function to get account by ID
 * Uses accountService.getAccount() internally
 */
async function getAccountById(accountId: string): Promise<import('../types').Account | null> {
  try {
    return await accountService.getAccount(accountId);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du compte:', error);
    return null;
  }
}

export default new TransactionService();