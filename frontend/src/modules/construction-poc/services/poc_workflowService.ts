/**
 * Service POC pour la gestion du workflow de validation
 * Utilise Supabase pour les opérations de workflow
 */

import { supabase } from '../../../lib/supabase'
import { getAuthenticatedUserId } from './authHelpers'
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  WorkflowAction,
  WorkflowHistory,
  UserRole,
  ServiceResult,
  TransitionOptions
} from '../types/construction'

/**
 * Service de gestion du workflow
 */
export const poc_workflowService = {
  /**
   * Vérifier si une action est autorisée pour un rôle et un statut donné
   */
  canPerformAction(
    role: UserRole,
    currentStatus: PurchaseOrderStatus,
    action: WorkflowAction
  ): boolean {
    const rolePermissions: Record<UserRole, Record<PurchaseOrderStatus, WorkflowAction[]>> = {
      chef_equipe: {
        draft: [WorkflowAction.SUBMIT, WorkflowAction.CANCEL],
        pending_site_manager: [],
        approved_site_manager: [],
        checking_stock: [],
        fulfilled_internal: [],
        needs_external_order: [],
        pending_management: [],
        rejected_management: [],
        approved_management: [],
        submitted_to_supplier: [],
        pending_supplier: [],
        accepted_supplier: [],
        rejected_supplier: [],
        in_transit: [],
        delivered: [WorkflowAction.COMPLETE],
        completed: [],
        cancelled: []
      },
      chef_chantier: {
        draft: [],
        pending_site_manager: [
          WorkflowAction.APPROVE_SITE,
          WorkflowAction.REJECT_SITE,
          WorkflowAction.CANCEL
        ],
        approved_site_manager: [],
        checking_stock: [],
        fulfilled_internal: [],
        needs_external_order: [],
        pending_management: [],
        rejected_management: [],
        approved_management: [],
        submitted_to_supplier: [],
        pending_supplier: [],
        accepted_supplier: [],
        rejected_supplier: [],
        in_transit: [],
        delivered: [],
        completed: [],
        cancelled: []
      },
      direction: {
        draft: [],
        pending_site_manager: [],
        approved_site_manager: [],
        checking_stock: [],
        fulfilled_internal: [],
        needs_external_order: [],
        pending_management: [
          WorkflowAction.APPROVE_MGMT,
          WorkflowAction.REJECT_MGMT,
          WorkflowAction.CANCEL
        ],
        rejected_management: [],
        approved_management: [],
        submitted_to_supplier: [],
        pending_supplier: [],
        accepted_supplier: [],
        rejected_supplier: [],
        in_transit: [],
        delivered: [],
        completed: [],
        cancelled: []
      },
      supplier: {
        draft: [],
        pending_site_manager: [],
        approved_site_manager: [],
        checking_stock: [],
        fulfilled_internal: [],
        needs_external_order: [],
        pending_management: [],
        rejected_management: [],
        approved_management: [],
        submitted_to_supplier: [],
        pending_supplier: [
          WorkflowAction.ACCEPT_SUPPLIER,
          WorkflowAction.REJECT_SUPPLIER
        ],
        accepted_supplier: [],
        rejected_supplier: [],
        in_transit: [],
        delivered: [],
        completed: [],
        cancelled: []
      },
      admin: {
        // Admin peut tout faire
        draft: [
          WorkflowAction.SUBMIT,
          WorkflowAction.CANCEL
        ],
        pending_site_manager: [
          WorkflowAction.APPROVE_SITE,
          WorkflowAction.REJECT_SITE,
          WorkflowAction.CANCEL
        ],
        approved_site_manager: [],
        checking_stock: [],
        fulfilled_internal: [],
        needs_external_order: [],
        pending_management: [
          WorkflowAction.APPROVE_MGMT,
          WorkflowAction.REJECT_MGMT,
          WorkflowAction.CANCEL
        ],
        rejected_management: [],
        approved_management: [],
        submitted_to_supplier: [],
        pending_supplier: [
          WorkflowAction.ACCEPT_SUPPLIER,
          WorkflowAction.REJECT_SUPPLIER
        ],
        accepted_supplier: [],
        rejected_supplier: [],
        in_transit: [],
        delivered: [WorkflowAction.COMPLETE],
        completed: [],
        cancelled: []
      },
      user: {
        // Utilisateur standard n'a pas de permissions
        draft: [],
        pending_site_manager: [],
        approved_site_manager: [],
        checking_stock: [],
        fulfilled_internal: [],
        needs_external_order: [],
        pending_management: [],
        rejected_management: [],
        approved_management: [],
        submitted_to_supplier: [],
        pending_supplier: [],
        accepted_supplier: [],
        rejected_supplier: [],
        in_transit: [],
        delivered: [],
        completed: [],
        cancelled: []
      }
    }

    const allowedActions =
      rolePermissions[role]?.[currentStatus] || []
    return allowedActions.includes(action)
  },

  /**
   * Obtenir le prochain statut après une action
   */
  getNextStatus(
    currentStatus: PurchaseOrderStatus,
    action: WorkflowAction
  ): PurchaseOrderStatus {
    const transitions: Record<
      PurchaseOrderStatus,
      Record<WorkflowAction, PurchaseOrderStatus>
    > = {
      draft: {
        [WorkflowAction.SUBMIT]: PurchaseOrderStatus.PENDING_SITE_MANAGER,
        [WorkflowAction.CANCEL]: PurchaseOrderStatus.CANCELLED
      },
      pending_site_manager: {
        [WorkflowAction.APPROVE_SITE]:
          PurchaseOrderStatus.APPROVED_SITE_MANAGER,
        [WorkflowAction.REJECT_SITE]: PurchaseOrderStatus.DRAFT,
        [WorkflowAction.CANCEL]: PurchaseOrderStatus.CANCELLED
      },
      approved_site_manager: {},
      checking_stock: {},
      fulfilled_internal: {},
      needs_external_order: {},
      pending_management: {
        [WorkflowAction.APPROVE_MGMT]:
          PurchaseOrderStatus.APPROVED_MANAGEMENT,
        [WorkflowAction.REJECT_MGMT]:
          PurchaseOrderStatus.REJECTED_MANAGEMENT,
        [WorkflowAction.CANCEL]: PurchaseOrderStatus.CANCELLED
      },
      rejected_management: {},
      approved_management: {},
      submitted_to_supplier: {},
      pending_supplier: {
        [WorkflowAction.ACCEPT_SUPPLIER]: PurchaseOrderStatus.ACCEPTED_SUPPLIER,
        [WorkflowAction.REJECT_SUPPLIER]: PurchaseOrderStatus.REJECTED_SUPPLIER
      },
      accepted_supplier: {},
      rejected_supplier: {},
      in_transit: {},
      delivered: {
        [WorkflowAction.COMPLETE]: PurchaseOrderStatus.COMPLETED
      },
      completed: {},
      cancelled: {}
    }

    return (
      transitions[currentStatus]?.[action] || currentStatus
    )
  },

  /**
   * Exécuter une transition de workflow
   */
  async performTransition(
    orderId: string,
    action: WorkflowAction,
    options?: Omit<TransitionOptions, 'userId'>
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const userId = await getAuthenticatedUserId();
      
      // Récupérer l'ordre actuel
      const { data: orderData, error: fetchError } = await supabase
        .from('poc_purchase_orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (fetchError) throw fetchError
      if (!orderData) {
        return { success: false, error: 'Bon de commande non trouvé' }
      }

      const currentStatus = orderData.status as PurchaseOrderStatus
      const nextStatus = this.getNextStatus(currentStatus, action)

      if (nextStatus === currentStatus) {
        return {
          success: false,
          error: 'Transition non autorisée pour ce statut'
        }
      }

      // Préparer les données de mise à jour
      const updateData: any = {
        status: nextStatus,
        updated_at: new Date().toISOString()
      }

      // Mettre à jour les dates spécifiques selon l'action
      if (action === WorkflowAction.APPROVE_SITE) {
        updateData.site_manager_approved_at = new Date().toISOString()
      } else if (action === WorkflowAction.APPROVE_MGMT) {
        updateData.management_approved_at = new Date().toISOString()
      } else if (action === WorkflowAction.ACCEPT_SUPPLIER) {
        updateData.supplier_accepted_at = new Date().toISOString()
      } else if (action === WorkflowAction.DELIVER) {
        updateData.actual_delivery_date = new Date().toISOString()
      } else if (action === WorkflowAction.COMPLETE) {
        // Completed status handled by status field
      } else if (action === WorkflowAction.CANCEL) {
        // Cancelled status handled by status field
        if (options?.reason) {
          // Store cancellation reason in metadata or separate field
        }
      }

      if (
        (action === WorkflowAction.REJECT_SITE ||
          action === WorkflowAction.REJECT_MGMT ||
          action === WorkflowAction.REJECT_SUPPLIER) &&
        options?.reason
      ) {
        if (action === WorkflowAction.REJECT_SITE) {
          updateData.site_manager_rejection_reason = options.reason
        } else if (action === WorkflowAction.REJECT_MGMT) {
          updateData.management_rejection_reason = options.reason
        } else if (action === WorkflowAction.REJECT_SUPPLIER) {
          updateData.supplier_rejection_reason = options.reason
        }
      }

      // Mettre à jour l'ordre
      const { error: updateError } = await supabase
        .from('poc_purchase_orders')
        .update(updateData)
        .eq('id', orderId)

      if (updateError) throw updateError

      // Créer l'entrée d'historique
      await supabase.from('poc_purchase_order_workflow_history').insert({
        purchase_order_id: orderId,
        from_status: currentStatus,
        to_status: nextStatus,
        changed_by: userId,
        notes: options?.notes || options?.reason || null
      })

      // Récupérer l'ordre mis à jour via le service
      const { poc_purchaseOrderService } = await import('./poc_purchaseOrderService')
      return await poc_purchaseOrderService.getPurchaseOrderById(orderId)
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la transition de workflow'
      }
    }
  },

  /**
   * Récupérer l'historique du workflow pour un bon de commande
   */
  async getWorkflowHistory(
    orderId: string
  ): Promise<ServiceResult<WorkflowHistory[]>> {
    try {
      const { data, error } = await supabase
        .from('poc_workflow_history')
        .select('*')
        .eq('purchase_order_id', orderId)
        .order('changed_at', { ascending: false })

      if (error) throw error

      const history: WorkflowHistory[] = (data || []).map((item: any) => ({
        id: item.id,
        purchaseOrderId: item.purchase_order_id,
        fromStatus: item.from_status as PurchaseOrderStatus,
        toStatus: item.to_status as PurchaseOrderStatus,
        changedBy: item.changed_by,
        changedAt: new Date(item.changed_at),
        notes: item.notes,
        action: item.action as WorkflowAction
      }))

      return { success: true, data: history }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération de l\'historique'
      }
    }
  }
}

