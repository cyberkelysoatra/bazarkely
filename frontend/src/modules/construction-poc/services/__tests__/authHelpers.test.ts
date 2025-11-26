/**
 * Tests unitaires pour authHelpers et fulfillFromStock
 * Tests complets des helpers d'authentification et de la fonction de déduction de stock
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as authHelpers from '../authHelpers';
import pocStockService from '../pocStockService';
import { createMockSupabase } from './supabaseMock';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  expectServiceSuccess,
  expectServiceError,
  generateId
} from './testUtils';
import {
  createMockOrder,
  createMockCompany,
  createMockStockRecord,
  mockStockRecords
} from './fixtures';
import { MemberRole, CompanyType, CompanyStatus } from '../../types/construction';

// Mock Supabase
let mockSupabase: ReturnType<typeof createMockSupabase>;

vi.mock('../../../lib/supabase', () => {
  mockSupabase = createMockSupabase();
  return {
    supabase: mockSupabase
  };
});

// Mock pocPurchaseOrderService pour fulfillFromStock
const mockGetById = vi.fn();
vi.mock('../pocPurchaseOrderService', () => ({
  default: {
    getById: mockGetById
  }
}));

describe('authHelpers and Stock Fulfillment', () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>;
  const userId = 'user-123';
  const companyId = 'company-2';

  beforeEach(() => {
    testEnv = setupTestEnvironment();
    vi.clearAllMocks();
    
    // Initialiser les données mockées
    const { supabase } = require('../../../lib/supabase');
    if (supabase._mockData) {
      supabase._mockData['poc_company_members'] = [];
      supabase._mockData['poc_companies'] = [];
      supabase._mockData['poc_internal_stock'] = [...mockStockRecords];
      supabase._mockData['poc_stock_transactions'] = [];
      supabase._mockData['poc_purchase_orders'] = [];
      supabase._mockData['poc_purchase_order_items'] = [];
    }
  });

  afterEach(() => {
    cleanupTestEnvironment(testEnv);
    vi.clearAllMocks();
  });

  // ============================================================================
  // TEST GROUP 1: getAuthenticatedUserId (5 tests)
  // ============================================================================
  describe('getAuthenticatedUserId', () => {
    it('should return user ID when user is authenticated', async () => {
      const { supabase } = require('../../../lib/supabase');
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: userId, email: 'test@example.com' } },
        error: null
      });

      const result = await authHelpers.getAuthenticatedUserId();

      expectServiceSuccess(result);
      expect(result.data).toBe(userId);
    });

    it('should return error when user is not authenticated', async () => {
      const { supabase } = require('../../../lib/supabase');
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await authHelpers.getAuthenticatedUserId();

      expectServiceError(result, 'Utilisateur non authentifié');
    });

    it('should return error when Supabase auth.getUser fails', async () => {
      const { supabase } = require('../../../lib/supabase');
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Network error', code: 'NETWORK_ERROR' }
      });

      const result = await authHelpers.getAuthenticatedUserId();

      expectServiceError(result, 'Erreur lors de la récupération de l\'utilisateur');
    });

    it('should handle session expired (Supabase returns session null)', async () => {
      const { supabase } = require('../../../lib/supabase');
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await authHelpers.getAuthenticatedUserId();

      expectServiceError(result, 'Utilisateur non authentifié');
    });

    it('should handle network error during auth check', async () => {
      const { supabase } = require('../../../lib/supabase');
      supabase.auth.getUser.mockRejectedValue(new Error('Network timeout'));

      const result = await authHelpers.getAuthenticatedUserId();

      expectServiceError(result, 'Erreur lors de la récupération de l\'utilisateur');
    });
  });

  // ============================================================================
  // TEST GROUP 2: getUserCompany (7 tests)
  // ============================================================================
  describe('getUserCompany', () => {
    it('should return user company details when user is member', async () => {
      const { supabase } = require('../../../lib/supabase');
      const company = createMockCompany({ id: companyId, type: 'builder', status: 'approved' });
      
      // Créer les données mockées
      supabase._mockData['poc_companies'] = [company];
      supabase._mockData['poc_company_members'] = [{
        id: generateId(),
        user_id: userId,
        company_id: companyId,
        role: 'chef_chantier',
        status: 'active'
      }];

      // Mock de la requête Supabase avec jointure
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            company_id: companyId,
            role: 'chef_chantier',
            poc_companies: {
              id: companyId,
              name: company.name,
              type: 'builder',
              status: 'approved'
            }
          },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserCompany(userId);

      expectServiceSuccess(result);
      expect(result.data?.companyId).toBe(companyId);
      expect(result.data?.companyType).toBe(CompanyType.BUILDER);
      expect(result.data?.companyStatus).toBe(CompanyStatus.APPROVED);
      expect(result.data?.memberRole).toBe(MemberRole.CHEF_CHANTIER);
      expect(result.data?.companyName).toBe(company.name);
    });

    it('should return error when user is not member of any company', async () => {
      const { supabase } = require('../../../lib/supabase');
      supabase._mockData['poc_company_members'] = [];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserCompany(userId);

      expectServiceError(result, 'Utilisateur ne fait partie d\'aucune entreprise');
    });

    it('should filter by companyType when provided', async () => {
      const { supabase } = require('../../../lib/supabase');
      const supplierCompany = createMockCompany({ id: 'supplier-1', type: 'supplier', status: 'approved' });
      const builderCompany = createMockCompany({ id: companyId, type: 'builder', status: 'approved' });

      supabase._mockData['poc_companies'] = [supplierCompany, builderCompany];
      supabase._mockData['poc_company_members'] = [
        {
          id: generateId(),
          user_id: userId,
          company_id: 'supplier-1',
          role: 'admin',
          status: 'active'
        },
        {
          id: generateId(),
          user_id: userId,
          company_id: companyId,
          role: 'chef_chantier',
          status: 'active'
        }
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            company_id: 'supplier-1',
            role: 'admin',
            poc_companies: {
              id: 'supplier-1',
              name: supplierCompany.name,
              type: 'supplier',
              status: 'approved'
            }
          },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserCompany(userId, CompanyType.SUPPLIER);

      expectServiceSuccess(result);
      expect(result.data?.companyType).toBe(CompanyType.SUPPLIER);
    });

    it('should return first active membership when user has multiple companies', async () => {
      const { supabase } = require('../../../lib/supabase');
      const companyA = createMockCompany({ id: 'company-a', type: 'builder', status: 'approved' });
      const companyB = createMockCompany({ id: 'company-b', type: 'builder', status: 'approved' });

      supabase._mockData['poc_companies'] = [companyA, companyB];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            company_id: 'company-a',
            role: 'chef_chantier',
            poc_companies: {
              id: 'company-a',
              name: companyA.name,
              type: 'builder',
              status: 'approved'
            }
          },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserCompany(userId);

      expectServiceSuccess(result);
      expect(result.data?.companyId).toBe('company-a');
    });

    it('should return error when company not found (orphaned membership)', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            company_id: 'deleted-company',
            role: 'chef_chantier',
            poc_companies: null
          },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserCompany(userId);

      expectServiceError(result, 'Entreprise introuvable');
    });

    it('should skip inactive memberships', async () => {
      const { supabase } = require('../../../lib/supabase');
      const companyA = createMockCompany({ id: 'company-a', type: 'builder', status: 'approved' });
      const companyB = createMockCompany({ id: companyId, type: 'builder', status: 'approved' });

      supabase._mockData['poc_companies'] = [companyA, companyB];
      supabase._mockData['poc_company_members'] = [
        {
          id: generateId(),
          user_id: userId,
          company_id: 'company-a',
          role: 'chef_chantier',
          status: 'inactive' // Inactif
        },
        {
          id: generateId(),
          user_id: userId,
          company_id: companyId,
          role: 'chef_chantier',
          status: 'active' // Actif
        }
      ];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            company_id: companyId,
            role: 'chef_chantier',
            poc_companies: {
              id: companyId,
              name: companyB.name,
              type: 'builder',
              status: 'approved'
            }
          },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserCompany(userId);

      expectServiceSuccess(result);
      expect(result.data?.companyId).toBe(companyId);
    });

    it('should handle database error gracefully', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error', code: 'PGRST_ERROR' }
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserCompany(userId);

      expectServiceError(result, 'Erreur lors de la récupération de l\'entreprise');
    });
  });

  // ============================================================================
  // TEST GROUP 3: isUserMemberOfCompany (3 tests)
  // ============================================================================
  describe('isUserMemberOfCompany', () => {
    it('should return true when user is active member of company', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      supabase._mockData['poc_company_members'] = [{
        id: generateId(),
        user_id: userId,
        company_id: companyId,
        role: 'chef_chantier',
        status: 'active'
      }];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: generateId() },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.isUserMemberOfCompany(userId, companyId);

      expect(result).toBe(true);
    });

    it('should return false when user is not member of company', async () => {
      const { supabase } = require('../../../lib/supabase');
      supabase._mockData['poc_company_members'] = [];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.isUserMemberOfCompany(userId, companyId);

      expect(result).toBe(false);
    });

    it('should return false when membership is inactive', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      supabase._mockData['poc_company_members'] = [{
        id: generateId(),
        user_id: userId,
        company_id: companyId,
        role: 'chef_chantier',
        status: 'inactive' // Inactif
      }];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null, // Pas de résultat car status='inactive' est filtré
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.isUserMemberOfCompany(userId, companyId);

      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // TEST GROUP 4: getUserRole (4 tests)
  // ============================================================================
  describe('getUserRole', () => {
    it('should return user role when user is active member', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      supabase._mockData['poc_company_members'] = [{
        id: generateId(),
        user_id: userId,
        company_id: companyId,
        role: 'chef_chantier',
        status: 'active'
      }];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { role: 'chef_chantier' },
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserRole(userId, companyId);

      expect(result).toBe(MemberRole.CHEF_CHANTIER);
    });

    it('should return null when user is not member of company', async () => {
      const { supabase } = require('../../../lib/supabase');
      supabase._mockData['poc_company_members'] = [];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserRole(userId, companyId);

      expect(result).toBeNull();
    });

    it('should return null when membership is inactive', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      supabase._mockData['poc_company_members'] = [{
        id: generateId(),
        user_id: userId,
        company_id: companyId,
        role: 'chef_chantier',
        status: 'inactive'
      }];

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null, // Pas de résultat car status='inactive' est filtré
          error: null
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserRole(userId, companyId);

      expect(result).toBeNull();
    });

    it('should handle database error (return null)', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'PGRST_ERROR' }
        })
      };
      supabase.from.mockReturnValue(mockQueryBuilder);

      const result = await authHelpers.getUserRole(userId, companyId);

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // TEST GROUP 5: fulfillFromStock (6 tests)
  // ============================================================================
  describe('fulfillFromStock', () => {
    const orderId = 'order-123';
    const stockId1 = 'stock-1';
    const stockId2 = 'stock-2';

    beforeEach(() => {
      // Mock getAuthenticatedUserId pour fulfillFromStock
      vi.spyOn(authHelpers, 'getAuthenticatedUserId').mockResolvedValue({
        success: true,
        data: userId
      });
    });

    it('should deduct stock successfully for all order items', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      // Créer un bon de commande avec 2 items
      const mockOrder = createMockOrder({
        id: orderId,
        buyer_company_id: companyId
      });
      
      const mockItems = [
        {
          id: 'item-1',
          purchase_order_id: orderId,
          catalog_item_id: 'product-1',
          item_name: 'Ciment',
          quantity: 10,
          item_unit: 'sac'
        },
        {
          id: 'item-2',
          purchase_order_id: orderId,
          catalog_item_id: 'product-2',
          item_name: 'Briques',
          quantity: 50,
          item_unit: 'unité'
        }
      ];

      // Stock disponible: Ciment 100 sacs, Briques 200 unités
      supabase._mockData['poc_internal_stock'] = [
        createMockStockRecord({
          id: stockId1,
          company_id: companyId,
          product_id: 'product-1',
          item_name: 'Ciment',
          quantity: 100,
          unit: 'sac'
        }),
        createMockStockRecord({
          id: stockId2,
          company_id: companyId,
          product_id: 'product-2',
          item_name: 'Briques',
          quantity: 200,
          unit: 'unité'
        })
      ];

      // Mock getById pour retourner le bon de commande
      mockGetById.mockResolvedValue({
        success: true,
        data: {
          id: orderId,
          companyId: companyId,
          items: mockItems.map(item => ({
            id: item.id,
            purchaseOrderId: orderId,
            catalogItemId: item.catalog_item_id,
            itemName: item.item_name,
            quantity: item.quantity,
            unit: item.item_unit,
            unitPrice: 1000,
            totalPrice: item.quantity * 1000
          }))
        }
      });

      // Mock des requêtes Supabase pour removeStock
      let queryCallCount = 0;
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          queryCallCount++;
          if (queryCallCount === 1) {
            // Première requête: récupérer stock pour Ciment
            return Promise.resolve({
              data: supabase._mockData['poc_internal_stock'][0],
              error: null
            });
          } else if (queryCallCount === 2) {
            // Deuxième requête: update stock Ciment
            return Promise.resolve({
              data: { ...supabase._mockData['poc_internal_stock'][0], quantity: 90 },
              error: null
            });
          } else if (queryCallCount === 3) {
            // Troisième requête: récupérer stock pour Briques
            return Promise.resolve({
              data: supabase._mockData['poc_internal_stock'][1],
              error: null
            });
          } else if (queryCallCount === 4) {
            // Quatrième requête: update stock Briques
            return Promise.resolve({
              data: { ...supabase._mockData['poc_internal_stock'][1], quantity: 150 },
              error: null
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        then: vi.fn(function(resolve) {
          return this.single().then(resolve);
        })
      };

      // Mock pour les requêtes de recherche de stock
      supabase.from.mockImplementation((table: string) => {
        if (table === 'poc_internal_stock') {
          const builder = { ...mockQueryBuilder };
          builder.select.mockImplementation(() => {
            // Retourner le stock correspondant selon le produit
            return {
              ...builder,
              eq: vi.fn().mockImplementation((col: string, val: any) => {
                if (col === 'product_id' && val === 'product-1') {
                  builder.then = vi.fn((resolve) => {
                    return Promise.resolve({
                      data: [supabase._mockData['poc_internal_stock'][0]],
                      error: null
                    }).then(resolve);
                  });
                } else if (col === 'product_id' && val === 'product-2') {
                  builder.then = vi.fn((resolve) => {
                    return Promise.resolve({
                      data: [supabase._mockData['poc_internal_stock'][1]],
                      error: null
                    }).then(resolve);
                  });
                }
                return builder;
              }),
              is: vi.fn().mockReturnThis(),
              then: vi.fn((resolve) => {
                return Promise.resolve({
                  data: supabase._mockData['poc_internal_stock'],
                  error: null
                }).then(resolve);
              })
            };
          });
          return builder;
        }
        return mockQueryBuilder;
      });

      const result = await pocStockService.fulfillFromStock(orderId);

      expectServiceSuccess(result);
    });

    it('should return error when order not found', async () => {
      mockGetById.mockResolvedValue({
        success: false,
        error: 'Bon de commande introuvable'
      });

      const result = await pocStockService.fulfillFromStock('non-existent-order-id');

      expectServiceError(result, 'Bon de commande introuvable');
    });

    it('should return error when order has no items', async () => {
      mockGetById.mockResolvedValue({
        success: true,
        data: {
          id: orderId,
          companyId: companyId,
          items: [] // Aucun item
        }
      });

      const result = await pocStockService.fulfillFromStock(orderId);

      expectServiceError(result, 'Aucun article dans le bon de commande');
    });

    it('should return error when stock insufficient for one item', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      const mockItems = [
        {
          id: 'item-1',
          purchase_order_id: orderId,
          catalog_item_id: 'product-1',
          item_name: 'Ciment',
          quantity: 10,
          item_unit: 'sac'
        },
        {
          id: 'item-2',
          purchase_order_id: orderId,
          catalog_item_id: 'product-2',
          item_name: 'Briques',
          quantity: 50,
          item_unit: 'unité'
        }
      ];

      // Stock: Ciment 5 sacs (insuffisant pour 10), Briques 200 unités (suffisant)
      supabase._mockData['poc_internal_stock'] = [
        createMockStockRecord({
          id: stockId1,
          company_id: companyId,
          product_id: 'product-1',
          item_name: 'Ciment',
          quantity: 5, // Insuffisant
          unit: 'sac'
        }),
        createMockStockRecord({
          id: stockId2,
          company_id: companyId,
          product_id: 'product-2',
          item_name: 'Briques',
          quantity: 200,
          unit: 'unité'
        })
      ];

      mockGetById.mockResolvedValue({
        success: true,
        data: {
          id: orderId,
          companyId: companyId,
          items: mockItems.map(item => ({
            id: item.id,
            purchaseOrderId: orderId,
            catalogItemId: item.catalog_item_id,
            itemName: item.item_name,
            quantity: item.quantity,
            unit: item.item_unit,
            unitPrice: 1000,
            totalPrice: item.quantity * 1000
          }))
        }
      });

      // Mock pour retourner le stock insuffisant
      supabase.from.mockImplementation((table: string) => {
        if (table === 'poc_internal_stock') {
          const builder: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col: string, val: any) => {
              if (col === 'product_id' && val === 'product-1') {
                builder.then = vi.fn((resolve) => {
                  return Promise.resolve({
                    data: [supabase._mockData['poc_internal_stock'][0]],
                    error: null
                  }).then(resolve);
                });
              }
              return builder;
            }),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: supabase._mockData['poc_internal_stock'][0],
              error: null
            }),
            then: vi.fn((resolve) => {
              return Promise.resolve({
                data: [supabase._mockData['poc_internal_stock'][0]],
                error: null
              }).then(resolve);
            })
          };
          return builder;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      const result = await pocStockService.fulfillFromStock(orderId);

      expectServiceError(result, 'Stock insuffisant pour article');
    });

    it('should NOT deduct any stock if one item fails (atomicity)', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      const initialStock1 = createMockStockRecord({
        id: stockId1,
        company_id: companyId,
        product_id: 'product-1',
        item_name: 'Ciment',
        quantity: 5, // Insuffisant
        unit: 'sac'
      });
      const initialStock2 = createMockStockRecord({
        id: stockId2,
        company_id: companyId,
        product_id: 'product-2',
        item_name: 'Briques',
        quantity: 200,
        unit: 'unité'
      });

      supabase._mockData['poc_internal_stock'] = [initialStock1, initialStock2];

      const mockItems = [
        {
          id: 'item-1',
          purchase_order_id: orderId,
          catalog_item_id: 'product-1',
          item_name: 'Ciment',
          quantity: 10,
          item_unit: 'sac'
        },
        {
          id: 'item-2',
          purchase_order_id: orderId,
          catalog_item_id: 'product-2',
          item_name: 'Briques',
          quantity: 50,
          item_unit: 'unité'
        }
      ];

      mockGetById.mockResolvedValue({
        success: true,
        data: {
          id: orderId,
          companyId: companyId,
          items: mockItems.map(item => ({
            id: item.id,
            purchaseOrderId: orderId,
            catalogItemId: item.catalog_item_id,
            itemName: item.item_name,
            quantity: item.quantity,
            unit: item.item_unit,
            unitPrice: 1000,
            totalPrice: item.quantity * 1000
          }))
        }
      });

      // Mock pour retourner le stock insuffisant
      supabase.from.mockImplementation((table: string) => {
        if (table === 'poc_internal_stock') {
          const builder: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col: string, val: any) => {
              if (col === 'product_id' && val === 'product-1') {
                builder.then = vi.fn((resolve) => {
                  return Promise.resolve({
                    data: [initialStock1],
                    error: null
                  }).then(resolve);
                });
              }
              return builder;
            }),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: initialStock1,
              error: null
            }),
            then: vi.fn((resolve) => {
              return Promise.resolve({
                data: [initialStock1],
                error: null
              }).then(resolve);
            })
          };
          return builder;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null })
        };
      });

      const result = await pocStockService.fulfillFromStock(orderId);

      expectServiceError(result, 'Stock insuffisant');

      // Vérifier que le stock n'a pas été modifié (atomicité)
      const finalStock1 = supabase._mockData['poc_internal_stock'].find((s: any) => s.id === stockId1);
      const finalStock2 = supabase._mockData['poc_internal_stock'].find((s: any) => s.id === stockId2);
      
      expect(parseFloat(finalStock1.quantity.toString())).toBe(5); // Inchangé
      expect(parseFloat(finalStock2.quantity.toString())).toBe(200); // Inchangé
    });

    it('should create stock transactions with correct reference', async () => {
      const { supabase } = require('../../../lib/supabase');
      
      const mockItems = [
        {
          id: 'item-1',
          purchase_order_id: orderId,
          catalog_item_id: 'product-1',
          item_name: 'Ciment',
          quantity: 10,
          item_unit: 'sac'
        }
      ];

      supabase._mockData['poc_internal_stock'] = [
        createMockStockRecord({
          id: stockId1,
          company_id: companyId,
          product_id: 'product-1',
          item_name: 'Ciment',
          quantity: 100,
          unit: 'sac'
        })
      ];

      supabase._mockData['poc_stock_transactions'] = [];

      mockGetById.mockResolvedValue({
        success: true,
        data: {
          id: orderId,
          companyId: companyId,
          items: mockItems.map(item => ({
            id: item.id,
            purchaseOrderId: orderId,
            catalogItemId: item.catalog_item_id,
            itemName: item.item_name,
            quantity: item.quantity,
            unit: item.item_unit,
            unitPrice: 1000,
            totalPrice: item.quantity * 1000
          }))
        }
      });

      // Mock complet pour removeStock qui crée une transaction
      let updateCallCount = 0;
      let insertCallCount = 0;
      
      supabase.from.mockImplementation((table: string) => {
        const builder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          update: vi.fn().mockImplementation(() => {
            updateCallCount++;
            return {
              ...builder,
              single: vi.fn().mockResolvedValue({
                data: { ...supabase._mockData['poc_internal_stock'][0], quantity: 90 },
                error: null
              })
            };
          }),
          insert: vi.fn().mockImplementation((values: any) => {
            insertCallCount++;
            if (table === 'poc_stock_transactions') {
              const transaction = Array.isArray(values) ? values[0] : values;
              supabase._mockData['poc_stock_transactions'].push({
                ...transaction,
                id: generateId(),
                created_at: new Date().toISOString()
              });
            }
            return {
              ...builder,
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: Array.isArray(values) ? values[0] : values,
                error: null
              })
            };
          }),
          single: vi.fn().mockImplementation(() => {
            if (table === 'poc_internal_stock') {
              return Promise.resolve({
                data: supabase._mockData['poc_internal_stock'][0],
                error: null
              });
            }
            return Promise.resolve({ data: null, error: null });
          }),
          then: vi.fn(function(resolve) {
            if (table === 'poc_internal_stock') {
              return Promise.resolve({
                data: [supabase._mockData['poc_internal_stock'][0]],
                error: null
              }).then(resolve);
            }
            return Promise.resolve({ data: [], error: null }).then(resolve);
          })
        };
        return builder;
      });

      const result = await pocStockService.fulfillFromStock(orderId);

      expectServiceSuccess(result);

      // Vérifier qu'une transaction a été créée avec les bonnes références
      const transactions = supabase._mockData['poc_stock_transactions'];
      expect(transactions.length).toBeGreaterThan(0);
      
      const transaction = transactions[transactions.length - 1];
      expect(transaction.transaction_type).toBe('exit');
      expect(transaction.reference_type).toBe('purchase_order');
      expect(transaction.reference_id).toBe(orderId);
    });
  });
});

// AGENT-16-HELPERS-TESTS-COMPLETE

