// Steps 1 to 4 of a relevé: 4 segments of 44 px, every step a link. Current = black, done = yellow with
// « ✓ », to come = white. D23: once the calibration is done or skipped, one thin line of 32 px
// « Étape 3 sur 4 : stations », touchable to reopen the band.
import { useState } from 'react'
import { Link } from 'react-router-dom'

export type NumeroEtape = 1 | 2 | 3 | 4

export const ETAPES: { n: NumeroEtape; nom: string; chemin: string }[] = [
  { n: 1, nom: 'Bornes', chemin: 'bornes' },
  { n: 2, nom: 'Calage', chemin: 'calage' },
  { n: 3, nom: 'Stations', chemin: 'saisir' },
  { n: 4, nom: 'Résultats', chemin: 'resultats' },
]

export interface PropsEtapes {
  releveId: string
  /** Step of the screen shown. */
  actuelle: NumeroEtape
  /** Steps done (ticked). */
  faites: NumeroEtape[]
  /** D23: thin line instead of the band (calibration done or skipped). */
  reduite?: boolean
}

export function Etapes({ releveId, actuelle, faites, reduite = false }: PropsEtapes) {
  const [ouverte, setOuverte] = useState(false)
  const nom = ETAPES[actuelle - 1].nom
  if (reduite && !ouverte) {
    return (
      <button
        type="button"
        onClick={() => setOuverte(true)}
        aria-expanded={false}
        className="rt-etroite flex min-h-[32px] w-full items-center justify-between border-b-2 border-encre bg-surface px-4 text-left text-[16px] font-bold"
      >
        <span>
          Étape {actuelle} sur 4 : {nom.toLowerCase()}
        </span>
        <span aria-hidden="true" className="text-[14px] font-semibold text-encre2">
          voir les étapes
        </span>
      </button>
    )
  }
  return (
    <nav aria-label="Étapes du relevé" className="border-b-2 border-encre">
      <ol className="m-0 grid list-none grid-cols-4 p-0">
        {ETAPES.map((e, i) => {
          const enCours = e.n === actuelle
          const faite = !enCours && faites.includes(e.n)
          const classes = enCours ? 'bg-encre text-white' : faite ? 'bg-jaune text-encre' : 'bg-surface text-encre'
          return (
            <li key={e.n} className={i > 0 ? 'border-l-2 border-encre' : ''}>
              <Link
                to={`/r/${releveId}/${e.chemin}`}
                aria-current={enCours ? 'step' : undefined}
                onClick={() => setOuverte(false)}
                className={`rt-etroite flex min-h-[44px] items-center justify-center gap-1 px-1 text-[17px] font-bold leading-none no-underline ${classes}`}
              >
                <span>{faite ? '✓' : e.n}</span>
                <span className="truncate">{e.nom}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
