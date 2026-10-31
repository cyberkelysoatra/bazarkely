/**
 * Socle RTB Énergie (ELEC-CC-02) : réglages, clients et compteurs d'électricité.
 * Offline-first : lecture Dexie, écriture `saveLocal` (upsert idempotent par id client),
 * suppression par tombstone. Une table refusée par la RLS (0 ligne) n'est pas une erreur.
 */
import { eauDb, type EauTableName } from '../db/gestionEauDb';
import { pullTable, pushTable, pushOne, saveLocal, deleteLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import {
  ELEC_REGLAGES_ID,
  type ElecClientLocal,
  type ElecCompteurLocal,
  type ElecReglagesLocal,
  type ElecStatut,
  type LocalMeta,
} from '../types/gestionEau';

/** Tables du domaine électricité (ordre des clés étrangères). */
export const ELEC_TABLES = [
  'eau_elec_reglages',
  'eau_elec_clients',
  'eau_elec_compteurs',
  'eau_elec_releves_compteur',
] as const;

/** Repère du tirage forcé de la 3.115.0 (mémento §17). */
export const ELEC_RESYNC_KEY = 'eau_elec_resync_3_115_0';

/**
 * Premier lancement en ligne de la 3.115.0 : vide les lignes électricité locales déjà
 * synchronisées (jamais celles en attente d'envoi) puis tire tout du serveur, pour
 * qu'aucun appareil ne garde un état d'avant la migration. Ne se refait qu'en cas d'échec.
 */
export async function forceResyncElecUneFois(online: boolean): Promise<boolean> {
  if (!online) return false;
  try {
    if (localStorage.getItem(ELEC_RESYNC_KEY) === '1') return false;
  } catch {
    /* localStorage indisponible : on tire quand même */
  }
  for (const t of ELEC_TABLES) {
    const table = eauDb.table(t);
    const all = (await table.toArray()) as Array<LocalMeta & { id: string }>;
    const propres = all.filter((r) => r._dirty !== true).map((r) => r.id);
    if (propres.length > 0) await table.bulkDelete(propres);
  }
  let ok = true;
  for (const t of ELEC_TABLES) {
    const res = await pullTable(t);
    ok = ok && res.ok;
  }
  if (ok) {
    try {
      localStorage.setItem(ELEC_RESYNC_KEY, '1');
    } catch {
      /* ignoré */
    }
  }
  return ok;
}

/**
 * Au montage d'un écran du domaine, en ligne : renvoie d'abord ce qui attend (dans l'ordre
 * des clés étrangères, un compteur créé juste après son client a pu être refusé), puis tire.
 */
export async function refreshElec(online: boolean): Promise<void> {
  if (!online) return;
  for (const t of ELEC_TABLES) await pushTable(t);
  for (const t of ELEC_TABLES) await pullTable(t);
}

/**
 * Écrit une ligne en local (`_dirty`) TOUT DE SUITE, puis, en arrière-plan, envoie ses
 * parents encore en attente (client, compteur) avant elle : la saisie n'attend jamais le
 * réseau, et la clé étrangère n'est pas refusée faute de parent.
 */
export async function saveLocalApresParents<T extends LocalMeta & { id: string }>(
  table: EauTableName,
  record: T,
  compteurId: string | null,
  clientId: string | null
): Promise<T> {
  const toStore = { ...record, _dirty: true } as T;
  await eauDb.table(table).put(toStore);
  if (typeof navigator === 'undefined' || navigator.onLine) {
    void (async () => {
      await pousserParents(compteurId, clientId);
      await pushOne(table, record.id);
    })().catch(() => {});
  }
  return toStore;
}

/** Envoie le client puis le compteur s'ils attendent encore, avant d'écrire une ligne qui en dépend. */
export async function pousserParents(compteurId: string | null, clientId: string | null): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  let cid = clientId;
  if (compteurId && !cid) {
    const c = (await eauDb.eau_elec_compteurs.get(compteurId)) as ElecCompteurLocal | undefined;
    cid = c?.client_id ?? null;
  }
  if (cid) await pushOne('eau_elec_clients', cid);
  if (compteurId) await pushOne('eau_elec_compteurs', compteurId);
}

// ───────────────────────────── Réglages ─────────────────────────────
export const REGLAGES_DEFAUT: ElecReglagesLocal = {
  id: ELEC_REGLAGES_ID,
  raison_sociale: null,
  forme_juridique: null,
  siege: null,
  nif: null,
  stat: null,
  rcs: null,
  telephone: null,
  email: null,
  banque: null,
  titulaire_compte: null,
  iban: null,
  bic: null,
  site: null,
  puissance_kwc: null,
  contrat_ref: null,
  tarif_kwh: 895,
  forfait_ht: 200000,
  tva_pct: 20,
  echeance_jours: 15,
  devise: 'MGA',
  numero_annee: 2026,
  numero_prochain: 50,
  mode_essai: true,
  created_at: null,
  updated_at: null,
};

export async function getReglages(): Promise<ElecReglagesLocal | null> {
  return ((await eauDb.eau_elec_reglages.get(ELEC_REGLAGES_ID)) as ElecReglagesLocal | undefined) ?? null;
}

export async function saveReglages(patch: Partial<ElecReglagesLocal>): Promise<ElecReglagesLocal> {
  const current = (await getReglages()) ?? REGLAGES_DEFAUT;
  return saveLocal('eau_elec_reglages', { ...current, ...patch, id: ELEC_REGLAGES_ID, updated_at: nowIso() });
}

// ───────────────────────────── Clients ─────────────────────────────
export async function listClients(): Promise<ElecClientLocal[]> {
  const all = (await eauDb.eau_elec_clients.toArray()) as ElecClientLocal[];
  return all.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}

export type ClientInput = Omit<ElecClientLocal, 'id' | 'created_at' | 'updated_at' | '_dirty'>;

export const CLIENT_VIDE: ClientInput = {
  code: '',
  nom: '',
  raison_sociale: null,
  adresse: null,
  nif: null,
  stat: null,
  email: null,
  telephone: null,
  facture_groupee: false,
  hors_domaine: false,
  statut: 'actif',
  user_id: null,
  notes_internes: null,
};

/** Code déjà pris par une autre fiche (comparaison exacte, sans normalisation). */
export function codeDejaPris(code: string, list: Array<{ id: string; code: string }>, excludeId?: string): boolean {
  return list.some((x) => x.code === code && x.id !== excludeId);
}

export async function saveClient(input: ClientInput, id?: string): Promise<ElecClientLocal> {
  const existing = id ? ((await eauDb.eau_elec_clients.get(id)) as ElecClientLocal | undefined) : undefined;
  const now = nowIso();
  return saveLocal('eau_elec_clients', {
    ...input,
    id: existing?.id ?? newId(),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  } as ElecClientLocal);
}

/** Supprime un client SANS compteur (la base refuse aussi : clé étrangère `restrict`). */
export async function deleteClient(id: string): Promise<boolean> {
  const n = await eauDb.eau_elec_compteurs.where('client_id').equals(id).count();
  if (n > 0) return false;
  await deleteLocal('eau_elec_clients', id);
  return true;
}

/** Le compte figure-t-il sur une fiche client électricité active ? (domaine du client, lecture locale) */
export async function estClientElec(userId: string): Promise<boolean> {
  const all = (await eauDb.eau_elec_clients.toArray()) as ElecClientLocal[];
  return all.some((c) => c.user_id === userId && c.statut === 'actif');
}

// ───────────────────────────── Compteurs ─────────────────────────────
export async function listCompteursElec(): Promise<ElecCompteurLocal[]> {
  return (await eauDb.eau_elec_compteurs.toArray()) as ElecCompteurLocal[];
}

export type CompteurElecInput = Omit<ElecCompteurLocal, 'id' | 'created_at' | 'updated_at' | '_dirty'>;

export const COMPTEUR_VIDE: CompteurElecInput = {
  code: '',
  bien: '',
  client_id: '',
  decimales: 2,
  statut: 'actif',
  remplace_compteur_id: null,
  date_mise_en_service: null,
  date_arret: null,
  index_reprise: null,
  date_index_reprise: null,
  ordre: null,
  note: null,
};

export async function saveCompteurElec(input: CompteurElecInput, id?: string): Promise<ElecCompteurLocal> {
  const existing = id ? ((await eauDb.eau_elec_compteurs.get(id)) as ElecCompteurLocal | undefined) : undefined;
  const now = nowIso();
  return saveLocalApresParents(
    'eau_elec_compteurs',
    {
      ...input,
      id: existing?.id ?? newId(),
      created_at: existing?.created_at ?? now,
      updated_at: now,
    } as ElecCompteurLocal,
    null,
    input.client_id
  );
}

/** Suppression d'un compteur sans relevé (sinon : le passer « arrêté »). */
export async function deleteCompteurElec(id: string): Promise<boolean> {
  const n = await eauDb.eau_elec_releves_compteur.where('compteur_id').equals(id).count();
  if (n > 0) return false;
  await deleteLocal('eau_elec_compteurs', id);
  return true;
}

/**
 * Remplacement d'un compteur : l'ancien passe « arrêté » (date d'arrêt), le nouveau est
 * créé sur le même bien et le même client, avec `remplace_compteur_id` et son index de
 * départ (souvent 0). L'historique des deux reste en base.
 */
export async function remplacerCompteur(input: {
  ancienId: string;
  dateArret: string;
  nouveauCode: string;
  indexDepart: number;
  decimales: number;
}): Promise<ElecCompteurLocal> {
  const ancien = (await eauDb.eau_elec_compteurs.get(input.ancienId)) as ElecCompteurLocal | undefined;
  if (!ancien) throw new Error('Compteur introuvable');
  const now = nowIso();
  // Le nouveau d'abord : si l'envoi coupe entre les deux, rien n'est perdu.
  const nouveau = await saveLocal('eau_elec_compteurs', {
    id: newId(),
    code: input.nouveauCode,
    bien: ancien.bien,
    client_id: ancien.client_id,
    decimales: input.decimales,
    statut: 'actif' as ElecStatut,
    remplace_compteur_id: ancien.id,
    date_mise_en_service: input.dateArret,
    date_arret: null,
    index_reprise: input.indexDepart,
    date_index_reprise: input.dateArret,
    ordre: ancien.ordre,
    note: null,
    created_at: now,
    updated_at: now,
  } as ElecCompteurLocal);
  await saveLocal('eau_elec_compteurs', {
    ...ancien,
    statut: 'arrete' as ElecStatut,
    date_arret: input.dateArret,
    updated_at: now,
  });
  return nouveau;
}
