/**
 * Service POC pour la gestion du stock
 * Utilise Supabase pour les opérations CRUD
 */

import { supabase } from '../../../lib/supabase'
import { getAuthenticatedUserId } from './authHelpers'
import type {
  InventoryItem,
  StockMovement,
  ServiceResult
} from '../types/construction'

/**
 * Service de gestion du stock
 */
export const poc_stockService = {
  /**
   * Récupérer tous les items d'inventaire
   */
  async getInventoryItems(filters?: {
    category?: string
    lowStock?: boolean
  }): Promise<ServiceResult<InventoryItem[]>> {
    try {
      let query = supabase.from('poc_inventory_items').select('*')

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.lowStock) {
        // Récupérer tous et filtrer côté client pour les items en stock faible
        const { data, error } = await query
        if (error) throw error

        const items: InventoryItem[] = (data || [])
          .map((item: any) => ({
            id: item.id,
            companyId: item.company_id,
            itemName: item.item_name,
            description: item.description,
            category: item.category,
            unit: item.unit,
            quantity: item.quantity,
            minStockLevel: item.min_stock_level,
            maxStockLevel: item.max_stock_level,
            location: item.location,
            createdAt: new Date(item.created_at),
            updatedAt: new Date(item.updated_at)
          }))
          .filter(
            (item) =>
              item.minStockLevel !== null &&
              item.minStockLevel !== undefined &&
              item.quantity < item.minStockLevel
          )

        return { success: true, data: items }
      }

      const { data, error } = await query

      if (error) throw error

      const items: InventoryItem[] = (data || []).map((item: any) => ({
        id: item.id,
        companyId: item.company_id,
        itemName: item.item_name,
        description: item.description,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        minStockLevel: item.min_stock_level,
        maxStockLevel: item.max_stock_level,
        location: item.location,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }))

      return { success: true, data: items }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des items'
      }
    }
  },

  /**
   * Récupérer un item d'inventaire par ID
   */
  async getInventoryItemById(
    itemId: string
  ): Promise<ServiceResult<InventoryItem>> {
    try {
      const { data, error } = await supabase
        .from('poc_inventory_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (error) throw error
      if (!data) {
        return { success: false, error: 'Item non trouvé' }
      }

      const item: InventoryItem = {
        id: data.id,
        companyId: data.company_id,
        itemName: data.item_name,
        description: data.description,
        category: data.category,
        unit: data.unit,
        quantity: data.quantity,
        minStockLevel: data.min_stock_level,
        maxStockLevel: data.max_stock_level,
        location: data.location,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }

      return { success: true, data: item }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération de l\'item'
      }
    }
  },

  /**
   * Enregistrer une entrée de stock
   */
  async recordStockEntry(params: {
    inventoryItemId: string
    quantity: number
    referenceId?: string
    reason?: string
    notes?: string
  }): Promise<ServiceResult<StockMovement>> {
    try {
      // Get authenticated user
      const userId = await getAuthenticatedUserId();
      
      // Récupérer l'item actuel
      const itemResult = await this.getInventoryItemById(params.inventoryItemId)
      if (!itemResult.success || !itemResult.data) {
        return { success: false, error: 'Item non trouvé' }
      }

      const newQuantity = itemResult.data.quantity + params.quantity

      // Mettre à jour la quantité
      await supabase
        .from('poc_inventory_items')
        .update({ quantity_available: newQuantity })
        .eq('id', params.inventoryItemId)

      // Créer le mouvement
      const { data, error } = await supabase
        .from('poc_stock_movements')
        .insert({
          company_id: itemResult.data.companyId,
          inventory_item_id: params.inventoryItemId,
          type: 'entry',
          quantity: params.quantity,
          reference_id: params.referenceId,
          reference_type: params.referenceId ? 'purchase_order' : 'manual',
          notes: params.reason || params.notes,
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      const movement: StockMovement = {
        id: data.id,
        companyId: data.company_id,
        inventoryItemId: data.inventory_item_id,
        movementType: data.movement_type,
        quantity: data.quantity,
        referenceId: data.reference_id,
        referenceType: data.reference_type,
        reason: data.reason,
        performedBy: data.performed_by,
        performedAt: new Date(data.performed_at),
        notes: data.notes
      }

      return { success: true, data: movement }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'enregistrement de l\'entrée'
      }
    }
  },

  /**
   * Enregistrer une sortie de stock
   */
  async recordStockExit(params: {
    inventoryItemId: string
    quantity: number
    referenceId?: string
    reason?: string
    notes?: string
  }): Promise<ServiceResult<StockMovement>> {
    try {
      // Get authenticated user
      const userId = await getAuthenticatedUserId();
      
      // Récupérer l'item actuel
      const itemResult = await this.getInventoryItemById(params.inventoryItemId)
      if (!itemResult.success || !itemResult.data) {
        return { success: false, error: 'Item non trouvé' }
      }

      if (itemResult.data.quantity < params.quantity) {
        return {
          success: false,
          error: 'Stock insuffisant'
        }
      }

      const newQuantity = itemResult.data.quantity - params.quantity

      // Mettre à jour la quantité
      await supabase
        .from('poc_inventory_items')
        .update({ quantity_available: newQuantity })
        .eq('id', params.inventoryItemId)

      // Créer le mouvement
      const { data, error } = await supabase
        .from('poc_stock_movements')
        .insert({
          company_id: itemResult.data.companyId,
          inventory_item_id: params.inventoryItemId,
          type: 'exit',
          quantity: params.quantity,
          reference_id: params.referenceId,
          reference_type: params.referenceId ? 'purchase_order' : 'manual',
          notes: params.reason || params.notes,
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      const movement: StockMovement = {
        id: data.id,
        companyId: data.company_id,
        inventoryItemId: data.inventory_item_id,
        movementType: data.type,
        quantity: data.quantity,
        referenceId: data.reference_id,
        referenceType: data.reference_type,
        reason: data.notes,
        performedBy: data.created_by,
        performedAt: new Date(data.created_at),
        notes: data.notes
      }

      return { success: true, data: movement }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'enregistrement de la sortie'
      }
    }
  },

  /**
   * Ajuster le stock manuellement
   */
  async adjustStock(params: {
    inventoryItemId: string
    newQuantity: number
    reason: string
    notes?: string
  }): Promise<ServiceResult<StockMovement>> {
    try {
      // Get authenticated user
      const userId = await getAuthenticatedUserId();
      
      // Récupérer l'item actuel
      const itemResult = await this.getInventoryItemById(params.inventoryItemId)
      if (!itemResult.success || !itemResult.data) {
        return { success: false, error: 'Item non trouvé' }
      }

      const difference = params.newQuantity - itemResult.data.quantity

      // Mettre à jour la quantité
      await supabase
        .from('poc_inventory_items')
        .update({ quantity_available: params.newQuantity })
        .eq('id', params.inventoryItemId)

      // Créer le mouvement d'ajustement
      const { data, error } = await supabase
        .from('poc_stock_movements')
        .insert({
          company_id: itemResult.data.companyId,
          inventory_item_id: params.inventoryItemId,
          type: 'adjustment',
          quantity: Math.abs(difference),
          reference_type: 'adjustment',
          notes: params.reason || params.notes,
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      const movement: StockMovement = {
        id: data.id,
        companyId: data.company_id,
        inventoryItemId: data.inventory_item_id,
        movementType: data.type,
        quantity: data.quantity,
        referenceId: data.reference_id,
        referenceType: data.reference_type,
        reason: data.notes,
        performedBy: data.created_by,
        performedAt: new Date(data.created_at),
        notes: data.notes
      }

      return { success: true, data: movement }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'ajustement du stock'
      }
    }
  },

  /**
   * Récupérer l'historique des mouvements de stock
   */
  async getStockMovements(filters?: {
    inventoryItemId?: string
    movementType?: 'entry' | 'exit' | 'adjustment'
    dateFrom?: Date
    dateTo?: Date
  }): Promise<ServiceResult<StockMovement[]>> {
    try {
      let query = supabase.from('poc_stock_movements').select('*')

      if (filters?.inventoryItemId) {
        query = query.eq('inventory_item_id', filters.inventoryItemId)
      }
      if (filters?.movementType) {
        query = query.eq('movement_type', filters.movementType)
      }
      if (filters?.dateFrom) {
        query = query.gte('performed_at', filters.dateFrom.toISOString())
      }
      if (filters?.dateTo) {
        query = query.lte('performed_at', filters.dateTo.toISOString())
      }

      query = query.order('performed_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      const movements: StockMovement[] = (data || []).map((item: any) => ({
        id: item.id,
        companyId: item.company_id,
        inventoryItemId: item.inventory_item_id,
        movementType: item.movement_type,
        quantity: item.quantity,
        referenceId: item.reference_id,
        referenceType: item.reference_type,
        reason: item.reason,
        performedBy: item.performed_by,
        performedAt: new Date(item.performed_at),
        notes: item.notes
      }))

      return { success: true, data: movements }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des mouvements'
      }
    }
  }
}

