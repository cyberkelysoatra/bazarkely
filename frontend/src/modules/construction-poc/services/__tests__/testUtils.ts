/**
 * Utilitaires de test pour le module Construction POC
 * Fonctions helper pour setup, cleanup, et assertions
 */

import type { ServiceResult } from '../../types/construction';

/**
 * Configuration de l'environnement de test
 */
export interface TestEnvironment {
  mockSupabase: any;
  mockUser: any;
  mockCompany: any;
  cleanup: () => void;
}

/**
 * Setup de l'environnement de test
 */
export function setupTestEnvironment(): TestEnvironment {
  const mockSupabase = createMockSupabaseClient();
  const mockUser = createMockAuthUser();
  const mockCompany = createMockCompany();

  // Mock global pour Supabase
  (global as any).supabase = mockSupabase;

  return {
    mockSupabase,
    mockUser,
    mockCompany,
    cleanup: () => {
      delete (global as any).supabase;
    }
  };
}

/**
 * Cleanup de l'environnement de test
 */
export function cleanupTestEnvironment(env: TestEnvironment): void {
  if (env.cleanup) {
    env.cleanup();
  }
}

/**
 * Crée un client Supabase mocké
 */
export function createMockSupabaseClient() {
  const mockData: Record<string, any[]> = {};
  const mockQueries: any[] = [];

  return {
    from: jest.fn((table: string) => {
      if (!mockData[table]) {
        mockData[table] = [];
      }

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        then: jest.fn((resolve) => {
          const result = { data: mockData[table] || [], error: null };
          return Promise.resolve(result).then(resolve);
        })
      };

      // Mock pour les opérations de base
      queryBuilder.select.mockImplementation(() => {
        return {
          ...queryBuilder,
          then: jest.fn((resolve) => {
            const result = { data: mockData[table] || [], error: null };
            return Promise.resolve(result).then(resolve);
          })
        };
      });

      queryBuilder.insert.mockImplementation((values: any) => {
        const newItem = Array.isArray(values) ? values[0] : values;
        const inserted = { ...newItem, id: newItem.id || generateId() };
        mockData[table].push(inserted);
        return {
          ...queryBuilder,
          select: jest.fn().mockResolvedValue({ data: [inserted], error: null }),
          single: jest.fn().mockResolvedValue({ data: inserted, error: null })
        };
      });

      queryBuilder.update.mockImplementation((values: any) => {
        return {
          ...queryBuilder,
          eq: jest.fn((column: string, value: any) => {
            const item = mockData[table].find((item: any) => item[column] === value);
            if (item) {
              Object.assign(item, values);
            }
            return {
              ...queryBuilder,
              select: jest.fn().mockResolvedValue({ data: item ? [item] : [], error: null }),
              single: jest.fn().mockResolvedValue({ data: item || null, error: null }),
              then: jest.fn((resolve) => {
                return Promise.resolve({ data: item || null, error: null }).then(resolve);
              })
            };
          })
        };
      });

      queryBuilder.delete.mockImplementation(() => {
        return {
          ...queryBuilder,
          eq: jest.fn((column: string, value: any) => {
            const index = mockData[table].findIndex((item: any) => item[column] === value);
            if (index !== -1) {
              mockData[table].splice(index, 1);
            }
            return {
              ...queryBuilder,
              then: jest.fn((resolve) => {
                return Promise.resolve({ data: null, error: null }).then(resolve);
              })
            };
          })
        };
      });

      return queryBuilder;
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: createMockAuthUser() },
        error: null
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: createMockAuthUser() } },
        error: null
      })
    },
    _mockData: mockData,
    _mockQueries: mockQueries
  };
}

/**
 * Crée un utilisateur mocké
 */
export function createMockAuthUser() {
  return {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User'
    }
  };
}

/**
 * Crée une entreprise mockée
 */
export function createMockCompany() {
  return {
    companyId: 'company-123',
    companyName: 'Test Construction Company',
    companyStatus: 'approved' as const,
    companyType: 'builder' as const
  };
}

/**
 * Helper pour attendre les opérations asynchrones
 */
export async function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper pour vérifier un ServiceResult réussi
 */
export function expectServiceSuccess<T>(result: ServiceResult<T>): asserts result is ServiceResult<T> & { success: true; data: T } {
  expect(result.success).toBe(true);
  expect(result.data).toBeDefined();
  expect(result.error).toBeUndefined();
}

/**
 * Helper pour vérifier un ServiceResult en erreur
 */
export function expectServiceError(result: ServiceResult<any>, expectedError?: string): void {
  expect(result.success).toBe(false);
  expect(result.error || result.errors).toBeDefined();
  if (expectedError) {
    expect(result.error || JSON.stringify(result.errors)).toContain(expectedError);
  }
}

/**
 * Génère un ID UUID mocké
 */
export function generateId(): string {
  return `mock-id-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
}

/**
 * Génère une date mockée
 */
export function generateDate(daysOffset: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

/**
 * Reset tous les mocks
 */
export function resetAllMocks(): void {
  jest.clearAllMocks();
}


