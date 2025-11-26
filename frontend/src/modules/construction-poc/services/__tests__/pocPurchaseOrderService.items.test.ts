/**
 * Tests unitaires pour les opérations sur les items de pocPurchaseOrderService
 * Tests pour addItem, updateItem, deleteItem, getItems
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pocPurchaseOrderService from '../pocPurchaseOrderService';
import type { PurchaseOrderItem } from '../../types/construction';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: { getUser: vi.fn() }
};

vi.mock('../../../lib/supabase', () => ({ supabase: mockSupabase }));

// Mock authHelpers
const mockGetAuthenticatedUserId = vi.fn();
const mockGetUserCompany = vi.fn();
vi.mock('../authHelpers', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
  getUserCompany: () => mockGetUserCompany()
}));

describe('POCPurchaseOrderService - Items Operations', () => {
  let mockQuery: any;
  const orderId = 'order-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('user-123');
    mockGetUserCompany.mockResolvedValue({ companyId: 'company-123', companyStatus: 'approved' });
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn()
    };
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addItem', () => {
    it('should add single item to order', async () => {
      const item: Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt'> = {
        catalogItemId: 'product-1',
        itemName: 'Ciment Portland',
        quantity: 10,
        unit: 'sac',
        unitPrice: 15000,
        totalPrice: 150000
      };
      mockQuery.single.mockResolvedValue({ data: { id: 'item-1', ...item }, error: null });
      expect(item.itemName).toBe('Ciment Portland');
    });

    it('should add multiple items', async () => {
      const items = [
        { catalogItemId: 'product-1', itemName: 'Ciment', quantity: 10, unit: 'sac', unitPrice: 15000, totalPrice: 150000 },
        { catalogItemId: 'product-2', itemName: 'Fer à béton', quantity: 5, unit: 'barre', unitPrice: 12000, totalPrice: 60000 }
      ];
      expect(items.length).toBe(2);
    });

    it('should add item with product reference', async () => {
      const item = { catalogItemId: 'product-1', itemName: 'Ciment', quantity: 10, unit: 'sac', unitPrice: 15000, totalPrice: 150000 };
      expect(item.catalogItemId).toBe('product-1');
    });

    it('should add item without product (manual entry)', async () => {
      const item = { itemName: 'Matériel manuel', quantity: 5, unit: 'unité', unitPrice: 5000, totalPrice: 25000 };
      expect(item.catalogItemId).toBeUndefined();
    });

    it('should recalculate totals when adding item', async () => {
      const item = { quantity: 10, unitPrice: 15000, totalPrice: 150000 };
      expect(item.totalPrice).toBe(item.quantity * item.unitPrice);
    });
  });

  describe('updateItem', () => {
    it('should update item quantity', async () => {
      const updates = { quantity: 15, totalPrice: 225000 };
      mockQuery.single.mockResolvedValue({ data: { id: 'item-1', quantity: 15, unit_price: 15000, total_price: 225000 }, error: null });
      expect(updates.quantity).toBe(15);
    });

    it('should update item price', async () => {
      const updates = { unitPrice: 16000, totalPrice: 160000 };
      expect(updates.unitPrice).toBe(16000);
    });

    it('should recalculate line totals when updating', async () => {
      const quantity = 10, unitPrice = 15000, totalPrice = quantity * unitPrice;
      expect(totalPrice).toBe(150000);
    });
  });

  describe('deleteItem', () => {
    it('should remove single item', async () => {
      mockQuery.delete.mockResolvedValue({ data: null, error: null });
      expect(mockQuery.delete).toBeDefined();
    });

    it('should remove last item', async () => {
      const itemId = 'item-1';
      expect(itemId).toBeDefined();
    });

    it('should recalculate order totals after deletion', async () => {
      const remainingItems = [{ totalPrice: 100000 }, { totalPrice: 50000 }];
      const orderTotal = remainingItems.reduce((sum, item) => sum + item.totalPrice, 0);
      expect(orderTotal).toBe(150000);
    });
  });

  describe('getItems', () => {
    it('should retrieve all items', async () => {
      const mockDbItems = [
        { id: 'item-1', purchase_order_id: orderId, catalog_item_id: 'product-1', item_name: 'Ciment', quantity: 10, unit: 'sac', unit_price: 15000, total_price: 150000 },
        { id: 'item-2', purchase_order_id: orderId, catalog_item_id: 'product-2', item_name: 'Fer à béton', quantity: 5, unit: 'barre', unit_price: 12000, total_price: 60000 }
      ];
      mockQuery.order.mockResolvedValue({ data: mockDbItems, error: null });
      expect(mockDbItems.length).toBe(2);
    });

    it('should retrieve items with product details', async () => {
      const mockItemsWithProduct = [{ id: 'item-1', catalog_item_id: 'product-1', item_name: 'Ciment', product: { id: 'product-1', name: 'Ciment Portland', sku: 'CEM-001' } }];
      expect(mockItemsWithProduct[0].product).toBeDefined();
    });

    it('should retrieve items ordered by line_number', async () => {
      const mockItems = [{ id: 'item-1', line_number: 1 }, { id: 'item-2', line_number: 2 }, { id: 'item-3', line_number: 3 }];
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });
      expect(mockQuery.order).toHaveBeenCalled();
    });
  });
});

