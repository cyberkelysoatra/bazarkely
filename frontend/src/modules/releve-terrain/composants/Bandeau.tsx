// Band under the header, on every screen of a relevé. Phase 2: « Enregistré sur ce téléphone » with a green
// dot. Phase 3: state of the input lock (DESIGN colours) and of the sending (H02), with its action
// (« Terminer la saisie », « Prendre la saisie »). `compacte`: one line (Saisir screen, D21).
import { Point } from './Icones'

export type EtatBandeau = 'local' | 'tenue' | 'ailleurs' | 'libre' | 'fin_en_attente' | 'reprise' | 'retire'

const STYLES: Record<EtatBandeau, { fond: string; texte: string; point: string; defaut: string }> = {
  local: { fond: '#FFFFFF', texte: '#000000', point: '#15803D', defaut: 'Enregistré sur ce téléphone' },
  tenue: { fond: '#1E3A8A', texte: '#FFFFFF', point: '#FFFFFF', defaut: 'Vous tenez la saisie' },
  ailleurs: { fond: '#3F3F3A', texte: '#FFFFFF', point: '#FFFFFF', defaut: 'En saisie sur un autre téléphone' },
  libre: { fond: '#FFFFFF', texte: '#000000', point: '#3F3F3A', defaut: 'Saisie libre' },
  fin_en_attente: { fond: '#FFEDD5', texte: '#7C2D12', point: '#7C2D12', defaut: 'Fin de saisie en attente du réseau' },
  reprise: { fond: '#FEE2E2', texte: '#7F1D1D', point: '#7F1D1D', defaut: 'Saisie reprise par le propriétaire' },
  retire: { fond: '#FEE2E2', texte: '#7F1D1D', point: '#7F1D1D', defaut: "Vous n'avez plus le droit de relever ici" },
}

export interface PropsBandeau {
  etat?: EtatBandeau
  texte?: string
  /** Second line (sending marker, last data received). Hidden on one line. */
  sousTexte?: string | null
  action?: { libelle: string; onClick: () => void }
  compacte?: boolean
  /** Colour of the dot when it differs from the state's (sending marker, H02). */
  point?: string
}

export function Bandeau({ etat = 'local', texte, sousTexte, action, compacte = false, point }: PropsBandeau) {
  const s = STYLES[etat]
  return (
    <div
      role="status"
      data-bandeau={etat}
      className={`flex items-center gap-2 border-b-2 border-encre px-4 ${compacte ? 'min-h-[40px] py-1' : 'min-h-[48px] py-2'}`}
      style={{ background: s.fond, color: s.texte }}
    >
      <Point couleur={point ?? s.point} taille={12} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`font-semibold ${compacte ? 'truncate text-[15px]' : 'text-[16px] leading-snug'}`}>{texte ?? s.defaut}</span>
        {sousTexte && !compacte ? <span className="text-[14px] font-medium opacity-90">{sousTexte}</span> : null}
      </span>
      {action ? (
        <button type="button" onClick={action.onClick} className="rt-etroite min-h-[40px] flex-none rounded-rt border-[3px] border-current px-3 text-[17px] font-extrabold">
          {action.libelle}
        </button>
      ) : null}
    </div>
  )
}
