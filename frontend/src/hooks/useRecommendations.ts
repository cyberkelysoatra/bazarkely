/**
 * useRecommendations Hook - BazarKELY
 * Hook personnalisé pour intégrer les recommandations et défis avec l'état de l'application
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../stores/appStore';
import { 
  generateDailyRecommendations, 
  detectContextualTriggers,
  type Recommendation 
} from '../services/recommendationEngineService';
import { 
  acceptChallenge as acceptChallengeService,
  checkChallengeProgress,
  type ActiveChallenge 
} from '../services/challengeService';
import { db } from '../lib/database';
import type { Transaction, User } from '../types/index.js';

/**
 * Interface pour une recommandation avec feedback
 */
export interface RecommendationWithFeedback {
  readonly recommendation: Recommendation;
  readonly liked: boolean;
  readonly disliked: boolean;
  readonly dismissed: boolean;
  readonly timestamp: Date;
}

/**
 * Interface pour les statistiques des recommandations
 */
export interface RecommendationStats {
  readonly total_received: number;
  readonly total_liked: number;
  readonly total_disliked: number;
  readonly themes_distribution: Record<string, number>;
  readonly average_relevance_score: number;
}

/**
 * Interface de retour du hook useRecommendations
 */
export interface UseRecommendationsReturn {
  readonly recommendations: Recommendation[];
  readonly activeChallenges: ActiveChallenge[];
  readonly isLoading: boolean;
  readonly lastRefreshDate: Date | null;
  readonly likeRecommendation: (recommendationId: string) => void;
  readonly dislikeRecommendation: (recommendationId: string) => void;
  readonly dismissRecommendation: (recommendationId: string) => void;
  readonly acceptChallenge: (challengeId: string) => Promise<ActiveChallenge | null>;
  readonly updateChallengeProgress: () => Promise<void>;
  readonly completeChallenge: (challengeId: string) => Promise<void>;
  readonly refreshRecommendations: () => Promise<void>;
  readonly getRecommendationStats: () => RecommendationStats;
}

/**
 * Hook personnalisé pour gérer les recommandations et défis
 * @returns Objet avec les recommandations, défis et fonctions de gestion
 */
const useRecommendations = (): UseRecommendationsReturn => {
  const { user, setUser } = useAppStore();
  
  // États locaux
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<ActiveChallenge[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshDate, setLastRefreshDate] = useState<Date | null>(null);
  
  // Refs pour la gestion des timeouts et intervals
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const midnightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dailyIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Génère les recommandations quotidiennes et contextuelles
   */
  const generateRecommendations = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Charger les transactions récentes
      const recentTransactions = await db.transactions
        .where('userId')
        .equals(user.id)
        .toArray();
      
      // Créer le contexte de recommandation
      const context = {
        user,
        recentTransactions,
        budgetDeviations: [], // TODO: Intégrer avec le service de monitoring
        recentRecommendations: user.preferences?.recommendationHistory || []
      };

      // Générer les recommandations quotidiennes
      const dailyRecommendations = generateDailyRecommendations(context);
      
      // Détecter les déclencheurs contextuels
      const contextualRecommendations = detectContextualTriggers(context);
      
      // Fusionner et dédupliquer
      const allRecommendations = [...dailyRecommendations, ...contextualRecommendations];
      const uniqueRecommendations = deduplicateRecommendations(allRecommendations);
      
      // Trier par score de pertinence et limiter à 5
      const sortedRecommendations = uniqueRecommendations
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 5);
      
      // Mettre à jour l'état
      setRecommendations(sortedRecommendations);
      setLastRefreshDate(new Date());
      
      // Sauvegarder dans l'historique utilisateur
      const recommendationHistory = [
        ...(user.preferences?.recommendationHistory || []),
        ...sortedRecommendations.map(rec => ({
          recommendation: rec,
          liked: false,
          disliked: false,
          dismissed: false,
          timestamp: new Date()
        }))
      ].slice(-100); // Garder seulement les 100 plus récents
      
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          recommendationHistory
        }
      });
      
    } catch (error) {
      console.error('Erreur lors de la génération des recommandations:', error);
      toast.error('Erreur lors du chargement des recommandations');
    } finally {
      setIsLoading(false);
    }
  }, [user, setUser]);

  /**
   * Déduplique les recommandations par ID
   */
  const deduplicateRecommendations = useCallback((recommendations: Recommendation[]): Recommendation[] => {
    const seen = new Set<string>();
    return recommendations.filter(rec => {
      if (seen.has(rec.id)) {
        return false;
      }
      seen.add(rec.id);
      return true;
    });
  }, []);

  /**
   * Vérifie les déclencheurs contextuels avec debouncing
   */
  const checkContextualTriggers = useCallback(async (): Promise<void> => {
    if (!user) return;

    // Nettoyer le timeout précédent
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Débouncer avec 5 secondes
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const recentTransactions = await db.transactions
          .where('userId')
          .equals(user.id)
          .toArray();
        
        const context = {
          user,
          recentTransactions,
          budgetDeviations: [], // TODO: Intégrer avec le service de monitoring
          recentRecommendations: user.preferences?.recommendationHistory || []
        };

        const contextualRecommendations = detectContextualTriggers(context);
        
        if (contextualRecommendations.length > 0) {
          // Ajouter les nouvelles recommandations contextuelles au début
          setRecommendations(prev => {
            const merged = [...contextualRecommendations, ...prev];
            const unique = deduplicateRecommendations(merged);
            return unique.slice(0, 5); // Garder seulement les 5 meilleures
          });
          
          toast.success(`${contextualRecommendations.length} nouvelle(s) recommandation(s) contextuelle(s) !`);
        }
        
      } catch (error) {
        console.error('Erreur lors de la vérification des déclencheurs contextuels:', error);
      }
    }, 5000);
  }, [user, deduplicateRecommendations]);

  /**
   * Met à jour le progrès des défis actifs
   */
  const updateChallengeProgress = useCallback(async (): Promise<void> => {
    if (!user || !user.preferences?.activeChallenges?.length) return;

    try {
      const recentTransactions = await db.transactions
        .where('userId')
        .equals(user.id)
        .toArray();

      let hasUpdates = false;
      const updatedChallenges: ActiveChallenge[] = [];
      const completedChallenges: ActiveChallenge[] = [];
      let totalPointsEarned = 0;

      for (const activeChallenge of user.preferences.activeChallenges) {
        const progressResult = checkChallengeProgress(user, activeChallenge.id, recentTransactions);
        
        if (progressResult.status !== activeChallenge.status || progressResult.progress !== activeChallenge.progress) {
          hasUpdates = true;
          
          const updatedChallenge: ActiveChallenge = {
            ...activeChallenge,
            progress: progressResult.progress,
            status: progressResult.status,
            points_earned: progressResult.points_earned
          };
          
          if (progressResult.status === 'completed') {
            completedChallenges.push(updatedChallenge);
            totalPointsEarned += progressResult.points_earned;
            toast.success(`Défi complété ! Vous avez gagné ${progressResult.points_earned} points !`);
          } else {
            updatedChallenges.push(updatedChallenge);
          }
        } else {
          updatedChallenges.push(activeChallenge);
        }
      }

      if (hasUpdates) {
        // Mettre à jour les défis actifs
        const newActiveChallenges = updatedChallenges;
        
        // Ajouter les défis complétés à l'historique
        const newChallengeHistory = [
          ...(user.preferences?.challengeHistory || []),
          ...completedChallenges.map(cc => ({
            id: cc.id,
            challenge: cc.challenge,
            completion_date: new Date(),
            points_earned: cc.points_earned,
            bonus_multiplier: 1.0,
            performance_rating: 'good' as const,
            user_id: user.id
          }))
        ];

        // Mettre à jour l'utilisateur
        setUser({
          ...user,
          preferences: {
            ...user.preferences,
            activeChallenges: newActiveChallenges,
            challengeHistory: newChallengeHistory,
            totalPoints: (user.preferences?.totalPoints || 0) + totalPointsEarned
          }
        });

        // Mettre à jour l'état local
        setActiveChallenges(newActiveChallenges);
      }
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du progrès des défis:', error);
      toast.error('Erreur lors de la mise à jour des défis');
    }
  }, [user, setUser]);

  /**
   * Aime une recommandation
   */
  const likeRecommendation = useCallback((recommendationId: string): void => {
    if (!user) return;

    try {
      // Mettre à jour l'état local
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, liked: true, disliked: false }
            : rec
        )
      );

      // Sauvegarder le feedback
      const feedback = {
        id: recommendationId,
        liked: true,
        disliked: false,
        timestamp: new Date()
      };

      const newFeedback = [...(user.preferences?.recommendationFeedback || []), feedback];
      
      // Mettre à jour les préférences de thème
      const recommendation = recommendations.find(rec => rec.id === recommendationId);
      const themePreferences = { ...(user.preferences?.themePreferences || {}) };
      if (recommendation) {
        themePreferences[recommendation.theme] = (themePreferences[recommendation.theme] || 0) + 1;
      }

      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          recommendationFeedback: newFeedback,
          themePreferences
        }
      });

      toast.success('Recommandation appréciée !');
      
    } catch (error) {
      console.error('Erreur lors de l\'appréciation de la recommandation:', error);
      toast.error('Erreur lors de l\'enregistrement du feedback');
    }
  }, [user, setUser, recommendations]);

  /**
   * N'aime pas une recommandation
   */
  const dislikeRecommendation = useCallback((recommendationId: string): void => {
    if (!user) return;

    try {
      // Mettre à jour l'état local
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, liked: false, disliked: true }
            : rec
        )
      );

      // Sauvegarder le feedback
      const feedback = {
        id: recommendationId,
        liked: false,
        disliked: true,
        timestamp: new Date()
      };

      const newFeedback = [...(user.preferences?.recommendationFeedback || []), feedback];
      
      // Mettre à jour les préférences de thème (décrémenter)
      const recommendation = recommendations.find(rec => rec.id === recommendationId);
      const themePreferences = { ...(user.preferences?.themePreferences || {}) };
      if (recommendation) {
        themePreferences[recommendation.theme] = Math.max(0, (themePreferences[recommendation.theme] || 0) - 1);
      }

      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          recommendationFeedback: newFeedback,
          themePreferences
        }
      });

      toast.success('Préférence enregistrée pour améliorer les futures recommandations');
      
    } catch (error) {
      console.error('Erreur lors du rejet de la recommandation:', error);
      toast.error('Erreur lors de l\'enregistrement du feedback');
    }
  }, [user, setUser, recommendations]);

  /**
   * Ignore une recommandation
   */
  const dismissRecommendation = useCallback((recommendationId: string): void => {
    if (!user) return;

    try {
      // Retirer de la liste active
      setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));

      // Marquer comme ignorée dans l'historique
      const recommendationHistory = (user.preferences?.recommendationHistory || []).map(item => 
        item.recommendation.id === recommendationId 
          ? { ...item, dismissed: true }
          : item
      );

      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          recommendationHistory
        }
      });

      toast.success('Recommandation ignorée');
      
    } catch (error) {
      console.error('Erreur lors de l\'ignorance de la recommandation:', error);
      toast.error('Erreur lors de l\'ignorance de la recommandation');
    }
  }, [user, setUser]);

  /**
   * Accepte un défi
   */
  const acceptChallenge = useCallback(async (challengeId: string): Promise<ActiveChallenge | null> => {
    if (!user) return null;

    try {
      const activeChallenge = acceptChallengeService(user, challengeId);
      
      // Mettre à jour l'utilisateur
      const newActiveChallenges = [...(user.preferences?.activeChallenges || []), activeChallenge];
      
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          activeChallenges: newActiveChallenges
        }
      });

      // Mettre à jour l'état local
      setActiveChallenges(newActiveChallenges);

      toast.success('Défi accepté ! Bonne chance !');
      
      return activeChallenge;
      
    } catch (error) {
      console.error('Erreur lors de l\'acceptation du défi:', error);
      toast.error('Erreur lors de l\'acceptation du défi');
      return null;
    }
  }, [user, setUser]);

  /**
   * Complète manuellement un défi
   */
  const completeChallenge = useCallback(async (challengeId: string): Promise<void> => {
    if (!user) return;

    try {
      const activeChallenge = user.preferences?.activeChallenges?.find(ac => ac.id === challengeId);
      if (!activeChallenge) {
        toast.error('Défi non trouvé');
        return;
      }

      // Marquer comme complété
      const updatedChallenge: ActiveChallenge = {
        ...activeChallenge,
        status: 'completed',
        progress: 100,
        points_earned: activeChallenge.challenge.points_reward
      };

      // Mettre à jour les défis actifs
      const newActiveChallenges = (user.preferences?.activeChallenges || [])
        .filter(ac => ac.id !== challengeId);

      // Ajouter à l'historique
      const newChallengeHistory = [
        ...(user.preferences?.challengeHistory || []),
        {
          id: updatedChallenge.id,
          challenge: updatedChallenge.challenge,
          completion_date: new Date(),
          points_earned: updatedChallenge.points_earned,
          bonus_multiplier: 1.0,
          performance_rating: 'good' as const,
          user_id: user.id
        }
      ];

      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          activeChallenges: newActiveChallenges,
          challengeHistory: newChallengeHistory,
          totalPoints: (user.preferences?.totalPoints || 0) + updatedChallenge.points_earned
        }
      });

      // Mettre à jour l'état local
      setActiveChallenges(newActiveChallenges);

      toast.success(`Défi complété ! Vous avez gagné ${updatedChallenge.points_earned} points !`);
      
    } catch (error) {
      console.error('Erreur lors de la completion du défi:', error);
      toast.error('Erreur lors de la completion du défi');
    }
  }, [user, setUser]);

  /**
   * Rafraîchit manuellement les recommandations
   */
  const refreshRecommendations = useCallback(async (): Promise<void> => {
    await generateRecommendations();
  }, [generateRecommendations]);

  /**
   * Calcule les statistiques des recommandations
   */
  const getRecommendationStats = useCallback((): RecommendationStats => {
    const history = user?.preferences?.recommendationHistory || [];
    const feedback = user?.preferences?.recommendationFeedback || [];
    
    const total_received = history.length;
    const total_liked = feedback.filter(f => f.liked).length;
    const total_disliked = feedback.filter(f => f.disliked).length;
    
    const themes_distribution = history.reduce((acc, item) => {
      const theme = item.recommendation.theme;
      acc[theme] = (acc[theme] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const average_relevance_score = history.length > 0 
      ? Math.round(history.reduce((sum, item) => sum + item.recommendation.relevance_score, 0) / history.length)
      : 0;
    
    return {
      total_received,
      total_liked,
      total_disliked,
      themes_distribution,
      average_relevance_score
    };
  }, [user]);

  // Effet pour charger les recommandations au montage et quotidiennement
  useEffect(() => {
    if (user) {
      generateRecommendations();
    }
  }, [user, generateRecommendations]);

  // Effet pour vérifier les déclencheurs contextuels
  useEffect(() => {
    if (user) {
      checkContextualTriggers();
    }
  }, [user, checkContextualTriggers]);

  // Effet pour la vérification quotidienne à minuit
  useEffect(() => {
    const setupMidnightCheck = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      
      const msUntilMidnight = midnight.getTime() - now.getTime();
      
      // Timeout pour minuit
      midnightTimeoutRef.current = setTimeout(() => {
        generateRecommendations();
        updateChallengeProgress();
        
        // Puis intervalle quotidien
        dailyIntervalRef.current = setInterval(() => {
          generateRecommendations();
          updateChallengeProgress();
        }, 24 * 60 * 60 * 1000); // 24 heures
      }, msUntilMidnight);
    };

    setupMidnightCheck();

    // Nettoyage
    return () => {
      if (midnightTimeoutRef.current) {
        clearTimeout(midnightTimeoutRef.current);
      }
      if (dailyIntervalRef.current) {
        clearInterval(dailyIntervalRef.current);
      }
    };
  }, [generateRecommendations, updateChallengeProgress]);

  // Effet pour charger les défis actifs
  useEffect(() => {
    if (user?.preferences?.activeChallenges) {
      setActiveChallenges(user.preferences.activeChallenges);
    }
  }, [user?.preferences?.activeChallenges]);

  // Nettoyage des timeouts
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    recommendations,
    activeChallenges,
    isLoading,
    lastRefreshDate,
    likeRecommendation,
    dislikeRecommendation,
    dismissRecommendation,
    acceptChallenge,
    updateChallengeProgress,
    completeChallenge,
    refreshRecommendations,
    getRecommendationStats
  };
};

export default useRecommendations;

