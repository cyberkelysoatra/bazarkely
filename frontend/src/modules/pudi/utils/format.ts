// Formatting helpers (fr-MG amounts, dates in Madagascar time, countdown).
import { fr } from '../i18n/fr';

/**
 * Offline fallback of the closing time only, used when the server never answered on this device:
 * otherwise the last pudi_settings.cloture_at received wins (kept in pudi_cloture_cache, PUDI-CC-17),
 * so the organisers can move the closing from Admin > Paramètres without a new version.
 */
export const CLOTURE_PAR_DEFAUT = '2026-10-27T08:00:00+03:00';
/** Fallback freeze of the member lists: 10 h after the fallback closing (same rule). */
const GEL_APRES_CLOTURE_MS = 10 * 3600 * 1000;
const CLE_DATES = 'pudi_cloture_cache';

export interface DatesConsultation {
  cloture_at: string;
  gel_listes_at: string;
}

/** Last closing and freeze received from the server on this device, else the fallback. */
export function lireDatesCache(): DatesConsultation {
  const defaut = {
    cloture_at: CLOTURE_PAR_DEFAUT,
    gel_listes_at: new Date(Date.parse(CLOTURE_PAR_DEFAUT) + GEL_APRES_CLOTURE_MS).toISOString()
  };
  try {
    const o = JSON.parse(localStorage.getItem(CLE_DATES) || 'null') as Partial<DatesConsultation> | null;
    const ok = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));
    return { cloture_at: ok(o?.cloture_at) ? o.cloture_at : defaut.cloture_at, gel_listes_at: ok(o?.gel_listes_at) ? o.gel_listes_at : defaut.gel_listes_at };
  } catch {
    return defaut;
  }
}

/** Keeps the server dates (a server answer without the freeze keeps the previous one). */
export function ecrireDatesCache(d: { cloture_at: string; gel_listes_at?: string | null }): void {
  try {
    const avant = lireDatesCache();
    localStorage.setItem(CLE_DATES, JSON.stringify({ cloture_at: d.cloture_at, gel_listes_at: d.gel_listes_at ?? avant.gel_listes_at }));
  } catch {
    /* no storage: the fallback stays */
  }
}

const MADA_OFFSET_MS = 3 * 3600 * 1000; // Madagascar = UTC+3, no daylight saving

/** 610000000 → "610 000 000 Ar" (spaces as thousands separator). */
export function formatAr(montant: number): string {
  const entier = Math.round(montant).toString();
  return entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ar';
}

function enHeureMada(iso: string): Date {
  return new Date(new Date(iso).getTime() + MADA_OFFSET_MS);
}

/** "lundi 26 octobre 2026 à 20 h (heure de Madagascar)" */
export function dateClotureLongue(iso: string): string {
  const d = enHeureMada(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const heure = m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  return `${fr.temps.jours[d.getUTCDay()]} ${d.getUTCDate()} ${fr.temps.mois[d.getUTCMonth()]} ${d.getUTCFullYear()} à ${heure} ${fr.temps.heureMada}`;
}

/** "21 octobre 2026 à 14 h 05" (Madagascar time). */
export function dateCourte(iso: string): string {
  const d = enHeureMada(iso);
  return `${d.getUTCDate()} ${fr.temps.mois[d.getUTCMonth()]} ${d.getUTCFullYear()} à ${d.getUTCHours()} h ${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** "14 h 05" (Madagascar time). */
export function heureCourte(iso: string): string {
  const d = enHeureMada(iso);
  return `${d.getUTCHours()} h ${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export interface Restant {
  jours: number;
  heures: number;
  minutes: number;
  fini: boolean;
}

/** Time left until `finMs`; `maintenantMs` must already be corrected with the server offset. */
export function tempsRestant(finMs: number, maintenantMs: number): Restant {
  const ms = Math.max(0, finMs - maintenantMs);
  const totalMin = Math.floor(ms / 60000);
  return {
    jours: Math.floor(totalMin / 1440),
    heures: Math.floor((totalMin % 1440) / 60),
    minutes: totalMin % 60,
    fini: ms <= 0
  };
}

/**
 * Short countdown shown when less than 3 days remain: « Plus que 2 j 15 h pour voter »,
 * « Plus que 5 h pour voter », « Moins d'une heure pour voter »; null otherwise or once closed.
 */
export function texteRestant(r: Restant): string | null {
  if (r.fini || r.jours >= 3) return null;
  if (!r.jours && !r.heures) return 'Moins d’une heure pour voter';
  return `Plus que ${r.jours ? `${r.jours} j ${r.heures} h` : `${r.heures} h`} pour voter`;
}

/** "jeudi 22 octobre 2026 à 9 h 14" (Madagascar time, no suffix): opening of the consultation. */
export function dateLongue(iso: string): string {
  const d = enHeureMada(iso);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const heure = m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  return `${fr.temps.jours[d.getUTCDay()]} ${d.getUTCDate()} ${fr.temps.mois[d.getUTCMonth()]} ${d.getUTCFullYear()} à ${heure}`;
}

/** "24 octobre 2026" (Madagascar date). Accepts a timestamp or a plain date "2026-10-20". */
export function dateJour(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : enHeureMada(iso);
  return `${d.getUTCDate()} ${fr.temps.mois[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** French label of a refused attempt's reason (pudi_refus.motif). */
export function libelleMotifRefus(motif: string | null | undefined): string {
  return motif === 'personne_deja_votee' ? 'Personne ayant déjà voté avec un autre numéro' : 'Numéro déjà utilisé par un autre compte';
}
