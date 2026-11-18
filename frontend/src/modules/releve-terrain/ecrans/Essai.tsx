// D29: development page /__essai?jeu=<lettre>[&variante=...]: loads a game of the PRD into a new relevé
// of the domain « Essai » and opens it. Imported only when import.meta.env.DEV (absent from production).
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../db/base'
import * as depot from '../db/depot'
import { importerReleve } from '../db/depot'
import { LETTRES_JEUX, jeu } from '../etat/jeux'
import { calculerReleve } from '../etat/releveCalcule'
import { cheminEtape } from '../etat/navigation'

async function chantierEssai(nomChantier: string): Promise<string> {
  const domaines = (await db.domaines.toArray()).filter((d) => !d.supprime_at && d.nom === 'Essai')
  const domaine = domaines[0] ?? (await depot.creerDomaine('Essai'))
  const chantiers = (await db.chantiers.where('domaine_id').equals(domaine.id).toArray()).filter((c) => !c.supprime_at && c.nom === nomChantier)
  return (chantiers[0] ?? (await depot.creerChantier(domaine.id, nomChantier))).id
}

export default function Essai() {
  const [params] = useSearchParams()
  const naviguer = useNavigate()
  const [erreur, setErreur] = useState<string | null>(null)
  const fait = useRef(false)
  const lettre = params.get('jeu') ?? ''
  const variante = params.get('variante')

  useEffect(() => {
    if (fait.current) return
    fait.current = true
    const s = jeu(lettre, variante)
    if (!s) {
      setErreur(`Jeu inconnu : « ${lettre} ».`)
      return
    }
    ;(async () => {
      const chantierId = await chantierEssai(s.chantier.nom)
      const r = await importerReleve(chantierId, s, 'garder_les_deux')
      const objets = await db.objets.where('releve_id').equals(r.id).toArray()
      const etape = calculerReleve(r.entete, objets).etape
      naviguer(cheminEtape(r.id, etape), { replace: true })
    })().catch((e: unknown) => setErreur(String(e)))
  }, [lettre, variante, naviguer])

  return (
    <div className="rt-ecran px-4 py-6">
      <h1 className="rt-etroite m-0 mb-3 text-[30px] font-extrabold">Page d'essai</h1>
      {erreur ? (
        <>
          <p className="m-0 mb-3 text-[18px] font-semibold text-rougeTexte">{erreur}</p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {LETTRES_JEUX.map((l) => (
              <li key={l}>
                <Link reloadDocument to={`/__essai?jeu=${l}`} className="rt-etroite flex min-h-[48px] min-w-[48px] items-center justify-center rounded-rt border-[3px] border-encre bg-jaune px-3 text-[22px] font-extrabold text-encre no-underline">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="m-0 text-[18px]">Chargement du jeu {lettre}...</p>
      )}
    </div>
  )
}
