// Card « Réglages des seuils » (H22): every threshold of 6.6, the triangle cut-off (5 to 100 m) and the
// magnetic declination; « Valeurs par défaut »; a change asks « Tous les résultats seront recalculés.
// Continuer ? », then writes entete.reglages (modifierEntete) and a journal object `reglages_modifies`.
import { useState } from 'react'
import { COUPURE_MAX, COUPURE_MIN, REGLAGES_DEFAUT, type Reglages, type Seuil } from '../../calcul'
import { Bouton } from '../../composants/Bouton'
import { ChampNombre, formaterNombre } from '../../composants/ChampNombre'
import { Confirmation, Feuille } from '../../composants/Feuilles'
import type { ActionsReleve } from '../../etat/useReleve'

type CleSeuil = { [K in keyof Reglages]: Reglages[K] extends Seuil ? K : never }[keyof Reglages]
type CleNombre = 'coupure' | 'declinaison' | 'indiceEphemere'

interface LigneSeuil {
  cle: CleSeuil
  libelle: string
  unite?: string
  niveaux: ('orange' | 'rouge')[]
}

export const SEUILS: LigneSeuil[] = [
  { cle: 'ecartPositionStation', libelle: "Écart de position d'une station", unite: 'm', niveaux: ['orange', 'rouge'] },
  { cle: 'ecartAltitudeStation', libelle: "Écart d'altitude d'une station", unite: 'm', niveaux: ['orange', 'rouge'] },
  { cle: 'indice', libelle: 'Indice de géométrie', niveaux: ['orange', 'rouge'] },
  { cle: 'distanceVisee', libelle: "Distance d'une visée", unite: 'm', niveaux: ['orange'] },
  { cle: 'ecartDecaApp', libelle: 'Écart décamètre et appareil (côté)', unite: 'm', niveaux: ['orange', 'rouge'] },
  { cle: 'ecartAllerRetour', libelle: 'Écart aller et retour au décamètre', unite: 'm', niveaux: ['orange', 'rouge'] },
  { cle: 'fermeture', libelle: 'Fermeture de la boucle des dénivelés', unite: 'm', niveaux: ['orange', 'rouge'] },
  { cle: 'ecartPositionPlan', libelle: "Écart de position au plan d'une borne", unite: 'm', niveaux: ['orange', 'rouge'] },
  { cle: 'ecartAltitudePlan', libelle: "Écart d'altitude au plan d'une borne", unite: 'm', niveaux: ['orange', 'rouge'] },
  { cle: 'ecartCap', libelle: 'Écart de cap avec le plan (A vers B)', unite: '°', niveaux: ['rouge'] },
]

const NOMBRES: { cle: CleNombre; libelle: string; unite?: string; min: number; max: number; message: string; minExclu?: boolean }[] = [
  { cle: 'indiceEphemere', libelle: "Création d'une borne éphémère : indice au plus", min: 0, max: 10, minExclu: true, message: "Indice refusé : il doit être supérieur à 0 et au plus 10." },
  { cle: 'coupure', libelle: 'Coupure des triangles (courbes, zone couverte)', unite: 'm', min: COUPURE_MIN, max: COUPURE_MAX, message: `Coupure refusée : elle doit être comprise entre ${COUPURE_MIN} et ${COUPURE_MAX} m.` },
  { cle: 'declinaison', libelle: "Déclinaison magnétique (vers l'ouest)", unite: '°', min: -45, max: 45, message: 'Déclinaison refusée : elle doit être comprise entre −45° et 45°.' },
]

const f = (v: number | undefined, d?: number) => (v === undefined ? '' : formaterNombre(v, d))

/** Short line of the card (mockup): « écart de position 0,30 / 0,60 ; ... ; coupure des triangles 15 m ». */
export function resumeReglages(r: Reglages): string {
  return [
    `écart de position ${f(r.ecartPositionStation.orange, 2)} / ${f(r.ecartPositionStation.rouge, 2)}`,
    `écart d'altitude ${f(r.ecartAltitudeStation.orange, 2)} / ${f(r.ecartAltitudeStation.rouge, 2)}`,
    `indice ${f(r.indice.orange, 1)} / ${f(r.indice.rouge, 1)}`,
    `coupure des triangles ${f(r.coupure)} m`,
    `déclinaison ${f(r.declinaison)}° ouest`,
  ].join(' ; ')
}

/** Keys whose value differs (thresholds compared level by level). */
export function differences(avant: Reglages, apres: Reglages): (keyof Reglages)[] {
  return (Object.keys(apres) as (keyof Reglages)[]).filter((k) => JSON.stringify(avant[k]) !== JSON.stringify(apres[k]))
}

function verifier(r: Reglages): string | null {
  for (const l of SEUILS) {
    const s = r[l.cle]
    for (const n of l.niveaux) if (!(typeof s[n] === 'number' && (s[n] as number) > 0)) return `${l.libelle} : chaque seuil doit être supérieur à 0.`
    if (s.orange !== undefined && s.rouge !== undefined && !(s.orange < s.rouge)) return `${l.libelle} : le seuil orange doit être plus petit que le seuil rouge.`
  }
  return null
}

function copie(r: Reglages): Reglages {
  return JSON.parse(JSON.stringify(r)) as Reglages
}

export function ReglagesSeuils({ reglages, actions }: { reglages: Reglages; actions: ActionsReleve }) {
  const [edition, setEdition] = useState<Reglages | null>(null)
  const [confirmer, setConfirmer] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const parDefaut = differences(REGLAGES_DEFAUT, reglages).length === 0

  const enregistrer = async () => {
    if (!edition) return
    const avant = reglages
    const apres = edition
    const cles = differences(avant, apres)
    setConfirmer(false)
    if (!cles.length) {
      setEdition(null)
      return
    }
    const ok = await actions.modifierEntete({ reglages: apres })
    if (!ok) return
    await actions.ecrireObjet({
      type: 'journal',
      donnees: {
        action: 'reglages_modifies',
        detail: { avant: Object.fromEntries(cles.map((k) => [k, avant[k]])), apres: Object.fromEntries(cles.map((k) => [k, apres[k]])) },
        le: new Date().toISOString(),
      },
    })
    setEdition(null)
  }

  const changerSeuil = (cle: CleSeuil, n: 'orange' | 'rouge', v: number | null) => {
    if (!edition || v === null) return
    setErreur(null)
    setEdition({ ...edition, [cle]: { ...edition[cle], [n]: v } })
  }

  return (
    <section aria-labelledby="rt-titre-reglages" className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-4">
      <h2 id="rt-titre-reglages" className="rt-etroite m-0 text-[26px] font-extrabold leading-tight">
        Réglages des seuils
      </h2>
      <p className="m-0 text-[16px] leading-snug">
        <span className="font-semibold">{parDefaut ? 'Valeurs par défaut' : 'Réglages de ce relevé'} : </span>
        {resumeReglages(reglages)}.
      </p>
      <p className="m-0 text-[14px] leading-snug text-encre2">À ajuster après l'essai de 10 points, à la précision réelle de l'appareil et à la densité des points.</p>
      <Bouton variante="secondaire" grand={false} onClick={() => setEdition(copie(reglages))}>
        Modifier les seuils
      </Bouton>
      {edition ? (
        <Feuille ouvert titre="Réglages des seuils" onFermer={() => setEdition(null)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              const msg = verifier(edition)
              if (msg) return setErreur(msg)
              if (!differences(reglages, edition).length) return setEdition(null)
              setConfirmer(true)
            }}
          >
            <p className="m-0 text-[15px] leading-snug text-encre2">Vert jusqu'au seuil orange, orange au-delà, rouge au-delà du seuil rouge.</p>
            {SEUILS.map((l) => (
              <fieldset key={l.cle} className="m-0 flex flex-col gap-2 border-0 border-t-2 border-trait p-0 pt-3">
                <legend className="rt-etroite float-left mb-1 w-full p-0 text-[19px] font-bold">{l.libelle}</legend>
                <div className={`grid gap-2 ${l.niveaux.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {l.niveaux.map((n) => (
                    <ChampNombre
                      key={n}
                      libelle={n === 'orange' ? 'Orange au-delà de' : 'Rouge au-delà de'}
                      valeur={edition[l.cle][n] ?? null}
                      onChange={(v) => changerSeuil(l.cle, n, v)}
                      unite={l.unite}
                      min={0}
                      minExclu
                      max={1000}
                      messageHorsLimites="Seuil refusé : il doit être supérieur à 0 et au plus 1 000."
                    />
                  ))}
                </div>
              </fieldset>
            ))}
            {NOMBRES.map((n) => (
              <fieldset key={n.cle} className="m-0 flex flex-col gap-2 border-0 border-t-2 border-trait p-0 pt-3">
                <ChampNombre
                  libelle={n.libelle}
                  valeur={edition[n.cle]}
                  onChange={(v) => {
                    if (v === null) return
                    setErreur(null)
                    setEdition({ ...edition, [n.cle]: v })
                  }}
                  unite={n.unite}
                  min={n.min}
                  max={n.max}
                  minExclu={n.minExclu}
                  messageHorsLimites={n.message}
                />
              </fieldset>
            ))}
            {erreur ? (
              <p role="alert" className="m-0 rounded-rt border-2 border-danger bg-rougeFond p-3 text-[16px] font-semibold text-rougeTexte">
                {erreur}
              </p>
            ) : null}
            <Bouton type="submit" variante="principal">
              Enregistrer les seuils
            </Bouton>
            <Bouton
              variante="secondaire"
              grand={false}
              onClick={() => {
                setErreur(null)
                setEdition(copie(REGLAGES_DEFAUT))
              }}
            >
              Valeurs par défaut
            </Bouton>
          </form>
        </Feuille>
      ) : null}
      <Confirmation
        ouvert={confirmer}
        titre="Modifier les seuils"
        texte="Tous les résultats seront recalculés. Continuer ?"
        confirmer={{ libelle: 'Continuer', onClick: () => void enregistrer() }}
        onAnnuler={() => setConfirmer(false)}
      />
    </section>
  )
}
