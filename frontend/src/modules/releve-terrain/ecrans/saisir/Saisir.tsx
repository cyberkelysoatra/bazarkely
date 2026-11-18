// Screen 8, step 3 « Saisir une station » (H07 to H11, H15, D10, D21, D22), route /r/:releve/saisir/:station?
// Views of the route (search parameter `vue`): the input (default), the result of a green station, the
// incomplete station (H11) and screen 9 « Station rouge » (orange or red station). `refaire=<borne>`
// reopens the input on that row (screen 9).
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bouton } from '../../composants/Bouton'
import { Confirmation, Feuille } from '../../composants/Feuilles'
import { PastilleEtat } from '../../composants/Pastilles'
import { montrerAvis } from '../../etat/avis'
import type { StationCalculee } from '../../etat/releveCalcule'
import { useReleve } from '../../etat/useReleve'
import StationRouge from '../station-rouge/StationRouge'
import { CadreStations, type ResultatUseReleve } from './Cadre'
import { Chiffres, MOT_COULEUR } from './Chiffres'
import { LignesStation } from './LignesStation'
import { lettresManquantes, lignesStation, pasVisiblesRepetes, texteManquantes } from './logique'
import { useSaisieStation } from './useSaisieStation'
import { useVerrouEcran } from './useVerrouEcran'

type Pret = ResultatUseReleve & { etat: Extract<ResultatUseReleve['etat'], { statut: 'pret' }> }

export default function Saisir() {
  const { releve: releveId } = useParams()
  const r = useReleve(releveId)
  useVerrouEcran(true)
  if (r.etat.statut !== 'pret') return <CadreStations releve={r}>{null}</CadreStations>
  return <SaisirPret r={r as Pret} />
}

function SaisirPret({ r }: { r: Pret }) {
  const { station: stationParam } = useParams()
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const { calcule, releve } = r.etat
  const stationId = stationParam ?? null
  const station = stationId ? (calcule.stations.find((s) => s.id === stationId) ?? null) : null
  const vue = params.get('vue')
  const base = `/r/${releve.id}`

  if (stationId && !station && vue) {
    // Deleted station (or another tab): back to a new station.
    return <EcranSaisie r={r} stationId={null} refaire={null} />
  }
  if (vue === 'resultat' && station) {
    if (station.incomplete || !station.resultat.calculee) return <EcranIncomplete r={r} station={station} />
    if (station.couleur === 'vert' && station.donnees.etat !== 'ecartee') return <EcranVert r={r} station={station} />
    return (
      <>
        <StationRouge
          r={r}
          station={station}
          onRefaire={(borneId) => naviguer(`${base}/saisir/${station.id}${borneId ? `?refaire=${borneId}` : ''}`)}
          onSuivante={() => naviguer(`${base}/saisir`)}
        />
        <PropositionH15 r={r} station={station} />
      </>
    )
  }
  return <EcranSaisie r={r} stationId={stationId} refaire={params.get('refaire')} />
}

/** Form view: rows, « Stations incomplètes », fixed « Calculer la station » (D21). */
function EcranSaisie({ r, stationId, refaire }: { r: Pret; stationId: string | null; refaire: string | null }) {
  const naviguer = useNavigate()
  const { calcule, releve } = r.etat
  const base = `/r/${releve.id}`
  const onCreee = useCallback((id: string) => naviguer(`${base}/saisir/${id}`, { replace: true }), [naviguer, base])
  const saisie = useSaisieStation(calcule, r.actions, stationId, onCreee)
  const [calcul, setCalcul] = useState(false)
  const incompletes = calcule.stations.filter((s) => s.incomplete && s.id !== saisie.stationId)

  const calculer = async () => {
    if (calcul) return
    setCalcul(true)
    try {
      await saisie.attendre()
      saisie.fermerRemplacements()
      const id = saisie.stationId
      if (!id) {
        montrerAvis('Saisissez au moins 3 visées avant de calculer.', 'alerte')
        return
      }
      naviguer(`${base}/saisir/${id}?vue=resultat`)
    } finally {
      setCalcul(false)
    }
  }

  return (
    <CadreStations
      releve={r}
      pied={
        <Bouton data-calculer onClick={() => void calculer()} disabled={calcul}>
          Calculer la station
        </Bouton>
      }
    >
      <LignesStation saisie={saisie} refaire={refaire} />
      {incompletes.length ? (
        <p className="m-0 text-[16px] font-semibold" data-incompletes>
          Stations incomplètes :{' '}
          {incompletes.map((s, i) => (
            <span key={s.id}>
              {i > 0 ? ', ' : ''}
              <Link to={`${base}/saisir/${s.id}`} className="font-bold text-encre underline">
                {s.numero}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </CadreStations>
  )
}

/** Green station: figures, « Station suivante », « Faire de cette station une borne éphémère ». */
function EcranVert({ r, station }: { r: Pret; station: StationCalculee }) {
  const naviguer = useNavigate()
  const { calcule, releve } = r.etat
  const base = `/r/${releve.id}`
  const res = station.resultat
  const garde = station.donnees.etat === 'gardee'
  return (
    <>
      <CadreStations
        releve={r}
        pied={
          <>
            <Bouton data-suivante onClick={() => naviguer(`${base}/saisir`)}>
              Station suivante
            </Bouton>
            <Bouton variante="secondaire" grand={false} className="text-[18px]" onClick={() => naviguer(`${base}/ephemere?etape=3&station=${station.id}`)}>
              Faire de cette station une borne éphémère
            </Bouton>
          </>
        }
      >
        <div className="flex items-center justify-between gap-3" data-resultat-station={station.numero} data-couleur="vert">
          <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-none">Station {station.numero}</h2>
          <PastilleEtat couleur="vert" mot={MOT_COULEUR.vert} />
        </div>
        <p className="m-0 text-[16px] font-semibold">{garde && station.donnees.note ? `Station gardée : ${station.donnees.note}` : 'Bonne lecture : station retenue.'}</p>
        <Chiffres resultat={res} couleurs={res.couleurs} bornes={calcule.bornes} />
        {res.tropPres ? <Avertissement texte="trop près de la borne, calcul fragile" /> : null}
        {res.viseesLongues.length ? <Avertissement texte="Visées de plus de 60 m : précision moindre." orange /> : null}
        <Link to={`${base}/saisir/${station.id}`} className="flex min-h-[48px] items-center text-[17px] font-semibold text-encre underline">
          Revoir les visées de {station.numero}
        </Link>
      </CadreStations>
      <PropositionH15 r={r} station={station} />
    </>
  )
}

function Avertissement({ texte, orange = false }: { texte: string; orange?: boolean }) {
  return (
    <p role="note" className={`m-0 rounded-rt border-2 px-3 py-2 text-[16px] font-semibold ${orange ? 'border-orangeTexte bg-orangeFond text-orangeTexte' : 'border-rougeTexte bg-rougeFond text-rougeTexte'}`}>
      {texte}
    </p>
  )
}

/** H11: fewer than 3 usable sights, no calculation. */
function EcranIncomplete({ r, station }: { r: Pret; station: StationCalculee }) {
  const naviguer = useNavigate()
  const { calcule, releve } = r.etat
  const base = `/r/${releve.id}`
  const [supprimer, setSupprimer] = useState(false)
  const manquantes = lettresManquantes(lignesStation(calcule.bornes, station.donnees))
  return (
    <CadreStations
      releve={r}
      pied={
        <>
          <Bouton data-ajouter-ephemere onClick={() => naviguer(`${base}/ephemere?etape=1&pour=${station.id}`)}>
            Ajouter une borne éphémère
          </Bouton>
          <Bouton variante="secondaire" grand={false} onClick={() => naviguer(`${base}/saisir`)}>
            Plus tard
          </Bouton>
        </>
      }
    >
      <div className="flex items-center justify-between gap-3" data-resultat-station={station.numero} data-couleur="incomplete">
        <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-none">Station {station.numero}</h2>
        <PastilleEtat couleur="gris" mot="INCOMPLÈTE" />
      </div>
      <div className="rounded-rt border-[3px] border-encre bg-surface p-3">
        <p className="m-0 text-[19px] font-bold" data-manquantes>
          {texteManquantes(manquantes)}
        </p>
        <p className="m-0 mt-1 text-[16px] leading-snug text-encre2">
          Pas de calcul sous 3 visées. Les visées saisies sont gardées : ajoutez une borne éphémère visible d'ici, ou complétez la station plus tard.
        </p>
      </div>
      <Link to={`${base}/saisir/${station.id}`} className="flex min-h-[48px] items-center text-[17px] font-semibold text-encre underline">
        Compléter les visées de {station.numero}
      </Link>
      <Bouton variante="danger" grand={false} onClick={() => setSupprimer(true)}>
        Supprimer la station
      </Bouton>
      <Confirmation
        ouvert={supprimer}
        titre={`Supprimer la station ${station.numero}`}
        texte="Ses visées saisies seront effacées de ce relevé."
        confirmer={{
          libelle: 'Supprimer',
          onClick: async () => {
            setSupprimer(false)
            if (await r.actions.supprimerObjets([station.id])) {
              montrerAvis(`Station ${station.numero} supprimée.`)
              naviguer(`${base}/saisir`, { replace: true })
            }
          },
        }}
        onAnnuler={() => setSupprimer(false)}
      />
    </CadreStations>
  )
}

/** H15: the same target « pas visible » on this station and the one before: propose an ephemeral target. */
function PropositionH15({ r, station }: { r: Pret; station: StationCalculee }) {
  const naviguer = useNavigate()
  const { calcule, releve } = r.etat
  const repetees = pasVisiblesRepetes(calcule.stations, station.id, calcule.bornes)
  const cle = `${station.id}:${repetees.map((b) => b.id).join(',')}`
  const [fermees, setFermees] = useState<string[]>([])
  const ouvert = repetees.length > 0 && !fermees.includes(cle)
  const lettres = repetees.map((b) => b.donnees.lettre).join(' et ')
  return (
    <Feuille ouvert={ouvert} titre="Borne cachée deux fois" onFermer={() => setFermees((f) => [...f, cle])}>
      <div className="flex flex-col gap-3" data-proposition-h15>
        <p className="m-0 text-[18px] leading-snug">
          La borne {lettres} n'est pas visible sur deux stations de suite.
        </p>
        <p className="m-0 text-[20px] font-bold">Ajouter une borne éphémère pour cette zone ?</p>
        <Bouton onClick={() => naviguer(`/r/${releve.id}/ephemere?etape=1`)}>Oui</Bouton>
        <Bouton variante="secondaire" onClick={() => setFermees((f) => [...f, cle])}>
          Non
        </Bouton>
      </div>
    </Feuille>
  )
}
