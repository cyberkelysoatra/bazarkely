/**
 * Service API Statique BazarKELY PWA
 * Remplace complètement le service API backend par une version côté client
 * Compatible avec l'architecture existante
 */

// Import des types existants
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
  timestamp?: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  preferences: {
    theme: string;
    language: string;
    currency: string;
  };
  created_at: string;
  updated_at: string;
}

interface Account {
  id: string;
  userId: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Transaction {
  id: string;
  userId: string;
  accountId?: string;
  type: string;
  category?: string;
  amount: number;
  currency: string;
  description?: string;
  date: string;
  tags?: string[];
  location?: string;
  status: string;
}

interface Budget {
  id: string;
  userId: string;
  name: string;
  category: string;
  limit_amount: number;
  currentSpent: number;
  currency: string;
  period: string;
  isActive: boolean;
  createdAt: string;
}

interface Goal {
  id: string;
  userId: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate?: string;
  isActive: boolean;
  createdAt: string;
}

class StaticApiService {
  private api: any;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      // Attendre que l'API statique soit chargée
      while (!window.bazarkelyAPI || !window.bazarkelyAPI.db) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      this.api = window.bazarkelyAPI;
      this.isInitialized = true;
      console.log('✅ Service API statique initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation service API statique:', error);
    }
  }

  private async waitForInit() {
    while (!this.isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Méthode de requête générique pour maintenir la compatibilité
  async request(action: string, data: any = {}, method: string = 'GET'): Promise<ApiResponse> {
    await this.waitForInit();

    try {
      switch (action) {
        case 'health_check':
          return await this.api.healthCheck();

        case 'get_users':
          return await this.api.getUsers();

        case 'create_user':
          return await this.api.createUser(data);

        case 'login':
          return await this.api.login(data.username, data.password);

        case 'get_accounts':
          return await this.api.getAccounts(data.user_id || data.userId);

        case 'create_account':
          return await this.api.createAccount(data);

        case 'get_transactions':
          return await this.api.getTransactions(data.user_id || data.userId);

        case 'create_transaction':
          return await this.api.createTransaction(data);

        case 'get_budgets':
          return await this.api.getBudgets(data.user_id || data.userId);

        case 'create_budget':
          return await this.api.createBudget(data);

        case 'get_goals':
          return await this.api.getGoals(data.user_id || data.userId);

        case 'create_goal':
          return await this.api.createGoal(data);

        case 'sync_data':
          return await this.api.syncData(data.user_id || data.userId);

        default:
          return {
            success: false,
            error: {
              code: 'INVALID_ACTION',
              message: `Action non supportée: ${action}`
            }
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: error.message
        }
      };
    }
  }

  // Méthodes spécifiques pour maintenir la compatibilité
  async healthCheck(): Promise<ApiResponse> {
    return await this.request('health_check');
  }

  async getUsers(): Promise<ApiResponse<User[]>> {
    return await this.request('get_users');
  }

  async createUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    return await this.request('create_user', userData, 'POST');
  }

  async login(credentials: { username: string; password: string }): Promise<ApiResponse<{ user: User; accessToken: string; refreshToken: string; expiresIn: number }>> {
    return await this.request('login', credentials, 'POST');
  }

  async getAccounts(userId: string): Promise<ApiResponse<Account[]>> {
    return await this.request('get_accounts', { userId });
  }

  async createAccount(accountData: Partial<Account>): Promise<ApiResponse<Account>> {
    return await this.request('create_account', accountData, 'POST');
  }

  async getTransactions(userId: string): Promise<ApiResponse<Transaction[]>> {
    return await this.request('get_transactions', { userId });
  }

  async createTransaction(transactionData: Partial<Transaction>): Promise<ApiResponse<Transaction>> {
    return await this.request('create_transaction', transactionData, 'POST');
  }

  async getBudgets(userId: string): Promise<ApiResponse<Budget[]>> {
    return await this.request('get_budgets', { userId });
  }

  async createBudget(budgetData: Partial<Budget>): Promise<ApiResponse<Budget>> {
    return await this.request('create_budget', budgetData, 'POST');
  }

  async getGoals(userId: string): Promise<ApiResponse<Goal[]>> {
    return await this.request('get_goals', { userId });
  }

  async createGoal(goalData: Partial<Goal>): Promise<ApiResponse<Goal>> {
    return await this.request('create_goal', goalData, 'POST');
  }

  async syncData(userId: string): Promise<ApiResponse> {
    return await this.request('sync_data', { userId });
  }

  // Méthodes de configuration (pour compatibilité)
  getApiConfig() {
    return {
      currentEndpoint: 'static',
      environment: 'static',
      isStatic: true
    };
  }

  getCurrentEndpoint() {
    return 'static';
  }

  switchEndpoint(endpoint: string) {
    console.log('Mode statique: Changement d\'endpoint ignoré');
    return true;
  }

  useFallback() {
    console.log('Mode statique: Fallback non applicable');
    return true;
  }

  reset() {
    console.log('Mode statique: Reset non applicable');
    return true;
  }

  testConnection() {
    return Promise.resolve({
      success: true,
      message: 'Mode statique: Connexion toujours disponible'
    });
  }

  testAllEndpoints() {
    return Promise.resolve({
      success: true,
      message: 'Mode statique: Tous les endpoints sont locaux'
    });
  }

  switchToDevelopment() {
    console.log('Mode statique: Changement vers développement ignoré');
    return true;
  }

  switchToProduction() {
    console.log('Mode statique: Changement vers production ignoré');
    return true;
  }

  forceLocalhost() {
    console.log('Mode statique: Forçage localhost ignoré');
    return true;
  }
}

// Instance du service
const staticApiService = new StaticApiService();

// Export pour compatibilité
export default staticApiService;
export { StaticApiService };










