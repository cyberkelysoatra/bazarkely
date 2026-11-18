// Placeholder of the screens of the next phases (6 to 12), inside the frame of the relevé.
import { useLocation, useParams } from 'react-router-dom'
import type { OngletBas } from '../composants/BarreBas'
import type { NumeroEtape } from '../composants/Etapes'
import { useReleve } from '../etat/useReleve'
import { CadreReleve } from './CadreReleve'

const PAR_CHEMIN: Record<string, { etape?: NumeroEtape; onglet: OngletBas | null; titre: string }> = {
  bornes: { etape: 1, onglet: null, titre: 'Bornes' },
  calage: { etape: 2, onglet: 'saisir', titre: 'Calage' },
  saisir: { etape: 3, onglet: 'saisir', titre: 'Saisir une station' },
  ephemere: { etape: 3, onglet: 'saisir', titre: 'Borne éphémère' },
  carte: { onglet: 'carte', titre: 'Carte' },
  resultats: { etape: 4, onglet: 'resultats', titre: 'Résultats' },
}

export default function Prochainement() {
  const { releve } = useParams()
  const { pathname } = useLocation()
  const segment = pathname.split('/')[3] ?? ''
  const ecran = PAR_CHEMIN[segment] ?? { onglet: null, titre: 'Écran' }
  const r = useReleve(releve)
  return (
    <CadreReleve releve={r} etape={ecran.etape} onglet={ecran.onglet}>
      <h2 className="rt-etroite m-0 text-[30px] font-extrabold">{ecran.titre}</h2>
      <p className="m-0 rounded-rt border-[3px] border-encre bg-surface p-4 text-[18px] font-semibold">Cet écran arrive dans la prochaine mise à jour.</p>
    </CadreReleve>
  )
}
