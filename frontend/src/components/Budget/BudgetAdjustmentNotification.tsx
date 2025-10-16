/**
 * BudgetAdjustmentNotification Component - BazarKELY
 * Composant de notification pour les ajustements budgétaires suggérés
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 */

import * as React from 'react';
import { TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Alert from '../UI/Alert';
import type { CategoryBudgets, BudgetRecommendation } from '../../services/budgetIntelligenceService';

/**
 * Interface pour les props du composant BudgetAdjustmentNotification
 */
export interface BudgetAdjustmentNotificationProps {
  readonly currentBudgets: CategoryBudgets;
  readonly suggestedBudgets: CategoryBudgets;
  readonly recommendations: readonly BudgetRecommendation[];
  readonly onAccept: () => void;
  readonly onCustomize: () => void;
  readonly onDismiss: () => void;
}

/**
 * Mapping des catégories vers leurs emojis correspondants
 */
const CATEGORY_EMOJIS: Record<keyof CategoryBudgets, string> = {
  Alimentation: '🍚',
  Logement: '🏠',
  Transport: '🚗',
  Communication: '📱',
  Habillement: '👕',
  Santé: '🏥',
  Éducation: '📚',
  Loisirs: '🎉',
  Épargne: '💰',
  Autres: '🔧'
};

/**
 * Formate un montant en Ariary avec les séparateurs de milliers
 * @param amount - Montant à formater
 * @returns Montant formaté en Ariary
 */
const formatAriary = (amount: number): string => {
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Calcule le pourcentage de changement entre deux valeurs
 * @param current - Valeur actuelle
 * @param suggested - Valeur suggérée
 * @returns Pourcentage de changement formaté
 */
const calculatePercentageChange = (current: number, suggested: number): number => {
  if (current === 0) return 0;
  return parseFloat(((suggested - current) / current * 100).toFixed(1));
};

/**
 * Détermine si une catégorie a des changements significatifs
 * @param current - Budget actuel
 * @param suggested - Budget suggéré
 * @returns True si le changement est significatif (> 1%)
 */
const hasSignificantChange = (current: number, suggested: number): boolean => {
  const change = Math.abs(calculatePercentageChange(current, suggested));
  return change > 1; // Seuil de 1% pour considérer un changement significatif
};

/**
 * Composant de notification pour les ajustements budgétaires
 */
const BudgetAdjustmentNotification: React.FC<BudgetAdjustmentNotificationProps> = ({
  currentBudgets,
  suggestedBudgets,
  recommendations,
  onAccept,
  onCustomize,
  onDismiss
}) => {
  // Filtrage des catégories avec des changements significatifs
  const categoriesWithChanges = (Object.keys(currentBudgets) as (keyof CategoryBudgets)[])
    .filter(category => hasSignificantChange(currentBudgets[category], suggestedBudgets[category]));

  // Calcul du budget total pour vérifier la redistribution
  const currentTotal = Object.values(currentBudgets).reduce((sum: number, amount: number) => sum + amount, 0);
  const suggestedTotal = Object.values(suggestedBudgets).reduce((sum: number, amount: number) => sum + amount, 0);

  return (
    <div className="animate-slide-up transform translate-y-4 opacity-0 translate-y-0 opacity-100 transition-all duration-500">
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 hover:shadow-lg transition-all duration-300">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Ajustements Budget Suggérés
          </h2>
        </div>

        {/* Alert d'information */}
        <Alert 
          type="info" 
          className="mb-6"
        >
          <p className="text-sm">
            L'analyse de vos dépenses des 2 derniers mois suggère des améliorations 
            de votre budget pour optimiser votre gestion financière.
          </p>
        </Alert>

        {/* Tableau de comparaison */}
        {categoriesWithChanges.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              Comparaison des Budgets
            </h3>
            
            <div className="overflow-x-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-full">
                {/* En-têtes */}
                <div className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                  Catégorie
                </div>
                <div className="font-semibold text-gray-700 text-sm uppercase tracking-wide text-center">
                  Budget Actuel
                </div>
                <div className="font-semibold text-gray-700 text-sm uppercase tracking-wide text-center">
                  Budget Suggéré
                </div>

                {/* Lignes de données */}
                {categoriesWithChanges.map((category) => {
                  const currentAmount = currentBudgets[category];
                  const suggestedAmount = suggestedBudgets[category];
                  const percentageChange = calculatePercentageChange(currentAmount, suggestedAmount);
                  const isIncrease = suggestedAmount > currentAmount;
                  const isDecrease = suggestedAmount < currentAmount;

                  return (
                    <React.Fragment key={category}>
                      {/* Nom de la catégorie avec emoji */}
                      <div className="flex items-center space-x-2 py-2">
                        <span className="text-lg">
                          {CATEGORY_EMOJIS[category]}
                        </span>
                        <span className="font-medium text-gray-800">
                          {category}
                        </span>
                      </div>

                      {/* Budget actuel */}
                      <div className="text-center py-2">
                        <span className="text-gray-600">
                          {formatAriary(currentAmount)}
                        </span>
                      </div>

                      {/* Budget suggéré avec indicateur de changement */}
                      <div className="text-center py-2">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-medium text-gray-800">
                            {formatAriary(suggestedAmount)}
                          </span>
                          
                          {/* Indicateur de changement */}
                          <div className={`flex items-center space-x-1 ${
                            isIncrease 
                              ? 'text-red-600' 
                              : isDecrease 
                                ? 'text-green-600' 
                                : 'text-gray-500'
                          }`}>
                            {isIncrease && <ArrowUp className="w-4 h-4" />}
                            {isDecrease && <ArrowDown className="w-4 h-4" />}
                            <span className="text-sm font-medium">
                              {percentageChange > 0 ? '+' : ''}{percentageChange}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Section des recommandations */}
        {recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Pourquoi ces ajustements ?
            </h3>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-gray-800">
                      {recommendation.category} :
                    </span>{' '}
                    {recommendation.reason}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Message générique si pas de recommandations */}
        {recommendations.length === 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-3">
              Pourquoi ces ajustements ?
            </h3>
            <p className="text-sm text-gray-600">
              Ces ajustements sont basés sur l'analyse de vos habitudes de dépenses 
              récentes pour optimiser la répartition de votre budget mensuel.
            </p>
          </div>
        )}

        {/* Résumé de la redistribution */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Note :</span> Votre budget mensuel total reste 
              inchangé à {formatAriary(currentTotal)}. Ces ajustements redistribuent 
              simplement vos fonds pour mieux correspondre à vos habitudes de dépenses.
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onAccept}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Accepter tous les ajustements budgétaires suggérés"
          >
            Accepter les Ajustements
          </Button>
          
          <Button
            onClick={onCustomize}
            className="flex-1 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-medium py-3 px-6 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Personnaliser les ajustements budgétaires"
          >
            Personnaliser
          </Button>
          
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-gray-700 font-medium py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            aria-label="Ignorer les ajustements budgétaires"
          >
            Ignorer
          </button>
        </div>
      </Card>
    </div>
  );
};

export default BudgetAdjustmentNotification;
