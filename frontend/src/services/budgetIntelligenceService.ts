/**
 * Budget Intelligence Service - BazarKELY
 * Service intelligent d'analyse budgétaire basé sur les réponses prioritaires et l'historique des transactions
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import type { Transaction } from '../types/index.js';

/**
 * Interface pour les budgets par catégorie
 * Mapping des catégories vers les montants recommandés en Ariary
 * Clés en minuscules sans accents pour correspondre au type TransactionCategory
 */
export interface CategoryBudgets {
  readonly alimentation: number;
  readonly logement: number;
  readonly transport: number;
  readonly communication: number;
  readonly vetements: number;
  readonly sante: number;
  readonly education: number;
  readonly loisirs: number;
  readonly solidarite: number;
  readonly epargne: number;
  readonly autres: number;
}

/**
 * Interface pour l'analyse budgétaire
 * Contient les écarts, tendances et recommandations
 */
export interface BudgetAnalysis {
  readonly deviations: Record<string, number>; // Pourcentage d'écart par catégorie
  readonly trends: readonly TrendPattern[];
  readonly recommendations: readonly BudgetRecommendation[];
}

/**
 * Interface pour les tendances de dépenses
 */
export interface TrendPattern {
  readonly category: string;
  readonly pattern: 'overspending' | 'underspending';
  readonly months: number;
  readonly average_deviation: number;
}

/**
 * Interface pour les recommandations budgétaires
 */
export interface BudgetRecommendation {
  readonly category: string;
  readonly new_amount: number;
  readonly reason: string;
}

/**
 * Interface pour les alertes de déviation
 */
export interface DeviationAlert {
  readonly category: string;
  readonly current_spending: number;
  readonly budget_allocated: number;
  readonly percentage_consumed: number;
  readonly percentage_month_elapsed: number;
  readonly severity: 'normal' | 'warning' | 'critical';
}

/**
 * Interface pour les revenus mensuels
 */
export interface MonthlyIncome {
  readonly range: string;
  readonly min_value: number;
  readonly max_value: number;
  readonly midpoint: number;
}

/**
 * Valeurs par défaut conservatrices en cas de données manquantes
 */
const DEFAULT_VALUES = {
  income: 750000, // 750,000 Ariary
  familySize: 2,
  savingsRate: 0.10, // 10%
  spendingHabits: 'balanced' as const
} as const;

/**
 * Allocation budgétaire standard pour Madagascar
 * Inclut la Solidarité (fihavanana) - essentielle dans la culture malgache
 * Clés en minuscules sans accents pour correspondre au type TransactionCategory
 */
const STANDARD_BUDGET_ALLOCATION = {
  alimentation: 0.36,    // 36% (ajusté pour atteindre 100%)
  logement: 0.24,        // 24% (ajusté pour atteindre 100%)
  transport: 0.10,       // 10% (maintenu)
  communication: 0.05,   // 5% (maintenu)
  sante: 0.05,           // 5% (maintenu)
  education: 0.10,       // 10% (maintenu)
  loisirs: 0.03,         // 3% (maintenu)
  vetements: 0.02,       // 2% (maintenu)
  solidarite: 0.05,      // 5% - Fihavanana : obligations familiales et communautaires
  // epargne sera calculée dynamiquement
} as const;

/**
 * Détecte la saison culturelle malgache pour ajuster le budget Solidarité
 * @param currentMonth - Mois actuel (0-11, où 0 = janvier)
 * @returns Multiplicateur saisonnier pour le budget Solidarité
 */
function detectCulturalSeason(currentMonth: number): number {
  // Saison famadihana (juillet-septembre) : +30%
  if (currentMonth >= 6 && currentMonth <= 8) { // 7, 8, 9
    return 1.3;
  }
  
  // Saison des mariages (avril-juin et octobre-novembre) : +20%
  if ((currentMonth >= 3 && currentMonth <= 5) || // 4, 5, 6
      (currentMonth >= 9 && currentMonth <= 10)) { // 10, 11
    return 1.2;
  }
  
  // Période normale
  return 1.0;
}

/**
 * Analyse l'historique des transactions pour détecter les dépenses de solidarité
 * @param transactions - Historique des transactions
 * @returns Montant moyen des dépenses de solidarité par mois
 */
function analyzeSolidaritySpending(transactions: Transaction[]): number {
  // Mots-clés liés à la solidarité dans les descriptions
  const solidarityKeywords = [
    'famille', 'parent', 'tante', 'oncle', 'cousin', 'cousine',
    'mariage', 'marié', 'mariée', 'noces', 'cérémonie',
    'funérailles', 'décès', 'mort', 'enterrement',
    'famadihana', 'retournement', 'exhumation',
    'aide', 'soutien', 'don', 'cadeau', 'solidarité',
    'communauté', 'village', 'fokontany', 'fokonolona',
    'baptême', 'baptême', 'communion', 'confirmation',
    'anniversaire', 'fête', 'célébration'
  ];
  
  // Filtrer les transactions de solidarité
  const solidarityTransactions = transactions.filter(transaction => {
    const description = (transaction.description || '').toLowerCase();
    return solidarityKeywords.some(keyword => description.includes(keyword));
  });
  
  if (solidarityTransactions.length === 0) {
    return 0; // Aucune dépense de solidarité détectée
  }
  
  // Calculer la moyenne mensuelle des dépenses de solidarité
  const totalSolidarity = solidarityTransactions.reduce((sum, transaction) => 
    sum + Math.abs(transaction.amount), 0
  );
  
  // Estimer le nombre de mois couverts par les transactions
  const months = new Set(solidarityTransactions.map(t => 
    new Date(t.date).getMonth()
  )).size;
  
  return months > 0 ? totalSolidarity / months : 0;
}

/**
 * Convertit les réponses de revenus mensuels en valeurs numériques
 * @param incomeAnswer - Réponse de la question monthly_income
 * @returns Objet MonthlyIncome avec range, min, max et midpoint
 */
export function getMonthlyIncomeValue(incomeAnswer: string): MonthlyIncome {
  switch (incomeAnswer) {
    case 'under_500k':
      return {
        range: 'Sous 500,000 Ar',
        min_value: 0,
        max_value: 500000,
        midpoint: 250000
      };
    case 'range_500k_1m':
      return {
        range: '500,000 - 1,000,000 Ar',
        min_value: 500000,
        max_value: 1000000,
        midpoint: 750000
      };
    case 'range_1m_2m':
      return {
        range: '1,000,000 - 2,000,000 Ar',
        min_value: 1000000,
        max_value: 2000000,
        midpoint: 1500000
      };
    case 'over_2m':
      return {
        range: 'Plus de 2,000,000 Ar',
        min_value: 2000000,
        max_value: 5000000,
        midpoint: 2500000
      };
    default:
      return {
        range: 'Non spécifié',
        min_value: DEFAULT_VALUES.income,
        max_value: DEFAULT_VALUES.income,
        midpoint: DEFAULT_VALUES.income
      };
  }
}

/**
 * Calcule le revenu mensuel réel à partir de l'historique des transactions
 * @param transactions - Historique des transactions
 * @returns Revenu mensuel réel calculé ou null si aucune donnée
 */
function calculateRealMonthlyIncome(transactions: Transaction[]): number | null {
  try {
    console.log('🔍 DEBUG calculateRealMonthlyIncome - Nombre total de transactions:', transactions.length);
    
    // Filtrer les transactions de revenus des 90 derniers jours
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    
    console.log('📅 DEBUG - Période analysée:', ninetyDaysAgo.toISOString(), 'à', now.toISOString());
    
    const incomeTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const isIncome = transaction.type === 'income';
      const isRecent = transactionDate >= ninetyDaysAgo;
      const isPositive = transaction.amount > 0;
      
      console.log('💰 DEBUG - Transaction:', {
        type: transaction.type,
        amount: transaction.amount,
        date: transaction.date,
        isIncome,
        isRecent,
        isPositive
      });
      
      return isIncome && isRecent && isPositive;
    });
    
    console.log('💵 DEBUG - Transactions de revenus trouvées:', incomeTransactions.length);
    
    if (incomeTransactions.length === 0) {
      console.log('❌ DEBUG - Aucune transaction de revenu trouvée');
      return null; // Aucune transaction de revenu trouvée
    }
    
    // Calculer le revenu total sur la période
    const totalIncome = incomeTransactions.reduce((sum, transaction) => 
      sum + transaction.amount, 0
    );
    
    console.log('💸 DEBUG - Revenu total sur la période:', totalIncome.toLocaleString('fr-FR'), 'Ar');
    
    // Calculer le nombre de mois couverts
    const months = new Set(incomeTransactions.map(t => 
      `${new Date(t.date).getFullYear()}-${new Date(t.date).getMonth()}`
    )).size;
    
    console.log('📊 DEBUG - Nombre de mois couverts:', months);
    
    // Retourner le revenu mensuel moyen
    const monthlyIncome = months > 0 ? Math.round(totalIncome / months) : null;
    console.log('🎯 DEBUG - Revenu mensuel calculé:', monthlyIncome ? monthlyIncome.toLocaleString('fr-FR') + ' Ar' : 'null');
    
    return monthlyIncome;
    
  } catch (error) {
    console.error('Erreur lors du calcul du revenu réel:', error);
    return null;
  }
}

/**
 * Retourne l'allocation budgétaire adaptative basée sur le niveau de revenu
 * @param monthlyIncome - Revenu mensuel en Ariary
 * @returns Objet d'allocation avec pourcentages adaptés au niveau de revenu
 */
function getAdaptiveAllocation(monthlyIncome: number): Record<keyof typeof STANDARD_BUDGET_ALLOCATION, number> {
  // Revenus très faibles (sous 500,000 Ar) - Priorité aux essentiels
  if (monthlyIncome < 500000) {
    return {
      alimentation: 0.50,    // 50% - Survie alimentaire prioritaire
      logement: 0.30,         // 30% - Logement essentiel
      transport: 0.08,        // 8% - Transport minimal
      communication: 0.03,    // 3% - Communication de base
      sante: 0.05,            // 5% - Santé essentielle
      education: 0.02,        // 2% - Éducation minimale
      loisirs: 0.01,          // 1% - Loisirs très limités
      vetements: 0.01,      // 1% - Habillement minimal
      solidarite: 0.00,       // 0% - Solidarité impossible à ce niveau
      // epargne sera calculée dynamiquement
    };
  }
  
  // Revenus faibles (500,000 - 1,000,000 Ar) - Équilibre essentiels/épargne
  if (monthlyIncome < 1000000) {
    return {
      alimentation: 0.45,    // 45% - Alimentation prioritaire
      logement: 0.25,         // 25% - Logement stable
      transport: 0.10,        // 10% - Transport nécessaire
      communication: 0.05,    // 5% - Communication importante
      sante: 0.05,            // 5% - Santé préventive
      education: 0.05,        // 5% - Éducation de base
      loisirs: 0.02,          // 2% - Loisirs limités
      vetements: 0.03,      // 3% - Habillement de base
      solidarite: 0.00,       // 0% - Solidarité très limitée
      // epargne sera calculée dynamiquement
    };
  }
  
  // Revenus moyens (1,000,000 - 2,000,000 Ar) - Allocation standard
  if (monthlyIncome < 2000000) {
    return {
      alimentation: 0.36,    // 36% - Allocation standard
      logement: 0.24,         // 24% - Logement confortable
      transport: 0.10,        // 10% - Transport régulier
      communication: 0.05,    // 5% - Communication complète
      sante: 0.05,            // 5% - Santé préventive
      education: 0.10,        // 10% - Éducation continue
      loisirs: 0.03,          // 3% - Loisirs modérés
      vetements: 0.02,      // 2% - Habillement correct
      solidarite: 0.05,       // 5% - Solidarité de base
      // epargne sera calculée dynamiquement
    };
  }
  
  // Revenus élevés (2,000,000 - 5,000,000 Ar) - Plus d'épargne et solidarité
  if (monthlyIncome < 5000000) {
    return {
      alimentation: 0.35,    // 35% - Alimentation de qualité
      logement: 0.24,         // 24% - Logement de qualité
      transport: 0.08,        // 8% - Transport confortable
      communication: 0.04,    // 4% - Communication avancée
      sante: 0.05,            // 5% - Santé préventive
      education: 0.08,        // 8% - Éducation continue
      loisirs: 0.05,          // 5% - Loisirs variés
      vetements: 0.03,      // 3% - Habillement de qualité
      solidarite: 0.08,       // 8% - Solidarité renforcée
      // epargne sera calculée dynamiquement
    };
  }
  
  // Revenus très élevés (5,000,000+ Ar) - Épargne, solidarité et qualité de vie
  return {
    alimentation: 0.33,      // 33% - Alimentation premium
    logement: 0.24,           // 24% - Logement de standing
    transport: 0.06,          // 6% - Transport premium
    communication: 0.04,      // 4% - Communication premium
    sante: 0.05,              // 5% - Santé préventive
    education: 0.06,          // 6% - Éducation continue
    loisirs: 0.08,            // 8% - Loisirs variés
    vetements: 0.04,        // 4% - Habillement de qualité
    solidarite: 0.10,         // 10% - Solidarité importante (fihavanana)
    // epargne sera calculée dynamiquement
  };
}

/**
 * Analyse les réponses prioritaires pour calculer les budgets recommandés par catégorie
 * @param priorityAnswers - Réponses des questions prioritaires
 * @param transactions - Historique des transactions pour calculer le revenu réel
 * @returns Budgets recommandés par catégorie en Ariary
 */
export function analyzePriorityAnswers(priorityAnswers: Record<string, string>, transactions: Transaction[] = []): CategoryBudgets {
  try {
    console.log('🚀 DEBUG analyzePriorityAnswers - Début du calcul');
    console.log('📊 DEBUG - Nombre de transactions reçues:', transactions.length);
    console.log('📋 DEBUG - Réponses prioritaires:', priorityAnswers);
    
    // Calculer le revenu mensuel réel à partir des transactions
    const realMonthlyIncome = calculateRealMonthlyIncome(transactions);
    
    // Extraction des réponses avec valeurs par défaut
    const monthlyIncomeAnswer = priorityAnswers.monthly_income || 'range_500k_1m';
    const familySituationAnswer = priorityAnswers.family_situation || 'two_people';
    const savingsPriorityAnswer = priorityAnswers.savings_priority || 'medium';
    const spendingHabitsAnswer = priorityAnswers.spending_habits || 'balanced';

    console.log('🔍 DEBUG - Réponse questionnaire revenu:', monthlyIncomeAnswer);

    // Utiliser le revenu réel si disponible, sinon fallback sur le questionnaire
    let monthlyIncome: number;
    if (realMonthlyIncome && realMonthlyIncome > 0) {
      monthlyIncome = realMonthlyIncome;
      console.log('💰 Utilisation du revenu réel calculé:', realMonthlyIncome.toLocaleString('fr-FR'), 'Ar');
    } else {
      // Fallback sur les réponses du questionnaire
      const incomeData = getMonthlyIncomeValue(monthlyIncomeAnswer);
      monthlyIncome = incomeData.midpoint;
      console.log('📋 Utilisation du revenu du questionnaire:', monthlyIncome.toLocaleString('fr-FR'), 'Ar');
    }
    
    console.log('🎯 DEBUG - Revenu final utilisé pour les calculs:', monthlyIncome.toLocaleString('fr-FR'), 'Ar');

    // Taille de famille
    const familySizeMap: Record<string, number> = {
      'one_person': 1,
      'two_people': 2,
      'three_people': 3,
      'four_people': 4,
      'five_plus': 5
    };
    const familySize = familySizeMap[familySituationAnswer] || DEFAULT_VALUES.familySize;

    // Taux d'épargne
    const savingsRateMap: Record<string, number> = {
      'low': 0.05,      // 5%
      'medium': 0.10,   // 10%
      'high': 0.15,     // 15%
      'critical': 0.20  // 20%
    };
    const savingsRate = savingsRateMap[savingsPriorityAnswer] || DEFAULT_VALUES.savingsRate;

    // Calcul du budget disponible après épargne
    const availableBudget = monthlyIncome * (1 - savingsRate);

    // Allocation adaptative basée sur le niveau de revenu réel
    const adaptiveAllocation = getAdaptiveAllocation(monthlyIncome);
    
    // Ajuster les allocations pour inclure l'épargne dans le total de 100%
    const totalAllocationWithoutSavings = Object.values(adaptiveAllocation).reduce((sum, val) => sum + val, 0);
    const adjustmentFactor = (1 - savingsRate) / totalAllocationWithoutSavings;
    
    const baseAllocation = { 
      alimentation: adaptiveAllocation.alimentation * adjustmentFactor,
      logement: adaptiveAllocation.logement * adjustmentFactor,
      transport: adaptiveAllocation.transport * adjustmentFactor,
      communication: adaptiveAllocation.communication * adjustmentFactor,
      sante: adaptiveAllocation.sante * adjustmentFactor,
      education: adaptiveAllocation.education * adjustmentFactor,
      loisirs: adaptiveAllocation.loisirs * adjustmentFactor,
      vetements: adaptiveAllocation.vetements * adjustmentFactor,
      solidarite: adaptiveAllocation.solidarite * adjustmentFactor,
      epargne: savingsRate,
      autres: 0.00
    };

    // Ajustements basés sur les habitudes de dépenses
    if (spendingHabitsAnswer === 'impulsive') {
      baseAllocation.epargne -= 0.02; // -2%
      baseAllocation.loisirs += 0.02; // +2%
    } else if (spendingHabitsAnswer === 'planned') {
      baseAllocation.epargne += 0.02; // +2%
      baseAllocation.loisirs -= 0.02; // -2%
    }

    // Ajustements basés sur la taille de famille
    if (familySize >= 4) {
      // Plus de personnes = plus d'alimentation et éducation, moins de loisirs et habillement
      const adjustmentFactor = (familySize - 2) * 0.02; // 2% par personne supplémentaire
      baseAllocation.alimentation += adjustmentFactor;
      baseAllocation.education += adjustmentFactor * 0.5;
      baseAllocation.loisirs -= adjustmentFactor * 0.5;
      baseAllocation.vetements -= adjustmentFactor * 0.3;
    }

    // Ajustement saisonnier pour la Solidarité (fihavanana)
    const currentMonth = new Date().getMonth(); // 0-11
    const seasonMultiplier = detectCulturalSeason(currentMonth);
    
    // Appliquer le multiplicateur saisonnier à la Solidarité
    baseAllocation.solidarite *= seasonMultiplier;
    
    // Ajuster les autres catégories pour maintenir l'équilibre
    if (seasonMultiplier > 1.0) {
      const solidarityIncrease = baseAllocation.solidarite * (seasonMultiplier - 1);
      // Réduire proportionnellement les catégories flexibles
      const flexibleCategories = ['loisirs', 'vetements', 'communication'];
      const reductionPerCategory = solidarityIncrease / flexibleCategories.length;
      
      flexibleCategories.forEach(category => {
        if (baseAllocation[category as keyof typeof baseAllocation] > reductionPerCategory) {
          baseAllocation[category as keyof typeof baseAllocation] -= reductionPerCategory;
        }
      });
    }

    // Normalisation pour s'assurer que la somme = 100%
    const totalAllocation = Object.values(baseAllocation).reduce((sum, value) => sum + value, 0);
    const normalizationFactor = 1 / totalAllocation;

    // Calcul des montants finaux en Ariary
    const budgets: CategoryBudgets = {
      alimentation: Math.round(availableBudget * baseAllocation.alimentation * normalizationFactor),
      logement: Math.round(availableBudget * baseAllocation.logement * normalizationFactor),
      transport: Math.round(availableBudget * baseAllocation.transport * normalizationFactor),
      communication: Math.round(availableBudget * baseAllocation.communication * normalizationFactor),
      vetements: Math.round(availableBudget * baseAllocation.vetements * normalizationFactor),
      sante: Math.round(availableBudget * baseAllocation.sante * normalizationFactor),
      education: Math.round(availableBudget * baseAllocation.education * normalizationFactor),
      loisirs: Math.round(availableBudget * baseAllocation.loisirs * normalizationFactor),
      solidarite: Math.round(availableBudget * baseAllocation.solidarite * normalizationFactor),
      epargne: Math.round(availableBudget * baseAllocation.epargne * normalizationFactor),
      autres: Math.round(availableBudget * baseAllocation.autres * normalizationFactor)
    };

    console.log('💵 DEBUG - Budgets calculés:');
    Object.entries(budgets).forEach(([category, amount]) => {
      console.log(`  ${category}: ${amount.toLocaleString('fr-FR')} Ar`);
    });
    
    const totalBudgets = Object.values(budgets).reduce((sum, amount) => sum + amount, 0);
    console.log('💰 DEBUG - Total des budgets:', totalBudgets.toLocaleString('fr-FR'), 'Ar');
    console.log('📊 DEBUG - Pourcentage du revenu:', ((totalBudgets / monthlyIncome) * 100).toFixed(2) + '%');

    return budgets;

  } catch (error) {
    console.error('Erreur lors de l\'analyse des réponses prioritaires:', error);
    
    // Retour des valeurs par défaut en cas d'erreur avec allocation adaptative
    const defaultIncome = DEFAULT_VALUES.income;
    const defaultAvailableBudget = defaultIncome * (1 - DEFAULT_VALUES.savingsRate);
    const fallbackAllocation = getAdaptiveAllocation(defaultIncome);
    
    return {
      alimentation: Math.round(defaultAvailableBudget * fallbackAllocation.alimentation),
      logement: Math.round(defaultAvailableBudget * fallbackAllocation.logement),
      transport: Math.round(defaultAvailableBudget * fallbackAllocation.transport),
      communication: Math.round(defaultAvailableBudget * fallbackAllocation.communication),
      vetements: Math.round(defaultAvailableBudget * fallbackAllocation.vetements),
      sante: Math.round(defaultAvailableBudget * fallbackAllocation.sante),
      education: Math.round(defaultAvailableBudget * fallbackAllocation.education),
      loisirs: Math.round(defaultAvailableBudget * fallbackAllocation.loisirs),
      solidarite: Math.round(defaultAvailableBudget * fallbackAllocation.solidarite),
      epargne: Math.round(defaultAvailableBudget * DEFAULT_VALUES.savingsRate),
      autres: Math.round(defaultAvailableBudget * 0.00)
    };
  }
}

/**
 * Analyse l'historique des transactions pour détecter les patterns de dépenses
 * @param transactions - Tableau des transactions
 * @param currentBudgets - Budgets actuels par catégorie
 * @returns Analyse budgétaire avec écarts, tendances et recommandations
 */
export function analyzeTransactionHistory(
  transactions: Transaction[],
  currentBudgets: CategoryBudgets
): BudgetAnalysis {
  try {
    const deviations: Record<string, number> = {};
    const trends: TrendPattern[] = [];
    const recommendations: BudgetRecommendation[] = [];

    // Groupement des transactions par mois et catégorie
    const monthlySpending = new Map<string, Map<string, number>>();
    
    transactions.forEach(transaction => {
      if (transaction.type === 'expense') {
        const monthKey = `${transaction.date.getFullYear()}-${transaction.date.getMonth() + 1}`;
        const category = transaction.category;
        
        if (!monthlySpending.has(monthKey)) {
          monthlySpending.set(monthKey, new Map());
        }
        
        const monthData = monthlySpending.get(monthKey)!;
        const currentAmount = monthData.get(category) || 0;
        monthData.set(category, currentAmount + transaction.amount);
      }
    });

    // Calcul des écarts par catégorie
    const categoryNames = Object.keys(currentBudgets) as (keyof CategoryBudgets)[];
    
    categoryNames.forEach(category => {
      const budgetedAmount = currentBudgets[category];
      if (budgetedAmount === 0) {
        deviations[category] = 0;
        return;
      }

      // Calcul de la moyenne des dépenses sur les 3 derniers mois
      const recentMonths = Array.from(monthlySpending.keys())
        .sort()
        .slice(-3);
      
      let totalSpent = 0;
      let monthsWithData = 0;

      recentMonths.forEach(monthKey => {
        const monthData = monthlySpending.get(monthKey);
        if (monthData && monthData.has(category)) {
          totalSpent += monthData.get(category)!;
          monthsWithData++;
        }
      });

      if (monthsWithData > 0) {
        const averageSpent = totalSpent / monthsWithData;
        const deviation = ((averageSpent - budgetedAmount) / budgetedAmount) * 100;
        deviations[category] = Math.round(deviation * 100) / 100; // Arrondi à 2 décimales
      } else {
        deviations[category] = 0;
      }
    });

    // Détection des tendances sur 2+ mois consécutifs
    const sortedMonths = Array.from(monthlySpending.keys()).sort();
    
    categoryNames.forEach(category => {
      const categoryTrends: { month: string; deviation: number }[] = [];
      
      sortedMonths.forEach(monthKey => {
        const monthData = monthlySpending.get(monthKey);
        const budgetedAmount = currentBudgets[category];
        
        if (monthData && monthData.has(category) && budgetedAmount > 0) {
          const spent = monthData.get(category)!;
          const deviation = ((spent - budgetedAmount) / budgetedAmount) * 100;
          categoryTrends.push({ month: monthKey, deviation });
        }
      });

      // Détection de patterns consécutifs
      if (categoryTrends.length >= 2) {
        let consecutiveOverspending = 0;
        let consecutiveUnderspending = 0;
        let totalDeviation = 0;

        categoryTrends.forEach(trend => {
          if (trend.deviation > 15) {
            consecutiveOverspending++;
            consecutiveUnderspending = 0;
            totalDeviation += trend.deviation;
          } else if (trend.deviation < -15) {
            consecutiveUnderspending++;
            consecutiveOverspending = 0;
            totalDeviation += trend.deviation;
          } else {
            consecutiveOverspending = 0;
            consecutiveUnderspending = 0;
            totalDeviation = 0;
          }
        });

        if (consecutiveOverspending >= 2) {
          trends.push({
            category,
            pattern: 'overspending',
            months: consecutiveOverspending,
            average_deviation: totalDeviation / consecutiveOverspending
          });
        } else if (consecutiveUnderspending >= 2) {
          trends.push({
            category,
            pattern: 'underspending',
            months: consecutiveUnderspending,
            average_deviation: totalDeviation / consecutiveUnderspending
          });
        }
      }
    });

    // Génération des recommandations basées sur les tendances
    trends.forEach(trend => {
      const currentBudget = currentBudgets[trend.category as keyof CategoryBudgets];
      const adjustmentFactor = Math.min(Math.abs(trend.average_deviation) / 100, 0.20); // Max 20% d'ajustement
      
      let newAmount: number;
      let reason: string;

      if (trend.pattern === 'overspending') {
        newAmount = Math.round(currentBudget * (1 + adjustmentFactor));
        reason = `Dépenses excédentaires détectées sur ${trend.months} mois consécutifs (+${Math.round(trend.average_deviation)}%)`;
      } else {
        newAmount = Math.round(currentBudget * (1 - adjustmentFactor));
        reason = `Dépenses insuffisantes détectées sur ${trend.months} mois consécutifs (${Math.round(trend.average_deviation)}%)`;
      }

      recommendations.push({
        category: trend.category,
        new_amount: newAmount,
        reason
      });
    });

    return {
      deviations,
      trends,
      recommendations
    };

  } catch (error) {
    console.error('Erreur lors de l\'analyse de l\'historique des transactions:', error);
    
    return {
      deviations: {},
      trends: [],
      recommendations: []
    };
  }
}

/**
 * Détecte les déviations de dépenses pour le mois en cours
 * @param transactions - Transactions du mois en cours
 * @param currentBudgets - Budgets actuels par catégorie
 * @returns Alertes de déviation avec niveau de sévérité
 */
export function detectSpendingDeviation(
  transactions: Transaction[],
  currentBudgets: CategoryBudgets
): DeviationAlert[] {
  try {
    const alerts: DeviationAlert[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysElapsed = now.getDate();
    const percentageMonthElapsed = (daysElapsed / daysInMonth) * 100;

    // Filtrage des transactions du mois en cours
    const currentMonthTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear &&
             transaction.type === 'expense';
    });

    // Calcul des dépenses par catégorie pour le mois en cours
    const categorySpending: Record<string, number> = {};
    currentMonthTransactions.forEach(transaction => {
      const category = transaction.category;
      categorySpending[category] = (categorySpending[category] || 0) + transaction.amount;
    });

    // Analyse de chaque catégorie
    const categoryNames = Object.keys(currentBudgets) as (keyof CategoryBudgets)[];
    
    categoryNames.forEach(category => {
      const budgetedAmount = currentBudgets[category];
      const currentSpending = categorySpending[category] || 0;
      
      if (budgetedAmount > 0) {
        const percentageConsumed = (currentSpending / budgetedAmount) * 100;
        const expectedConsumption = percentageMonthElapsed;
        const deviation = percentageConsumed - expectedConsumption;

        let severity: 'normal' | 'warning' | 'critical';
        
        if (Math.abs(deviation) > 40) {
          severity = 'critical';
        } else if (Math.abs(deviation) > 20) {
          severity = 'warning';
        } else {
          severity = 'normal';
        }

        // Génération d'alerte seulement si déviation significative
        if (Math.abs(deviation) > 20) {
          alerts.push({
            category,
            current_spending: Math.round(currentSpending),
            budget_allocated: Math.round(budgetedAmount),
            percentage_consumed: Math.round(percentageConsumed * 100) / 100,
            percentage_month_elapsed: Math.round(percentageMonthElapsed * 100) / 100,
            severity
          });
        }
      }
    });

    return alerts;

  } catch (error) {
    console.error('Erreur lors de la détection des déviations de dépenses:', error);
    return [];
  }
}

/**
 * Calcule les budgets ajustés basés sur l'analyse des tendances
 * @param currentBudgets - Budgets actuels par catégorie
 * @param analysis - Analyse budgétaire avec tendances et recommandations
 * @returns Nouveaux budgets avec ajustements automatiques appliqués
 */
export function calculateAdjustedBudgets(
  currentBudgets: CategoryBudgets,
  analysis: BudgetAnalysis
): CategoryBudgets {
  try {
    // Application des ajustements seulement pour les tendances cohérentes
    const adjustedBudgets = { ...currentBudgets };
    let totalAdjustment = 0;

    // Application des recommandations pour les tendances de 2+ mois
    analysis.recommendations.forEach(recommendation => {
      const category = recommendation.category as keyof CategoryBudgets;
      const currentAmount = adjustedBudgets[category];
      const newAmount = recommendation.new_amount;
      
      // Limitation des ajustements (max 20% d'augmentation, 15% de diminution)
      const maxIncrease = currentAmount * 1.20;
      const maxDecrease = currentAmount * 0.85;
      
      let finalAmount: number;
      if (newAmount > maxIncrease) {
        finalAmount = maxIncrease;
      } else if (newAmount < maxDecrease) {
        finalAmount = maxDecrease;
      } else {
        finalAmount = newAmount;
      }

      const adjustment = finalAmount - currentAmount;
      totalAdjustment += adjustment;
      
      adjustedBudgets[category] = Math.round(finalAmount);
    });

    // Équilibrage du budget total
    if (Math.abs(totalAdjustment) > 0) {
      // Redistribution de l'excédent vers l'épargne ou compensation via Loisirs/Autres
      if (totalAdjustment > 0) {
        // Excédent : ajouter à l'épargne
        adjustedBudgets.epargne = Math.round(adjustedBudgets.epargne + totalAdjustment);
      } else {
        // Déficit : réduire Loisirs et Autres proportionnellement
        const deficit = Math.abs(totalAdjustment);
        const loisirsReduction = Math.round(deficit * 0.6); // 60% sur Loisirs
        const autresReduction = Math.round(deficit * 0.4); // 40% sur Autres
        
        adjustedBudgets.loisirs = Math.max(0, Math.round(adjustedBudgets.loisirs - loisirsReduction));
        adjustedBudgets.autres = Math.max(0, Math.round(adjustedBudgets.autres - autresReduction));
      }
    }

    return adjustedBudgets;

  } catch (error) {
    console.error('Erreur lors du calcul des budgets ajustés:', error);
    return currentBudgets; // Retour des budgets actuels en cas d'erreur
  }
}

/**
 * Fonction utilitaire pour obtenir un résumé des budgets par catégorie
 * @param budgets - Budgets par catégorie
 * @returns Résumé formaté des budgets
 */
export function getBudgetSummary(budgets: CategoryBudgets): string {
  const total = Object.values(budgets).reduce((sum, amount) => sum + amount, 0);
  const summary = Object.entries(budgets)
    .map(([category, amount]) => `${category}: ${amount.toLocaleString('fr-FR')} Ar`)
    .join('\n');
  
  return `Résumé des budgets (Total: ${total.toLocaleString('fr-FR')} Ar):\n${summary}`;
}
