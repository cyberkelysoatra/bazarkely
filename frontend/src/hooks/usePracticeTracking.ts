/**
 * usePracticeTracking Hook - BazarKELY
 * Hook personnalisé pour le suivi des comportements de pratique dans le système de certification
 * 
 * @version 1.0
 * @date 2025-10-17
 * @author BazarKELY Team
 * 
 * @description
 * Ce hook fournit une interface simplifiée pour accéder et utiliser le système de suivi
 * des pratiques dans l'application BazarKELY. Il encapsule les fonctionnalités du store
 * de certification pour le suivi des trois comportements prioritaires : connexion quotidienne,
 * enregistrement de transactions, et utilisation de budgets.
 * 
 * @example
 * ```tsx
 * import { usePracticeTracking } from '../hooks/usePracticeTracking';
 * 
 * const MyComponent = () => {
 *   const {
 *     trackDailyLogin,
 *     trackTransaction,
 *     trackBudgetUsage,
 *     practiceScore,
 *     practiceMultiplier,
 *     behaviors
 *   } = usePracticeTracking();
 * 
 *   const handleLogin = async () => {
 *     // ... logique de connexion
 *     trackDailyLogin(); // Enregistrer la connexion quotidienne
 *   };
 * 
 *   const handleTransactionSave = async () => {
 *     // ... logique de sauvegarde de transaction
 *     trackTransaction(); // Enregistrer l'action de transaction
 *   };
 * 
 *   const handleBudgetUpdate = async () => {
 *     // ... logique de mise à jour de budget
 *     trackBudgetUsage(); // Enregistrer l'utilisation de budget
 *   };
 * 
 *   return (
 *     <div>
 *       <p>Score de pratique: {practiceScore}/18</p>
 *       <p>Multiplicateur: {practiceMultiplier}</p>
 *       <p>Série de connexions: {behaviors.dailyLoginStreak}</p>
 *       <p>Transactions enregistrées: {behaviors.transactionsRecordedCount}</p>
 *       <p>Budgets utilisés: {behaviors.budgetUsageCount}</p>
 *     </div>
 *   );
 * };
 * ```
 */

import { useCertificationStore } from '../store/certificationStore';
import type { PracticeBehaviorData } from '../types/certification';

/**
 * Interface de retour du hook usePracticeTracking
 * Définit la structure de l'objet retourné par le hook
 */
export interface UsePracticeTrackingReturn {
  /** Fonction pour enregistrer une connexion quotidienne */
  trackDailyLogin: () => void;
  /** Fonction pour enregistrer l'ajout d'une transaction */
  trackTransaction: () => void;
  /** Fonction pour enregistrer l'utilisation/mise à jour d'un budget */
  trackBudgetUsage: () => void;
  /** Score de pratique actuel (0-18 points) */
  practiceScore: number;
  /** Multiplicateur de pratique actuel (0.5-3.0) */
  practiceMultiplier: number;
  /** Données des comportements de pratique */
  behaviors: PracticeBehaviorData;
}

/**
 * Hook personnalisé pour le suivi des pratiques de certification
 * 
 * @returns {UsePracticeTrackingReturn} Objet contenant les méthodes de suivi et l'état actuel
 * 
 * @description
 * Ce hook fournit une interface simplifiée pour interagir avec le système de suivi
 * des pratiques. Il encapsule les appels au store de certification et expose uniquement
 * les fonctionnalités nécessaires pour le suivi des comportements.
 * 
 * Les trois comportements suivis sont :
 * - Connexion quotidienne (dailyLoginStreak)
 * - Enregistrement de transactions (transactionsRecordedCount)
 * - Utilisation de budgets (budgetUsageCount)
 * 
 * Chaque comportement contribue jusqu'à 6 points au score total (maximum 18 points).
 * Le multiplicateur peut augmenter ou diminuer le score final selon la consistance
 * des comportements.
 * 
 * @example
 * ```tsx
 * // Utilisation basique
 * const { trackDailyLogin, practiceScore } = usePracticeTracking();
 * 
 * // Utilisation complète
 * const {
 *   trackDailyLogin,
 *   trackTransaction,
 *   trackBudgetUsage,
 *   practiceScore,
 *   practiceMultiplier,
 *   behaviors
 * } = usePracticeTracking();
 * 
 * // Enregistrer une action
 * const handleUserAction = () => {
 *   trackDailyLogin(); // Incrémente la série de connexions
 * };
 * ```
 */
export const usePracticeTracking = (): UsePracticeTrackingReturn => {
  // Accéder aux méthodes et à l'état du store de certification
  const {
    trackDailyLogin: storeTrackDailyLogin,
    trackTransaction: storeTrackTransaction,
    trackBudgetUsage: storeTrackBudgetUsage,
    practiceTracking
  } = useCertificationStore();

  // Extraire les données nécessaires de l'état de suivi des pratiques
  const {
    practiceScore,
    multiplier: practiceMultiplier,
    behaviors
  } = practiceTracking;

  // Retourner l'interface simplifiée
  return {
    trackDailyLogin: storeTrackDailyLogin,
    trackTransaction: storeTrackTransaction,
    trackBudgetUsage: storeTrackBudgetUsage,
    practiceScore,
    practiceMultiplier,
    behaviors
  };
};

export default usePracticeTracking;
