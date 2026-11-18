// Screen 9 « Station rouge » (H08, H09, H10), shown inside the Saisir route for an orange or red station.
// Coloured block (« Lecture fausse » red, « À vérifier » orange) naming the action, altitudes per target,
// the figures of H08; « Refaire la visée vers B » (back to the input on that row), « Garder quand même »
// (note mandatory, journal station_gardee), « Écarter » (confirmation, journal station_ecartee). With 4
// sights or more: the suspect sight named, the result without it and « Garder ce résultat sans C ».
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ResultatStation } from '../../calcul'
import { Bouton } from '../../composants/Bouton'
import { Confirmation, Feuille } from '../../composants/Feuilles'
import { ChampTexte } from '../../composants/Formulaires'
import { PastilleEtat } from '../../composants/Pastilles'
import type { BorneCalculee, StationCalculee } from '../../etat/releveCalcule'
import { CadreStations, type ResultatUseReleve } from '../saisir/Cadre'
import { Chiffres, MOT_COULEUR, altitudesParBorne } from '../saisir/Chiffres'
import { m3 } from '../saisir/logique'

type Pret = ResultatUseReleve & { etat: Extract<ResultatUseReleve['etat'], { statut: 'pret' }> }

export const MESSAGE_NOTE_VIDE = 'Écrivez une note : pourquoi garder cette station ?'

/** Action named by the block (H08 format: letter, comma, place name). */
export function actionNommee(res: ResultatStation, bornes: BorneCalculee[]): string {
  const suspecte = res.viseeSuspecte ? bornes.find((b) => b.id === res.viseeSuspecte) : null
  if (suspecte) return `Refaire la visée vers ${suspecte.donnees.lettre}, ${suspecte.donnees.nom}`
  if (res.messageSuspect) return res.messageSuspect
  const causes: string[] = []
  if (res.couleurs?.indice && res.couleurs.indice !== 'vert') causes.push('Géométrie fragile : station loin des bornes ou alignée avec elles')
  if (res.couleurs?.distance && res.couleurs.distance !== 'vert') causes.push('Visées de plus de 60 m : précision moindre')
  return causes.length ? causes.join('. ') : 'Vérifiez les visées'
}

/** « C 0,003, A 0,953, B 0,186, D 0,966 »: the suspect sight first, then the others in letter order. */
export function retraitsTexte(res: ResultatStation, bornes: BorneCalculee[]): { lettre: string; ecart: string; id: string }[] {
  const r = res.retraits ?? {}
  return Object.entries(r)
    .map(([id, v]) => ({ id, lettre: bornes.find((b) => b.id === id)?.donnees.lettre ?? '?', ecart: m3(v.ecartPosition) }))
    .sort((a, b) => (a.id === res.viseeSuspecte ? -1 : b.id === res.viseeSuspecte ? 1 : a.lettre.localeCompare(b.lettre)))
}

export interface PropsStationRouge {
  r: Pret
  station: StationCalculee
  /** Back to the input, on the row of this target (null: every sight). */
  onRefaire: (borneId: string | null) => void
  onSuivante: () => void
}

export default function StationRouge({ r, station, onRefaire, onSuivante }: PropsStationRouge) {
  const { calcule, releve } = r.etat
  const res = station.resultat
  const couleur = station.couleur ?? 'rouge'
  const rouge = couleur === 'rouge'
  const etat = station.donnees.etat
  const suspecte = res.viseeSuspecte ? calcule.bornes.find((b) => b.id === res.viseeSuspecte) : null
  const lettreSuspecte = suspecte?.donnees.lettre ?? null
  const quatre = !!res.sansSuspecte && !!suspecte
  const [garder, setGarder] = useState(false)
  const [note, setNote] = useState('')
  const [erreurNote, setErreurNote] = useState<string | null>(null)
  const [ecarter, setEcarter] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const maintenant = () => new Date().toISOString()

  const journal = (action: 'station_gardee' | 'station_ecartee', detail: Record<string, unknown>) => ({ type: 'journal' as const, donnees: { action, detail: { station: station.id, numero: station.numero, ...detail }, le: maintenant() } })

  const ecrireGardee = async (n: string, sansVisee: string | null) => {
    setEnvoi(true)
    const ok = await r.actions.ecrireObjets([
      { id: station.id, type: 'station', donnees: { ...station.donnees, etat: 'gardee', note: n, sans_visee: sansVisee } },
      journal('station_gardee', { note: n, sans_visee: sansVisee }),
    ])
    setEnvoi(false)
    return !!ok
  }

  const decide = etat === 'gardee' || etat === 'ecartee'
  const actionPrincipale = quatre || !!suspecte || !!res.messageSuspect
  // Keep or set aside: in the fixed foot only when there is no sight to redo (short foot, D21 spirit).
  const decisions = (
    <div className={actionPrincipale ? 'flex flex-col gap-2' : 'grid grid-cols-2 gap-2'} data-decisions>
      <Bouton variante="secondaire" grand={false} className="px-2 text-[19px]" onClick={() => setGarder(true)}>
        Garder quand même
      </Bouton>
      <Bouton variante="danger" grand={false} className="px-2 text-[19px]" onClick={() => setEcarter(true)}>
        Écarter
      </Bouton>
    </div>
  )
  const pied = decide ? (
    <Bouton data-suivante onClick={onSuivante}>
      Station suivante
    </Bouton>
  ) : (
    <>
      {quatre ? (
        <>
          <Bouton data-garder-sans disabled={envoi} onClick={() => void ecrireGardee(`Résultat gardé sans la visée vers ${lettreSuspecte}`, suspecte!.id)}>
            Garder ce résultat sans {lettreSuspecte}
          </Bouton>
          <Bouton variante="secondaire" grand={false} onClick={() => onRefaire(suspecte!.id)}>
            Refaire la visée vers {lettreSuspecte}
          </Bouton>
        </>
      ) : suspecte ? (
        <Bouton data-refaire onClick={() => onRefaire(suspecte.id)}>
          Refaire la visée vers {lettreSuspecte}
        </Bouton>
      ) : res.messageSuspect ? (
        <Bouton data-refaire onClick={() => onRefaire(null)}>
          Refaire les 3 visées
        </Bouton>
      ) : null}
      {actionPrincipale ? null : decisions}
    </>
  )

  const fond = etat === 'ecartee' ? 'bg-grisFond text-grisTexte border-grisTexte' : rouge ? 'bg-rougeFond text-rougeTexte border-rougeTexte' : 'bg-orangeFond text-orangeTexte border-orangeTexte'

  return (
    <CadreStations releve={r} pied={pied}>
      <div className="flex items-center justify-between gap-3" data-resultat-station={station.numero} data-couleur={couleur}>
        <h2 className="rt-etroite m-0 text-[30px] font-extrabold leading-none">Station {station.numero} : résultat</h2>
      </div>
      <section className={`flex flex-col gap-1.5 rounded-rt border-[3px] p-3 ${fond}`} data-bloc-rouge>
        <div className="flex items-center justify-between gap-2">
          <span className="rt-etroite text-[24px] font-extrabold">{etat === 'ecartee' ? 'Station écartée' : rouge ? 'Lecture fausse' : 'À vérifier'}</span>
          {etat === 'ecartee' ? <PastilleEtat couleur="gris" mot="ÉCARTÉE" /> : <PastilleEtat couleur={couleur} mot={MOT_COULEUR[couleur]} />}
        </div>
        <p className="m-0 text-[19px] font-bold leading-snug" data-action-nommee>
          {actionNommee(res, calcule.bornes)}
          {suspecte || res.messageSuspect ? '' : '.'}
        </p>
        <p className="m-0 text-[16px] leading-snug" data-altitudes-bornes>
          Altitudes calculées : {altitudesParBorne(res, calcule.bornes)}.
          {suspecte && !quatre ? ` ${lettreSuspecte} est la plus éloignée des autres.` : ''}
        </p>
        {etat === 'gardee' ? (
          <p className="m-0 text-[16px] font-semibold" data-etat-station="gardee">
            Station gardée : {station.donnees.note}
          </p>
        ) : null}
        {etat === 'ecartee' ? (
          <p className="m-0 text-[16px] font-semibold" data-etat-station="ecartee">
            Grise sur la carte, hors des courbes de niveau.
          </p>
        ) : null}
      </section>

      {quatre ? (
        <section className="flex flex-col gap-2 rounded-rt border-[3px] border-encre bg-surface p-3" data-sans-suspecte>
          <p className="m-0 text-[17px] font-bold">Écart de position en retirant chaque visée</p>
          <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-1 p-0 text-[17px]" data-retraits>
            {retraitsTexte(res, calcule.bornes).map((x) => (
              <li key={x.id} className={x.id === res.viseeSuspecte ? 'font-extrabold' : ''} data-retrait={x.lettre}>
                sans {x.lettre} : {x.ecart} m
              </li>
            ))}
          </ul>
          <p className="m-0 text-[17px] font-bold">
            {station.donnees.sans_visee ? `Résultat retenu sans ${lettreSuspecte}` : `Résultat sans ${lettreSuspecte}`}
          </p>
          <div data-resultat-sans>
            <Chiffres resultat={station.donnees.sans_visee && station.retenu ? station.retenu : res.sansSuspecte!} bornes={calcule.bornes} detail={false} />
          </div>
        </section>
      ) : null}

      <p className="m-0 text-[17px] font-bold">{quatre ? `Calcul avec les ${Object.keys(res.altitudesParBorne ?? {}).length} visées` : 'Calcul de la station'}</p>
      <Chiffres resultat={res} couleurs={res.couleurs} bornes={calcule.bornes} />
      <Link to={`/r/${releve.id}/saisir/${station.id}`} className="flex min-h-[48px] items-center text-[17px] font-semibold text-encre underline">
        Revoir les visées de {station.numero}
      </Link>
      {actionPrincipale && !decide ? (
        <section className="flex flex-col gap-2 border-t-2 border-encre pt-3">
          <p className="m-0 text-[16px] font-semibold text-encre2">Ou décider sans refaire la visée :</p>
          {decisions}
        </section>
      ) : null}

      <Feuille ouvert={garder} titre="Garder la station" onFermer={() => setGarder(false)}>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            const n = note.trim()
            if (!n) {
              setErreurNote(MESSAGE_NOTE_VIDE)
              return
            }
            if (await ecrireGardee(n, station.donnees.sans_visee)) setGarder(false)
          }}
        >
          <p className="m-0 text-[16px] leading-snug">La station {station.numero} entre dans les courbes avec sa couleur. Notez pourquoi elle est gardée.</p>
          <ChampTexte libelle="Note (obligatoire)" valeur={note} onChange={(v) => { setNote(v); setErreurNote(null) }} erreur={erreurNote} autoComplete="off" maxLength={300} />
          <Bouton type="submit" disabled={envoi}>
            Garder la station
          </Bouton>
        </form>
      </Feuille>
      <Confirmation
        ouvert={ecarter}
        titre={`Écarter la station ${station.numero}`}
        texte="Elle reste visible en gris et n'entre pas dans les courbes de niveau."
        confirmer={{
          libelle: 'Écarter',
          onClick: async () => {
            setEcarter(false)
            await r.actions.ecrireObjets([{ id: station.id, type: 'station', donnees: { ...station.donnees, etat: 'ecartee' } }, journal('station_ecartee', {})])
          },
        }}
        onAnnuler={() => setEcarter(false)}
      />
    </CadreStations>
  )
}
