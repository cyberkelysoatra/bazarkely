/**
 * Service de pagination optimisé pour les grandes datasets
 * Supporte 100+ utilisateurs concurrents avec virtual scrolling
 */

import { db } from '../lib/database';
import type { Transaction, Account, Budget, Goal } from '../types/index.js';

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  searchTerm?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  performance: {
    loadTime: number;
    memoryUsage: number;
    cacheHit: boolean;
  };
}

export interface VirtualScrollOptions {
  containerHeight: number;
  itemHeight: number;
  overscan?: number;
  threshold?: number;
}

export interface VirtualScrollResult<T> {
  items: T[];
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  visibleCount: number;
  scrollTop: number;
}

class PaginationService {
  private cache = new Map<string, { data: any[]; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;
  private readonly DEFAULT_PAGE_SIZE = 50;
  private readonly MAX_PAGE_SIZE = 200;

  /**
   * Pagination optimisée pour les transactions
   */
  async getTransactions(
    userId: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<Transaction>> {
    const startTime = performance.now();
    const cacheKey = `transactions_${userId}_${JSON.stringify(options)}`;
    
    // Vérifier le cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        performance: {
          loadTime: performance.now() - startTime,
          memoryUsage: this.getMemoryUsage(),
          cacheHit: true
        }
      };
    }

    try {
      const {
        page = 1,
        pageSize = this.DEFAULT_PAGE_SIZE,
        sortBy = 'date',
        sortOrder = 'desc',
        filters = {},
        searchTerm = ''
      } = options;

      // Validation des paramètres
      const validatedPageSize = Math.min(Math.max(pageSize, 1), this.MAX_PAGE_SIZE);
      const validatedPage = Math.max(page, 1);

      // Construire la requête
      let query = db.transactions.where('userId').equals(userId);

      // Appliquer les filtres
      if (filters.type) {
        query = query.and(transaction => transaction.type === filters.type);
      }
      if (filters.category) {
        query = query.and(transaction => transaction.category === filters.category);
      }
      if (filters.accountId) {
        query = query.and(transaction => transaction.accountId === filters.accountId);
      }
      if (filters.dateFrom) {
        query = query.and(transaction => transaction.date >= new Date(filters.dateFrom));
      }
      if (filters.dateTo) {
        query = query.and(transaction => transaction.date <= new Date(filters.dateTo));
      }
      if (filters.amountMin) {
        query = query.and(transaction => transaction.amount >= filters.amountMin);
      }
      if (filters.amountMax) {
        query = query.and(transaction => transaction.amount <= filters.amountMax);
      }

      // Recherche textuelle
      if (searchTerm) {
        query = query.and(transaction => 
          transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Compter le total
      const total = await query.count();

      // Calculer l'offset
      const offset = (validatedPage - 1) * validatedPageSize;

      // Récupérer les données avec tri
      let data = await query
        .offset(offset)
        .limit(validatedPageSize)
        .toArray();

      // Appliquer le tri côté client (Dexie ne supporte pas tous les tris complexes)
      if (sortBy && sortOrder) {
        data = this.sortData(data, sortBy, sortOrder);
      }

      const totalPages = Math.ceil(total / validatedPageSize);
      const hasMore = validatedPage < totalPages;

      const result: PaginatedResult<Transaction> = {
        data,
        total,
        hasMore,
        currentPage: validatedPage,
        totalPages,
        pageSize: validatedPageSize,
        performance: {
          loadTime: performance.now() - startTime,
          memoryUsage: this.getMemoryUsage(),
          cacheHit: false
        }
      };

      // Mettre en cache
      this.setCache(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Erreur lors de la pagination des transactions:', error);
      throw new Error('Impossible de charger les transactions');
    }
  }

  /**
   * Pagination optimisée pour les comptes
   */
  async getAccounts(
    userId: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<Account>> {
    const startTime = performance.now();
    const cacheKey = `accounts_${userId}_${JSON.stringify(options)}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        performance: {
          loadTime: performance.now() - startTime,
          memoryUsage: this.getMemoryUsage(),
          cacheHit: true
        }
      };
    }

    try {
      const {
        page = 1,
        pageSize = this.DEFAULT_PAGE_SIZE,
        sortBy = 'name',
        sortOrder = 'asc',
        filters = {},
        searchTerm = ''
      } = options;

      const validatedPageSize = Math.min(Math.max(pageSize, 1), this.MAX_PAGE_SIZE);
      const validatedPage = Math.max(page, 1);

      let query = db.accounts.where('userId').equals(userId);

      // Appliquer les filtres
      if (filters.type) {
        query = query.and(account => account.type === filters.type);
      }
      if (filters.currency) {
        query = query.and(account => account.currency === filters.currency);
      }

      // Recherche textuelle
      if (searchTerm) {
        query = query.and(account => 
          account.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      const total = await query.count();
      const offset = (validatedPage - 1) * validatedPageSize;

      let data = await query
        .offset(offset)
        .limit(validatedPageSize)
        .toArray();

      if (sortBy && sortOrder) {
        data = this.sortData(data, sortBy, sortOrder);
      }

      const totalPages = Math.ceil(total / validatedPageSize);
      const hasMore = validatedPage < totalPages;

      const result: PaginatedResult<Account> = {
        data,
        total,
        hasMore,
        currentPage: validatedPage,
        totalPages,
        pageSize: validatedPageSize,
        performance: {
          loadTime: performance.now() - startTime,
          memoryUsage: this.getMemoryUsage(),
          cacheHit: false
        }
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Erreur lors de la pagination des comptes:', error);
      throw new Error('Impossible de charger les comptes');
    }
  }

  /**
   * Pagination optimisée pour les budgets
   */
  async getBudgets(
    userId: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<Budget>> {
    const startTime = performance.now();
    const cacheKey = `budgets_${userId}_${JSON.stringify(options)}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        performance: {
          loadTime: performance.now() - startTime,
          memoryUsage: this.getMemoryUsage(),
          cacheHit: true
        }
      };
    }

    try {
      const {
        page = 1,
        pageSize = this.DEFAULT_PAGE_SIZE,
        sortBy = 'category',
        sortOrder = 'asc',
        filters = {},
        searchTerm = ''
      } = options;

      const validatedPageSize = Math.min(Math.max(pageSize, 1), this.MAX_PAGE_SIZE);
      const validatedPage = Math.max(page, 1);

      let query = db.budgets.where('userId').equals(userId);

      // Appliquer les filtres
      if (filters.category) {
        query = query.and(budget => budget.category === filters.category);
      }
      if (filters.year) {
        query = query.and(budget => budget.year === filters.year);
      }
      if (filters.month) {
        query = query.and(budget => budget.month === filters.month);
      }

      const total = await query.count();
      const offset = (validatedPage - 1) * validatedPageSize;

      let data = await query
        .offset(offset)
        .limit(validatedPageSize)
        .toArray();

      if (sortBy && sortOrder) {
        data = this.sortData(data, sortBy, sortOrder);
      }

      const totalPages = Math.ceil(total / validatedPageSize);
      const hasMore = validatedPage < totalPages;

      const result: PaginatedResult<Budget> = {
        data,
        total,
        hasMore,
        currentPage: validatedPage,
        totalPages,
        pageSize: validatedPageSize,
        performance: {
          loadTime: performance.now() - startTime,
          memoryUsage: this.getMemoryUsage(),
          cacheHit: false
        }
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Erreur lors de la pagination des budgets:', error);
      throw new Error('Impossible de charger les budgets');
    }
  }

  /**
   * Pagination optimisée pour les objectifs
   */
  async getGoals(
    userId: string,
    options: PaginationOptions
  ): Promise<PaginatedResult<Goal>> {
    const startTime = performance.now();
    const cacheKey = `goals_${userId}_${JSON.stringify(options)}`;
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        ...cached,
        performance: {
          loadTime: performance.now() - startTime,
          memoryUsage: this.getMemoryUsage(),
          cacheHit: true
        }
      };
    }

    try {
      const {
        page = 1,
        pageSize = this.DEFAULT_PAGE_SIZE,
        sortBy = 'deadline',
        sortOrder = 'asc',
        filters = {},
        searchTerm = ''
      } = options;

      const validatedPageSize = Math.min(Math.max(pageSize, 1), this.MAX_PAGE_SIZE);
      const validatedPage = Math.max(page, 1);

      let query = db.goals.where('userId').equals(userId);

      // Appliquer les filtres
      if (filters.priority) {
        query = query.and(goal => goal.priority === filters.priority);
      }
      if (filters.category) {
        query = query.and(goal => goal.category === filters.category);
      }

      // Recherche textuelle
      if (searchTerm) {
        query = query.and(goal => 
          goal.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      const total = await query.count();
      const offset = (validatedPage - 1) * validatedPageSize;

      let data = await query
        .offset(offset)
        .limit(validatedPageSize)
        .toArray();

      if (sortBy && sortOrder) {
        data = this.sortData(data, sortBy, sortOrder);
      }

      const totalPages = Math.ceil(total / validatedPageSize);
      const hasMore = validatedPage < totalPages;

      const result: PaginatedResult<Goal> = {
        data,
        total,
        hasMore,
        currentPage: validatedPage,
        totalPages,
        pageSize: validatedPageSize,
        performance: {
          loadTime: performance.now() - startTime,
          memoryUsage: this.getMemoryUsage(),
          cacheHit: false
        }
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Erreur lors de la pagination des objectifs:', error);
      throw new Error('Impossible de charger les objectifs');
    }
  }

  /**
   * Virtual scrolling pour les grandes listes
   */
  getVirtualScrollData<T>(
    allData: T[],
    scrollTop: number,
    options: VirtualScrollOptions
  ): VirtualScrollResult<T> {
    const {
      containerHeight,
      itemHeight,
      overscan = 5,
      threshold = 0.1
    } = options;

    const totalHeight = allData.length * itemHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      allData.length - 1,
      startIndex + visibleCount + overscan * 2
    );

    const items = allData.slice(startIndex, endIndex + 1);

    return {
      items,
      totalHeight,
      startIndex,
      endIndex,
      visibleCount,
      scrollTop
    };
  }

  /**
   * Tri des données
   */
  private sortData<T>(data: T[], sortBy: string, sortOrder: 'asc' | 'desc'): T[] {
    return data.sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Gestion du cache
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    // Nettoyer le cache si nécessaire
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
  }

  /**
   * Obtenir l'utilisation mémoire
   */
  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }

  /**
   * Nettoyer le cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Nettoyer le cache expiré
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0, // À implémenter si nécessaire
      memoryUsage: this.getMemoryUsage()
    };
  }
}

export const paginationService = new PaginationService();
export default paginationService;



















