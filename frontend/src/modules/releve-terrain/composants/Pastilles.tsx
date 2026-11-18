// Letter pill (target) and state pill (colour always with its word).
import { Point } from './Icones'

/** Letter of a target: `cible` square, black 3 px frame, Barlow Condensed. */
export function PastilleLettre({ lettre, taille = 44, usage }: { lettre: string; taille?: number; usage?: number }) {
  return (
    <span
      className="rt-etroite inline-flex flex-none items-center justify-center rounded-lettre border-[3px] border-encre bg-cible font-extrabold text-encre leading-none"
      style={{ width: taille, height: taille, fontSize: Math.round(taille * 0.62) }}
      aria-label={usage && usage > 1 ? `Borne ${lettre} (${usage})` : `Borne ${lettre}`}
    >
      {lettre}
    </span>
  )
}

export type CouleurEtat = 'vert' | 'orange' | 'rouge' | 'bleu' | 'gris'

const COULEURS: Record<CouleurEtat, { fond: string; texte: string; mot: string }> = {
  vert: { fond: '#DCFCE7', texte: '#14532D', mot: 'VERT' },
  orange: { fond: '#FFEDD5', texte: '#7C2D12', mot: 'ORANGE' },
  rouge: { fond: '#FEE2E2', texte: '#7F1D1D', mot: 'ROUGE' },
  bleu: { fond: '#DBEAFE', texte: '#1E3A8A', mot: 'BLEU' },
  gris: { fond: '#E9EAE6', texte: '#2F302C', mot: 'GRIS' },
}

/** State pill: background and text of the state colour, dot, and always a word (VERT, ORANGE, ROUGE by default). */
export function PastilleEtat({ couleur, mot, petite = false }: { couleur: CouleurEtat; mot?: string; petite?: boolean }) {
  const c = COULEURS[couleur]
  return (
    <span className={`inline-flex flex-none items-center gap-1.5 rounded-pastille font-bold leading-tight ${petite ? 'px-2 py-0.5 text-[13px]' : 'px-2.5 py-[3px] text-[14px]'}`} style={{ background: c.fond, color: c.texte }}>
      <Point couleur={c.texte} taille={9} />
      {mot ?? c.mot}
    </span>
  )
}

/** Phase 3b (6.10, D19): data sent by the old phone after the owner's take-over. */
export const MOT_APRES_REPRISE = 'arrivé après reprise'

/** Yellow pill « arrivé après reprise » (screens 8, 9 and the late stations list). */
export function PastilleReprise() {
  return (
    <span data-apres-reprise className="inline-flex flex-none items-center rounded-pastille border-2 border-encre bg-jaune px-2 py-[2px] text-[13px] font-bold leading-tight text-encre">
      {MOT_APRES_REPRISE}
    </span>
  )
}
