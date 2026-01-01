/**
 * Types pour le système de suggestions d'objectifs d'épargne
 * BazarKELY - Session S32
 */

/**
 * Types de suggestions d'objectifs disponibles
 */
export type SuggestionType = 
  | 'emergency_fund' 
  | 'debt_payoff' 
  | 'savings_3months' 
  | 'savings_6months' 
  | 'vacation' 
  | 'education' 
  | 'retirement' 
  | 'investment' 
  | 'major_purchase' 
  | 'custom';

/**
 * Types de jalons (milestones) pour le suivi des objectifs
 */
export type MilestoneType = 
  | 'started' 
  | 'quarter' 
  | 'half' 
  | 'three_quarters' 
  | 'completed' 
  | 'exceeded';

/**
 * Interface pour un jalon d'objectif
 * Représente les étapes importantes dans la progression d'un objectif
 */
export interface GoalMilestone {
  id: string;
  goalId: string; // UUID de l'objectif associé
  orderId: number; // Ordre du jalon (1, 2, 3, etc.)
  milestoneType: MilestoneType; // Type de jalon
  milestoneValue?: number; // Valeur cible du jalon (optionnel)
  percentageReached?: number; // Pourcentage atteint (0-100, optionnel)
  achievedAt?: string; // ISO date string - Date d'atteinte du jalon
  celebrationShown: boolean; // Si la célébration a été affichée
  createdAt: string; // ISO date string - Date de création
}

/**
 * Interface pour une suggestion d'objectif
 * Contient toutes les informations nécessaires pour proposer un objectif à l'utilisateur
 */
export interface GoalSuggestion {
  type: SuggestionType; // Type de suggestion
  title: string; // Titre de la suggestion
  description: string; // Description détaillée
  targetAmount: number; // Montant cible suggéré
  deadline?: string; // ISO date string - Date limite suggérée (optionnel)
  priority: 'low' | 'medium' | 'high'; // Priorité de la suggestion
  reasoning: string; // Explication du pourquoi cette suggestion est proposée
  requiredMonthlyContribution: number; // Contribution mensuelle requise
  icon: string; // Nom de l'icône Lucide à utiliser
  category: string; // Catégorie de l'objectif
}

/**
 * Interface pour le profil financier de l'utilisateur
 * Utilisé pour générer des suggestions personnalisées
 */
export interface FinancialProfile {
  monthlyIncome: number; // Revenus mensuels
  monthlyExpenses: number; // Dépenses mensuelles
  savingsRate: number; // Taux d'épargne (0-100)
  hasEmergencyFund: boolean; // Possède un fonds d'urgence
  emergencyFundMonths: number; // Nombre de mois couverts par le fonds d'urgence
  debtAmount: number; // Montant total des dettes
  existingGoalsCount: number; // Nombre d'objectifs existants
  completedGoalsCount: number; // Nombre d'objectifs complétés
}

