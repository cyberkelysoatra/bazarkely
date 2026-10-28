/**
 * Dates of dictated transactions (pure, tested).
 *
 * `transactions.date` is a Postgres `date`: the ISO string sent by the client
 * is cut to its UTC day. A purchase at 01:00 in Antananarivo (UTC+3) is still
 * the previous day in UTC and would land on the wrong day. When the UTC day
 * and the Madagascar day differ, the date moves to 03:00 local (00:00 UTC) of
 * the Madagascar day; otherwise the spoken moment is kept as is.
 */

const DECALAGE_MADAGASCAR_MS = 3 * 60 * 60 * 1000 // Indian/Antananarivo, no DST

export function jourMadagascar(instant: Date): string {
  return new Date(instant.getTime() + DECALAGE_MADAGASCAR_MS).toISOString().slice(0, 10)
}

export function dateTransactionDepuisIso(iso: string, repli: Date = new Date()): Date {
  const instant = new Date(iso)
  const valide = Number.isFinite(instant.getTime()) ? instant : repli
  const jour = jourMadagascar(valide)
  if (valide.toISOString().slice(0, 10) === jour) return valide
  return new Date(`${jour}T00:00:00.000Z`)
}

/** ISO string with the local offset (e.g. 2026-10-28T21:30:00+03:00). */
export function isoAvecDecalage(d: Date = new Date()): string {
  const decalage = -d.getTimezoneOffset()
  const signe = decalage >= 0 ? '+' : '-'
  const abs = Math.abs(decalage)
  const local = new Date(d.getTime() + decalage * 60_000).toISOString().slice(0, 19)
  return `${local}${signe}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
}

/** `YYYY-MM-DD` for a date input, in the Madagascar day. */
export function valeurChampDate(iso: string): string {
  const d = new Date(iso)
  return Number.isFinite(d.getTime()) ? jourMadagascar(d) : jourMadagascar(new Date())
}

/** Back from a date input: keep the time of day of the original moment. */
export function isoDepuisChampDate(jour: string, isoOrigine: string): string {
  const origine = new Date(isoOrigine)
  const heure = Number.isFinite(origine.getTime())
    ? new Date(origine.getTime() + DECALAGE_MADAGASCAR_MS).toISOString().slice(11, 19)
    : '12:00:00'
  return `${jour}T${heure}+03:00`
}
