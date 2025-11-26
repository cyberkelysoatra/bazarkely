/**
 * Service de gestion des bons de commande (Purchase Orders)
 * CRUD complet + transitions de workflow + historique
 */

import { supabase } from '../../../lib/supabase';
import workflowService from './pocWorkflowService';
import stockService from './pocStockService';
import { getAuthenticatedUserId, getUserCompany } from './authHelpers';
import type {
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderUpdate,
  PurchaseOrderItem,
  PurchaseOrderStatus,
  WorkflowHistory,
  ServiceResult
} from '../types/construction';

/**
 * Service de gestion des bons de commande
 */
class POCPurchaseOrderService {
  /**
   * Crée un nouveau bon de commande en brouillon
   * @param projectId - ID du projet (requis pour BCE, optionnel pour BCI)
   * @param items - Liste des items de la commande
   * @param orderData - Données de la commande (type, unité organisationnelle, fournisseur)
   */
  async createDraft(
    projectId: string | undefined,
    items: Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt'>[],
    orderData: {
      orderType: 'BCI' | 'BCE';
      orgUnitId?: string;
      supplierCompanyId?: string;
    }
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const userId = userIdResult.data;
      
      // Get user's builder company
      const companyResult = await getUserCompany(userId, 'builder');
      if (!companyResult.success || !companyResult.data) {
        return {
          success: false,
          error: companyResult.error || 'Votre compagnie n\'est pas encore approuvée'
        };
      }
      const company = companyResult.data;
      
      if (company.companyStatus !== 'approved') {
        return {
          success: false,
          error: 'Your company is not yet approved.'
        };
      }
      
      // Validation selon le type de commande
      if (orderData.orderType === 'BCI') {
        // BCI (Bon de Commande Interne): orgUnitId requis, projectId optionnel
        if (!orderData.orgUnitId) {
          return {
            success: false,
            error: 'Une unité organisationnelle est requise pour les commandes internes (BCI)'
          };
        }
        // Vérifier que l'org_unit existe et appartient à la compagnie
        const { data: orgUnit, error: orgUnitError } = await supabase
          .from('poc_org_units')
          .select('id, company_id')
          .eq('id', orderData.orgUnitId)
          .eq('company_id', company.companyId)
          .single();
        
        if (orgUnitError || !orgUnit) {
          return {
            success: false,
            error: 'Unité organisationnelle introuvable ou n\'appartient pas à votre compagnie'
          };
        }
      } else if (orderData.orderType === 'BCE') {
        // BCE (Bon de Commande Externe): projectId et supplierCompanyId requis, orgUnitId doit être NULL
        if (!projectId) {
          return {
            success: false,
            error: 'Un projet est requis pour les commandes externes (BCE)'
          };
        }
        if (!orderData.supplierCompanyId) {
          return {
            success: false,
            error: 'Un fournisseur est requis pour les commandes externes (BCE)'
          };
        }
        // Vérifier que le fournisseur existe et est de type 'supplier'
        const { data: supplier, error: supplierError } = await supabase
          .from('poc_companies')
          .select('id, type, status')
          .eq('id', orderData.supplierCompanyId)
          .eq('type', 'supplier')
          .single();
        
        if (supplierError || !supplier) {
          return {
            success: false,
            error: 'Fournisseur introuvable ou invalide'
          };
        }
        if (supplier.status !== 'approved') {
          return {
            success: false,
            error: 'Le fournisseur sélectionné n\'est pas approuvé'
          };
        }
      }
      
      // Générer un numéro de commande unique
      const orderNumber = await this.generateOrderNumber(company.companyId);

      // Créer le bon de commande avec les colonnes Phase 2
      const purchaseOrderData: any = {
        buyer_company_id: company.companyId,
        project_id: projectId || null, // NULL pour BCI, requis pour BCE
        created_by: userId,
        order_number: orderNumber,
        order_type: orderData.orderType, // BCI ou BCE
        org_unit_id: orderData.orgUnitId || null, // NULL pour BCE, requis pour BCI
        supplier_company_id: orderData.supplierCompanyId || null, // NULL pour BCI, requis pour BCE
        status: 'draft' as PurchaseOrderStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: purchaseOrder, error: poError } = await supabase
        .from('poc_purchase_orders')
        .insert(purchaseOrderData)
        .select()
        .single();

      if (poError || !purchaseOrder) {
        return {
          success: false,
          error: `Erreur création bon de commande: ${poError?.message || 'Inconnu'}`
        };
      }

      // Créer les items
      const itemsData = items.map(item => ({
        purchase_order_id: purchaseOrder.id,
        product_id: item.catalogItemId || null,
        item_name: item.itemName,
        item_description: item.description || null,
        item_sku: null, // SKU non disponible dans PurchaseOrderItem interface
        item_unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        notes: null,
        created_at: new Date().toISOString()
      }));

      const { error: itemsError } = await supabase
        .from('poc_purchase_order_items')
        .insert(itemsData);

      if (itemsError) {
        // Supprimer le bon de commande créé si les items échouent
        await supabase
          .from('poc_purchase_orders')
          .delete()
          .eq('id', purchaseOrder.id);

        return {
          success: false,
          error: `Erreur création items: ${itemsError.message}`
        };
      }

      // Récupérer le bon de commande complet avec items
      const fullOrder = await this.getById(purchaseOrder.id);
      
      return {
        success: true,
        data: fullOrder.data
      };
    } catch (error: any) {
      console.error('Erreur création brouillon:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du brouillon'
      };
    }
  }

  /**
   * Soumet un bon de commande pour validation (Chef Chantier)
   */
  async submitForApproval(
    orderId: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const userId = userIdResult.data;
      
      // Vérifier les permissions
      const canSubmit = await workflowService.canUserPerformAction(
        userId,
        orderId,
        'submit' as any
      );

      if (!canSubmit) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à soumettre ce bon de commande'
        };
      }

      // Effectuer la transition
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'pending_site_manager' as PurchaseOrderStatus,
        { userId: userId }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors de la soumission'
        };
      }

      // Récupérer le bon de commande mis à jour
      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur soumission:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la soumission'
      };
    }
  }

  /**
   * Approuve par le Chef Chantier (niveau 2)
   */
  async approveBySiteManager(
    orderId: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const siteManagerIdResult = await getAuthenticatedUserId();
      if (!siteManagerIdResult.success || !siteManagerIdResult.data) {
        return {
          success: false,
          error: siteManagerIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const siteManagerId = siteManagerIdResult.data;
      
      // Vérifier les permissions
      const canApprove = await workflowService.canUserPerformAction(
        siteManagerId,
        orderId,
        'approve_site' as any
      );

      if (!canApprove) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à approuver ce bon de commande'
        };
      }

      // Effectuer la transition vers approved_site_manager
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'approved_site_manager' as PurchaseOrderStatus,
        { userId: siteManagerId }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors de l\'approbation'
        };
      }

      // Transition automatique vers checking_stock
      const stockTransition = await workflowService.transitionPurchaseOrder(
        orderId,
        'checking_stock' as PurchaseOrderStatus,
        { userId: siteManagerId, skipValidation: true }
      );

      if (!stockTransition.success) {
        return {
          success: false,
          error: stockTransition.error || 'Erreur lors de la vérification stock'
        };
      }

      // Vérifier le stock automatiquement
      const stockCheck = await workflowService.checkStockAvailability(orderId);

      if (stockCheck.available) {
        // Stock suffisant → fulfilled_internal
        await workflowService.transitionPurchaseOrder(
          orderId,
          'fulfilled_internal' as PurchaseOrderStatus,
          { userId: siteManagerId, skipValidation: true }
        );
      } else {
        // Stock insuffisant → needs_external_order → pending_management
        await workflowService.transitionPurchaseOrder(
          orderId,
          'needs_external_order' as PurchaseOrderStatus,
          { userId: siteManagerId, skipValidation: true }
        );
        
        await workflowService.transitionPurchaseOrder(
          orderId,
          'pending_management' as PurchaseOrderStatus,
          { userId: siteManagerId, skipValidation: true }
        );
      }

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur approbation site manager:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'approbation'
      };
    }
  }

  /**
   * Rejette par le Chef Chantier (retour à draft)
   */
  async rejectBySiteManager(
    orderId: string,
    reason: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const siteManagerIdResult = await getAuthenticatedUserId();
      if (!siteManagerIdResult.success || !siteManagerIdResult.data) {
        return {
          success: false,
          error: siteManagerIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const siteManagerId = siteManagerIdResult.data;
      
      // Vérifier les permissions
      const canReject = await workflowService.canUserPerformAction(
        siteManagerId,
        orderId,
        'reject_site' as any
      );

      if (!canReject) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à rejeter ce bon de commande'
        };
      }

      // Effectuer la transition vers draft
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'draft' as PurchaseOrderStatus,
        { userId: siteManagerId, reason }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors du rejet'
        };
      }

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur rejet site manager:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du rejet'
      };
    }
  }

  /**
   * Approuve par la Direction (niveau 4 - conditionnel)
   */
  async approveByManagement(
    orderId: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const managementIdResult = await getAuthenticatedUserId();
      if (!managementIdResult.success || !managementIdResult.data) {
        return {
          success: false,
          error: managementIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const managementId = managementIdResult.data;
      
      // Vérifier les permissions
      const canApprove = await workflowService.canUserPerformAction(
        managementId,
        orderId,
        'approve_mgmt' as any
      );

      if (!canApprove) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à approuver ce bon de commande'
        };
      }

      // Effectuer la transition
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'approved_management' as PurchaseOrderStatus,
        { userId: managementId }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors de l\'approbation'
        };
      }

      // Transition automatique vers submitted_to_supplier
      const supplierTransition = await workflowService.transitionPurchaseOrder(
        orderId,
        'submitted_to_supplier' as PurchaseOrderStatus,
        { userId: managementId, skipValidation: true }
      );

      if (!supplierTransition.success) {
        return {
          success: false,
          error: supplierTransition.error || 'Erreur lors de la soumission fournisseur'
        };
      }

      // Transition automatique vers pending_supplier
      await workflowService.transitionPurchaseOrder(
        orderId,
        'pending_supplier' as PurchaseOrderStatus,
        { userId: managementId, skipValidation: true }
      );

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur approbation management:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'approbation'
      };
    }
  }

  /**
   * Rejette par la Direction (niveau 4)
   */
  async rejectByManagement(
    orderId: string,
    reason: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const managementIdResult = await getAuthenticatedUserId();
      if (!managementIdResult.success || !managementIdResult.data) {
        return {
          success: false,
          error: managementIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const managementId = managementIdResult.data;
      
      // Vérifier les permissions
      const canReject = await workflowService.canUserPerformAction(
        managementId,
        orderId,
        'reject_mgmt' as any
      );

      if (!canReject) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à rejeter ce bon de commande'
        };
      }

      // Effectuer la transition
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'rejected_management' as PurchaseOrderStatus,
        { userId: managementId, reason }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors du rejet'
        };
      }

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur rejet management:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du rejet'
      };
    }
  }

  /**
   * Soumet au fournisseur (niveau 5)
   */
  async submitToSupplier(orderId: string): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Récupérer le bon de commande
      const order = await this.getById(orderId);
      if (!order.success || !order.data) {
        return {
          success: false,
          error: 'Bon de commande introuvable'
        };
      }

      // Vérifier que le statut permet la soumission
      if (order.data.status !== 'approved_management') {
        return {
          success: false,
          error: 'Le bon de commande doit être approuvé par la direction avant soumission au fournisseur'
        };
      }

      // Get authenticated user
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const userId = userIdResult.data;
      
      // Effectuer la transition
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'submitted_to_supplier' as PurchaseOrderStatus,
        { userId: userId, skipValidation: true }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors de la soumission'
        };
      }

      // Transition automatique vers pending_supplier
      await workflowService.transitionPurchaseOrder(
        orderId,
        'pending_supplier' as PurchaseOrderStatus,
        { userId, skipValidation: true }
      );

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur soumission fournisseur:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la soumission'
      };
    }
  }

  /**
   * Accepte par le fournisseur (niveau 5)
   */
  async acceptBySupplier(
    orderId: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const supplierIdResult = await getAuthenticatedUserId();
      if (!supplierIdResult.success || !supplierIdResult.data) {
        return {
          success: false,
          error: supplierIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const supplierId = supplierIdResult.data;
      
      // Vérifier les permissions
      const canAccept = await workflowService.canUserPerformAction(
        supplierId,
        orderId,
        'accept_supplier' as any
      );

      if (!canAccept) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à accepter ce bon de commande'
        };
      }

      // Effectuer la transition
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'accepted_supplier' as PurchaseOrderStatus,
        { userId: supplierId }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors de l\'acceptation'
        };
      }

      // Transition automatique vers in_transit
      await workflowService.transitionPurchaseOrder(
        orderId,
        'in_transit' as PurchaseOrderStatus,
        { userId: supplierId, skipValidation: true }
      );

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur acceptation fournisseur:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'acceptation'
      };
    }
  }

  /**
   * Rejette par le fournisseur (niveau 5)
   */
  async rejectBySupplier(
    orderId: string,
    reason: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const supplierIdResult = await getAuthenticatedUserId();
      if (!supplierIdResult.success || !supplierIdResult.data) {
        return {
          success: false,
          error: supplierIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const supplierId = supplierIdResult.data;
      
      // Vérifier les permissions
      const canReject = await workflowService.canUserPerformAction(
        supplierId,
        orderId,
        'reject_supplier' as any
      );

      if (!canReject) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à rejeter ce bon de commande'
        };
      }

      // Effectuer la transition
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'rejected_supplier' as PurchaseOrderStatus,
        { userId: supplierId, reason }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors du rejet'
        };
      }

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur rejet fournisseur:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du rejet'
      };
    }
  }

  /**
   * Marque comme livré
   */
  async markAsDelivered(
    orderId: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const userId = userIdResult.data;
      
      // Vérifier les permissions
      const canDeliver = await workflowService.canUserPerformAction(
        userId,
        orderId,
        'deliver' as any
      );

      if (!canDeliver) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à marquer ce bon de commande comme livré'
        };
      }

      // Effectuer la transition
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'delivered' as PurchaseOrderStatus,
        { userId }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors de la mise à jour'
        };
      }

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur marquage livré:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour'
      };
    }
  }

  /**
   * Finalise le bon de commande (completed)
   */
  async complete(
    orderId: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const userId = userIdResult.data;
      
      // Vérifier les permissions
      const canComplete = await workflowService.canUserPerformAction(
        userId,
        orderId,
        'complete' as any
      );

      if (!canComplete) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à finaliser ce bon de commande'
        };
      }

      // Récupérer le bon de commande pour vérifier le statut
      const order = await this.getById(orderId);
      if (!order.success || !order.data) {
        return {
          success: false,
          error: 'Bon de commande introuvable'
        };
      }

      // Si le statut est fulfilled_internal, déduire le stock
      if (order.data.status === 'fulfilled_internal') {
        await stockService.fulfillFromStock(orderId);
      }

      // Effectuer la transition
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'completed' as PurchaseOrderStatus,
        { userId }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors de la finalisation'
        };
      }

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur finalisation:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la finalisation'
      };
    }
  }

  /**
   * Annule un bon de commande
   */
  async cancel(
    orderId: string,
    reason: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const userId = userIdResult.data;
      
      // Vérifier les permissions
      const canCancel = await workflowService.canUserPerformAction(
        userId,
        orderId,
        'cancel' as any
      );

      if (!canCancel) {
        return {
          success: false,
          error: 'Vous n\'êtes pas autorisé à annuler ce bon de commande'
        };
      }

      // Effectuer la transition
      const transition = await workflowService.transitionPurchaseOrder(
        orderId,
        'cancelled' as PurchaseOrderStatus,
        { userId, reason }
      );

      if (!transition.success) {
        return {
          success: false,
          error: transition.error || 'Erreur lors de l\'annulation'
        };
      }

      const result = await this.getById(orderId);
      return result;
    } catch (error: any) {
      console.error('Erreur annulation:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'annulation'
      };
    }
  }

  /**
   * Récupère un bon de commande par ID avec ses items
   */
  async getById(orderId: string): Promise<ServiceResult<PurchaseOrder>> {
    try {
      const { data: purchaseOrder, error: poError } = await supabase
        .from('poc_purchase_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (poError || !purchaseOrder) {
        return {
          success: false,
          error: 'Bon de commande introuvable'
        };
      }

      // Récupérer les items
      const { data: items, error: itemsError } = await supabase
        .from('poc_purchase_order_items')
        .select('*')
        .eq('purchase_order_id', orderId)
        .order('created_at');

      if (itemsError) {
        console.error('Erreur récupération items:', itemsError);
      }

      // Mapper les données avec support Phase 2 (orderType, orgUnitId)
      const mappedOrder: PurchaseOrder = {
        id: purchaseOrder.id,
        companyId: purchaseOrder.buyer_company_id,
        projectId: purchaseOrder.project_id || undefined, // NULL pour BCI, défini pour BCE
        orgUnitId: purchaseOrder.org_unit_id || undefined, // NULL pour BCE, défini pour BCI
        orderType: purchaseOrder.order_type as 'BCI' | 'BCE' | undefined, // Type de commande (Phase 2)
        creatorId: purchaseOrder.created_by,
        siteManagerId: purchaseOrder.site_manager_id || undefined,
        supplierId: purchaseOrder.supplier_company_id || undefined, // NULL pour BCI, défini pour BCE
        orderNumber: purchaseOrder.order_number,
        title: purchaseOrder.order_number, // Utiliser order_number comme title (colonne title n'existe pas)
        status: purchaseOrder.status as PurchaseOrderStatus,
        createdAt: new Date(purchaseOrder.created_at),
        updatedAt: new Date(purchaseOrder.updated_at),
        submittedAt: purchaseOrder.submitted_at ? new Date(purchaseOrder.submitted_at) : undefined,
        approvedSiteManagerAt: purchaseOrder.site_manager_approved_at ? new Date(purchaseOrder.site_manager_approved_at) : undefined,
        approvedManagementAt: purchaseOrder.management_approved_at ? new Date(purchaseOrder.management_approved_at) : undefined,
        submittedToSupplierAt: purchaseOrder.supplier_submitted_at ? new Date(purchaseOrder.supplier_submitted_at) : undefined,
        acceptedSupplierAt: purchaseOrder.supplier_accepted_at ? new Date(purchaseOrder.supplier_accepted_at) : undefined,
        deliveredAt: purchaseOrder.actual_delivery_date ? new Date(purchaseOrder.actual_delivery_date) : undefined,
        completedAt: undefined, // Will be set when status is completed
        cancelledAt: undefined, // Will be set when status is cancelled
        rejectionReason: purchaseOrder.site_manager_rejection_reason || purchaseOrder.management_rejection_reason || purchaseOrder.supplier_rejection_reason || undefined,
        cancellationReason: undefined,
        priority: 'medium' as const,
        estimatedDeliveryDate: purchaseOrder.estimated_delivery_date ? new Date(purchaseOrder.estimated_delivery_date) : undefined,
        actualDeliveryDate: purchaseOrder.actual_delivery_date ? new Date(purchaseOrder.actual_delivery_date) : undefined,
        items: (items || []).map(item => ({
          id: item.id,
          purchaseOrderId: item.purchase_order_id,
          catalogItemId: item.product_id || undefined,
          itemName: item.item_name,
          description: item.item_description || undefined,
          quantity: item.quantity,
          unit: item.item_unit,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }))
      };

      return {
        success: true,
        data: mappedOrder
      };
    } catch (error: any) {
      console.error('Erreur récupération bon de commande:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération'
      };
    }
  }

  /**
   * Récupère l'historique des transitions de workflow
   */
  async getWorkflowHistory(orderId: string): Promise<ServiceResult<WorkflowHistory[]>> {
    try {
      const { data: history, error } = await supabase
        .from('poc_workflow_history')
        .select('*')
        .eq('purchase_order_id', orderId)
        .order('changed_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: `Erreur récupération historique: ${error.message}`
        };
      }

      const mappedHistory: WorkflowHistory[] = (history || []).map(item => ({
        id: item.id,
        purchaseOrderId: item.purchase_order_id,
        fromStatus: item.from_status as PurchaseOrderStatus,
        toStatus: item.to_status as PurchaseOrderStatus,
        changedBy: item.changed_by,
        changedAt: new Date(item.changed_at),
        notes: item.notes || undefined,
        action: item.action
      }));

      return {
        success: true,
        data: mappedHistory
      };
    } catch (error: any) {
      console.error('Erreur récupération historique:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération de l\'historique'
      };
    }
  }

  /**
   * Génère un numéro de commande unique
   */
  private async generateOrderNumber(buyerCompanyId: string): Promise<string> {
    try {
      // Récupérer le dernier numéro de commande pour cette entreprise
      const { data: lastOrder } = await supabase
        .from('poc_purchase_orders')
        .select('order_number')
        .eq('buyer_company_id', buyerCompanyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastOrder?.order_number) {
        // Extraire le numéro (format: PO-YYYY-MM-XXXX)
        const match = lastOrder.order_number.match(/-(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const number = String(nextNumber).padStart(4, '0');

      return `PO-${year}-${month}-${number}`;
    } catch (error) {
      // En cas d'erreur, utiliser un timestamp
      const timestamp = Date.now();
      return `PO-${timestamp}`;
    }
  }
}

export default new POCPurchaseOrderService();

