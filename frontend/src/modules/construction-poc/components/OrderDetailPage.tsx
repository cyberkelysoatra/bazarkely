/**
 * Page de détails d'un bon de commande
 * Affiche toutes les informations de la commande avec workflow et historique
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Building2,
  Calendar,
  User,
  MapPin,
  Phone,
  FileText,
  DollarSign,
  Info,
  X
} from 'lucide-react';
import { Button, Card, Alert } from '../../../components/UI';
import { supabase } from '../../../lib/supabase';
import pocPurchaseOrderService from '../services/pocPurchaseOrderService';
import pocWorkflowService from '../services/pocWorkflowService';
import { useConstruction } from '../context/ConstructionContext';
import { getAuthenticatedUserId } from '../services/authHelpers';
import WorkflowStatusDisplay from './WorkflowStatusDisplay';
import WorkflowHistory from './WorkflowHistory';
import PriceMaskingWrapper from './PriceMaskingWrapper';
import ThresholdAlert from './ThresholdAlert';
import pocAlertService, { type Alert as PocAlert } from '../services/pocAlertService';
import pocConsumptionPlanService, { type ConsumptionSummary } from '../services/pocConsumptionPlanService';
import { canViewFullPrice, getPriceMaskingMessage } from '../utils/priceMasking';
import type {
  PurchaseOrder,
  PurchaseOrderStatus
} from '../types/construction';
import { WorkflowAction } from '../types/construction';
import { toast } from 'react-hot-toast';

/**
 * Mapping des statuts vers les couleurs de badge
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

interface Project {
  id: string;
  name: string;
  location?: string;
}

interface OrgUnit {
  id: string;
  name: string;
  code?: string;
  type?: string;
}

interface Supplier {
  id: string;
  name: string;
  location?: string;
}

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeCompany, userRole } = useConstruction();
  
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [orgUnit, setOrgUnit] = useState<OrgUnit | null>(null); // NOUVEAU: Pour commandes BCI
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [availableActions, setAvailableActions] = useState<WorkflowAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  
  // États pour les alertes et la consommation (Phase 3 Security)
  const [orderAlerts, setOrderAlerts] = useState<PocAlert[]>([]);
  const [consumptionImpact, setConsumptionImpact] = useState<ConsumptionSummary[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [showPriceMaskingExplanation, setShowPriceMaskingExplanation] = useState(false);

  /**
   * Charge les données de la commande
   */
  useEffect(() => {
    if (!id) {
      setError('ID de commande manquant');
      setLoading(false);
      return;
    }
    
    loadOrderData();
  }, [id]);

  /**
   * Charge les alertes de seuil pour cette commande (Phase 3 Security)
   */
  useEffect(() => {
    const loadOrderAlerts = async () => {
      if (!order?.id || !activeCompany?.id) return;

      try {
        setLoadingAlerts(true);
        const result = await pocAlertService.getAlerts(activeCompany.id, {
          alertType: 'threshold_exceeded',
          isRead: undefined // Récupérer toutes les alertes (lues et non lues)
        });

        if (result.success && result.data) {
          // Filtrer les alertes pour cette commande spécifique
          const filteredAlerts = result.data.filter(
            (alert) => alert.purchaseOrderId === order.id
          );
          setOrderAlerts(filteredAlerts);
        }
      } catch (err: any) {
        console.error('Erreur chargement alertes:', err);
        // Dégradation gracieuse: ne pas bloquer l'affichage si les alertes échouent
      } finally {
        setLoadingAlerts(false);
      }
    };

    loadOrderAlerts();
  }, [order?.id, activeCompany?.id]);

  /**
   * Charge l'impact de consommation pour les produits de cette commande (Phase 3 Security)
   */
  useEffect(() => {
    const loadConsumptionImpact = async () => {
      if (!order?.items || !activeCompany?.id || order.items.length === 0) {
        setConsumptionImpact([]);
        return;
      }

      try {
        // Extraire les productIds uniques des items de la commande
        const productIds = Array.from(
          new Set(order.items.map((item) => item.catalogItemId).filter(Boolean))
        );

        if (productIds.length === 0) {
          setConsumptionImpact([]);
          return;
        }

        // Pour chaque produit, récupérer les plans de consommation
        const impactSummaries: ConsumptionSummary[] = [];

        for (const productId of productIds) {
          // Récupérer les plans pour ce produit
          const plansResult = await pocConsumptionPlanService.getPlans(activeCompany.id, {
            productId
          });

          if (plansResult.success && plansResult.data) {
            // Pour chaque plan, calculer l'impact de cette commande
            for (const plan of plansResult.data) {
              // Trouver la quantité commandée pour ce produit dans cette commande
              const orderItem = order.items.find(
                (item) => item.catalogItemId === productId
              );
              const orderQuantity = orderItem ? orderItem.quantity : 0;

              if (orderQuantity > 0) {
                // Récupérer la consommation réelle actuelle
                const actualResult = await pocConsumptionPlanService.getActualConsumption(plan.id);
                const actualQuantity = actualResult.success && actualResult.data !== undefined
                  ? actualResult.data
                  : 0;

                // Calculer le pourcentage utilisé
                const percentageUsed = plan.plannedQuantity > 0
                  ? (actualQuantity / plan.plannedQuantity) * 100
                  : 0;

                // Récupérer le nom du produit
                const { data: product } = await supabase
                  .from('poc_products')
                  .select('name')
                  .eq('id', productId)
                  .single();

                // Récupérer le nom de l'org_unit si applicable
                let orgUnitName: string | undefined;
                if (plan.orgUnitId) {
                  const { data: orgUnitData } = await supabase
                    .from('poc_org_units')
                    .select('name')
                    .eq('id', plan.orgUnitId)
                    .single();
                  orgUnitName = orgUnitData?.name;
                }

                // Récupérer le nom du projet si applicable
                let projectName: string | undefined;
                if (plan.projectId) {
                  const { data: projectData } = await supabase
                    .from('poc_projects')
                    .select('name')
                    .eq('id', plan.projectId)
                    .single();
                  projectName = projectData?.name;
                }

                impactSummaries.push({
                  planId: plan.id,
                  productId: plan.productId,
                  productName: product?.name || 'Produit inconnu',
                  orgUnitId: plan.orgUnitId,
                  orgUnitName,
                  projectId: plan.projectId,
                  projectName,
                  plannedQuantity: plan.plannedQuantity,
                  actualQuantity,
                  percentageUsed,
                  alertTriggered: percentageUsed >= plan.alertThresholdPercentage,
                  period: plan.plannedPeriod
                });
              }
            }
          }
        }

        setConsumptionImpact(impactSummaries);
      } catch (err: any) {
        console.error('Erreur chargement impact consommation:', err);
        // Dégradation gracieuse: ne pas bloquer l'affichage si la consommation échoue
        setConsumptionImpact([]);
      }
    };

    loadConsumptionImpact();
  }, [order?.items, activeCompany?.id]);

  /**
   * Charge toutes les données nécessaires
   */
  const loadOrderData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);

      // Récupérer la commande
      const orderResult = await pocPurchaseOrderService.getById(id);
      
      if (!orderResult.success || !orderResult.data) {
        setError(orderResult.error || 'Commande introuvable');
        setLoading(false);
        return;
      }

      const orderData = orderResult.data;
      setOrder(orderData);

      // Récupérer le projet (pour BCE) ou l'unité organisationnelle (pour BCI)
      if (orderData.orderType === 'BCI' && orderData.orgUnitId) {
        // Charger l'unité organisationnelle pour BCI
        const { data: orgUnitData } = await supabase
          .from('poc_org_units')
          .select('id, name, code, type')
          .eq('id', orderData.orgUnitId)
          .single();
        
        if (orgUnitData) {
          setOrgUnit({
            id: orgUnitData.id,
            name: orgUnitData.name,
            code: orgUnitData.code || undefined,
            type: orgUnitData.type || undefined
          });
        }
      } else if (orderData.projectId) {
        // Charger le projet pour BCE
        const { data: projectData } = await supabase
          .from('poc_projects')
          .select('id, name, location')
          .eq('id', orderData.projectId)
          .single();
        
        if (projectData) {
          setProject({
            id: projectData.id,
            name: projectData.name,
            location: projectData.location || undefined
          });
        }
      }

      // Récupérer le fournisseur (uniquement pour BCE)
      if (orderData.supplierId) {
        const { data: supplierData } = await supabase
          .from('poc_companies')
          .select('id, name, address')
          .eq('id', orderData.supplierId)
          .single();
        
        if (supplierData) {
          setSupplier({
            id: supplierData.id,
            name: supplierData.name,
            location: supplierData.address || undefined
          });
        }
      }

      // Récupérer les actions disponibles
      const userIdResult = await getAuthenticatedUserId();
      if (userIdResult.success && userIdResult.data) {
        const actionsResult = await pocWorkflowService.getAvailableActions(
          id,
          userIdResult.data
        );
        
        if (actionsResult.success && actionsResult.data) {
          setAvailableActions(actionsResult.data);
        }
      }
    } catch (err: any) {
      console.error('Erreur chargement commande:', err);
      setError(err.message || 'Erreur lors du chargement de la commande');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gère l'exécution d'une action de workflow
   */
  const handleAction = async (action: WorkflowAction) => {
    if (!order || !id) return;

    setActionLoading({ ...actionLoading, [action]: true });

    try {
      let result;

      switch (action) {
        case WorkflowAction.SUBMIT:
          result = await pocPurchaseOrderService.submitForApproval(id);
          break;
        case WorkflowAction.APPROVE_SITE:
          result = await pocPurchaseOrderService.approveBySiteManager(id);
          break;
        case WorkflowAction.REJECT_SITE:
          result = await pocPurchaseOrderService.rejectBySiteManager(id, 'Rejeté par le chef de chantier');
          break;
        case WorkflowAction.APPROVE_MGMT:
          result = await pocPurchaseOrderService.approveByManagement(id);
          break;
        case WorkflowAction.REJECT_MGMT:
          result = await pocPurchaseOrderService.rejectByManagement(id, 'Rejeté par la direction');
          break;
        case WorkflowAction.ACCEPT_SUPPLIER:
          result = await pocPurchaseOrderService.acceptBySupplier(id);
          break;
        case WorkflowAction.REJECT_SUPPLIER:
          result = await pocPurchaseOrderService.rejectBySupplier(id, 'Rejeté par le fournisseur');
          break;
        case WorkflowAction.DELIVER:
          result = await pocPurchaseOrderService.markAsDelivered(id);
          break;
        case WorkflowAction.COMPLETE:
          result = await pocPurchaseOrderService.complete(id);
          break;
        case WorkflowAction.CANCEL:
          result = await pocPurchaseOrderService.cancel(id, 'Annulé par l\'utilisateur');
          break;
        default:
          throw new Error('Action non supportée');
      }

      if (result.success) {
        toast.success(`Action "${ACTION_LABELS[action]}" effectuée avec succès`);
        await loadOrderData(); // Recharger les données
      } else {
        toast.error(result.error || 'Erreur lors de l\'exécution de l\'action');
      }
    } catch (err: any) {
      console.error('Erreur action:', err);
      toast.error(err.message || 'Erreur lors de l\'exécution de l\'action');
    } finally {
      setActionLoading({ ...actionLoading, [action]: false });
    }
  };

  /**
   * Formate une date au format DD/MM/YYYY HH:MM
   */
  const formatDateTime = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  /**
   * Formate un prix en MGA
   */
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(price);
  };

  /**
   * Calcule le total de la commande
   */
  const calculateTotal = (): number => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/construction/orders')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <Card className="p-6">
            <Alert type="error" title="Erreur">
              {error || 'Commande introuvable'}
            </Alert>
            <div className="mt-4">
              <Button onClick={loadOrderData}>Réessayer</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* SECTION 1 - HEADER */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/construction/orders')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      {order.orderNumber}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                      Bon de commande
                    </p>
                  </div>
                  {/* Bouton d'explication pour chef_equipe (Phase 3 Security) */}
                  {userRole && !canViewFullPrice(userRole) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPriceMaskingExplanation(true)}
                      className="mt-2"
                    >
                      <Info className="w-4 h-4 mr-2" />
                      Pourquoi les prix sont masqués?
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status]}
              </span>
              {availableActions.length > 0 && (
                <div className="flex gap-2">
                  {availableActions.map((action) => (
                    <Button
                      key={action}
                      onClick={() => handleAction(action)}
                      disabled={actionLoading[action]}
                      variant={
                        [WorkflowAction.APPROVE_SITE, WorkflowAction.APPROVE_MGMT, WorkflowAction.ACCEPT_SUPPLIER, WorkflowAction.COMPLETE].includes(action)
                          ? 'primary'
                          : [WorkflowAction.CANCEL, WorkflowAction.REJECT_SITE, WorkflowAction.REJECT_MGMT, WorkflowAction.REJECT_SUPPLIER].includes(action)
                          ? 'outline'
                          : 'primary'
                      }
                      className={
                        [WorkflowAction.CANCEL, WorkflowAction.REJECT_SITE, WorkflowAction.REJECT_MGMT, WorkflowAction.REJECT_SUPPLIER].includes(action)
                          ? 'border-red-300 text-red-700 hover:bg-red-50'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }
                    >
                      {actionLoading[action] ? 'En cours...' : ACTION_LABELS[action]}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Alerte de seuil dépassé (Phase 3 Security) */}
          {orderAlerts.length > 0 && order && (
            <div className="mb-4">
              {orderAlerts
                .sort((a, b) => {
                  // Trier par sévérité: critical > warning > info
                  const severityOrder = { critical: 3, warning: 2, info: 1 };
                  return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
                })
                .slice(0, 1)
                .map((alert) => {
                  // Convertir l'alerte en ThresholdCheckResult pour ThresholdAlert
                  // Note: On crée une structure compatible même si les données exactes ne sont pas disponibles
                  const thresholdCheckResult = {
                    exceeded: true,
                    applicableThreshold: {
                      thresholdAmount: alert.thresholdExceededAmount || 0,
                      approvalLevel: 'management' as const,
                      severity: alert.severity === 'critical' ? 'critical' as const : 'warning' as const
                    },
                    exceededBy: alert.thresholdExceededAmount || undefined,
                    percentage: alert.thresholdExceededAmount && total > 0
                      ? ((alert.thresholdExceededAmount / (total - alert.thresholdExceededAmount)) * 100)
                      : undefined
                  };

                  return (
                    <div key={alert.id} className="mb-2">
                      <Alert
                        type={alert.severity === 'critical' ? 'error' : 'warning'}
                        title="Alerte de seuil de prix"
                        className="mb-2"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">
                            Cette commande a dépassé le seuil lors de la création
                          </p>
                          <p className="text-sm opacity-90">
                            {alert.message}
                          </p>
                          {alert.thresholdExceededAmount && (
                            <p className="text-sm opacity-90">
                              Montant dépassé: {formatPrice(alert.thresholdExceededAmount)}
                            </p>
                          )}
                        </div>
                      </Alert>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* SECTION 2 - INFORMATIONS GÉNÉRALES */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Informations Générales
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Affichage conditionnel: Org Unit (BCI) ou Projet (BCE) */}
                {order.orderType === 'BCI' && order.orgUnitId ? (
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Unité Organisationnelle</p>
                      <p className="font-medium text-gray-900">
                        {orgUnit?.name || order.orgUnitId || 'Non spécifié'}
                      </p>
                      {orgUnit?.code && (
                        <p className="text-xs text-gray-500 mt-1">Code: {orgUnit.code}</p>
                      )}
                      {orgUnit?.type && (
                        <p className="text-xs text-gray-500 mt-1">Type: {orgUnit.type === 'department' ? 'Département' : 'Équipe'}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Projet</p>
                      <p className="font-medium text-gray-900">
                        {project?.name || order.projectId || 'Non spécifié'}
                      </p>
                      {project?.location && (
                        <p className="text-xs text-gray-500 mt-1">{project.location}</p>
                      )}
                    </div>
                  </div>
                )}
                {/* Fournisseur uniquement pour BCE */}
                {order.orderType === 'BCE' && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Fournisseur</p>
                      <p className="font-medium text-gray-900">
                        {supplier?.name || order.supplierId || 'Non spécifié'}
                      </p>
                      {supplier?.location && (
                        <p className="text-xs text-gray-500 mt-1">{supplier.location}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Date de création</p>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Dernière mise à jour</p>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(order.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Montant total</p>
                    <PriceMaskingWrapper
                      price={total}
                      userRole={userRole || ''}
                      formatPrice={true}
                      className="font-semibold text-lg text-purple-600"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Créé par</p>
                    <p className="font-medium text-gray-900">
                      {order.creatorId || 'Non spécifié'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 3 - TABLE DES ARTICLES */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Articles ({order.items.length})
              </h2>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nom du produit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Quantité
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Prix unitaire
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.items.map((item, index) => (
                      <tr
                        key={item.id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <p className="font-medium">{item.itemName}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          <PriceMaskingWrapper
                            price={item.unitPrice}
                            userRole={userRole || ''}
                            formatPrice={true}
                            showExplanation={false}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                          <PriceMaskingWrapper
                            price={item.totalPrice}
                            userRole={userRole || ''}
                            formatPrice={true}
                            showExplanation={false}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        Sous-total:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                        <PriceMaskingWrapper
                          price={total}
                          userRole={userRole || ''}
                          formatPrice={true}
                          showExplanation={false}
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{item.itemName}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                        )}
                      </div>
                      <PriceMaskingWrapper
                        price={item.totalPrice}
                        userRole={userRole || ''}
                        formatPrice={true}
                        showExplanation={false}
                        className="font-semibold text-gray-900"
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                      <span className="flex items-center gap-1">
                        <PriceMaskingWrapper
                          price={item.unitPrice}
                          userRole={userRole || ''}
                          formatPrice={true}
                          showExplanation={false}
                        />
                        <span> / {item.unit}</span>
                      </span>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Sous-total:</span>
                    <PriceMaskingWrapper
                      price={total}
                      userRole={userRole || ''}
                      formatPrice={true}
                      showExplanation={false}
                      className="font-bold text-lg text-purple-600"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 4 - WORKFLOW VISUALIZATION */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                État du Workflow
              </h2>
              <WorkflowStatusDisplay
                purchaseOrder={order}
                availableActions={availableActions}
              />
            </Card>

            {/* SECTION 5 - HISTORIQUE WORKFLOW */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Historique
              </h2>
              <WorkflowHistory purchaseOrderId={order.id} />
            </Card>

            {/* SECTION 5 - INFORMATIONS DE LIVRAISON */}
            {(order.estimatedDeliveryDate || order.actualDeliveryDate) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Informations de Livraison
                </h2>
                <div className="space-y-3">
                  {order.estimatedDeliveryDate && (
                    <div>
                      <p className="text-sm text-gray-600">Date de livraison souhaitée</p>
                      <p className="font-medium text-gray-900">
                        {formatDateTime(order.estimatedDeliveryDate)}
                      </p>
                    </div>
                  )}
                  {order.actualDeliveryDate && (
                    <div>
                      <p className="text-sm text-gray-600">Date de livraison réelle</p>
                      <p className="font-medium text-gray-900">
                        {formatDateTime(order.actualDeliveryDate)}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* SECTION 6 - NOTES */}
            {(order.description || order.rejectionReason || order.cancellationReason) && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </h2>
                <div className="space-y-3">
                  {order.description && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Description</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{order.description}</p>
                    </div>
                  )}
                  {order.rejectionReason && (
                    <div>
                      <p className="text-sm text-red-600 mb-1">Raison du rejet</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{order.rejectionReason}</p>
                    </div>
                  )}
                  {order.cancellationReason && (
                    <div>
                      <p className="text-sm text-red-600 mb-1">Raison de l'annulation</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{order.cancellationReason}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* SECTION 7 - DOCUMENTS PLACEHOLDER */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Documents
              </h2>
              <p className="text-gray-600 text-sm">
                Fonctionnalité à venir - attachements de documents
              </p>
            </Card>
          </div>

          {/* Sidebar - Résumé */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Résumé
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Nombre d'articles</p>
                  <p className="text-lg font-semibold text-gray-900">{order.items.length}</p>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Sous-total</span>
                    <PriceMaskingWrapper
                      price={total}
                      userRole={userRole || ''}
                      formatPrice={true}
                      showExplanation={false}
                      className="text-sm font-semibold text-gray-900"
                    />
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      <PriceMaskingWrapper
                        price={total}
                        userRole={userRole || ''}
                        formatPrice={true}
                        showExplanation={false}
                        className="text-lg font-bold text-purple-600"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Section Impact sur les plans de consommation (Phase 3 Security) */}
                {consumptionImpact.length > 0 && (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Impact sur les plans de consommation
                    </h3>
                    <div className="space-y-3">
                      {consumptionImpact.map((impact) => {
                        // Trouver la quantité commandée pour ce produit
                        const orderItem = order.items.find(
                          (item) => item.catalogItemId === impact.productId
                        );
                        const orderQuantity = orderItem ? orderItem.quantity : 0;

                        return (
                          <div
                            key={impact.planId}
                            className={`p-3 rounded-lg border ${
                              impact.alertTriggered
                                ? 'bg-red-50 border-red-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {impact.productName}
                                </p>
                                {(impact.orgUnitName || impact.projectName) && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {impact.orgUnitName
                                      ? `Unité: ${impact.orgUnitName}`
                                      : `Projet: ${impact.projectName}`}
                                  </p>
                                )}
                              </div>
                              {impact.alertTriggered && (
                                <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">
                                  Alerte
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Contribution de cette commande:</span>
                                <span className="font-medium">
                                  {orderQuantity.toLocaleString('fr-FR')} / {impact.plannedQuantity.toLocaleString('fr-FR')}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Consommation actuelle:</span>
                                <span className="font-medium">
                                  {impact.actualQuantity.toLocaleString('fr-FR')} / {impact.plannedQuantity.toLocaleString('fr-FR')}
                                </span>
                              </div>
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-600">Pourcentage utilisé</span>
                                  <span className={`font-semibold ${
                                    impact.percentageUsed >= 100
                                      ? 'text-red-600'
                                      : impact.alertTriggered
                                      ? 'text-orange-600'
                                      : 'text-gray-600'
                                  }`}>
                                    {Math.round(impact.percentageUsed)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full transition-all ${
                                      impact.percentageUsed >= 100
                                        ? 'bg-red-500'
                                        : impact.alertTriggered
                                        ? 'bg-orange-500'
                                        : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min(impact.percentageUsed, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {consumptionImpact.length === 0 && (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Impact sur les plans de consommation
                    </h3>
                    <p className="text-xs text-gray-500">
                      Aucun plan de consommation impacté par cette commande
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Modal d'explication du masquage des prix (Phase 3 Security) */}
      {showPriceMaskingExplanation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Pourquoi les prix sont masqués?
              </h3>
              <button
                onClick={() => setShowPriceMaskingExplanation(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                {getPriceMaskingMessage(userRole || '')}
              </p>
              <div className="pt-4 border-t">
                <Button
                  variant="primary"
                  onClick={() => setShowPriceMaskingExplanation(false)}
                  className="w-full"
                >
                  Compris
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailPage;

// AGENT-4-ORDER-DETAIL-PAGE-COMPLETE

