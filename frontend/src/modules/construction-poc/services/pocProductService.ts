/**
 * Service POC pour la gestion du catalogue produits
 * CRUD complet avec filtres, pagination et gestion d'erreurs
 * Utilise Supabase pour les opérations de base de données
 */

import { supabase } from '../../../lib/supabase';
import { getAuthenticatedUserId } from './authHelpers';
import type {
  Product,
  ProductCategory,
  CreateProduct,
  UpdateProduct,
  ProductFilters,
  PaginationOptions,
  PaginatedResult,
  ServiceResult
} from '../types/construction';

/**
 * Service de gestion des produits
 */
class POCProductService {
  /**
   * Crée un nouveau produit
   * @param productData - Données du produit à créer
   * @returns ServiceResult avec le produit créé
   */
  async create(productData: CreateProduct): Promise<ServiceResult<Product>> {
    try {
      // Récupérer l'utilisateur authentifié
      const userIdResult = await getAuthenticatedUserId();
      if (!userIdResult.success || !userIdResult.data) {
        return {
          success: false,
          error: userIdResult.error || 'Utilisateur non authentifié'
        };
      }
      const userId = userIdResult.data;

      // Préparer les données pour l'insertion (snake_case pour la DB)
      const insertData = {
        supplier_id: productData.supplierId,
        category_id: productData.categoryId || null,
        name: productData.name,
        description: productData.description || null,
        sku: productData.sku || null,
        unit: productData.unit || 'unité',
        current_price: productData.currentPrice,
        currency: productData.currency || 'MGA',
        stock_available: productData.stockAvailable ?? 0,
        min_order_quantity: productData.minOrderQuantity ?? 1,
        images_urls: productData.imagesUrls || [],
        specifications: productData.specifications || {},
        is_active: productData.isActive ?? true,
        created_by: productData.createdBy || userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('poc_products')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: this.handleError(error, 'Erreur lors de la création du produit')
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Aucune donnée retournée après création'
        };
      }

      return {
        success: true,
        data: this.mapDbToProduct(data)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la création du produit'
      };
    }
  }

  /**
   * Met à jour un produit existant
   * @param productData - Données du produit à mettre à jour (doit inclure id)
   * @returns ServiceResult avec le produit mis à jour
   */
  async update(productData: UpdateProduct): Promise<ServiceResult<Product>> {
    try {
      // Vérifier que l'ID est fourni
      if (!productData.id) {
        return {
          success: false,
          error: 'ID du produit requis pour la mise à jour'
        };
      }

      // Récupérer l'utilisateur authentifié pour vérifier les permissions
      await getAuthenticatedUserId();

      // Préparer les données de mise à jour (seulement les champs fournis)
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (productData.categoryId !== undefined) {
        updateData.category_id = productData.categoryId || null;
      }
      if (productData.name !== undefined) {
        updateData.name = productData.name;
      }
      if (productData.description !== undefined) {
        updateData.description = productData.description || null;
      }
      if (productData.sku !== undefined) {
        updateData.sku = productData.sku || null;
      }
      if (productData.unit !== undefined) {
        updateData.unit = productData.unit;
      }
      if (productData.currentPrice !== undefined) {
        updateData.current_price = productData.currentPrice;
      }
      if (productData.currency !== undefined) {
        updateData.currency = productData.currency;
      }
      if (productData.stockAvailable !== undefined) {
        updateData.stock_available = productData.stockAvailable;
      }
      if (productData.minOrderQuantity !== undefined) {
        updateData.min_order_quantity = productData.minOrderQuantity;
      }
      if (productData.imagesUrls !== undefined) {
        updateData.images_urls = productData.imagesUrls;
      }
      if (productData.specifications !== undefined) {
        updateData.specifications = productData.specifications;
      }
      if (productData.isActive !== undefined) {
        updateData.is_active = productData.isActive;
      }

      const { data, error } = await supabase
        .from('poc_products')
        .update(updateData)
        .eq('id', productData.id)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: this.handleError(error, 'Erreur lors de la mise à jour du produit')
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Produit non trouvé'
        };
      }

      return {
        success: true,
        data: this.mapDbToProduct(data)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la mise à jour du produit'
      };
    }
  }

  /**
   * Supprime un produit
   * @param productId - ID du produit à supprimer
   * @returns ServiceResult indiquant le succès de l'opération
   */
  async delete(productId: string): Promise<ServiceResult<void>> {
    try {
      // Vérifier que l'ID est fourni
      if (!productId) {
        return {
          success: false,
          error: 'ID du produit requis pour la suppression'
        };
      }

      // Récupérer l'utilisateur authentifié pour vérifier les permissions
      await getAuthenticatedUserId();

      const { error } = await supabase
        .from('poc_products')
        .delete()
        .eq('id', productId);

      if (error) {
        return {
          success: false,
          error: this.handleError(error, 'Erreur lors de la suppression du produit')
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la suppression du produit'
      };
    }
  }

  /**
   * Récupère un produit par son ID
   * @param productId - ID du produit
   * @returns ServiceResult avec le produit
   */
  async getById(productId: string): Promise<ServiceResult<Product>> {
    try {
      if (!productId) {
        return {
          success: false,
          error: 'ID du produit requis'
        };
      }

      const { data, error } = await supabase
        .from('poc_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) {
        return {
          success: false,
          error: this.handleError(error, 'Erreur lors de la récupération du produit')
        };
      }

      if (!data) {
        return {
          success: false,
          error: 'Produit non trouvé'
        };
      }

      return {
        success: true,
        data: this.mapDbToProduct(data)
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération du produit'
      };
    }
  }

  /**
   * Récupère tous les produits d'un fournisseur
   * @param supplierId - ID du fournisseur
   * @param filters - Filtres optionnels
   * @param pagination - Options de pagination
   * @returns ServiceResult avec les produits paginés
   */
  async getBySupplier(
    supplierId: string,
    filters?: ProductFilters,
    pagination?: PaginationOptions
  ): Promise<ServiceResult<PaginatedResult<Product>>> {
    try {
      if (!supplierId) {
        return {
          success: false,
          error: 'ID du fournisseur requis'
        };
      }

      let query = supabase
        .from('poc_products')
        .select('*', { count: 'exact' })
        .eq('supplier_id', supplierId);

      // Appliquer les filtres
      query = this.applyFilters(query, filters);

      // Appliquer la pagination
      const limit = pagination?.limit || 50;
      const offset = pagination?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Trier par date de création (plus récent en premier)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: this.handleError(error, 'Erreur lors de la récupération des produits')
        };
      }

      const products = (data || []).map(item => this.mapDbToProduct(item));

      return {
        success: true,
        data: {
          data: products,
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des produits'
      };
    }
  }

  /**
   * Récupère tous les produits d'une catégorie
   * @param categoryId - ID de la catégorie
   * @param filters - Filtres optionnels
   * @param pagination - Options de pagination
   * @returns ServiceResult avec les produits paginés
   */
  async getByCategory(
    categoryId: string,
    filters?: ProductFilters,
    pagination?: PaginationOptions
  ): Promise<ServiceResult<PaginatedResult<Product>>> {
    try {
      if (!categoryId) {
        return {
          success: false,
          error: 'ID de la catégorie requis'
        };
      }

      let query = supabase
        .from('poc_products')
        .select('*', { count: 'exact' })
        .eq('category_id', categoryId);

      // Appliquer les filtres (sans categoryId pour éviter la duplication)
      const filtersWithoutCategory = filters ? { ...filters, categoryId: undefined } : undefined;
      query = this.applyFilters(query, filtersWithoutCategory);

      // Appliquer la pagination
      const limit = pagination?.limit || 50;
      const offset = pagination?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Trier par date de création (plus récent en premier)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: this.handleError(error, 'Erreur lors de la récupération des produits')
        };
      }

      const products = (data || []).map(item => this.mapDbToProduct(item));

      return {
        success: true,
        data: {
          data: products,
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des produits'
      };
    }
  }

  /**
   * Recherche des produits avec filtres et pagination
   * @param filters - Filtres de recherche
   * @param pagination - Options de pagination
   * @returns ServiceResult avec les produits paginés
   */
  async searchProducts(
    filters?: ProductFilters,
    pagination?: PaginationOptions
  ): Promise<ServiceResult<PaginatedResult<Product>>> {
    try {
      let query = supabase
        .from('poc_products')
        .select('*', { count: 'exact' });

      // Appliquer les filtres
      query = this.applyFilters(query, filters);

      // Appliquer la pagination
      const limit = pagination?.limit || 50;
      const offset = pagination?.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Trier par date de création (plus récent en premier)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        return {
          success: false,
          error: this.handleError(error, 'Erreur lors de la recherche de produits')
        };
      }

      const products = (data || []).map(item => this.mapDbToProduct(item));

      return {
        success: true,
        data: {
          data: products,
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la recherche de produits'
      };
    }
  }

  /**
   * Récupère toutes les catégories de produits
   * @returns ServiceResult avec les catégories
   */
  async getCategories(): Promise<ServiceResult<ProductCategory[]>> {
    try {
      const { data, error } = await supabase
        .from('poc_product_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        return {
          success: false,
          error: this.handleError(error, 'Erreur lors de la récupération des catégories')
        };
      }

      const categories = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || undefined,
        parentCategoryId: item.parent_category_id || undefined,
        iconUrl: item.icon_url || undefined,
        sortOrder: item.sort_order || 0,
        isActive: item.is_active ?? true,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));

      return {
        success: true,
        data: categories
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des catégories'
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Applique les filtres à une requête Supabase
   */
  private applyFilters(query: any, filters?: ProductFilters): any {
    if (!filters) {
      return query;
    }

    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    if (filters.supplierId) {
      query = query.eq('supplier_id', filters.supplierId);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte('current_price', filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte('current_price', filters.maxPrice);
    }

    if (filters.stockAvailable !== undefined) {
      if (filters.stockAvailable) {
        // Seulement produits en stock (stock_available > 0)
        query = query.gt('stock_available', 0);
      } else {
        // Seulement produits hors stock (stock_available = 0)
        query = query.eq('stock_available', 0);
      }
    }

    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters.searchText) {
      // Recherche dans name, description, sku
      query = query.or(
        `name.ilike.%${filters.searchText}%,description.ilike.%${filters.searchText}%,sku.ilike.%${filters.searchText}%`
      );
    }

    return query;
  }

  /**
   * Mappe les données de la base de données (snake_case) vers l'interface Product (camelCase)
   */
  private mapDbToProduct(dbData: any): Product {
    return {
      id: dbData.id,
      supplierId: dbData.supplier_id,
      categoryId: dbData.category_id || undefined,
      name: dbData.name,
      description: dbData.description || undefined,
      sku: dbData.sku || undefined,
      unit: dbData.unit || 'unité',
      currentPrice: parseFloat(dbData.current_price),
      currency: dbData.currency || 'MGA',
      stockAvailable: dbData.stock_available ?? 0,
      minOrderQuantity: dbData.min_order_quantity ?? 1,
      imagesUrls: dbData.images_urls || [],
      specifications: dbData.specifications || {},
      isActive: dbData.is_active ?? true,
      createdBy: dbData.created_by,
      createdAt: new Date(dbData.created_at),
      updatedAt: new Date(dbData.updated_at)
    };
  }

  /**
   * Gère les erreurs Supabase et retourne un message utilisateur-friendly
   */
  private handleError(error: any, defaultMessage: string): string {
    if (error?.message) {
      // Messages d'erreur spécifiques
      if (error.message.includes('foreign key constraint')) {
        return 'Référence invalide (catégorie ou fournisseur inexistant)';
      }
      if (error.message.includes('unique constraint')) {
        return 'Un produit avec ce SKU existe déjà';
      }
      if (error.message.includes('check constraint')) {
        return 'Données invalides (vérifiez les valeurs saisies)';
      }
      if (error.message.includes('permission denied') || error.message.includes('RLS')) {
        return 'Permission refusée. Vérifiez vos droits d\'accès.';
      }
      return error.message;
    }
    return defaultMessage;
  }
}

// Export singleton instance
export default new POCProductService();


