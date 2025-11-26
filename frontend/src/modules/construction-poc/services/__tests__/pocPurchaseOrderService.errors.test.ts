/**
 * Tests unitaires pour les scénarios d'erreur de pocPurchaseOrderService
 * Tests d'erreur uniquement - ~100 lignes
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

describe('POCPurchaseOrderService - Error Handling', () => {
  let mockQuery: any;
  const mockItems: Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt'>[] = [
    { itemName: 'Test Item', quantity: 1, unit: 'unité', unitPrice: 1000, totalPrice: 1000 }
  ];

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
      single: vi.fn(),
      order: vi.fn().mockReturnThis()
    };
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe('createDraft - errors', () => {
    it('should handle unauthenticated user', async () => {
      mockGetAuthenticatedUserId.mockRejectedValue(new Error('User not authenticated'));
      const result = await pocPurchaseOrderService.createDraft('project-123', mockItems);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid company ID', async () => {
      mockGetUserCompany.mockResolvedValue({ companyId: null, companyStatus: 'approved' });
      const result = await pocPurchaseOrderService.createDraft('project-123', mockItems);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid project ID', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Foreign key constraint violation', code: '23503' } });
      const result = await pocPurchaseOrderService.createDraft('invalid-project', mockItems);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle negative quantity', async () => {
      const items = [{ itemName: 'Test', quantity: -1, unit: 'unité', unitPrice: 1000, totalPrice: -1000 }];
      const result = await pocPurchaseOrderService.createDraft('project-123', items);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle negative price', async () => {
      const items = [{ itemName: 'Test', quantity: 1, unit: 'unité', unitPrice: -1000, totalPrice: -1000 }];
      const result = await pocPurchaseOrderService.createDraft('project-123', items);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const items: any[] = [{ itemName: '', quantity: 1, unit: 'unité', unitPrice: 1000, totalPrice: 1000 }];
      const result = await pocPurchaseOrderService.createDraft('', items);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('updateDraft - errors', () => {
    it('should handle order not found', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'No rows returned' } });
      const result = await (pocPurchaseOrderService as any).updateDraft('non-existent', []);
      expect(result.success).toBe(false);
      expect(result.error).toContain('introuvable');
    });

    it('should handle not in draft status', async () => {
      mockQuery.single.mockResolvedValue({ data: { id: 'order-123', status: 'pending_site_manager' }, error: null });
      const result = await (pocPurchaseOrderService as any).updateDraft('order-123', []);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle RLS policy violation', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'permission denied for table poc_purchase_orders' } });
      const result = await (pocPurchaseOrderService as any).updateDraft('order-123', []);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deleteDraft - errors', () => {
    it('should handle order not found', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'No rows returned' } });
      const result = await (pocPurchaseOrderService as any).deleteDraft('non-existent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('introuvable');
    });

    it('should handle not in draft status', async () => {
      mockQuery.single.mockResolvedValue({ data: { id: 'order-123', status: 'pending_site_manager' }, error: null });
      const result = await (pocPurchaseOrderService as any).deleteDraft('order-123');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getById - errors', () => {
    it('should handle order not found', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: { message: 'No rows returned' } });
      const result = await pocPurchaseOrderService.getById('non-existent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('introuvable');
    });
  });

  describe('getByCompany - errors', () => {
    it('should handle invalid company ID', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: { message: 'Invalid company ID' } });
      const result = await (pocPurchaseOrderService as any).getByCompany('invalid-company');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('database and network errors', () => {
    it('should handle database connection error', async () => {
      mockQuery.single.mockRejectedValue(new Error('Connection refused'));
      const result = await pocPurchaseOrderService.getById('order-123');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network timeout error', async () => {
      mockQuery.single.mockRejectedValue(new Error('Network timeout'));
      const result = await pocPurchaseOrderService.createDraft('project-123', mockItems);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

