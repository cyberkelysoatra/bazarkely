// Bottom bar, inside a relevé only: Saisir, Carte, Résultats. Saisir leads to the calibration while it is
// neither done nor skipped. Red badge « N » on Saisir, accessible label « N station(s) incomplète(s) » (D22).
import { Link } from 'react-router-dom'
import { Icone, type NomIcone } from './Icones'

export type OngletBas = 'saisir' | 'carte' | 'resultats'

export interface PropsBarreBas {
  releveId: string
  actif: OngletBas | null
  /** Stations waiting for a target (D22). */
  incompletes: number
  /** Calibration done or skipped: Saisir opens the station input, else the calibration. */
  calageFait: boolean
}

export function libelleIncompletes(n: number): string {
  return n === 1 ? '1 station incomplète' : `${n} stations incomplètes`
}

export function BarreBas({ releveId, actif, incompletes, calageFait }: PropsBarreBas) {
  const onglets: { cle: OngletBas; libelle: string; icone: NomIcone; chemin: string }[] = [
    { cle: 'saisir', libelle: 'Saisir', icone: 'saisir', chemin: calageFait ? 'saisir' : 'calage' },
    { cle: 'carte', libelle: 'Carte', icone: 'carte', chemin: 'carte' },
    { cle: 'resultats', libelle: 'Résultats', icone: 'resultats', chemin: 'resultats' },
  ]
  return (
    <nav aria-label="Barre du relevé" className="rt-sombre sticky bottom-0 z-[5] grid grid-cols-3 gap-1.5 bg-encre p-1.5 pb-[calc(6px+env(safe-area-inset-bottom,0px))]">
      {onglets.map((o) => {
        const est = actif === o.cle
        return (
          <Link
            key={o.cle}
            to={`/r/${releveId}/${o.chemin}`}
            aria-current={est ? 'page' : undefined}
            className={`rt-etroite relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-rt text-[17px] font-bold no-underline ${est ? 'bg-jaune text-encre' : 'text-white'}`}
          >
            <Icone nom={o.icone} taille={26} couleur={est ? '#000000' : '#FFFFFF'} />
            <span>{o.libelle}</span>
            {o.cle === 'saisir' && incompletes > 0 ? (
              <span
                aria-label={libelleIncompletes(incompletes)}
                role="img"
                className="absolute right-2 top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-alerte px-1 text-[14px] font-extrabold text-white"
              >
                {incompletes}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
