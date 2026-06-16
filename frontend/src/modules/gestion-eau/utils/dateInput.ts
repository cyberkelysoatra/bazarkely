/**
 * Helpers de conversion pour les champs `<input datetime-local>` / `<input type="date">`,
 * factorisés (v3.62.0) depuis EauBassinReleves et EauApportsReleves (logique identique).
 * Sémantique strictement préservée : « vide = undefined », « futur = strictement > maintenant ».
 */

/** Convertit la valeur d'un `<input datetime-local>` en ISO, ou undefined si vide/invalide. */
export function toIsoOrUndefined(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** true si la valeur saisie est strictement dans le futur (vide = false). */
export function isFuture(local: string): boolean {
  if (!local.trim()) return false;
  const t = new Date(local).getTime();
  return Number.isFinite(t) && t > Date.now();
}

/** Convertit un ISO en valeur d'`<input datetime-local>` (heure locale), ou '' si invalide. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
