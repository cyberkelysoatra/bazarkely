// Screen 10 « Borne éphémère » (H13, H14, rules 6.7, 6.9), route /r/:releve/ephemere.
// Search parameters: `etape` 1 Conseil, 2 Mesure, 3 Contrôle, 4 Création (none: list of the ephemeral
// targets); `station` the measured (or chosen green) station; `pour` the incomplete station to go back to;
// `lettre` the panel chosen at step 1.
import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bouton } from '../../composants/Bouton'
import { formaterNombre } from '../../composants/ChampNombre'
import { Confirmation } from '../../composants/Feuilles'
import { ChampTexte } from '../../composants/Formulaires'
import { PastilleEtat, PastilleLettre } from '../../composants/Pastilles'
import { MESSAGES } from '../../calcul'
import { nouvelId } from '../../db/depot'
import { montrerAvis } from '../../etat/avis'
import type { BorneCalculee } from '../../etat/releveCalcule'
import { useReleve } from '../../etat/useReleve'
import { CadreStations, type ResultatUseReleve } from '../saisir/Cadre'
import { LignesStation } from '../saisir/LignesStation'
import { m3 } from '../saisir/logique'
import { useSaisieStation } from '../saisir/useSaisieStation'
import { useVerrouEcran } from '../saisir/useVerrouEcran'
import { EtapeControle } from './EtapeControle'
import { controlerStation, lettreProposee, lettresLibres, objetsCreation, objetsRetrait, stationsQuiVisent, verifierCreation } from './logique'

type Pret = ResultatUseReleve & { etat: Extract<ResultatUseReleve['etat'], { statut: 'pret' }> }

const NOMS_ETAPES = ['Conseil', 'Mesure', 'Contrôle', 'Création']

export default function Ephemere() {
  const { releve: releveId } = useParams()
  const r = useReleve(releveId)
  const [params] = useSearchParams()
  useVerrouEcran(params.get('etape') === '2')
  if (r.etat.statut !== 'pret') return <CadreStations releve={r}>{null}</CadreStations>
  return <EphemerePret r={r as Pret} />
}

function EtapesEphemere({ actuelle }: { actuelle: number }) {
  return (
    <ol className="m-0 grid list-none grid-cols-4 overflow-hidden rounded-rt border-[3px] border-encre p-0" aria-label="Étapes de la borne éphémère">
      {NOMS_ETAPES.map((nom, i) => {
        const n = i + 1
        const cls = n === actuelle ? 'bg-encre text-white' : n < actuelle ? 'bg-jaune text-encre' : 'bg-surface text-encre'
        return (
          <li key={nom} aria-current={n === actuelle ? 'step' : undefined} className={`rt-etroite flex min-h-[44px] flex-col items-center justify-center text-[15px] font-bold leading-none ${i > 0 ? 'border-l-2 border-encre' : ''} ${cls}`}>
            <span className="text-[18px]">{n < actuelle ? '✓' : n}</span>
            <span>{nom}</span>
          </li>
        )
      })}
    </ol>
  )
}

function EphemerePret({ r }: { r: Pret }) {
  const [params, setParams] = useSearchParams()
  const etape = Number(params.get('etape') ?? 0)
  const aller = useCallback(
    (p: Record<string, string | null>) => {
      const n = new URLSearchParams(params)
      for (const [k, v] of Object.entries(p)) {
        if (v === null) n.delete(k)
        else n.set(k, v)
      }
      setParams(n)
    },
    [params, setParams],
  )
  if (etape === 1) return <Etape1 r={r} aller={aller} />
  if (etape === 2) return <Etape2 r={r} aller={aller} />
  if (etape === 3) return <Etape3 r={r} aller={aller} />
  if (etape === 4) return <Etape4 r={r} aller={aller} />
  return <Liste r={r} aller={aller} />
}

type Aller = (p: Record<string, string | null>) => void

function Titre({ texte }: { texte: string }) {
  return <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-none">{texte}</h2>
}

/** Step 1: advice, next free panel (another free letter may be chosen). */
function Etape1({ r, aller }: { r: Pret; aller: Aller }) {
  const [params] = useSearchParams()
  const { calcule, releve } = r.etat
  const libres = lettresLibres(calcule.bornes)
  const proposee = lettreProposee(calcule.bornes)
  const choisie = params.get('lettre')
  const lettre = choisie && libres.includes(choisie) ? choisie : proposee
  const ht = formaterNombre(releve.entete.ht ?? 1.5, 2)
  return (
    <CadreStations
      releve={r}
      lienEphemeres={false}
      pied={
        lettre ? (
          <Bouton data-suivant onClick={() => aller({ etape: '2', lettre, station: null })}>
            Piquet planté : mesurer
          </Bouton>
        ) : null
      }
    >
      <Titre texte="Borne éphémère" />
      <EtapesEphemere actuelle={1} />
      {lettre ? (
        <>
          <div className="flex items-start gap-3 rounded-rt border-[3px] border-encre bg-surface p-3">
            <PastilleLettre lettre={lettre} taille={46} />
            <p className="m-0 text-[18px] font-semibold leading-snug" data-conseil>
              Plantez un piquet avec le panneau {lettre} (cible à {ht} m), à un endroit d'où vous voyez les 3 bornes principales et la zone à relever.
            </p>
          </div>
          <Link to={`/r/${releve.id}/carte?zones=ephemere`} className="flex min-h-[48px] items-center text-[17px] font-semibold text-encre underline">
            Voir sur la carte les endroits à éviter
          </Link>
          <details className="rounded-rt border-2 border-encre bg-surface">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center px-3 text-[17px] font-semibold">Choisir une autre lettre libre</summary>
            <div className="grid grid-cols-6 gap-1.5 border-t-2 border-encre p-3">
              {libres.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={l === lettre}
                  onClick={() => aller({ lettre: l })}
                  className={`rt-etroite flex h-12 items-center justify-center rounded-rt border-[3px] border-encre text-[22px] font-extrabold ${l === lettre ? 'bg-jaune' : 'bg-surface'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </details>
        </>
      ) : (
        <p role="alert" className="m-0 rounded-rt border-[3px] border-rougeTexte bg-rougeFond p-3 text-[18px] font-bold text-rougeTexte">
          Plus aucun panneau libre : {MESSAGES.plusDeLettre}.
        </p>
      )}
    </CadreStations>
  )
}

/** Step 2: a station measured on the piquet, with the rows of screen 8 (« mesure de la borne »). */
function Etape2({ r, aller }: { r: Pret; aller: Aller }) {
  const [params] = useSearchParams()
  const { calcule } = r.etat
  const stationId = params.get('station')
  const onCreee = useCallback((id: string) => aller({ station: id }), [aller])
  const saisie = useSaisieStation(calcule, r.actions, stationId, onCreee)
  const [calcul, setCalcul] = useState(false)
  const lettre = params.get('lettre') ?? lettreProposee(calcule.bornes) ?? '?'
  const calculer = async () => {
    setCalcul(true)
    try {
      await saisie.attendre()
      if (!saisie.stationId) {
        montrerAvis('Saisissez au moins 3 visées avant de calculer.', 'alerte')
        return
      }
      aller({ etape: '3', station: saisie.stationId })
    } finally {
      setCalcul(false)
    }
  }
  return (
    <CadreStations
      releve={r}
      lienEphemeres={false}
      pied={
        <Bouton data-calculer disabled={calcul} onClick={() => void calculer()}>
          Calculer la station
        </Bouton>
      }
    >
      <EtapesEphemere actuelle={2} />
      <LignesStation saisie={saisie} titre={`Mesure de la borne ${lettre}`} consigne={`Placez-vous sur le piquet et visez les bornes principales, comme une station (${saisie.numero}).`} />
    </CadreStations>
  )
}

/** Step 3: control of the station (rank first, then green and index <= 2,0). */
function Etape3({ r, aller }: { r: Pret; aller: Aller }) {
  const [params] = useSearchParams()
  const { calcule } = r.etat
  const station = calcule.stations.find((s) => s.id === params.get('station')) ?? null
  return (
    <CadreStations releve={r} lienEphemeres={false}>
      <Titre texte="Borne éphémère" />
      <EtapesEphemere actuelle={3} />
      {station ? (
        <EtapeControle
          station={station}
          reglages={calcule.reglages}
          bornes={calcule.bornes}
          onContinuer={(rang) => aller({ etape: '4', rang: String(rang) })}
          onAutreEndroit={() => aller({ etape: '1', station: null, rang: null })}
          onCompleter={() => aller({ etape: '2' })}
        />
      ) : (
        <p className="m-0 text-[18px] font-semibold">Station introuvable : recommencez la mesure.</p>
      )}
    </CadreStations>
  )
}

/** Step 4: letter, place name (mandatory), rank; creation, journal, back to screen 8. */
function Etape4({ r, aller }: { r: Pret; aller: Aller }) {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const { calcule, releve } = r.etat
  const station = calcule.stations.find((s) => s.id === params.get('station')) ?? null
  const [lettre, setLettre] = useState(() => {
    const l = params.get('lettre')
    return l && lettresLibres(calcule.bornes).includes(l) ? l : (lettreProposee(calcule.bornes) ?? '')
  })
  const [nom, setNom] = useState('')
  const [erreurs, setErreurs] = useState<{ lettre: string | null; nom: string | null }>({ lettre: null, nom: null })
  const [envoi, setEnvoi] = useState(false)
  const controle = station ? controlerStation(station, calcule.reglages, calcule.bornes) : null
  const proposee = lettreProposee(calcule.bornes)
  const pos = station?.retenu ?? null

  if (!station || !controle || !controle.ok || !pos) {
    return (
      <CadreStations releve={r} lienEphemeres={false}>
        <Titre texte="Borne éphémère" />
        <EtapesEphemere actuelle={4} />
        <p className="m-0 text-[18px] font-semibold">{controle && !controle.ok ? controle.raison : 'Station introuvable : recommencez la mesure.'}</p>
        <Bouton onClick={() => aller({ etape: '1', station: null })}>Choisir un autre endroit</Bouton>
      </CadreStations>
    )
  }
  const l = lettre.trim().toUpperCase()

  const creer = async () => {
    const e = verifierCreation(l, nom, calcule.bornes)
    setErreurs(e)
    if (e.lettre || e.nom) return
    setEnvoi(true)
    const id = nouvelId()
    const ok = await r.actions.ecrireObjets(objetsCreation({ id, lettre: l, nom, rang: controle.rang, station, bornes: calcule.bornes, le: new Date().toISOString() }))
    setEnvoi(false)
    if (!ok) return
    montrerAvis(`Borne ${l} créée : ${nom.trim()}.`)
    const pour = params.get('pour')
    naviguer(pour ? `/r/${releve.id}/saisir/${pour}` : `/r/${releve.id}/saisir`)
  }

  return (
    <CadreStations
      releve={r}
      lienEphemeres={false}
      pied={
        <Bouton data-creer disabled={envoi} onClick={() => void creer()}>
          Créer la borne {l || '?'} et revenir à la saisie
        </Bouton>
      }
    >
      <Titre texte="Borne éphémère" />
      <EtapesEphemere actuelle={4} />
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void creer()
        }}
      >
        <div className="flex items-end gap-3">
          <PastilleLettre lettre={l || '?'} taille={64} />
          <div className="min-w-0 flex-1">
            <ChampTexte
              libelle="Lettre du panneau"
              valeur={lettre}
              onChange={(v) => {
                setLettre(v.toUpperCase().slice(0, 1))
                setErreurs((x) => ({ ...x, lettre: null }))
              }}
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={1}
              data-champ-lettre
            />
          </div>
        </div>
        {erreurs.lettre ? (
          <p role="alert" className="m-0 text-[16px] font-semibold text-rougeTexte" data-erreur-lettre>
            {erreurs.lettre}
          </p>
        ) : null}
        <p className="m-0 text-[15px] text-encre2" data-lettre-proposee={proposee ?? ''}>
          Prochain panneau libre : {proposee ?? 'aucun'}. Une autre lettre libre peut être choisie.
        </p>
        <ChampTexte
          libelle="Nom de l'endroit"
          valeur={nom}
          onChange={(v) => {
            setNom(v)
            setErreurs((x) => ({ ...x, nom: null }))
          }}
          erreur={erreurs.nom}
          placeholder="Piquet du manguier"
          autoComplete="off"
          maxLength={120}
          data-champ-nom
        />
        <div className="flex flex-col gap-1 rounded-rt border-2 border-encre bg-surface p-3 text-[17px]">
          <span data-rang-creation={controle.rang}>
            <strong>Rang {controle.rang}</strong> {controle.rang === 1 ? '(depuis les bornes principales)' : '(depuis une borne éphémère)'}
          </span>
          <span data-position-creation>
            Depuis la station {station.numero} : X {m3(pos.x)} ; Y {m3(pos.y)} ; altitude {m3(pos.z)}
          </span>
        </div>
      </form>
    </CadreStations>
  )
}

function texteVisees(n: number): string {
  if (n === 0) return ''
  return n === 1 ? ", avec la station qui l'a visée" : `, avec les ${n} stations qui l'ont visée`
}

/** List « Bornes éphémères actives » with « Retirer » (H14); withdrawn ones in grey. No deletion. */
function Liste({ r, aller }: { r: Pret; aller: Aller }) {
  const { calcule } = r.etat
  const [aRetirer, setARetirer] = useState<BorneCalculee | null>(null)
  const ephemeres = calcule.bornes.filter((b) => b.donnees.type === 'ephemere')
  const actives = ephemeres.filter((b) => b.active)
  const retirees = ephemeres.filter((b) => !b.active)
  const origine = (b: BorneCalculee) => calcule.stations.find((s) => s.id === b.donnees.station_origine)?.numero ?? '?'
  return (
    <CadreStations
      releve={r}
      lienEphemeres={false}
      pied={
        <Bouton data-ajouter onClick={() => aller({ etape: '1' })}>
          Ajouter une borne éphémère
        </Bouton>
      }
    >
      <Titre texte="Bornes éphémères" />
      <h3 className="rt-etroite m-0 text-[24px] font-extrabold">Bornes éphémères actives</h3>
      {actives.length === 0 ? <p className="m-0 text-[17px] text-encre2">Aucune borne éphémère active.</p> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0" data-liste-actives>
        {actives.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-rt border-2 border-encre bg-surface p-3" data-borne-ephemere={b.donnees.lettre}>
            <PastilleLettre lettre={b.donnees.lettre} taille={44} usage={b.donnees.usage} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="rt-etroite truncate text-[22px] font-bold">{b.etiquette}</span>
              <span className="text-[14px] text-encre2">
                Rang {b.donnees.rang}, depuis {origine(b)}
                {b.position ? `, altitude ${m3(b.position.z)}` : ''}
              </span>
            </div>
            <Bouton variante="secondaire" grand={false} pleineLargeur={false} className="px-3 text-[18px]" onClick={() => setARetirer(b)}>
              Retirer
            </Bouton>
          </li>
        ))}
      </ul>
      {retirees.length ? (
        <>
          <h3 className="rt-etroite m-0 text-[22px] font-extrabold">Bornes retirées</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {retirees.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-rt border-2 border-grisTexte bg-grisFond p-3 text-grisTexte" data-borne-retiree={`${b.donnees.lettre}${b.donnees.usage}`}>
                <span className="rt-etroite min-w-0 flex-1 truncate text-[19px] font-bold">{b.etiquette}</span>
                <PastilleEtat couleur="gris" mot="RETIRÉE" petite />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Confirmation
        ouvert={!!aRetirer}
        titre={aRetirer ? `Retirer la borne ${aRetirer.donnees.lettre}` : ''}
        texte={
          aRetirer ? (
            <>
              <p className="m-0 mb-2">
                {aRetirer.etiquette} quitte les lignes de saisie. Elle reste en gris sur la carte et dans les exports{texteVisees(stationsQuiVisent(calcule.stations, aRetirer.id).length)}.
              </p>
              <p className="m-0">Le panneau {aRetirer.donnees.lettre} redevient libre.</p>
            </>
          ) : (
            ''
          )
        }
        confirmer={{
          libelle: 'Retirer',
          onClick: async () => {
            const b = aRetirer
            setARetirer(null)
            if (b && (await r.actions.ecrireObjets(objetsRetrait(b, new Date().toISOString())))) montrerAvis(`Borne ${b.donnees.lettre} retirée : panneau libre.`)
          },
        }}
        onAnnuler={() => setARetirer(null)}
      />
    </CadreStations>
  )
}
