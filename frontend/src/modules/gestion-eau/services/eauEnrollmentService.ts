/**
 * Enrôlement client/demande via la connexion Google existante.
 *
 * Problème : la connexion Google redirige hors de l'app puis revient sur /dashboard
 * (flux OAuth Supabase géré par AuthPage). On ne peut donc pas terminer l'enrôlement
 * « en ligne droite ». Solution : on mémorise l'INTENTION dans localStorage AVANT de
 * lancer Google, puis on la traite globalement au montage du module (GestionEauProvider)
 * une fois l'utilisateur authentifié, quel que soit l'écran d'atterrissage.
 */
import { linkByEnrolementCode } from './eauCompteClientService';
import { createDemande } from './eauDemandeService';

const PENDING_KEY = 'eau_pending_enrollment';

export type PendingEnrollment =
  | { intent: 'code'; code: string }
  | {
      intent: 'demande';
      nom?: string | null;
      // Fiche d'accès enrichie (ÉVO 1) — capturés sur la vitrine publique.
      email?: string | null;
      phone?: string | null;
      fonction?: string | null;
      message?: string | null;
    };

export function setPendingEnrollment(p: PendingEnrollment): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  } catch {
    /* storage indisponible → ignoré */
  }
}

export function getPendingEnrollment(): PendingEnrollment | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (p && (p.intent === 'code' || p.intent === 'demande')) return p as PendingEnrollment;
    return null;
  } catch {
    return null;
  }
}

export function clearPendingEnrollment(): void {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignoré */
  }
}

export type EnrollmentResult =
  | { kind: 'none' }
  | { kind: 'code-ok'; compteurCount: number }
  | { kind: 'code-invalide' }
  | { kind: 'code-deja-utilise' }
  | { kind: 'demande-ok' };

/**
 * Traite l'intention d'enrôlement en attente pour l'utilisateur fraîchement
 * authentifié. À appeler une fois l'`userId` connu. Efface l'intention après usage.
 */
export async function processPendingEnrollment(
  userId: string,
  email?: string | null
): Promise<EnrollmentResult> {
  const pending = getPendingEnrollment();
  if (!pending) return { kind: 'none' };
  clearPendingEnrollment();

  if (pending.intent === 'code') {
    const res = await linkByEnrolementCode(pending.code, userId);
    if (res.ok) return { kind: 'code-ok', compteurCount: res.compte.compteur_ids?.length ?? 0 };
    return res.reason === 'deja_utilise' ? { kind: 'code-deja-utilise' } : { kind: 'code-invalide' };
  }

  // intent === 'demande'
  // On conserve l'email réel du compte Google s'il est fourni en argument,
  // sinon celui saisi dans la fiche d'accès publique.
  await createDemande({
    user_id: userId,
    email: email ?? pending.email ?? null,
    nom: pending.nom ?? null,
    phone: pending.phone ?? null,
    fonction: pending.fonction ?? null,
    message: pending.message ?? null,
  });
  return { kind: 'demande-ok' };
}
