// Frame of screens 8, 9 and 10 (RELEVE-CC-05). Same parts as CadreReleve (header, band, steps, bottom bar)
// with two additions it cannot give: the small link « Bornes éphémères » in the header (slot `droite`) and a
// fixed block above the bottom bar (D21: « Calculer la station » always visible without scrolling).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bandeau } from '../../composants/Bandeau'
import { BarreBas } from '../../composants/BarreBas'
import { EnTete } from '../../composants/EnTete'
import { Etapes, type NumeroEtape } from '../../composants/Etapes'
import { saisieTenueIci } from '../../db/depot'
import { useBandeauReleve } from '../../etat/useEnvoi'
import type { useReleve } from '../../etat/useReleve'
import { LectureSeule } from '../CadreReleve'
import { MenuHaut } from '../MenuHaut'

export type ResultatUseReleve = ReturnType<typeof useReleve>

export interface PropsCadreStations {
  releve: ResultatUseReleve
  etape?: NumeroEtape
  /** Link « Bornes éphémères » in the header (screens 8 and 9). */
  lienEphemeres?: boolean
  /** Fixed block above the bottom bar. */
  pied?: ReactNode
  children: ReactNode
}

export function CadreStations({ releve, etape = 3, lienEphemeres = true, pied, children }: PropsCadreStations) {
  const { etat } = releve
  const envoi = useBandeauReleve(etat.statut === 'pret' ? etat.releve : undefined, { compacte: true, chantier: etat.statut === 'pret' ? etat.chantier : null })
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
  const lecture = !saisieTenueIci(r)
  const droite = (
    <>
      {lienEphemeres ? (
        <Link
          to={`/r/${r.id}/ephemere`}
          data-lien-ephemeres
          className="flex min-h-[48px] max-w-[92px] flex-none items-center text-right text-[14px] font-bold leading-tight text-white underline underline-offset-2"
        >
          Bornes éphémères
        </Link>
      ) : null}
      <MenuHaut />
    </>
  )
  return (
    <div className="rt-ecran">
      <EnTete titre={r.nom} sousTitre={sousTitre} droite={droite} />
      <Bandeau compacte {...envoi} />
      <Etapes releveId={r.id} actuelle={etape} faites={faites} reduite={calcule.etatCalage !== 'a_faire'} />
      <main className="flex flex-1 flex-col gap-3 px-4 py-3.5">{lecture ? <LectureSeule>{children}</LectureSeule> : children}</main>
      <div className="sticky bottom-0 z-[6]">
        {pied && !lecture ? (
          <div data-pied-station className="flex flex-col gap-2 border-t-[3px] border-encre bg-fond px-4 py-2.5">
            {pied}
          </div>
        ) : null}
        <BarreBas releveId={r.id} actif="saisir" incompletes={calcule.stationsIncompletes} calageFait={calcule.etatCalage !== 'a_faire'} lectureSeule={lecture} />
      </div>
    </div>
  )
}
