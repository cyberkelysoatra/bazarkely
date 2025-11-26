/**
 * Service de gestion du workflow des bons de commande
 * Implémente la machine à états avec 17 statuts et validation multi-niveaux
 * 
 * Architecture du workflow:
 * - Niveau 1: Création et soumission (Chef Equipe)
 * - Niveau 2: Validation Chef Chantier
 * - Niveau 3: Vérification stock (automatique)
 * - Niveau 4: Validation Direction (conditionnelle si montant >= 5M MGA)
 * - Niveau 5: Interaction Fournisseur
 * - Niveau 6: Livraison et finalisation
 */

import { supabase } from '../../../lib/supabase';
import { getAuthenticatedUserId, getUserRole } from './authHelpers';
import {
  PurchaseOrderStatus,
  MemberRole,
  WorkflowAction,
  type ServiceResult,
  type StockCheckResult,
  type StockItemResult,
  type PurchaseOrder
} from '../types/construction';

/**
 * Matrice des transitions valides entre statuts
 * Chaque clé représente un statut source, la valeur est un tableau des statuts de destination possibles
 */
const VALID_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  // Niveau 1 - Création
  [PurchaseOrderStatus.DRAFT]: [
    PurchaseOrderStatus.PENDING_SITE_MANAGER,
    PurchaseOrderStatus.CANCELLED
  ],
  
  // Niveau 2 - Validation Chef Chantier
  [PurchaseOrderStatus.PENDING_SITE_MANAGER]: [
    PurchaseOrderStatus.APPROVED_SITE_MANAGER,
    PurchaseOrderStatus.DRAFT,
    PurchaseOrderStatus.CANCELLED
  ],
  
  [PurchaseOrderStatus.APPROVED_SITE_MANAGER]: [
    PurchaseOrderStatus.CHECKING_STOCK
  ],
  
  // Niveau 3 - Vérification stock (automatique)
  [PurchaseOrderStatus.CHECKING_STOCK]: [
    PurchaseOrderStatus.FULFILLED_INTERNAL,
    PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER
  ],
  
  // Statuts finaux (pas de transitions)
  [PurchaseOrderStatus.FULFILLED_INTERNAL]: [],
  
  // Niveau 4 - Validation Direction
  [PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER]: [
    PurchaseOrderStatus.PENDING_MANAGEMENT
  ],
  
  [PurchaseOrderStatus.PENDING_MANAGEMENT]: [
    PurchaseOrderStatus.APPROVED_MANAGEMENT,
    PurchaseOrderStatus.REJECTED_MANAGEMENT,
    PurchaseOrderStatus.CANCELLED
  ],
  
  [PurchaseOrderStatus.REJECTED_MANAGEMENT]: [
    PurchaseOrderStatus.DRAFT
  ],
  
  [PurchaseOrderStatus.APPROVED_MANAGEMENT]: [
    PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER
  ],
  
  // Niveau 5 - Interaction Fournisseur
  [PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER]: [
    PurchaseOrderStatus.PENDING_SUPPLIER
  ],
  
  [PurchaseOrderStatus.PENDING_SUPPLIER]: [
    PurchaseOrderStatus.ACCEPTED_SUPPLIER,
    PurchaseOrderStatus.REJECTED_SUPPLIER,
    PurchaseOrderStatus.CANCELLED
  ],
  
  [PurchaseOrderStatus.ACCEPTED_SUPPLIER]: [
    PurchaseOrderStatus.IN_TRANSIT
  ],
  
  [PurchaseOrderStatus.REJECTED_SUPPLIER]: [
    PurchaseOrderStatus.PENDING_MANAGEMENT
  ],
  
  // Niveau 6 - Livraison
  [PurchaseOrderStatus.IN_TRANSIT]: [
    PurchaseOrderStatus.DELIVERED
  ],
  
  [PurchaseOrderStatus.DELIVERED]: [
    PurchaseOrderStatus.COMPLETED
  ],
  
  // Statuts finaux (pas de transitions)
  [PurchaseOrderStatus.COMPLETED]: [],
  [PurchaseOrderStatus.CANCELLED]: []
};

/**
 * Matrice des permissions par rôle
 * Chaque rôle peut effectuer certaines actions selon le statut actuel
 */
const ROLE_PERMISSIONS: Record<string, Record<PurchaseOrderStatus, WorkflowAction[]>> = {
  // Chef d'équipe (chef_equipe)
  [MemberRole.CHEF_EQUIPE]: {
    [PurchaseOrderStatus.DRAFT]: [WorkflowAction.SUBMIT, WorkflowAction.CANCEL],
    [PurchaseOrderStatus.PENDING_SITE_MANAGER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.REJECTED_MANAGEMENT]: [], // Peut modifier et resoumettre via draft
    [PurchaseOrderStatus.PENDING_SUPPLIER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.PENDING_MANAGEMENT]: [WorkflowAction.CANCEL],
    // Tous les autres statuts: aucune action
    [PurchaseOrderStatus.APPROVED_SITE_MANAGER]: [],
    [PurchaseOrderStatus.CHECKING_STOCK]: [],
    [PurchaseOrderStatus.FULFILLED_INTERNAL]: [],
    [PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER]: [],
    [PurchaseOrderStatus.APPROVED_MANAGEMENT]: [],
    [PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER]: [],
    [PurchaseOrderStatus.ACCEPTED_SUPPLIER]: [],
    [PurchaseOrderStatus.REJECTED_SUPPLIER]: [],
    [PurchaseOrderStatus.IN_TRANSIT]: [],
    [PurchaseOrderStatus.DELIVERED]: [],
    [PurchaseOrderStatus.COMPLETED]: [],
    [PurchaseOrderStatus.CANCELLED]: []
  },
  
  // Chef de chantier (chef_chantier)
  [MemberRole.CHEF_CHANTIER]: {
    [PurchaseOrderStatus.PENDING_SITE_MANAGER]: [
      WorkflowAction.APPROVE_SITE,
      WorkflowAction.REJECT_SITE,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.DRAFT]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.APPROVED_SITE_MANAGER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.CHECKING_STOCK]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.FULFILLED_INTERNAL]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.PENDING_MANAGEMENT]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.REJECTED_MANAGEMENT]: [],
    [PurchaseOrderStatus.APPROVED_MANAGEMENT]: [],
    [PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER]: [],
    [PurchaseOrderStatus.PENDING_SUPPLIER]: [],
    [PurchaseOrderStatus.ACCEPTED_SUPPLIER]: [],
    [PurchaseOrderStatus.REJECTED_SUPPLIER]: [],
    [PurchaseOrderStatus.IN_TRANSIT]: [],
    [PurchaseOrderStatus.DELIVERED]: [],
    [PurchaseOrderStatus.COMPLETED]: [],
    [PurchaseOrderStatus.CANCELLED]: []
  },
  
  // Direction
  [MemberRole.DIRECTION]: {
    [PurchaseOrderStatus.PENDING_MANAGEMENT]: [
      WorkflowAction.APPROVE_MGMT,
      WorkflowAction.REJECT_MGMT,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.REJECTED_MANAGEMENT]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.APPROVED_MANAGEMENT]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.PENDING_SUPPLIER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.DRAFT]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.PENDING_SITE_MANAGER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.APPROVED_SITE_MANAGER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.CHECKING_STOCK]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.FULFILLED_INTERNAL]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.ACCEPTED_SUPPLIER]: [],
    [PurchaseOrderStatus.REJECTED_SUPPLIER]: [],
    [PurchaseOrderStatus.IN_TRANSIT]: [],
    [PurchaseOrderStatus.DELIVERED]: [],
    [PurchaseOrderStatus.COMPLETED]: [],
    [PurchaseOrderStatus.CANCELLED]: []
  },
  
  // Magasinier
  [MemberRole.MAGASINIER]: {
    [PurchaseOrderStatus.DELIVERED]: [WorkflowAction.COMPLETE],
    [PurchaseOrderStatus.COMPLETED]: [],
    [PurchaseOrderStatus.DRAFT]: [],
    [PurchaseOrderStatus.PENDING_SITE_MANAGER]: [],
    [PurchaseOrderStatus.APPROVED_SITE_MANAGER]: [],
    [PurchaseOrderStatus.CHECKING_STOCK]: [],
    [PurchaseOrderStatus.FULFILLED_INTERNAL]: [],
    [PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER]: [],
    [PurchaseOrderStatus.PENDING_MANAGEMENT]: [],
    [PurchaseOrderStatus.REJECTED_MANAGEMENT]: [],
    [PurchaseOrderStatus.APPROVED_MANAGEMENT]: [],
    [PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER]: [],
    [PurchaseOrderStatus.PENDING_SUPPLIER]: [],
    [PurchaseOrderStatus.ACCEPTED_SUPPLIER]: [],
    [PurchaseOrderStatus.REJECTED_SUPPLIER]: [],
    [PurchaseOrderStatus.IN_TRANSIT]: [],
    [PurchaseOrderStatus.CANCELLED]: []
  },
  
  // Fournisseur (supplier_member - note: ce rôle n'est pas dans MemberRole enum, 
  // mais on peut l'utiliser comme string pour les membres de compagnie supplier)
  'supplier_member': {
    [PurchaseOrderStatus.PENDING_SUPPLIER]: [
      WorkflowAction.ACCEPT_SUPPLIER,
      WorkflowAction.REJECT_SUPPLIER,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.ACCEPTED_SUPPLIER]: [
      WorkflowAction.DELIVER, // mark_in_transit
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.IN_TRANSIT]: [
      WorkflowAction.DELIVER, // mark_delivered
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.DELIVERED]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.DRAFT]: [],
    [PurchaseOrderStatus.PENDING_SITE_MANAGER]: [],
    [PurchaseOrderStatus.APPROVED_SITE_MANAGER]: [],
    [PurchaseOrderStatus.CHECKING_STOCK]: [],
    [PurchaseOrderStatus.FULFILLED_INTERNAL]: [],
    [PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER]: [],
    [PurchaseOrderStatus.PENDING_MANAGEMENT]: [],
    [PurchaseOrderStatus.REJECTED_MANAGEMENT]: [],
    [PurchaseOrderStatus.APPROVED_MANAGEMENT]: [],
    [PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER]: [],
    [PurchaseOrderStatus.REJECTED_SUPPLIER]: [],
    [PurchaseOrderStatus.COMPLETED]: [],
    [PurchaseOrderStatus.CANCELLED]: []
  },
  
  // Administrateur (toutes les actions)
  [MemberRole.ADMIN]: {
    [PurchaseOrderStatus.DRAFT]: [
      WorkflowAction.SUBMIT,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.PENDING_SITE_MANAGER]: [
      WorkflowAction.APPROVE_SITE,
      WorkflowAction.REJECT_SITE,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.APPROVED_SITE_MANAGER]: [
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.CHECKING_STOCK]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.FULFILLED_INTERNAL]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.PENDING_MANAGEMENT]: [
      WorkflowAction.APPROVE_MGMT,
      WorkflowAction.REJECT_MGMT,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.REJECTED_MANAGEMENT]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.APPROVED_MANAGEMENT]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.PENDING_SUPPLIER]: [
      WorkflowAction.ACCEPT_SUPPLIER,
      WorkflowAction.REJECT_SUPPLIER,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.ACCEPTED_SUPPLIER]: [
      WorkflowAction.DELIVER,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.REJECTED_SUPPLIER]: [WorkflowAction.CANCEL],
    [PurchaseOrderStatus.IN_TRANSIT]: [
      WorkflowAction.DELIVER,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.DELIVERED]: [
      WorkflowAction.COMPLETE,
      WorkflowAction.CANCEL
    ],
    [PurchaseOrderStatus.COMPLETED]: [],
    [PurchaseOrderStatus.CANCELLED]: []
  }
};

/**
 * Mapping des actions vers les statuts de destination
 */
const ACTION_TO_STATUS: Record<WorkflowAction, PurchaseOrderStatus> = {
  [WorkflowAction.SUBMIT]: PurchaseOrderStatus.PENDING_SITE_MANAGER,
  [WorkflowAction.APPROVE_SITE]: PurchaseOrderStatus.APPROVED_SITE_MANAGER,
  [WorkflowAction.REJECT_SITE]: PurchaseOrderStatus.DRAFT,
  [WorkflowAction.APPROVE_MGMT]: PurchaseOrderStatus.APPROVED_MANAGEMENT,
  [WorkflowAction.REJECT_MGMT]: PurchaseOrderStatus.REJECTED_MANAGEMENT,
  [WorkflowAction.ACCEPT_SUPPLIER]: PurchaseOrderStatus.ACCEPTED_SUPPLIER,
  [WorkflowAction.REJECT_SUPPLIER]: PurchaseOrderStatus.REJECTED_SUPPLIER,
  [WorkflowAction.DELIVER]: PurchaseOrderStatus.DELIVERED, // Peut être in_transit ou delivered selon contexte
  [WorkflowAction.COMPLETE]: PurchaseOrderStatus.COMPLETED,
  [WorkflowAction.CANCEL]: PurchaseOrderStatus.CANCELLED
};

/**
 * Seuil de montant pour validation direction (5 millions MGA)
 * NOTE: Cette constante est définie ici pour référence, mais la logique de décision
 * sur le passage par pending_management doit être gérée par le service purchase order
 * qui vérifie le montant total avant d'effectuer la transition.
 */
const MANAGEMENT_APPROVAL_THRESHOLD = 5000000;

/**
 * Service de workflow des bons de commande
 */
class POCWorkflowService {
  /**
   * Valide si une transition entre deux statuts est autorisée
   * 
   * @param currentStatus - Statut actuel du bon de commande
   * @param newStatus - Nouveau statut souhaité
   * @param userRole - Rôle de l'utilisateur effectuant la transition
   * @returns true si la transition est valide, false sinon
   */
  validateTransition(
    currentStatus: PurchaseOrderStatus,
    newStatus: PurchaseOrderStatus,
    userRole: string
  ): boolean {
    // Vérifier si la transition existe dans la matrice
    const validDestinations = VALID_TRANSITIONS[currentStatus];
    if (!validDestinations || !validDestinations.includes(newStatus)) {
      return false;
    }
    
    // Vérifier les permissions du rôle
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    if (!rolePermissions) {
      return false;
    }
    
    const allowedActions = rolePermissions[currentStatus] || [];
    
    // Trouver l'action correspondant à cette transition
    const action = this.getActionForTransition(currentStatus, newStatus);
    if (!action) {
      return false;
    }
    
    // Admin a toutes les permissions
    if (userRole === MemberRole.ADMIN) {
      return true;
    }
    
    // Vérifier si l'action est autorisée pour ce rôle
    return allowedActions.includes(action);
  }
  
  /**
   * Détermine l'action correspondant à une transition
   * 
   * @param fromStatus - Statut source
   * @param toStatus - Statut destination
   * @returns L'action correspondante ou null
   */
  private getActionForTransition(
    fromStatus: PurchaseOrderStatus,
    toStatus: PurchaseOrderStatus
  ): WorkflowAction | null {
    // Transitions spéciales
    if (fromStatus === PurchaseOrderStatus.APPROVED_SITE_MANAGER && 
        toStatus === PurchaseOrderStatus.CHECKING_STOCK) {
      return null; // Transition automatique, pas d'action utilisateur
    }
    
    if (fromStatus === PurchaseOrderStatus.CHECKING_STOCK) {
      return null; // Transition automatique basée sur stock
    }
    
    if (fromStatus === PurchaseOrderStatus.NEEDS_EXTERNAL_ORDER && 
        toStatus === PurchaseOrderStatus.PENDING_MANAGEMENT) {
      return null; // Transition automatique
    }
    
    if (fromStatus === PurchaseOrderStatus.APPROVED_MANAGEMENT && 
        toStatus === PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER) {
      return null; // Transition automatique
    }
    
    if (fromStatus === PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER && 
        toStatus === PurchaseOrderStatus.PENDING_SUPPLIER) {
      return null; // Transition automatique
    }
    
    if (fromStatus === PurchaseOrderStatus.ACCEPTED_SUPPLIER && 
        toStatus === PurchaseOrderStatus.IN_TRANSIT) {
      return WorkflowAction.DELIVER; // mark_in_transit
    }
    
    if (fromStatus === PurchaseOrderStatus.IN_TRANSIT && 
        toStatus === PurchaseOrderStatus.DELIVERED) {
      return WorkflowAction.DELIVER; // mark_delivered
    }
    
    // Recherche dans le mapping standard
    for (const [action, targetStatus] of Object.entries(ACTION_TO_STATUS)) {
      if (targetStatus === toStatus) {
        return action as WorkflowAction;
      }
    }
    
    return null;
  }
  
  /**
   * Vérifie si un utilisateur peut effectuer une action sur un bon de commande
   * 
   * @param userId - ID de l'utilisateur
   * @param purchaseOrderId - ID du bon de commande
   * @param action - Action à effectuer
   * @returns ServiceResult avec true si l'utilisateur peut effectuer l'action
   */
  async canUserPerformAction(
    userId: string,
    purchaseOrderId: string,
    action: string
  ): Promise<ServiceResult<boolean>> {
    try {
      // Récupérer le bon de commande (inclure org_unit_id pour distinguer BCI vs BCE)
      const { data: order, error: orderError } = await supabase
        .from('poc_purchase_orders')
        .select('id, status, buyer_company_id, supplier_company_id, org_unit_id')
        .eq('id', purchaseOrderId)
        .single();
      
      if (orderError || !order) {
        return {
          success: false,
          error: 'Bon de commande introuvable'
        };
      }
      
      // Type assertion pour les données Supabase
      const orderData = order as any;
      
      // Déterminer la compagnie concernée (buyer ou supplier)
      // Pour les actions supplier, on vérifie dans supplier_company_id
      // Pour les autres, on vérifie dans buyer_company_id
      const isSupplierAction = [
        WorkflowAction.ACCEPT_SUPPLIER,
        WorkflowAction.REJECT_SUPPLIER,
        WorkflowAction.DELIVER
      ].includes(action as WorkflowAction);
      
      const companyId = isSupplierAction 
        ? orderData.supplier_company_id 
        : orderData.buyer_company_id;
      
      if (!companyId) {
        return {
          success: false,
          error: 'Compagnie introuvable pour ce bon de commande'
        };
      }
      
      // Récupérer le rôle de l'utilisateur dans la compagnie
      const userRole = await getUserRole(userId, companyId);
      
      if (!userRole) {
        return {
          success: false,
          error: 'Vous n\'êtes pas membre de cette compagnie'
        };
      }
      
      // Normaliser le rôle (supplier members peuvent avoir différents rôles)
      let normalizedRole = userRole as string;
      if (isSupplierAction && orderData.supplier_company_id === companyId) {
        // Pour les actions supplier, on accepte n'importe quel membre de la compagnie supplier
        normalizedRole = 'supplier_member';
      }
      
      // Vérifier les permissions
      const rolePermissions = ROLE_PERMISSIONS[normalizedRole] || {};
      const allowedActions = rolePermissions[orderData.status as PurchaseOrderStatus] || [];
      
      // Admin a toutes les permissions
      if (normalizedRole === MemberRole.ADMIN) {
        return {
          success: true,
          data: true
        };
      }
      
      // Vérifier si l'action est autorisée
      const canPerform = allowedActions.includes(action as WorkflowAction);
      
      // PHASE 2: Validation org_unit pour les commandes BCI
      // BCI (Bon de Commande Interne): commande avec org_unit_id, validation par chef_chantier de l'org_unit
      // BCE (Bon de Commande Externe): commande sans org_unit_id, validation au niveau compagnie
      if (canPerform && isBCIOrder(orderData)) {
        // Pour les commandes BCI, vérifier l'appartenance à l'org_unit
        // Spécifiquement pour chef_chantier validant des commandes BCI
        if (normalizedRole === MemberRole.CHEF_CHANTIER && 
            (action === WorkflowAction.APPROVE_SITE || action === WorkflowAction.REJECT_SITE)) {
          const orgUnitCheck = await isUserInOrgUnit(userId, orderData.org_unit_id, companyId);
          if (!orgUnitCheck.success || !orgUnitCheck.data) {
            return {
              success: false,
              error: 'Vous ne pouvez valider que les commandes de vos unités organisationnelles assignées'
            };
          }
        }
      }
      // Pour les commandes BCE (org_unit_id NULL) ou autres rôles, validation au niveau compagnie (comportement existant)
      
      return {
        success: true,
        data: canPerform
      };
    } catch (error: any) {
      console.error('Erreur vérification permissions:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la vérification des permissions'
      };
    }
  }
  
  /**
   * Effectue une transition de statut pour un bon de commande
   * 
   * @param orderId - ID du bon de commande
   * @param newStatus - Nouveau statut
   * @param options - Options de transition (userId, notes, skipValidation)
   * @returns ServiceResult avec le bon de commande mis à jour
   */
  async transitionPurchaseOrder(
    orderId: string,
    newStatus: PurchaseOrderStatus,
    options: {
      userId: string;
      notes?: string;
      reason?: string;
      skipValidation?: boolean;
    }
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      const { userId, notes, reason, skipValidation = false } = options;
      
      // Récupérer le bon de commande actuel
      const { data: currentOrder, error: fetchError } = await supabase
        .from('poc_purchase_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (fetchError || !currentOrder) {
        return {
          success: false,
          error: 'Bon de commande introuvable'
        };
      }
      
      // Type assertion pour les données Supabase
      const currentOrderData = currentOrder as any;
      const currentStatus = currentOrderData.status as PurchaseOrderStatus;
      
      // Valider la transition (sauf si skipValidation est true pour transitions automatiques)
      if (!skipValidation) {
        // Récupérer le rôle de l'utilisateur
        const companyId = currentOrderData.buyer_company_id;
        const userRole = await getUserRole(userId, companyId);
        
        if (!userRole) {
          return {
            success: false,
            error: 'Vous n\'êtes pas membre de cette compagnie'
          };
        }
        
        // Normaliser le rôle pour supplier
        let normalizedRole = userRole as string;
        const isSupplierAction = [
          PurchaseOrderStatus.ACCEPTED_SUPPLIER,
          PurchaseOrderStatus.REJECTED_SUPPLIER,
          PurchaseOrderStatus.IN_TRANSIT,
          PurchaseOrderStatus.DELIVERED
        ].includes(newStatus);
        
        if (isSupplierAction && currentOrderData.supplier_company_id) {
          const supplierRole = await getUserRole(userId, currentOrderData.supplier_company_id);
          if (supplierRole) {
            normalizedRole = 'supplier_member';
          }
        }
        
        if (!this.validateTransition(currentStatus, newStatus, normalizedRole)) {
          return {
            success: false,
            error: `Transition non autorisée de ${currentStatus} vers ${newStatus} pour le rôle ${normalizedRole}`
          };
        }
        
        // PHASE 2: Validation org_unit pour les commandes BCI
        // Vérifier l'appartenance à l'org_unit pour les transitions chef_chantier sur commandes BCI
        if (isBCIOrder(currentOrderData) && 
            normalizedRole === MemberRole.CHEF_CHANTIER &&
            currentStatus === PurchaseOrderStatus.PENDING_SITE_MANAGER &&
            newStatus === PurchaseOrderStatus.APPROVED_SITE_MANAGER) {
          // Transition d'approbation chef_chantier sur commande BCI
          const orgUnitCheck = await isUserInOrgUnit(userId, currentOrderData.org_unit_id, companyId);
          if (!orgUnitCheck.success || !orgUnitCheck.data) {
            return {
              success: false,
              error: 'Vous ne pouvez valider que les commandes de vos unités organisationnelles assignées'
            };
          }
        }
        // Pour les commandes BCE (org_unit_id NULL) ou autres transitions, pas de vérification org_unit (comportement existant)
      }
      
      // Préparer les mises à jour selon le nouveau statut
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // Mettre à jour les timestamps selon le statut
      const now = new Date().toISOString();
      switch (newStatus) {
        case PurchaseOrderStatus.PENDING_SITE_MANAGER:
          updateData.submitted_at = now;
          break;
        case PurchaseOrderStatus.APPROVED_SITE_MANAGER:
          updateData.site_manager_approved_at = now;
          updateData.site_manager_id = userId;
          break;
        case PurchaseOrderStatus.REJECTED_MANAGEMENT:
          updateData.management_rejected_at = now;
          if (reason) {
            updateData.management_rejection_reason = reason;
          }
          break;
        case PurchaseOrderStatus.APPROVED_MANAGEMENT:
          updateData.management_approved_at = now;
          break;
        case PurchaseOrderStatus.SUBMITTED_TO_SUPPLIER:
          updateData.supplier_submitted_at = now;
          break;
        case PurchaseOrderStatus.ACCEPTED_SUPPLIER:
          updateData.supplier_accepted_at = now;
          break;
        case PurchaseOrderStatus.REJECTED_SUPPLIER:
          updateData.supplier_rejected_at = now;
          if (reason) {
            updateData.supplier_rejection_reason = reason;
          }
          break;
        case PurchaseOrderStatus.DELIVERED:
          updateData.actual_delivery_date = now;
          break;
        case PurchaseOrderStatus.COMPLETED:
          // completed_at sera géré par le service purchase order
          break;
        case PurchaseOrderStatus.CANCELLED:
          if (reason) {
            updateData.cancellation_reason = reason;
          }
          break;
      }
      
      // Utiliser une transaction Supabase pour garantir l'atomicité
      // Note: Supabase ne supporte pas les transactions explicites côté client,
      // on utilise donc des appels séquentiels avec rollback manuel en cas d'erreur
      
      // 1. Mettre à jour le statut du bon de commande
      const { data: updatedOrder, error: updateError } = await supabase
        .from('poc_purchase_orders')
        .update(updateData as any)
        .eq('id', orderId)
        .select()
        .single();
      
      if (updateError || !updatedOrder) {
        return {
          success: false,
          error: `Erreur lors de la mise à jour du statut: ${updateError?.message || 'Inconnu'}`
        };
      }
      
      // 2. Enregistrer dans l'historique du workflow
      const historyData = {
        purchase_order_id: orderId,
        from_status: currentStatus,
        to_status: newStatus,
        changed_by: userId,
        changed_at: now,
        notes: notes || null,
        metadata: {
          reason: reason || null,
          action: this.getActionForTransition(currentStatus, newStatus) || null
        }
      };
      
      const { error: historyError } = await supabase
        .from('poc_purchase_order_workflow_history')
        .insert(historyData as any);
      
      if (historyError) {
        // Rollback: restaurer l'ancien statut
        await supabase
          .from('poc_purchase_orders')
          .update({ status: currentStatus } as any)
          .eq('id', orderId);
        
        return {
          success: false,
          error: `Erreur lors de l'enregistrement de l'historique: ${historyError.message}`
        };
      }
      
      // 3. Récupérer le bon de commande complet avec items
      // Utiliser le service purchase order pour le mapping complet
      const { data: fullOrder, error: fullOrderError } = await supabase
        .from('poc_purchase_orders')
        .select(`
          *,
          poc_purchase_order_items (*)
        `)
        .eq('id', orderId)
        .single();
      
      if (fullOrderError || !fullOrder) {
        return {
          success: false,
          error: 'Erreur lors de la récupération du bon de commande'
        };
      }
      
      // Type assertion pour les données Supabase
      const fullOrderData = fullOrder as any;
      
      // Mapper vers le type PurchaseOrder
      const mappedOrder: PurchaseOrder = {
        id: fullOrderData.id,
        companyId: fullOrderData.buyer_company_id,
        projectId: fullOrderData.project_id,
        creatorId: fullOrderData.created_by,
        siteManagerId: fullOrderData.site_manager_id || undefined,
        supplierId: fullOrderData.supplier_company_id || undefined,
        orderNumber: fullOrderData.order_number,
        title: fullOrderData.order_number || `Commande ${fullOrderData.order_number}`, // Fallback si pas de title
        description: fullOrderData.notes || undefined,
        status: fullOrderData.status as PurchaseOrderStatus,
        createdAt: new Date(fullOrderData.created_at),
        updatedAt: new Date(fullOrderData.updated_at),
        submittedAt: fullOrderData.submitted_at ? new Date(fullOrderData.submitted_at) : undefined,
        approvedSiteManagerAt: fullOrderData.site_manager_approved_at ? new Date(fullOrderData.site_manager_approved_at) : undefined,
        approvedManagementAt: fullOrderData.management_approved_at ? new Date(fullOrderData.management_approved_at) : undefined,
        submittedToSupplierAt: fullOrderData.supplier_submitted_at ? new Date(fullOrderData.supplier_submitted_at) : undefined,
        acceptedSupplierAt: fullOrderData.supplier_accepted_at ? new Date(fullOrderData.supplier_accepted_at) : undefined,
        deliveredAt: fullOrderData.actual_delivery_date ? new Date(fullOrderData.actual_delivery_date) : undefined,
        completedAt: undefined,
        cancelledAt: undefined,
        rejectionReason: fullOrderData.site_manager_rejection_reason || 
                        fullOrderData.management_rejection_reason || 
                        fullOrderData.supplier_rejection_reason || 
                        undefined,
        cancellationReason: fullOrderData.cancellation_reason || undefined,
        priority: 'medium' as const,
        estimatedDeliveryDate: fullOrderData.estimated_delivery_date ? new Date(fullOrderData.estimated_delivery_date) : undefined,
        actualDeliveryDate: fullOrderData.actual_delivery_date ? new Date(fullOrderData.actual_delivery_date) : undefined,
        items: (fullOrderData.poc_purchase_order_items || []).map((item: any) => ({
          id: item.id,
          purchaseOrderId: item.purchase_order_id,
          catalogItemId: item.product_id || undefined,
          itemName: item.item_name,
          description: item.item_description || undefined,
          quantity: item.quantity,
          unit: item.item_unit,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price),
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }))
      };
      
      return {
        success: true,
        data: mappedOrder
      };
    } catch (error: any) {
      console.error('Erreur transition workflow:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la transition du workflow'
      };
    }
  }
  
  /**
   * Récupère les actions disponibles pour un utilisateur sur un bon de commande
   * 
   * @param orderId - ID du bon de commande
   * @param userId - ID de l'utilisateur
   * @returns ServiceResult avec la liste des actions disponibles
   */
  async getAvailableActions(
    orderId: string,
    userId: string
  ): Promise<ServiceResult<WorkflowAction[]>> {
    try {
      // Récupérer le bon de commande (inclure org_unit_id pour distinguer BCI vs BCE)
      const { data: order, error: orderError } = await supabase
        .from('poc_purchase_orders')
        .select('id, status, buyer_company_id, supplier_company_id, org_unit_id')
        .eq('id', orderId)
        .single();
      
      if (orderError || !order) {
        return {
          success: false,
          error: 'Bon de commande introuvable'
        };
      }
      
      // Type assertion pour les données Supabase
      const orderData = order as any;
      const currentStatus = orderData.status as PurchaseOrderStatus;
      
      // Déterminer la compagnie et le rôle
      const buyerRole = await getUserRole(userId, orderData.buyer_company_id);
      const supplierRole = orderData.supplier_company_id 
        ? await getUserRole(userId, orderData.supplier_company_id)
        : null;
      
      // Normaliser le rôle
      let normalizedRole: string | null = buyerRole;
      
      // Si l'utilisateur est membre de la compagnie supplier et le statut concerne le supplier
      if (supplierRole && [
        PurchaseOrderStatus.PENDING_SUPPLIER,
        PurchaseOrderStatus.ACCEPTED_SUPPLIER,
        PurchaseOrderStatus.IN_TRANSIT,
        PurchaseOrderStatus.DELIVERED
      ].includes(currentStatus)) {
        normalizedRole = 'supplier_member';
      }
      
      if (!normalizedRole) {
        return {
          success: true,
          data: []
        };
      }
      
      // Récupérer les actions autorisées pour ce rôle et ce statut
      const rolePermissions = ROLE_PERMISSIONS[normalizedRole] || {};
      const allowedActions = rolePermissions[currentStatus] || [];
      
      // Admin a toutes les actions possibles
      if (normalizedRole === MemberRole.ADMIN) {
        const allActionsForStatus = Object.values(WorkflowAction).filter(action => {
          const targetStatus = ACTION_TO_STATUS[action];
          return targetStatus && VALID_TRANSITIONS[currentStatus]?.includes(targetStatus);
        });
        return {
          success: true,
          data: allActionsForStatus
        };
      }
      
      // PHASE 2: Filtrage par org_unit pour les commandes BCI
      // Pour chef_chantier et commandes BCI, filtrer les actions selon l'appartenance à l'org_unit
      if (normalizedRole === MemberRole.CHEF_CHANTIER && isBCIOrder(orderData)) {
        const orgUnitCheck = await isUserInOrgUnit(userId, orderData.org_unit_id, orderData.buyer_company_id);
        if (!orgUnitCheck.success || !orgUnitCheck.data) {
          // L'utilisateur n'appartient pas à l'org_unit de cette commande BCI
          // Retourner un tableau vide (aucune action disponible)
          return {
            success: true,
            data: []
          };
        }
      }
      // Pour les commandes BCE (org_unit_id NULL) ou autres rôles, retourner toutes les actions autorisées (comportement existant)
      
      return {
        success: true,
        data: allowedActions
      };
    } catch (error: any) {
      console.error('Erreur récupération actions disponibles:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des actions disponibles'
      };
    }
  }
  
  /**
   * Vérifie la disponibilité du stock pour un bon de commande
   * 
   * @param orderId - ID du bon de commande
   * @returns ServiceResult avec le résultat de la vérification de stock
   */
  async checkStockAvailability(
    orderId: string
  ): Promise<ServiceResult<StockCheckResult>> {
    try {
      // Récupérer les items du bon de commande
      const { data: items, error: itemsError } = await supabase
        .from('poc_purchase_order_items')
        .select('id, product_id, item_name, quantity, item_unit')
        .eq('purchase_order_id', orderId);
      
      if (itemsError) {
        return {
          success: false,
          error: `Erreur lors de la récupération des items: ${itemsError.message}`
        };
      }
      
      if (!items || items.length === 0) {
        return {
          success: false,
          error: 'Aucun item trouvé pour ce bon de commande'
        };
      }
      
      // Récupérer le bon de commande pour obtenir la compagnie buyer
      const { data: order, error: orderError } = await supabase
        .from('poc_purchase_orders')
        .select('buyer_company_id')
        .eq('id', orderId)
        .single();
      
      if (orderError || !order) {
        return {
          success: false,
          error: 'Bon de commande introuvable'
        };
      }
      
      // Type assertion pour les données Supabase
      const orderData = order as any;
      
      const itemResults: StockItemResult[] = [];
      let totalRequested = 0;
      let totalAvailable = 0;
      const missingItems: StockItemResult[] = [];
      
      // Vérifier le stock pour chaque item
      for (const item of items as any[]) {
        const requested = parseFloat(item.quantity) || 0;
        totalRequested += requested;
        
        let available = 0;
        let sufficient = false;
        
        // Si l'item a un product_id, vérifier dans le stock interne
        if (item.product_id) {
          const { data: stock, error: stockError } = await supabase
            .from('poc_inventory_items')
            .select('quantity_available')
            .eq('company_id', orderData.buyer_company_id)
            .eq('product_id', item.product_id)
            .single();
          
          if (!stockError && stock) {
            const stockData = stock as any;
            available = parseFloat(stockData.quantity_available) || 0;
            sufficient = available >= requested;
          }
        } else {
          // Item sans product_id (entrée manuelle), on considère qu'il n'y a pas de stock
          available = 0;
          sufficient = false;
        }
        
        totalAvailable += available;
        
        const itemResult: StockItemResult = {
          itemId: item.id,
          itemName: item.item_name,
          requested,
          available,
          sufficient
        };
        
        itemResults.push(itemResult);
        
        if (!sufficient) {
          missingItems.push(itemResult);
        }
      }
      
      // Déterminer si le stock est globalement suffisant
      // Le stock est suffisant si TOUS les items ont un stock suffisant
      const available = itemResults.every(item => item.sufficient);
      
      return {
        success: true,
        data: {
          available,
          itemResults,
          totalRequested,
          totalAvailable,
          missingItems
        }
      };
    } catch (error: any) {
      console.error('Erreur vérification stock:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la vérification du stock'
      };
    }
  }
}

// ============================================================================
// PHASE 2: Helper Functions for Org Unit Validations
// ============================================================================

/**
 * Type guard pour distinguer les commandes BCI (avec org_unit_id) des commandes BCE (sans org_unit_id)
 * 
 * @param order - Objet commande (peut avoir org_unit_id)
 * @returns true si la commande est BCI (a un org_unit_id non-null), false sinon (BCE)
 */
function isBCIOrder(order: any): boolean {
  return order && order.org_unit_id !== null && order.org_unit_id !== undefined;
}

/**
 * Récupère tous les org_unit_ids auxquels un utilisateur appartient dans une compagnie
 * 
 * @param userId - ID de l'utilisateur (UUID)
 * @param companyId - ID de la compagnie (UUID)
 * @returns ServiceResult avec tableau d'org_unit_ids (string[])
 */
async function getUserOrgUnits(
  userId: string,
  companyId: string
): Promise<ServiceResult<string[]>> {
  try {
    // Requête sur poc_org_unit_members jointe avec poc_org_units
    // pour obtenir tous les org_units où l'utilisateur est membre actif
    const { data, error } = await supabase
      .from('poc_org_unit_members')
      .select(`
        org_unit_id,
        poc_org_units!inner(
          id,
          company_id,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('poc_org_units.company_id', companyId)
      .eq('poc_org_units.status', 'active');
    
    if (error) {
      console.error('Erreur récupération org_units:', error);
      // En cas d'erreur, retourner un tableau vide plutôt qu'une erreur
      // pour permettre le fonctionnement des commandes BCE (sans org_unit)
      return {
        success: true,
        data: []
      };
    }
    
    // Extraire les org_unit_ids uniques
    const orgUnitIds: string[] = [];
    if (data && Array.isArray(data)) {
      for (const member of data) {
        // Type assertion pour les données Supabase
        const memberData = member as any;
        const orgUnit = Array.isArray(memberData.poc_org_units) 
          ? memberData.poc_org_units[0] 
          : memberData.poc_org_units;
        
        if (orgUnit && orgUnit.id && !orgUnitIds.includes(orgUnit.id)) {
          orgUnitIds.push(orgUnit.id);
        }
      }
    }
    
    return {
      success: true,
      data: orgUnitIds
    };
  } catch (error: any) {
    console.error('Erreur getUserOrgUnits:', error);
    // En cas d'erreur, retourner un tableau vide pour compatibilité avec BCE
    return {
      success: true,
      data: []
    };
  }
}

/**
 * Vérifie si un utilisateur appartient à un org_unit spécifique dans une compagnie
 * 
 * @param userId - ID de l'utilisateur (UUID)
 * @param orgUnitId - ID de l'org_unit (UUID)
 * @param companyId - ID de la compagnie (UUID)
 * @returns ServiceResult avec boolean (true si membre, false sinon)
 */
async function isUserInOrgUnit(
  userId: string,
  orgUnitId: string,
  companyId: string
): Promise<ServiceResult<boolean>> {
  try {
    if (!orgUnitId) {
      // Si pas d'org_unit_id, c'est une commande BCE (validation au niveau compagnie)
      return {
        success: true,
        data: true
      };
    }
    
    // Récupérer tous les org_units de l'utilisateur
    const orgUnitsResult = await getUserOrgUnits(userId, companyId);
    
    if (!orgUnitsResult.success) {
      return {
        success: false,
        error: 'Erreur lors de la vérification de l\'appartenance à l\'unité organisationnelle'
      };
    }
    
    // Vérifier si l'org_unit_id est dans la liste
    const isMember = orgUnitsResult.data.includes(orgUnitId);
    
    return {
      success: true,
      data: isMember
    };
  } catch (error: any) {
    console.error('Erreur isUserInOrgUnit:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la vérification de l\'appartenance à l\'unité organisationnelle'
    };
  }
}

// Export singleton instance
export default new POCWorkflowService();
