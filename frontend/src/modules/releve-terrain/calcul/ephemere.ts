// PRD 6.7 / H13: can a station become an ephemeral target?
import { MESSAGES } from './seuils'
import type { Reglages, ResultatStation } from './types'

/**
 * Checks in this order: rank 3 refused first, then green station with
 * index <= indiceEphemere. Rank 1 from main targets only, rank 2 when the
 * station sights a rank-1 target.
 */
export function peutDevenirBorneEphemere(
  s: ResultatStation,
  r: Reglages,
): { ok: true; rang: 1 | 2 } | { ok: false; raison: string } {
  if (s.rangMax === 2) return { ok: false, raison: MESSAGES.tropDeReports }
  if (!s.calculee || s.couleur !== 'vert' || s.indice === undefined || !(s.indice <= r.indiceEphemere)) {
    return { ok: false, raison: MESSAGES.positionFragile }
  }
  return { ok: true, rang: s.rangMax === 1 ? 2 : 1 }
}

/** A station sighting a rank-2 target is « reportée » in the exports. */
export function estReportee(s: ResultatStation): boolean {
  return s.rangMax === 2
}
