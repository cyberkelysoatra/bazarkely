// Card of one side of the calibration (H05, rule 6.2): 3 readings (distance, slope, direction), tape
// both ways (optional), live result of the side from calcul/ (through useReleve).
import type { ResultatCote } from '../../calcul'
import { ChampNombre } from '../../composants/ChampNombre'
import { PastilleEtat } from '../../composants/Pastilles'
import type { DonneesCote, LectureCote, ObjetCote } from '../../db/types'
import { AIDES, EXEMPLES } from '../exemples'
import { metres, metresSigne } from './format'

export const LIMITES_DISTANCE = { min: 0, minExclu: true, max: 1000, messageHorsLimites: 'Distance entre 0 et 1 000 m.' }
export const LIMITES_PENTE = { min: -90, max: 90, messageHorsLimites: 'Pente entre −90° et +90°.' }

/** One reading being typed: a value may still be missing. */
export interface LectureSaisie {
  distance: number | null
  pente: number | null
  sens: 'aller' | 'retour'
}

export interface SaisieCote {
  lectures: LectureSaisie[]
  aller: number | null
  retour: number | null
}

const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Latest side object between two targets, whatever its direction. */
export function objetCote(objets: ObjetCote[], p: string, q: string): ObjetCote | null {
  return (
    objets
      .filter((o) => !o.supprime && ((o.donnees.de === p && o.donnees.vers === q) || (o.donnees.de === q && o.donnees.vers === p)))
      .sort((a, b) => a.maj_at.localeCompare(b.maj_at))
      .pop() ?? null
  )
}

/** Side as seen from p to q (3 readings, missing values null). */
export function saisieDe(o: ObjetCote | null, p: string): SaisieCote {
  const vide: LectureSaisie = { distance: null, pente: null, sens: 'aller' }
  if (!o) return { lectures: [vide, vide, vide], aller: null, retour: null }
  const direct = o.donnees.de === p
  const lectures: LectureSaisie[] = [0, 1, 2].map((i) => {
    const l = o.donnees.lectures?.[i] as Partial<LectureCote> | undefined
    if (!l) return vide
    const sens = l.sens === 'retour' ? 'retour' : 'aller'
    return { distance: nombre(l.distance) ? l.distance : null, pente: nombre(l.pente) ? l.pente : null, sens: direct ? sens : sens === 'aller' ? 'retour' : 'aller' }
  })
  const d = o.donnees.decametre
  const aller = direct ? (d?.aller ?? null) : (d?.retour ?? null)
  const retour = direct ? (d?.retour ?? null) : (d?.aller ?? null)
  return { lectures, aller, retour }
}

/**
 * Data of the side object, written from p to q. A reading still incomplete keeps its typed value (null
 * for the other one): calcul/ (releveCalcule) ignores it until both values are there.
 */
export function donneesDe(s: SaisieCote, p: string, q: string): DonneesCote {
  const decametre = s.aller === null && s.retour === null ? null : { aller: s.aller, retour: s.retour }
  return { de: p, vers: q, lectures: s.lectures, decametre }
}

export interface PropsCarteCote {
  /** « A vers B » with the real letters. */
  nom: string
  lettreP: string
  lettreQ: string
  saisie: SaisieCote
  resultat: ResultatCote | null
  onChange: (s: SaisieCote) => void
}

export function CarteCote({ nom, lettreP, lettreQ, saisie, resultat, onChange }: PropsCarteCote) {
  const lecture = (i: number, patch: Partial<LectureSaisie>) => {
    const lectures = saisie.lectures.map((l, j) => (j === i ? { ...l, ...patch } : l))
    onChange({ ...saisie, lectures })
  }
  return (
    <section aria-label={`Côté ${nom}`} className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-3.5">
      <div className="flex items-center gap-2">
        <h3 className="rt-etroite m-0 flex-1 text-[24px] font-extrabold">Côté {nom}</h3>
        {resultat ? <PastilleEtat couleur={resultat.couleur} /> : null}
      </div>
      {saisie.lectures.map((l, i) => (
        <div key={i} className="flex flex-col gap-2 border-t-2 border-trait pt-2" data-lecture={i + 1}>
          <div className="grid grid-cols-2 items-end gap-2">
            <ChampNombre libelle={`Lecture ${i + 1} : distance`} valeur={l.distance} unite="m" exemple={EXEMPLES.distanceCalage} aide={i === 0 ? AIDES.distanceCalage : undefined} {...LIMITES_DISTANCE} onChange={(v) => v !== l.distance && lecture(i, { distance: v })} />
            <ChampNombre libelle={`Lecture ${i + 1} : pente`} valeur={l.pente} unite="°" exemple={EXEMPLES.penteCalage} aide={i === 0 ? AIDES.penteCalage : undefined} {...LIMITES_PENTE} onChange={(v) => v !== l.pente && lecture(i, { pente: v })} />
          </div>
          <div role="group" aria-label={`Sens de la lecture ${i + 1}`} className="grid grid-cols-2 gap-2">
            {(['aller', 'retour'] as const).map((sens) => {
              const est = l.sens === sens
              return (
                <button
                  key={sens}
                  type="button"
                  aria-pressed={est}
                  onClick={() => !est && lecture(i, { sens })}
                  className={`rt-etroite min-h-[48px] rounded-rt border-[3px] border-encre px-2 text-[19px] font-bold ${est ? 'bg-encre text-white' : 'bg-surface text-encre'}`}
                >
                  de {sens === 'aller' ? lettreP : lettreQ} vers {sens === 'aller' ? lettreQ : lettreP}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div className="grid grid-cols-2 items-end gap-2 border-t-2 border-trait pt-2">
        <ChampNombre libelle="Décamètre aller" valeur={saisie.aller} unite="m" exemple={EXEMPLES.decametre} aide={AIDES.decametre} autoriserVide {...LIMITES_DISTANCE} onChange={(v) => v !== saisie.aller && onChange({ ...saisie, aller: v })} />
        <ChampNombre libelle="Décamètre retour" valeur={saisie.retour} unite="m" exemple={EXEMPLES.decametre} aide={AIDES.decametre} autoriserVide {...LIMITES_DISTANCE} onChange={(v) => v !== saisie.retour && onChange({ ...saisie, retour: v })} />
      </div>
      {resultat ? (
        <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 rounded-rt bg-fond p-3" aria-label={`Résultat du côté ${nom}`}>
          <Valeur libelle="Distance retenue" valeur={`${metres(resultat.distanceRetenue)} m`} grande />
          <Valeur libelle="Dénivelé" valeur={`${metresSigne(resultat.denivele)} m`} grande />
          <Valeur libelle="Écart décamètre et appareil" valeur={resultat.ecartDecaApp === null ? 'sans décamètre' : `${metresSigne(resultat.ecartDecaApp)} m`} />
          <Valeur libelle="Biais de l'appareil" valeur={resultat.biais === null ? 'sans décamètre' : `${metresSigne(resultat.biais)} m`} />
        </dl>
      ) : (
        <p className="m-0 text-[16px] text-encre2">Saisissez au moins une lecture complète (distance et pente).</p>
      )}
    </section>
  )
}

function Valeur({ libelle, valeur, grande = false }: { libelle: string; valeur: string; grande?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[14px] font-semibold leading-tight text-encre2">{libelle}</dt>
      <dd className={`rt-etroite m-0 font-bold leading-tight ${grande ? 'text-[28px]' : 'text-[22px]'}`}>{valeur}</dd>
    </div>
  )
}
