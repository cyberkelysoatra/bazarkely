// Frame of every screen inside a relevé (screens 6 to 12): header (relevé name, work site and domain),
// band, steps 1 to 4 (thin line once the calibration is done or skipped, D23), content, bottom bar.
// The screen calls useReleve() itself and gives its result here.
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bandeau, type PropsBandeau } from '../composants/Bandeau'
import { BarreBas, type OngletBas } from '../composants/BarreBas'
import { EnTete } from '../composants/EnTete'
import { Etapes, type NumeroEtape } from '../composants/Etapes'
import type { useReleve } from '../etat/useReleve'
import { MenuHaut } from './MenuHaut'

export type ResultatUseReleve = ReturnType<typeof useReleve>

export interface PropsCadreReleve {
  releve: ResultatUseReleve
  /** Step shown in the band (omit to hide the steps). */
  etape?: NumeroEtape
  /** Active button of the bottom bar. */
  onglet?: OngletBas | null
  /** Band on one line (Saisir screen, D21). */
  bandeauCompact?: boolean
  /** Phase 3: state of the band. */
  bandeau?: Omit<PropsBandeau, 'compacte'>
  children: ReactNode
}

export function CadreReleve({ releve, etape, onglet = null, bandeauCompact = false, bandeau, children }: PropsCadreReleve) {
  const { etat } = releve
  if (etat.statut !== 'pret') {
    return (
      <div className="rt-ecran">
        <EnTete titre="Relevé terrain" sousTitre={etat.statut === 'chargement' ? 'Chargement' : null} droite={<MenuHaut />} />
        <main className="flex flex-1 flex-col gap-3 px-4 py-4">
          {etat.statut === 'absent' ? (
            <>
              <p className="m-0 text-[18px] font-semibold">Ce relevé n'existe pas ou a été supprimé sur ce téléphone.</p>
              <Link to="/" className="rt-etroite flex min-h-[60px] items-center justify-center rounded-rt border-[3px] border-encre bg-jaune text-[21px] font-extrabold text-encre no-underline">
                Mes terrains
              </Link>
            </>
          ) : null}
        </main>
      </div>
    )
  }
  const { calcule, releve: r, chantier, domaine } = etat
  const faites: NumeroEtape[] = []
  if (calcule.etape > 1) faites.push(1)
  if (calcule.etatCalage !== 'a_faire') faites.push(2)
  if (calcule.stations.length > 0) faites.push(3)
  const sousTitre = [chantier?.nom, domaine?.nom].filter(Boolean).join(', ')
  return (
    <div className="rt-ecran">
      <EnTete titre={r.nom} sousTitre={sousTitre} droite={<MenuHaut />} />
      <Bandeau compacte={bandeauCompact} {...bandeau} />
      {etape ? <Etapes releveId={r.id} actuelle={etape} faites={faites} reduite={calcule.etatCalage !== 'a_faire'} /> : null}
      <main className="flex flex-1 flex-col gap-3 px-4 py-3.5">{children}</main>
      <BarreBas releveId={r.id} actif={onglet} incompletes={calcule.stationsIncompletes} calageFait={calcule.etatCalage !== 'a_faire'} />
    </div>
  )
}
