/**
 * Tests unitaires pour pocProductService
 * Tests complets pour toutes les opérations CRUD, filtres, erreurs et RLS
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pocProductService from '../pocProductService';
import type { Product, CreateProduct, UpdateProduct, ProductFilters } from '../../types/construction';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
};

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock authHelpers
const mockGetAuthenticatedUserId = vi.fn();
vi.mock('../authHelpers', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId()
}));

describe('POCProductService', () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('user-123');

    // Setup mock query chain
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis()
    };

    mockSupabase.from.mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // CREATE TESTS
  // ============================================================================

  describe('create', () => {
    it('should create a product successfully', async () => {
      const productData: CreateProduct = {
        supplierId: 'supplier-123',
        name: 'Ciment Portland',
        description: 'Ciment de qualité supérieure',
        sku: 'CEM-001',
        unit: 'sac',
        currentPrice: 15000,
        currency: 'MGA',
        stockAvailable: 100,
        minOrderQuantity: 10,
        imagesUrls: ['https://example.com/image.jpg'],
        specifications: { weight: '50kg' },
        isActive: true
      };

      const mockDbProduct = {
        id: 'product-123',
        supplier_id: 'supplier-123',
        category_id: null,
        name: 'Ciment Portland',
        description: 'Ciment de qualité supérieure',
        sku: 'CEM-001',
        unit: 'sac',
        current_price: '15000.00',
        currency: 'MGA',
        stock_available: 100,
        min_order_quantity: 10,
        images_urls: ['https://example.com/image.jpg'],
        specifications: { weight: '50kg' },
        is_active: true,
        created_by: 'user-123',
        created_at: '2025-01-21T10:00:00Z',
        updated_at: '2025-01-21T10:00:00Z'
      };

      mockQuery.single.mockResolvedValue({
        data: mockDbProduct,
        error: null
      });

      const result = await pocProductService.create(productData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('product-123');
      expect(result.data?.name).toBe('Ciment Portland');
      expect(mockSupabase.from).toHaveBeenCalledWith('poc_products');
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('should handle creation error', async () => {
      const productData: CreateProduct = {
        supplierId: 'supplier-123',
        name: 'Test Product',
        unit: 'unité',
        currentPrice: 1000
      };

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Foreign key constraint violation' }
      });

      const result = await pocProductService.create(productData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle RLS permission error', async () => {
      const productData: CreateProduct = {
        supplierId: 'supplier-123',
        name: 'Test Product',
        unit: 'unité',
        currentPrice: 1000
      };

      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'permission denied for table poc_products' }
      });

      const result = await pocProductService.create(productData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission refusée');
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe('update', () => {
    it('should update a product successfully', async () => {
      const updateData: UpdateProduct = {
        id: 'product-123',
        name: 'Ciment Portland Modifié',
        currentPrice: 16000
      };

      const mockDbProduct = {
        id: 'product-123',
        supplier_id: 'supplier-123',
        name: 'Ciment Portland Modifié',
        unit: 'sac',
        current_price: '16000.00',
        currency: 'MGA',
        stock_available: 100,
        min_order_quantity: 10,
        images_urls: [],
        specifications: {},
        is_active: true,
        created_by: 'user-123',
        created_at: '2025-01-21T10:00:00Z',
        updated_at: '2025-01-21T11:00:00Z'
      };

      mockQuery.single.mockResolvedValue({
        data: mockDbProduct,
        error: null
      });

      const result = await pocProductService.update(updateData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('Ciment Portland Modifié');
      expect(result.data?.currentPrice).toBe(16000);
    });

    it('should return error if product ID is missing', async () => {
      const updateData = {
        name: 'Test Product'
      } as UpdateProduct;

      const result = await pocProductService.update(updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ID du produit requis');
    });

    it('should return error if product not found', async () => {
      const updateData: UpdateProduct = {
        id: 'non-existent',
        name: 'Test'
      };

      mockQuery.single.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await pocProductService.update(updateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Produit non trouvé');
    });
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  describe('delete', () => {
    it('should delete a product successfully', async () => {
      mockQuery.delete.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await pocProductService.delete('product-123');

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'product-123');
    });

    it('should return error if product ID is missing', async () => {
      const result = await pocProductService.delete('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('ID du produit requis');
    });

    it('should handle deletion error', async () => {
      mockQuery.delete.mockResolvedValue({
        data: null,
        error: { message: 'Permission denied' }
      });

      const result = await pocProductService.delete('product-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================================================
  // GET BY ID TESTS
  // ============================================================================

  describe('getById', () => {
    it('should retrieve a product by ID successfully', async () => {
      const mockDbProduct = {
        id: 'product-123',
        supplier_id: 'supplier-123',
        name: 'Ciment Portland',
        unit: 'sac',
        current_price: '15000.00',
        currency: 'MGA',
        stock_available: 100,
        min_order_quantity: 10,
        images_urls: [],
        specifications: {},
        is_active: true,
        created_by: 'user-123',
        created_at: '2025-01-21T10:00:00Z',
        updated_at: '2025-01-21T10:00:00Z'
      };

      mockQuery.single.mockResolvedValue({
        data: mockDbProduct,
        error: null
      });

      const result = await pocProductService.getById('product-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('product-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'product-123');
    });

    it('should return error if product not found', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      const result = await pocProductService.getById('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================================================
  // GET BY SUPPLIER TESTS
  // ============================================================================

  describe('getBySupplier', () => {
    it('should retrieve products by supplier with pagination', async () => {
      const mockDbProducts = [
        {
          id: 'product-1',
          supplier_id: 'supplier-123',
          name: 'Product 1',
          unit: 'unité',
          current_price: '1000.00',
          currency: 'MGA',
          stock_available: 50,
          min_order_quantity: 1,
          images_urls: [],
          specifications: {},
          is_active: true,
          created_by: 'user-123',
          created_at: '2025-01-21T10:00:00Z',
          updated_at: '2025-01-21T10:00:00Z'
        },
        {
          id: 'product-2',
          supplier_id: 'supplier-123',
          name: 'Product 2',
          unit: 'unité',
          current_price: '2000.00',
          currency: 'MGA',
          stock_available: 30,
          min_order_quantity: 1,
          images_urls: [],
          specifications: {},
          is_active: true,
          created_by: 'user-123',
          created_at: '2025-01-21T09:00:00Z',
          updated_at: '2025-01-21T09:00:00Z'
        }
      ];

      mockQuery.range.mockResolvedValue({
        data: mockDbProducts,
        error: null,
        count: 2
      });

      const result = await pocProductService.getBySupplier('supplier-123', undefined, {
        limit: 10,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.data.length).toBe(2);
      expect(result.data?.total).toBe(2);
      expect(result.data?.hasMore).toBe(false);
    });

    it('should apply filters when provided', async () => {
      const filters: ProductFilters = {
        minPrice: 1000,
        maxPrice: 5000,
        isActive: true
      };

      mockQuery.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      await pocProductService.getBySupplier('supplier-123', filters);

      expect(mockQuery.gte).toHaveBeenCalledWith('current_price', 1000);
      expect(mockQuery.lte).toHaveBeenCalledWith('current_price', 5000);
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  // ============================================================================
  // GET BY CATEGORY TESTS
  // ============================================================================

  describe('getByCategory', () => {
    it('should retrieve products by category', async () => {
      mockQuery.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      const result = await pocProductService.getByCategory('category-123');

      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('category_id', 'category-123');
    });
  });

  // ============================================================================
  // SEARCH PRODUCTS TESTS
  // ============================================================================

  describe('searchProducts', () => {
    it('should search products with text filter', async () => {
      const filters: ProductFilters = {
        searchText: 'ciment'
      };

      mockQuery.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      await pocProductService.searchProducts(filters);

      expect(mockQuery.or).toHaveBeenCalled();
    });

    it('should filter by stock availability', async () => {
      const filters: ProductFilters = {
        stockAvailable: true
      };

      mockQuery.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      await pocProductService.searchProducts(filters);

      expect(mockQuery.gt).toHaveBeenCalledWith('stock_available', 0);
    });

    it('should filter out of stock products', async () => {
      const filters: ProductFilters = {
        stockAvailable: false
      };

      mockQuery.range.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      await pocProductService.searchProducts(filters);

      expect(mockQuery.eq).toHaveBeenCalledWith('stock_available', 0);
    });

    it('should handle pagination correctly', async () => {
      mockQuery.range.mockResolvedValue({
        data: [],
        error: null,
        count: 100
      });

      const result = await pocProductService.searchProducts(undefined, {
        limit: 10,
        offset: 0
      });

      expect(result.success).toBe(true);
      expect(result.data?.hasMore).toBe(true);
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
    });
  });

  // ============================================================================
  // GET CATEGORIES TESTS
  // ============================================================================

  describe('getCategories', () => {
    it('should retrieve all active categories', async () => {
      const mockDbCategories = [
        {
          id: 'cat-1',
          name: 'Matériaux de construction',
          description: 'Catégorie principale',
          parent_category_id: null,
          icon_url: null,
          sort_order: 1,
          is_active: true,
          created_at: '2025-01-21T10:00:00Z',
          updated_at: '2025-01-21T10:00:00Z'
        }
      ];

      mockQuery.order.mockResolvedValue({
        data: mockDbCategories,
        error: null
      });

      const result = await pocProductService.getCategories();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('poc_product_categories');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      mockGetAuthenticatedUserId.mockRejectedValue(new Error('User not authenticated'));

      const productData: CreateProduct = {
        supplierId: 'supplier-123',
        name: 'Test',
        unit: 'unité',
        currentPrice: 1000
      };

      const result = await pocProductService.create(productData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not authenticated');
    });

    it('should handle network errors gracefully', async () => {
      mockQuery.single.mockRejectedValue(new Error('Network error'));

      const result = await pocProductService.getById('product-123');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});


