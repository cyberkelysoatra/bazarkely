/**
 * Synchronisation Dexie ⇄ Supabase pour le module gestion-eau.
 *
 * Principes (cf. CLAUDE.md) :
 *  - Offline-first : on écrit TOUJOURS Dexie d'abord ; le push réseau est best-effort.
 *  - Idempotence : tout CREATE/UPDATE transmet l'id client et passe par `upsert`
 *    (onConflict = PK) → un envoi « expiré-mais-commité » et un rejeu convergent sur
 *    la même ligne (jamais de doublon). Le champ Dexie-only `_dirty` est retiré avant envoi.
 *  - `withTimeout()` sur tout `supabase.from()` (les requêtes peuvent hanger).
 *  - Jamais de `getUser()` ici (réseau) — l'auth est portée par les services appelants.
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import { eauDb, EAU_TABLES, type EauTableName } from '../db/gestionEauDb';
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
 * Pousse vers Supabase tous les enregistrements `_dirty` d'une table (upsert idempotent).
 * Au succès, repasse `_dirty` à false en local. Best-effort : avale les erreurs réseau.
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
      console.warn(`⚠️ [eauSync] push ${table} échec:`, error.message);
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
 * Tire depuis Supabase toutes les lignes d'une table vers Dexie.
 * Un enregistrement local `_dirty` n'est JAMAIS écrasé (le local en attente gagne
 * jusqu'à son push). Les autres sont remplacés par la version serveur (`_dirty:false`).
 *
 * `ok` = le serveur a RÉPONDU (requête réussie, même si 0 ligne). `ok:false` =
 * erreur réseau / timeout / réponse non exploitable. Ce drapeau permet de distinguer
 * « confirmé : aucune donnée serveur » de « non résolu : pull raté » — crucial pour
 * la garde d'accès (ne jamais conclure « aucun rôle » sur un simple échec de pull).
 */
export async function pullTable(table: EauTableName): Promise<{ pulled: number; ok: boolean }> {
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
    let pulled = 0;
    for (const row of data) {
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

/** Push puis pull de TOUTES les tables (ordre : push d'abord pour ne pas perdre le local). */
export async function syncAll(): Promise<void> {
  if (!isOnline()) return;
  for (const t of EAU_TABLES) {
    await pushTable(t);
  }
  for (const t of EAU_TABLES) {
    await pullTable(t);
  }
}

/** Pull de toutes les tables (au montage / retour online) — sans bloquer l'UI. */
export async function pullAll(): Promise<void> {
  if (!isOnline()) return;
  for (const t of EAU_TABLES) {
    await pullTable(t);
  }
}

/**
 * Écrit un enregistrement en local (marqué `_dirty`) puis tente un push best-effort.
 * Ne JETTE jamais pour cause réseau : l'écriture locale fait foi (offline-first).
 */
export async function saveLocal<T extends LocalMeta>(table: EauTableName, record: T): Promise<T> {
  const toStore = { ...record, _dirty: true } as T;
  await eauDb.table(table).put(toStore);
  // Push best-effort, non bloquant
  if (isOnline()) {
    void pushTable(table).catch(() => {});
  }
  return toStore;
}

/**
 * Compte les enregistrements en attente de synchronisation (`_dirty`) sur toutes
 * les tables — alimente le badge « N en attente de sync » de l'UI terrain.
 */
export async function countDirty(): Promise<number> {
  let total = 0;
  for (const t of EAU_TABLES) {
    const all = (await eauDb.table(t).toArray()) as LocalMeta[];
    total += all.filter((r) => r._dirty === true).length;
  }
  return total;
}

/** Supprime un enregistrement en local + Supabase (best-effort). */
export async function deleteLocal(table: EauTableName, id: string): Promise<void> {
  await eauDb.table(table).delete(id);
  if (isOnline()) {
    const pk = PK_BY_TABLE[table];
    void withTimeout(
      supabase.from(table).delete().eq(pk, id) as any,
      SYNC_TIMEOUT_MS,
      `eau:delete:${table}`
    ).catch(() => {});
  }
}
