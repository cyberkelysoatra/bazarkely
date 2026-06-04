/**
 * Résolution + journalisation des scans QR (eau_scans) — offline-first.
 *
 * La résolution dépend du TYPE de QR (compteur / client), du RÔLE du scanneur et,
 * pour un client, de la correspondance entre le QR et son propre compte. Tout scan est
 * journalisé (code, type, compteur/client, emplacement, utilisateur, rôle, résultat).
 *
 * Matrice (cf. prompt Phase 3) :
 *   - Releveur/Admin + QR compteur → saisie d'index directe du bon compteur.
 *   - Releveur/Admin + QR client   → fiche conso de ce client.
 *   - Client + QR compteur         → « Ce QR ne vous est pas destiné ».
 *   - Client + son QR              → sa page conso+factures ; un autre → refus.
 *   - Non connecté / sans rôle     → page mission.
 */
import { eauDb } from '../db/gestionEauDb';
import { saveLocal } from './eauSync';
import { getQrByCode } from './eauQrService';
import { newId, nowIso } from '../utils/id';
import type { EauRoles, ScanLocal, CompteClientLocal, QrCompteurLocal } from '../types/gestionEau';
import type { ScanType } from '../utils/scanUrl';

export type ScanOutcome =
  /** Releveur/admin : ouvrir la saisie d'index du compteur (préselection directe). */
  | { kind: 'saisie-compteur'; compteurId: string; qr: QrCompteurLocal | null; emplacement: string | null }
  /** Releveur/admin : afficher la fiche conso d'un client. */
  | { kind: 'fiche-client'; clientId: string; clientNom: string }
  /** Client : ouvrir son propre espace conso/factures. */
  | { kind: 'mon-espace'; clientId: string }
  /** QR non destiné à ce client. */
  | { kind: 'refus' }
  /** QR inconnu (code introuvable). */
  | { kind: 'introuvable'; type: ScanType }
  /** Non connecté / aucun rôle eau → page mission. */
  | { kind: 'mission' };

export interface ResolveInput {
  type: ScanType;
  code: string;
  roles: EauRoles;
  userId: string | null;
}

const hasAccess = (r: EauRoles) => r.admin || r.releveur || r.client;
const isAgent = (r: EauRoles) => r.admin || r.releveur;

/**
 * Décision PURE de l'issue d'un scan à partir des entités déjà résolues (QR compteur ou
 * compte client) + rôle + userId. Séparée des accès Dexie pour être testable unitairement.
 */
export function decideOutcome(input: {
  type: ScanType;
  roles: EauRoles;
  userId: string | null;
  qr?: { compteur_id: string; id: string; emplacement: string | null } | null;
  compte?: { id: string; nom: string; user_id: string | null } | null;
}): ScanOutcome {
  const { type, roles, userId } = input;

  // Non connecté ou sans aucun rôle eau → page mission.
  if (!userId || !hasAccess(roles)) return { kind: 'mission' };

  if (type === 'compteur') {
    const qr = input.qr;
    if (!qr) return { kind: 'introuvable', type };
    if (isAgent(roles)) {
      return {
        kind: 'saisie-compteur',
        compteurId: qr.compteur_id,
        qr: qr as QrCompteurLocal,
        emplacement: qr.emplacement,
      };
    }
    // Client face à un QR compteur → non destiné.
    return { kind: 'refus' };
  }

  // type === 'client'
  const compte = input.compte;
  if (!compte) return { kind: 'introuvable', type };
  if (isAgent(roles)) {
    return { kind: 'fiche-client', clientId: compte.id, clientNom: compte.nom };
  }
  // Client : uniquement SON propre QR.
  if (roles.client && compte.user_id && compte.user_id === userId) {
    return { kind: 'mon-espace', clientId: compte.id };
  }
  return { kind: 'refus' };
}

/** Résout (SANS journaliser) un scan en une issue exploitable par l'UI. */
export async function resolveScan(input: ResolveInput): Promise<ScanOutcome> {
  const { type, code, roles, userId } = input;

  // Non connecté ou sans aucun rôle eau → page mission (pas d'accès Dexie nécessaire).
  if (!userId || !hasAccess(roles)) return { kind: 'mission' };

  if (type === 'compteur') {
    const qr = await getQrByCode(code);
    return decideOutcome({ type, roles, userId, qr });
  }

  const compte = (await eauDb.eau_comptes_client
    .where('code_qr')
    .equals(code)
    .first()) as CompteClientLocal | undefined;
  return decideOutcome({ type, roles, userId, compte: compte ?? null });
}

/** Libellé court du résultat, stocké dans eau_scans.resultat (journal admin). */
function outcomeLabel(o: ScanOutcome): string {
  switch (o.kind) {
    case 'saisie-compteur':
      return 'saisie_compteur';
    case 'fiche-client':
      return 'fiche_client';
    case 'mon-espace':
      return 'mon_espace';
    case 'refus':
      return 'refus_non_destine';
    case 'introuvable':
      return 'code_introuvable';
    case 'mission':
      return 'redir_mission';
  }
}

/** Journalise un scan résolu dans eau_scans (offline-first, idempotent par id client). */
export async function logScan(input: ResolveInput, outcome: ScanOutcome): Promise<ScanLocal> {
  const roleLabel = input.roles.admin
    ? 'admin'
    : input.roles.releveur
    ? 'releveur'
    : input.roles.client
    ? 'client'
    : 'aucun';

  const compteurId =
    outcome.kind === 'saisie-compteur' ? outcome.compteurId : input.type === 'compteur' ? null : null;
  const clientId =
    outcome.kind === 'fiche-client' || outcome.kind === 'mon-espace' ? outcome.clientId : null;
  const qrId = outcome.kind === 'saisie-compteur' ? outcome.qr?.id ?? null : null;
  const emplacement = outcome.kind === 'saisie-compteur' ? outcome.emplacement : null;

  const record: ScanLocal = {
    id: newId(),
    code: input.code,
    type: input.type,
    compteur_id: compteurId,
    client_id: clientId,
    qr_id: qrId,
    emplacement,
    user_id: input.userId,
    role: roleLabel,
    resultat: outcomeLabel(outcome),
    timestamp: nowIso(),
  };
  return saveLocal('eau_scans', record);
}

/** Résout ET journalise en une étape (usage standard du résolveur). */
export async function resolveAndLog(input: ResolveInput): Promise<ScanOutcome> {
  const outcome = await resolveScan(input);
  // Best-effort : un échec de journalisation ne doit pas bloquer la navigation.
  try {
    await logScan(input, outcome);
  } catch {
    /* ignore */
  }
  return outcome;
}

/** Journal des scans d'un compteur (admin) — du plus récent au plus ancien. */
export async function listScansForCompteur(compteurId: string): Promise<ScanLocal[]> {
  const all = (await eauDb.eau_scans
    .where('compteur_id')
    .equals(compteurId)
    .toArray()) as ScanLocal[];
  return all.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
}

/** Journal global des scans (admin) — du plus récent au plus ancien, borné. */
export async function listScans(limit = 200): Promise<ScanLocal[]> {
  const all = (await eauDb.eau_scans.toArray()) as ScanLocal[];
  return all.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? '')).slice(0, limit);
}
