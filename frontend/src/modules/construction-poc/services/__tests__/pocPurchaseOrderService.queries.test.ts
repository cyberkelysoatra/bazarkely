/**
 * Tests unitaires pour les requêtes de pocPurchaseOrderService
 * Tests de filtres uniquement - ~60 lignes, 5 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import pocPurchaseOrderService from '../pocPurchaseOrderService';
import type { PurchaseOrderStatus } from '../../types/construction';

const mockSupabase = { from: vi.fn(), auth: { getUser: vi.fn() } };
vi.mock('../../../lib/supabase', () => ({ supabase: mockSupabase }));

const mockGetAuthenticatedUserId = vi.fn();
vi.mock('../authHelpers', () => ({
  getAuthenticatedUserId: () => mockGetAuthenticatedUserId()
}));

describe('POCPurchaseOrderService - Queries', () => {
  let mockQuery: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthenticatedUserId.mockResolvedValue('user-123');
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    };
    mockSupabase.from.mockReturnValue(mockQuery);
  });

  describe('getByCompany', () => {
    it('should retrieve orders by buyer company', async () => {
      const mockOrders = [
        { id: 'order-1', buyer_company_id: 'company-123', status: 'draft' },
        { id: 'order-2', buyer_company_id: 'company-123', status: 'pending_site_manager' }
      ];
      mockQuery.order.mockResolvedValue({ data: mockOrders, error: null });
      const result = await (pocPurchaseOrderService as any).getByCompany('company-123', 'buyer');
      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('buyer_company_id', 'company-123');
    });

    it('should retrieve orders by supplier company', async () => {
      const mockOrders = [{ id: 'order-1', supplier_company_id: 'supplier-123', status: 'pending_supplier' }];
      mockQuery.order.mockResolvedValue({ data: mockOrders, error: null });
      const result = await (pocPurchaseOrderService as any).getByCompany('supplier-123', 'supplier');
      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('supplier_company_id', 'supplier-123');
    });

    it('should apply status filter', async () => {
      mockQuery.order.mockResolvedValue({ data: [], error: null });
      await (pocPurchaseOrderService as any).getByCompany('company-123', 'buyer', { status: 'draft' as PurchaseOrderStatus });
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'draft');
    });

    it('should handle pagination', async () => {
      mockQuery.range.mockResolvedValue({ data: [], error: null, count: 10 });
      const result = await (pocPurchaseOrderService as any).getByCompany('company-123', 'buyer', undefined, { limit: 10, offset: 0 });
      expect(result.success).toBe(true);
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
    });
  });

  describe('getByProject', () => {
    it('should retrieve orders by project with basic filtering', async () => {
      const mockOrders = [{ id: 'order-1', project_id: 'project-123', status: 'draft' }];
      mockQuery.order.mockResolvedValue({ data: mockOrders, error: null });
      const result = await (pocPurchaseOrderService as any).getByProject('project-123');
      expect(result.success).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'project-123');
    });
  });
});

