/**
 * Tests de la réconciliation descendante (lib/syncReconcile).
 *
 * `fake-indexeddb` n'est pas disponible dans ce dépôt : on utilise une doublure
 * de Dexie qui reproduit exactement les appels utilisés par le module
 * (`toArray`, `bulkPut`, `bulkDelete`, `get`, `put`, `delete`, `transaction`,
 * `table`, `where(index).equals(value)`), avec un stockage en mémoire.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Doublure Dexie
// ---------------------------------------------------------------------------

type Row = Record<string, any>;

/** Une table en mémoire, indexée par `id`. */
class FakeTable {
  rows = new Map<string, Row>();

  seed(rows: Row[]) {
    for (const row of rows) this.rows.set(row.id, row);
  }

  async toArray() {
    return [...this.rows.values()];
  }

  async get(id: string) {
    return this.rows.get(id);
  }

  async put(row: Row) {
    this.rows.set(row.id, row);
  }

  async bulkPut(rows: Row[]) {
    for (const row of rows) this.rows.set(row.id, row);
  }

  async delete(id: string) {
    this.rows.delete(id);
  }

  async bulkDelete(ids: string[]) {
    for (const id of ids) this.rows.delete(id);
  }

  /** Supporte `where('[userId+storeName]').equals([u, s])` et un index simple. */
  where(index: string) {
    const fields = index.startsWith('[')
      ? index.slice(1, -1).split('+')
      : [index];
    return {
      equals: (value: any) => {
        const expected = Array.isArray(value) ? value : [value];
        const matches = [...this.rows.values()].filter((row) =>
          fields.every((field, i) => row[field] === expected[i])
        );
        return { toArray: async () => matches };
      },
    };
  }
}

const tables: Record<string, FakeTable> = {};

function resetDb() {
  for (const name of [
    'transactions',
    'accounts',
    'budgets',
    'goals',
    'recurringTransactions',
    'personalLoans',
    'loanRepayments',
    'loanInterestPeriods',
    'syncQueue',
    'syncQuarantine',
  ]) {
    tables[name] = new FakeTable();
  }
}

resetDb();

const fakeDb = {
  get transactions() { return tables.transactions; },
  get accounts() { return tables.accounts; },
  get personalLoans() { return tables.personalLoans; },
  get loanRepayments() { return tables.loanRepayments; },
  get loanInterestPeriods() { return tables.loanInterestPeriods; },
  get syncQueue() { return tables.syncQueue; },
  get syncQuarantine() { return tables.syncQuarantine; },
  table: (name: string) => tables[name],
  // La vraie transaction Dexie est atomique ; ici il suffit d'exécuter le corps.
  transaction: async (_mode: string, ..._args: any[]) => {
    const callback = _args[_args.length - 1];
    return callback();
  },
};

vi.mock('../database', () => ({ db: fakeDb }));

const { reconcileStore, restoreFromQuarantine, fetchAllPages } = await import('../syncReconcile');

// ---------------------------------------------------------------------------
// Helpers de scénario
// ---------------------------------------------------------------------------

const USER = 'user-1';
const OLD = new Date('2026-01-01T00:00:00Z');
/** La requête serveur démarre bien après la création des lignes « anciennes ». */
const FETCH_STARTED_AT = new Date('2026-06-01T00:00:00Z');

function tx(id: string, extra: Row = {}): Row {
  return { id, userId: USER, description: id, amount: 1000, createdAt: OLD, ...extra };
}

function queueOp(recordId: string, status: string, retryCount = 0): Row {
  return {
    id: `op-${recordId}`,
    userId: USER,
    operation: 'UPDATE',
    table_name: 'transactions',
    data: { id: recordId },
    status,
    retryCount,
  };
}

async function reconcileTransactions(overrides: Row = {}) {
  return reconcileStore({
    storeName: 'transactions',
    localRows: await tables.transactions.toArray(),
    serverIds: [],
    fetchStartedAt: FETCH_STARTED_AT,
    fetchComplete: true,
    userId: USER,
    ...overrides,
  } as any);
}

beforeEach(() => {
  resetDb();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

// ---------------------------------------------------------------------------

describe('reconcileStore — règle de base', () => {
  it('met en quarantaine une ligne locale absente du serveur', async () => {
    tables.transactions.seed([tx('keep'), tx('gone')]);

    const result = await reconcileTransactions({ serverIds: ['keep'] });

    expect(result.quarantined).toBe(1);
    expect(result.quarantinedIds).toEqual(['gone']);
    expect(tables.transactions.rows.has('gone')).toBe(false);
    expect(tables.transactions.rows.has('keep')).toBe(true);
  });

  it("archive la ligne complète sous un id déterministe, jamais une suppression sèche", async () => {
    tables.transactions.seed([tx('gone', { amount: 4242 })]);

    await reconcileTransactions({ serverIds: ['other'] });

    const entry = await tables.syncQuarantine.get('transactions:gone');
    expect(entry).toMatchObject({
      storeName: 'transactions',
      recordId: 'gone',
      userId: USER,
      reason: 'absent-from-server',
    });
    expect(entry!.record.amount).toBe(4242);
  });

  it('ne touche pas aux lignes que le serveur a renvoyées', async () => {
    tables.transactions.seed([tx('a'), tx('b'), tx('c')]);

    const result = await reconcileTransactions({ serverIds: ['a', 'b', 'c'] });

    expect(result.quarantined).toBe(0);
    expect(tables.transactions.rows.size).toBe(3);
    expect(tables.syncQuarantine.rows.size).toBe(0);
  });
});

describe('P1 — une ligne en file d’envoi n’est jamais mise en quarantaine', () => {
  // Tout statut, y compris `failed` avec les tentatives épuisées.
  for (const [status, retryCount] of [
    ['pending', 0],
    ['processing', 0],
    ['failed', 3],
    ['completed', 0],
  ] as const) {
    it(`protège une ligne dont l'opération est « ${status} » (retryCount=${retryCount})`, async () => {
      tables.transactions.seed([tx('queued')]);
      tables.syncQueue.seed([queueOp('queued', status, retryCount)]);

      const result = await reconcileTransactions({ serverIds: ['autre'] });

      expect(result.quarantined).toBe(0);
      expect(result.keptPending).toBe(1);
      expect(tables.transactions.rows.has('queued')).toBe(true);
    });
  }

  it('ne charge la file qu’une seule fois quel que soit le nombre de lignes', async () => {
    tables.transactions.seed([tx('a'), tx('b'), tx('c'), tx('d')]);
    const spy = vi.spyOn(tables.syncQueue, 'toArray');

    await reconcileTransactions({ serverIds: ['zzz'] });

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('P2 — une création récente est gardée', () => {
  it('garde une ligne créée après fetchStartedAt - 60 s', async () => {
    // 30 s avant le départ de la requête : dans la fenêtre de grâce.
    const recent = new Date(FETCH_STARTED_AT.getTime() - 30_000);
    tables.transactions.seed([tx('recent', { createdAt: recent })]);

    const result = await reconcileTransactions({ serverIds: ['autre'] });

    expect(result.quarantined).toBe(0);
    expect(result.keptRecent).toBe(1);
    expect(tables.transactions.rows.has('recent')).toBe(true);
  });

  it('met en quarantaine une ligne créée juste avant la fenêtre de grâce', async () => {
    // 61 s avant : hors fenêtre.
    const justBefore = new Date(FETCH_STARTED_AT.getTime() - 61_000);
    tables.transactions.seed([tx('old', { createdAt: justBefore })]);

    const result = await reconcileTransactions({ serverIds: ['autre'] });

    expect(result.quarantined).toBe(1);
  });

  it('accepte une date de création sérialisée en chaîne', async () => {
    const recent = new Date(FETCH_STARTED_AT.getTime() - 10_000).toISOString();
    tables.transactions.seed([tx('recent', { createdAt: recent })]);

    const result = await reconcileTransactions({ serverIds: ['autre'] });

    expect(result.keptRecent).toBe(1);
  });
});

describe('P3 — réponse incomplète', () => {
  it('ne met rien en quarantaine et signale « incomplete »', async () => {
    tables.transactions.seed([tx('a'), tx('b')]);

    const result = await reconcileTransactions({ serverIds: ['a'], fetchComplete: false });

    expect(result.skipped).toBe('incomplete');
    expect(result.quarantined).toBe(0);
    expect(tables.transactions.rows.size).toBe(2);
  });
});

describe('P4 — réponse serveur vide', () => {
  it('ne vide jamais la portée locale et signale « empty-server »', async () => {
    tables.transactions.seed([tx('a'), tx('b'), tx('c')]);

    const result = await reconcileTransactions({ serverIds: [] });

    expect(result.skipped).toBe('empty-server');
    expect(result.quarantined).toBe(0);
    expect(tables.transactions.rows.size).toBe(3);
  });

  it('accepte une réponse vide quand la portée locale est vide elle aussi', async () => {
    const result = await reconcileTransactions({ serverIds: [] });

    expect(result.skipped).toBeUndefined();
    expect(result.quarantined).toBe(0);
  });
});

describe('P5 — cascade des prêts', () => {
  const parentGate = (received: string[], quarantined: string[]) => ({
    getParentId: (row: any) => row.loanId,
    receivedParentIds: new Set(received),
    quarantinedParentIds: new Set(quarantined),
  });

  it('compare un enfant dont le prêt parent est revenu du serveur', async () => {
    tables.loanRepayments.seed([
      { id: 'r1', loanId: 'loan-a', createdAt: OLD },
      { id: 'r2', loanId: 'loan-a', createdAt: OLD },
    ]);

    const result = await reconcileStore({
      storeName: 'loanRepayments',
      localRows: await tables.loanRepayments.toArray(),
      serverIds: ['r1'],
      fetchStartedAt: FETCH_STARTED_AT,
      fetchComplete: true,
      userId: USER,
      parentGate: parentGate(['loan-a'], []),
    } as any);

    expect(result.quarantinedIds).toEqual(['r2']);
  });

  it('ne compare pas un enfant dont le prêt parent est absent et non mis en quarantaine', async () => {
    tables.loanRepayments.seed([{ id: 'orphan', loanId: 'loan-inconnu', createdAt: OLD }]);

    const result = await reconcileStore({
      storeName: 'loanRepayments',
      localRows: await tables.loanRepayments.toArray(),
      serverIds: ['autre'],
      fetchStartedAt: FETCH_STARTED_AT,
      fetchComplete: true,
      userId: USER,
      parentGate: parentGate([], []),
    } as any);

    expect(result.quarantined).toBe(0);
    expect(tables.loanRepayments.rows.has('orphan')).toBe(true);
  });

  it('met en quarantaine les enfants dont le prêt parent a été mis en quarantaine', async () => {
    tables.loanInterestPeriods.seed([
      { id: 'p1', loanId: 'loan-mort', createdAt: OLD },
      { id: 'p2', loanId: 'loan-vivant', createdAt: OLD },
    ]);

    const result = await reconcileStore({
      storeName: 'loanInterestPeriods',
      localRows: await tables.loanInterestPeriods.toArray(),
      // p1 et p2 sont tous deux « présents » côté serveur : seule la cascade
      // doit emporter p1, parce que son prêt parent est parti en quarantaine.
      serverIds: ['p1', 'p2'],
      fetchStartedAt: FETCH_STARTED_AT,
      fetchComplete: true,
      userId: USER,
      parentGate: parentGate(['loan-vivant'], ['loan-mort']),
    } as any);

    expect(result.quarantinedIds).toEqual(['p1']);
    expect(tables.loanInterestPeriods.rows.has('p2')).toBe(true);
  });

  it('protège un enfant en file d’envoi même quand son prêt parent cascade', async () => {
    tables.loanRepayments.seed([
      { id: 'r1', loanId: 'loan-mort', createdAt: OLD },
      // r2 garde la réponse serveur non vide, sinon c'est P4 qui s'appliquerait.
      { id: 'r2', loanId: 'loan-vivant', createdAt: OLD },
    ]);
    tables.syncQueue.seed([queueOp('r1', 'pending')]);

    const result = await reconcileStore({
      storeName: 'loanRepayments',
      localRows: await tables.loanRepayments.toArray(),
      serverIds: ['r2'],
      fetchStartedAt: FETCH_STARTED_AT,
      fetchComplete: true,
      userId: USER,
      parentGate: parentGate(['loan-vivant'], ['loan-mort']),
    } as any);

    expect(result.quarantined).toBe(0);
    expect(result.keptPending).toBe(1);
    expect(tables.loanRepayments.rows.has('r1')).toBe(true);
  });
});

describe('Idempotence et cycle de vie', () => {
  it('un second passage ne met plus rien en quarantaine', async () => {
    tables.transactions.seed([tx('gone'), tx('keep')]);

    const first = await reconcileTransactions({ serverIds: ['keep'] });
    const second = await reconcileTransactions({ serverIds: ['keep'] });

    expect(first.quarantined).toBe(1);
    expect(second.quarantined).toBe(0);
    expect(tables.syncQuarantine.rows.size).toBe(1);
  });

  it('retire l’entrée d’archive quand la ligne réapparaît côté serveur', async () => {
    tables.transactions.seed([tx('gone')]);
    await reconcileTransactions({ serverIds: ['autre'] });
    expect(tables.syncQuarantine.rows.size).toBe(1);

    // Le bulkPut du rafraîchissement suivant a remis la ligne dans son store.
    tables.transactions.seed([tx('gone')]);
    await reconcileTransactions({ serverIds: ['gone'] });

    expect(tables.syncQuarantine.rows.size).toBe(0);
    expect(tables.transactions.rows.has('gone')).toBe(true);
  });

  it('restaure une ligne depuis la quarantaine', async () => {
    tables.transactions.seed([tx('gone', { amount: 777 })]);
    await reconcileTransactions({ serverIds: ['autre'] });
    expect(tables.transactions.rows.has('gone')).toBe(false);

    const restored = await restoreFromQuarantine('transactions:gone');

    expect(restored).toBe(true);
    expect(tables.transactions.rows.get('gone')!.amount).toBe(777);
    expect(tables.syncQuarantine.rows.size).toBe(0);
  });

  it('retourne false pour une entrée de quarantaine inconnue', async () => {
    expect(await restoreFromQuarantine('transactions:inexistant')).toBe(false);
  });

  it('ne purge que les archives du store et de l’utilisateur concernés', async () => {
    tables.syncQuarantine.seed([
      { id: 'accounts:x', storeName: 'accounts', recordId: 'x', userId: USER, record: {} },
      { id: 'transactions:x', storeName: 'transactions', recordId: 'x', userId: USER, record: {} },
      { id: 'transactions:y', storeName: 'transactions', recordId: 'y', userId: 'autre-user', record: {} },
    ]);

    await reconcileTransactions({ serverIds: ['x', 'y'] });

    expect(tables.syncQuarantine.rows.has('transactions:x')).toBe(false);
    expect(tables.syncQuarantine.rows.has('accounts:x')).toBe(true);
    expect(tables.syncQuarantine.rows.has('transactions:y')).toBe(true);
  });
});

describe('fetchAllPages — pagination', () => {
  /** Sert `total` lignes, en respectant la fenêtre `[from, to]` demandée. */
  const pagedSource = (total: number) =>
    vi.fn(async (from: number, to: number) => ({
      data: Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => ({
        id: `row-${from + i}`,
      })),
      error: null,
    }));

  it('récupère plus de 1000 lignes — 2500 lignes servies en 3 pages', async () => {
    const source = pagedSource(2500);

    const { rows, complete } = await fetchAllPages(source);

    expect(rows).toHaveLength(2500);
    expect(complete).toBe(true);
    expect(source).toHaveBeenCalledTimes(3);
    expect(source).toHaveBeenNthCalledWith(1, 0, 999);
    expect(source).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(source).toHaveBeenNthCalledWith(3, 2000, 2999);
    expect(new Set(rows.map((r: any) => r.id)).size).toBe(2500);
  });

  it('marque la réponse complète quand une seule page suffit', async () => {
    const { rows, complete } = await fetchAllPages(pagedSource(3));

    expect(rows).toHaveLength(3);
    expect(complete).toBe(true);
  });

  it('marque la réponse incomplète si une page renvoie une erreur', async () => {
    const source = vi
      .fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, i) => ({ id: `a${i}` })), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

    const { rows, complete } = await fetchAllPages(source);

    expect(rows).toHaveLength(1000);
    expect(complete).toBe(false);
  });

  it('marque la réponse incomplète si une page lève (timeout)', async () => {
    const source = vi.fn().mockRejectedValue(new Error('Timeout'));

    const { rows, complete } = await fetchAllPages(source);

    expect(rows).toHaveLength(0);
    expect(complete).toBe(false);
  });

  it('une page en échec après pagination empêche toute quarantaine (P3 de bout en bout)', async () => {
    tables.transactions.seed([tx('a'), tx('b')]);
    const source = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: 'a' }], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    // Page de 1 ligne pour forcer un second appel.
    const { rows, complete } = await fetchAllPages(source, 1);

    const result = await reconcileTransactions({
      serverIds: rows.map((r: any) => r.id),
      fetchComplete: complete,
    });

    expect(result.skipped).toBe('incomplete');
    expect(tables.transactions.rows.size).toBe(2);
  });
});
