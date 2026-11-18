// Card « Exporter » (H18 to H21): table of the points (CSV), plan with the contour lines (PDF, jsPDF
// loaded only on the tap), full backup; each with « Partager » (share sheet with the file, else download).
import { useState } from 'react'
import { executer, montrerAvis } from '../../etat/avis'
import type { ReleveCalcule } from '../../etat/releveCalcule'
import { fichierCsv } from '../../exports/csv'
import { baseNomFichier, partagerFichier } from '../../exports/fichiers'
import { exporterSauvegarde } from '../../exports/sauvegarde'

export interface InfosExport {
  releveId: string
  nom: string
  date: string
  chantier: string
  domaine: string
  operateurs: string
  intervalle: number
}

type Cle = 'csv' | 'pdf' | 'json'

async function remettre(f: File) {
  const r = await partagerFichier(f, f.name)
  if (r === 'telechargement') montrerAvis(`Fichier enregistré : ${f.name}`)
}

export function Exporter({ calcule, infos }: { calcule: ReleveCalcule; infos: InfosExport }) {
  const [enCours, setEnCours] = useState<Cle | null>(null)
  const base = baseNomFichier(infos.nom, infos.date)

  const lancer = async (cle: Cle) => {
    if (enCours) return
    setEnCours(cle)
    await executer(async () => {
      if (cle === 'csv') await remettre(fichierCsv(calcule, base))
      else if (cle === 'pdf') {
        const { creerPdfReleve } = await import('../../exports/pdf')
        await remettre(await creerPdfReleve({ calcule, ...infos }))
      } else await exporterSauvegarde(infos.releveId)
    })
    setEnCours(null)
  }

  const lignes: { cle: Cle; titre: string; texte: string }[] = [
    { cle: 'csv', titre: 'Tableau des points (CSV)', texte: 'Lisible par Excel en français' },
    { cle: 'pdf', titre: 'Plan avec les courbes (PDF)', texte: 'Quadrillage, bornes, points, courbes cotées' },
    { cle: 'json', titre: 'Sauvegarde complète', texte: 'Un fichier, copie de secours, à rouvrir dans un chantier' },
  ]

  return (
    <section aria-labelledby="rt-titre-export" className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-4">
      <h2 id="rt-titre-export" className="rt-etroite m-0 text-[26px] font-extrabold leading-tight">
        Exporter
      </h2>
      <ul className="m-0 flex list-none flex-col p-0">
        {lignes.map((l, i) => (
          <li key={l.cle} className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t-2 border-trait' : ''}`}>
            <div className="min-w-0 flex-1">
              <p className="rt-etroite m-0 text-[20px] font-bold leading-tight">{l.titre}</p>
              <p className="m-0 text-[14px] leading-snug text-encre2">{l.texte}</p>
            </div>
            <button
              type="button"
              onClick={() => void lancer(l.cle)}
              disabled={enCours !== null}
              aria-label={`Partager : ${l.titre}`}
              data-export={l.cle}
              className="rt-etroite min-h-[52px] flex-none rounded-rt border-[3px] border-encre bg-jaune px-4 text-[19px] font-extrabold text-encre disabled:opacity-50"
            >
              {enCours === l.cle ? 'Préparation' : 'Partager'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
