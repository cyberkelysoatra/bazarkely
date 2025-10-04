import syncService from '../services/syncService';
import { useAppStore } from '../stores/appStore';

// Helper pour les opérations de synchronisation
export const syncHelpers = {
  // Ajouter une transaction avec synchronisation
  async addTransaction(transactionData: any): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    // Ajouter à la queue de synchronisation
    await syncService.queueOperation(
      'CREATE',
      'transactions',
      transactionData,
      user.id
    );
  },

  // Mettre à jour une transaction avec synchronisation
  async updateTransaction(transactionId: string, transactionData: any): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'UPDATE',
      'transactions',
      { id: transactionId, ...transactionData },
      user.id
    );
  },

  // Supprimer une transaction avec synchronisation
  async deleteTransaction(transactionId: string): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'DELETE',
      'transactions',
      { id: transactionId },
      user.id
    );
  },

  // Ajouter un compte avec synchronisation
  async addAccount(accountData: any): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'CREATE',
      'accounts',
      accountData,
      user.id
    );
  },

  // Mettre à jour un compte avec synchronisation
  async updateAccount(accountId: string, accountData: any): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'UPDATE',
      'accounts',
      { id: accountId, ...accountData },
      user.id
    );
  },

  // Supprimer un compte avec synchronisation
  async deleteAccount(accountId: string): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'DELETE',
      'accounts',
      { id: accountId },
      user.id
    );
  },

  // Ajouter un budget avec synchronisation
  async addBudget(budgetData: any): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'CREATE',
      'budgets',
      budgetData,
      user.id
    );
  },

  // Mettre à jour un budget avec synchronisation
  async updateBudget(budgetId: string, budgetData: any): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'UPDATE',
      'budgets',
      { id: budgetId, ...budgetData },
      user.id
    );
  },

  // Supprimer un budget avec synchronisation
  async deleteBudget(budgetId: string): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'DELETE',
      'budgets',
      { id: budgetId },
      user.id
    );
  },

  // Ajouter un objectif avec synchronisation
  async addGoal(goalData: any): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'CREATE',
      'goals',
      goalData,
      user.id
    );
  },

  // Mettre à jour un objectif avec synchronisation
  async updateGoal(goalId: string, goalData: any): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'UPDATE',
      'goals',
      { id: goalId, ...goalData },
      user.id
    );
  },

  // Supprimer un objectif avec synchronisation
  async deleteGoal(goalId: string): Promise<void> {
    const { user } = useAppStore.getState();
    if (!user) throw new Error('Utilisateur non connecté');

    await syncService.queueOperation(
      'DELETE',
      'goals',
      { id: goalId },
      user.id
    );
  }
};

export default syncHelpers;



