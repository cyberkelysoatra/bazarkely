/**
 * LOT B-1 — Suppressions offline-first via TOMBSTONES (eauSync).
 *
 * On vérifie le comportement de `deleteLocal` / `flushTombstones` / `pullTable` sans
 * IndexedDB ni réseau réels : `gestionEauDb` et `lib/supabase` sont remplacés par des
 * fakes en mémoire pilotables (online/offline, succès/échec serveur). Cible :
 *  - suppression HORS-LIGNE → tombstone conservé, ligne ABSENTE en local ;
 *  - retour en ligne → rejeu idempotent → ligne supprimée côté serveur, tombstone purgé ;
 *  - `pullTable` ne « ressuscite » pas une ligne dont la PK est tombstonée ;
 *  - rejeu idempotent (flush deux fois sans erreur).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// vi.hoisted : les fakes doivent exister AVANT l'évaluation des vi.mock (hoistés en tête).
const H = vi.hoisted(() => {
  interface Row { [k: string]: any }
  function makeTable(pk = 'id') {
    let rows: Row[] = [];
    return {
      _seed: (rs: Row[]) => { rows = rs.map((r) => ({ ...r })); },
      toArray: async () => rows.map((r) => ({ ...r })),
      get: async (id: any) => { const f = rows.find((r) => r[pk] === id); return f ? { ...f } : undefined; },
      put: async (rec: Row) => {
        const i = rows.findIndex((r) => r[pk] === rec[pk]);
        if (i >= 0) rows[i] = { ...rec }; else rows.push({ ...rec });
        return rec[pk];
      },
      update: async (id: any, patch: Row) => {
        const i = rows.findIndex((r) => r[pk] === id);
        if (i >= 0) rows[i] = { ...rows[i], ...patch };
        return 1;
      },
      delete: async (id: any) => { rows = rows.filter((r) => r[pk] !== id); return 1; },
      count: async () => rows.length,
      where: (field: string) => ({
        equals: (val: any) => ({ toArray: async () => rows.filter((r) => r[field] === val).map((r) => ({ ...r })) }),
      }),
    };
  }
  const tables: Record<string, any> = { eau_compteurs: makeTable('id'), eau_deletions: makeTable('id') };
  const eauDbFake: any = { table: (name: string) => tables[name], get eau_deletions() { return tables.eau_deletions; } };
  const state = { serverFail: false, serverRows: {} as Record<string, Row[]>, deleteCalls: [] as Array<{ table: string; id: any }> };
  return { tables, eauDbFake, state };
});

vi.mock('../db/gestionEauDb', () => ({
  eauDb: H.eauDbFake,
  EAU_TABLES: ['eau_compteurs'],
}));

vi.mock('../../../lib/supabase', () => ({
  withTimeout: (p: Promise<any>) => p,
  supabase: {
    from: (table: string) => ({
      upsert: async () => ({ error: null }),
      select: async () => ({ data: H.state.serverRows[table] ?? [], error: null }),
      delete: () => ({
        eq: async (_pk: string, id: any) => {
          H.state.deleteCalls.push({ table, id });
          if (H.state.serverFail) return { error: { message: 'timeout simulé' } };
          H.state.serverRows[table] = (H.state.serverRows[table] ?? []).filter((r) => r.id !== id);
          return { error: null };
        },
      }),
    }),
  },
}));

function setOnline(v: boolean) {
  // navigator.onLine est défini `writable:true` dans src/test/setup.ts → assignation directe.
  (navigator as any).onLine = v;
}

import { deleteLocal, flushTombstones, pullTable } from '../services/eauSync';

const { tables, state } = H;

beforeEach(() => {
  tables.eau_compteurs._seed([]);
  tables.eau_deletions._seed([]);
  state.serverFail = false;
  state.serverRows = {};
  state.deleteCalls.length = 0;
  setOnline(true);
});

describe('deleteLocal — tombstones offline-first', () => {
  it('suppression EN LIGNE confirmée → ligne locale absente, aucun tombstone résiduel', async () => {
    tables.eau_compteurs._seed([{ id: 'c1', nom: 'A', _dirty: false }]);
    state.serverRows.eau_compteurs = [{ id: 'c1', nom: 'A' }];

    await deleteLocal('eau_compteurs', 'c1');

    expect(await tables.eau_compteurs.get('c1')).toBeUndefined();
    expect(await tables.eau_deletions.count()).toBe(0); // tombstone purgé après succès
    expect(state.serverRows.eau_compteurs).toHaveLength(0); // supprimée côté serveur
  });

  it('suppression HORS-LIGNE → ligne absente en local + tombstone conservé pour rejeu', async () => {
    setOnline(false);
    tables.eau_compteurs._seed([{ id: 'c1', nom: 'A', _dirty: false }]);
    state.serverRows.eau_compteurs = [{ id: 'c1', nom: 'A' }];

    await deleteLocal('eau_compteurs', 'c1');

    expect(await tables.eau_compteurs.get('c1')).toBeUndefined();
    expect(await tables.eau_deletions.count()).toBe(1); // en attente de rejeu
    expect(state.deleteCalls).toHaveLength(0); // aucun appel serveur hors-ligne
  });

  it('retour en ligne → flushTombstones rejoue et purge (idempotent)', async () => {
    setOnline(false);
    tables.eau_compteurs._seed([{ id: 'c1', _dirty: false }]);
    state.serverRows.eau_compteurs = [{ id: 'c1' }];
    await deleteLocal('eau_compteurs', 'c1');

    setOnline(true);
    const r1 = await flushTombstones();
    expect(r1.deleted).toBe(1);
    expect(state.serverRows.eau_compteurs).toHaveLength(0);
    expect(await tables.eau_deletions.count()).toBe(0);

    // Rejeu idempotent : plus rien à supprimer, aucune erreur.
    const r2 = await flushTombstones();
    expect(r2.deleted).toBe(0);
  });

  it('réponse serveur lente/échec → tombstone conservé puis purgé au rejeu suivant', async () => {
    state.serverFail = true; // 1ʳᵉ tentative échoue (timeout simulé)
    tables.eau_compteurs._seed([{ id: 'c1', _dirty: false }]);
    state.serverRows.eau_compteurs = [{ id: 'c1' }];

    await deleteLocal('eau_compteurs', 'c1');
    expect(await tables.eau_deletions.count()).toBe(1); // pas confirmé → conservé

    state.serverFail = false; // le réseau se rétablit
    await flushTombstones();
    expect(state.serverRows.eau_compteurs).toHaveLength(0);
    expect(await tables.eau_deletions.count()).toBe(0);
  });
});

describe('pullTable — anti-résurrection', () => {
  it('ne réinsère PAS une ligne dont la PK est tombstonée (suppression en attente)', async () => {
    setOnline(false);
    tables.eau_compteurs._seed([{ id: 'c1', _dirty: false }]);
    await deleteLocal('eau_compteurs', 'c1'); // offline → tombstone conservé
    setOnline(true);

    state.serverRows.eau_compteurs = [{ id: 'c1', nom: 'A' }, { id: 'c2', nom: 'B' }];
    const res = await pullTable('eau_compteurs');

    expect(res.ok).toBe(true);
    expect(await tables.eau_compteurs.get('c1')).toBeUndefined(); // pas ressuscitée
    expect(await tables.eau_compteurs.get('c2')).toBeTruthy(); // les autres oui
  });
});
