/**
 * Service POC pour la gestion des bons de commande
 * Utilise Supabase pour les opérations CRUD
 */

import { supabase } from '../../../lib/supabase'
import { getAuthenticatedUserId, getUserCompany } from './authHelpers'
import type {
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderUpdate,
  PurchaseOrderStatus,
  WorkflowAction,
  ServiceResult
} from '../types/construction'

/**
 * Service de gestion des bons de commande
 */
export const poc_purchaseOrderService = {
  /**
   * Créer un nouveau bon de commande
   */
  async createPurchaseOrder(
    order: Omit<PurchaseOrderCreate, 'companyId' | 'creatorId'>
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const userId = await getAuthenticatedUserId();
      
      // Get user's builder company
      const company = await getUserCompany(userId, 'builder');
      
      if (company.companyStatus !== 'approved') {
        return {
          success: false,
          error: 'Your company is not yet approved.'
        };
      }
      
      // Convertir en snake_case pour Supabase
      const orderData = {
        buyer_company_id: company.companyId,
        project_id: order.projectId,
        created_by: userId,
        order_number: order.orderNumber,
        estimated_delivery_date: order.estimatedDeliveryDate?.toISOString(),
        status: 'draft'
      }

      const { data: orderResult, error: orderError } = await supabase
        .from('poc_purchase_orders')
        .insert(orderData)
        .select()
        .single()

      if (orderError) throw orderError

      // Créer les items
      if (order.items && order.items.length > 0) {
        const itemsData = order.items.map((item) => ({
          purchase_order_id: orderResult.id,
          catalog_item_id: item.catalogItemId,
          item_name: item.itemName,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          total_price: item.totalPrice
        }))

        const { error: itemsError } = await supabase
          .from('poc_purchase_order_items')
          .insert(itemsData)

        if (itemsError) throw itemsError
      }

      // Récupérer l'ordre complet avec items
      const result = await this.getPurchaseOrderById(orderResult.id)
      return result
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du bon de commande'
      }
    }
  },

  /**
   * Récupérer un bon de commande par ID
   */
  async getPurchaseOrderById(
    orderId: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      const { data, error } = await supabase
        .from('poc_purchase_orders')
        .select(`
          *,
          poc_purchase_order_items (*)
        `)
        .eq('id', orderId)
        .single()

      if (error) throw error
      if (!data) {
        return { success: false, error: 'Bon de commande non trouvé' }
      }

      const order: PurchaseOrder = {
        id: data.id,
        companyId: data.company_id,
        projectId: data.project_id,
        creatorId: data.creator_id,
        siteManagerId: data.site_manager_id,
        supplierId: data.supplier_id,
        managementId: data.management_id,
        orderNumber: data.order_number,
        title: data.title,
        description: data.description,
        status: data.status as PurchaseOrderStatus,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        submittedAt: data.submitted_at ? new Date(data.submitted_at) : undefined,
        approvedSiteManagerAt: data.approved_site_manager_at
          ? new Date(data.approved_site_manager_at)
          : undefined,
        approvedManagementAt: data.approved_management_at
          ? new Date(data.approved_management_at)
          : undefined,
        submittedToSupplierAt: data.submitted_to_supplier_at
          ? new Date(data.submitted_to_supplier_at)
          : undefined,
        acceptedSupplierAt: data.accepted_supplier_at
          ? new Date(data.accepted_supplier_at)
          : undefined,
        deliveredAt: data.delivered_at ? new Date(data.delivered_at) : undefined,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : undefined,
        rejectionReason: data.rejection_reason,
        cancellationReason: data.cancellation_reason,
        priority: data.priority,
        estimatedDeliveryDate: data.estimated_delivery_date
          ? new Date(data.estimated_delivery_date)
          : undefined,
        actualDeliveryDate: data.actual_delivery_date
          ? new Date(data.actual_delivery_date)
          : undefined,
        items: (data.poc_purchase_order_items || []).map((item: any) => ({
          id: item.id,
          purchaseOrderId: item.purchase_order_id,
          catalogItemId: item.catalog_item_id,
          itemName: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }))
      }

      return { success: true, data: order }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération du bon de commande'
      }
    }
  },

  /**
   * Récupérer tous les bons de commande avec filtres
   */
  async getPurchaseOrders(filters?: {
    status?: PurchaseOrderStatus
    projectId?: string
    supplierId?: string
    creatorId?: string
    dateFrom?: Date
    dateTo?: Date
  }): Promise<ServiceResult<PurchaseOrder[]>> {
    try {
      let query = supabase
        .from('poc_purchase_orders')
        .select(`
          *,
          poc_purchase_order_items (*)
        `)

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      if (filters?.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId)
      }
      if (filters?.creatorId) {
        query = query.eq('creator_id', filters.creatorId)
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString())
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString())
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      const orders: PurchaseOrder[] = (data || []).map((item: any) => ({
        id: item.id,
        companyId: item.company_id,
        projectId: item.project_id,
        creatorId: item.creator_id,
        siteManagerId: item.site_manager_id,
        supplierId: item.supplier_id,
        managementId: item.management_id,
        orderNumber: item.order_number,
        title: item.title,
        description: item.description,
        status: item.status as PurchaseOrderStatus,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        submittedAt: item.submitted_at ? new Date(item.submitted_at) : undefined,
        approvedSiteManagerAt: item.approved_site_manager_at
          ? new Date(item.approved_site_manager_at)
          : undefined,
        approvedManagementAt: item.approved_management_at
          ? new Date(item.approved_management_at)
          : undefined,
        submittedToSupplierAt: item.submitted_to_supplier_at
          ? new Date(item.submitted_to_supplier_at)
          : undefined,
        acceptedSupplierAt: item.accepted_supplier_at
          ? new Date(item.accepted_supplier_at)
          : undefined,
        deliveredAt: item.delivered_at ? new Date(item.delivered_at) : undefined,
        completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
        cancelledAt: item.cancelled_at ? new Date(item.cancelled_at) : undefined,
        rejectionReason: item.rejection_reason,
        cancellationReason: item.cancellation_reason,
        priority: item.priority,
        estimatedDeliveryDate: item.estimated_delivery_date
          ? new Date(item.estimated_delivery_date)
          : undefined,
        actualDeliveryDate: item.actual_delivery_date
          ? new Date(item.actual_delivery_date)
          : undefined,
        items: (item.poc_purchase_order_items || []).map((item: any) => ({
          id: item.id,
          purchaseOrderId: item.purchase_order_id,
          catalogItemId: item.catalog_item_id,
          itemName: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        }))
      }))

      return { success: true, data: orders }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des bons de commande'
      }
    }
  },

  /**
   * Mettre à jour un bon de commande
   */
  async updatePurchaseOrder(
    update: PurchaseOrderUpdate
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      const updateData: any = {}

      if (update.status !== undefined) updateData.status = update.status
      if (update.title !== undefined) updateData.title = update.title
      if (update.description !== undefined)
        updateData.description = update.description
      if (update.priority !== undefined) updateData.priority = update.priority
      if (update.estimatedDeliveryDate !== undefined)
        updateData.estimated_delivery_date = update.estimatedDeliveryDate
      if (update.rejectionReason !== undefined)
        updateData.rejection_reason = update.rejectionReason
      if (update.cancellationReason !== undefined)
        updateData.cancellation_reason = update.cancellationReason

      const { data, error } = await supabase
        .from('poc_purchase_orders')
        .update(updateData)
        .eq('id', update.id)
        .select()
        .single()

      if (error) throw error

      return await this.getPurchaseOrderById(update.id)
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour du bon de commande'
      }
    }
  },

  /**
   * Soumettre un bon de commande (draft → pending_site_manager)
   */
  async submitOrder(
    orderId: string
  ): Promise<ServiceResult<PurchaseOrder>> {
    try {
      // Get authenticated user
      const userId = await getAuthenticatedUserId();
      
      const { data, error } = await supabase
        .from('poc_purchase_orders')
        .update({
          status: 'pending_site_manager',
          submitted_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) throw error

      return await this.getPurchaseOrderById(orderId)
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la soumission du bon de commande'
      }
    }
  },

  /**
   * Sauvegarder comme brouillon
   */
  async saveAsDraft(order: PurchaseOrderCreate): Promise<ServiceResult<PurchaseOrder>> {
    return this.createPurchaseOrder(order)
  }
}

