// Screen 11 « Carte » (H12, H16 display, Carte.dc.html), route /r/:releve/carte. The map fills as the
// stations come in: bornes, stations, 5 m grid, weak geometry zones, contour lines of the phone's
// interval; a tap on a station opens it; « Saisir la station S<n> ». With ?zones=ephemere (H13 step 1):
// zones from the 3 principal bornes only, index above 2,0, and the banner.
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bouton } from '../../composants/Bouton'
import { Aide } from '../../composants/Feuilles'
import { Icone } from '../../composants/Icones'
import { useReleve } from '../../etat/useReleve'
import { CadreReleve } from '../CadreReleve'
import { ChoixIntervalle } from './ChoixIntervalle'
import { TEINTES, bornesPlacees, libelleBorne, mentionCarte, positionStation, zonesFaibles, type ModeZones } from './modele'
import { useCourbes, useIntervalle } from './useCourbes'
import { VueCarte, type PoigneeCarte } from './VueCarte'

const HAUTEUR_CARTE = 400

function Legende({ zonesAffichees }: { zonesAffichees: boolean }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0 text-[14px] font-semibold text-encre" aria-label="Légende">
      <li className="flex items-center gap-1.5">
        <svg width="16" height="15" aria-hidden="true">
          <path d="M8,1 L15,14 L1,14 Z" fill="#000000" />
        </svg>
        borne
      </li>
      <li className="flex items-center gap-1.5">
        <svg width="16" height="15" aria-hidden="true">
          <path d="M8,2 L14.5,13.5 L1.5,13.5 Z" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
        </svg>
        borne éphémère
      </li>
      {(['vert', 'orange', 'rouge'] as const).map((c) => (
        <li key={c} className="flex items-center gap-1.5">
          <svg width="14" height="14" aria-hidden="true">
            <circle cx="7" cy="7" r="6" fill={TEINTES[c]} />
          </svg>
          {c}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <svg width="14" height="14" aria-hidden="true">
          <circle cx="7" cy="7" r="6" fill={TEINTES.gris} />
        </svg>
        écartée
      </li>
      {zonesAffichees ? (
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3.5 w-5 rounded-pastille" style={{ background: 'rgba(156,163,175,0.55)' }} />
          gris : géométrie faible
        </li>
      ) : null}
    </ul>
  )
}

export default function Carte() {
  const debut = performance.now()
  const { releve } = useParams()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const r = useReleve(releve)
  const { intervalle, choisir } = useIntervalle()
  const calcule = r.etat.statut === 'pret' ? r.etat.calcule : null
  const donnees = useCourbes(calcule, intervalle)
  const mode: ModeZones = params.get('zones') === 'ephemere' ? 'ephemere' : 'normal'
  const zones = useMemo(() => (calcule ? zonesFaibles(calcule, mode) : null), [calcule, mode])
  const carte = useRef<PoigneeCarte>(null)
  const [borne, setBorne] = useState<string | null>(null)

  // Timing of the map (performance entry « releve-carte », read by the bench): from the start of the
  // render that brings new data, contours or zones, to the next frame.
  useLayoutEffect(() => {
    if (!calcule) return
    const n = requestAnimationFrame(() => {
      try {
        performance.measure('releve-carte', { start: debut, end: performance.now(), detail: { stations: calcule.stations.length, courbes: donnees?.courbes.length ?? 0 } })
      } catch {
        // Old browser without measure options: no timing.
      }
    })
    return () => cancelAnimationFrame(n)
    // Measured only when what is drawn changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcule, donnees, zones])

  if (!calcule || r.etat.statut !== 'pret') return <CadreReleve releve={r} onglet="carte">{null}</CadreReleve>
  const id = r.etat.releve.id
  const bornes = bornesPlacees(calcule)
  const nbEph = calcule.bornes.filter((b) => b.donnees.type === 'ephemere').length
  const stationsVues = calcule.stations.filter((s) => positionStation(s)).length
  const titre = `Carte : ${stationsVues} station${stationsVues > 1 ? 's' : ''}${nbEph ? `, ${nbEph} borne${nbEph > 1 ? 's' : ''} éphémère${nbEph > 1 ? 's' : ''}` : ''}`
  const mention = mentionCarte(calcule)
  const choisie = borne ? calcule.bornes.find((b) => b.id === borne) : null
  const sansPlace = bornes.length === 0
  const nbCourbes = donnees?.courbes.length ?? 0

  return (
    <CadreReleve releve={r} onglet="carte">
      <div>
        <h1 className="rt-etroite m-0 text-[34px] font-extrabold leading-none">Carte</h1>
        <p className="m-0 mt-1 text-[17px] font-semibold text-encre2">{titre.replace('Carte : ', '')}</p>
      </div>
      {mode === 'ephemere' ? (
        <p role="status" className="m-0 rounded-rt border-[3px] border-encre bg-champActif px-3 py-2.5 text-[17px] font-bold leading-snug">
          Évitez les zones grises pour planter la borne éphémère.
        </p>
      ) : null}
      {sansPlace ? (
        <p className="m-0 rounded-rt border-[3px] border-encre bg-surface p-4 text-[17px] font-semibold leading-snug">
          La carte se remplit après le calage : les bornes se placent, puis chaque station calculée.
        </p>
      ) : (
        <div className="relative">
          <VueCarte ref={carte} calcule={calcule} courbes={donnees?.courbes ?? []} zones={zones?.rectangles ?? []} hauteur={HAUTEUR_CARTE} onStation={(s) => naviguer(`/r/${id}/saisir/${s}`)} onBorne={setBorne} borneChoisie={borne} />
          <button
            type="button"
            onClick={() => carte.current?.recentrer()}
            className="rt-etroite absolute left-2 top-2 flex min-h-[48px] items-center gap-1.5 rounded-rt border-[3px] border-encre bg-surface px-3 text-[18px] font-bold text-encre"
          >
            <Icone nom="carte" taille={20} />
            Recentrer
          </button>
        </div>
      )}
      {choisie ? (
        <p className="m-0 flex items-center gap-2 text-[16px] font-semibold" aria-live="polite">
          <span className="rt-etroite rounded-lettre border-[3px] border-encre bg-cible px-2 text-[18px] font-extrabold leading-tight">{libelleBorne(choisie.donnees)}</span>
          {choisie.donnees.nom}
          {choisie.active ? '' : ', retirée'}
          {choisie.donnees.type === 'ephemere' ? `, rang ${choisie.donnees.rang}` : ''}
        </p>
      ) : null}
      {mention ? <p className="m-0 text-[15px] font-semibold text-encre2">{mention}</p> : null}
      <Legende zonesAffichees={(zones?.rectangles.length ?? 0) > 0} />
      <section aria-labelledby="rt-courbes-carte" className="flex flex-col gap-2">
        <h2 id="rt-courbes-carte" className="rt-etroite m-0 text-[20px] font-bold">
          Courbes de niveau
        </h2>
        <ChoixIntervalle valeur={intervalle} onChange={choisir} />
        {intervalle > 0 && calcule.pointsCourbes.length < 6 ? (
          <p className="m-0 text-[15px] font-semibold text-encre2">Les courbes apparaissent à partir de 6 points, bornes comprises.</p>
        ) : intervalle > 0 && !nbCourbes && !sansPlace ? (
          <p className="m-0 text-[15px] font-semibold text-encre2">Aucune courbe dans la zone couverte : les points sont trop éloignés pour la coupure de {String(calcule.reglages.coupure).replace('.', ',')} m.</p>
        ) : null}
      </section>
      <Aide titre="Lire la carte">
        Deux doigts pour zoomer, un doigt pour déplacer, deux touches rapides pour grossir. Touchez une station pour l'ouvrir, une borne pour lire le nom de l'endroit. Le quadrillage fait 5 m, son origine est la première borne. Les zones grises sont celles où une station serait mal placée par rapport aux bornes.
      </Aide>
      <Bouton variante="principal" onClick={() => naviguer(`/r/${id}/saisir`)}>
        Saisir la station {calcule.prochainNumero}
      </Bouton>
    </CadreReleve>
  )
}
