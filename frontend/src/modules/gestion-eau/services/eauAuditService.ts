/**
 * Journal d'audit (eau_audit) — qui / quoi / quand. Offline-first.
 *
 * Journalise les actions clés du module (config, facturation, alertes, annonces,
 * rôles…) de façon NON bloquante : `logAudit` avale toute erreur pour ne jamais
 * casser l'action métier qu'il accompagne. L'utilisateur courant est résolu en
 * mode offline-first (store Zustand, jamais getUser()).
 */
import { eauDb } from '../db/gestionEauDb';
import { saveLocal } from './eauSync';
import { newId, nowIso } from '../utils/id';
import { getCurrentUserIdSync } from './eauAuth';
import type { AuditLocal } from '../types/gestionEau';

export interface LogAuditInput {
  action: string;
  entite?: string | null;
  entiteId?: string | null;
  details?: unknown | null;
  /** Force un user_id (sinon résolu via le store). */
  userId?: string | null;
}

/** Journalise une action clé (best-effort, ne jette jamais). */
export async function logAudit(input: LogAuditInput): Promise<AuditLocal | null> {
  try {
    const record: AuditLocal = {
      id: newId(),
      user_id: input.userId ?? getCurrentUserIdSync(),
      action: input.action,
      entite: input.entite ?? null,
      entite_id: input.entiteId ?? null,
      details: input.details ?? null,
      timestamp: nowIso(),
    };
    return await saveLocal('eau_audit', record);
  } catch {
    return null;
  }
}

/** Journal d'audit, du plus récent au plus ancien, borné. */
export async function listAudit(limit = 300): Promise<AuditLocal[]> {
  const all = (await eauDb.eau_audit.toArray()) as AuditLocal[];
  return all
    .sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''))
    .slice(0, limit);
}
