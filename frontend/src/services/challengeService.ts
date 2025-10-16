/**
 * Challenge Service - BazarKELY
 * Système de gamification avec défis financiers pour Madagascar
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import type { User, Transaction, QuizResult } from '../types/index.js';
import type { CategoryBudgets } from './budgetIntelligenceService';

/**
 * Types de défis disponibles
 */
export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special';

/**
 * Types d'exigences pour les défis
 */
export type ChallengeRequirementType = 
  | 'no_expense_category' 
  | 'save_amount' 
  | 'complete_quiz' 
  | 'track_daily' 
  | 'follow_budget';

/**
 * Statuts des défis actifs
 */
export type ChallengeStatus = 'in_progress' | 'completed' | 'failed';

/**
 * Interface pour une exigence de défi
 */
export interface ChallengeRequirement {
  readonly type: ChallengeRequirementType;
  readonly target_value: number | string;
  readonly target_category?: string;
  readonly description: string;
}

/**
 * Interface pour un défi
 */
export interface Challenge {
  readonly id: string;
  readonly type: ChallengeType;
  readonly title: string;
  readonly description: string;
  readonly requirements: readonly ChallengeRequirement[];
  readonly duration_days: number;
  readonly points_reward: number;
  readonly badge_reward?: string;
  readonly category?: string;
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced';
  readonly tags: readonly string[];
}

/**
 * Interface pour un défi actif
 */
export interface ActiveChallenge {
  readonly id: string;
  readonly challenge: Challenge;
  readonly start_date: Date;
  readonly end_date: Date;
  readonly progress: number;
  readonly status: ChallengeStatus;
  readonly points_earned: number;
  readonly user_id: string;
}

/**
 * Interface pour un défi complété
 */
export interface CompletedChallenge {
  readonly id: string;
  readonly challenge: Challenge;
  readonly completion_date: Date;
  readonly points_earned: number;
  readonly bonus_multiplier: number;
  readonly performance_rating: 'excellent' | 'good' | 'average' | 'poor';
  readonly user_id: string;
}

/**
 * Interface pour l'historique des défis
 */
export interface ChallengeHistory {
  readonly completed: readonly CompletedChallenge[];
  readonly failed: readonly ActiveChallenge[];
  readonly total_points: number;
  readonly badges_earned: readonly string[];
}

/**
 * Constantes pour les récompenses de points
 */
const POINT_REWARDS = {
  DAILY_MIN: 5,
  DAILY_MAX: 20,
  WEEKLY_MIN: 30,
  WEEKLY_MAX: 80,
  MONTHLY_MIN: 100,
  MONTHLY_MAX: 300,
  SPECIAL_MIN: 200,
  SPECIAL_MAX: 500
} as const;

/**
 * Système de badges
 */
const BADGE_SYSTEM = {
  'Économe Débutant': { requirement: 'first_challenge', description: 'Premier défi complété' },
  'Maître du Budget': { requirement: '10_challenges', description: '10 défis complétés' },
  'Champion de l\'Épargne': { requirement: 'save_100k', description: '100,000 Ar épargnés' },
  'Suivi Parfait': { requirement: 'track_7_days', description: '7 jours de suivi consécutifs' },
  'Quiz Master': { requirement: '5_quizzes', description: '5 quiz complétés' },
  'Économiste': { requirement: 'no_expense_week', description: 'Une semaine sans dépenses non essentielles' },
  'Planificateur': { requirement: 'monthly_goal', description: 'Objectif mensuel atteint' },
  'Défricheur': { requirement: 'special_challenge', description: 'Défi spécial complété' }
} as const;

/**
 * Bibliothèque de défis prédéfinis
 */
const CHALLENGE_LIBRARY: readonly Challenge[] = [
  // === DÉFIS QUOTIDIENS (5-20 points) ===
  {
    id: 'daily_track_expenses',
    type: 'daily',
    title: 'Suivi Quotidien',
    description: 'Enregistrez toutes vos dépenses aujourd\'hui',
    requirements: [
      { type: 'track_daily', target_value: 1, description: 'Enregistrer au moins 1 transaction' }
    ],
    duration_days: 1,
    points_reward: 10,
    badge_reward: 'Suivi Parfait',
    category: 'tracking',
    difficulty: 'beginner',
    tags: ['suivi', 'quotidien', 'débutant']
  },
  {
    id: 'daily_no_coffee',
    type: 'daily',
    title: 'Jour Sans Café',
    description: 'Évitez d\'acheter du café ou des boissons chères',
    requirements: [
      { type: 'no_expense_category', target_value: 0, target_category: 'loisirs', description: 'Aucune dépense loisirs' }
    ],
    duration_days: 1,
    points_reward: 15,
    category: 'loisirs',
    difficulty: 'beginner',
    tags: ['économie', 'loisirs', 'quotidien']
  },
  {
    id: 'daily_walk_transport',
    type: 'daily',
    title: 'Marche au Lieu de Transport',
    description: 'Marchez pour vos déplacements courts au lieu de prendre un taxi',
    requirements: [
      { type: 'no_expense_category', target_value: 0, target_category: 'transport', description: 'Aucune dépense transport' }
    ],
    duration_days: 1,
    points_reward: 12,
    category: 'transport',
    difficulty: 'beginner',
    tags: ['transport', 'santé', 'économie']
  },
  {
    id: 'daily_cook_home',
    type: 'daily',
    title: 'Cuisine Maison',
    description: 'Préparez tous vos repas à la maison',
    requirements: [
      { type: 'no_expense_category', target_value: 0, target_category: 'alimentation', description: 'Aucune dépense alimentation extérieure' }
    ],
    duration_days: 1,
    points_reward: 18,
    category: 'alimentation',
    difficulty: 'intermediate',
    tags: ['alimentation', 'cuisine', 'économie']
  },
  {
    id: 'daily_save_1000',
    type: 'daily',
    title: 'Épargne Quotidienne',
    description: 'Mettez de côté 1,000 Ar aujourd\'hui',
    requirements: [
      { type: 'save_amount', target_value: 1000, description: 'Épargner 1,000 Ar' }
    ],
    duration_days: 1,
    points_reward: 8,
    category: 'epargne',
    difficulty: 'beginner',
    tags: ['épargne', 'quotidien', 'habitude']
  },

  // === DÉFIS HEBDOMADAIRES (30-80 points) ===
  {
    id: 'weekly_track_all',
    type: 'weekly',
    title: 'Suivi Complet',
    description: 'Enregistrez toutes vos transactions pendant 7 jours',
    requirements: [
      { type: 'track_daily', target_value: 7, description: 'Enregistrer des transactions 7 jours consécutifs' }
    ],
    duration_days: 7,
    points_reward: 50,
    badge_reward: 'Suivi Parfait',
    category: 'tracking',
    difficulty: 'intermediate',
    tags: ['suivi', 'hebdomadaire', 'habitude']
  },
  {
    id: 'weekly_no_impulse',
    type: 'weekly',
    title: 'Semaine Sans Achats Impulsifs',
    description: 'Évitez tous les achats non planifiés pendant une semaine',
    requirements: [
      { type: 'no_expense_category', target_value: 0, target_category: 'loisirs', description: 'Aucune dépense loisirs' }
    ],
    duration_days: 7,
    points_reward: 60,
    category: 'loisirs',
    difficulty: 'intermediate',
    tags: ['contrôle', 'loisirs', 'discipline']
  },
  {
    id: 'weekly_budget_adherence',
    type: 'weekly',
    title: 'Respect du Budget',
    description: 'Respectez votre budget dans toutes les catégories',
    requirements: [
      { type: 'follow_budget', target_value: 100, description: 'Respecter 100% du budget' }
    ],
    duration_days: 7,
    points_reward: 70,
    category: 'budget',
    difficulty: 'intermediate',
    tags: ['budget', 'contrôle', 'planification']
  },
  {
    id: 'weekly_save_10000',
    type: 'weekly',
    title: 'Épargne Hebdomadaire',
    description: 'Épargnez 10,000 Ar cette semaine',
    requirements: [
      { type: 'save_amount', target_value: 10000, description: 'Épargner 10,000 Ar' }
    ],
    duration_days: 7,
    points_reward: 40,
    category: 'epargne',
    difficulty: 'beginner',
    tags: ['épargne', 'hebdomadaire', 'objectif']
  },
  {
    id: 'weekly_quiz_learning',
    type: 'weekly',
    title: 'Apprentissage Financier',
    description: 'Complétez 3 quiz éducatifs cette semaine',
    requirements: [
      { type: 'complete_quiz', target_value: 3, description: 'Compléter 3 quiz' }
    ],
    duration_days: 7,
    points_reward: 45,
    badge_reward: 'Quiz Master',
    category: 'education',
    difficulty: 'intermediate',
    tags: ['éducation', 'quiz', 'apprentissage']
  },
  {
    id: 'weekly_cook_all_meals',
    type: 'weekly',
    title: 'Cuisine Complète',
    description: 'Préparez tous vos repas à la maison pendant 7 jours',
    requirements: [
      { type: 'no_expense_category', target_value: 0, target_category: 'alimentation', description: 'Aucune dépense alimentation extérieure' }
    ],
    duration_days: 7,
    points_reward: 65,
    category: 'alimentation',
    difficulty: 'advanced',
    tags: ['alimentation', 'cuisine', 'économie', 'discipline']
  },

  // === DÉFIS MENSUELS (100-300 points) ===
  {
    id: 'monthly_save_50000',
    type: 'monthly',
    title: 'Épargne Mensuelle',
    description: 'Épargnez 50,000 Ar ce mois',
    requirements: [
      { type: 'save_amount', target_value: 50000, description: 'Épargner 50,000 Ar' }
    ],
    duration_days: 30,
    points_reward: 150,
    badge_reward: 'Champion de l\'Épargne',
    category: 'epargne',
    difficulty: 'intermediate',
    tags: ['épargne', 'mensuel', 'objectif']
  },
  {
    id: 'monthly_budget_master',
    type: 'monthly',
    title: 'Maître du Budget',
    description: 'Respectez votre budget dans toutes les catégories pendant un mois',
    requirements: [
      { type: 'follow_budget', target_value: 95, description: 'Respecter 95% du budget' }
    ],
    duration_days: 30,
    points_reward: 200,
    badge_reward: 'Maître du Budget',
    category: 'budget',
    difficulty: 'advanced',
    tags: ['budget', 'contrôle', 'mensuel', 'maîtrise']
  },
  {
    id: 'monthly_no_entertainment',
    type: 'monthly',
    title: 'Mois Sans Divertissement',
    description: 'Évitez tous les divertissements payants pendant un mois',
    requirements: [
      { type: 'no_expense_category', target_value: 0, target_category: 'loisirs', description: 'Aucune dépense loisirs' }
    ],
    duration_days: 30,
    points_reward: 180,
    category: 'loisirs',
    difficulty: 'advanced',
    tags: ['loisirs', 'économie', 'discipline', 'mensuel']
  },
  {
    id: 'monthly_education_boost',
    type: 'monthly',
    title: 'Boost Éducatif',
    description: 'Complétez 10 quiz et lisez 5 articles financiers',
    requirements: [
      { type: 'complete_quiz', target_value: 10, description: 'Compléter 10 quiz' }
    ],
    duration_days: 30,
    points_reward: 120,
    category: 'education',
    difficulty: 'intermediate',
    tags: ['éducation', 'apprentissage', 'mensuel']
  },
  {
    id: 'monthly_transport_optimization',
    type: 'monthly',
    title: 'Optimisation Transport',
    description: 'Réduisez vos dépenses de transport de 30% ce mois',
    requirements: [
      { type: 'no_expense_category', target_value: 0, target_category: 'transport', description: 'Réduire les dépenses transport' }
    ],
    duration_days: 30,
    points_reward: 160,
    category: 'transport',
    difficulty: 'intermediate',
    tags: ['transport', 'optimisation', 'mensuel']
  },

  // === DÉFIS SPÉCIAUX (200-500 points) ===
  {
    id: 'special_rentree_scolaire',
    type: 'special',
    title: 'Préparation Rentrée',
    description: 'Épargnez pour la rentrée scolaire de vos enfants',
    requirements: [
      { type: 'save_amount', target_value: 100000, description: 'Épargner 100,000 Ar pour la rentrée' }
    ],
    duration_days: 60,
    points_reward: 300,
    category: 'epargne',
    difficulty: 'advanced',
    tags: ['rentrée', 'éducation', 'famille', 'spécial']
  },
  {
    id: 'special_fetes_economies',
    type: 'special',
    title: 'Économies de Fêtes',
    description: 'Organisez des fêtes de fin d\'année sans dépasser votre budget',
    requirements: [
      { type: 'follow_budget', target_value: 100, description: 'Respecter le budget fêtes' }
    ],
    duration_days: 30,
    points_reward: 250,
    category: 'budget',
    difficulty: 'intermediate',
    tags: ['fêtes', 'budget', 'famille', 'spécial']
  },
  {
    id: 'special_emergency_fund',
    type: 'special',
    title: 'Fonds d\'Urgence',
    description: 'Créez un fonds d\'urgence de 3 mois de dépenses',
    requirements: [
      { type: 'save_amount', target_value: 300000, description: 'Épargner 300,000 Ar' }
    ],
    duration_days: 90,
    points_reward: 400,
    badge_reward: 'Champion de l\'Épargne',
    category: 'epargne',
    difficulty: 'advanced',
    tags: ['urgence', 'épargne', 'sécurité', 'spécial']
  },
  {
    id: 'special_mobile_money_master',
    type: 'special',
    title: 'Maître Mobile Money',
    description: 'Optimisez vos frais de mobile money pendant 3 mois',
    requirements: [
      { type: 'follow_budget', target_value: 90, description: 'Réduire les frais de 10%' }
    ],
    duration_days: 90,
    points_reward: 350,
    category: 'communication',
    difficulty: 'intermediate',
    tags: ['mobile money', 'optimisation', 'frais', 'spécial']
  },
  {
    id: 'special_financial_freedom',
    type: 'special',
    title: 'Liberté Financière',
    description: 'Atteignez votre objectif d\'épargne annuel en 6 mois',
    requirements: [
      { type: 'save_amount', target_value: 500000, description: 'Épargner 500,000 Ar' }
    ],
    duration_days: 180,
    points_reward: 500,
    badge_reward: 'Champion de l\'Épargne',
    category: 'epargne',
    difficulty: 'advanced',
    tags: ['liberté', 'épargne', 'objectif', 'spécial']
  },

  // === DÉFIS SUPPLÉMENTAIRES ===
  {
    id: 'daily_water_only',
    type: 'daily',
    title: 'Jour Eau Pure',
    description: 'Buvez seulement de l\'eau du robinet aujourd\'hui',
    requirements: [
      { type: 'no_expense_category', target_value: 0, target_category: 'alimentation', description: 'Aucune boisson achetée' }
    ],
    duration_days: 1,
    points_reward: 8,
    category: 'alimentation',
    difficulty: 'beginner',
    tags: ['eau', 'santé', 'économie']
  },
  {
    id: 'weekly_public_transport',
    type: 'weekly',
    title: 'Transport Public',
    description: 'Utilisez uniquement les transports publics cette semaine',
    requirements: [
      { type: 'no_expense_category', target_value: 0, target_category: 'transport', description: 'Aucun taxi privé' }
    ],
    duration_days: 7,
    points_reward: 35,
    category: 'transport',
    difficulty: 'intermediate',
    tags: ['transport', 'public', 'économie']
  },
  {
    id: 'monthly_skill_development',
    type: 'monthly',
    title: 'Développement de Compétences',
    description: 'Apprenez une nouvelle compétence financière ce mois',
    requirements: [
      { type: 'complete_quiz', target_value: 5, description: 'Compléter 5 quiz spécialisés' }
    ],
    duration_days: 30,
    points_reward: 100,
    category: 'education',
    difficulty: 'intermediate',
    tags: ['compétences', 'apprentissage', 'développement']
  },
  {
    id: 'special_independence_day',
    type: 'special',
    title: 'Jour de l\'Indépendance',
    description: 'Célébrez l\'indépendance de Madagascar en épargnant',
    requirements: [
      { type: 'save_amount', target_value: 19600, description: 'Épargner 19,600 Ar (1960)' }
    ],
    duration_days: 7,
    points_reward: 200,
    category: 'epargne',
    difficulty: 'beginner',
    tags: ['indépendance', 'patriotisme', 'épargne', 'spécial']
  },
  {
    id: 'daily_gratitude_spending',
    type: 'daily',
    title: 'Dépense de Gratitude',
    description: 'Notez 3 choses pour lesquelles vous êtes reconnaissant avant de dépenser',
    requirements: [
      { type: 'track_daily', target_value: 1, description: 'Enregistrer une réflexion de gratitude' }
    ],
    duration_days: 1,
    points_reward: 6,
    category: 'tracking',
    difficulty: 'beginner',
    tags: ['gratitude', 'mindfulness', 'réflexion']
  }
] as const;

/**
 * Retourne la bibliothèque complète des défis
 * @returns Tableau de tous les défis disponibles
 */
export const getChallengeLibrary = (): readonly Challenge[] => {
  return CHALLENGE_LIBRARY;
};

/**
 * Génère des défis personnalisés basés sur le profil utilisateur
 * @param user - Utilisateur pour lequel générer les défis
 * @param currentDate - Date actuelle pour la personnalisation
 * @returns Tableau de défis suggérés
 */
export const generatePersonalizedChallenges = (user: User, currentDate: Date = new Date()): Challenge[] => {
  try {
    const allChallenges = getChallengeLibrary();
    const userLevel = determineUserLevel(user);
    const userInterests = extractUserInterests(user);
    const activeChallenges = user.preferences?.activeChallenges || [];
    
    // Filtrer par niveau d'expérience
    let filteredChallenges = allChallenges.filter(challenge => {
      switch (userLevel) {
        case 'beginner':
          return challenge.difficulty === 'beginner' && challenge.type === 'daily';
        case 'intermediate':
          return challenge.difficulty === 'intermediate' && (challenge.type === 'daily' || challenge.type === 'weekly');
        case 'advanced':
          return challenge.difficulty === 'advanced' || challenge.type === 'monthly' || challenge.type === 'special';
        default:
          return true;
      }
    });
    
    // Filtrer par intérêts utilisateur
    if (userInterests.length > 0) {
      filteredChallenges = filteredChallenges.filter(challenge => 
        userInterests.some(interest => 
          challenge.tags.includes(interest) || 
          challenge.category === interest
        )
      );
    }
    
    // Exclure les défis déjà actifs
    const activeChallengeIds = activeChallenges.map(ac => ac.challenge.id);
    filteredChallenges = filteredChallenges.filter(challenge => 
      !activeChallengeIds.includes(challenge.id)
    );
    
    // Appliquer la logique saisonnière
    filteredChallenges = applySeasonalFiltering(filteredChallenges, currentDate);
    
    // Limiter à 3 suggestions
    return filteredChallenges.slice(0, 3);
    
  } catch (error) {
    console.error('Erreur lors de la génération des défis personnalisés:', error);
    return getChallengeLibrary().slice(0, 3); // Fallback
  }
};

/**
 * Accepte un défi pour l'utilisateur
 * @param user - Utilisateur qui accepte le défi
 * @param challengeId - ID du défi à accepter
 * @param startDate - Date de début du défi
 * @returns Défi actif créé
 */
export const acceptChallenge = (user: User, challengeId: string, startDate: Date = new Date()): ActiveChallenge => {
  try {
    const challenge = CHALLENGE_LIBRARY.find(c => c.id === challengeId);
    if (!challenge) {
      throw new Error(`Défi non trouvé: ${challengeId}`);
    }
    
    // Vérifier si l'utilisateur peut accepter plus de défis
    const activeChallenges = user.preferences?.activeChallenges || [];
    if (activeChallenges.length >= 3) {
      throw new Error('Limite de 3 défis actifs atteinte');
    }
    
    // Calculer la date de fin
    const endDate = new Date(startDate.getTime() + challenge.duration_days * 24 * 60 * 60 * 1000);
    
    // Créer le défi actif
    const activeChallenge: ActiveChallenge = {
      id: crypto.randomUUID(),
      challenge,
      start_date: startDate,
      end_date: endDate,
      progress: 0,
      status: 'in_progress',
      points_earned: 0,
      user_id: user.id
    };
    
    return activeChallenge;
    
  } catch (error) {
    console.error('Erreur lors de l\'acceptation du défi:', error);
    throw error;
  }
};

/**
 * Vérifie le progrès d'un défi actif
 * @param user - Utilisateur propriétaire du défi
 * @param activeChallengeId - ID du défi actif
 * @param transactions - Transactions récentes pour l'analyse
 * @returns Progrès mis à jour et statut
 */
export const checkChallengeProgress = (
  user: User, 
  activeChallengeId: string, 
  transactions: readonly Transaction[]
): { progress: number; status: ChallengeStatus; points_earned: number } => {
  try {
    const activeChallenges = user.preferences?.activeChallenges || [];
    const activeChallenge = activeChallenges.find(ac => ac.id === activeChallengeId);
    
    if (!activeChallenge) {
      throw new Error(`Défi actif non trouvé: ${activeChallengeId}`);
    }
    
    // Vérifier si le défi a expiré
    const now = new Date();
    if (now > activeChallenge.end_date) {
      return {
        progress: activeChallenge.progress,
        status: 'failed',
        points_earned: 0
      };
    }
    
    // Calculer le progrès basé sur les exigences
    const progress = calculateChallengeProgress(activeChallenge, transactions, user);
    
    // Déterminer le statut
    let status: ChallengeStatus = 'in_progress';
    let points_earned = 0;
    
    if (progress >= 100) {
      status = 'completed';
      points_earned = calculatePointsEarned(activeChallenge, progress);
    }
    
    return {
      progress: Math.min(100, Math.max(0, progress)),
      status,
      points_earned
    };
    
  } catch (error) {
    console.error('Erreur lors de la vérification du progrès:', error);
    return {
      progress: 0,
      status: 'failed',
      points_earned: 0
    };
  }
};

/**
 * Retourne l'historique des défis de l'utilisateur
 * @param user - Utilisateur pour lequel récupérer l'historique
 * @returns Historique complet des défis
 */
export const getChallengeHistory = (user: User): ChallengeHistory => {
  try {
    const completedChallenges = user.preferences?.challengeHistory || [];
    const failedChallenges = (user.preferences?.activeChallenges || [])
      .filter(ac => ac.status === 'failed');
    
    const totalPoints = completedChallenges.reduce((sum, cc) => sum + cc.points_earned, 0);
    const badgesEarned = extractBadgesEarned(completedChallenges);
    
    return {
      completed: completedChallenges,
      failed: failedChallenges,
      total_points: totalPoints,
      badges_earned: badgesEarned
    };
    
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    return {
      completed: [],
      failed: [],
      total_points: 0,
      badges_earned: []
    };
  }
};

// ===== FONCTIONS UTILITAIRES =====

/**
 * Détermine le niveau d'expérience de l'utilisateur
 */
const determineUserLevel = (user: User): 'beginner' | 'intermediate' | 'advanced' => {
  const completedChallenges = user.preferences?.challengeHistory?.length || 0;
  const totalPoints = user.preferences?.totalPoints || 0;
  
  if (completedChallenges < 3 || totalPoints < 100) {
    return 'beginner';
  } else if (completedChallenges < 10 || totalPoints < 500) {
    return 'intermediate';
  } else {
    return 'advanced';
  }
};

/**
 * Extrait les intérêts de l'utilisateur à partir des réponses prioritaires
 */
const extractUserInterests = (user: User): string[] => {
  const answers = user.preferences?.priorityAnswers || {};
  const interests: string[] = [];
  
  // Mapper les réponses aux intérêts
  if (answers.savings_priority === 'high') interests.push('épargne');
  if (answers.spending_habits === 'planned') interests.push('budget', 'planification');
  if (answers.education_level === 'beginner') interests.push('apprentissage', 'éducation');
  if (answers.family_size === 'large') interests.push('famille');
  
  return interests;
};

/**
 * Applique le filtrage saisonnier aux défis
 */
const applySeasonalFiltering = (challenges: Challenge[], currentDate: Date): Challenge[] => {
  const month = currentDate.getMonth() + 1; // 1-12
  
  // Défis de rentrée scolaire (Janvier-Février)
  if (month >= 1 && month <= 2) {
    return challenges.filter(c => 
      c.tags.includes('rentrée') || 
      c.tags.includes('éducation') ||
      c.category === 'epargne'
    );
  }
  
  // Défis de fêtes (Décembre)
  if (month === 12) {
    return challenges.filter(c => 
      c.tags.includes('fêtes') || 
      c.tags.includes('famille') ||
      c.category === 'budget'
    );
  }
  
  return challenges;
};

/**
 * Calcule le progrès d'un défi basé sur ses exigences
 */
const calculateChallengeProgress = (
  activeChallenge: ActiveChallenge, 
  transactions: readonly Transaction[],
  user: User
): number => {
  const { challenge, start_date, end_date } = activeChallenge;
  const challengeTransactions = transactions.filter(tx => 
    new Date(tx.createdAt) >= start_date && new Date(tx.createdAt) <= end_date
  );
  
  let totalProgress = 0;
  const requirementCount = challenge.requirements.length;
  
  for (const requirement of challenge.requirements) {
    const requirementProgress = calculateRequirementProgress(requirement, challengeTransactions, user);
    totalProgress += requirementProgress;
  }
  
  return Math.round(totalProgress / requirementCount);
};

/**
 * Calcule le progrès d'une exigence spécifique
 */
const calculateRequirementProgress = (
  requirement: ChallengeRequirement,
  transactions: readonly Transaction[],
  user: User
): number => {
  switch (requirement.type) {
    case 'no_expense_category':
      return calculateNoExpenseProgress(requirement, transactions);
    
    case 'save_amount':
      return calculateSaveAmountProgress(requirement, transactions);
    
    case 'complete_quiz':
      return calculateQuizProgress(requirement, user);
    
    case 'track_daily':
      return calculateTrackDailyProgress(requirement, transactions);
    
    case 'follow_budget':
      return calculateBudgetProgress(requirement, transactions, user);
    
    default:
      return 0;
  }
};

/**
 * Calcule le progrès pour l'exigence "no_expense_category"
 */
const calculateNoExpenseProgress = (
  requirement: ChallengeRequirement,
  transactions: readonly Transaction[]
): number => {
  const categoryExpenses = transactions.filter(tx => 
    tx.type === 'expense' && tx.category === requirement.target_category
  );
  
  return categoryExpenses.length === 0 ? 100 : 0;
};

/**
 * Calcule le progrès pour l'exigence "save_amount"
 */
const calculateSaveAmountProgress = (
  requirement: ChallengeRequirement,
  transactions: readonly Transaction[]
): number => {
  const totalSaved = transactions
    .filter(tx => tx.type === 'income' && tx.description.toLowerCase().includes('épargne'))
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const target = typeof requirement.target_value === 'number' 
    ? requirement.target_value 
    : parseInt(requirement.target_value);
  
  return Math.min(100, Math.round((totalSaved / target) * 100));
};

/**
 * Calcule le progrès pour l'exigence "complete_quiz"
 */
const calculateQuizProgress = (requirement: ChallengeRequirement, user: User): number => {
  const quizResults = user.preferences?.quizResults || [];
  const target = typeof requirement.target_value === 'number' 
    ? requirement.target_value 
    : parseInt(requirement.target_value);
  
  return Math.min(100, Math.round((quizResults.length / target) * 100));
};

/**
 * Calcule le progrès pour l'exigence "track_daily"
 */
const calculateTrackDailyProgress = (
  requirement: ChallengeRequirement,
  transactions: readonly Transaction[]
): number => {
  const target = typeof requirement.target_value === 'number' 
    ? requirement.target_value 
    : parseInt(requirement.target_value);
  
  // Compter les jours uniques avec des transactions
  const uniqueDays = new Set(
    transactions.map(tx => new Date(tx.createdAt).toDateString())
  ).size;
  
  return Math.min(100, Math.round((uniqueDays / target) * 100));
};

/**
 * Calcule le progrès pour l'exigence "follow_budget"
 */
const calculateBudgetProgress = (
  requirement: ChallengeRequirement,
  transactions: readonly Transaction[],
  user: User
): number => {
  const budgets = user.preferences?.activeBudgets || user.preferences?.intelligentBudgets;
  if (!budgets) return 0;
  
  const target = typeof requirement.target_value === 'number' 
    ? requirement.target_value 
    : parseInt(requirement.target_value);
  
  // Calculer le respect du budget par catégorie
  let totalRespect = 0;
  let categoryCount = 0;
  
  for (const [category, budgetAmount] of Object.entries(budgets)) {
    const categorySpending = transactions
      .filter(tx => tx.type === 'expense' && tx.category === category)
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const respectPercentage = Math.min(100, (budgetAmount / (categorySpending || 1)) * 100);
    totalRespect += respectPercentage;
    categoryCount++;
  }
  
  const averageRespect = totalRespect / categoryCount;
  return Math.min(100, Math.round(averageRespect));
};

/**
 * Calcule les points gagnés avec bonus
 */
const calculatePointsEarned = (activeChallenge: ActiveChallenge, progress: number): number => {
  const basePoints = activeChallenge.challenge.points_reward;
  
  // Bonus pour completion anticipée
  const now = new Date();
  const daysRemaining = Math.ceil((activeChallenge.end_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const totalDays = activeChallenge.challenge.duration_days;
  const daysEarly = Math.max(0, daysRemaining);
  
  const bonusMultiplier = Math.min(1.5, 1 + (daysEarly / totalDays) * 0.5);
  
  return Math.round(basePoints * bonusMultiplier);
};

/**
 * Extrait les badges gagnés
 */
const extractBadgesEarned = (completedChallenges: readonly CompletedChallenge[]): string[] => {
  const badges: string[] = [];
  const challengeCount = completedChallenges.length;
  const totalSavings = completedChallenges
    .filter(cc => cc.challenge.category === 'epargne')
    .reduce((sum, cc) => sum + (cc.challenge.points_reward * 1000), 0); // Approximation
  
  // Badges basés sur le nombre de défis
  if (challengeCount >= 1) badges.push('Économe Débutant');
  if (challengeCount >= 10) badges.push('Maître du Budget');
  
  // Badges basés sur l'épargne
  if (totalSavings >= 100000) badges.push('Champion de l\'Épargne');
  
  // Badges basés sur des défis spécifiques
  const hasTrackingChallenge = completedChallenges.some(cc => 
    cc.challenge.tags.includes('suivi') && cc.challenge.type === 'weekly'
  );
  if (hasTrackingChallenge) badges.push('Suivi Parfait');
  
  const hasQuizChallenge = completedChallenges.some(cc => 
    cc.challenge.category === 'education'
  );
  if (hasQuizChallenge) badges.push('Quiz Master');
  
  return Array.from(new Set(badges)); // Supprimer les doublons
};
