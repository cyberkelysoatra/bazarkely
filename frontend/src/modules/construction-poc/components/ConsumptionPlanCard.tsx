/**
 * Composant de carte pour afficher les plans de consommation
 * Affiche les quantités planifiées vs réelles avec barre de progression
 */

import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

/**
 * Type temporaire pour ConsumptionSummary
 * Sera remplacé par le type du service pocConsumptionPlanService quand créé par AGENT04
 */
export interface ConsumptionSummary {
  id: string;
  productId: string;
  productName: string;
  plannedQuantity: number;
  actualQuantity: number;
  period: 'month' | 'quarter' | 'year';
  periodLabel?: string;
  alertTriggered?: boolean;
  alertMessage?: string;
  unit?: string;
}

/**
 * Props du composant ConsumptionPlanCard
 */
export interface ConsumptionPlanCardProps {
  /** Résumé de consommation à afficher */
  plan: ConsumptionSummary;
  /** Fonction appelée lors du clic sur la carte (optionnel) */
  onViewDetails?: () => void;
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Obtient le label de période
 */
const getPeriodLabel = (period: string, customLabel?: string): string => {
  if (customLabel) return customLabel;
  
  const labels: Record<string, string> = {
    month: 'Ce mois',
    quarter: 'Ce trimestre',
    year: 'Cette année'
  };
  return labels[period] || period;
};

/**
 * Calcule le pourcentage de consommation
 */
const getConsumptionPercentage = (
  actual: number,
  planned: number
): number => {
  if (planned === 0) return 0;
  return Math.min((actual / planned) * 100, 150); // Limiter à 150% pour l'affichage
};

/**
 * Obtient la couleur de la barre de progression selon le pourcentage
 */
const getProgressBarColor = (percentage: number): string => {
  if (percentage < 50) {
    return 'bg-green-500';
  } else if (percentage < 80) {
    return 'bg-yellow-500';
  } else if (percentage <= 100) {
    return 'bg-orange-500';
  } else {
    return 'bg-red-500';
  }
};

/**
 * Obtient la couleur de fond de la barre de progression
 */
const getProgressBarBgColor = (percentage: number): string => {
  if (percentage < 50) {
    return 'bg-green-100';
  } else if (percentage < 80) {
    return 'bg-yellow-100';
  } else if (percentage <= 100) {
    return 'bg-orange-100';
  } else {
    return 'bg-red-100';
  }
};

/**
 * Composant ConsumptionPlanCard
 * Affiche une carte avec les métriques de consommation vs planifiée
 */
const ConsumptionPlanCard: React.FC<ConsumptionPlanCardProps> = ({
  plan,
  onViewDetails,
  className
}) => {
  const percentage = getConsumptionPercentage(
    plan.actualQuantity,
    plan.plannedQuantity
  );
  const progressColor = getProgressBarColor(percentage);
  const progressBgColor = getProgressBarBgColor(percentage);
  const unit = plan.unit || 'unité';

  const handleClick = () => {
    if (onViewDetails) {
      onViewDetails();
    }
  };

  return (
    <div
      className={`
        bg-white rounded-lg shadow-md border border-gray-200 
        p-4 transition-all duration-300
        ${onViewDetails ? 'cursor-pointer hover:shadow-lg hover:border-blue-300' : ''}
        ${className || ''}
      `}
      onClick={handleClick}
      role={onViewDetails ? 'button' : undefined}
      tabIndex={onViewDetails ? 0 : undefined}
      onKeyDown={(e) => {
        if (onViewDetails && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onViewDetails();
        }
      }}
      aria-label={onViewDetails ? `Voir les détails de ${plan.productName}` : undefined}
    >
      {/* En-tête avec nom du produit et icône */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <h3 className="font-semibold text-gray-900 truncate">
            {plan.productName}
          </h3>
        </div>
        {plan.alertTriggered && (
          <div className="flex-shrink-0 ml-2">
            <div className="flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
              <AlertCircle className="h-3 w-3" />
              <span>Alerte</span>
            </div>
          </div>
        )}
      </div>

      {/* Période */}
      <div className="mb-3">
        <span className="text-xs text-gray-500 font-medium">
          {getPeriodLabel(plan.period, plan.periodLabel)}
        </span>
      </div>

      {/* Métriques planifiées vs réelles */}
      <div className="space-y-2 mb-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Planifié:</span>
          <span className="text-sm font-semibold text-gray-900">
            {plan.plannedQuantity.toLocaleString('fr-MG')} {unit}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Réel:</span>
          <span className={`text-sm font-semibold ${
            plan.actualQuantity > plan.plannedQuantity 
              ? 'text-red-600' 
              : 'text-gray-900'
          }`}>
            {plan.actualQuantity.toLocaleString('fr-MG')} {unit}
          </span>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="mb-2">
        <div className={`h-2 rounded-full overflow-hidden ${progressBgColor}`}>
          <div
            className={`h-full ${progressColor} transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Consommation: ${Math.round(percentage)}%`}
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">
            {Math.round(percentage)}% consommé
          </span>
          {percentage > 100 && (
            <span className="text-xs font-medium text-red-600">
              +{Math.round(percentage - 100)}% dépassement
            </span>
          )}
        </div>
      </div>

      {/* Message d'alerte si présent */}
      {plan.alertTriggered && plan.alertMessage && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-red-600 flex items-start gap-1">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span>{plan.alertMessage}</span>
          </p>
        </div>
      )}

      {/* Indicateur cliquable si onViewDetails fourni */}
      {onViewDetails && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <span className="text-xs text-blue-600 font-medium hover:text-blue-800">
            Voir les détails →
          </span>
        </div>
      )}
    </div>
  );
};

export default ConsumptionPlanCard;









