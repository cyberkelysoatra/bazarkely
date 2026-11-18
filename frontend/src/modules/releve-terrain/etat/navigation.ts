// Routes of a relevé (SCHEMA-STRUCTURE.md section 3, base /releve) and the step where it stopped.
import type { NumeroEtape } from '../composants/Etapes'

const CHEMINS: Record<NumeroEtape, string> = { 1: 'bornes', 2: 'calage', 3: 'saisir', 4: 'resultats' }

export const NOMS_ETAPES: Record<NumeroEtape, string> = { 1: 'Bornes', 2: 'Calage', 3: 'Stations', 4: 'Résultats' }

/** Route of a step of a relevé (inside the router basename /releve). */
export function cheminEtape(releveId: string, etape: NumeroEtape): string {
  return `/r/${releveId}/${CHEMINS[etape]}`
}

export function cheminChantier(chantierId: string): string {
  return `/c/${chantierId}`
}

/** « 18/11/2026 » from « 2026-11-18 ». */
export function dateFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

/** « 11:05 » in Madagascar time (UTC+3), whatever the phone's time zone. */
export function heureMadagascar(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const m = new Date(d.getTime() + 3 * 3600 * 1000)
  return `${String(m.getUTCHours()).padStart(2, '0')}:${String(m.getUTCMinutes()).padStart(2, '0')}`
}

export function pluriel(n: number, un: string, plusieurs: string, aucun?: string): string {
  if (n === 0 && aucun) return aucun
  return `${n} ${n > 1 ? plusieurs : un}`
}
