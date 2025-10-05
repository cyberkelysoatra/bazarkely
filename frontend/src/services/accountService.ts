/**
 * Service de comptes pour BazarKELY avec Supabase
 * Utilise Supabase pour la gestion des comptes
 */

import type { Account } from '../types';
import type { Account as SupabaseAccount, AccountInsert, AccountUpdate } from '../types/supabase';
import apiService from './apiService';

class AccountService {
  /**
   * Récupérer tous les comptes
   */
  async getAccounts(): Promise<Account[]> {
    try {
      console.log('🔍 Fetching accounts from Supabase...');
      const response = await apiService.getAccounts();
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la récupération des comptes:', response.error);
        return [];
      }
      const accounts = (response.data as Account[]) || [];
      console.log('✅ Accounts fetched from Supabase:', accounts.length);
      return accounts;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des comptes:', error);
      return [];
    }
  }

  async getUserAccounts(_userId: string): Promise<Account[]> {
    return this.getAccounts();
  }

  /**
   * Récupérer un compte par ID
   */
  async getAccount(id: string, _userId?: string): Promise<Account | null> {
    try {
      // Pour l'instant, on récupère tous les comptes et on filtre
      const accounts = await this.getAccounts();
      return accounts.find(account => account.id === id) || null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du compte:', error);
      return null;
    }
  }

  /**
   * Créer un nouveau compte
   */
  async createAccount(userId: string, accountData: Omit<Account, 'id' | 'createdAt' | 'userId'>): Promise<Account | null> {
    try {
      // Convertir les données vers le format Supabase
      const supabaseData: AccountInsert = {
        name: accountData.name,
        type: accountData.type,
        balance: accountData.balance,
        currency: accountData.currency,
        is_default: accountData.isDefault,
        is_active: accountData.isActive ?? true
      };

      const response = await apiService.createAccount(supabaseData);
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la création du compte:', response.error);
        return null;
      }

      console.log('✅ Compte créé avec succès');
      
      // Convertir la réponse Supabase vers le format local
      const supabaseAccount = response.data as SupabaseAccount;
      const account: Account = {
        id: supabaseAccount.id,
        userId: supabaseAccount.user_id,
        name: supabaseAccount.name,
        type: supabaseAccount.type,
        balance: supabaseAccount.balance,
        currency: supabaseAccount.currency,
        isDefault: supabaseAccount.is_default,
        isActive: supabaseAccount.is_active,
        createdAt: new Date(supabaseAccount.created_at)
      };
      
      return account;
    } catch (error) {
      console.error('❌ Erreur lors de la création du compte:', error);
      return null;
    }
  }

  /**
   * Mettre à jour un compte
   */
  async updateAccount(id: string, _userId: string, accountData: Partial<Omit<Account, 'id' | 'createdAt' | 'userId'>>): Promise<Account | null> {
    try {
      // Convertir les données vers le format Supabase
      const supabaseData: AccountUpdate = {};
      if (accountData.name !== undefined) supabaseData.name = accountData.name;
      if (accountData.type !== undefined) supabaseData.type = accountData.type;
      if (accountData.balance !== undefined) supabaseData.balance = accountData.balance;
      if (accountData.currency !== undefined) supabaseData.currency = accountData.currency;
      if (accountData.isDefault !== undefined) supabaseData.is_default = accountData.isDefault;
      if (accountData.isActive !== undefined) supabaseData.is_active = accountData.isActive;

      const response = await apiService.updateAccount(id, supabaseData);
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la mise à jour du compte:', response.error);
        return null;
      }

      console.log('✅ Compte mis à jour avec succès');
      
      // Convertir la réponse Supabase vers le format local
      const supabaseAccount = response.data as SupabaseAccount;
      const account: Account = {
        id: supabaseAccount.id,
        userId: supabaseAccount.user_id,
        name: supabaseAccount.name,
        type: supabaseAccount.type,
        balance: supabaseAccount.balance,
        currency: supabaseAccount.currency,
        isDefault: supabaseAccount.is_default,
        isActive: supabaseAccount.is_active,
        createdAt: new Date(supabaseAccount.created_at)
      };
      
      return account;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du compte:', error);
      return null;
    }
  }

  /**
   * Supprimer un compte
   */
  async deleteAccount(id: string, _userId?: string): Promise<boolean> {
    try {
      const response = await apiService.deleteAccount(id);
      if (!response.success || response.error) {
        console.error('❌ Erreur lors de la suppression du compte:', response.error);
        return false;
      }

      console.log('✅ Compte supprimé avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression du compte:', error);
      return false;
    }
  }

  /**
   * Définir un compte comme par défaut
   */
  async setDefaultAccount(accountId: string, userId?: string): Promise<boolean> {
    try {
      // D'abord, retirer le statut par défaut de tous les comptes
      const accounts = await this.getAccounts();
      for (const account of accounts) {
        if (account.isDefault) {
          await this.updateAccount(account.id, userId || '', { isDefault: false });
        }
      }

      // Ensuite, définir le compte sélectionné comme par défaut
      const success = await this.updateAccount(accountId, userId || '', { isDefault: true });
      
      if (success) {
        console.log('✅ Compte défini comme par défaut');
        return true;
      }
      
      return !!success;
    } catch (error) {
      console.error('❌ Erreur lors de la définition du compte par défaut:', error);
      return false;
    }
  }

  /**
   * Obtenir le compte par défaut
   */
  async getDefaultAccount(): Promise<Account | null> {
    try {
      const accounts = await this.getAccounts();
      return accounts.find(account => account.isDefault) || null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du compte par défaut:', error);
      return null;
    }
  }

  /**
   * Obtenir les comptes par type
   */
  async getAccountsByType(type: string): Promise<Account[]> {
    try {
      const accounts = await this.getAccounts();
      return accounts.filter(account => account.type === type);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des comptes par type:', error);
      return [];
    }
  }

  /**
   * Calculer le solde total
   */
  async getTotalBalance(): Promise<number> {
    try {
      const accounts = await this.getAccounts();
      return accounts.reduce((total, account) => total + account.balance, 0);
    } catch (error) {
      console.error('❌ Erreur lors du calcul du solde total:', error);
      return 0;
    }
  }

  /**
   * Initialiser et nettoyer les comptes
   */
  async initializeAndCleanup(): Promise<void> {
    try {
      console.log('🔍 Initialisation des comptes...');
      
      // Vérifier s'il y a un compte Espèces par défaut
      const especesAccounts = await this.getAccountsByType('especes');
      
      if (especesAccounts.length === 0) {
        // Créer un compte Espèces par défaut
        await this.createAccount('', {
          name: 'Espèces',
          type: 'especes',
          balance: 0,
          isDefault: true,
          currency: 'MGA' as const
        });
        console.log('✅ Compte Espèces par défaut créé');
      } else if (!especesAccounts.some(acc => acc.isDefault)) {
        // S'assurer qu'un compte Espèces est marqué comme par défaut
        await this.setDefaultAccount(especesAccounts[0].id);
        console.log('✅ Compte Espèces marqué comme par défaut');
      } else {
        console.log('ℹ️ Compte Espèces par défaut déjà existant');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des comptes:', error);
    }
  }
}

export default new AccountService();