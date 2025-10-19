/**
 * Leaderboard Service for BazarKELY
 * Fetches ranked user data from Supabase with caching and error handling
 * Refactored to use Supabase client directly instead of REST API calls
 */

// IMPORTS section
import { supabase } from '../lib/supabase';

// INTERFACES section - All existing interfaces preserved for backward compatibility
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

// CLASS DEFINITION - LeaderboardService class with Supabase integration
/**
 * Leaderboard Service Class
 * Handles Supabase communication, caching, and error management
 */
class LeaderboardService {
  // CONSTRUCTOR - Cache initialization and configuration
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private cache = new Map<string, CacheEntry<any>>();

  // PUBLIC METHODS - getLeaderboard using Supabase queries
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
      // Calculate pagination offset
      const offset = (validatedPage - 1) * validatedLimit;
      
      // Build Supabase query with sorting by experience_points (totalScore)
      let query = supabase
        .from('users')
        .select('id, username, experience_points, certification_level, profile_picture_url, last_login_at, created_at')
        .order('experience_points', { ascending: false })
        .range(offset, offset + validatedLimit - 1);

      // Apply level filter if provided
      if (levelFilter && levelFilter >= 1 && levelFilter <= 5) {
        query = query.eq('certification_level', levelFilter);
      }

      // Execute query
      const { data: users, error, count } = await query;

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }

      // Transform data to match LeaderboardEntry interface
      const leaderboardEntries: LeaderboardEntry[] = users?.map((user: any, index) => ({
        rank: offset + index + 1,
        pseudonym: this.generatePseudonym(user.id),
        totalScore: user.experience_points || 0,
        currentLevel: user.certification_level || 1,
        badgesCount: 0, // Placeholder - would need separate query for actual badges
        certificationsCount: user.certification_level || 0,
        lastActivity: user.last_login_at || user.created_at || new Date().toISOString()
      })) || [];

      // Calculate total pages
      const totalUsers = count || 0;
      const totalPages = Math.ceil(totalUsers / validatedLimit);

      // Create response matching original interface
      const response: LeaderboardResponse = {
        success: true,
        data: {
          users: leaderboardEntries,
          pagination: {
            currentPage: validatedPage,
            totalPages,
            totalUsers,
            hasNextPage: validatedPage < totalPages,
            hasPreviousPage: validatedPage > 1,
            limit: validatedLimit
          }
        },
        timestamp: new Date().toISOString()
      };

      // Cache the response
      this.setCache(cacheKey, response);

      return response;
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      throw new Error(`Failed to fetch leaderboard: ${this.getErrorMessage(error)}`);
    }
  }

  // PUBLIC METHODS - getUserRank using Supabase count queries
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
      // Get user data
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, username, experience_points, certification_level, profile_picture_url, last_login_at, created_at')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new Error(`User not found: ${userError.message}`);
      }

      if (!user) {
        throw new Error('User not found');
      }

      // Count users with higher experience points to determine rank
      const { count: rank, error: rankError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('experience_points', (user as any).experience_points || 0);

      if (rankError) {
        throw new Error(`Rank calculation error: ${rankError.message}`);
      }

      // Get total user count for percentile calculation
      const { count: totalUsers, error: totalError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        throw new Error(`Total users count error: ${totalError.message}`);
      }

      // Calculate percentile
      const userRank = (rank || 0) + 1;
      const percentile = totalUsers ? ((totalUsers - userRank + 1) / totalUsers) * 100 : 0;

      // Create response matching original interface
      const response: UserRankResponse = {
        success: true,
        data: {
          userId: (user as any).id,
          rank: userRank,
          pseudonym: this.generatePseudonym((user as any).id),
          totalScore: (user as any).experience_points || 0,
          currentLevel: (user as any).certification_level || 1,
          badgesCount: 0, // Placeholder - would need separate query for actual badges
          certificationsCount: (user as any).certification_level || 0,
          percentile: Math.round(percentile * 100) / 100, // Round to 2 decimal places
          lastActivity: (user as any).last_login_at || (user as any).created_at || new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      // Cache the response
      this.setCache(cacheKey, response);

      return response;
    } catch (error) {
      console.error('❌ Error fetching user rank:', error);
      throw new Error(`Failed to fetch user rank: ${this.getErrorMessage(error)}`);
    }
  }

  // PUBLIC METHODS - getLeaderboardStats using Supabase aggregate queries
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
      // Get total users count
      const { count: totalUsers, error: totalError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        throw new Error(`Total users count error: ${totalError.message}`);
      }

      // Get all users for statistics calculation
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('experience_points, certification_level');

      if (usersError) {
        throw new Error(`Users data error: ${usersError.message}`);
      }

      // Calculate statistics
      const scores = allUsers?.map((user: any) => user.experience_points || 0) || [];
      const levels = allUsers?.map((user: any) => user.certification_level || 1) || [];

      const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

      // Calculate level distribution
      const levelDistribution: Record<string, number> = {};
      levels.forEach(level => {
        const levelKey = level.toString();
        levelDistribution[levelKey] = (levelDistribution[levelKey] || 0) + 1;
      });

      // Create response matching original interface
      const response: LeaderboardStatsResponse = {
        success: true,
        data: {
          totalUsers: totalUsers || 0,
          averageScore: Math.round(averageScore * 100) / 100, // Round to 2 decimal places
          highestScore,
          levelDistribution,
          badgesDistribution: {
            average: 0, // Placeholder - would need separate query for actual badges
            max: 0
          },
          certificationsDistribution: {
            average: levels.length > 0 ? levels.reduce((sum, level) => sum + level, 0) / levels.length : 0,
            max: levels.length > 0 ? Math.max(...levels) : 0
          },
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      };

      // Cache the response
      this.setCache(cacheKey, response);

      return response;
    } catch (error) {
      console.error('❌ Error fetching leaderboard stats:', error);
      throw new Error(`Failed to fetch leaderboard stats: ${this.getErrorMessage(error)}`);
    }
  }

  // HELPER METHODS - Data transformation and utility functions
  /**
   * Generates a consistent pseudonym for a user based on their ID
   * @param userId - User ID to generate pseudonym for
   * @returns Generated pseudonym string
   */
  private generatePseudonym(userId: string): string {
    // Simple hash function for consistent pseudonym generation
    const adjectives = [
      'Économe', 'Malin', 'Astucieux', 'Sage', 'Prudent', 'Habile',
      'Intelligent', 'Rusé', 'Financier', 'Budget', 'Épargnant', 'Investisseur'
    ];
    const nouns = [
      'Astucieux', 'Malin', 'Sage', 'Prudent', 'Habile', 'Intelligent',
      'Rusé', 'Financier', 'Budget', 'Épargnant', 'Investisseur', 'Expert'
    ];
    
    // Create simple hash from userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use hash to select adjective and noun
    const adjIndex = Math.abs(hash) % adjectives.length;
    const nounIndex = Math.abs(hash >> 8) % nouns.length;
    
    return adjectives[adjIndex] + nouns[nounIndex];
  }

  // CACHE METHODS - Preserved cache management system
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
