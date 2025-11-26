/**
 * Dashboard principal du module Construction POC
 * Affiche les KPIs, statistiques, commandes récentes et alertes stock
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  FileText,
  Plus,
  BarChart3,
  Clock
} from 'lucide-react';
import { useConstruction } from '../context/ConstructionContext';
import pocPurchaseOrderService from '../services/pocPurchaseOrderService';
import stockService from '../services/pocStockService';
import pocAlertService, { type Alert, type AlertSeverity } from '../services/pocAlertService';
import pocConsumptionPlanService, { type ConsumptionSummary as ServiceConsumptionSummary } from '../services/pocConsumptionPlanService';
import ConsumptionPlanCard, { type ConsumptionSummary as CardConsumptionSummary } from './ConsumptionPlanCard';
import PriceMaskingWrapper from './PriceMaskingWrapper';
import { supabase } from '../../../lib/supabase';
import {
  CompanyType
} from '../types/construction';
import type {
  PurchaseOrder,
  PurchaseOrderStatus
} from '../types/construction';
import type { InternalStock } from '../services/pocStockService';

/**
 * Interface pour les KPIs
 */
interface DashboardKPIs {
  pendingOrders: number;
  inTransit: number;
  completed: number;
  totalValue: number; // En MGA
}

/**
 * Interface pour la répartition par statut
 */
interface StatusDistribution {
  status: PurchaseOrderStatus;
  count: number;
  percentage: number;
  label: string;
  color: string;
}

/**
 * Composant Dashboard
 */
const POCDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany, userRole, isLoading: contextLoading } = useConstruction();
  
  // États
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<DashboardKPIs>({
    pendingOrders: 0,
    inTransit: 0,
    completed: 0,
    totalValue: 0
  });
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [recentOrders, setRecentOrders] = useState<PurchaseOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InternalStock[]>([]);
  
  // États pour les alertes et plans de consommation
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [consumptionSummary, setConsumptionSummary] = useState<CardConsumptionSummary[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(false);
  const [loadingConsumption, setLoadingConsumption] = useState<boolean>(false);

  /**
   * Charge les données du dashboard
   */
  const loadDashboardData = async () => {
    if (!activeCompany) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Récupérer toutes les commandes de la compagnie active
      const companyId = activeCompany.id;
      const isSupplier = activeCompany.type === CompanyType.SUPPLIER;

      // Construire la requête selon le type de compagnie
      let query = supabase
        .from('poc_purchase_orders')
        .select(`
          *,
          poc_purchase_order_items (*)
        `);

      if (isSupplier) {
        query = query.eq('supplier_company_id', companyId);
      } else {
        query = query.eq('buyer_company_id', companyId);
      }

      query = query.order('created_at', { ascending: false });

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) {
        throw new Error(`Erreur récupération commandes: ${ordersError.message}`);
      }

      // Mapper les commandes
      const orders: PurchaseOrder[] = (ordersData || []).map((order: any) => ({
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
        rejectionReason: undefined,
        cancellationReason: undefined,
        priority: 'medium' as const,
        estimatedDeliveryDate: order.estimated_delivery_date ? new Date(order.estimated_delivery_date) : undefined,
        actualDeliveryDate: order.actual_delivery_date ? new Date(order.actual_delivery_date) : undefined,
        items: (order.poc_purchase_order_items || []).map((item: any) => ({
          id: item.id,
          purchaseOrderId: item.purchase_order_id,
          catalogItemId: item.catalog_item_id || undefined,
          itemName: item.item_name,
          description: item.description || undefined,
          quantity: parseFloat(item.quantity.toString()),
          unit: item.unit,
          unitPrice: parseFloat(item.unit_price.toString()),
          totalPrice: parseFloat(item.total_price.toString()),
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }))
      }));

      // Calculer les KPIs
      const pendingStatuses: PurchaseOrderStatus[] = [
        'pending_site_manager',
        'pending_management',
        'pending_supplier'
      ];
      const inTransitStatuses: PurchaseOrderStatus[] = ['in_transit', 'delivered'];
      const completedStatuses: PurchaseOrderStatus[] = ['completed', 'fulfilled_internal'];

      const pendingOrders = orders.filter(o => pendingStatuses.includes(o.status));
      const inTransitOrders = orders.filter(o => inTransitStatuses.includes(o.status));
      const completedOrders = orders.filter(o => completedStatuses.includes(o.status));

      // Calculer la valeur totale (total_amount depuis la DB ou somme des items)
      let totalValue = 0;
      orders.forEach(order => {
        if (order.items && order.items.length > 0) {
          const orderTotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
          totalValue += orderTotal;
        }
      });

      setKpis({
        pendingOrders: pendingOrders.length,
        inTransit: inTransitOrders.length,
        completed: completedOrders.length,
        totalValue
      });

      // Calculer la répartition par statut
      const statusCounts: Record<string, number> = {};
      orders.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });

      const totalOrders = orders.length;
      const distribution: StatusDistribution[] = [
        {
          status: 'draft' as PurchaseOrderStatus,
          count: statusCounts['draft'] || 0,
          percentage: totalOrders > 0 ? ((statusCounts['draft'] || 0) / totalOrders) * 100 : 0,
          label: 'Brouillons',
          color: 'bg-gray-500'
        },
        {
          status: 'pending_site_manager' as PurchaseOrderStatus,
          count: statusCounts['pending_site_manager'] || 0,
          percentage: totalOrders > 0 ? ((statusCounts['pending_site_manager'] || 0) / totalOrders) * 100 : 0,
          label: 'En attente validation',
          color: 'bg-yellow-500'
        },
        {
          status: 'in_transit' as PurchaseOrderStatus,
          count: statusCounts['in_transit'] || 0,
          percentage: totalOrders > 0 ? ((statusCounts['in_transit'] || 0) / totalOrders) * 100 : 0,
          label: 'En livraison',
          color: 'bg-blue-500'
        },
        {
          status: 'delivered' as PurchaseOrderStatus,
          count: statusCounts['delivered'] || 0,
          percentage: totalOrders > 0 ? ((statusCounts['delivered'] || 0) / totalOrders) * 100 : 0,
          label: 'Livrées',
          color: 'bg-indigo-500'
        },
        {
          status: 'completed' as PurchaseOrderStatus,
          count: statusCounts['completed'] || 0,
          percentage: totalOrders > 0 ? ((statusCounts['completed'] || 0) / totalOrders) * 100 : 0,
          label: 'Complétées',
          color: 'bg-green-500'
        }
      ].filter(s => s.count > 0);

      setStatusDistribution(distribution);

      // Récupérer les 10 dernières commandes
      setRecentOrders(orders.slice(0, 10));

      // Récupérer les items en stock faible
      const lowStockResult = await stockService.getLowStockItems(companyId);
      if (lowStockResult.success && lowStockResult.data) {
        setLowStockItems(lowStockResult.data);
      }

    } catch (err: any) {
      console.error('Erreur chargement dashboard:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Charger les données au montage et quand la compagnie active change
  useEffect(() => {
    if (!contextLoading) {
      loadDashboardData();
    }
  }, [activeCompany?.id, contextLoading]);

  /**
   * Charge le nombre d'alertes non lues pour l'utilisateur actuel
   */
  useEffect(() => {
    const loadUnreadAlertsCount = async () => {
      if (!activeCompany?.id) {
        setUnreadAlertsCount(0);
        return;
      }

      try {
        setLoadingAlerts(true);
        
        // Récupérer l'utilisateur authentifié
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          setUnreadAlertsCount(0);
          return;
        }

        const result = await pocAlertService.getUnreadAlertsCount(
          activeCompany.id,
          user.id
        );

        if (result.success && result.data !== undefined) {
          setUnreadAlertsCount(result.data);
        } else {
          console.error('Erreur chargement alertes non lues:', result.error);
          setUnreadAlertsCount(0);
        }
      } catch (err: any) {
        console.error('Erreur chargement nombre alertes non lues:', err);
        setUnreadAlertsCount(0);
      } finally {
        setLoadingAlerts(false);
      }
    };

    if (!contextLoading && activeCompany?.id) {
      loadUnreadAlertsCount();
    }
  }, [activeCompany?.id, contextLoading]);

  /**
   * Charge les alertes récentes (threshold_exceeded et consumption_warning)
   */
  useEffect(() => {
    const loadRecentAlerts = async () => {
      if (!activeCompany?.id) {
        setRecentAlerts([]);
        return;
      }

      try {
        setLoadingAlerts(true);
        
        const result = await pocAlertService.getAlerts(activeCompany.id, {
          alertType: undefined // Récupérer tous les types
        });

        if (result.success && result.data) {
          // Filtrer pour threshold_exceeded et consumption_warning, limiter à 5, trier par date
          const filtered = result.data
            .filter(alert => 
              alert.alertType === 'threshold_exceeded' || 
              alert.alertType === 'consumption_warning'
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);
          
          setRecentAlerts(filtered);
        } else {
          console.error('Erreur chargement alertes récentes:', result.error);
          setRecentAlerts([]);
        }
      } catch (err: any) {
        console.error('Erreur chargement alertes récentes:', err);
        setRecentAlerts([]);
      } finally {
        setLoadingAlerts(false);
      }
    };

    if (!contextLoading && activeCompany?.id) {
      loadRecentAlerts();
    }
  }, [activeCompany?.id, contextLoading]);

  /**
   * Charge le résumé de consommation pour la période mensuelle
   */
  useEffect(() => {
    const loadConsumptionSummary = async () => {
      if (!activeCompany?.id) {
        setConsumptionSummary([]);
        return;
      }

      try {
        setLoadingConsumption(true);
        
        const result = await pocConsumptionPlanService.getConsumptionSummary(
          activeCompany.id,
          'monthly'
        );

        if (result.success && result.data) {
          // Adapter les données du service au format attendu par ConsumptionPlanCard
          const adapted: CardConsumptionSummary[] = result.data.map((summary: ServiceConsumptionSummary) => ({
            id: summary.planId,
            productId: summary.productId,
            productName: summary.productName,
            plannedQuantity: summary.plannedQuantity,
            actualQuantity: summary.actualQuantity,
            period: summary.period === 'monthly' ? 'month' : summary.period === 'quarterly' ? 'quarter' : 'year',
            periodLabel: summary.period === 'monthly' ? 'Ce mois' : summary.period === 'quarterly' ? 'Ce trimestre' : 'Cette année',
            alertTriggered: summary.alertTriggered,
            alertMessage: summary.alertTriggered 
              ? `Alerte: ${Math.round(summary.percentageUsed)}% de la quantité planifiée consommée`
              : undefined,
            unit: 'unité' // Par défaut, peut être amélioré avec les données du produit
          }));
          
          setConsumptionSummary(adapted);
        } else {
          console.error('Erreur chargement résumé consommation:', result.error);
          setConsumptionSummary([]);
        }
      } catch (err: any) {
        console.error('Erreur chargement résumé consommation:', err);
        setConsumptionSummary([]);
      } finally {
        setLoadingConsumption(false);
      }
    };

    if (!contextLoading && activeCompany?.id) {
      loadConsumptionSummary();
    }
  }, [activeCompany?.id, contextLoading]);

  /**
   * Formate un montant en MGA
   */
  const formatMGA = (amount: number): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  /**
   * Obtient la couleur du badge de statut
   */
  const getStatusBadgeColor = (status: PurchaseOrderStatus): string => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending_site_manager: 'bg-yellow-100 text-yellow-800',
      pending_management: 'bg-orange-100 text-orange-800',
      pending_supplier: 'bg-blue-100 text-blue-800',
      in_transit: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      fulfilled_internal: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  /**
   * Obtient le label du statut
   */
  const getStatusLabel = (status: PurchaseOrderStatus): string => {
    const labels: Record<string, string> = {
      draft: 'Brouillon',
      pending_site_manager: 'En attente Chef Chantier',
      approved_site_manager: 'Approuvé Chef Chantier',
      checking_stock: 'Vérification stock',
      fulfilled_internal: 'Rempli interne',
      needs_external_order: 'Commande externe',
      pending_management: 'En attente Direction',
      approved_management: 'Approuvé Direction',
      rejected_management: 'Rejeté Direction',
      submitted_to_supplier: 'Envoyé fournisseur',
      pending_supplier: 'En attente fournisseur',
      accepted_supplier: 'Accepté fournisseur',
      rejected_supplier: 'Rejeté fournisseur',
      in_transit: 'En livraison',
      delivered: 'Livré',
      completed: 'Complété',
      cancelled: 'Annulé'
    };
    return labels[status] || status;
  };

  // Affichage si pas de compagnie active
  if (!activeCompany && !contextLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune entreprise sélectionnée
            </h2>
            <p className="text-gray-600 mb-6">
              Veuillez sélectionner une entreprise pour accéder au tableau de bord.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Affichage du chargement
  if (loading || contextLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Affichage d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-semibold text-red-900">Erreur</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={loadDashboardData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Construction</h1>
            {activeCompany && (
              <p className="text-gray-600 mt-1">
                Entreprise: <span className="font-semibold">{activeCompany.name}</span>
              </p>
            )}
          </div>
          <button
            onClick={loadDashboardData}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Actualiser
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Commandes en Attente */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Commandes en Attente</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{kpis.pendingOrders}</p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Card 2: En Livraison */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Livraison</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{kpis.inTransit}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Truck className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Card 3: Complétées */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Complétées</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{kpis.completed}</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          {/* Card 4: Valeur Totale */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valeur Totale</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatMGA(kpis.totalValue)}</p>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Card 5: Alertes non lues */}
          <div 
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
              unreadAlertsCount > 0 ? 'border-orange-500' : 'border-gray-300'
            } ${loadingAlerts ? 'opacity-50' : 'cursor-pointer hover:shadow-lg transition-shadow'}`}
            onClick={() => {
              // Naviguer vers la page des alertes quand elle sera créée
              // Pour l'instant, on peut scroller vers la section des alertes récentes
              const alertsSection = document.getElementById('recent-alerts-section');
              if (alertsSection) {
                alertsSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Alertes non lues</p>
                <p className={`text-3xl font-bold mt-2 ${
                  unreadAlertsCount > 0 ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {loadingAlerts ? '...' : unreadAlertsCount}
                </p>
              </div>
              <div className={`rounded-full p-3 ${
                unreadAlertsCount > 0 ? 'bg-orange-100' : 'bg-gray-100'
              }`}>
                <AlertTriangle className={`w-8 h-8 ${
                  unreadAlertsCount > 0 ? 'text-orange-600' : 'text-gray-400'
                }`} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts Section */}
        <div id="recent-alerts-section" className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Alertes récentes</h2>
          </div>
          {loadingAlerts ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chargement des alertes...</p>
            </div>
          ) : recentAlerts.length > 0 ? (
            <div className="space-y-3">
              {recentAlerts.map((alert) => {
                // Déterminer la couleur selon la sévérité
                const severityColors: Record<AlertSeverity, string> = {
                  info: 'bg-blue-50 border-blue-200 text-blue-800',
                  warning: 'bg-orange-50 border-orange-200 text-orange-800',
                  critical: 'bg-red-50 border-red-200 text-red-800'
                };
                
                const badgeColors: Record<AlertSeverity, string> = {
                  info: 'bg-blue-100 text-blue-800',
                  warning: 'bg-orange-100 text-orange-800',
                  critical: 'bg-red-100 text-red-800'
                };

                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${severityColors[alert.severity]} transition-all hover:shadow-md cursor-pointer`}
                    onClick={async () => {
                      // Marquer comme lue si l'utilisateur est dans notifiedUsers
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user?.id && alert.notifiedUsers.includes(user.id) && !alert.isRead) {
                        await pocAlertService.markAsRead(alert.id, user.id);
                        // Rafraîchir les alertes
                        setRecentAlerts(prev => prev.map(a => 
                          a.id === alert.id ? { ...a, isRead: true } : a
                        ));
                        setUnreadAlertsCount(prev => Math.max(0, prev - 1));
                      }
                      
                      // Naviguer vers la commande si purchaseOrderId existe
                      if (alert.purchaseOrderId) {
                        navigate(`/construction/orders/${alert.purchaseOrderId}`);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeColors[alert.severity]}`}>
                            {alert.severity === 'info' ? 'Info' : alert.severity === 'warning' ? 'Avertissement' : 'Critique'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(alert.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{alert.message}</p>
                        {alert.purchaseOrderId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/construction/orders/${alert.purchaseOrderId}`);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                          >
                            Voir la commande →
                          </button>
                        )}
                      </div>
                      {!alert.isRead && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={() => {
                    // Naviguer vers la page des alertes quand elle sera créée
                    // Pour l'instant, on peut juste afficher un message
                    alert('Page des alertes à venir');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Voir toutes les alertes →
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune alerte récente</p>
          )}
        </div>

        {/* Statistics Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Répartition par Statut</h2>
          </div>
          {statusDistribution.length > 0 ? (
            <div className="space-y-4">
              {statusDistribution.map((item) => (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className="text-sm text-gray-600">
                      {item.count} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune commande disponible</p>
          )}
        </div>

        {/* Recent Orders Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Commandes Récentes</h2>
          {recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Numéro BC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projet
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant (MGA)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => {
                    const orderTotal = order.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/construction/orders/${order.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {/* Affichage conditionnel: org_unit pour BCI, project pour BCE */}
                          {order.orderType === 'BCI' && order.orgUnitId
                            ? `Unité: ${order.orgUnitId.substring(0, 8)}...`
                            : order.projectId
                            ? `Projet: ${order.projectId.substring(0, 8)}...`
                            : order.title || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <PriceMaskingWrapper 
                            price={orderTotal} 
                            userRole={userRole || ''} 
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.createdAt.toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune commande récente</p>
          )}
        </div>

        {/* Consumption Plans Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Plans de consommation - Ce mois</h2>
          </div>
          {loadingConsumption ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Chargement des plans de consommation...</p>
            </div>
          ) : consumptionSummary.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {consumptionSummary.map((plan) => (
                  <ConsumptionPlanCard
                    key={plan.id}
                    plan={plan}
                    onViewDetails={() => {
                      // Naviguer vers la page de détails du plan quand elle sera créée
                      // Pour l'instant, on peut juste afficher un message
                      alert(`Détails du plan ${plan.productName} à venir`);
                    }}
                  />
                ))}
              </div>
              <div className="pt-4 mt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    // Naviguer vers la page des plans de consommation quand elle sera créée
                    alert('Page des plans de consommation à venir');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Voir tous les plans →
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucun plan de consommation configuré</p>
          )}
        </div>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-semibold text-gray-900">Alertes Stock Faible</h2>
            </div>
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.item_name}</p>
                    <p className="text-sm text-gray-600">
                      Stock actuel: {item.quantity} {item.unit}
                      {item.min_threshold && (
                        <span className="ml-2">
                          (Seuil: {item.min_threshold} {item.unit})
                        </span>
                      )}
                    </p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/construction/new-order')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouvelle Commande
            </button>
            <button
              onClick={() => navigate('/construction/catalog')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Package className="w-5 h-5" />
              Catalogue Produits
            </button>
            <button
              onClick={() => navigate('/construction/stock')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Gérer Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POCDashboard;
