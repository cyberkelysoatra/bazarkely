/**
 * Recommendation Engine Service - BazarKELY
 * Moteur de recommandations financières personnalisées pour Madagascar
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import type { User, Transaction, QuizResult } from '../types/index.js';
import type { DeviationAlert, CategoryBudgets } from './budgetIntelligenceService';

/**
 * Types de recommandations disponibles
 */
export type RecommendationType = 'daily' | 'contextual';

/**
 * Thèmes de recommandations
 */
export type RecommendationTheme = 
  | 'savings' 
  | 'expense_reduction' 
  | 'budget_optimization' 
  | 'education' 
  | 'mobile_money';

/**
 * Priorités des recommandations
 */
export type RecommendationPriority = 'high' | 'medium' | 'low';

/**
 * Interface pour une recommandation financière
 */
export interface Recommendation {
  readonly id: string;
  readonly type: RecommendationType;
  readonly theme: RecommendationTheme;
  readonly title: string;
  readonly description: string;
  readonly actionable_steps: readonly string[];
  readonly priority: RecommendationPriority;
  readonly relevance_score: number;
  readonly created_at: Date;
  readonly expires_at: Date;
  readonly category?: string;
  readonly estimated_impact: string;
}

/**
 * Interface pour le contexte de génération des recommandations
 */
export interface RecommendationContext {
  readonly user: User;
  readonly recentTransactions: readonly Transaction[];
  readonly budgetDeviations: readonly DeviationAlert[];
  readonly recentRecommendations: readonly Recommendation[];
}

/**
 * Interface pour les statistiques des recommandations
 */
export interface RecommendationStatistics {
  readonly total: number;
  readonly byTheme: Record<RecommendationTheme, number>;
  readonly byPriority: Record<RecommendationPriority, number>;
  readonly averageScore: number;
  readonly active: number;
  readonly expired: number;
}

/**
 * Constantes pour les seuils de déclenchement
 */
const TRIGGER_THRESHOLDS = {
  BUDGET_OVERSHOT: 20,        // 20% de dépassement budgétaire
  SAVINGS_LOW: 80,            // 80% de l'objectif d'épargne
  QUIZ_INACTIVE_DAYS: 7,      // 7 jours sans quiz
  LARGE_EXPENSE_PERCENT: 30,  // 30% du revenu mensuel
} as const;

/**
 * Poids pour le calcul du score de pertinence
 */
const SCORING_WEIGHTS = {
  PROFILE_ALIGNMENT: 0.30,    // 30% - Alignement avec le profil utilisateur
  QUIZ_PERFORMANCE: 0.25,     // 25% - Performance aux quiz
  RECENT_BEHAVIOR: 0.20,      // 20% - Comportement récent
  TEMPORAL_CONTEXT: 0.15,     // 15% - Contexte temporel
  DIVERSIFICATION: 0.10,      // 10% - Diversification
} as const;

/**
 * Templates de recommandations prédéfinies
 */
const RECOMMENDATION_TEMPLATES = {
  savings: [
    {
      title: "Épargnez automatiquement avec Orange Money",
      description: "Configurez un virement automatique vers votre compte épargne chaque semaine pour atteindre vos objectifs sans effort.",
      steps: [
        "Ouvrez l'application Orange Money",
        "Allez dans 'Épargne' > 'Virement automatique'",
        "Définissez un montant hebdomadaire (ex: 10,000 Ar)",
        "Choisissez le jour de virement (ex: chaque lundi)"
      ],
      estimated_impact: "Économisez 40,000 Ar par mois"
    },
    {
      title: "Créez un fonds d'urgence de 3 mois",
      description: "Constituer un fonds d'urgence équivalent à 3 mois de dépenses pour faire face aux imprévus.",
      steps: [
        "Calculez vos dépenses mensuelles moyennes",
        "Multipliez par 3 pour obtenir l'objectif",
        "Divisez par 12 pour la contribution mensuelle",
        "Ouvrez un compte épargne dédié"
      ],
      estimated_impact: "Sécurité financière renforcée"
    },
    {
      title: "Épargnez les petites sommes quotidiennes",
      description: "Mettez de côté 500 Ar chaque jour dans une tirelire ou un compte séparé.",
      steps: [
        "Préparez 500 Ar en pièces chaque matin",
        "Déposez dans une tirelire ou un pot",
        "Comptez et déposez à la banque chaque semaine",
        "Suivez vos progrès avec une app"
      ],
      estimated_impact: "Économisez 15,000 Ar par mois"
    },
    {
      title: "Utilisez la règle 50-30-20",
      description: "Répartissez vos revenus : 50% besoins, 30% envies, 20% épargne.",
      steps: [
        "Calculez 20% de votre revenu mensuel",
        "Virez automatiquement cette somme en épargne",
        "Ajustez vos dépenses sur les 80% restants",
        "Réévaluez chaque mois"
      ],
      estimated_impact: "Épargne systématique garantie"
    }
  ],
  expense_reduction: [
    {
      title: "Réduisez vos dépenses alimentaires",
      description: "Optimisez vos achats alimentaires en planifiant vos menus et en achetant en gros.",
      steps: [
        "Planifiez vos menus de la semaine",
        "Faites une liste de courses détaillée",
        "Achetez les produits de base en gros",
        "Évitez les achats impulsifs"
      ],
      estimated_impact: "Économisez 30,000 Ar par mois"
    },
    {
      title: "Limitez les dépenses de transport",
      description: "Optimisez vos déplacements pour réduire les coûts de transport.",
      steps: [
        "Regroupez vos déplacements",
        "Utilisez les transports en commun quand possible",
        "Covoiturez avec des collègues",
        "Marchez ou utilisez un vélo pour les courtes distances"
      ],
      estimated_impact: "Économisez 20,000 Ar par mois"
    },
    {
      title: "Évitez les achats impulsifs",
      description: "Appliquez la règle des 24h avant tout achat non essentiel.",
      steps: [
        "Attendez 24h avant d'acheter",
        "Demandez-vous si c'est vraiment nécessaire",
        "Comparez les prix en ligne",
        "Cherchez des alternatives gratuites"
      ],
      estimated_impact: "Économisez 25,000 Ar par mois"
    },
    {
      title: "Optimisez vos abonnements",
      description: "Révisez vos abonnements télécoms et autres services récurrents.",
      steps: [
        "Listez tous vos abonnements mensuels",
        "Identifiez ceux que vous n'utilisez pas",
        "Négociez avec vos fournisseurs",
        "Annulez les services inutiles"
      ],
      estimated_impact: "Économisez 15,000 Ar par mois"
    }
  ],
  budget_optimization: [
    {
      title: "Ajustez votre budget selon vos priorités",
      description: "Réévaluez la répartition de votre budget mensuel en fonction de vos objectifs actuels.",
      steps: [
        "Analysez vos dépenses des 3 derniers mois",
        "Identifiez les catégories sur-financées",
        "Réallouez vers vos priorités",
        "Testez le nouveau budget pendant un mois"
      ],
      estimated_impact: "Budget mieux adapté à vos besoins"
    },
    {
      title: "Utilisez la méthode des enveloppes",
      description: "Allouez un montant fixe par catégorie de dépenses pour mieux contrôler vos finances.",
      steps: [
        "Divisez votre budget en catégories",
        "Mettez l'argent dans des enveloppes séparées",
        "Payez uniquement avec l'enveloppe correspondante",
        "Ne transférez pas entre enveloppes"
      ],
      estimated_impact: "Contrôle total de vos dépenses"
    },
    {
      title: "Planifiez vos dépenses saisonnières",
      description: "Anticipez les dépenses importantes comme la rentrée scolaire ou les fêtes.",
      steps: [
        "Listez les dépenses annuelles importantes",
        "Divisez par 12 pour la contribution mensuelle",
        "Créez un compte épargne dédié",
        "Déposez chaque mois la somme calculée"
      ],
      estimated_impact: "Évitez les dettes saisonnières"
    },
    {
      title: "Optimisez vos paiements récurrents",
      description: "Regroupez et optimisez vos paiements mensuels pour réduire les frais.",
      steps: [
        "Listez tous vos paiements récurrents",
        "Regroupez-les sur une même date",
        "Utilisez les virements automatiques",
        "Négociez des remises pour paiement anticipé"
      ],
      estimated_impact: "Réduisez les frais bancaires"
    }
  ],
  education: [
    {
      title: "Apprenez les bases de l'investissement",
      description: "Découvrez les options d'investissement adaptées au contexte malgache.",
      steps: [
        "Lisez des articles sur l'investissement local",
        "Consultez les offres des banques malgaches",
        "Commencez par des investissements à faible risque",
        "Diversifiez progressivement votre portefeuille"
      ],
      estimated_impact: "Augmentez vos revenus passifs"
    },
    {
      title: "Comprenez les frais bancaires",
      description: "Maîtrisez les différents types de frais pour optimiser vos coûts bancaires.",
      steps: [
        "Demandez le détail des frais à votre banque",
        "Comparez les offres de différentes banques",
        "Choisissez les services adaptés à vos besoins",
        "Négociez la réduction de certains frais"
      ],
      estimated_impact: "Économisez 10,000 Ar par mois"
    },
    {
      title: "Développez votre culture financière",
      description: "Améliorez vos connaissances en finances personnelles pour de meilleures décisions.",
      steps: [
        "Lisez un livre de finances personnelles",
        "Suivez des blogs financiers locaux",
        "Participez à des webinaires gratuits",
        "Rejoignez des groupes d'épargnants"
      ],
      estimated_impact: "Décisions financières plus éclairées"
    },
    {
      title: "Apprenez à négocier",
      description: "Développez vos compétences de négociation pour réduire vos coûts.",
      steps: [
        "Préparez vos arguments avant la négociation",
        "Recherchez les prix de la concurrence",
        "Soyez poli mais ferme",
        "Proposez des alternatives gagnant-gagnant"
      ],
      estimated_impact: "Réduisez vos coûts de 5-15%"
    }
  ],
  mobile_money: [
    {
      title: "Optimisez vos transferts Orange Money",
      description: "Utilisez les options les moins chères pour vos transferts d'argent.",
      steps: [
        "Comparez les frais selon le montant",
        "Utilisez les transferts entre comptes Orange Money",
        "Évitez les retraits d'espèces fréquents",
        "Profitez des promotions périodiques"
      ],
      estimated_impact: "Économisez 5,000 Ar par mois"
    },
    {
      title: "Utilisez Mvola pour vos achats",
      description: "Payez vos achats quotidiens avec Mvola pour éviter les frais de retrait.",
      steps: [
        "Activez le paiement Mvola chez vos commerçants",
        "Rechargez votre compte Mvola",
        "Payez directement avec votre téléphone",
        "Gardez un petit solde pour les urgences"
      ],
      estimated_impact: "Évitez les frais de retrait"
    },
    {
      title: "Comparez les frais des services mobiles",
      description: "Choisissez le service mobile money le plus avantageux selon vos besoins.",
      steps: [
        "Listez vos transferts mensuels typiques",
        "Calculez les frais avec Orange Money, Mvola, Airtel Money",
        "Choisissez le service le moins cher",
        "Utilisez plusieurs services selon les cas"
      ],
      estimated_impact: "Économisez 8,000 Ar par mois"
    },
    {
      title: "Sécurisez vos transactions mobiles",
      description: "Protégez vos comptes mobile money contre la fraude et les erreurs.",
      steps: [
        "Activez l'authentification à deux facteurs",
        "Ne partagez jamais vos codes PIN",
        "Vérifiez toujours le numéro du destinataire",
        "Gardez vos reçus de transaction"
      ],
      estimated_impact: "Évitez les pertes financières"
    }
  ]
} as const;

/**
 * Génère les recommandations quotidiennes personnalisées
 * @param context - Contexte de génération des recommandations
 * @returns Tableau des recommandations quotidiennes (1-3 recommandations)
 */
export const generateDailyRecommendations = (context: RecommendationContext): Recommendation[] => {
  try {
    const { user, recentTransactions, budgetDeviations, recentRecommendations } = context;
    
    // Analyse du profil utilisateur
    const profileAnalysis = analyzeUserProfile(user);
    
    // Analyse des résultats de quiz
    const quizAnalysis = analyzeQuizResults(user.preferences?.quizResults || []);
    
    // Analyse des transactions récentes
    const transactionAnalysis = analyzeRecentTransactions(recentTransactions);
    
    // Analyse des déviations budgétaires
    const deviationAnalysis = analyzeBudgetDeviations(budgetDeviations);
    
    // Génération des recommandations candidates
    const candidateRecommendations = generateCandidateRecommendations(
      profileAnalysis,
      quizAnalysis,
      transactionAnalysis,
      deviationAnalysis
    );
    
    // Calcul des scores de pertinence
    const scoredRecommendations = candidateRecommendations.map(rec => ({
      ...rec,
      relevance_score: scoreRecommendation(rec, context)
    }));
    
    // Filtrage et tri
    const filteredRecommendations = scoredRecommendations
      .filter(rec => rec.relevance_score >= 60)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 3);
    
    return filteredRecommendations;
    
  } catch (error) {
    console.error('Erreur lors de la génération des recommandations quotidiennes:', error);
    return generateFallbackRecommendations();
  }
};

/**
 * Détecte les déclencheurs contextuels et génère des recommandations
 * @param context - Contexte de génération des recommandations
 * @returns Tableau des recommandations contextuelles
 */
export const detectContextualTriggers = (context: RecommendationContext): Recommendation[] => {
  try {
    const { user, recentTransactions, budgetDeviations, recentRecommendations } = context;
    const triggeredRecommendations: Recommendation[] = [];
    
    // Déclencheur: Budget dépassé
    const overspentCategories = budgetDeviations.filter(
      dev => dev.percentage_consumed > (100 + TRIGGER_THRESHOLDS.BUDGET_OVERSHOT)
    );
    
    if (overspentCategories.length > 0) {
      const category = overspentCategories[0].category;
      triggeredRecommendations.push(createContextualRecommendation(
        'expense_reduction',
        'high',
        `Réduisez vos dépenses ${category}`,
        `Votre budget ${category} est dépassé de ${Math.round(overspentCategories[0].percentage_consumed - 100)}%.`,
        [
          "Identifiez les dépenses non essentielles",
          "Reportez les achats non urgents",
          "Cherchez des alternatives moins chères",
          "Ajustez votre budget pour le mois prochain"
        ],
        `Économisez ${Math.round(overspentCategories[0].current_spending * 0.2)} Ar ce mois`
      ));
    }
    
    // Déclencheur: Épargne faible
    const savingsPriority = user.preferences?.priorityAnswers?.savings_priority;
    if (savingsPriority === 'high' || savingsPriority === 'medium') {
      const currentSavings = calculateCurrentSavings(recentTransactions);
      const targetSavings = calculateTargetSavings(user);
      
      if (currentSavings < (targetSavings * TRIGGER_THRESHOLDS.SAVINGS_LOW / 100)) {
        triggeredRecommendations.push(createContextualRecommendation(
          'savings',
          'medium',
          'Augmentez votre épargne mensuelle',
          `Votre épargne actuelle (${formatAriary(currentSavings)}) est en dessous de votre objectif.`,
          [
            "Augmentez votre virement automatique d'épargne",
            "Réduisez une catégorie de dépenses non essentielle",
            "Vendez des objets non utilisés",
            "Cherchez des revenus complémentaires"
          ],
          `Atteignez ${formatAriary(targetSavings)} d'épargne mensuelle`
        ));
      }
    }
    
    // Déclencheur: Quiz inactif
    const lastQuizDate = getLastQuizDate(user.preferences?.quizResults || []);
    if (lastQuizDate && daysSince(lastQuizDate) > TRIGGER_THRESHOLDS.QUIZ_INACTIVE_DAYS) {
      triggeredRecommendations.push(createContextualRecommendation(
        'education',
        'low',
        'Testez vos connaissances financières',
        'Il y a plus de 7 jours que vous n\'avez pas fait de quiz éducatif.',
        [
          "Accédez à la section Quiz de l'application",
          "Choisissez un quiz adapté à votre niveau",
          "Lisez les explications après chaque réponse",
          "Planifiez un quiz hebdomadaire"
        ],
        "Améliorez votre culture financière"
      ));
    }
    
    // Déclencheur: Dépense importante
    const monthlyIncome = calculateMonthlyIncome(user);
    const largeExpenses = recentTransactions.filter(
      tx => tx.type === 'expense' && tx.amount > (monthlyIncome * TRIGGER_THRESHOLDS.LARGE_EXPENSE_PERCENT / 100)
    );
    
    if (largeExpenses.length > 0) {
      const expense = largeExpenses[0];
      triggeredRecommendations.push(createContextualRecommendation(
        'budget_optimization',
        'high',
        'Planifiez vos grosses dépenses',
        `Vous avez effectué une dépense importante de ${formatAriary(expense.amount)}.`,
        [
          "Créez un budget pour les grosses dépenses",
          "Épargnez chaque mois pour ces achats",
          "Comparez les prix avant d'acheter",
          "Négociez des facilités de paiement"
        ],
        "Évitez les achats impulsifs coûteux"
      ));
    }
    
    // Déclencheur: Milestone mensuel
    if (isFirstDayOfMonth()) {
      triggeredRecommendations.push(createContextualRecommendation(
        'savings',
        'medium',
        'Définissez vos objectifs du mois',
        'Nouveau mois, nouvelles opportunités d\'épargne et d\'optimisation.',
        [
          "Révisez vos objectifs financiers",
          "Ajustez votre budget mensuel",
          "Planifiez vos épargnes",
          "Identifiez une nouvelle habitude financière"
        ],
        "Démarrez le mois sur de bonnes bases"
      ));
    }
    
    return triggeredRecommendations;
    
  } catch (error) {
    console.error('Erreur lors de la détection des déclencheurs contextuels:', error);
    return [];
  }
};

/**
 * Calcule le score de pertinence d'une recommandation
 * @param recommendation - Recommandation à scorer
 * @param context - Contexte de l'utilisateur
 * @returns Score de pertinence entre 0 et 100
 */
export const scoreRecommendation = (recommendation: Recommendation, context: RecommendationContext): number => {
  try {
    const { user, recentTransactions, recentRecommendations } = context;
    
    // Score d'alignement avec le profil (30%)
    const profileScore = calculateProfileAlignment(recommendation, user);
    
    // Score de performance aux quiz (25%)
    const quizScore = calculateQuizPerformance(recommendation, user.preferences?.quizResults || []);
    
    // Score de comportement récent (20%)
    const behaviorScore = calculateBehaviorAlignment(recommendation, recentTransactions);
    
    // Score de contexte temporel (15%)
    const temporalScore = calculateTemporalRelevance(recommendation);
    
    // Score de diversification (10%)
    const diversificationScore = calculateDiversificationScore(recommendation, recentRecommendations);
    
    // Calcul du score final pondéré
    const finalScore = Math.round(
      profileScore * SCORING_WEIGHTS.PROFILE_ALIGNMENT +
      quizScore * SCORING_WEIGHTS.QUIZ_PERFORMANCE +
      behaviorScore * SCORING_WEIGHTS.RECENT_BEHAVIOR +
      temporalScore * SCORING_WEIGHTS.TEMPORAL_CONTEXT +
      diversificationScore * SCORING_WEIGHTS.DIVERSIFICATION
    );
    
    return Math.min(100, Math.max(0, finalScore));
    
  } catch (error) {
    console.error('Erreur lors du calcul du score de recommandation:', error);
    return 50; // Score par défaut en cas d'erreur
  }
};

/**
 * Filtre les recommandations par thème
 * @param recommendations - Liste des recommandations
 * @param theme - Thème à filtrer
 * @returns Recommandations filtrées par thème
 */
export const getRecommendationsByTheme = (
  recommendations: readonly Recommendation[],
  theme: RecommendationTheme
): Recommendation[] => {
  return recommendations.filter(rec => rec.theme === theme);
};

/**
 * Retourne les recommandations actives (non expirées et non supprimées)
 * @param recommendations - Liste des recommandations
 * @returns Recommandations actives
 */
export const getActiveRecommendations = (recommendations: readonly Recommendation[]): Recommendation[] => {
  const now = new Date();
  return recommendations.filter(rec => rec.expires_at > now);
};

/**
 * Calcule les statistiques des recommandations
 * @param recommendations - Liste des recommandations
 * @returns Statistiques détaillées
 */
export const getRecommendationStatistics = (recommendations: readonly Recommendation[]): RecommendationStatistics => {
  const active = getActiveRecommendations(recommendations);
  const expired = recommendations.filter(rec => rec.expires_at <= new Date());
  
  const byTheme = recommendations.reduce((acc, rec) => {
    acc[rec.theme] = (acc[rec.theme] || 0) + 1;
    return acc;
  }, {} as Record<RecommendationTheme, number>);
  
  const byPriority = recommendations.reduce((acc, rec) => {
    acc[rec.priority] = (acc[rec.priority] || 0) + 1;
    return acc;
  }, {} as Record<RecommendationPriority, number>);
  
  const averageScore = recommendations.length > 0 
    ? Math.round(recommendations.reduce((sum, rec) => sum + rec.relevance_score, 0) / recommendations.length)
    : 0;
  
  return {
    total: recommendations.length,
    byTheme,
    byPriority,
    averageScore,
    active: active.length,
    expired: expired.length
  };
};

// ===== FONCTIONS UTILITAIRES =====

/**
 * Analyse le profil utilisateur à partir des réponses prioritaires
 */
const analyzeUserProfile = (user: User) => {
  const answers = user.preferences?.priorityAnswers || {};
  return {
    financialGoals: answers.financial_goals || 'unknown',
    spendingHabits: answers.spending_habits || 'unknown',
    incomeLevel: answers.income_level || 'unknown',
    familySize: answers.family_size || 'unknown',
    savingsPriority: answers.savings_priority || 'unknown',
    educationLevel: answers.education_level || 'unknown'
  };
};

/**
 * Analyse les résultats de quiz pour identifier les lacunes
 */
const analyzeQuizResults = (quizResults: readonly QuizResult[]) => {
  if (quizResults.length === 0) {
    return { weakAreas: [], averageScore: 0 };
  }
  
  const averageScore = Math.round(
    quizResults.reduce((sum, result) => sum + result.percentage, 0) / quizResults.length
  );
  
  const weakAreas = quizResults
    .filter(result => result.percentage < 70)
    .map(result => result.quizId);
  
  return { weakAreas, averageScore };
};

/**
 * Analyse les transactions récentes pour identifier les patterns
 */
const analyzeRecentTransactions = (transactions: readonly Transaction[]) => {
  const last30Days = transactions.filter(tx => 
    new Date(tx.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  
  const categorySpending = last30Days.reduce((acc, tx) => {
    if (tx.type === 'expense') {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const topCategories = Object.entries(categorySpending)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);
  
  return { topCategories, totalSpending: Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0) };
};

/**
 * Analyse les déviations budgétaires
 */
const analyzeBudgetDeviations = (deviations: readonly DeviationAlert[]) => {
  const criticalDeviations = deviations.filter(dev => dev.severity === 'critical');
  const warningDeviations = deviations.filter(dev => dev.severity === 'warning');
  
  return {
    criticalCount: criticalDeviations.length,
    warningCount: warningDeviations.length,
    affectedCategories: deviations.map(dev => dev.category)
  };
};

/**
 * Génère les recommandations candidates basées sur les analyses
 */
const generateCandidateRecommendations = (
  profileAnalysis: any,
  quizAnalysis: any,
  transactionAnalysis: any,
  deviationAnalysis: any
): Recommendation[] => {
  const candidates: Recommendation[] = [];
  
  // Recommandations basées sur le profil
  if (profileAnalysis.savingsPriority === 'high') {
    candidates.push(...RECOMMENDATION_TEMPLATES.savings.map(template => 
      createRecommendationFromTemplate('daily', 'savings', template)
    ));
  }
  
  if (profileAnalysis.spendingHabits === 'impulsive') {
    candidates.push(...RECOMMENDATION_TEMPLATES.expense_reduction.map(template => 
      createRecommendationFromTemplate('daily', 'expense_reduction', template)
    ));
  }
  
  // Recommandations basées sur les quiz
  if (quizAnalysis.averageScore < 70) {
    candidates.push(...RECOMMENDATION_TEMPLATES.education.map(template => 
      createRecommendationFromTemplate('daily', 'education', template)
    ));
  }
  
  // Recommandations basées sur les transactions
  if (transactionAnalysis.topCategories.includes('loisirs')) {
    candidates.push(...RECOMMENDATION_TEMPLATES.expense_reduction.filter(template => 
      template.title.includes('loisirs') || template.title.includes('achats')
    ).map(template => createRecommendationFromTemplate('daily', 'expense_reduction', template)));
  }
  
  // Recommandations basées sur les déviations
  if (deviationAnalysis.criticalCount > 0) {
    candidates.push(...RECOMMENDATION_TEMPLATES.budget_optimization.map(template => 
      createRecommendationFromTemplate('daily', 'budget_optimization', template)
    ));
  }
  
  return candidates;
};

/**
 * Crée une recommandation à partir d'un template
 */
const createRecommendationFromTemplate = (
  type: RecommendationType,
  theme: RecommendationTheme,
  template: any
): Recommendation => {
  return {
    id: crypto.randomUUID(),
    type,
    theme,
    title: template.title,
    description: template.description,
    actionable_steps: template.steps,
    priority: 'medium',
    relevance_score: 0, // Sera calculé plus tard
    created_at: new Date(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimated_impact: template.estimated_impact
  };
};

/**
 * Crée une recommandation contextuelle
 */
const createContextualRecommendation = (
  theme: RecommendationTheme,
  priority: RecommendationPriority,
  title: string,
  description: string,
  steps: string[],
  impact: string
): Recommendation => {
  return {
    id: crypto.randomUUID(),
    type: 'contextual',
    theme,
    title,
    description,
    actionable_steps: steps,
    priority,
    relevance_score: 85, // Score élevé pour les recommandations contextuelles
    created_at: new Date(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    estimated_impact: impact
  };
};

/**
 * Calcule l'alignement avec le profil utilisateur
 */
const calculateProfileAlignment = (recommendation: Recommendation, user: User): number => {
  const answers = user.preferences?.priorityAnswers || {};
  let score = 50; // Score de base
  
  // Alignement avec les objectifs financiers
  if (recommendation.theme === 'savings' && answers.savings_priority === 'high') {
    score += 30;
  }
  
  if (recommendation.theme === 'expense_reduction' && answers.spending_habits === 'impulsive') {
    score += 25;
  }
  
  if (recommendation.theme === 'education' && answers.education_level === 'beginner') {
    score += 20;
  }
  
  return Math.min(100, score);
};

/**
 * Calcule la performance aux quiz
 */
const calculateQuizPerformance = (recommendation: Recommendation, quizResults: readonly QuizResult[]): number => {
  if (quizResults.length === 0) return 50;
  
  const averageScore = quizResults.reduce((sum, result) => sum + result.percentage, 0) / quizResults.length;
  
  // Plus le score est bas, plus on recommande l'éducation
  if (recommendation.theme === 'education') {
    return Math.max(20, 100 - averageScore);
  }
  
  return Math.min(100, averageScore);
};

/**
 * Calcule l'alignement avec le comportement récent
 */
const calculateBehaviorAlignment = (recommendation: Recommendation, transactions: readonly Transaction[]): number => {
  const last30Days = transactions.filter(tx => 
    new Date(tx.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  
  const categorySpending = last30Days.reduce((acc, tx) => {
    if (tx.type === 'expense') {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    }
    return acc;
  }, {} as Record<string, number>);
  
  let score = 50;
  
  // Recommandations d'optimisation si beaucoup de dépenses
  if (recommendation.theme === 'budget_optimization' && Object.keys(categorySpending).length > 5) {
    score += 20;
  }
  
  // Recommandations d'épargne si peu d'épargne
  if (recommendation.theme === 'savings' && Object.values(categorySpending).reduce((sum, amount) => sum + amount, 0) > 0) {
    score += 15;
  }
  
  return Math.min(100, score);
};

/**
 * Calcule la pertinence temporelle
 */
const calculateTemporalRelevance = (recommendation: Recommendation): number => {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();
  
  let score = 50;
  
  // Recommandations saisonnières
  if (month >= 1 && month <= 2 && recommendation.title.includes('école')) {
    score += 30; // Rentrée scolaire
  }
  
  if (month === 12 && recommendation.title.includes('fêtes')) {
    score += 25; // Période des fêtes
  }
  
  if (month >= 10 && month <= 12 && recommendation.theme === 'savings') {
    score += 20; // Fin d'année, épargne
  }
  
  // Recommandations du début de mois
  if (day <= 5 && recommendation.theme === 'budget_optimization') {
    score += 15;
  }
  
  return Math.min(100, score);
};

/**
 * Calcule le score de diversification
 */
const calculateDiversificationScore = (recommendation: Recommendation, recentRecommendations: readonly Recommendation[]): number => {
  const last7Days = recentRecommendations.filter(rec => 
    new Date(rec.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  
  const sameThemeCount = last7Days.filter(rec => rec.theme === recommendation.theme).length;
  
  // Pénalité pour répétition du même thème
  const penalty = sameThemeCount * 20;
  
  return Math.max(0, 100 - penalty);
};

/**
 * Génère des recommandations de fallback en cas d'erreur
 */
const generateFallbackRecommendations = (): Recommendation[] => {
  return [
    createRecommendationFromTemplate('daily', 'savings', RECOMMENDATION_TEMPLATES.savings[0]),
    createRecommendationFromTemplate('daily', 'education', RECOMMENDATION_TEMPLATES.education[0])
  ];
};

/**
 * Calcule l'épargne actuelle
 */
const calculateCurrentSavings = (transactions: readonly Transaction[]): number => {
  const last30Days = transactions.filter(tx => 
    new Date(tx.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );
  
  // Calculer l'épargne comme la différence entre revenus et dépenses
  const totalIncome = last30Days
    .filter(tx => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalExpenses = last30Days
    .filter(tx => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  return Math.max(0, totalIncome - totalExpenses);
};

/**
 * Calcule l'objectif d'épargne
 */
const calculateTargetSavings = (user: User): number => {
  const answers = user.preferences?.priorityAnswers || {};
  const incomeLevel = answers.income_level || 'unknown';
  
  const incomeRanges = {
    'low': 200000,
    'medium': 500000,
    'high': 1000000
  };
  
  const baseIncome = incomeRanges[incomeLevel as keyof typeof incomeRanges] || 300000;
  return baseIncome * 0.2; // 20% du revenu
};

/**
 * Calcule le revenu mensuel
 */
const calculateMonthlyIncome = (user: User): number => {
  const answers = user.preferences?.priorityAnswers || {};
  const incomeLevel = answers.income_level || 'unknown';
  
  const incomeRanges = {
    'low': 200000,
    'medium': 500000,
    'high': 1000000
  };
  
  return incomeRanges[incomeLevel as keyof typeof incomeRanges] || 300000;
};

/**
 * Obtient la date du dernier quiz
 */
const getLastQuizDate = (quizResults: readonly QuizResult[]): Date | null => {
  if (quizResults.length === 0) return null;
  
  const sortedResults = [...quizResults].sort((a, b) => 
    new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
  
  return new Date(sortedResults[0].completedAt);
};

/**
 * Calcule le nombre de jours depuis une date
 */
const daysSince = (date: Date): number => {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Vérifie si c'est le premier jour du mois
 */
const isFirstDayOfMonth = (): boolean => {
  return new Date().getDate() === 1;
};

/**
 * Formate un montant en Ariary
 */
const formatAriary = (amount: number): string => {
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0
  }).format(amount);
};
