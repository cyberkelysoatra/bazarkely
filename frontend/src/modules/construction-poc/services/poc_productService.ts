/**
 * Service POC pour la gestion du catalogue produits
 * Utilise Supabase pour les opérations CRUD
 */

import { supabase } from '../../../lib/supabase'
import type { ServiceResult } from '../types/construction'

export interface Product {
  id: string
  supplierId: string
  name: string
  description?: string
  sku: string
  category: string
  unit: string
  price: number
  imageUrl?: string
  available: boolean
  stockQuantity?: number
  minOrderQuantity?: number
  createdAt: Date
  updatedAt: Date
}

export interface ProductFilter {
  category?: string
  supplierId?: string
  minPrice?: number
  maxPrice?: number
  available?: boolean
  search?: string
}

export interface ProductSort {
  field: 'price' | 'name' | 'createdAt'
  order: 'asc' | 'desc'
}

/**
 * Service de gestion du catalogue produits
 */
export const poc_productService = {
  /**
   * Récupérer tous les produits avec filtres et tri
   */
  async getProducts(
    filters?: ProductFilter,
    sort?: ProductSort
  ): Promise<ServiceResult<Product[]>> {
    try {
      let query = supabase
        .from('poc_products')
        .select('*')

      // Appliquer les filtres
      if (filters?.category) {
        query = query.eq('category', filters.category)
      }
      if (filters?.supplierId) {
        query = query.eq('supplier_id', filters.supplierId)
      }
      if (filters?.minPrice !== undefined) {
        query = query.gte('price', filters.minPrice)
      }
      if (filters?.maxPrice !== undefined) {
        query = query.lte('price', filters.maxPrice)
      }
      if (filters?.available !== undefined) {
        query = query.eq('available', filters.available)
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
      }

      // Appliquer le tri
      if (sort) {
        const fieldMap: Record<string, string> = {
          price: 'price',
          name: 'name',
          createdAt: 'created_at'
        }
        query = query.order(fieldMap[sort.field] || 'created_at', {
          ascending: sort.order === 'asc'
        })
      } else {
        query = query.order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) throw error

      // Convertir les données de snake_case à camelCase
      const products: Product[] = (data || []).map((item: any) => ({
        id: item.id,
        supplierId: item.supplier_id,
        name: item.name,
        description: item.description,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        price: item.price,
        imageUrl: item.image_url,
        available: item.available,
        stockQuantity: item.stock_quantity,
        minOrderQuantity: item.min_order_quantity,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }))

      return { success: true, data: products }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des produits'
      }
    }
  },

  /**
   * Récupérer un produit par ID
   */
  async getProductById(productId: string): Promise<ServiceResult<Product>> {
    try {
      const { data, error } = await supabase
        .from('poc_products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) throw error
      if (!data) {
        return { success: false, error: 'Produit non trouvé' }
      }

      const product: Product = {
        id: data.id,
        supplierId: data.supplier_id,
        name: data.name,
        description: data.description,
        sku: data.sku,
        category: data.category,
        unit: data.unit,
        price: data.price,
        imageUrl: data.image_url,
        available: data.available,
        stockQuantity: data.stock_quantity,
        minOrderQuantity: data.min_order_quantity,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      }

      return { success: true, data: product }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération du produit'
      }
    }
  },

  /**
   * Récupérer les catégories disponibles
   */
  async getCategories(): Promise<ServiceResult<string[]>> {
    try {
      const { data, error } = await supabase
        .from('poc_products')
        .select('category')
        .not('category', 'is', null)

      if (error) throw error

      const categories = Array.from(
        new Set((data || []).map((item: any) => item.category).filter(Boolean))
      ) as string[]

      return { success: true, data: categories }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la récupération des catégories'
      }
    }
  }
}





