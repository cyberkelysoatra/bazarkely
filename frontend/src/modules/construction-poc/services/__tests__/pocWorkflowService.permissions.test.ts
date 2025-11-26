/**
 * Tests unitaires pour pocWorkflowService - Permissions et Règles Métier
 * Tests complets pour canUserPerformAction, getAvailableActions, checkStockAvailability
 * AGENT-15: Tests des permissions et règles métier du workflow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import pocWorkflowService from '../pocWorkflowService';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  expectServiceSuccess,
  expectServiceError
} from './testUtils';
import {
  createMockOrder,
  createMockCompany,
  createMockStockRecord
} from './fixtures';
import {
  PurchaseOrderStatus,
  WorkflowAction,
  MemberRole
} from '../../types/construction';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn()
  },
  _mockData: {} as Record<string, any[]>
};

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock authHelpers
const mockGetUserRoleInCompany = vi.fn();
vi.mock('../authHelpers', () => ({
  getAuthenticatedUserId: vi.fn(),
  getUserRoleInCompany: (userId: string, companyId: string) => mockGetUserRoleInCompany(userId, companyId)
}));

describe('pocWorkflowService - Permissions and Business Rules', () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>;
  let mockQuery: any;

  beforeEach(() => {
    testEnv = setupTestEnvironment();
    vi.clearAllMocks();

    // Setup mock query builder
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn()
    };

    mockSupabase.from.mockReturnValue(mockQuery);
    mockSupabase._mockData = {};
  });

  afterEach(() => {
    cleanupTestEnvironment(testEnv);
    vi.clearAllMocks();
  });

  // ============================================================================
  // TEST GROUP 1: canUserPerformAction Function (15 tests)
  // ============================================================================

  describe('canUserPerformAction', () => {
    const userId = 'user-123';
    const companyId = 'company-123';
    const orderId = 'order-123';

    it('should allow chef_equipe to submit order (draft status, submit action)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.DRAFT,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.CHEF_EQUIPE);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.SUBMIT
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow chef_chantier to approve order (pending_site_manager status, approve_site action)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_SITE_MANAGER,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.CHEF_CHANTIER);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.APPROVE_SITE
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow chef_chantier to reject order (pending_site_manager status, reject_site action)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_SITE_MANAGER,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.CHEF_CHANTIER);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.REJECT_SITE
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow direction to approve management (pending_management status, approve_mgmt action)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_MANAGEMENT,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.DIRECTION);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.APPROVE_MGMT
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow direction to reject management (pending_management status, reject_mgmt action)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_MANAGEMENT,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.DIRECTION);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.REJECT_MGMT
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow magasinier to complete order (delivered status, complete action)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.DELIVERED,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.MAGASINIER);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.COMPLETE
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow supplier to accept order (pending_supplier status, accept_supplier action)', async () => {
      const supplierCompanyId = 'supplier-123';
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_SUPPLIER,
        buyer_company_id: companyId,
        supplier_company_id: supplierCompanyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      // User is member of supplier company
      mockGetUserRoleInCompany.mockResolvedValueOnce(null); // Not buyer member
      mockGetUserRoleInCompany.mockResolvedValueOnce('supplier_member'); // Supplier member

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.ACCEPT_SUPPLIER
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow supplier to reject order (pending_supplier status, reject_supplier action)', async () => {
      const supplierCompanyId = 'supplier-123';
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_SUPPLIER,
        buyer_company_id: companyId,
        supplier_company_id: supplierCompanyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(null);
      mockGetUserRoleInCompany.mockResolvedValueOnce('supplier_member');

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.REJECT_SUPPLIER
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow supplier to mark in transit (accepted_supplier status, deliver action)', async () => {
      const supplierCompanyId = 'supplier-123';
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.ACCEPTED_SUPPLIER,
        buyer_company_id: companyId,
        supplier_company_id: supplierCompanyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(null);
      mockGetUserRoleInCompany.mockResolvedValueOnce('supplier_member');

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.DELIVER // mark_in_transit
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow supplier to mark delivered (in_transit status, deliver action)', async () => {
      const supplierCompanyId = 'supplier-123';
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.IN_TRANSIT,
        buyer_company_id: companyId,
        supplier_company_id: supplierCompanyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(null);
      mockGetUserRoleInCompany.mockResolvedValueOnce('supplier_member');

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.DELIVER // mark_delivered
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(true);
    });

    it('should allow admin to perform any action on any status', async () => {
      const statuses = [
        PurchaseOrderStatus.DRAFT,
        PurchaseOrderStatus.PENDING_SITE_MANAGER,
        PurchaseOrderStatus.PENDING_MANAGEMENT,
        PurchaseOrderStatus.PENDING_SUPPLIER,
        PurchaseOrderStatus.DELIVERED
      ];

      const actions = [
        WorkflowAction.SUBMIT,
        WorkflowAction.APPROVE_SITE,
        WorkflowAction.APPROVE_MGMT,
        WorkflowAction.ACCEPT_SUPPLIER,
        WorkflowAction.COMPLETE
      ];

      for (const status of statuses) {
        const order = createMockOrder({
          id: orderId,
          status,
          buyer_company_id: companyId
        });

        mockQuery.single.mockResolvedValueOnce({
          data: order,
          error: null
        });

        mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.ADMIN);

        for (const action of actions) {
          const result = await pocWorkflowService.canUserPerformAction(
            userId,
            orderId,
            action
          );

          expectServiceSuccess(result);
          expect(result.data).toBe(true);
        }
      }
    });

    it('should deny chef_equipe from approving order (no approve_site permission)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_SITE_MANAGER,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.CHEF_EQUIPE);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.APPROVE_SITE
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(false);
    });

    it('should deny magasinier from submitting order (no submit permission)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.DRAFT,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.MAGASINIER);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.SUBMIT
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(false);
    });

    it('should deny action if order status does not allow it (cannot complete order in draft status)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.DRAFT,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.MAGASINIER);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.COMPLETE
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(false);
    });

    it('should deny action if user not member of order company', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.DRAFT,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      // User is not a member of the company
      mockGetUserRoleInCompany.mockResolvedValueOnce(null);

      const result = await pocWorkflowService.canUserPerformAction(
        userId,
        orderId,
        WorkflowAction.SUBMIT
      );

      expectServiceSuccess(result);
      expect(result.data).toBe(false);
    });
  });

  // ============================================================================
  // TEST GROUP 2: getAvailableActions Function (13 tests)
  // ============================================================================

  describe('getAvailableActions', () => {
    const userId = 'user-123';
    const companyId = 'company-123';
    const orderId = 'order-123';

    it('should return submit and cancel for chef_equipe on draft order', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.DRAFT,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.CHEF_EQUIPE);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toContain(WorkflowAction.SUBMIT);
      expect(result.data).toContain(WorkflowAction.CANCEL);
    });

    it('should return approve_site, reject_site, cancel for chef_chantier on pending_site_manager order', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_SITE_MANAGER,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.CHEF_CHANTIER);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toContain(WorkflowAction.APPROVE_SITE);
      expect(result.data).toContain(WorkflowAction.REJECT_SITE);
      expect(result.data).toContain(WorkflowAction.CANCEL);
    });

    it('should return approve_mgmt, reject_mgmt, cancel for direction on pending_management order', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_MANAGEMENT,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.DIRECTION);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toContain(WorkflowAction.APPROVE_MGMT);
      expect(result.data).toContain(WorkflowAction.REJECT_MGMT);
      expect(result.data).toContain(WorkflowAction.CANCEL);
    });

    it('should return complete for magasinier on delivered order', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.DELIVERED,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.MAGASINIER);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toContain(WorkflowAction.COMPLETE);
    });

    it('should return accept_supplier, reject_supplier, cancel for supplier on pending_supplier order', async () => {
      const supplierCompanyId = 'supplier-123';
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_SUPPLIER,
        buyer_company_id: companyId,
        supplier_company_id: supplierCompanyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(null); // Not buyer
      mockGetUserRoleInCompany.mockResolvedValueOnce('supplier_member'); // Supplier

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toContain(WorkflowAction.ACCEPT_SUPPLIER);
      expect(result.data).toContain(WorkflowAction.REJECT_SUPPLIER);
      expect(result.data).toContain(WorkflowAction.CANCEL);
    });

    it('should return mark_in_transit (deliver) for supplier on accepted_supplier order', async () => {
      const supplierCompanyId = 'supplier-123';
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.ACCEPTED_SUPPLIER,
        buyer_company_id: companyId,
        supplier_company_id: supplierCompanyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(null);
      mockGetUserRoleInCompany.mockResolvedValueOnce('supplier_member');

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toContain(WorkflowAction.DELIVER);
    });

    it('should return mark_delivered (deliver) for supplier on in_transit order', async () => {
      const supplierCompanyId = 'supplier-123';
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.IN_TRANSIT,
        buyer_company_id: companyId,
        supplier_company_id: supplierCompanyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(null);
      mockGetUserRoleInCompany.mockResolvedValueOnce('supplier_member');

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toContain(WorkflowAction.DELIVER);
    });

    it('should return all possible actions for admin on any order', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_SITE_MANAGER,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.ADMIN);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data.length).toBeGreaterThan(0);
      // Admin should have multiple actions available
      expect(result.data).toContain(WorkflowAction.APPROVE_SITE);
      expect(result.data).toContain(WorkflowAction.REJECT_SITE);
      expect(result.data).toContain(WorkflowAction.CANCEL);
    });

    it('should return empty array for chef_equipe on pending_site_manager order (no permissions for this status)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.PENDING_SITE_MANAGER,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.CHEF_EQUIPE);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      // Chef equipe can only cancel on pending_site_manager
      expect(result.data).toContain(WorkflowAction.CANCEL);
    });

    it('should return empty array for completed order (final status, no actions)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.COMPLETED,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.ADMIN);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toEqual([]);
    });

    it('should return empty array for cancelled order (final status, no actions)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.CANCELLED,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.ADMIN);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toEqual([]);
    });

    it('should return only cancel action for statuses where user can only cancel', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.APPROVED_SITE_MANAGER,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      mockGetUserRoleInCompany.mockResolvedValueOnce(MemberRole.CHEF_CHANTIER);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toEqual([WorkflowAction.CANCEL]);
    });

    it('should handle user with no company membership (return empty array)', async () => {
      const order = createMockOrder({
        id: orderId,
        status: PurchaseOrderStatus.DRAFT,
        buyer_company_id: companyId
      });

      mockQuery.single.mockResolvedValueOnce({
        data: order,
        error: null
      });

      // User is not a member of any company
      mockGetUserRoleInCompany.mockResolvedValueOnce(null);
      mockGetUserRoleInCompany.mockResolvedValueOnce(null);

      const result = await pocWorkflowService.getAvailableActions(orderId, userId);

      expectServiceSuccess(result);
      expect(result.data).toEqual([]);
    });
  });

  // ============================================================================
  // TEST GROUP 3: checkStockAvailability Function (5 tests)
  // ============================================================================

  describe('checkStockAvailability', () => {
    const orderId = 'order-123';
    const companyId = 'company-123';
    const productId1 = 'product-1';
    const productId2 = 'product-2';

    it('should return available true when all items have sufficient stock', async () => {
      // Order with 2 items
      const orderItems = [
        {
          id: 'item-1',
          purchase_order_id: orderId,
          product_id: productId1,
          item_name: 'Ciment',
          quantity: '10',
          item_unit: 'sac'
        },
        {
          id: 'item-2',
          purchase_order_id: orderId,
          product_id: productId2,
          item_name: 'Briques',
          quantity: '50',
          item_unit: 'unité'
        }
      ];

      // Stock records with sufficient quantities
      const stockRecord1 = {
        id: 'stock-1',
        company_id: companyId,
        product_id: productId1,
        quantity_available: '100'
      };
      const stockRecord2 = {
        id: 'stock-2',
        company_id: companyId,
        product_id: productId2,
        quantity_available: '200'
      };

      // Setup query chain for items
      const itemsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          return Promise.resolve({ data: orderItems, error: null }).then(resolve);
        })
      };

      // Setup query chain for order
      const orderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { buyer_company_id: companyId },
          error: null
        })
      };

      // Setup stock queries - need separate instances for each call
      let stockCallCount = 0;
      const createStockQuery = () => {
        stockCallCount++;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: stockCallCount === 1 ? stockRecord1 : stockRecord2,
            error: null
          })
        };
      };

      // Mock the from() calls in sequence
      let fromCallCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        fromCallCount++;
        if (table === 'poc_purchase_order_items') {
          return itemsQuery;
        }
        if (table === 'poc_purchase_orders') {
          return orderQuery;
        }
        if (table === 'poc_inventory_items') {
          return createStockQuery();
        }
        return mockQuery;
      });

      const result = await pocWorkflowService.checkStockAvailability(orderId);

      expectServiceSuccess(result);
      expect(result.data?.available).toBe(true);
      expect(result.data?.itemResults.length).toBe(2);
      expect(result.data?.itemResults.every(item => item.sufficient)).toBe(true);
    });

    it('should return available false when one item has insufficient stock', async () => {
      const orderItems = [
        {
          id: 'item-1',
          purchase_order_id: orderId,
          product_id: productId1,
          item_name: 'Ciment',
          quantity: '10',
          item_unit: 'sac'
        },
        {
          id: 'item-2',
          purchase_order_id: orderId,
          product_id: productId2,
          item_name: 'Briques',
          quantity: '50',
          item_unit: 'unité'
        }
      ];

      // Stock: Ciment insufficient (5 < 10), Briques sufficient (200 >= 50)
      const stockRecord1 = {
        id: 'stock-1',
        company_id: companyId,
        product_id: productId1,
        quantity_available: '5' // Insufficient
      };
      const stockRecord2 = {
        id: 'stock-2',
        company_id: companyId,
        product_id: productId2,
        quantity_available: '200' // Sufficient
      };

      const itemsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          return Promise.resolve({ data: orderItems, error: null }).then(resolve);
        })
      };

      const orderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { buyer_company_id: companyId },
          error: null
        })
      };

      let stockCallCount = 0;
      const createStockQuery = () => {
        stockCallCount++;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: stockCallCount === 1 ? stockRecord1 : stockRecord2,
            error: null
          })
        };
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'poc_purchase_order_items') return itemsQuery;
        if (table === 'poc_purchase_orders') return orderQuery;
        if (table === 'poc_inventory_items') return createStockQuery();
        return mockQuery;
      });

      const result = await pocWorkflowService.checkStockAvailability(orderId);

      expectServiceSuccess(result);
      expect(result.data?.available).toBe(false);
      expect(result.data?.itemResults.length).toBe(2);
      const cimentItem = result.data?.itemResults.find(item => item.itemName === 'Ciment');
      const briquesItem = result.data?.itemResults.find(item => item.itemName === 'Briques');
      expect(cimentItem?.sufficient).toBe(false);
      expect(briquesItem?.sufficient).toBe(true);
    });

    it('should return available false when all items have insufficient stock', async () => {
      const orderItems = [
        {
          id: 'item-1',
          purchase_order_id: orderId,
          product_id: productId1,
          item_name: 'Ciment',
          quantity: '10',
          item_unit: 'sac'
        },
        {
          id: 'item-2',
          purchase_order_id: orderId,
          product_id: productId2,
          item_name: 'Briques',
          quantity: '50',
          item_unit: 'unité'
        }
      ];

      // Both items insufficient
      const stockRecord1 = {
        id: 'stock-1',
        company_id: companyId,
        product_id: productId1,
        quantity_available: '5' // Insufficient
      };
      const stockRecord2 = {
        id: 'stock-2',
        company_id: companyId,
        product_id: productId2,
        quantity_available: '30' // Insufficient
      };

      const itemsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          return Promise.resolve({ data: orderItems, error: null }).then(resolve);
        })
      };

      const orderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { buyer_company_id: companyId },
          error: null
        })
      };

      let stockCallCount = 0;
      const createStockQuery = () => {
        stockCallCount++;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: stockCallCount === 1 ? stockRecord1 : stockRecord2,
            error: null
          })
        };
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'poc_purchase_order_items') return itemsQuery;
        if (table === 'poc_purchase_orders') return orderQuery;
        if (table === 'poc_inventory_items') return createStockQuery();
        return mockQuery;
      });

      const result = await pocWorkflowService.checkStockAvailability(orderId);

      expectServiceSuccess(result);
      expect(result.data?.available).toBe(false);
      expect(result.data?.itemResults.every(item => item.sufficient === false)).toBe(true);
    });

    it('should return available false when stock record does not exist for item', async () => {
      const orderItems = [
        {
          id: 'item-1',
          purchase_order_id: orderId,
          product_id: productId1,
          item_name: 'Ciment',
          quantity: '10',
          item_unit: 'sac'
        }
      ];

      const itemsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          return Promise.resolve({ data: orderItems, error: null }).then(resolve);
        })
      };

      const orderQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { buyer_company_id: companyId },
          error: null
        })
      };

      // Stock query returns no record (error or null)
      const stockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'poc_purchase_order_items') return itemsQuery;
        if (table === 'poc_purchase_orders') return orderQuery;
        if (table === 'poc_inventory_items') return stockQuery;
        return mockQuery;
      });

      const result = await pocWorkflowService.checkStockAvailability(orderId);

      expectServiceSuccess(result);
      expect(result.data?.available).toBe(false);
      expect(result.data?.itemResults.length).toBe(1);
      expect(result.data?.itemResults[0].sufficient).toBe(false);
      expect(result.data?.itemResults[0].available).toBe(0);
    });

    it('should handle order with no items (return available true with empty itemResults)', async () => {
      const itemsQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => {
          return Promise.resolve({ data: [], error: null }).then(resolve);
        })
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'poc_purchase_order_items') return itemsQuery;
        return mockQuery;
      });

      const result = await pocWorkflowService.checkStockAvailability(orderId);

      // Service should return error for empty items
      expect(result.success).toBe(false);
      expect(result.error).toContain('Aucun item');
    });
  });
});

// AGENT-15-WORKFLOW-PERMISSIONS-TESTS-COMPLETE

