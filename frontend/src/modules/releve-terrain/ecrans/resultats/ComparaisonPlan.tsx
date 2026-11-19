// Card « Comparaison au plan » (H17), element id `points-plan`: the points of the plan (nom, X, Y,
// altitude) with add, edit, delete and import of a text file « nom;x;y;altitude »; table Point, Plan,
// Relevé (altitude interpolated in the covered zone), Écart, in red above 0,50 m, « non couvert » outside.
import { useRef, useState } from 'react'
import { MESSAGES, type Triangulation } from '../../calcul'
import { Bouton } from '../../composants/Bouton'
import { ChampNombre, formaterNombre } from '../../composants/ChampNombre'
import { Confirmation, Feuille } from '../../composants/Feuilles'
import { ChampTexte } from '../../composants/Formulaires'
import { Icone } from '../../composants/Icones'
import type { DonneesPointPlan, Objet, ObjetPointPlan } from '../../db/types'
import { montrerAvis } from '../../etat/avis'
import type { ActionsReleve } from '../../etat/useReleve'
import { lirePointsPlan, type LigneRefusee } from '../../exports/pointsPlan'
import { comparerPlan, SEUIL_ECART_PLAN } from '../carte/modele'
import { EXEMPLES } from '../exemples'

const LIMITE_COORD = { min: -100000, max: 100000, messageHorsLimites: 'Valeur refusée : elle doit être comprise entre −100 000 et 100 000 m.' }
const LIMITE_ALT = { min: -1000, max: 10000, messageHorsLimites: 'Altitude refusée : elle doit être comprise entre −1 000 et 10 000 m.' }

const nb = (v: number | null, d = 3) => (v === null ? '' : formaterNombre(v, d))
const signe = (v: number) => (v > 0 ? '+' : '') + formaterNombre(v, 2)

interface Edition {
  id: string | null
  nom: string
  x: number | null
  y: number | null
  z: number | null
}

function FeuillePoint({ edition, onFermer, actions }: { edition: Edition; onFermer: () => void; actions: ActionsReleve }) {
  const [e, setE] = useState(edition)
  const [erreur, setErreur] = useState<string | null>(null)
  const [supprimer, setSupprimer] = useState(false)
  const nouveau = edition.id === null
  return (
    <Feuille ouvert titre={nouveau ? 'Point du plan' : `Point ${edition.nom}`} onFermer={onFermer}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (ev) => {
          ev.preventDefault()
          if (!e.nom.trim()) return setErreur('Donnez un nom au point.')
          if (e.x === null || e.y === null || e.z === null) return setErreur('Saisissez X, Y et altitude.')
          const donnees: DonneesPointPlan = { nom: e.nom.trim(), x: e.x, y: e.y, z: e.z }
          const ok = await actions.ecrireObjet(e.id ? { id: e.id, type: 'point_plan', donnees } : { type: 'point_plan', donnees })
          if (ok) onFermer()
        }}
      >
        <ChampTexte libelle="Nom du point" valeur={e.nom} onChange={(nom) => { setE({ ...e, nom }); setErreur(null) }} erreur={erreur} exemple={EXEMPLES.pointPlan} autoComplete="off" maxLength={80} />
        <ChampNombre libelle="X (m)" valeur={e.x} onChange={(x) => setE({ ...e, x })} unite="m" exemple={EXEMPLES.xPlan} {...LIMITE_COORD} />
        <ChampNombre libelle="Y (m)" valeur={e.y} onChange={(y) => setE({ ...e, y })} unite="m" exemple={EXEMPLES.yPlan} {...LIMITE_COORD} />
        <ChampNombre libelle="Altitude du plan (m)" valeur={e.z} onChange={(z) => setE({ ...e, z })} unite="m" exemple={EXEMPLES.altitudePlan} {...LIMITE_ALT} />
        <Bouton type="submit" variante="principal">
          Enregistrer le point
        </Bouton>
        {!nouveau ? (
          <Bouton variante="danger" onClick={() => setSupprimer(true)}>
            Supprimer le point
          </Bouton>
        ) : null}
      </form>
      <Confirmation
        ouvert={supprimer}
        titre="Supprimer ce point ?"
        texte={`Le point « ${edition.nom} » sera retiré de la comparaison au plan.`}
        confirmer={{
          libelle: 'Supprimer',
          onClick: async () => {
            setSupprimer(false)
            if (edition.id && (await actions.supprimerObjets([edition.id]))) onFermer()
          },
        }}
        onAnnuler={() => setSupprimer(false)}
      />
    </Feuille>
  )
}

export function ComparaisonPlan({ objets, triangulation, actions }: { objets: Objet[]; triangulation: Triangulation; actions: ActionsReleve }) {
  const points = objets.filter((o): o is ObjetPointPlan => o.type === 'point_plan' && !o.supprime).sort((a, b) => a.saisi_at.localeCompare(b.saisi_at) || a.id.localeCompare(b.id))
  const lignes = comparerPlan(triangulation, points)
  const [edition, setEdition] = useState<Edition | null>(null)
  const [refusees, setRefusees] = useState<LigneRefusee[] | null>(null)
  const fichier = useRef<HTMLInputElement>(null)

  const importer = async (f: File) => {
    if (f.size > 1024 * 1024) {
      montrerAvis('Fichier trop gros : 1 Mo au plus.', 'alerte')
      return
    }
    const { points: nouveaux, refusees: r } = lirePointsPlan(await f.text())
    setRefusees(r)
    if (!nouveaux.length) {
      montrerAvis('Aucun point lu dans ce fichier.', 'alerte')
      return
    }
    const ok = await actions.ecrireObjets(nouveaux.map((donnees) => ({ type: 'point_plan' as const, donnees })))
    if (ok) montrerAvis(`${nouveaux.length} point${nouveaux.length > 1 ? 's' : ''} du plan importé${nouveaux.length > 1 ? 's' : ''}${r.length ? `, ${r.length} ligne${r.length > 1 ? 's' : ''} ignorée${r.length > 1 ? 's' : ''}` : ''}.`)
  }

  return (
    <section id="points-plan" aria-labelledby="rt-titre-plan" className="flex scroll-mt-4 flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-4">
      <h2 id="rt-titre-plan" className="rt-etroite m-0 text-[26px] font-extrabold leading-tight">
        Comparaison au plan
      </h2>
      <p className="m-0 text-[16px] leading-snug text-encre2">Altitudes du plan de masse comparées au relevé, à l'endroit de chaque point.</p>
      {lignes.length ? (
        <table className="w-full border-collapse text-[16px]">
          <thead>
            <tr className="border-b-2 border-encre text-left text-[14px] font-semibold text-encre2">
              <th scope="col" className="py-1.5 pr-1 font-semibold">Point</th>
              <th scope="col" className="py-1.5 pr-1 text-right font-semibold">Plan</th>
              <th scope="col" className="py-1.5 pr-1 text-right font-semibold">Relevé</th>
              <th scope="col" className="py-1.5 text-right font-semibold">Écart</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.id} className="border-b border-trait" data-point-plan={l.nom}>
                <td className="py-1 pr-1">
                  <button
                    type="button"
                    onClick={() => setEdition({ id: l.id, nom: l.nom, x: l.x, y: l.y, z: l.plan })}
                    className="flex min-h-[48px] w-full flex-col items-start justify-center text-left"
                    aria-label={`Modifier le point ${l.nom}`}
                  >
                    <span className="rt-etroite text-[19px] font-bold leading-tight underline decoration-2 underline-offset-2">{l.nom}</span>
                    <span className="text-[13px] text-encre2">
                      {nb(l.x, 2)} ; {nb(l.y, 2)}
                    </span>
                  </button>
                </td>
                <td className="py-1 pr-1 text-right font-semibold">{nb(l.plan)}</td>
                <td className="py-1 pr-1 text-right font-semibold" data-cellule="releve">
                  {l.releve === null ? <span className="text-[14px] font-semibold text-encre2">{MESSAGES.nonCouvert}</span> : nb(l.releve)}
                </td>
                <td className="py-1 text-right" data-cellule="ecart">
                  {l.ecart === null ? (
                    ''
                  ) : l.rouge ? (
                    <span className="inline-block rounded-pastille bg-rougeFond px-1.5 py-0.5 font-bold text-rougeTexte">{signe(l.ecart)}</span>
                  ) : (
                    <span className="font-semibold">{signe(l.ecart)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="m-0 text-[16px] font-semibold">Aucun point du plan pour l'instant.</p>
      )}
      <p className="m-0 text-[14px] font-semibold text-encre2">Écart en rouge au-delà de {formaterNombre(SEUIL_ECART_PLAN, 2)} m.</p>
      <Bouton variante="secondaire" grand={false} icone={<Icone nom="plus" taille={22} />} onClick={() => setEdition({ id: null, nom: '', x: null, y: null, z: null })}>
        Ajouter un point du plan
      </Bouton>
      <Bouton variante="secondaire" grand={false} icone={<Icone nom="dossier" taille={22} />} onClick={() => fichier.current?.click()}>
        Importer un fichier de points
      </Bouton>
      <input
        ref={fichier}
        type="file"
        accept=".txt,.csv,text/plain,text/csv"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        data-import-points=""
        onChange={(ev) => {
          const f = ev.target.files?.[0]
          ev.target.value = ''
          if (f) void importer(f)
        }}
      />
      <p className="m-0 text-[14px] text-encre2">Fichier texte, une ligne par point : nom;x;y;altitude (virgule ou point décimal, ligne de titres facultative).</p>
      {refusees && refusees.length ? (
        <div role="status" className="rounded-rt border-2 border-encre bg-orangeFond p-3 text-orangeTexte">
          <p className="m-0 mb-1 text-[16px] font-bold">
            {refusees.length} ligne{refusees.length > 1 ? 's' : ''} ignorée{refusees.length > 1 ? 's' : ''} :
          </p>
          <ul className="m-0 list-none p-0 text-[15px] leading-snug">
            {refusees.map((r) => (
              <li key={r.numero}>
                Ligne {r.numero} « {r.texte.slice(0, 60)} » : {r.raison}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {edition ? <FeuillePoint edition={edition} onFermer={() => setEdition(null)} actions={actions} /> : null}
    </section>
  )
}
