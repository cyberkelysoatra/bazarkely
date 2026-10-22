// Formatting helpers (fr-MG amounts, dates in Madagascar time, countdown).
import { fr } from '../i18n/fr';

/**
 * Offline fallback of the closing time only: online, the server value pudi_settings.cloture_at
 * always wins. Tuesday 27 October 2026 at 8 h (Madagascar time), as set by JOEL on the server.
 */
export const CLOTURE_PAR_DEFAUT = '2026-10-27T08:00:00+03:00';

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
