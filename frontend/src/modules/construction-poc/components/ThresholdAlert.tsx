/**
 * Composant d'alerte pour les seuils de prix dépassés
 * Affiche une alerte lorsque le montant d'une commande dépasse les seuils configurés
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert } from '../../../components/UI';

/**
 * Type temporaire pour ThresholdCheckResult
 * Sera remplacé par le type du service pocThresholdService quand créé par AGENT03
 */
export interface ThresholdCheckResult {
  exceeded: boolean;
  applicableThreshold: {
    thresholdAmount: number;
    approvalLevel: 'site_manager' | 'management' | 'direction';
    severity?: 'warning' | 'critical';
  };
  exceededBy?: number;
  percentage?: number;
}

/**
 * Props du composant ThresholdAlert
 */
export interface ThresholdAlertProps {
  /** Résultat de la vérification de seuil */
  threshold: ThresholdCheckResult;
  /** Montant total de la commande */
  purchaseOrderTotal: number;
  /** Fonction appelée lors du dismiss (optionnel) */
  onDismiss?: () => void;
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Formate un montant en MGA
 */
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

/**
 * Obtient le label du niveau d'approbation requis
 */
const getApprovalLevelLabel = (level: string): string => {
  const labels: Record<string, string> = {
    site_manager: 'Chef Chantier',
    management: 'Direction',
    direction: 'Direction'
  };
  return labels[level] || level;
};

/**
 * Composant ThresholdAlert
 * Affiche une alerte si le seuil de prix est dépassé
 */
const ThresholdAlert: React.FC<ThresholdAlertProps> = ({
  threshold,
  purchaseOrderTotal,
  onDismiss,
  className
}) => {
  // Ne rien afficher si le seuil n'est pas dépassé
  if (!threshold.exceeded) {
    return null;
  }

  // Déterminer le type d'alerte (error si critical, warning sinon)
  const alertType = threshold.applicableThreshold.severity === 'critical' 
    ? 'error' 
    : 'warning';

  // Construire le message
  const message = `Seuil de prix dépassé! Montant: ${formatPrice(purchaseOrderTotal)} - Seuil: ${formatPrice(threshold.applicableThreshold.thresholdAmount)} - Approbation requise: ${getApprovalLevelLabel(threshold.applicableThreshold.approvalLevel)}`;

  // Ajouter le pourcentage de dépassement si disponible
  const exceededMessage = threshold.percentage 
    ? ` (${Math.round(threshold.percentage)}% de dépassement)`
    : threshold.exceededBy 
      ? ` (${formatPrice(threshold.exceededBy)} de dépassement)`
      : '';

  return (
    <Alert
      type={alertType}
      title="Alerte de seuil de prix"
      dismissible={!!onDismiss}
      onDismiss={onDismiss}
      className={`transition-all duration-300 ${className || ''}`}
      icon={<AlertTriangle className="h-5 w-5" />}
    >
      <div className="space-y-1">
        <p className="font-medium">{message}</p>
        {exceededMessage && (
          <p className="text-sm opacity-90">{exceededMessage}</p>
        )}
      </div>
    </Alert>
  );
};

export default ThresholdAlert;

