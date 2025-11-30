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
  X,
  Pencil,
  Save,
  Trash2,
  Plus
} from 'lucide-react';
import { Button, Card, Alert } from '../../../components/UI';
import { supabase } from '../../../lib/supabase';
import pocPurchaseOrderService from '../services/pocPurchaseOrderService';
import pocWorkflowService from '../services/pocWorkflowService';
import { getNextAvailableNumber, reserveNumber, releaseReservation, validateNumberFormat, parseFullNumber } from '../services/bcNumberReservationService';
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
  PurchaseOrderStatus,
  PurchaseOrderItem
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
  const [creatorInfo, setCreatorInfo] = useState<{ name: string; role: string | null } | null>(null);
  
  // États pour les alertes et la consommation (Phase 3 Security)
  const [orderAlerts, setOrderAlerts] = useState<PocAlert[]>([]);
  const [consumptionImpact, setConsumptionImpact] = useState<ConsumptionSummary[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [showPriceMaskingExplanation, setShowPriceMaskingExplanation] = useState(false);
  
  // États pour édition du numéro BC (Admin seulement)
  const [isEditingOrderNumber, setIsEditingOrderNumber] = useState(false);
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [orderNumberError, setOrderNumberError] = useState<string | null>(null);
  const [orderNumberReservationId, setOrderNumberReservationId] = useState<string | null>(null);
  const [existingBcId, setExistingBcId] = useState<string | null>(null);
  const [isTemporaryReservation, setIsTemporaryReservation] = useState(false);
  const [isOwnReservation, setIsOwnReservation] = useState(false);
  const [existingReservationId, setExistingReservationId] = useState<string | null>(null);

  // États pour édition des articles (Phase 2 - UI only)
  const [isEditingArticles, setIsEditingArticles] = useState(false);
  const [editedItems, setEditedItems] = useState<PurchaseOrderItem[]>([]);
  const [itemsModified, setItemsModified] = useState(false);

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

      // Récupérer les informations du créateur
      if (orderData.creatorId) {
        try {
          console.log('🔍 [DEBUG] Fetching creator info for:', orderData.creatorId, 'company:', orderData.companyId);
          
          // Récupérer le rôle depuis poc_company_members
          const { data: memberData, error: memberError } = await supabase
            .from('poc_company_members')
            .select('role')
            .eq('user_id', orderData.creatorId)
            .eq('company_id', orderData.companyId)
            .maybeSingle();

          console.log('🔍 [DEBUG] Member data:', memberData, 'error:', memberError);

          // Récupérer les informations utilisateur depuis la table users publique
          let userName = '';
          let userEmail = '';
          
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, name, email, first_name, last_name')
              .eq('id', orderData.creatorId)
              .maybeSingle();

            console.log('🔍 [DEBUG] User data:', userData, 'error:', userError);

            if (userData) {
              // Essayer name d'abord, puis first_name + last_name, puis email
              if (userData.name) {
                userName = userData.name;
              } else if (userData.first_name || userData.last_name) {
                userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
              }
              userEmail = userData.email || '';
            }
          } catch (userErr: any) {
            console.warn('⚠️ [DEBUG] Could not fetch from users table:', userErr);
            // Table users might not exist or not be accessible
          }

          // Si on n'a pas de nom, essayer depuis l'utilisateur actuel (si c'est le même)
          if (!userName) {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser && currentUser.id === orderData.creatorId) {
                userName = currentUser.user_metadata?.full_name || 
                          currentUser.user_metadata?.name ||
                          `${currentUser.user_metadata?.first_name || ''} ${currentUser.user_metadata?.last_name || ''}`.trim() ||
                          currentUser.email ||
                          '';
                userEmail = currentUser.email || '';
              }
            } catch (authErr: any) {
              console.warn('⚠️ [DEBUG] Could not get current user:', authErr);
            }
          }

          const fullName = userName || userEmail || orderData.creatorId;
          
          console.log('✅ [DEBUG] Creator info result:', { name: fullName, role: memberData?.role || null });

          setCreatorInfo({
            name: fullName,
            role: memberData?.role || null
          });
        } catch (err: any) {
          console.error('❌ [DEBUG] Erreur récupération créateur:', err);
          // Fallback: utiliser seulement l'ID
          setCreatorInfo({
            name: orderData.creatorId,
            role: null
          });
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
   * Initialize edit mode with current items
   */
  const handleStartEditingArticles = () => {
    if (order?.items) {
      setEditedItems([...order.items]);
      setIsEditingArticles(true);
      setItemsModified(false);
    }
  };

  /**
   * Cancel editing and revert changes
   */
  const handleCancelEditingArticles = () => {
    setEditedItems([]);
    setIsEditingArticles(false);
    setItemsModified(false);
  };

  /**
   * Update a specific item field
   */
  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
    setEditedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Recalculate totalPrice if quantity or unitPrice changed
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : updated[index].quantity;
        const price = field === 'unitPrice' ? Number(value) : updated[index].unitPrice;
        updated[index].totalPrice = qty * price;
      }
      return updated;
    });
    setItemsModified(true);
  };

  /**
   * Add new empty article
   */
  const handleAddItem = () => {
    const newItem: Partial<PurchaseOrderItem> = {
      id: `temp-${Date.now()}`,
      purchaseOrderId: order?.id || '',
      itemName: '',
      quantity: 1,
      unit: 'unité',
      unitPrice: 0,
      totalPrice: 0,
      description: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditedItems(prev => [...prev, newItem as PurchaseOrderItem]);
    setItemsModified(true);
  };

  /**
   * Delete an article
   */
  const handleDeleteItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
    setItemsModified(true);
  };

  /**
   * Calculate total for edited items
   */
  const calculateEditedTotal = () => {
    return editedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  /**
   * Save edited articles to database
   */
  const [isSavingArticles, setIsSavingArticles] = useState(false);

  const handleSaveArticles = async () => {
    if (!order?.id) {
      console.error('No order ID available');
      return;
    }

    const userIdResult = await getAuthenticatedUserId();
    if (!userIdResult.success || !userIdResult.data) {
      toast.error('Utilisateur non authentifié');
      return;
    }

    setIsSavingArticles(true);
    try {
      const result = await pocPurchaseOrderService.updateOrderItems(
        order.id,
        editedItems,
        userIdResult.data
      );

      if (result.success) {
        // Refresh order data
        await loadOrderData();
        setIsEditingArticles(false);
        setEditedItems([]);
        setItemsModified(false);
        toast.success('Articles enregistrés avec succès');
      } else {
        console.error('Failed to save articles:', result.error);
        toast.error('Erreur lors de la sauvegarde: ' + (result.error || 'Erreur inconnue'));
      }
    } catch (error: any) {
      console.error('Error saving articles:', error);
      toast.error('Erreur lors de la sauvegarde des articles');
    } finally {
      setIsSavingArticles(false);
    }
  };

  /**
   * Helper function to auto-format order number input
   * Takes raw input, removes non-digits, inserts slash after position 2 if length > 2
   * Example: "25052" becomes "25/052"
   */
  const autoFormatOrderNumber = (input: string): string => {
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) {
      return '';
    }
    
    // If length > 2, insert slash after position 2
    if (digitsOnly.length > 2) {
      const yearPrefix = digitsOnly.slice(0, 2);
      const sequenceNumber = digitsOnly.slice(2);
      // Limit to 6 digits total (2 for year + 4 for sequence max)
      const limitedSequence = sequenceNumber.slice(0, 4);
      return `${yearPrefix}/${limitedSequence}`;
    }
    
    // If length <= 2, return as is
    return digitsOnly;
  };

  /**
   * Handle click on order number to start editing (Admin only)
   */
  const handleOrderNumberClick = () => {
    if (userRole !== 'admin') return;
    
    setIsEditingOrderNumber(true);
    setOrderNumberError(null);
    setExistingBcId(null);
    setIsTemporaryReservation(false);
    setIsOwnReservation(false);
    setExistingReservationId(null);
    setOrderNumberInput(order?.orderNumber || '');
  };

  /**
   * Handle order number input change with auto-formatting
   */
  const handleOrderNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = autoFormatOrderNumber(value);
    // Limit to 6 characters max (2 for year + 1 slash + 3 for sequence = 6)
    const limited = formatted.length > 6 ? formatted.slice(0, 6) : formatted;
    setOrderNumberInput(limited);
    setOrderNumberError(null);
  };

  /**
   * Handle blur (validation, reservation, and save)
   */
  const handleOrderNumberBlur = async () => {
    if (!orderNumberInput.trim()) {
      setIsEditingOrderNumber(false);
      setOrderNumberInput('');
      return;
    }
    
    // Validate format
    if (!validateNumberFormat(orderNumberInput.trim())) {
      setOrderNumberError('Format invalide (ex: 25/001)');
      return;
    }
    
    // Parse to get yearPrefix and sequenceNumber
    const parsed = parseFullNumber(orderNumberInput.trim());
    if (!parsed) {
      setOrderNumberError('Format invalide (ex: 25/001)');
      return;
    }
    
    // Reserve the number
    if (!activeCompany?.id || !order?.orderType) {
      setOrderNumberError('Données manquantes');
      return;
    }
    
    try {
      const reservationResult = await reserveNumber(
        activeCompany.id,
        order.orderType,
        parsed.yearPrefix,
        parsed.sequenceNumber
      );
      
      if (!reservationResult.success || !reservationResult.reservationId) {
        const errorMessage = reservationResult.error || 'Erreur lors de la réservation';
        setOrderNumberError(errorMessage);
        
        // Check if error indicates number already reserved, then find existing BC
        if (errorMessage.toLowerCase().includes('déjà réservé') || 
            errorMessage.toLowerCase().includes('already reserved') ||
            errorMessage.toLowerCase().includes('déjà pris')) {
          try {
            const searchNumber = orderNumberInput.trim();
            console.log('🔍 [DEBUG] Searching for existing BC/reservation:', {
              orderNumber: searchNumber,
              companyId: activeCompany?.id,
              currentOrderId: order?.id
            });
            
            // Parse orderNumberInput to extract year_prefix and sequence_number
            // Format: "AA/NNN" (e.g., "25/052")
            const parts = searchNumber.split('/');
            if (parts.length !== 2) {
              console.error('❌ [DEBUG] Invalid order number format:', searchNumber);
              setExistingBcId(null);
              setIsTemporaryReservation(false);
              return;
            }
            
            const yearPrefix = parts[0].trim();
            const sequenceNumberStr = parts[1].trim();
            const sequenceNumber = parseInt(sequenceNumberStr, 10);
            
            if (isNaN(sequenceNumber)) {
              console.error('❌ [DEBUG] Invalid sequence number:', sequenceNumberStr);
              setExistingBcId(null);
              setIsTemporaryReservation(false);
              return;
            }
            
            console.log('🔍 [DEBUG] Parsed number:', {
              yearPrefix,
              sequenceNumber,
              fullNumber: searchNumber
            });
            
            // STEP 1: First search in poc_bc_number_reservations table
            const { data: reservation, error: reservationError } = await supabase
              .from('poc_bc_number_reservations')
              .select('id, purchase_order_id, reserved_at, full_number, year_prefix, sequence_number, reserved_by')
              .eq('company_id', activeCompany?.id)
              .eq('year_prefix', yearPrefix)
              .eq('sequence_number', sequenceNumber)
              .eq('order_type', order?.orderType || 'BCE')
              .is('released_at', null)  // Active reservation (not released)
              .maybeSingle();
            
            console.log('🔍 [DEBUG] Reservation query result:', {
              found: !!reservation,
              data: reservation,
              error: reservationError,
              hasPurchaseOrderId: !!reservation?.purchase_order_id
            });
            
            if (reservation) {
              // STEP 3: Reservation found with purchase_order_id
              if (reservation.purchase_order_id) {
                setExistingBcId(reservation.purchase_order_id);
                setIsTemporaryReservation(false);
                console.log('✅ [DEBUG] Found reservation linked to BC:', reservation.purchase_order_id);
              } else {
                // STEP 4: Reservation found but purchase_order_id is null (temporary)
                setExistingBcId(null);
                setIsTemporaryReservation(true);
                console.log('⚠️ [DEBUG] Found temporary reservation (no BC yet):', reservation.id);
                
                // Check if current user owns this reservation
                const userIdResult = await getAuthenticatedUserId();
                if (userIdResult.success && userIdResult.data && reservation.reserved_by === userIdResult.data) {
                  setIsOwnReservation(true);
                  setExistingReservationId(reservation.id);
                  console.log('✅ [DEBUG] Current user owns this reservation:', reservation.id);
                } else {
                  setIsOwnReservation(false);
                  setExistingReservationId(null);
                  console.log('⚠️ [DEBUG] Reservation belongs to different user:', {
                    reservationOwner: reservation.reserved_by,
                    currentUser: userIdResult.data
                  });
                }
              }
            } else {
              // STEP 5: No reservation found, search poc_purchase_orders as fallback
              setIsTemporaryReservation(false);
              
              let query = supabase
                .from('poc_purchase_orders')
                .select('id, order_number, buyer_company_id')
                .eq('order_number', searchNumber)
                .eq('buyer_company_id', activeCompany?.id);
              
              // Exclude current order if it exists
              if (order?.id) {
                query = query.neq('id', order.id);
              }
              
              const { data: existingOrder, error: queryError } = await query.maybeSingle();
              
              console.log('🔍 [DEBUG] Purchase orders query result:', {
                found: !!existingOrder,
                data: existingOrder,
                error: queryError
              });
              
              if (existingOrder?.id) {
                setExistingBcId(existingOrder.id);
                console.log('✅ [DEBUG] Found existing BC in purchase_orders:', existingOrder.id);
              } else {
                setExistingBcId(null);
                console.log('❌ [DEBUG] No existing BC or reservation found');
              }
            }
          } catch (error: any) {
            console.error('❌ [DEBUG] Erreur recherche BC/réservation existant:', error);
            setExistingBcId(null);
            setIsTemporaryReservation(false);
            setIsOwnReservation(false);
            setExistingReservationId(null);
          }
        } else {
          setExistingBcId(null);
          setIsTemporaryReservation(false);
          setIsOwnReservation(false);
          setExistingReservationId(null);
        }
        
        return;
      }
      
      // Save reservation ID
      setOrderNumberReservationId(reservationResult.reservationId);
      
      // Update order number via service
      const updateResult = await pocPurchaseOrderService.updateOrderNumber(
        order.id,
        orderNumberInput.trim()
      );
      
      if (!updateResult.success) {
        // Release reservation on failure
        if (reservationResult.reservationId) {
          await releaseReservation(reservationResult.reservationId);
        }
        setOrderNumberError(updateResult.error || 'Erreur lors de la sauvegarde');
        setOrderNumberReservationId(null);
        return;
      }
      
      // Success: release reservation and refresh
      if (reservationResult.reservationId) {
        await releaseReservation(reservationResult.reservationId);
      }
      setOrderNumberReservationId(null);
      setIsEditingOrderNumber(false);
      setOrderNumberError(null);
      toast.success('Numéro de commande mis à jour');
      await loadOrderData(); // Refresh data
    } catch (error: any) {
      console.error('Erreur mise à jour numéro:', error);
      setOrderNumberError(error.message || 'Erreur lors de la mise à jour');
      // Release reservation on error
      if (orderNumberReservationId) {
        await releaseReservation(orderNumberReservationId);
        setOrderNumberReservationId(null);
      }
    }
  };

  /**
   * Handle cancel editing
   */
  const handleOrderNumberCancel = async () => {
    // Release reservation if exists
    if (orderNumberReservationId) {
      try {
        await releaseReservation(orderNumberReservationId);
      } catch (error: any) {
        console.error('Erreur libération réservation:', error);
      }
      setOrderNumberReservationId(null);
    }
    
    // Reset all state variables
    setOrderNumberInput('');
    setOrderNumberError(null);
    setExistingBcId(null);
    setIsTemporaryReservation(false);
    setIsOwnReservation(false);
    setExistingReservationId(null);
    setIsEditingOrderNumber(false);
  };

  /**
   * Handle using own reservation
   */
  const handleUseOwnReservation = async () => {
    console.log('🔍 [DEBUG] Using own reservation:', {
      reservationId: existingReservationId,
      orderNumber: orderNumberInput.trim(),
      orderId: order?.id
    });
    
    if (!order?.id || !orderNumberInput.trim() || !existingReservationId) {
      setOrderNumberError('Données manquantes');
      return;
    }
    
    try {
      // Update order number using existing reservation
      const updateResult = await pocPurchaseOrderService.updateOrderNumber(
        order.id,
        orderNumberInput.trim()
      );
      
      if (!updateResult.success) {
        setOrderNumberError(updateResult.error || 'Erreur lors de la sauvegarde');
        return;
      }
      
      // Success: reset editing states and refresh
      setIsEditingOrderNumber(false);
      setOrderNumberError(null);
      setExistingBcId(null);
      setIsTemporaryReservation(false);
      setIsOwnReservation(false);
      setExistingReservationId(null);
      toast.success('Numéro de commande mis à jour');
      await loadOrderData(); // Refresh data
    } catch (error: any) {
      console.error('❌ [DEBUG] Erreur utilisation réservation:', error);
      setOrderNumberError(error.message || 'Erreur lors de la mise à jour');
    }
  };

  /**
   * Handle keyboard events
   */
  const handleOrderNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleOrderNumberCancel();
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

  /**
   * Formate le numéro de commande pour l'affichage
   * Retourne "NOUVEAU" si le format est invalide ou ancien (PO-YYYY-MM-XXX)
   * Sinon retourne le numéro tel quel (format AA/NNN)
   */
  const formatDisplayOrderNumber = (orderNumber: string | null | undefined): string => {
    if (!orderNumber || orderNumber.trim() === '') {
      return 'NOUVEAU';
    }
    
    // Vérifier si c'est le format AA/NNN (nouveau format)
    if (validateNumberFormat(orderNumber.trim())) {
      return orderNumber.trim();
    }
    
    // Si c'est l'ancien format (PO-YYYY-MM-XXX) ou autre, retourner "NOUVEAU"
    return 'NOUVEAU';
  };

  /**
   * Formate le rôle du créateur en français
   */
  const formatCreatorRole = (role: string | null | undefined): string => {
    if (!role) return '';
    
    const roleMap: Record<string, string> = {
      'magasinier': 'Magasinier',
      'chef_equipe': 'Chef d\'équipe',
      'chef_chantier': 'Chef de chantier',
      'admin': 'Administrateur',
      'direction': 'Direction',
      'super_admin': 'Super Administrateur',
      'supplier_member': 'Membre fournisseur'
    };
    
    return roleMap[role.toLowerCase()] || role;
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/construction/orders')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-nowrap">
                  <div className="text-lg md:text-xl font-bold whitespace-nowrap leading-tight overflow-hidden text-ellipsis ml-2 sm:ml-4">
                      <span className="font-bold">{order.orderType === 'BCI' ? 'BCI' : 'BCE'} _ N°</span>{' '}
                      {userRole === 'admin' && isEditingOrderNumber ? (
                        <div className="inline-flex flex-col items-end">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={orderNumberInput}
                              onChange={handleOrderNumberChange}
                              onBlur={handleOrderNumberBlur}
                              onKeyDown={handleOrderNumberKeyDown}
                              placeholder="AA/NNN"
                              autoFocus
                              className="w-24 px-2 py-1 text-lg font-bold border rounded focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                            />
                            <button
                              type="button"
                              onClick={handleOrderNumberCancel}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                              title="Annuler"
                            >
                              <X className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                          {orderNumberError && (
                            <div className="text-xs text-red-600 mt-1 break-words">
                              {/* Case A: Error with existing BC ID - show link */}
                              {existingBcId ? (
                                <>
                                  {orderNumberError}
                                  {' '}
                                  <span
                                    onClick={() => navigate(`/construction/orders/${existingBcId}`)}
                                    className="text-blue-600 hover:text-blue-800 underline cursor-pointer font-medium"
                                  >
                                    Voir le BC existant
                                  </span>
                                </>
                              ) : isTemporaryReservation && isOwnReservation ? (
                                /* Case B: Temporary reservation owned by current user - show message with button */
                                <>
                                  Vous avez déjà réservé ce numéro.{' '}
                                  <button
                                    type="button"
                                    onClick={handleUseOwnReservation}
                                    className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                  >
                                    Utiliser ce numéro
                                  </button>
                                </>
                              ) : isTemporaryReservation ? (
                                /* Case C: Temporary reservation by different user - show message */
                                'Numéro réservé temporairement par un autre utilisateur.'
                              ) : (
                                /* Case D: Error without BC or temporary reservation - show error only */
                                orderNumberError
                              )}
                            </div>
                          )}
                        </div>
                      ) : userRole === 'admin' ? (
                        <span
                          onClick={handleOrderNumberClick}
                          className="cursor-pointer hover:text-blue-600 hover:underline transition-colors"
                          title="Cliquer pour modifier le numéro"
                        >
                          {formatDisplayOrderNumber(order.orderNumber)}
                        </span>
                      ) : (
                        <span>
                          {formatDisplayOrderNumber(order.orderNumber) === 'NOUVEAU' ? (
                            <span className="italic text-gray-500">{formatDisplayOrderNumber(order.orderNumber)}</span>
                          ) : (
                            formatDisplayOrderNumber(order.orderNumber)
                          )}
                        </span>
                      )}
                    </div>
                  {/* Status badge on same line */}
                  <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                {/* Creator info below BC number */}
                {creatorInfo && (
                  <div className="mt-2 ml-2 sm:ml-4">
                    <p className="text-sm text-gray-500">
                      Créé par{creatorInfo.role ? ` : ${formatCreatorRole(creatorInfo.role)}, ` : ' : '}{creatorInfo.name || 'Inconnu'}.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{order.creatorId}</p>
                  </div>
                )}
                {/* Bouton d'explication pour chef_equipe (Phase 3 Security) */}
                {userRole && !canViewFullPrice(userRole) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPriceMaskingExplanation(true)}
                    className="mt-2 ml-2 sm:ml-4"
                  >
                    <Info className="w-4 h-4 mr-2" />
                    Pourquoi les prix sont masqués?
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {availableActions.length > 0 && (
                <div className="flex flex-wrap gap-2">
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

        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* SECTION 2 - INFORMATIONS GÉNÉRALES */}
            <Card className="p-4 sm:p-6">
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
                      {creatorInfo?.role ? `${formatCreatorRole(creatorInfo.role)}, ` : ''}{creatorInfo?.name || order.creatorId || 'Inconnu'}.
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{order.creatorId}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 3 - TABLE DES ARTICLES */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Articles ({isEditingArticles ? editedItems.length : order?.items?.length || 0})
                </h3>
                {userRole === 'admin' && (order?.status === 'draft' || (order?.status || '').startsWith('pending')) && (
                  <div className="flex gap-2">
                    {isEditingArticles ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEditingArticles}
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveArticles}
                          disabled={!itemsModified || isSavingArticles}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isSavingArticles ? (
                            <>
                              <div className="h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-1" />
                              Enregistrer
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleStartEditingArticles}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Modifier
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Produit</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Quantité</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-500">Unité</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Prix Unit.</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">Total</th>
                      {isEditingArticles && <th className="w-12"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(isEditingArticles ? editedItems : order?.items || []).map((item, index) => (
                      <tr key={item.id || index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {isEditingArticles ? (
                            <input
                              type="text"
                              value={item.itemName || ''}
                              onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Nom du produit"
                            />
                          ) : (
                            <div>
                              <p className="font-medium">{item.itemName}</p>
                              {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditingArticles ? (
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded text-sm text-center"
                              min="1"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditingArticles ? (
                            <input
                              type="text"
                              value={item.unit || ''}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              className="w-20 px-2 py-1 border rounded text-sm text-center"
                              placeholder="unité"
                            />
                          ) : (
                            item.unit
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isEditingArticles ? (
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border rounded text-sm text-right"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            <PriceMaskingWrapper
                              price={item.unitPrice}
                              userRole={userRole || ''}
                              formatPrice={true}
                              showExplanation={false}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {isEditingArticles ? (
                            formatPrice(item.totalPrice)
                          ) : (
                            <PriceMaskingWrapper
                              price={item.totalPrice}
                              userRole={userRole || ''}
                              formatPrice={true}
                              showExplanation={false}
                            />
                          )}
                        </td>
                        {isEditingArticles && (
                          <td className="px-2 py-3">
                            <button
                              onClick={() => handleDeleteItem(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100">
                    <tr>
                      <td colSpan={isEditingArticles ? 4 : 3} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                        Sous-total:
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                        {isEditingArticles ? (
                          <span className="text-orange-600">{formatPrice(calculateEditedTotal())} *</span>
                        ) : (
                          <PriceMaskingWrapper
                            price={total}
                            userRole={userRole || ''}
                            formatPrice={true}
                            showExplanation={false}
                          />
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                
                {/* Add Article Button */}
                {isEditingArticles && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un article
                    </Button>
                  </div>
                )}
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {(isEditingArticles ? editedItems : order?.items || []).map((item, index) => (
                  <div key={item.id || index} className="border rounded-lg p-4 bg-white">
                    {isEditingArticles ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={item.itemName || ''}
                          onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                          className="w-full px-3 py-2 border rounded font-medium"
                          placeholder="Nom du produit"
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-gray-500">Quantité</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              min="1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Unité</label>
                            <input
                              type="text"
                              value={item.unit || ''}
                              onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Prix Unit.</label>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-medium">Total: {formatPrice(item.totalPrice)}</span>
                          <button
                            onClick={() => handleDeleteItem(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
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
                    )}
                    {!isEditingArticles && (
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
                    )}
                  </div>
                ))}
                
                {/* Add Article Button Mobile */}
                {isEditingArticles && (
                  <Button
                    variant="outline"
                    onClick={handleAddItem}
                    className="w-full flex items-center justify-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un article
                  </Button>
                )}
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Sous-total:</span>
                    {isEditingArticles ? (
                      <span className="text-orange-600 font-bold text-lg">{formatPrice(calculateEditedTotal())} *</span>
                    ) : (
                      <PriceMaskingWrapper
                        price={total}
                        userRole={userRole || ''}
                        formatPrice={true}
                        showExplanation={false}
                        className="font-bold text-lg text-purple-600"
                      />
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* SECTION 4 - WORKFLOW VISUALIZATION */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                État du Workflow
              </h2>
              <WorkflowStatusDisplay
                purchaseOrder={order}
                availableActions={availableActions}
              />
            </Card>

            {/* SECTION 5 - HISTORIQUE WORKFLOW */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Historique
              </h2>
              <WorkflowHistory purchaseOrderId={order.id} />
            </Card>

            {/* SECTION 5 - INFORMATIONS DE LIVRAISON */}
            {(order.estimatedDeliveryDate || order.actualDeliveryDate) && (
              <Card className="p-4 sm:p-6">
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
              <Card className="p-4 sm:p-6">
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
            <Card className="p-4 sm:p-6">
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
            <Card className="p-4 sm:p-6 lg:sticky lg:top-6">
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
                    {isEditingArticles ? (
                      <span className="text-sm font-semibold text-orange-600">{formatPrice(calculateEditedTotal())} *</span>
                    ) : (
                      <PriceMaskingWrapper
                        price={total}
                        userRole={userRole || ''}
                        formatPrice={true}
                        showExplanation={false}
                        className="text-sm font-semibold text-gray-900"
                      />
                    )}
                  </div>
                  <div className="pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-lg font-bold text-gray-900">Total</span>
                      {isEditingArticles ? (
                        <span className="text-lg font-bold text-orange-600">{formatPrice(calculateEditedTotal())} *</span>
                      ) : (
                        <PriceMaskingWrapper
                          price={total}
                          userRole={userRole || ''}
                          formatPrice={true}
                          showExplanation={false}
                          className="text-lg font-bold text-purple-600"
                        />
                      )}
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

