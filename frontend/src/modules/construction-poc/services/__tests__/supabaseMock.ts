/**
 * Mock Supabase client pour les tests
 * Simule le comportement de Supabase avec des données en mémoire
 */

export interface MockSupabaseClient {
  from: jest.Mock;
  auth: {
    getUser: jest.Mock;
    getSession: jest.Mock;
  };
  _mockData: Record<string, any[]>;
  _reset: () => void;
}

/**
 * Crée un mock Supabase client complet
 */
export function createMockSupabase(): MockSupabaseClient {
  const mockData: Record<string, any[]> = {};
  let queryChain: any = null;

  const reset = () => {
    Object.keys(mockData).forEach(key => delete mockData[key]);
  };

  const createQueryBuilder = (table: string) => {
    const builder: any = {
      select: jest.fn(() => builder),
      insert: jest.fn(() => builder),
      update: jest.fn(() => builder),
      delete: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      neq: jest.fn(() => builder),
      gt: jest.fn(() => builder),
      gte: jest.fn(() => builder),
      lt: jest.fn(() => builder),
      lte: jest.fn(() => builder),
      ilike: jest.fn(() => builder),
      like: jest.fn(() => builder),
      in: jest.fn(() => builder),
      is: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null }))
    };

    // Implémentation select
    builder.select.mockImplementation((columns?: string) => {
      builder._operation = 'select';
      builder._columns = columns;
      return builder;
    });

    // Implémentation insert
    builder.insert.mockImplementation((values: any) => {
      builder._operation = 'insert';
      builder._insertValues = Array.isArray(values) ? values : [values];
      return builder;
    });

    // Implémentation update
    builder.update.mockImplementation((values: any) => {
      builder._operation = 'update';
      builder._updateValues = values;
      return builder;
    });

    // Implémentation delete
    builder.delete.mockImplementation(() => {
      builder._operation = 'delete';
      return builder;
    });

    // Implémentation eq (filtre)
    builder.eq.mockImplementation((column: string, value: any) => {
      if (!builder._filters) builder._filters = [];
      builder._filters.push({ type: 'eq', column, value });
      return builder;
    });

    // Implémentation single
    builder.single.mockImplementation(() => {
      builder._returnSingle = true;
      return executeQuery(builder, table);
    });

    // Implémentation then (pour les promesses)
    builder.then = jest.fn((resolve) => {
      return executeQuery(builder, table).then(resolve);
    });

    return builder;
  };

  const executeQuery = async (builder: any, table: string) => {
    if (!mockData[table]) {
      mockData[table] = [];
    }

    let results = [...mockData[table]];

    // Appliquer les filtres
    if (builder._filters) {
      builder._filters.forEach((filter: any) => {
        if (filter.type === 'eq') {
          results = results.filter((item: any) => item[filter.column] === filter.value);
        }
      });
    }

    // Exécuter l'opération
    if (builder._operation === 'select') {
      if (builder._returnSingle) {
        return Promise.resolve({
          data: results.length > 0 ? results[0] : null,
          error: results.length === 0 ? { message: 'No rows returned' } : null
        });
      }
      return Promise.resolve({ data: results, error: null });
    }

    if (builder._operation === 'insert') {
      const inserted = builder._insertValues.map((val: any) => ({
        ...val,
        id: val.id || generateId(),
        created_at: val.created_at || new Date().toISOString(),
        updated_at: val.updated_at || new Date().toISOString()
      }));
      mockData[table].push(...inserted);
      
      if (builder._returnSingle) {
        return Promise.resolve({
          data: inserted[0],
          error: null
        });
      }
      return Promise.resolve({ data: inserted, error: null });
    }

    if (builder._operation === 'update') {
      if (builder._filters && builder._filters.length > 0) {
        const filter = builder._filters[0];
        const index = mockData[table].findIndex((item: any) => item[filter.column] === filter.value);
        if (index !== -1) {
          mockData[table][index] = {
            ...mockData[table][index],
            ...builder._updateValues,
            updated_at: new Date().toISOString()
          };
          if (builder._returnSingle) {
            return Promise.resolve({
              data: mockData[table][index],
              error: null
            });
          }
          return Promise.resolve({
            data: [mockData[table][index]],
            error: null
          });
        }
      }
      return Promise.resolve({ data: null, error: null });
    }

    if (builder._operation === 'delete') {
      if (builder._filters && builder._filters.length > 0) {
        const filter = builder._filters[0];
        const index = mockData[table].findIndex((item: any) => item[filter.column] === filter.value);
        if (index !== -1) {
          mockData[table].splice(index, 1);
        }
      }
      return Promise.resolve({ data: null, error: null });
    }

    return Promise.resolve({ data: results, error: null });
  };

  const mockClient: MockSupabaseClient = {
    from: jest.fn((table: string) => createQueryBuilder(table)),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123', email: 'test@example.com' } } },
        error: null
      })
    },
    _mockData: mockData,
    _reset: reset
  };

  return mockClient;
}

/**
 * Génère un ID UUID mocké
 */
function generateId(): string {
  return `mock-${Math.random().toString(36).substr(2, 9)}-${Date.now()}`;
}

/**
 * Export par défaut pour compatibilité
 */
export default createMockSupabase;


