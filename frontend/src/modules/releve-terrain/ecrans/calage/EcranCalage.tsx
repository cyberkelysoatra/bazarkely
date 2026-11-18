// Screen 7, step 2 « Calage » (H05, rules 6.2, 6.3, 6.3 bis, 6.3 ter): one card per side, heading A to
// B, side of C when the plan cannot give it, result and control of the plan, then « valider le calage »
// (green or orange) or the red dialog (« Continuer quand même » noted in the journal, or « Refaire »).
// Screen wake lock while open (D10). Writes through useReleve only; results from useReleve and calcul/.
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { modeAffichageSuspect, type EntreeCote } from '../../calcul'
import { Bouton } from '../../composants/Bouton'
import { Aide, Confirmation } from '../../composants/Feuilles'
import { maintenant } from '../../db/depot'
import type { LectureCote, ObjetCote } from '../../db/types'
import type { BorneCalculee } from '../../etat/releveCalcule'
import { useReleve } from '../../etat/useReleve'
import { CadreReleve, type ResultatUseReleve } from '../CadreReleve'
import { CarteCap } from './CarteCap'
import { CarteCote, donneesDe, objetCote, saisieDe, type SaisieCote } from './CarteCote'
import { CarteControle, CarteResultat, aControle } from './CarteResultat'
import { DialogueRouge } from './DialogueRouge'
import { useVeille } from './useVeille'

export const MESSAGE_RECALCUL_CALAGE = 'Toutes les stations et bornes éphémères seront recalculées. Continuer ?'

const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Side of C must be asked: one of the three principal targets has no X or no Y. */
export function coteCDemande(bornes: (BorneCalculee | null)[]): boolean {
  return bornes.some((b) => !b || !nombre(b.donnees.plan?.x) || !nombre(b.donnees.plan?.y))
}

/** Inputs of the display-mode check (6.2), from the raw side objects. */
function entreesMode(cotes: (ObjetCote | null)[]): EntreeCote[] {
  return cotes
    .filter((o): o is ObjetCote => !!o)
    .map((o) => ({
      lectures: (o.donnees.lectures ?? []).filter((l): l is LectureCote & { distance: number; pente: number } => nombre(l.distance) && l.distance > 0 && nombre(l.pente)),
      decametre: o.donnees.decametre,
      hi: 0,
      ht: 0,
    }))
}

export default function EcranCalage() {
  const { releve } = useParams()
  const r = useReleve(releve)
  useVeille(true)
  return (
    <CadreReleve releve={r} etape={2} onglet="saisir" verrouiller>
      {r.etat.statut === 'pret' ? <Contenu r={r} /> : null}
    </CadreReleve>
  )
}

function Contenu({ r }: { r: ResultatUseReleve }) {
  const naviguer = useNavigate()
  const [enAttente, setEnAttente] = useState<(() => Promise<unknown>) | null>(null)
  const [rougeOuvert, setRougeOuvert] = useState(false)
  const [manque, setManque] = useState<string | null>(null)
  const etat = r.etat
  const objets = etat.statut === 'pret' ? etat.objets : []
  const cotesObj = useMemo(() => objets.filter((o): o is ObjetCote => o.type === 'cote' && !o.supprime), [objets])
  if (etat.statut !== 'pret') return null
  const { releve, calcule } = etat
  const { actions } = r
  const entete = releve.entete
  const { a, b, c } = calcule.principales
  if (!a || !b || !c) return <p className="m-0 text-[18px] font-semibold">Les 3 bornes principales manquent : revenez à l'étape 1.</p>
  const L = { a: a.donnees.lettre, b: b.donnees.lettre, c: c.donnees.lettre }
  const aStations = calcule.stations.length > 0

  /** Every change of the calibration after stations asks first (section 8). */
  const garder = (f: () => Promise<unknown>) => {
    setManque(null)
    if (aStations) setEnAttente(() => f)
    else void f()
  }

  const paires: { cle: 'ab' | 'bc' | 'ac'; p: BorneCalculee; q: BorneCalculee }[] = [
    { cle: 'ab', p: a, q: b },
    { cle: 'bc', p: b, q: c },
    { cle: 'ac', p: a, q: c },
  ]
  const objetsPaires = paires.map(({ p, q }) => objetCote(cotesObj, p.id, q.id))
  const ecrireCote = (i: number, s: SaisieCote) => {
    const { p, q } = paires[i]
    const o = objetsPaires[i]
    garder(() => actions.ecrireObjet({ id: o?.id, type: 'cote', donnees: donneesDe(s, p.id, q.id) }))
  }

  const demandeCote = coteCDemande([a, b, c])
  const calage = calcule.calage
  const cotes = calcule.cotes
  const pret = !!calage && !!cotes.ab && !!cotes.bc && !!cotes.ac && (!demandeCote || entete.cote_c !== null)
  const modeSuspect = modeAffichageSuspect(entreesMode(objetsPaires))
  const declinaison = nombre(entete.orientation?.declinaison) ? entete.orientation.declinaison : calcule.reglages.declinaison

  const valider = async () => {
    if (!pret || !calage) {
      setManque(!calage ? 'Saisissez au moins une lecture complète sur chacun des 3 côtés.' : `Dites si ${L.c} est à gauche ou à droite en regardant de ${L.a} vers ${L.b}.`)
      return
    }
    if (calage.couleur === 'rouge') {
      setRougeOuvert(true)
      return
    }
    if (await actions.modifierEntete({ calage: { etat: 'valide', le: maintenant() } })) naviguer(`/r/${releve.id}/saisir`)
  }

  const forcer = async () => {
    setRougeOuvert(false)
    const le = maintenant()
    if (!(await actions.modifierEntete({ calage: { etat: 'force', le } }))) return
    await actions.ecrireObjet({ type: 'journal', donnees: { action: 'calage_force', detail: { message: calage?.messageRouge ?? null, couleur: calage?.couleur ?? null }, le } })
    naviguer(`/r/${releve.id}/saisir`)
  }

  return (
    <>
      <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-none">Étape 2 : caler les bornes</h2>
      {calcule.etatCalage === 'saute' ? (
        <section aria-label="Calage sauté" className="flex flex-col gap-1 rounded-rt border-[3px] border-encre bg-jaune px-3 py-3">
          <span className="rt-etroite text-[22px] font-extrabold">Étape 2 sautée</span>
          <span className="text-[16px] font-semibold">Les bornes sont saisies comme vérifiées : les stations partent de leurs valeurs du plan.</span>
          <Link to={`/r/${releve.id}/saisir`} className="text-[17px] font-bold text-encre underline">
            Saisir une station
          </Link>
        </section>
      ) : (
        <p className="m-0 text-[16px] leading-snug text-encre2">Tant que le calage n'est ni fait ni sauté, « Saisir » vous ramène ici.</p>
      )}

      {paires.map(({ cle, p, q }, i) => (
        <CarteCote
          key={cle}
          nom={`${p.donnees.lettre} vers ${q.donnees.lettre}`}
          lettreP={p.donnees.lettre}
          lettreQ={q.donnees.lettre}
          saisie={saisieDe(objetsPaires[i], p.id)}
          resultat={cotes[cle]}
          onChange={(s) => ecrireCote(i, s)}
        />
      ))}

      <CarteCap
        lettreA={L.a}
        lettreB={L.b}
        capLu={nombre(entete.orientation?.cap_lu) ? entete.orientation.cap_lu : null}
        source={entete.orientation?.source ?? null}
        declinaison={declinaison}
        onCap={(cap, source) =>
          garder(() =>
            actions.modifierEntete({ orientation: { cap_lu: cap, source, declinaison: cap === null ? null : calcule.reglages.declinaison } }),
          )
        }
      />

      {demandeCote ? (
        <section aria-labelledby="titre-cote-c" className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-3.5">
          <h3 id="titre-cote-c" className="rt-etroite m-0 text-[22px] font-extrabold leading-tight">
            {L.c} est-il à gauche ou à droite en regardant de {L.a} vers {L.b} ?
          </h3>
          <div role="group" aria-labelledby="titre-cote-c" className="grid grid-cols-2 gap-2">
            {(['gauche', 'droite'] as const).map((cote) => {
              const est = entete.cote_c === cote
              return (
                <button
                  key={cote}
                  type="button"
                  aria-pressed={est}
                  onClick={() => !est && garder(() => actions.modifierEntete({ cote_c: cote }))}
                  className={`rt-etroite min-h-[60px] rounded-rt border-[3px] border-encre text-[21px] font-extrabold ${est ? 'bg-jaune text-encre' : 'bg-surface text-encre'}`}
                >
                  {cote === 'gauche' ? 'À gauche' : 'À droite'}
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {pret && calage && cotes.ab && cotes.bc && cotes.ac ? (
        <>
          <CarteResultat calage={calage} cotes={{ ab: cotes.ab, bc: cotes.bc, ac: cotes.ac }} lettres={L} modeSuspect={modeSuspect} />
          {aControle(calage) ? <CarteControle calage={calage} lettres={L} /> : null}
        </>
      ) : (
        <p className="m-0 rounded-rt border-2 border-encre bg-surface px-3 py-3 text-[17px] font-semibold">
          {!calage ? 'Le résultat du calage paraît dès que les 3 côtés ont une lecture complète.' : `Répondez d'abord : ${L.c} à gauche ou à droite en regardant de ${L.a} vers ${L.b} ?`}
        </p>
      )}

      <Aide titre="Comment mesurer un côté">
        Pour chaque côté, faites 3 lectures de l'appareil (distance le long de la visée et pente), en indiquant le sens de la visée, puis mesurez au décamètre à l'aller et au retour si vous le pouvez. Le décamètre, quand il est saisi, donne la distance retenue.
      </Aide>

      {manque ? (
        <p role="alert" className="m-0 rounded-rt border-2 border-rougeTexte bg-rougeFond px-3 py-2 text-[16px] font-semibold text-rougeTexte">
          {manque}
        </p>
      ) : null}
      <Bouton onClick={() => void valider()}>Étape suivante : valider le calage et relever</Bouton>

      <Confirmation
        ouvert={!!enAttente}
        titre="Changer le calage"
        texte={MESSAGE_RECALCUL_CALAGE}
        confirmer={{
          libelle: 'Continuer',
          onClick: () => {
            const f = enAttente
            setEnAttente(null)
            if (f) void f()
          },
        }}
        onAnnuler={() => setEnAttente(null)}
      />
      <DialogueRouge ouvert={rougeOuvert} message={calage?.messageRouge ?? ''} onContinuer={() => void forcer()} onRefaire={() => setRougeOuvert(false)} />
    </>
  )
}
