/**
 * Leaderboard Component for BazarKELY
 * Displays ranked users with pagination, filtering, and special styling
 * Integrates with leaderboardService and certificationStore
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, 
  User, 
  Star, 
  Award, 
  Shield, 
  Medal, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Loader2,
  Users,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import leaderboardService from '../../services/leaderboardService';
import { useCertificationStore } from '../../store/certificationStore';
import type { LeaderboardEntry, LeaderboardResponse, UserRank } from '../../services/leaderboardService';

/**
 * Interface for component state
 */
interface LeaderboardState {
  users: LeaderboardEntry[];
  currentUserRank: UserRank | null;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  levelFilter: number | null;
  isLoading: boolean;
  isLoadingUserRank: boolean;
  error: string | null;
}

/**
 * Interface for level filter option
 */
interface LevelFilterOption {
  value: number | null;
  label: string;
}

/**
 * Leaderboard Component
 * Displays ranked users with pagination and filtering capabilities
 */
const LeaderboardComponent: React.FC = () => {
  // Get current user data from store
  const { currentLevel } = useCertificationStore();

  // Component state
  const [state, setState] = useState<LeaderboardState>({
    users: [],
    currentUserRank: null,
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    levelFilter: null,
    isLoading: false,
    isLoadingUserRank: false,
    error: null,
  });

  // Level filter options
  const levelFilterOptions: LevelFilterOption[] = [
    { value: null, label: 'Tous les Niveaux' },
    { value: 1, label: 'Niveau 1 - Débutant' },
    { value: 2, label: 'Niveau 2 - Intermédiaire' },
    { value: 3, label: 'Niveau 3 - Avancé' },
    { value: 4, label: 'Niveau 4 - Expert' },
    { value: 5, label: 'Niveau 5 - Maître' },
  ];

  /**
   * Fetches leaderboard data
   */
  const fetchLeaderboard = useCallback(async (page: number, levelFilter: number | null) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await leaderboardService.getLeaderboard(page, 50, levelFilter);
      
      setState(prev => ({
        ...prev,
        users: response.data.users,
        currentPage: response.data.pagination.currentPage,
        totalPages: response.data.pagination.totalPages,
        totalUsers: response.data.pagination.totalUsers,
        isLoading: false,
      }));
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Erreur lors du chargement du classement',
      }));
      toast.error('Impossible de charger le classement');
    }
  }, []);

  /**
   * Fetches current user's rank
   */
  const fetchCurrentUserRank = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoadingUserRank: true }));

      // Get current user ID from Supabase session
      const { data: { session } } = await import('../../lib/supabase').then(m => m.supabase.auth.getSession());
      
      if (session?.user?.id) {
        const response = await leaderboardService.getUserRank(session.user.id);
        setState(prev => ({
          ...prev,
          currentUserRank: response.data,
          isLoadingUserRank: false,
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching user rank:', error);
      setState(prev => ({ ...prev, isLoadingUserRank: false }));
    }
  }, []);

  /**
   * Handles level filter change
   */
  const handleLevelFilterChange = (level: number | null) => {
    setState(prev => ({ ...prev, levelFilter: level, currentPage: 1 }));
  };

  /**
   * Handles page change
   */
  const handlePageChange = (page: number) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  /**
   * Gets rank badge color and icon
   */
  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return { color: 'text-yellow-500', icon: '🥇', bgColor: 'bg-yellow-50 border-yellow-200' };
    } else if (rank === 2) {
      return { color: 'text-gray-400', icon: '🥈', bgColor: 'bg-gray-50 border-gray-200' };
    } else if (rank === 3) {
      return { color: 'text-orange-600', icon: '🥉', bgColor: 'bg-orange-50 border-orange-200' };
    } else {
      return { color: 'text-gray-600', icon: '#', bgColor: 'bg-gray-50 border-gray-200' };
    }
  };

  /**
   * Checks if user is current user (for highlighting)
   */
  const isCurrentUser = (pseudonym: string) => {
    return state.currentUserRank?.pseudonym === pseudonym;
  };

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchLeaderboard(state.currentPage, state.levelFilter);
  }, [fetchLeaderboard, state.currentPage, state.levelFilter]);

  // Fetch current user rank on mount
  useEffect(() => {
    fetchCurrentUserRank();
  }, [fetchCurrentUserRank]);

  // Set default filter to current user's level
  useEffect(() => {
    if (currentLevel && state.levelFilter === null) {
      setState(prev => ({ ...prev, levelFilter: currentLevel }));
    }
  }, [currentLevel, state.levelFilter]);

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <Trophy className="w-8 h-8 text-yellow-600 mr-3" />
          Classement des Utilisateurs
        </h2>
        <p className="text-gray-600">
          Découvrez les meilleurs utilisateurs de BazarKELY
        </p>
      </div>

      {/* Current User Rank Card */}
      {state.currentUserRank && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Votre Classement</h3>
                <p className="text-sm text-blue-700">
                  Rang #{state.currentUserRank.rank} • {state.currentUserRank.pseudonym}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {state.currentUserRank.totalScore}
              </div>
              <div className="text-sm text-blue-700">points</div>
            </div>
          </div>
        </div>
      )}

      {/* Level Filter */}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={state.levelFilter || ''}
            onChange={(e) => handleLevelFilterChange(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {levelFilterOptions.map((option) => (
              <option key={option.value || 'all'} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {state.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-24 h-4 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="w-32 h-3 bg-gray-200 rounded"></div>
                <div className="w-24 h-3 bg-gray-200 rounded"></div>
                <div className="w-20 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-700 mb-2">
            Erreur de Chargement
          </h3>
          <p className="text-red-600 mb-4">{state.error}</p>
          <button
            onClick={() => fetchLeaderboard(state.currentPage, state.levelFilter)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Empty State */}
      {!state.isLoading && !state.error && state.users.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Aucun Utilisateur Trouvé
          </h3>
          <p className="text-gray-600">
            Aucun utilisateur ne correspond aux critères de filtrage.
          </p>
        </div>
      )}

      {/* Leaderboard Grid */}
      {!state.isLoading && !state.error && state.users.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {state.users.map((user) => {
              const rankBadge = getRankBadge(user.rank);
              const isCurrent = isCurrentUser(user.pseudonym);
              
              return (
                <div
                  key={user.rank}
                  className={`
                    bg-white p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg
                    ${isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}
                    ${rankBadge.bgColor}
                  `}
                >
                  {/* Rank Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center space-x-2 ${rankBadge.color}`}>
                      <span className="text-2xl font-bold">
                        {user.rank <= 3 ? rankBadge.icon : user.rank}
                      </span>
                      <span className="text-sm font-semibold">
                        {user.rank <= 3 ? 'Médaille' : 'Rang'}
                      </span>
                    </div>
                    {isCurrent && (
                      <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        Vous
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="space-y-3">
                    {/* Pseudonym */}
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold text-gray-900 truncate">
                        {user.pseudonym}
                      </span>
                    </div>

                    {/* Total Score */}
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-600">
                        {user.totalScore} points
                      </span>
                    </div>

                    {/* Current Level */}
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-gray-600">
                        Niveau {user.currentLevel}
                      </span>
                    </div>

                    {/* Badges Count */}
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600">
                        {user.badgesCount} badges
                      </span>
                    </div>

                    {/* Certifications Count */}
                    <div className="flex items-center space-x-2">
                      <Medal className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600">
                        {user.certificationsCount} certificats
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(state.currentPage - 1)}
                disabled={state.currentPage === 1}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Précédent</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Page {state.currentPage} sur {state.totalPages}
              </span>
              <span className="text-sm text-gray-500">
                ({state.totalUsers} utilisateurs)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(state.currentPage + 1)}
                disabled={state.currentPage === state.totalPages}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Suivant</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LeaderboardComponent;
