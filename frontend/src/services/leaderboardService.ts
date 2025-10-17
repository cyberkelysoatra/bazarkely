/**
 * Leaderboard Service for BazarKELY
 * Fetches ranked user data from backend API with caching and error handling
 */

import { supabase } from '../lib/supabase';

/**
 * Interface for individual leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  pseudonym: string;
  totalScore: number;
  currentLevel: number;
  badgesCount: number;
  certificationsCount: number;
  lastActivity: string;
}

/**
 * Interface for pagination metadata
 */
export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  limit: number;
}

/**
 * Interface for leaderboard API response
 */
export interface LeaderboardResponse {
  success: boolean;
  data: {
    users: LeaderboardEntry[];
    pagination: PaginationMetadata;
  };
  timestamp: string;
}

/**
 * Interface for user rank response
 */
export interface UserRank {
  userId: string;
  rank: number;
  pseudonym: string;
  totalScore: number;
  currentLevel: number;
  badgesCount: number;
  certificationsCount: number;
  percentile: number;
  lastActivity: string;
}

/**
 * Interface for user rank API response
 */
export interface UserRankResponse {
  success: boolean;
  data: UserRank;
  timestamp: string;
}

/**
 * Interface for leaderboard statistics
 */
export interface LeaderboardStats {
  totalUsers: number;
  averageScore: number;
  highestScore: number;
  levelDistribution: Record<string, number>;
  badgesDistribution: {
    average: number;
    max: number;
  };
  certificationsDistribution: {
    average: number;
    max: number;
  };
  lastUpdated: string;
}

/**
 * Interface for stats API response
 */
export interface LeaderboardStatsResponse {
  success: boolean;
  data: LeaderboardStats;
  timestamp: string;
}

/**
 * Interface for cache entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Leaderboard Service Class
 * Handles API communication, caching, and error management
 */
class LeaderboardService {
  private readonly API_BASE_URL = '/api/leaderboard';
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second base delay

  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Gets leaderboard data with pagination and filtering
   * @param page - Page number (default: 1)
   * @param limit - Users per page (default: 50, max: 100)
   * @param levelFilter - Optional level filter (1-5)
   * @returns Promise with leaderboard data
   */
  async getLeaderboard(
    page: number = 1,
    limit: number = 50,
    levelFilter?: number
  ): Promise<LeaderboardResponse> {
    // Validate parameters
    const validatedPage = Math.max(1, page);
    const validatedLimit = Math.min(100, Math.max(1, limit));
    
    // Create cache key
    const cacheKey = `leaderboard:${validatedPage}:${validatedLimit}:${levelFilter || 'all'}`;
    
    // Check cache first
    const cachedData = this.getFromCache<LeaderboardResponse>(cacheKey);
    if (cachedData) {
       return cachedData;
    }

    try {
      // Build query parameters
      const params = new URLSearchParams({
        page: validatedPage.toString(),
        limit: validatedLimit.toString(),
      });
      
      if (levelFilter && levelFilter >= 1 && levelFilter <= 5) {
        params.append('levelFilter', levelFilter.toString());
      }

      // Make API request with retry logic
      const response = await this.makeRequestWithRetry<LeaderboardResponse>(
        `${this.API_BASE_URL}?${params.toString()}`
      );

      // Cache the response
      this.setCache(cacheKey, response);

      return response;
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      throw new Error(`Failed to fetch leaderboard: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Gets specific user's rank and statistics
   * @param userId - User identifier
   * @returns Promise with user rank data
   */
  async getUserRank(userId: string): Promise<UserRankResponse> {
    // Validate userId
    if (!userId || typeof userId !== 'string') {
      throw new Error('Valid userId is required');
    }

    // Create cache key
    const cacheKey = `userRank:${userId}`;
    
    // Check cache first
    const cachedData = this.getFromCache<UserRankResponse>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      // Make API request with retry logic
      const response = await this.makeRequestWithRetry<UserRankResponse>(
        `${this.API_BASE_URL}/user/${encodeURIComponent(userId)}`
      );

      // Cache the response
      this.setCache(cacheKey, response);

      return response;
    } catch (error) {
      console.error('❌ Error fetching user rank:', error);
      throw new Error(`Failed to fetch user rank: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Gets global leaderboard statistics
   * @returns Promise with leaderboard statistics
   */
  async getLeaderboardStats(): Promise<LeaderboardStatsResponse> {
    // Create cache key
    const cacheKey = 'leaderboard:stats';
    
    // Check cache first
    const cachedData = this.getFromCache<LeaderboardStatsResponse>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    try {
      // Make API request with retry logic
      const response = await this.makeRequestWithRetry<LeaderboardStatsResponse>(
        `${this.API_BASE_URL}/stats`
      );

      // Cache the response
      this.setCache(cacheKey, response);

      return response;
    } catch (error) {
      console.error('❌ Error fetching leaderboard stats:', error);
      throw new Error(`Failed to fetch leaderboard stats: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Makes HTTP request with exponential backoff retry logic
   * @param url - Request URL
   * @param retryCount - Current retry attempt
   * @returns Promise with response data
   */
  private async makeRequestWithRetry<T>(
    url: string,
    retryCount: number = 0
  ): Promise<T> {
    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      // Make the request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: T = await response.json();
      return data;
    } catch (error) {
      // Check if we should retry
      if (retryCount < this.MAX_RETRIES && this.isRetryableError(error)) {
        const delay = this.RETRY_DELAY * Math.pow(2, retryCount);
        console.warn(`⚠️ Request failed, retrying in ${delay}ms... (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        
        await this.delay(delay);
        return this.makeRequestWithRetry<T>(url, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Checks if error is retryable
   * @param error - Error object
   * @returns True if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, and 5xx server errors are retryable
    if (error.name === 'AbortError' || error.name === 'TypeError') {
      return true; // Network/timeout errors
    }
    
    if (error.message && error.message.includes('HTTP 5')) {
      return true; // Server errors
    }
    
    return false;
  }

  /**
   * Delays execution for specified milliseconds
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets data from cache if valid
   * @param key - Cache key
   * @returns Cached data or null if expired/missing
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired, remove it
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Sets data in cache
   * @param key - Cache key
   * @param data - Data to cache
   */
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    });
  }

  /**
   * Extracts error message from error object
   * @param error - Error object
   * @returns Error message string
   */
  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    return 'An unexpected error occurred';
  }

  /**
   * Clears all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   * @returns Cache statistics object
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
export default leaderboardService;
