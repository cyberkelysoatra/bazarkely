/**
 * Liste des bons de commande avec filtres, statuts et actions de workflow
 * Affiche tous les bons de commande de l'entreprise active avec filtres et actions basées sur les permissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Plus, Search, Filter, X, CheckCircle, XCircle, Truck, Package, AlertCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import pocPurchaseOrderService from '../services/pocPurchaseOrderService';
import workflowService from '../services/pocWorkflowService';
import { getAuthenticatedUserId } from '../services/authHelpers';
import { useConstruction } from '../context/ConstructionContext';
import type { PurchaseOrder, PurchaseOrderStatus, OrgUnit } from '../types/construction';
import { WorkflowAction } from '../types/construction';
import { toast } from 'react-hot-toast';
// Imports pour masquage de prix et alertes
import PriceMaskingWrapper from './PriceMaskingWrapper';
import pocAlertService from '../services/pocAlertService';
import { canViewFullPrice } from '../utils/priceMasking';
import type { Alert, AlertType } from '../services/pocAlertService';
import { Alert as UIAlert } from '../../../components/UI';

/**
 * Interface pour les filtres
 */
interface OrderFilters {
  search: string;
  status: PurchaseOrderStatus | '';
  projectId: string;
  orgUnitId: string; // NOUVEAU: Filtre pour unités organisationnelles (BCI)
  dateFrom: string;
  dateTo: string;
}

/**
 * Interface pour une action en attente de confirmation
 */
interface PendingAction {
  orderId: string;
  action: WorkflowAction;
  label: string;
}

/**
 * Mapping des statuts vers les labels français
 */
const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  draft: 'Brouillon',
  pending_site_manager: 'En attente Chef Chantier',
  approved_site_manager: 'Approuvé Chef Chantier',
  checking_stock: 'Vérification stock',
  fulfilled_internal: 'Satisfait interne',
  needs_external_order: 'Commande externe requise',
  pending_management: 'En attente Direction',
  rejected_management: 'Rejeté Direction',
  approved_management: 'Approuvé Direction',
  submitted_to_supplier: 'Soumis Fournisseur',
  pending_supplier: 'En attente Fournisseur',
  accepted_supplier: 'Accepté Fournisseur',
  rejected_supplier: 'Rejeté Fournisseur',
  in_transit: 'En transit',
  delivered: 'Livré',
  completed: 'Terminé',
  cancelled: 'Annulé'
};

/**
 * Format order number for display based on status
 * - Draft orders show "NOUVEAU"
 * - Other orders show "{orderType}_N°{number}" (e.g., "BCI_N°25/023")
 */
const formatOrderNumberDisplay = (order: PurchaseOrder): string => {
  if (order.status === 'draft') {
    return 'NOUVEAU';
  }
  
  // If order_number exists and is not the old format, use it
  if (order.orderNumber && !order.orderNumber.startsWith('PO-')) {
    return `${order.orderType || 'BCE'}_N°${order.orderNumber}`;
  }
  
  // Fallback for old format or missing number
  if (order.orderNumber && order.orderNumber.startsWith('PO-')) {
    return 'NOUVEAU'; // Old format treated as not yet assigned
  }
  
  return 'NOUVEAU';
};

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
 * Mapping des actions vers les labels français
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

const POCOrdersList: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany, userRole } = useConstruction();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [availableActions, setAvailableActions] = useState<Record<string, WorkflowAction[]>>({});
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    status: '',
    projectId: '',
    orgUnitId: '', // NOUVEAU
    dateFrom: '',
    dateTo: ''
  });
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [orgUnits, setOrgUnits] = useState<Array<{ id: string; name: string; code?: string }>>([]); // NOUVEAU
  // État pour les alertes de seuil
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  // État pour le message de masquage de prix (dismissible avec localStorage)
  const [priceMaskingDismissed, setPriceMaskingDismissed] = useState(() => {
    return localStorage.getItem('poc_price_masking_dismissed') === 'true';
  });

  /**
   * Récupère toutes les commandes de l'entreprise active
   */
  const loadOrders = useCallback(async () => {
    if (!activeCompany?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Récupérer les commandes depuis Supabase
      let query = supabase
        .from('poc_purchase_orders')
        .select(`
          *,
          poc_purchase_order_items (*)
        `)
        .or(`buyer_company_id.eq.${activeCompany.id},supplier_company_id.eq.${activeCompany.id}`)
        .order('created_at', { ascending: false });

      // Appliquer les filtres
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      // Filtre conditionnel: project_id pour BCE, org_unit_id pour BCI
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }
      if (filters.orgUnitId) {
        query = query.eq('org_unit_id', filters.orgUnitId);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Mapper les données vers PurchaseOrder
      const mappedOrders: PurchaseOrder[] = (data || []).map((order: any) => ({
        id: order.id,
        companyId: order.buyer_company_id,
        projectId: order.project_id || undefined, // Optionnel pour BCI
        orgUnitId: order.org_unit_id || undefined, // NOUVEAU: Optionnel pour BCE
        orderType: order.order_type as 'BCI' | 'BCE' | undefined, // NOUVEAU
        creatorId: order.created_by,
        siteManagerId: order.site_manager_id || undefined,
        supplierId: order.supplier_company_id || undefined,
        orderNumber: order.order_number,
        title: order.title || `Commande ${order.order_number}`,
        description: order.description || undefined,
        status: order.status as PurchaseOrderStatus,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at),
        submittedAt: order.submitted_at ? new Date(order.submitted_at) : undefined,
        approvedSiteManagerAt: order.site_manager_approved_at ? new Date(order.site_manager_approved_at) : undefined,
        approvedManagementAt: order.management_approved_at ? new Date(order.management_approved_at) : undefined,
        submittedToSupplierAt: order.supplier_submitted_at ? new Date(order.supplier_submitted_at) : undefined,
        acceptedSupplierAt: order.supplier_accepted_at ? new Date(order.supplier_accepted_at) : undefined,
        deliveredAt: order.actual_delivery_date ? new Date(order.actual_delivery_date) : undefined,
        completedAt: undefined,
        cancelledAt: undefined,
        rejectionReason: order.site_manager_rejection_reason || order.management_rejection_reason || order.supplier_rejection_reason || undefined,
        cancellationReason: undefined,
        priority: (order.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
        estimatedDeliveryDate: order.estimated_delivery_date ? new Date(order.estimated_delivery_date) : undefined,
        actualDeliveryDate: order.actual_delivery_date ? new Date(order.actual_delivery_date) : undefined,
        items: (order.poc_purchase_order_items || []).map((item: any) => ({
          id: item.id,
          purchaseOrderId: item.purchase_order_id,
          catalogItemId: item.catalog_item_id || undefined,
          itemName: item.item_name,
          description: item.description || undefined,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }))
      }));

      setOrders(mappedOrders);

      // Récupérer les actions disponibles pour chaque commande
      const userIdResult = await getAuthenticatedUserId();
      if (userIdResult.success && userIdResult.data) {
        const actionsMap: Record<string, WorkflowAction[]> = {};
        for (const order of mappedOrders) {
          const actionsResult = await workflowService.getAvailableActions(order.id, userIdResult.data);
          if (actionsResult.success && actionsResult.data) {
            actionsMap[order.id] = actionsResult.data;
          }
        }
        setAvailableActions(actionsMap);
      }
    } catch (error: any) {
      console.error('Erreur chargement commandes:', error);
      toast.error(error.message || 'Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.id, filters.status, filters.projectId, filters.orgUnitId, filters.dateFrom, filters.dateTo]);

  /**
   * Charge les projets pour le filtre
   */
  const loadProjects = useCallback(async () => {
    if (!activeCompany?.id) return;

    try {
      const { data, error } = await supabase
        .from('poc_projects')
        .select('id, name')
        .eq('company_id', activeCompany.id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Erreur chargement projets:', error);
    }
  }, [activeCompany?.id]);

  /**
   * Charge les unités organisationnelles pour le filtre (BCI)
   */
  const loadOrgUnits = useCallback(async () => {
    if (!activeCompany?.id) return;

    try {
      const { data, error } = await supabase
        .from('poc_org_units')
        .select('id, name, code')
        .eq('company_id', activeCompany.id)
        .order('name');

      if (error) throw error;
      setOrgUnits((data || []).map(ou => ({
        id: ou.id,
        name: ou.name,
        code: ou.code || undefined
      })));
    } catch (error: any) {
      console.error('Erreur chargement unités organisationnelles:', error);
    }
  }, [activeCompany?.id]);

  /**
   * Applique les filtres de recherche
   */
  useEffect(() => {
    let filtered = [...orders];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          formatOrderNumberDisplay(order).toLowerCase().includes(searchLower) ||
          order.title?.toLowerCase().includes(searchLower) ||
          order.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredOrders(filtered);
  }, [orders, filters.search]);

  // Charger les commandes et projets au montage et quand les filtres changent
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    loadOrgUnits();
  }, [loadOrgUnits]);

  /**
   * Charge les alertes de seuil pour les commandes visibles
   */
  useEffect(() => {
    const loadAlerts = async () => {
      if (!activeCompany?.id || filteredOrders.length === 0) {
        setAlerts([]);
        return;
      }

      try {
        setLoadingAlerts(true);
        
        // Extraire les IDs des commandes visibles
        const purchaseOrderIds = filteredOrders.map(order => order.id);
        
        // Récupérer les alertes de type threshold_exceeded pour la compagnie
        const result = await pocAlertService.getAlerts(activeCompany.id, {
          alertType: 'threshold_exceeded'
        });

        if (result.success && result.data) {
          // Filtrer pour ne garder que les alertes liées aux commandes visibles
          const relevantAlerts = result.data.filter(alert => 
            alert.purchaseOrderId && purchaseOrderIds.includes(alert.purchaseOrderId)
          );
          setAlerts(relevantAlerts);
        } else {
          // En cas d'erreur, continuer sans alertes (graceful degradation)
          console.warn('Erreur chargement alertes:', result.error);
          setAlerts([]);
        }
      } catch (error: any) {
        console.error('Erreur chargement alertes:', error);
        // En cas d'erreur, continuer sans alertes (graceful degradation)
        setAlerts([]);
      } finally {
        setLoadingAlerts(false);
      }
    };

    loadAlerts();
  }, [filteredOrders, activeCompany?.id]);

  /**
   * Vérifie si une commande a une alerte de seuil
   */
  const hasThresholdAlert = (orderId: string): boolean => {
    return alerts.some(alert => alert.purchaseOrderId === orderId);
  };

  /**
   * Récupère la sévérité de l'alerte pour une commande
   */
  const getAlertSeverity = (orderId: string): 'warning' | 'critical' => {
    const alert = alerts.find(a => a.purchaseOrderId === orderId);
    return alert?.severity === 'critical' ? 'critical' : 'warning';
  };

  /**
   * Gère l'exécution d'une action de workflow
   */
  const handleAction = async (orderId: string, action: WorkflowAction) => {
    setActionLoading({ ...actionLoading, [orderId]: true });

    try {
      let result;
      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        throw new Error('Commande introuvable');
      }

      switch (action) {
        case WorkflowAction.SUBMIT:
          result = await pocPurchaseOrderService.submitForApproval(orderId);
          break;
        case WorkflowAction.APPROVE_SITE:
          result = await pocPurchaseOrderService.approveBySiteManager(orderId);
          break;
        case WorkflowAction.REJECT_SITE:
          result = await pocPurchaseOrderService.rejectBySiteManager(orderId, 'Rejeté par le chef de chantier');
          break;
        case WorkflowAction.APPROVE_MGMT:
          result = await pocPurchaseOrderService.approveByManagement(orderId);
          break;
        case WorkflowAction.REJECT_MGMT:
          result = await pocPurchaseOrderService.rejectByManagement(orderId, 'Rejeté par la direction');
          break;
        case WorkflowAction.ACCEPT_SUPPLIER:
          result = await pocPurchaseOrderService.acceptBySupplier(orderId);
          break;
        case WorkflowAction.REJECT_SUPPLIER:
          result = await pocPurchaseOrderService.rejectBySupplier(orderId, 'Rejeté par le fournisseur');
          break;
        case WorkflowAction.DELIVER:
          result = await pocPurchaseOrderService.markAsDelivered(orderId);
          break;
        case WorkflowAction.COMPLETE:
          result = await pocPurchaseOrderService.complete(orderId);
          break;
        case WorkflowAction.CANCEL:
          result = await pocPurchaseOrderService.cancel(orderId, 'Annulé par l\'utilisateur');
          break;
        default:
          throw new Error('Action non supportée');
      }

      if (result.success) {
        toast.success(`Action "${ACTION_LABELS[action]}" effectuée avec succès`);
        await loadOrders();
      } else {
        toast.error(result.error || 'Erreur lors de l\'exécution de l\'action');
      }
    } catch (error: any) {
      console.error('Erreur action:', error);
      toast.error(error.message || 'Erreur lors de l\'exécution de l\'action');
    } finally {
      setActionLoading({ ...actionLoading, [orderId]: false });
      setPendingAction(null);
    }
  };

  /**
   * Ouvre la modale de confirmation pour une action
   */
  const confirmAction = (orderId: string, action: WorkflowAction) => {
    const isDestructive = [WorkflowAction.CANCEL, WorkflowAction.REJECT_SITE, WorkflowAction.REJECT_MGMT, WorkflowAction.REJECT_SUPPLIER].includes(action);
    if (isDestructive) {
      setPendingAction({ orderId, action, label: ACTION_LABELS[action] });
    } else {
      handleAction(orderId, action);
    }
  };

  /**
   * Calcule le total d'une commande
   */
  const calculateTotal = (order: PurchaseOrder): number => {
    return order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  /**
   * Formate un prix en MGA (fonction locale pour affichage)
   */
  const formatPriceLocal = (price: number): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(price);
  };

  /**
   * Formate une date
   */
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  /**
   * Récupère le nom du projet
   */
  const getProjectName = (projectId: string): string => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || projectId;
  };

  /**
   * Récupère le nom de l'unité organisationnelle
   */
  const getOrgUnitName = (orgUnitId: string): string => {
    const orgUnit = orgUnits.find((ou) => ou.id === orgUnitId);
    return orgUnit ? `${orgUnit.name}${orgUnit.code ? ` (${orgUnit.code})` : ''}` : orgUnitId;
  };

  if (!activeCompany) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucune entreprise active. Veuillez sélectionner une entreprise.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes Commandes</h1>
            <p className="text-sm text-gray-600 mt-1">
              {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} trouvée{filteredOrders.length > 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadOrders}
              disabled={loading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={() => navigate('/construction/new-order')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Commande
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par numéro, projet..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as PurchaseOrderStatus | '' })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filters.projectId}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Tous les projets</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            {/* NOUVEAU: Filtre Unité Organisationnelle */}
            <select
              value={filters.orgUnitId}
              onChange={(e) => setFilters({ ...filters, orgUnitId: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Toutes les unités</option>
              {orgUnits.map((orgUnit) => (
                <option key={orgUnit.id} value={orgUnit.id}>
                  {orgUnit.name} {orgUnit.code ? `(${orgUnit.code})` : ''}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              placeholder="Date de début"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              placeholder="Date de fin"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setFilters({ search: '', status: '', projectId: '', orgUnitId: '', dateFrom: '', dateTo: '' })}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      </div>

      {/* Liste des commandes */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">
            {filters.search || filters.status || filters.projectId || filters.dateFrom || filters.dateTo
              ? 'Aucun résultat pour vos filtres'
              : 'Aucune commande trouvée'}
          </p>
        </div>
      ) : (
        <>
          {/* Message d'explication pour chef_equipe */}
          {!canViewFullPrice(userRole ? String(userRole) : null) && !priceMaskingDismissed && (
            <UIAlert 
              type="info" 
              className="mb-4" 
              dismissible
              onDismiss={() => {
                setPriceMaskingDismissed(true);
                localStorage.setItem('poc_price_masking_dismissed', 'true');
              }}
            >
              En tant que Chef d'Équipe, les prix sont masqués. Contactez la Direction pour plus d'informations.
            </UIAlert>
          )}

          {/* Table Desktop */}
          <div className="hidden lg:block bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Numéro BC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projet / Unité</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Création</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigate(`/construction/orders/${order.id}`);
                            }}
                            className={`text-purple-600 hover:text-purple-800 font-medium ${order.status === 'draft' ? 'italic text-gray-500' : ''}`}
                          >
                            {formatOrderNumberDisplay(order)}
                          </button>
                          {/* Badge d'alerte de seuil */}
                          {hasThresholdAlert(order.id) && (
                            <span 
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                getAlertSeverity(order.id) === 'critical' 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                              title="Seuil dépassé"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Seuil dépassé
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Affichage conditionnel: org_unit pour BCI, project pour BCE */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.orderType === 'BCI' && order.orgUnitId
                          ? getOrgUnitName(order.orgUnitId)
                          : order.projectId
                          ? getProjectName(order.projectId)
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        <PriceMaskingWrapper
                          price={calculateTotal(order)}
                          userRole={userRole ? String(userRole) : ''}
                          formatPrice={true}
                          showExplanation={false}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {availableActions[order.id]?.map((action) => (
                            <button
                              key={action}
                              onClick={() => confirmAction(order.id, action)}
                              disabled={actionLoading[order.id]}
                              className={`text-xs px-2 py-1 rounded ${
                                [WorkflowAction.APPROVE_SITE, WorkflowAction.APPROVE_MGMT, WorkflowAction.ACCEPT_SUPPLIER, WorkflowAction.COMPLETE].includes(action)
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : [WorkflowAction.REJECT_SITE, WorkflowAction.REJECT_MGMT, WorkflowAction.REJECT_SUPPLIER, WorkflowAction.CANCEL].includes(action)
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              } disabled:opacity-50`}
                            >
                              {ACTION_LABELS[action]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards Mobile */}
          <div className="lg:hidden space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => {
                          navigate(`/construction/orders/${order.id}`);
                        }}
                        className={`text-purple-600 hover:text-purple-800 font-semibold text-lg ${order.status === 'draft' ? 'italic text-gray-500' : ''}`}
                      >
                        {formatOrderNumberDisplay(order)}
                      </button>
                      {/* Badge d'alerte de seuil */}
                      {hasThresholdAlert(order.id) && (
                        <span 
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            getAlertSeverity(order.id) === 'critical' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}
                          title="Seuil dépassé"
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Seuil dépassé
                        </span>
                      )}
                    </div>
                    {/* Affichage conditionnel: org_unit pour BCI, project pour BCE */}
                    <p className="text-sm text-gray-600 mt-1">
                      {order.orderType === 'BCI' && order.orgUnitId
                        ? getOrgUnitName(order.orgUnitId)
                        : order.projectId
                        ? getProjectName(order.projectId)
                        : 'N/A'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                  <div>
                    <span className="text-gray-500">Montant:</span>
                    <p className="font-semibold">
                      <PriceMaskingWrapper
                        price={calculateTotal(order)}
                        userRole={userRole ? String(userRole) : ''}
                        formatPrice={true}
                        showExplanation={false}
                      />
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Date:</span>
                    <p>{formatDate(order.createdAt)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  {availableActions[order.id]?.map((action) => (
                    <button
                      key={action}
                      onClick={() => confirmAction(order.id, action)}
                      disabled={actionLoading[order.id]}
                      className={`text-xs px-2 py-1 rounded ${
                        [WorkflowAction.APPROVE_SITE, WorkflowAction.APPROVE_MGMT, WorkflowAction.ACCEPT_SUPPLIER, WorkflowAction.COMPLETE].includes(action)
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : [WorkflowAction.REJECT_SITE, WorkflowAction.REJECT_MGMT, WorkflowAction.REJECT_SUPPLIER, WorkflowAction.CANCEL].includes(action)
                          ? 'bg-red-100 text-red-800 hover:bg-red-200'
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      } disabled:opacity-50`}
                    >
                      {ACTION_LABELS[action]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de confirmation */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Confirmer l'action</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir <strong>{pendingAction.label.toLowerCase()}</strong> cette commande ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingAction(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => handleAction(pendingAction.orderId, pendingAction.action)}
                disabled={actionLoading[pendingAction.orderId]}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading[pendingAction.orderId] ? 'Traitement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POCOrdersList;
