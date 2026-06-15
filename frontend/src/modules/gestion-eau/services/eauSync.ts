/**
 * Synchronisation Dexie ⇄ Supabase pour le module gestion-eau.
 *
 * Principes (cf. CLAUDE.md) :
 *  - Offline-first : on écrit TOUJOURS Dexie d'abord ; le push réseau est best-effort.
 *  - Idempotence : tout CREATE/UPDATE transmet l'id client et passe par `upsert`
 *    (onConflict = PK) → un envoi « expiré-mais-commité » et un rejeu convergent sur
 *    la même ligne (jamais de doublon). Le champ Dexie-only `_dirty` est retiré avant envoi.
 *  - Suppressions idempotentes & rejouables : tout DELETE écrit un TOMBSTONE local
 *    (store `eau_deletions`) ; tant qu'il n'est pas confirmé côté serveur, il est rejoué
 *    au retour en ligne et empêche le pull de « ressusciter » la ligne supprimée.
 *  - `withTimeout()` sur tout `supabase.from()` (les requêtes peuvent hanger).
 *  - Jamais de `getUser()` ici (réseau) — l'auth est portée par les services appelants.
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import { eauDb, EAU_TABLES, type EauTableName } from '../db/gestionEauDb';
import { nowIso } from '../utils/id';
import type { LocalMeta } from '../types/gestionEau';

/** Colonne de conflit (PK) par table — la plupart = 'id', sauf eau_roles. */
const PK_BY_TABLE: Record<EauTableName, string> = {
  eau_compteurs: 'id',
  eau_qr_compteur: 'id',
  eau_releves_compteur: 'id',
  eau_releves_bassin: 'id',
  eau_entrees_bassin: 'id',
  eau_bilans: 'id',
  eau_debit_tests: 'id',
  eau_arrets_pompe: 'id',
  eau_elec_releves_compteur: 'id',
  eau_elec_couts: 'id',
  eau_factures: 'id',
  eau_config: 'id',
  eau_roles: 'user_id',
  eau_comptes_client: 'id',
  eau_demandes_acces: 'id',
  eau_invitations: 'id',
  eau_scans: 'id',
  eau_alertes: 'id',
  eau_audit: 'id',
  eau_annonces: 'id',
};

const SYNC_TIMEOUT_MS = 8000;

/** Retire les champs techniques locaux avant tout envoi à Supabase. */
function stripLocal<T extends LocalMeta>(record: T): Omit<T, '_dirty'> {
  const { _dirty, ...rest } = record;
  return rest as Omit<T, '_dirty'>;
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/**
 * Journalise un échec de push en distinguant les erreurs NON-REJOUABLES (schéma /
 * colonne manquante → `PGRST204`, le piège « drift muet » du CLAUDE.md) des simples
 * timeouts/erreurs réseau (rejouables). Une ligne restée `_dirty` pour cause de drift
 * doit être visible dans la console, pas avalée silencieusement.
 */
function logPushError(table: EauTableName, error: { code?: string; message?: string } | null): void {
  const code = error?.code;
  const message = error?.message ?? '';
  const isSchemaDrift =
    code === 'PGRST204' || code === '42703' || /could not find the .* column|does not exist/i.test(message);
  if (isSchemaDrift) {
    console.error(
      `🛑 [eauSync] push ${table} REJET NON-REJOUABLE (schéma/colonne) code=${code ?? '?'} : ${message}. ` +
        `La ligne reste _dirty → drift modèle Dexie↔Supabase probable (ALTER TABLE ADD COLUMN manquant).`
    );
  } else {
    console.warn(`⚠️ [eauSync] push ${table} échec (rejouable) : ${message}`);
  }
}

// ───────────────────────────── Push ─────────────────────────────

/**
 * Pousse vers Supabase tous les enregistrements `_dirty` d'une table (upsert idempotent).
 * Au succès, repasse `_dirty` à false en local. Best-effort : avale les erreurs réseau.
 * Utilisé pour le flush global (`syncAll`). Pour une saisie unitaire, préférer `pushOne`.
 */
export async function pushTable(table: EauTableName): Promise<{ pushed: number }> {
  const dexieTable = eauDb.table(table);
  const all = (await dexieTable.toArray()) as LocalMeta[];
  const dirty = all.filter((r) => r._dirty === true);
  if (dirty.length === 0) return { pushed: 0 };

  const pk = PK_BY_TABLE[table];
  const rows = dirty.map((r) => stripLocal(r));

  try {
    const { error } = (await withTimeout(
      supabase.from(table).upsert(rows as any, { onConflict: pk }) as any,
      SYNC_TIMEOUT_MS,
      `eau:push:${table}`
    )) as any;
    if (error) {
      logPushError(table, error);
      return { pushed: 0 };
    }
    // Succès → effacer le flag _dirty
    await Promise.all(
      dirty.map((r) => dexieTable.update((r as any)[pk], { _dirty: false } as any))
    );
    return { pushed: dirty.length };
  } catch (e: any) {
    // Timeout ≠ échec : la ligne a pu être commitée. On NE supprime rien ; on retentera.
    console.warn(`⚠️ [eauSync] push ${table} timeout/erreur (rejouable):`, e?.message);
    return { pushed: 0 };
  }
}

/**
 * Pousse UNE ligne fraîchement écrite (par sa PK), au lieu de re-scanner toute la table.
 * Évite le coût O(N) de `pushTable` à chaque saisie (le `toArray()` grossit avec
 * l'historique hors-ligne). Idempotent (`upsert` + id client), best-effort.
 */
export async function pushOne(table: EauTableName, pkValue: string): Promise<{ pushed: number }> {
  const dexieTable = eauDb.table(table);
  const pk = PK_BY_TABLE[table];
  const row = (await dexieTable.get(pkValue)) as LocalMeta | undefined;
  if (!row || row._dirty !== true) return { pushed: 0 };
  const payload = stripLocal(row);

  try {
    const { error } = (await withTimeout(
      supabase.from(table).upsert(payload as any, { onConflict: pk }) as any,
      SYNC_TIMEOUT_MS,
      `eau:pushOne:${table}`
    )) as any;
    if (error) {
      logPushError(table, error);
      return { pushed: 0 };
    }
    await dexieTable.update(pkValue as any, { _dirty: false } as any);
    return { pushed: 1 };
  } catch (e: any) {
    console.warn(`⚠️ [eauSync] pushOne ${table} timeout/erreur (rejouable):`, e?.message);
    return { pushed: 0 };
  }
}

// ───────────────────────── Tombstones (suppressions) ─────────────────────────

/** PK déterministe d'un tombstone → idempotent (re-supprimer écrase le même tombstone). */
function tombstoneId(table: EauTableName, pkValue: string): string {
  return `${table}:${pkValue}`;
}

/** Tente le DELETE serveur d'une ligne (idempotent : `WHERE pk = id`). Retourne true au succès. */
async function tryServerDelete(table: EauTableName, pkValue: string): Promise<boolean> {
  const pk = PK_BY_TABLE[table];
  try {
    const { error } = (await withTimeout(
      supabase.from(table).delete().eq(pk, pkValue) as any,
      SYNC_TIMEOUT_MS,
      `eau:delete:${table}`
    )) as any;
    if (error) {
      console.warn(`⚠️ [eauSync] delete ${table} échec (rejouable):`, error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn(`⚠️ [eauSync] delete ${table} timeout/erreur (rejouable):`, e?.message);
    return false;
  }
}

/**
 * Rejoue tous les tombstones non confirmés (suppressions hors-ligne ou expirées-mais-
 * non-confirmées). Chaque DELETE est idempotent ; un tombstone confirmé est purgé.
 */
export async function flushTombstones(): Promise<{ deleted: number }> {
  if (!isOnline()) return { deleted: 0 };
  const tombs = await eauDb.eau_deletions.toArray();
  let deleted = 0;
  for (const t of tombs) {
    const ok = await tryServerDelete(t.table as EauTableName, t.pk_value);
    if (ok) {
      await eauDb.eau_deletions.delete(t.id);
      deleted++;
    }
  }
  return { deleted };
}

// ───────────────────────────── Pull ─────────────────────────────

const inFlightPulls = new Map<EauTableName, Promise<{ pulled: number; ok: boolean }>>();

/**
 * Tire depuis Supabase toutes les lignes d'une table vers Dexie — avec dé-doublonnage
 * des appels CONCURRENTS (un seul pull en vol par table : au boot, `pullAll()` et
 * `ensureRolesBootstrap()` demandent tous deux `eau_roles` → un seul aller-retour réseau).
 */
export async function pullTable(table: EauTableName): Promise<{ pulled: number; ok: boolean }> {
  const existing = inFlightPulls.get(table);
  if (existing) return existing;
  const p = doPullTable(table).finally(() => inFlightPulls.delete(table));
  inFlightPulls.set(table, p);
  return p;
}

/**
 * Implémentation du pull (cf. `pullTable` pour la dé-duplication concurrente).
 * Un enregistrement local `_dirty` n'est JAMAIS écrasé (le local en attente gagne
 * jusqu'à son push). Une ligne dont la PK figure dans un tombstone non confirmé n'est
 * PAS réinsérée (sinon une suppression hors-ligne « ressusciterait » au pull suivant).
 *
 * `ok` = le serveur a RÉPONDU (requête réussie, même si 0 ligne). `ok:false` =
 * erreur réseau / timeout / réponse non exploitable.
 */
async function doPullTable(table: EauTableName): Promise<{ pulled: number; ok: boolean }> {
  try {
    const { data, error } = (await withTimeout(
      supabase.from(table).select('*') as any,
      SYNC_TIMEOUT_MS,
      `eau:pull:${table}`
    )) as any;
    if (error || !Array.isArray(data)) {
      if (error) console.warn(`⚠️ [eauSync] pull ${table} échec:`, error.message);
      return { pulled: 0, ok: false };
    }

    const dexieTable = eauDb.table(table);
    const pk = PK_BY_TABLE[table];
    // Suppressions en attente pour cette table → ne pas ré-insérer ces PK.
    const tombs = await eauDb.eau_deletions.where('table').equals(table).toArray();
    const tombSet = new Set(tombs.map((t) => t.pk_value));
    let pulled = 0;
    for (const row of data) {
      const pkValue = String((row as any)[pk]);
      if (tombSet.has(pkValue)) continue; // suppression locale en attente → ne pas ressusciter
      const local = (await dexieTable.get((row as any)[pk])) as LocalMeta | undefined;
      if (local?._dirty === true) continue; // local en attente → ne pas écraser
      await dexieTable.put({ ...(row as any), _dirty: false });
      pulled++;
    }
    return { pulled, ok: true };
  } catch (e: any) {
    console.warn(`⚠️ [eauSync] pull ${table} timeout/erreur:`, e?.message);
    return { pulled: 0, ok: false };
  }
}

// ───────────────────────────── Orchestration ─────────────────────────────

/**
 * Push puis pull de TOUTES les tables. Ordre : rejeu des suppressions (tombstones) →
 * push des créations/maj `_dirty` → pull. Les suppressions d'abord pour qu'une ligne
 * supprimée hors-ligne ne soit pas re-tirée puis re-supprimée à chaque cycle.
 */
export async function syncAll(): Promise<void> {
  if (!isOnline()) return;
  await flushTombstones();
  for (const t of EAU_TABLES) {
    await pushTable(t);
  }
  for (const t of EAU_TABLES) {
    await pullTable(t);
  }
}

/** Pull de toutes les tables (au montage / retour online) — sans bloquer l'UI.
 *  Rejoue d'abord les suppressions en attente (anti-résurrection).
 *  `exclude` : tables à NE PAS tirer ici (au boot, `eau_roles`/`eau_comptes_client` sont
 *  déjà tirées — une seule fois — par `ensureRolesBootstrap`, on évite le double pull). */
export async function pullAll(exclude?: readonly EauTableName[]): Promise<void> {
  if (!isOnline()) return;
  await flushTombstones();
  const skip = new Set(exclude ?? []);
  for (const t of EAU_TABLES) {
    if (skip.has(t)) continue;
    await pullTable(t);
  }
}

/**
 * Écrit un enregistrement en local (marqué `_dirty`) puis tente un push best-effort
 * CIBLÉ (la ligne seule, pas toute la table). Ne JETTE jamais pour cause réseau :
 * l'écriture locale fait foi (offline-first).
 */
export async function saveLocal<T extends LocalMeta>(table: EauTableName, record: T): Promise<T> {
  const toStore = { ...record, _dirty: true } as T;
  await eauDb.table(table).put(toStore);
  // Push best-effort de la seule ligne écrite (O(1)), non bloquant.
  if (isOnline()) {
    const pkValue = String((toStore as any)[PK_BY_TABLE[table]]);
    void pushOne(table, pkValue).catch(() => {});
  }
  return toStore;
}

/**
 * Compte les enregistrements en attente de synchronisation (`_dirty`) + les suppressions
 * non confirmées (tombstones) — alimente le badge « N en attente de sync » de l'UI terrain.
 */
export async function countDirty(): Promise<number> {
  let total = 0;
  for (const t of EAU_TABLES) {
    const all = (await eauDb.table(t).toArray()) as LocalMeta[];
    total += all.filter((r) => r._dirty === true).length;
  }
  total += await eauDb.eau_deletions.count();
  return total;
}

/**
 * Supprime un enregistrement en local + écrit un TOMBSTONE, puis tente le DELETE serveur
 * (en l'AWAITANT) si en ligne. Succès → purge du tombstone. Échec / timeout / hors-ligne →
 * le tombstone est conservé et rejoué par `flushTombstones()` (au retour en ligne, ou au
 * prochain `pullAll`/`syncAll`). Garantit qu'une suppression n'est jamais perdue ni annulée
 * par un pull ultérieur.
 */
export async function deleteLocal(table: EauTableName, id: string): Promise<void> {
  await eauDb.table(table).delete(id);
  await eauDb.eau_deletions.put({
    id: tombstoneId(table, id),
    table,
    pk_value: id,
    deleted_at: nowIso(),
  });
  if (isOnline()) {
    const ok = await tryServerDelete(table, id);
    if (ok) await eauDb.eau_deletions.delete(tombstoneId(table, id));
  }
}
