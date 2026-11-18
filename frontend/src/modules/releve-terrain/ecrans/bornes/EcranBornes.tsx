// Screen 6, step 1 « Bornes » (H04, H06, P1): the relevé (name, date, operators, heights) and the 3
// principal targets (letter, place name, optional X, Y, altitude of the site plan). Writes only through
// useReleve (db/depot.ts); every result comes from useReleve and calcul/.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { verifierLettre } from '../../calcul'
import { Bouton } from '../../composants/Bouton'
import { ChampNombre } from '../../composants/ChampNombre'
import { Aide, Confirmation } from '../../composants/Feuilles'
import { ChampTexte } from '../../composants/Formulaires'
import { PastilleEtat, PastilleLettre } from '../../composants/Pastilles'
import { MESSAGE_NOM_VIDE, maintenant } from '../../db/depot'
import type { DonneesBorne, ValeursPlanBorne } from '../../db/types'
import type { BorneCalculee } from '../../etat/releveCalcule'
import { useReleve } from '../../etat/useReleve'
import { CadreReleve, type ResultatUseReleve } from '../CadreReleve'
import { FeuilleLettre } from './FeuilleLettre'

export const MESSAGE_NOM_ENDROIT = "Donnez le nom de l'endroit."
export const MESSAGE_RECALCUL_HAUTEURS = 'Toutes les stations seront recalculées. Continuer ?'
export const MESSAGE_SAUTER = 'Pour sauter le calage, saisissez X, Y et altitude des 3 bornes.'
export const AIDE_PLAN =
  'Facultatifs : recopiez-les du plan de masse du géomètre si la borne y figure. Sinon laissez vide : le calage placera A en 0 ; 0 à 100,00 m.'

const LIMITES_HAUTEUR = {
  min: 0,
  minExclu: true,
  max: 5,
  messageHorsLimites: 'Hauteur refusée : elle doit être supérieure à 0 et au plus 5 m.',
}

const nombre = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const planDe = (d: DonneesBorne): ValeursPlanBorne => d.plan ?? { x: null, y: null, z: null }

/** Message 6.9 when the letter is carried by another active target, else null. */
export function refusLettre(lettre: string, borneId: string, bornes: BorneCalculee[]): string | null {
  const actives = bornes.filter((b) => b.active && b.id !== borneId).map((b) => ({ lettre: b.donnees.lettre, nom: b.donnees.nom.trim() || `la borne ${b.donnees.lettre}` }))
  const v = verifierLettre(lettre, 'nom', actives)
  return v.ok ? null : v.message
}

export default function EcranBornes() {
  const { releve } = useParams()
  const r = useReleve(releve)
  return (
    <CadreReleve releve={r} etape={1} verrouiller>
      {r.etat.statut === 'pret' ? <Contenu r={r} /> : null}
    </CadreReleve>
  )
}

type Hauteur = 'hi' | 'ht'

function Contenu({ r }: { r: ResultatUseReleve }) {
  const naviguer = useNavigate()
  const etat = r.etat
  if (etat.statut !== 'pret') throw new Error('relevé non prêt')
  const { releve, calcule } = etat
  const entete = releve.entete
  const { actions } = r
  const principales = [calcule.principales.a, calcule.principales.b, calcule.principales.c].filter((b): b is BorneCalculee => !!b)
  const aStations = calcule.stations.length > 0

  const [nomReleve, setNomReleve] = useState(releve.nom)
  const [erreurNom, setErreurNom] = useState<string | null>(null)
  const [operateurs, setOperateurs] = useState(entete.operateurs)
  useEffect(() => setNomReleve(releve.nom), [releve.nom])
  useEffect(() => setOperateurs(entete.operateurs), [entete.operateurs])

  const [hauteurEnAttente, setHauteurEnAttente] = useState<{ cle: Hauteur; valeur: number } | null>(null)
  const [erreursNoms, setErreursNoms] = useState<Record<string, string | null>>({})
  const [erreurSauter, setErreurSauter] = useState<string | null>(null)
  const [lettreOuverte, setLettreOuverte] = useState<BorneCalculee | null>(null)

  const appliquerHauteur = async (cle: Hauteur, valeur: number) => {
    const avant = { hi: entete.hi, ht: entete.ht }
    const ok = await actions.modifierEntete({ [cle]: valeur })
    if (ok && aStations) {
      await actions.ecrireObjet({ type: 'journal', donnees: { action: 'hauteurs_modifiees', detail: { avant, apres: { ...avant, [cle]: valeur } }, le: maintenant() } })
    }
  }

  const changerHauteur = (cle: Hauteur, valeur: number | null) => {
    if (valeur === null || valeur === entete[cle]) return
    if (aStations) setHauteurEnAttente({ cle, valeur })
    else void appliquerHauteur(cle, valeur)
  }

  const ecrireBorne = (b: BorneCalculee, donnees: Partial<DonneesBorne>) => actions.ecrireObjet({ id: b.id, type: 'borne', donnees: { ...b.donnees, ...donnees } })

  const nomsManquants = () => {
    const e: Record<string, string | null> = {}
    let manque = false
    for (const b of principales) {
      if (!b.donnees.nom.trim()) {
        e[b.id] = MESSAGE_NOM_ENDROIT
        manque = true
      }
    }
    setErreursNoms((x) => ({ ...x, ...e }))
    return manque
  }

  const sauterCalage = async () => {
    setErreurSauter(null)
    if (nomsManquants()) return
    const complet = principales.length === 3 && principales.every((b) => nombre(b.donnees.plan?.x) && nombre(b.donnees.plan?.y) && nombre(b.donnees.plan?.z))
    if (!complet) {
      setErreurSauter(MESSAGE_SAUTER)
      return
    }
    const le = maintenant()
    const ecrits = await actions.ecrireObjets(principales.map((b) => ({ id: b.id, type: 'borne' as const, donnees: { ...b.donnees, verifiee: true } })))
    if (!ecrits) return
    if (!(await actions.modifierEntete({ calage: { etat: 'saute', le } }))) return
    await actions.ecrireObjet({ type: 'journal', donnees: { action: 'calage_saute', detail: { bornes: principales.map((b) => b.donnees.lettre) }, le } })
    naviguer(`/r/${releve.id}/saisir`)
  }

  const etapeSuivante = () => {
    if (nomsManquants()) return
    naviguer(`/r/${releve.id}/calage`)
  }

  const relatives = useMemo(() => !nombre(calcule.principales.a?.donnees.plan?.z), [calcule.principales.a])

  return (
    <>
      <h2 className="rt-etroite m-0 text-[34px] font-extrabold leading-none">Étape 1 : les bornes</h2>

      {calcule.etatCalage === 'saute' ? (
        <section aria-label="Calage sauté" className="flex items-center gap-3 rounded-rt border-[3px] border-encre bg-jaune px-3 py-3">
          <span className="rt-etroite text-[22px] font-extrabold">Étape 2 sautée</span>
          <span className="text-[16px] font-semibold">Bornes saisies comme vérifiées</span>
        </section>
      ) : null}

      <section aria-labelledby="titre-releve" className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-3.5">
        <h3 id="titre-releve" className="rt-etroite m-0 text-[24px] font-extrabold">
          Le relevé
        </h3>
        <ChampTexte
          libelle="Nom du relevé"
          valeur={nomReleve}
          erreur={erreurNom}
          maxLength={120}
          autoComplete="off"
          onChange={(v) => {
            setNomReleve(v)
            setErreurNom(null)
          }}
          onBlur={() => {
            if (!nomReleve.trim()) {
              setErreurNom(MESSAGE_NOM_VIDE)
              return
            }
            if (nomReleve.trim() !== releve.nom) void actions.renommer(nomReleve.trim())
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <ChampTexte
            libelle="Date"
            type="date"
            valeur={entete.date}
            onChange={(v) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(v) && v !== entete.date) void actions.modifierEntete({ date: v })
            }}
          />
          <ChampTexte
            libelle="Opérateurs"
            valeur={operateurs}
            autoComplete="off"
            maxLength={120}
            onChange={setOperateurs}
            onBlur={() => {
              if (operateurs.trim() !== entete.operateurs) void actions.modifierEntete({ operateurs: operateurs.trim() })
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ChampNombre libelle="Hauteur de l'appareil" valeur={entete.hi} unite="m" decimales={2} {...LIMITES_HAUTEUR} onChange={(v) => changerHauteur('hi', v)} />
          <ChampNombre libelle="Hauteur des cibles" valeur={entete.ht} unite="m" decimales={2} {...LIMITES_HAUTEUR} onChange={(v) => changerHauteur('ht', v)} />
        </div>
      </section>

      <section aria-labelledby="titre-bornes" className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-3.5">
        <div className="flex items-center gap-2">
          <h3 id="titre-bornes" className="rt-etroite m-0 flex-1 text-[24px] font-extrabold">
            Les 3 bornes principales
          </h3>
          {relatives ? <PastilleEtat couleur="bleu" mot="altitudes relatives" /> : null}
        </div>
        <p className="m-0 text-[16px] leading-snug text-encre2">{AIDE_PLAN}</p>
        {principales.map((b) => (
          <CarteBorne
            key={b.id}
            b={b}
            erreurNom={erreursNoms[b.id] ?? null}
            onErreurNom={(m) => setErreursNoms((x) => ({ ...x, [b.id]: m }))}
            onLettre={() => setLettreOuverte(b)}
            ecrire={ecrireBorne}
          />
        ))}
      </section>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => void sauterCalage()} className="min-h-[48px] rounded-rt px-1 text-left text-[17px] font-semibold text-encre underline underline-offset-2">
          Bornes déjà calées : les saisir comme vérifiées et sauter le calage
        </button>
        {erreurSauter ? (
          <p role="alert" className="m-0 rounded-rt border-2 border-rougeTexte bg-rougeFond px-3 py-2 text-[16px] font-semibold text-rougeTexte">
            {erreurSauter}
          </p>
        ) : null}
        <Link to={`/r/${releve.id}/resultats#points-plan`} className="flex min-h-[48px] items-center px-1 text-[17px] font-semibold text-encre underline underline-offset-2">
          Points d'altitude du plan à comparer (facultatif)
        </Link>
      </div>

      <Aide titre="Les bornes et le plan de masse">
        Chaque cible porte une lettre peinte. Donnez à chaque lettre le nom de l'endroit où la cible est posée. A est l'origine du relevé. Si les 3 bornes figurent au plan de masse avec X, Y et altitude, le calage contrôlera le plan sur le terrain ; si elles ont déjà été calées lors d'un relevé précédent, vous pouvez sauter le calage.
      </Aide>

      <Bouton onClick={etapeSuivante}>Étape suivante : caler les bornes</Bouton>

      <Confirmation
        ouvert={!!hauteurEnAttente}
        titre="Changer la hauteur"
        texte={MESSAGE_RECALCUL_HAUTEURS}
        confirmer={{
          libelle: 'Continuer',
          onClick: () => {
            const h = hauteurEnAttente
            setHauteurEnAttente(null)
            if (h) void appliquerHauteur(h.cle, h.valeur)
          },
        }}
        onAnnuler={() => setHauteurEnAttente(null)}
      />
      <FeuilleLettre
        borne={lettreOuverte}
        onFermer={() => setLettreOuverte(null)}
        verifier={(l) => (lettreOuverte ? refusLettre(l, lettreOuverte.id, calcule.bornes) : null)}
        onChoisir={async (l) => {
          if (!lettreOuverte) return false
          const ok = await ecrireBorne(lettreOuverte, { lettre: l })
          return !!ok
        }}
      />
    </>
  )
}

function CarteBorne({
  b,
  erreurNom,
  onErreurNom,
  onLettre,
  ecrire,
}: {
  b: BorneCalculee
  erreurNom: string | null
  onErreurNom: (m: string | null) => void
  onLettre: () => void
  ecrire: (b: BorneCalculee, d: Partial<DonneesBorne>) => Promise<unknown>
}) {
  const [nom, setNom] = useState(b.donnees.nom)
  useEffect(() => setNom(b.donnees.nom), [b.donnees.nom])
  const plan = planDe(b.donnees)
  const lettre = b.donnees.lettre
  const poser = (cle: keyof ValeursPlanBorne, v: number | null) => {
    if (v === plan[cle]) return
    void ecrire(b, { plan: { ...plan, [cle]: v } })
  }
  return (
    <div className="flex flex-col gap-2 border-t-2 border-encre pt-3" data-borne={lettre}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={onLettre} aria-label={`Lettre ${lettre} : changer la lettre`} className="mt-[26px] flex-none rounded-lettre">
          <PastilleLettre lettre={lettre} taille={46} />
        </button>
        <div className="min-w-0 flex-1">
          <ChampTexte
            libelle={`Nom de l'endroit de ${lettre}`}
            valeur={nom}
            erreur={erreurNom}
            autoComplete="off"
            maxLength={120}
            onChange={(v) => {
              setNom(v)
              onErreurNom(null)
            }}
            onBlur={() => {
              const t = nom.trim()
              if (!t) {
                // A name erased is refused (the stored one stays); a name never given is asked at « Étape suivante ».
                if (b.donnees.nom.trim()) onErreurNom(MESSAGE_NOM_ENDROIT)
                setNom(b.donnees.nom)
                return
              }
              if (t !== b.donnees.nom) void ecrire(b, { nom: t })
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ChampNombre libelle={`X de ${lettre}`} valeur={plan.x} unite="m" vide="Saisir" autoriserVide onChange={(v) => poser('x', v)} />
        <ChampNombre libelle={`Y de ${lettre}`} valeur={plan.y} unite="m" vide="Saisir" autoriserVide onChange={(v) => poser('y', v)} />
      </div>
      <ChampNombre libelle={`Altitude de ${lettre}`} valeur={plan.z} unite="m" autoriserVide onChange={(v) => poser('z', v)} />
    </div>
  )
}
