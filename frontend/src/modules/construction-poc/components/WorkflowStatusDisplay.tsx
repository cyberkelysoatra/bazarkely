/**
 * Composant d'affichage du statut du workflow avec timeline visuelle
 * Affiche le statut actuel, la timeline des étapes, et les actions disponibles
 */

import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Truck,
  Package,
  XCircle,
  ArrowRight,
  FileText
} from 'lucide-react';
import type {
  PurchaseOrder
} from '../types/construction';
import { PurchaseOrderStatus, WorkflowAction } from '../types/construction';

interface WorkflowStatusDisplayProps {
  purchaseOrder: PurchaseOrder;
  availableActions?: WorkflowAction[];
}

interface TimelineStage {
  id: string;
  label: string;
  statuses: PurchaseOrderStatus[];
  icon: React.ReactNode;
}

/**
 * Mapping des statuts vers les couleurs (même que AGENT 5)
 */
const STATUS_COLORS: Record<PurchaseOrderStatus, string> = {
  draft: 'bg-gray-200 text-gray-800',
  pending_site_manager: 'bg-yellow-200 text-yellow-800',
  approved_site_manager: 'bg-green-200 text-green-800',
  checking_stock: 'bg-blue-200 text-blue-800',
  fulfilled_internal: 'bg-green-200 text-green-800',
  needs_external_order: 'bg-orange-200 text-orange-800',
  pending_management: 'bg-yellow-200 text-yellow-800',
  rejected_management: 'bg-red-200 text-red-800',
  approved_management: 'bg-green-200 text-green-800',
  submitted_to_supplier: 'bg-blue-200 text-blue-800',
  pending_supplier: 'bg-yellow-200 text-yellow-800',
  accepted_supplier: 'bg-green-200 text-green-800',
  rejected_supplier: 'bg-red-200 text-red-800',
  in_transit: 'bg-blue-200 text-blue-800',
  delivered: 'bg-green-200 text-green-800',
  completed: 'bg-green-600 text-white',
  cancelled: 'bg-red-200 text-red-800'
};

/**
 * Labels des statuts en français
 */
const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Brouillon',
  pending_site_manager: 'En attente Chef Chantier',
  approved_site_manager: 'Approuvé Chef Chantier',
  checking_stock: 'Vérification Stock',
  fulfilled_internal: 'Satisfait Interne',
  needs_external_order: 'Commande Externe Requise',
  pending_management: 'En attente Direction',
  rejected_management: 'Rejeté Direction',
  approved_management: 'Approuvé Direction',
  submitted_to_supplier: 'Soumis Fournisseur',
  pending_supplier: 'En attente Fournisseur',
  accepted_supplier: 'Accepté Fournisseur',
  rejected_supplier: 'Rejeté Fournisseur',
  in_transit: 'En Transit',
  delivered: 'Livré',
  completed: 'Terminé',
  cancelled: 'Annulé'
};

/**
 * Labels des actions en français
 */
const ACTION_LABELS: Record<WorkflowAction, string> = {
  submit: 'Soumettre',
  approve_site: 'Approuver',
  reject_site: 'Rejeter',
  approve_mgmt: 'Approuver Achat',
  reject_mgmt: 'Rejeter Achat',
  accept_supplier: 'Accepter',
  reject_supplier: 'Refuser',
  deliver: 'Marquer Livré',
  complete: 'Finaliser',
  cancel: 'Annuler'
};

const WorkflowStatusDisplay: React.FC<WorkflowStatusDisplayProps> = ({
  purchaseOrder,
  availableActions = []
}) => {
  /**
   * Définit les étapes de la timeline
   */
  const timelineStages: TimelineStage[] = useMemo(() => [
    {
      id: 'creation',
      label: 'Création',
      statuses: [PurchaseOrderStatus.DRAFT],
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'validation_chantier',
      label: 'Validation Chantier',
      statuses: [
        PurchaseOrderStatus.PENDING_SITE_MANAGER,
        PurchaseOrderStatus.APPROVED_SITE_MANAGER
      ],
      icon: <CheckCircle2 className="w-5 h-5" />
    },
    {
      id: 'verification_stock',
      label: 'Vérification Stock',
      statuses: [
        PurchaseOrderStatus.CHECKING_STOCK,
        PurchaseOrderStatus.FULFILLED_INTERNAL,
        PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER
      ],
      icon: <Package className="w-5 h-5" />
    },
    {
      id: 'approbation_direction',
      label: 'Approbation Direction',
      statuses: [
        PurchaseOrderStatus.PENDING_MANAGEMENT,
        PurchaseOrderStatus.APPROVED_MANAGEMENT,
        PurchaseOrderStatus.REJECTED_MANAGEMENT
      ],
      icon: <CheckCircle2 className="w-5 h-5" />
    },
    {
      id: 'fournisseur',
      label: 'Fournisseur',
      statuses: [
        PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER,
        PurchaseOrderStatus.PENDING_SUPPLIER,
        PurchaseOrderStatus.ACCEPTED_SUPPLIER,
        PurchaseOrderStatus.REJECTED_SUPPLIER
      ],
      icon: <Truck className="w-5 h-5" />
    },
    {
      id: 'livraison',
      label: 'Livraison',
      statuses: [
        PurchaseOrderStatus.IN_TRANSIT,
        PurchaseOrderStatus.DELIVERED
      ],
      icon: <Truck className="w-5 h-5" />
    },
    {
      id: 'finalisation',
      label: 'Finalisation',
      statuses: [PurchaseOrderStatus.COMPLETED],
      icon: <CheckCircle2 className="w-5 h-5" />
    }
  ], []);

  /**
   * Détermine l'état de chaque étape (completed, current, future)
   */
  const getStageState = (stage: TimelineStage): 'completed' | 'current' | 'future' => {
    const currentStatus = purchaseOrder.status;
    
    // Si l'étape contient le statut actuel, c'est l'étape courante
    if (stage.statuses.includes(currentStatus)) {
      return 'current';
    }
    
    // Trouver l'index de l'étape courante
    const currentStageIndex = timelineStages.findIndex(s => 
      s.statuses.includes(currentStatus)
    );
    const thisStageIndex = timelineStages.findIndex(s => s.id === stage.id);
    
    // Si cette étape est avant l'étape courante, elle est complétée
    if (thisStageIndex < currentStageIndex) {
      return 'completed';
    }
    
    // Sinon, c'est une étape future
    return 'future';
  };

  /**
   * Formate la date de dernière mise à jour
   */
  const formatLastUpdated = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `Mis à jour le ${day}/${month}/${year} à ${hours}:${minutes}`;
  };

  /**
   * Obtient l'icône du statut
   */
  const getStatusIcon = (status: PurchaseOrderStatus): React.ReactNode => {
    if (status === PurchaseOrderStatus.COMPLETED) {
      return <CheckCircle2 className="w-6 h-6" />;
    }
    if (status === PurchaseOrderStatus.CANCELLED) {
      return <XCircle className="w-6 h-6" />;
    }
    if ([
      PurchaseOrderStatus.IN_TRANSIT,
      PurchaseOrderStatus.DELIVERED
    ].includes(status)) {
      return <Truck className="w-6 h-6" />;
    }
    if ([
      PurchaseOrderStatus.PENDING_SITE_MANAGER,
      PurchaseOrderStatus.PENDING_MANAGEMENT,
      PurchaseOrderStatus.PENDING_SUPPLIER
    ].includes(status)) {
      return <Clock className="w-6 h-6" />;
    }
    return <CheckCircle2 className="w-6 h-6" />;
  };

  const currentStatus = purchaseOrder.status;
  const isCancelled = currentStatus === PurchaseOrderStatus.CANCELLED;

  return (
    <div className="space-y-6">
      {/* Section Statut Actuel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {STATUS_LABELS[currentStatus]}
            </h2>
            <p className="text-sm text-gray-600">
              {formatLastUpdated(purchaseOrder.updatedAt)}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full text-sm font-semibold ${STATUS_COLORS[currentStatus]}`}>
            <div className="flex items-center gap-2">
              {getStatusIcon(currentStatus)}
              <span>{STATUS_LABELS[currentStatus]}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Workflow */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Progression du Workflow
        </h3>
        
        {/* Desktop: Timeline horizontale */}
        <div className="hidden md:flex items-center justify-between">
          {timelineStages.map((stage, index) => {
            const state = getStageState(stage);
            const isCompleted = state === 'completed';
            const isCurrent = state === 'current';
            const isFuture = state === 'future';

            return (
              <React.Fragment key={stage.id}>
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-purple-500 text-white animate-pulse'
                        : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
                    }`}
                  >
                    {stage.icon}
                  </div>
                  <p
                    className={`text-xs mt-2 text-center max-w-[100px] ${
                      isCurrent ? 'font-semibold text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>
                {index < timelineStages.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile: Timeline verticale */}
        <div className="md:hidden space-y-4">
          {timelineStages.map((stage, index) => {
            const state = getStageState(stage);
            const isCompleted = state === 'completed';
            const isCurrent = state === 'current';

            return (
              <div key={stage.id} className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-purple-500 text-white animate-pulse'
                      : 'bg-gray-100 border-2 border-gray-300 text-gray-400'
                  }`}
                >
                  {stage.icon}
                </div>
                <div className="flex-1 pt-2">
                  <p
                    className={`text-sm ${
                      isCurrent ? 'font-semibold text-gray-900' : 'text-gray-600'
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>
                {index < timelineStages.length - 1 && (
                  <div
                    className={`absolute left-6 w-0.5 h-8 mt-12 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions Disponibles */}
      {availableActions.length > 0 && !isCancelled && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Actions disponibles pour vous :
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableActions.map((action) => (
              <button
                key={action}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {ACTION_LABELS[action]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Estimation de Finalisation */}
      {!isCancelled && currentStatus !== PurchaseOrderStatus.COMPLETED && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-gray-700">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-sm">
              {currentStatus === PurchaseOrderStatus.DELIVERED
                ? 'Finalisation estimée : En cours...'
                : 'En cours de traitement...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowStatusDisplay;
