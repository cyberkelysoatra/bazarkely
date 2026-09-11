/**
 * Tests des MOUVEMENTS de solde (v3.78.0).
 *
 * Règle du chantier : un appareil n'envoie plus jamais un solde, il envoie un
 * mouvement (+X / −X) identifié par un id client. Le serveur applique chaque id
 * une seule fois. Un timeout n'est PAS un échec : l'envoi a pu aboutir, donc le
 * rejeu doit converger sur la même ligne au lieu de compter deux fois.
 *
 * `fake-indexeddb` n'est pas disponible dans ce dépôt : on utilise, comme dans
 * `lib/__tests__/syncReconcile.test.ts`, une doublure Dexie en mémoire qui
 * reproduit exactement les appels des modules testés. Le serveur Supabase est
 * lui aussi doublé, avec la MÊME garantie d'idempotence que la vraie fonction
 * `apply_balance_movement`.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const USER_ID = 'user-joel';
const OTHER_USER_ID = 'user-autre';

// ---------------------------------------------------------------------------
// Doublure Dexie
// ---------------------------------------------------------------------------

type Row = Record<string, any>;

class FakeTable {
  rows = new Map<string, Row>();
  private autoId = 0;

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

  async add(row: Row) {
    const id = row.id ?? `auto-${++this.autoId}`;
    this.rows.set(id, { ...row, id });
    return id;
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

  async update(id: string, changes: Row) {
    const existing = this.rows.get(id);
    if (!existing) return 0;
    this.rows.set(id, { ...existing, ...changes });
    return 1;
  }

  /** Supporte `where(index).equals(v)` et `where(index).anyOf([...]).filter(fn)`. */
  where(index: string) {
    const fields = index.startsWith('[') ? index.slice(1, -1).split('+') : [index];
    const all = () => [...this.rows.values()];
    return {
      equals: (value: any) => {
        const expected = Array.isArray(value) ? value : [value];
        const matches = all().filter((row) => fields.every((f, i) => row[f] === expected[i]));
        return { toArray: async () => matches };
      },
      anyOf: (values: any[]) => {
        const matches = all().filter((row) => values.includes(row[fields[0]]));
        return {
          toArray: async () => matches,
          filter: (predicate: (row: Row) => boolean) => ({
            toArray: async () => matches.filter(predicate),
          }),
        };
      },
    };
  }
}

const tables: Record<string, FakeTable> = {};

function resetDb() {
  for (const name of ['accounts', 'budgets', 'transactions', 'syncQueue', 'syncQuarantine']) {
    tables[name] = new FakeTable();
  }
}
resetDb();

const fakeDb = {
  get accounts() { return tables.accounts; },
  get budgets() { return tables.budgets; },
  get transactions() { return tables.transactions; },
  get syncQueue() { return tables.syncQueue; },
  get syncQuarantine() { return tables.syncQuarantine; },
  table: (name: string) => tables[name],
  transaction: async (_mode: string, ...args: any[]) => args[args.length - 1](),
};

// ---------------------------------------------------------------------------
// Doublure serveur : la fonction apply_balance_movement, idempotente par id
// ---------------------------------------------------------------------------

const server = {
  /** Solde serveur par compte. */
  balances: new Map<string, number>(),
  /** Propriétaire de chaque compte (pour reproduire « forbidden »). */
  owners: new Map<string, string>(),
  /** Mouvements DÉJÀ appliqués — le cœur de l'idempotence. */
  applied: new Map<string, { accountId: string; delta: number; kind: string }>(),
  /** Trace de tous les appels reçus, y compris ceux ignorés comme doublons. */
  calls: [] as any[],
  /** Lignes PATCH reçues sur `accounts` (doit rester sans `balance`). */
  accountPatches: [] as any[],
  reset() {
    this.balances.clear();
    this.owners.clear();
    this.applied.clear();
    this.calls = [];
    this.accountPatches = [];
  },
};

function serverApplyMovement(args: any) {
  server.calls.push(args);
  const owner = server.owners.get(args.p_account_id);
  if (!owner) {
    return { data: null, error: { code: 'P0002', message: 'account not found' } };
  }
  if (owner !== USER_ID) {
    return { data: null, error: { code: '42501', message: 'forbidden' } };
  }
  // Idempotence : mouvement déjà appliqué → solde courant, sans rien refaire.
  if (server.applied.has(args.p_id)) {
    return { data: server.balances.get(args.p_account_id) ?? 0, error: null };
  }
  const next = (server.balances.get(args.p_account_id) ?? 0) + Number(args.p_delta);
  server.balances.set(args.p_account_id, next);
  server.applied.set(args.p_id, {
    accountId: args.p_account_id,
    delta: Number(args.p_delta),
    kind: args.p_kind,
  });
  return { data: next, error: null };
}

const fakeSupabase = {
  rpc: vi.fn(async (name: string, args: any) => {
    if (name !== 'apply_balance_movement') throw new Error(`RPC inattendue: ${name}`);
    return serverApplyMovement(args);
  }),
  auth: {
    getSession: async () => ({ data: { session: { user: { id: USER_ID } } } }),
  },
  from: (table: string) => ({
    update: (payload: any) => ({
      eq: async (_col: string, id: string) => {
        server.accountPatches.push({ table, id, payload });
        return { data: null, error: null };
      },
    }),
    upsert: async () => ({ data: null, error: null }),
    delete: () => ({ eq: async () => ({ data: null, error: null }) }),
  }),
};

/**
 * Étiquettes dont le prochain appel doit « expirer » : la promesse sous-jacente
 * part quand même (le serveur commite), mais l'appelant reçoit une erreur —
 * exactement le scénario qui provoquait des doublons avant ce chantier.
 */
const timeoutOnce = new Set<string>();

const fakeWithTimeout = vi.fn(async (promise: any, _ms: number, label?: string) => {
  if (label && timeoutOnce.has(label)) {
    timeoutOnce.delete(label);
    try {
      await promise; // l'écriture aboutit côté serveur…
    } catch {
      /* ignoré */
    }
    throw new Error(`${label} timeout after 5000ms`); // …mais l'appelant l'ignore
  }
  return promise;
});

// ---------------------------------------------------------------------------
// Doublures des modules voisins
// ---------------------------------------------------------------------------

const apiServiceMock = {
  getAllAccountsPaged: vi.fn(async () => ({ success: true, data: [] as any[], complete: true })),
  getAllBudgetsPaged: vi.fn(async () => ({ success: true, data: [] as any[], complete: true })),
  updateAccount: vi.fn(async (id: string, payload: any) => {
    server.accountPatches.push({ table: 'accounts', id, payload });
    return { success: true, data: { id, user_id: USER_ID, ...payload } };
  }),
  createAccount: vi.fn(async (payload: any) => ({ success: true, data: payload })),
  deleteAccount: vi.fn(async () => ({ success: true })),
};

const reconcileStoreMock = vi.fn(async () => ({
  quarantined: 0,
  keptPending: 0,
  keptRecent: 0,
  quarantinedIds: [],
}));

vi.mock('../../lib/database', () => ({ db: fakeDb }));
vi.mock('../../lib/supabase', () => ({
  supabase: fakeSupabase,
  withTimeout: (p: any, ms: number, label?: string) => fakeWithTimeout(p, ms, label),
}));
vi.mock('../../lib/syncReconcile', () => ({ reconcileStore: reconcileStoreMock }));
vi.mock('../apiService', () => ({ default: apiServiceMock }));
vi.mock('../exchangeRateService', () => ({
  convertAmount: async (amount: number) => amount,
  getExchangeRate: async () => ({ rate: 1 }),
}));
vi.mock('../../stores/appStore', () => ({
  useAppStore: { getState: () => ({ user: { id: USER_ID } }) },
}));

const accountServiceModule = await import('../accountService');
const accountService = accountServiceModule.default;
const budgetService = (await import('../budgetService')).default;
const transactionService = (await import('../transactionService')).default;
const syncManager = await import('../syncManager');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// `src/test/setup.ts` définit déjà navigator.onLine en `writable` (non
// reconfigurable) : une simple affectation suffit, defineProperty échouerait.
function setOnline(online: boolean) {
  (window.navigator as any).onLine = online;
}

function seedAccount(id: string, balance: number, extra: Row = {}, owner = USER_ID) {
  tables.accounts.seed([
    {
      id,
      userId: owner,
      name: `Compte ${id}`,
      type: 'especes',
      balance,
      currency: 'MGA',
      isDefault: false,
      createdAt: new Date('2026-01-01'),
      ...extra,
    },
  ]);
  server.owners.set(id, owner);
  server.balances.set(id, balance);
}

function queuedMovements() {
  return [...tables.syncQueue.rows.values()].filter(
    (op) => op.table_name === 'account_balance_movements'
  );
}

beforeEach(() => {
  resetDb();
  server.reset();
  timeoutOnce.clear();
  fakeSupabase.rpc.mockClear();
  fakeWithTimeout.mockClear();
  apiServiceMock.getAllAccountsPaged.mockClear();
  apiServiceMock.getAllBudgetsPaged.mockClear();
  apiServiceMock.updateAccount.mockClear();
  reconcileStoreMock.mockClear();
  setOnline(true);
});

// ---------------------------------------------------------------------------

describe('applyBalanceMovement — en ligne', () => {
  it('écrit en local le solde renvoyé par le serveur, augmenté des mouvements encore en attente', async () => {
    seedAccount('acc-1', 1000);
    // Un mouvement d'un autre écran attend encore de monter : il doit être
    // ajouté au solde serveur, sinon l'affichage reculerait.
    await tables.syncQueue.add({
      id: 'op-attente',
      userId: USER_ID,
      operation: 'CREATE',
      table_name: 'account_balance_movements',
      data: { id: 'mov-attente', accountId: 'acc-1', delta: 250, kind: 'transaction' },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
    });

    const result = await accountService.applyBalanceMovement('acc-1', USER_ID, -100, {
      kind: 'transaction',
    });

    expect(server.balances.get('acc-1')).toBe(900); // serveur : 1000 − 100
    expect(result?.balance).toBe(1150); // local : 900 + 250 encore en attente
    expect((await tables.accounts.get('acc-1'))?.balance).toBe(1150);
  });

  it('transmet le delta, le genre et la transaction source, jamais un total', async () => {
    seedAccount('acc-1', 500);

    await accountService.applyBalanceMovement('acc-1', USER_ID, -75, {
      kind: 'transaction',
      sourceTransactionId: 'tx-42',
    });

    expect(server.calls).toHaveLength(1);
    expect(server.calls[0]).toMatchObject({
      p_account_id: 'acc-1',
      p_delta: -75,
      p_kind: 'transaction',
      p_source_transaction_id: 'tx-42',
    });
    // Aucun total absolu n'apparaît dans la charge utile.
    expect(Object.values(server.calls[0])).not.toContain(425);
  });
});

describe('applyBalanceMovement — timeout et rejeu', () => {
  it('met en file le MÊME id et garde le solde local déjà ajusté', async () => {
    seedAccount('acc-1', 1000);
    timeoutOnce.add('accountService.applyBalanceMovement');

    const result = await accountService.applyBalanceMovement('acc-1', USER_ID, -100, {
      kind: 'transaction',
      sourceTransactionId: 'tx-7',
    });

    // Le solde local a bougé tout de suite, sans attendre le serveur.
    expect(result?.balance).toBe(900);
    expect((await tables.accounts.get('acc-1'))?.balance).toBe(900);

    const queued = queuedMovements();
    expect(queued).toHaveLength(1);
    expect(queued[0].data).toMatchObject({
      accountId: 'acc-1',
      delta: -100,
      kind: 'transaction',
      sourceTransactionId: 'tx-7',
    });
    // L'id mis en file est exactement celui envoyé au serveur.
    expect(queued[0].data.id).toBe(server.calls[0].p_id);
  });

  it("un envoi « expiré-mais-commité » puis rejoué n'est compté qu'une fois", async () => {
    seedAccount('acc-1', 1000);
    timeoutOnce.add('accountService.applyBalanceMovement');

    // 1) Envoi direct : le serveur commite, l'appelant croit à un échec.
    await accountService.applyBalanceMovement('acc-1', USER_ID, -100, { kind: 'transaction' });
    expect(server.balances.get('acc-1')).toBe(900);
    expect(queuedMovements()).toHaveLength(1);

    // 2) La file rejoue le même id : le serveur ne l'applique PAS une 2ᵉ fois.
    await syncManager.processSyncQueue(true);

    expect(server.calls).toHaveLength(2); // deux appels reçus…
    expect(server.applied.size).toBe(1); // …un seul mouvement appliqué
    expect(server.balances.get('acc-1')).toBe(900); // et non 800
    expect(queuedMovements()).toHaveLength(0); // file vidée
    expect((await tables.accounts.get('acc-1'))?.balance).toBe(900);
  });

  it('hors ligne : rien n\'est envoyé, le solde local bouge et le mouvement part en file', async () => {
    seedAccount('acc-1', 1000);
    setOnline(false);

    const result = await accountService.applyBalanceMovement('acc-1', USER_ID, -10, {
      kind: 'transaction',
    });

    expect(result?.balance).toBe(990);
    expect(server.calls).toHaveLength(0);
    expect(queuedMovements()).toHaveLength(1);

    // Retour en ligne : le mouvement monte, une seule fois.
    setOnline(true);
    await syncManager.processSyncQueue(true);
    expect(server.balances.get('acc-1')).toBe(990);
    expect(server.applied.size).toBe(1);
    expect(queuedMovements()).toHaveLength(0);
  });
});

describe('transactionService — plus aucun solde absolu', () => {
  it("updateAccountBalanceAfterTransaction n'appelle jamais updateAccount avec un solde", async () => {
    seedAccount('acc-1', 1000);
    const updateSpy = vi.spyOn(accountService, 'updateAccount');

    await (transactionService as any).updateAccountBalanceAfterTransaction(
      'acc-1',
      -250,
      USER_ID,
      'tx-9'
    );

    expect(updateSpy).not.toHaveBeenCalled();
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0]).toMatchObject({ p_delta: -250, p_source_transaction_id: 'tx-9' });
    expect(server.balances.get('acc-1')).toBe(750);
    // Et aucun PATCH `accounts` ne porte de solde.
    expect(server.accountPatches.every((p) => !('balance' in (p.payload || {})))).toBe(true);
    updateSpy.mockRestore();
  });
});

describe('ajustement manuel', () => {
  it("envoie l'écart entre le solde saisi et le solde affiché, en genre « ajustement »", async () => {
    seedAccount('acc-1', 840);

    // Reproduit exactement ce que fait la page compte : delta = saisi − affiché.
    const soldeAffiche = 840;
    const soldeSaisi = 1000;
    await accountService.applyBalanceMovement('acc-1', USER_ID, soldeSaisi - soldeAffiche, {
      kind: 'ajustement',
    });

    expect(server.calls[0]).toMatchObject({ p_delta: 160, p_kind: 'ajustement' });
    expect(server.balances.get('acc-1')).toBe(1000);
  });
});

describe('updateAccount — le solde est ignoré côté serveur', () => {
  it('journalise un avertissement et ne transmet pas le champ balance', async () => {
    seedAccount('acc-1', 1000);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await accountService.updateAccount('acc-1', USER_ID, {
      name: 'Nouveau nom',
      balance: 999999,
    } as any);

    expect(
      warnSpy.mock.calls.some((call) =>
        String(call[0]).includes('updateAccount: balance ignored, use applyBalanceMovement')
      )
    ).toBe(true);

    const patch = apiServiceMock.updateAccount.mock.calls[0]?.[1] ?? {};
    expect(patch).toHaveProperty('name', 'Nouveau nom');
    expect(patch).not.toHaveProperty('balance');
    warnSpy.mockRestore();
  });

  it("ne met rien en file quand seul le solde était fourni (hors ligne)", async () => {
    seedAccount('acc-1', 1000);
    setOnline(false);

    await accountService.updateAccount('acc-1', USER_ID, { balance: 12345 } as any);

    const accountOps = [...tables.syncQueue.rows.values()].filter(
      (op) => op.table_name === 'accounts'
    );
    expect(accountOps).toHaveLength(0);
  });
});

describe('file héritée — solde absolu produit par les versions antérieures', () => {
  it('retire le champ balance au rejeu et traite l\'opération', async () => {
    seedAccount('acc-1', 1000);
    const before = syncManager.getLegacyAbsoluteBalanceDropCount();
    await tables.syncQueue.add({
      id: 'op-legacy',
      userId: USER_ID,
      operation: 'UPDATE',
      table_name: 'accounts',
      data: { id: 'acc-1', name: 'Renommé', balance: 6027450.66 },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
    });

    await syncManager.processSyncQueue(true);

    expect(syncManager.getLegacyAbsoluteBalanceDropCount()).toBe(before + 1);
    const patch = server.accountPatches.find((p) => p.id === 'acc-1');
    expect(patch?.payload).toMatchObject({ name: 'Renommé' });
    expect(patch?.payload).not.toHaveProperty('balance');
    expect(tables.syncQueue.rows.has('op-legacy')).toBe(false);
  });

  it("considère l'opération traitée quand il ne restait que le solde", async () => {
    seedAccount('acc-1', 1000);
    await tables.syncQueue.add({
      id: 'op-legacy-seul',
      userId: USER_ID,
      operation: 'UPDATE',
      table_name: 'accounts',
      data: { id: 'acc-1', balance: 41847.97 },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
    });

    await syncManager.processSyncQueue(true);

    expect(server.accountPatches).toHaveLength(0); // rien n'est parti au serveur
    expect(tables.syncQueue.rows.has('op-legacy-seul')).toBe(false); // opération soldée
  });
});

describe('rafraîchissement de fond des comptes', () => {
  it('écrit le solde serveur augmenté des mouvements encore en attente', async () => {
    seedAccount('acc-1', 1000);
    await tables.syncQueue.add({
      id: 'op-attente',
      userId: USER_ID,
      operation: 'CREATE',
      table_name: 'account_balance_movements',
      data: { id: 'mov-1', accountId: 'acc-1', delta: -40, kind: 'transaction' },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
    });
    apiServiceMock.getAllAccountsPaged.mockResolvedValueOnce({
      success: true,
      complete: true,
      data: [
        {
          id: 'acc-1',
          user_id: USER_ID,
          name: 'Compte acc-1',
          type: 'especes',
          balance: 5000,
          currency: 'MGA',
          is_default: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    } as any);

    await accountService.refreshAccountsFromSupabase(USER_ID);

    expect((await tables.accounts.get('acc-1'))?.balance).toBe(4960); // 5000 − 40
  });

  it('conserve les champs locaux (hors solde) d\'un compte dont la modification attend encore', async () => {
    seedAccount('acc-1', 1000, { name: 'Nom local récent' });
    await tables.syncQueue.add({
      id: 'op-update',
      userId: USER_ID,
      operation: 'UPDATE',
      table_name: 'accounts',
      data: { id: 'acc-1', name: 'Nom local récent' },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
    });
    apiServiceMock.getAllAccountsPaged.mockResolvedValueOnce({
      success: true,
      complete: true,
      data: [
        {
          id: 'acc-1',
          user_id: USER_ID,
          name: 'Ancien nom serveur',
          type: 'especes',
          balance: 7000,
          currency: 'MGA',
          is_default: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    } as any);

    await accountService.refreshAccountsFromSupabase(USER_ID);

    const stored = await tables.accounts.get('acc-1');
    expect(stored?.name).toBe('Nom local récent'); // le local gagne…
    expect(stored?.balance).toBe(7000); // …sauf le solde, qui vient du serveur
  });

  it('ignore les comptes d\'un autre utilisateur et déclenche la réconciliation', async () => {
    seedAccount('acc-1', 1000);
    seedAccount('acc-autre', 50, {}, OTHER_USER_ID);
    apiServiceMock.getAllAccountsPaged.mockResolvedValueOnce({
      success: true,
      complete: true,
      data: [
        {
          id: 'acc-1',
          user_id: USER_ID,
          name: 'Compte acc-1',
          type: 'especes',
          balance: 1000,
          currency: 'MGA',
          is_default: false,
          created_at: '2026-01-01T00:00:00Z',
        },
        {
          id: 'acc-autre',
          user_id: OTHER_USER_ID,
          name: 'Compte autre',
          type: 'especes',
          balance: 50,
          currency: 'MGA',
          is_default: false,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    } as any);

    await accountService.refreshAccountsFromSupabase(USER_ID);

    expect(reconcileStoreMock).toHaveBeenCalledTimes(1);
    const options = (reconcileStoreMock.mock.calls[0] as any[])[0];
    expect(options.storeName).toBe('accounts');
    expect(options.userId).toBe(USER_ID);
    // Le compte de l'autre utilisateur n'entre pas dans la portée comparée.
    expect(options.serverIds).toEqual(['acc-1']);
    expect(options.localRows.map((r: any) => r.id)).toEqual(['acc-1']);
  });

  it('ne lance qu\'un seul rafraîchissement à la fois', async () => {
    seedAccount('acc-1', 1000);
    await Promise.all([
      accountService.refreshAccountsFromSupabase(USER_ID),
      accountService.refreshAccountsFromSupabase(USER_ID),
      accountService.refreshAccountsFromSupabase(USER_ID),
    ]);
    expect(apiServiceMock.getAllAccountsPaged).toHaveBeenCalledTimes(1);
  });
});

describe('rafraîchissement de fond des budgets', () => {
  it('n\'écrase pas un budget dont une écriture attend encore de monter', async () => {
    tables.budgets.seed([
      { id: 'bud-1', userId: USER_ID, category: 'alimentation', amount: 999, spent: 0, period: 'monthly', year: 2026, month: 9 },
      { id: 'bud-2', userId: USER_ID, category: 'transport', amount: 100, spent: 0, period: 'monthly', year: 2026, month: 9 },
    ]);
    await tables.syncQueue.add({
      id: 'op-budget',
      userId: USER_ID,
      operation: 'UPDATE',
      table_name: 'budgets',
      data: { id: 'bud-1', amount: 999 },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
    });
    apiServiceMock.getAllBudgetsPaged.mockResolvedValueOnce({
      success: true,
      complete: true,
      data: [
        { id: 'bud-1', user_id: USER_ID, category: 'alimentation', amount: 111, spent: 0, period: 'monthly', year: 2026, month: 9 },
        { id: 'bud-2', user_id: USER_ID, category: 'transport', amount: 222, spent: 0, period: 'monthly', year: 2026, month: 9 },
      ],
    } as any);

    await budgetService.refreshBudgetsFromSupabase(USER_ID);

    expect((await tables.budgets.get('bud-1'))?.amount).toBe(999); // protégé
    expect((await tables.budgets.get('bud-2'))?.amount).toBe(222); // rafraîchi
    expect(reconcileStoreMock).toHaveBeenCalledTimes(1);
    expect((reconcileStoreMock.mock.calls[0] as any[])[0].storeName).toBe('budgets');
  });
});
