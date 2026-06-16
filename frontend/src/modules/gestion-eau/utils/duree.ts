/**
 * Helpers de durée pour les saisies par heure (`<input type="time">`), factorisés (v3.62.0)
 * depuis EauBassinReleves (tests de débit, arrêts de pompe). Logique strictement identique.
 */

/** Minutes depuis minuit d'une saisie `<input type="time">` (HH:MM), ou null si vide/invalide. */
export function timeToMinutes(hhmm: string): number | null {
  if (!hhmm.trim()) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Durée (min) entre une heure de début et de fin (`HH:MM`). Gère le passage de minuit
 * (test de nuit) : si la fin est « avant » le début, on suppose le lendemain (+24 h).
 * Retourne null si l'une des heures est absente/invalide ou si la durée est nulle.
 */
export function dureeMinFromHeures(debut: string, fin: string): number | null {
  const a = timeToMinutes(debut);
  const b = timeToMinutes(fin);
  if (a == null || b == null) return null;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60; // passage de minuit
  return diff > 0 ? diff : null;
}

/** Formate une durée en minutes → « 2 h 05 », « 45 min » ou « 1 j 3 h » (lecture humaine). */
export function fmtDuree(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '—';
  const totalMin = Math.round(min);
  const j = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (j > 0) return `${j} j ${h} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')}`;
  return `${m} min`;
}
