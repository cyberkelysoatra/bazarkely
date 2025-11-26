/**
 * Service de gestion du stock interne (pocStockService)
 * Gestion de l'inventaire d'entrepôt pour les entreprises de construction
 * Tables: poc_internal_stock, poc_stock_transactions
 */

import { supabase } from '../../../lib/supabase';
import { getAuthenticatedUserId, getUserCompany } from './authHelpers';
import type { ServiceResult } from '../types/construction';
import pocPurchaseOrderService from './pocPurchaseOrderService';

/**
 * Interface pour un enregistrement de stock interne
 */
export interface InternalStock {
  id: string;
  company_id: string;
  product_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  location: string;
  min_threshold: number | null;
  last_count_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

/**
 * Interface pour une transaction de stock
 */
export interface StockTransaction {
  id: string;
  company_id: string;
  internal_stock_id: string | null;
  transaction_type: 'entry' | 'exit' | 'adjustment' | 'transfer';
  quantity: number;
  unit: string;
  reference_type: string | null;
  reference_id: string | null;
  from_location: string | null;
  to_location: string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
}

/**
 * Filtres pour les requêtes de stock
 */
export interface StockFilter {
  productId?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  transactionType?: 'entry' | 'exit' | 'adjustment' | 'transfer';
}

/**
 * Service de gestion du stock
 */
class POCStockService {
  /**
   * Ajoute du stock (entrée)
   * Si l'enregistrement existe pour product+location, met à jour la quantité
   * Sinon, crée un nouvel enregistrement
   */
  async addStock(
    companyId: string,
    productId: string | null,
    itemName: string,
    quantity: number,
    unit: string,
    location: string,
    referenceType?: string,
    referenceId?: string,
    userId?: string
  ): Promise<ServiceResult<InternalStock>> {
    try {
      let currentUserId: string;
      if (userId) {
        currentUserId = userId;
      } else {
        const userIdResult = await getAuthenticatedUserId();
        if (!userIdResult.success || !userIdResult.data) {
          return {
            success: false,
            error: userIdResult.error || 'Utilisateur non authentifié'
          };
        }
        currentUserId = userIdResult.data;
      }
      const now = new Date().toISOString();

      // Vérifier si un enregistrement existe pour ce produit + location
      let query = supabase
        .from('poc_internal_stock')
        .select('*')
        .eq('company_id', companyId)
        .eq('location', location);

      if (productId) {
        query = query.eq('product_id', productId);
      } else {
        query = query.is('product_id', null).eq('item_name', itemName);
      }

      const { data: existingStock, error: fetchError } = await query.maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        return {
          success: false,
          error: `Erreur vérification stock existant: ${fetchError.message}`
        };
      }

      let stockRecord: InternalStock;

      if (existingStock) {
        // Mettre à jour la quantité existante
        const newQuantity = parseFloat(existingStock.quantity.toString()) + quantity;

        const { data: updated, error: updateError } = await supabase
          .from('poc_internal_stock')
          .update({
            quantity: newQuantity,
            updated_at: now,
            last_count_date: now
          })
          .eq('id', existingStock.id)
          .select()
          .single();

        if (updateError || !updated) {
          return {
            success: false,
            error: `Erreur mise à jour stock: ${updateError?.message || 'Inconnu'}`
          };
        }

        stockRecord = updated as InternalStock;
      } else {
        // Créer un nouvel enregistrement
        const { data: created, error: createError } = await supabase
          .from('poc_internal_stock')
          .insert({
            company_id: companyId,
            product_id: productId,
            item_name: itemName,
            quantity: quantity,
            unit: unit,
            location: location,
            min_threshold: null,
            last_count_date: now,
            notes: null,
            created_at: now,
            updated_at: now,
            created_by: currentUserId
          })
          .select()
          .single();

        if (createError || !created) {
          return {
            success: false,
            error: `Erreur création stock: ${createError?.message || 'Inconnu'}`
          };
        }

        stockRecord = created as InternalStock;
      }

      // Créer la transaction d'entrée
      const transactionResult = await this.recordEntry(
        companyId,
        stockRecord.id,
        quantity,
        unit,
        referenceType || 'manual',
        referenceId,
        location,
        `Entrée de stock: ${itemName}`,
        currentUserId
      );

      if (!transactionResult.success) {
        console.warn('Erreur enregistrement transaction:', transactionResult.error);
      }

      return {
        success: true,
        data: stockRecord
      };
    } catch (error: any) {
      console.error('Erreur addStock:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'ajout de stock'
      };
    }
  }

  /**
   * Retire du stock (sortie)
   * Vérifie la disponibilité et met à jour la quantité
   */
  async removeStock(
    companyId: string,
    stockId: string,
    quantity: number,
    referenceType?: string,
    referenceId?: string,
    userId?: string
  ): Promise<ServiceResult<InternalStock>> {
    try {
      let currentUserId: string;
      if (userId) {
        currentUserId = userId;
      } else {
        const userIdResult = await getAuthenticatedUserId();
        if (!userIdResult.success || !userIdResult.data) {
          return {
            success: false,
            error: userIdResult.error || 'Utilisateur non authentifié'
          };
        }
        currentUserId = userIdResult.data;
      }

      // Récupérer l'enregistrement de stock
      const { data: stockRecord, error: fetchError } = await supabase
        .from('poc_internal_stock')
        .select('*')
        .eq('id', stockId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !stockRecord) {
        return {
          success: false,
          error: 'Enregistrement de stock introuvable'
        };
      }

      const currentQuantity = parseFloat(stockRecord.quantity.toString());
      const requestedQuantity = quantity;

      // Vérifier la disponibilité
      if (currentQuantity < requestedQuantity) {
        return {
          success: false,
          error: `Stock insuffisant (disponible: ${currentQuantity}, requis: ${requestedQuantity})`
        };
      }

      // Calculer la nouvelle quantité
      const newQuantity = currentQuantity - requestedQuantity;
      const now = new Date().toISOString();

      // Mettre à jour le stock
      const { data: updated, error: updateError } = await supabase
        .from('poc_internal_stock')
        .update({
          quantity: newQuantity,
          updated_at: now,
          last_count_date: now
        })
        .eq('id', stockId)
        .select()
        .single();

      if (updateError || !updated) {
        return {
          success: false,
          error: `Erreur mise à jour stock: ${updateError?.message || 'Inconnu'}`
        };
      }

      // Créer la transaction de sortie
      const transactionResult = await this.recordExit(
        companyId,
        stockId,
        quantity,
        stockRecord.unit,
        referenceType || 'manual',
        referenceId,
        stockRecord.location,
        `Sortie de stock: ${stockRecord.item_name}`,
        currentUserId
      );

      if (!transactionResult.success) {
        console.warn('Erreur enregistrement transaction:', transactionResult.error);
      }

      return {
        success: true,
        data: updated as InternalStock
      };
    } catch (error: any) {
      console.error('Erreur removeStock:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la sortie de stock'
      };
    }
  }

  /**
   * Ajuste le stock (correction d'inventaire)
   */
  async adjustStock(
    companyId: string,
    stockId: string,
    newQuantity: number,
    reason: string,
    userId?: string
  ): Promise<ServiceResult<InternalStock>> {
    try {
      let currentUserId: string;
      if (userId) {
        currentUserId = userId;
      } else {
        const userIdResult = await getAuthenticatedUserId();
        if (!userIdResult.success || !userIdResult.data) {
          return {
            success: false,
            error: userIdResult.error || 'Utilisateur non authentifié'
          };
        }
        currentUserId = userIdResult.data;
      }

      // Récupérer l'enregistrement actuel
      const { data: currentStock, error: fetchError } = await supabase
        .from('poc_internal_stock')
        .select('*')
        .eq('id', stockId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !currentStock) {
        return {
          success: false,
          error: 'Enregistrement de stock introuvable'
        };
      }

      const oldQuantity = parseFloat(currentStock.quantity.toString());
      const adjustment = newQuantity - oldQuantity;
      const now = new Date().toISOString();

      // Mettre à jour la quantité
      const { data: updated, error: updateError } = await supabase
        .from('poc_internal_stock')
        .update({
          quantity: newQuantity,
          updated_at: now,
          last_count_date: now
        })
        .eq('id', stockId)
        .select()
        .single();

      if (updateError || !updated) {
        return {
          success: false,
          error: `Erreur mise à jour stock: ${updateError?.message || 'Inconnu'}`
        };
      }

      // Créer la transaction d'ajustement
      const transactionResult = await this.recordAdjustment(
        companyId,
        stockId,
        Math.abs(adjustment),
        currentStock.unit,
        reason || `Ajustement: ${oldQuantity} → ${newQuantity}`,
        currentUserId
      );

      if (!transactionResult.success) {
        console.warn('Erreur enregistrement transaction:', transactionResult.error);
      }

      return {
        success: true,
        data: updated as InternalStock
      };
    } catch (error: any) {
      console.error('Erreur adjustStock:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'ajustement de stock'
      };
    }
  }

  /**
   * Transfère du stock entre deux emplacements
   */
  async transferStock(
    companyId: string,
    stockId: string,
    quantity: number,
    toLocation: string,
    notes?: string,
    userId?: string
  ): Promise<ServiceResult<{ fromStock: InternalStock; toStock: InternalStock }>> {
    try {
      let currentUserId: string;
      if (userId) {
        currentUserId = userId;
      } else {
        const userIdResult = await getAuthenticatedUserId();
        if (!userIdResult.success || !userIdResult.data) {
          return {
            success: false,
            error: userIdResult.error || 'Utilisateur non authentifié'
          };
        }
        currentUserId = userIdResult.data;
      }

      // Récupérer l'enregistrement source
      const { data: fromStock, error: fetchError } = await supabase
        .from('poc_internal_stock')
        .select('*')
        .eq('id', stockId)
        .eq('company_id', companyId)
        .single();

      if (fetchError || !fromStock) {
        return {
          success: false,
          error: 'Enregistrement de stock source introuvable'
        };
      }

      const currentQuantity = parseFloat(fromStock.quantity.toString());

      // Vérifier la disponibilité
      if (currentQuantity < quantity) {
        return {
          success: false,
          error: `Stock insuffisant pour transfert (disponible: ${currentQuantity}, requis: ${quantity})`
        };
      }

      const now = new Date().toISOString();

      // Réduire le stock source
      const newFromQuantity = currentQuantity - quantity;
      const { data: updatedFrom, error: updateFromError } = await supabase
        .from('poc_internal_stock')
        .update({
          quantity: newFromQuantity,
          updated_at: now,
          last_count_date: now
        })
        .eq('id', stockId)
        .select()
        .single();

      if (updateFromError || !updatedFrom) {
        return {
          success: false,
          error: `Erreur mise à jour stock source: ${updateFromError?.message || 'Inconnu'}`
        };
      }

      // Vérifier si un enregistrement existe à la destination
      let query = supabase
        .from('poc_internal_stock')
        .select('*')
        .eq('company_id', companyId)
        .eq('location', toLocation);

      if (fromStock.product_id) {
        query = query.eq('product_id', fromStock.product_id);
      } else {
        query = query.is('product_id', null).eq('item_name', fromStock.item_name);
      }

      const { data: existingToStock, error: toFetchError } = await query.maybeSingle();

      let toStock: InternalStock;

      if (existingToStock) {
        // Mettre à jour le stock de destination
        const newToQuantity = parseFloat(existingToStock.quantity.toString()) + quantity;
        const { data: updatedTo, error: updateToError } = await supabase
          .from('poc_internal_stock')
          .update({
            quantity: newToQuantity,
            updated_at: now,
            last_count_date: now
          })
          .eq('id', existingToStock.id)
          .select()
          .single();

        if (updateToError || !updatedTo) {
          return {
            success: false,
            error: `Erreur mise à jour stock destination: ${updateToError?.message || 'Inconnu'}`
          };
        }

        toStock = updatedTo as InternalStock;
      } else {
        // Créer un nouvel enregistrement à la destination
        const { data: createdTo, error: createToError } = await supabase
          .from('poc_internal_stock')
          .insert({
            company_id: companyId,
            product_id: fromStock.product_id,
            item_name: fromStock.item_name,
            quantity: quantity,
            unit: fromStock.unit,
            location: toLocation,
            min_threshold: fromStock.min_threshold,
            last_count_date: now,
            notes: null,
            created_at: now,
            updated_at: now,
            created_by: currentUserId
          })
          .select()
          .single();

        if (createToError || !createdTo) {
          return {
            success: false,
            error: `Erreur création stock destination: ${createToError?.message || 'Inconnu'}`
          };
        }

        toStock = createdTo as InternalStock;
      }

      // Créer la transaction de transfert
      const transactionResult = await this.recordTransfer(
        companyId,
        stockId,
        toStock.id,
        quantity,
        fromStock.unit,
        fromStock.location,
        toLocation,
        notes || `Transfert: ${fromStock.item_name}`,
        currentUserId
      );

      if (!transactionResult.success) {
        console.warn('Erreur enregistrement transaction:', transactionResult.error);
      }

      return {
        success: true,
        data: {
          fromStock: updatedFrom as InternalStock,
          toStock
        }
      };
    } catch (error: any) {
      console.error('Erreur transferStock:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du transfert de stock'
      };
    }
  }

  /**
   * Récupère le stock par produit
   */
  async getStockByProduct(
    companyId: string,
    productId: string
  ): Promise<ServiceResult<InternalStock[]>> {
    try {
      const { data: stockRecords, error } = await supabase
        .from('poc_internal_stock')
        .select('*')
        .eq('company_id', companyId)
        .eq('product_id', productId)
        .order('location');

      if (error) {
        return {
          success: false,
          error: `Erreur récupération stock: ${error.message}`
        };
      }

      return {
        success: true,
        data: (stockRecords || []) as InternalStock[]
      };
    } catch (error: any) {
      console.error('Erreur getStockByProduct:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération du stock'
      };
    }
  }

  /**
   * Récupère le stock par emplacement
   */
  async getStockByLocation(
    companyId: string,
    location: string
  ): Promise<ServiceResult<InternalStock[]>> {
    try {
      const { data: stockRecords, error } = await supabase
        .from('poc_internal_stock')
        .select('*')
        .eq('company_id', companyId)
        .eq('location', location)
        .order('item_name');

      if (error) {
        return {
          success: false,
          error: `Erreur récupération stock: ${error.message}`
        };
      }

      return {
        success: true,
        data: (stockRecords || []) as InternalStock[]
      };
    } catch (error: any) {
      console.error('Erreur getStockByLocation:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération du stock'
      };
    }
  }

  /**
   * Récupère les items en stock faible (quantity <= min_threshold)
   */
  async getLowStockItems(
    companyId: string
  ): Promise<ServiceResult<InternalStock[]>> {
    try {
      const { data: stockRecords, error } = await supabase
        .from('poc_internal_stock')
        .select('*')
        .eq('company_id', companyId)
        .not('min_threshold', 'is', null)
        .order('item_name');

      if (error) {
        return {
          success: false,
          error: `Erreur récupération stock: ${error.message}`
        };
      }

      // Filtrer les items où quantity <= min_threshold
      const lowStockItems = (stockRecords || []).filter((item: any) => {
        const quantity = parseFloat(item.quantity.toString());
        const threshold = parseFloat(item.min_threshold.toString());
        return quantity <= threshold;
      }) as InternalStock[];

      // Trier par urgence (ratio quantity / min_threshold)
      lowStockItems.sort((a, b) => {
        const ratioA = parseFloat(a.quantity.toString()) / parseFloat(a.min_threshold!.toString());
        const ratioB = parseFloat(b.quantity.toString()) / parseFloat(b.min_threshold!.toString());
        return ratioA - ratioB;
      });

      return {
        success: true,
        data: lowStockItems
      };
    } catch (error: any) {
      console.error('Erreur getLowStockItems:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des items en stock faible'
      };
    }
  }

  /**
   * Récupère l'historique des transactions de stock avec filtres
   */
  async getStockHistory(
    companyId: string,
    filters?: StockFilter
  ): Promise<ServiceResult<StockTransaction[]>> {
    try {
      let query = supabase
        .from('poc_stock_transactions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.productId) {
        // Joindre avec poc_internal_stock pour filtrer par product_id
        query = query.eq('internal_stock_id', filters.productId);
      }

      if (filters?.location) {
        // Note: nécessite une jointure ou un filtre sur from_location/to_location
        query = query.or(`from_location.eq.${filters.location},to_location.eq.${filters.location}`);
      }

      if (filters?.transactionType) {
        query = query.eq('transaction_type', filters.transactionType);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data: transactions, error } = await query;

      if (error) {
        return {
          success: false,
          error: `Erreur récupération historique: ${error.message}`
        };
      }

      return {
        success: true,
        data: (transactions || []) as StockTransaction[]
      };
    } catch (error: any) {
      console.error('Erreur getStockHistory:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération de l\'historique'
      };
    }
  }

  /**
   * Enregistre une transaction d'entrée
   */
  private async recordEntry(
    companyId: string,
    stockId: string,
    quantity: number,
    unit: string,
    referenceType: string,
    referenceId: string | null | undefined,
    toLocation: string,
    notes: string,
    userId: string
  ): Promise<ServiceResult<StockTransaction>> {
    try {
      const { data: transaction, error } = await supabase
        .from('poc_stock_transactions')
        .insert({
          company_id: companyId,
          internal_stock_id: stockId,
          transaction_type: 'entry',
          quantity: quantity,
          unit: unit,
          reference_type: referenceType,
          reference_id: referenceId || null,
          from_location: null,
          to_location: toLocation,
          notes: notes,
          created_at: new Date().toISOString(),
          created_by: userId
        })
        .select()
        .single();

      if (error || !transaction) {
        return {
          success: false,
          error: `Erreur enregistrement transaction: ${error?.message || 'Inconnu'}`
        };
      }

      return {
        success: true,
        data: transaction as StockTransaction
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'enregistrement de la transaction'
      };
    }
  }

  /**
   * Enregistre une transaction de sortie
   */
  private async recordExit(
    companyId: string,
    stockId: string,
    quantity: number,
    unit: string,
    referenceType: string,
    referenceId: string | null | undefined,
    fromLocation: string,
    notes: string,
    userId: string
  ): Promise<ServiceResult<StockTransaction>> {
    try {
      const { data: transaction, error } = await supabase
        .from('poc_stock_transactions')
        .insert({
          company_id: companyId,
          internal_stock_id: stockId,
          transaction_type: 'exit',
          quantity: quantity,
          unit: unit,
          reference_type: referenceType,
          reference_id: referenceId || null,
          from_location: fromLocation,
          to_location: null,
          notes: notes,
          created_at: new Date().toISOString(),
          created_by: userId
        })
        .select()
        .single();

      if (error || !transaction) {
        return {
          success: false,
          error: `Erreur enregistrement transaction: ${error?.message || 'Inconnu'}`
        };
      }

      return {
        success: true,
        data: transaction as StockTransaction
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'enregistrement de la transaction'
      };
    }
  }

  /**
   * Enregistre une transaction d'ajustement
   */
  private async recordAdjustment(
    companyId: string,
    stockId: string,
    quantity: number,
    unit: string,
    notes: string,
    userId: string
  ): Promise<ServiceResult<StockTransaction>> {
    try {
      const { data: transaction, error } = await supabase
        .from('poc_stock_transactions')
        .insert({
          company_id: companyId,
          internal_stock_id: stockId,
          transaction_type: 'adjustment',
          quantity: quantity,
          unit: unit,
          reference_type: 'adjustment',
          reference_id: null,
          from_location: null,
          to_location: null,
          notes: notes,
          created_at: new Date().toISOString(),
          created_by: userId
        })
        .select()
        .single();

      if (error || !transaction) {
        return {
          success: false,
          error: `Erreur enregistrement transaction: ${error?.message || 'Inconnu'}`
        };
      }

      return {
        success: true,
        data: transaction as StockTransaction
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'enregistrement de la transaction'
      };
    }
  }

  /**
   * Enregistre une transaction de transfert
   */
  private async recordTransfer(
    companyId: string,
    fromStockId: string,
    toStockId: string,
    quantity: number,
    unit: string,
    fromLocation: string,
    toLocation: string,
    notes: string,
    userId: string
  ): Promise<ServiceResult<StockTransaction>> {
    try {
      const { data: transaction, error } = await supabase
        .from('poc_stock_transactions')
        .insert({
          company_id: companyId,
          internal_stock_id: fromStockId,
          transaction_type: 'transfer',
          quantity: quantity,
          unit: unit,
          reference_type: 'transfer',
          reference_id: toStockId,
          from_location: fromLocation,
          to_location: toLocation,
          notes: notes,
          created_at: new Date().toISOString(),
          created_by: userId
        })
        .select()
        .single();

      if (error || !transaction) {
        return {
          success: false,
          error: `Erreur enregistrement transaction: ${error?.message || 'Inconnu'}`
        };
      }

      return {
        success: true,
        data: transaction as StockTransaction
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'enregistrement de la transaction'
      };
    }
  }

  /**
   * Calcule le stock disponible en tenant compte des réservations
   * Note: Cette fonction nécessiterait une table de réservations pour être complète
   */
  async getAvailableStock(
    companyId: string,
    stockId: string
  ): Promise<ServiceResult<number>> {
    try {
      const { data: stockRecord, error } = await supabase
        .from('poc_internal_stock')
        .select('quantity')
        .eq('id', stockId)
        .eq('company_id', companyId)
        .single();

      if (error || !stockRecord) {
        return {
          success: false,
          error: 'Enregistrement de stock introuvable'
        };
      }

      const quantity = parseFloat(stockRecord.quantity.toString());

      // TODO: Soustraire les réservations si une table de réservations existe
      // const reservations = await getReservations(stockId);
      // const reservedQuantity = reservations.reduce((sum, r) => sum + r.quantity, 0);
      // const available = quantity - reservedQuantity;

      return {
        success: true,
        data: quantity
      };
    } catch (error: any) {
      console.error('Erreur getAvailableStock:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors du calcul du stock disponible'
      };
    }
  }

  /**
   * Déduit le stock pour tous les items d'un bon de commande lorsque celui-ci est satisfait depuis le stock interne
   * Cette fonction est appelée lorsque le bon de commande passe au statut fulfilled_internal
   * 
   * @param orderId - UUID du bon de commande à satisfaire
   * @returns ServiceResult<void> - Succès si toutes les déductions ont réussi, erreur sinon
   * 
   * @example
   * ```typescript
   * const result = await pocStockService.fulfillFromStock('order-123');
   * if (result.success) {
   *   console.log('Stock déduit avec succès pour tous les items');
   * } else {
   *   console.error('Erreur:', result.error);
   * }
   * ```
   */
  async fulfillFromStock(orderId: string): Promise<ServiceResult<void>> {
    try {
      // Étape 1: Récupérer le bon de commande avec ses items
      const orderResult = await pocPurchaseOrderService.getById(orderId);

      if (!orderResult.success || !orderResult.data) {
        return {
          success: false,
          error: 'Bon de commande introuvable'
        };
      }

      const order = orderResult.data;
      const companyId = order.companyId;

      // Vérifier qu'il y a des items dans le bon de commande
      if (!order.items || order.items.length === 0) {
        return {
          success: false,
          error: 'Aucun article dans le bon de commande'
        };
      }

      // Étape 2: Pour chaque item, trouver l'enregistrement de stock et déduire la quantité
      for (const item of order.items) {
        // Trouver l'enregistrement de stock correspondant
        let stockQuery = supabase
          .from('poc_internal_stock')
          .select('*')
          .eq('company_id', companyId);

        // Rechercher par product_id si disponible, sinon par item_name
        if (item.catalogItemId) {
          stockQuery = stockQuery.eq('product_id', item.catalogItemId);
        } else {
          stockQuery = stockQuery.is('product_id', null).eq('item_name', item.itemName);
        }

        const { data: stockRecords, error: stockError } = await stockQuery;

        if (stockError) {
          return {
            success: false,
            error: `Erreur lors de la recherche du stock pour "${item.itemName}": ${stockError.message}`
          };
        }

        if (!stockRecords || stockRecords.length === 0) {
          return {
            success: false,
            error: `Stock introuvable pour l'article "${item.itemName}"`
          };
        }

        // Utiliser le premier enregistrement trouvé (ou celui avec la plus grande quantité disponible)
        // Pour simplifier, on prend le premier. En production, on pourrait choisir par location ou quantité
        const stockRecord = stockRecords[0] as InternalStock;
        const stockId = stockRecord.id;

        // Vérifier la disponibilité avant de déduire
        const currentQuantity = parseFloat(stockRecord.quantity.toString());
        const requestedQuantity = item.quantity;

        if (currentQuantity < requestedQuantity) {
          return {
            success: false,
            error: `Stock insuffisant pour article "${item.itemName}": disponible ${currentQuantity} ${item.unit}, demandé ${requestedQuantity} ${item.unit}`
          };
        }

        // Appeler removeStock pour déduire le stock et créer la transaction
        // removeStock créera automatiquement une transaction avec le message "Sortie de stock: {item_name}"
        const removeResult = await this.removeStock(
          companyId,
          stockId,
          requestedQuantity,
          'purchase_order',
          orderId
        );

        if (!removeResult.success) {
          // Si removeStock retourne une erreur de stock insuffisant, utiliser son message
          // Sinon, retourner un message générique avec les détails de l'item
          if (removeResult.error?.includes('Stock insuffisant')) {
            return {
              success: false,
              error: `Stock insuffisant pour article "${item.itemName}": ${removeResult.error}`
            };
          }
          return {
            success: false,
            error: `Erreur lors de la déduction du stock pour "${item.itemName}": ${removeResult.error || 'Erreur inconnue'}`
          };
        }
      }

      // Étape 3: Toutes les déductions ont réussi
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Erreur fulfillFromStock:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de la déduction du stock'
      };
    }
  }
}

export default new POCStockService();
