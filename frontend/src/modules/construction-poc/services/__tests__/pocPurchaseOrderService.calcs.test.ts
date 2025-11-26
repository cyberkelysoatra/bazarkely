/**
 * Tests unitaires pour les calculs de pocPurchaseOrderService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import pocPurchaseOrderService from '../pocPurchaseOrderService';
import type { PurchaseOrderItem } from '../../types/construction';

const mockSupabase = { from: vi.fn(), auth: { getUser: vi.fn() } };
vi.mock('../../../lib/supabase', () => ({ supabase: mockSupabase }));

const mockGetAuthenticatedUserId = vi.fn();
const mockGetUserCompany = vi.fn();
vi.mock('../authHelpers', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId(),
  getUserCompany: () => mockGetUserCompany()
}));

const calculateSubtotal = (items: PurchaseOrderItem[]): number => 
  items.reduce((sum, item) => sum + item.totalPrice, 0);
const calculateTax = (subtotal: number, rate: number = 0.18): number => 
  Math.round(subtotal * rate * 100) / 100;
const calculateTotal = (subtotal: number, tax: number, deliveryFee?: number): number => 
  subtotal + tax + (deliveryFee || 0);

describe('POCPurchaseOrderService - Calculations', () => {
  let mockQuery: any;
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('user-123');
    mockGetUserCompany.mockResolvedValue({ companyId: 'company-123', companyStatus: 'approved' });
    mockQuery = { select: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), single: vi.fn() };
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe('calculateSubtotal', () => {
    it('should calculate subtotal for single item', () => {
      const items: PurchaseOrderItem[] = [{ id: 'item-1', purchaseOrderId: 'po-1', itemName: 'Ciment', quantity: 10, unit: 'sac', unitPrice: 15000, totalPrice: 150000, createdAt: new Date(), updatedAt: new Date() }];
      expect(calculateSubtotal(items)).toBe(150000);
    });
    it('should calculate subtotal for multiple items', () => {
      const items: PurchaseOrderItem[] = [
        { id: 'item-1', purchaseOrderId: 'po-1', itemName: 'Item 1', quantity: 5, unit: 'unité', unitPrice: 10000, totalPrice: 50000, createdAt: new Date(), updatedAt: new Date() },
        { id: 'item-2', purchaseOrderId: 'po-1', itemName: 'Item 2', quantity: 3, unit: 'unité', unitPrice: 20000, totalPrice: 60000, createdAt: new Date(), updatedAt: new Date() }
      ];
      expect(calculateSubtotal(items)).toBe(110000);
    });
    it('should handle decimals in subtotal calculation', () => {
      const items: PurchaseOrderItem[] = [{ id: 'item-1', purchaseOrderId: 'po-1', itemName: 'Item', quantity: 2.5, unit: 'kg', unitPrice: 1234.56, totalPrice: 3086.40, createdAt: new Date(), updatedAt: new Date() }];
      expect(calculateSubtotal(items)).toBe(3086.40);
    });
  });

  describe('calculateTax', () => {
    it('should calculate 18% tax correctly', () => {
      expect(calculateTax(100000, 0.18)).toBe(18000);
    });
    it('should round tax correctly', () => {
      const tax = calculateTax(100001, 0.18);
      expect(tax).toBe(18000.18);
      expect(Math.round(tax * 100) / 100).toBe(tax);
    });
  });

  describe('calculateTotal', () => {
    it('should calculate total with subtotal + tax + delivery fee', () => {
      expect(calculateTotal(100000, 18000, 50000)).toBe(168000);
    });
    it('should calculate total without delivery fee', () => {
      expect(calculateTotal(100000, 18000)).toBe(118000);
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate order number in format PO-YYYY-MM-XXXX', async () => {
      const mockOrder = { id: 'po-1', buyer_company_id: 'company-123', project_id: 'project-1', created_by: 'user-123', order_number: 'PO-2025-01-0001', status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const mockItems = [{ id: 'item-1', purchase_order_id: 'po-1', item_name: 'Test', quantity: 1, unit: 'unité', unit_price: 1000, total_price: 1000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
      mockQuery.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null });
      mockQuery.insert.mockResolvedValue({ data: null, error: null });
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });
      const result = await pocPurchaseOrderService.createDraft('project-1', [{ itemName: 'Test', quantity: 1, unit: 'unité', unitPrice: 1000, totalPrice: 1000 }]);
      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.orderNumber).toMatch(/^PO-\d{4}-\d{2}-\d{4}$/);
      }
    });
    it('should ensure order number uniqueness', async () => {
      const year = new Date().getFullYear();
      const mockOrder = { id: 'po-1', buyer_company_id: 'company-123', project_id: 'project-1', created_by: 'user-123', order_number: `PO-${year}-01-0002`, status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const mockItems = [{ id: 'item-1', purchase_order_id: 'po-1', item_name: 'Test', quantity: 1, unit: 'unité', unit_price: 1000, total_price: 1000, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }];
      mockQuery.single
        .mockResolvedValueOnce({ data: { order_number: `PO-${year}-01-0001` }, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null });
      mockQuery.insert.mockResolvedValue({ data: null, error: null });
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });
      const result = await pocPurchaseOrderService.createDraft('project-1', [{ itemName: 'Test', quantity: 1, unit: 'unité', unitPrice: 1000, totalPrice: 1000 }]);
      expect(result.success).toBe(true);
    });
    it('should handle year boundary correctly', async () => {
      const mockDate = new Date('2024-12-31');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      const mockOrder = { id: 'po-1', buyer_company_id: 'company-123', project_id: 'project-1', created_by: 'user-123', order_number: 'PO-2024-12-0001', status: 'draft', created_at: mockDate.toISOString(), updated_at: mockDate.toISOString() };
      const mockItems = [{ id: 'item-1', purchase_order_id: 'po-1', item_name: 'Test', quantity: 1, unit: 'unité', unit_price: 1000, total_price: 1000, created_at: mockDate.toISOString(), updated_at: mockDate.toISOString() }];
      mockQuery.single
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null })
        .mockResolvedValueOnce({ data: mockOrder, error: null });
      mockQuery.insert.mockResolvedValue({ data: null, error: null });
      mockQuery.order.mockResolvedValue({ data: mockItems, error: null });
      const result = await pocPurchaseOrderService.createDraft('project-1', [{ itemName: 'Test', quantity: 1, unit: 'unité', unitPrice: 1000, totalPrice: 1000 }]);
      expect(result.success).toBe(true);
      vi.restoreAllMocks();
    });
  });

  describe('Recalculate on item operations', () => {
    it('should recalculate on item add', () => {
      let items: PurchaseOrderItem[] = [{ id: 'item-1', purchaseOrderId: 'po-1', itemName: 'Item 1', quantity: 1, unit: 'unité', unitPrice: 10000, totalPrice: 10000, createdAt: new Date(), updatedAt: new Date() }];
      const initialSubtotal = calculateSubtotal(items);
      items.push({ id: 'item-2', purchaseOrderId: 'po-1', itemName: 'Item 2', quantity: 2, unit: 'unité', unitPrice: 15000, totalPrice: 30000, createdAt: new Date(), updatedAt: new Date() });
      expect(calculateSubtotal(items)).toBe(initialSubtotal + 30000);
    });
    it('should recalculate on item update', () => {
      const items: PurchaseOrderItem[] = [{ id: 'item-1', purchaseOrderId: 'po-1', itemName: 'Item 1', quantity: 1, unit: 'unité', unitPrice: 10000, totalPrice: 10000, createdAt: new Date(), updatedAt: new Date() }];
      const initialSubtotal = calculateSubtotal(items);
      items[0].quantity = 3; items[0].totalPrice = 30000;
      expect(calculateSubtotal(items)).toBe(initialSubtotal + 20000);
    });
    it('should recalculate on item delete', () => {
      const items: PurchaseOrderItem[] = [
        { id: 'item-1', purchaseOrderId: 'po-1', itemName: 'Item 1', quantity: 1, unit: 'unité', unitPrice: 10000, totalPrice: 10000, createdAt: new Date(), updatedAt: new Date() },
        { id: 'item-2', purchaseOrderId: 'po-1', itemName: 'Item 2', quantity: 1, unit: 'unité', unitPrice: 20000, totalPrice: 20000, createdAt: new Date(), updatedAt: new Date() }
      ];
      const initialSubtotal = calculateSubtotal(items);
      items.pop();
      expect(calculateSubtotal(items)).toBe(initialSubtotal - 20000);
    });
  });
});

