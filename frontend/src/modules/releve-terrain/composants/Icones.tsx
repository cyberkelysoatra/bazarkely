// Inline SVG pictograms of "Relevé terrain" (no import from the host, no icon library).
import type { SVGProps } from 'react'

export type NomIcone =
  | 'montagne'
  | 'menu'
  | 'plus'
  | 'chevron'
  | 'retour'
  | 'points'
  | 'saisir'
  | 'carte'
  | 'resultats'
  | 'coche'
  | 'croix'
  | 'installer'
  | 'info'
  | 'effacer'
  | 'dossier'
  | 'copier'
  | 'corbeille'
  | 'crayon'

const TRACES: Record<NomIcone, string[]> = {
  montagne: ['M3 19l6-12 4 6 3-3 5 9z'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  plus: ['M12 5v14', 'M5 12h14'],
  chevron: ['M9 5l7 7-7 7'],
  retour: ['M15 5l-7 7 7 7'],
  points: [],
  saisir: ['M12 3v4', 'M12 17v4', 'M3 12h4', 'M17 12h4', 'M12 8a4 4 0 1 0 0.01 0'],
  carte: ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z', 'M9 4v14', 'M15 6v14'],
  resultats: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M3 20h18'],
  coche: ['M5 12l5 5 9-11'],
  croix: ['M6 6l12 12', 'M18 6L6 18'],
  installer: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
  info: ['M12 11v6', 'M12 7v0.5', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'],
  effacer: ['M9 6h11v12H9l-6-6z', 'M12 9l5 6', 'M17 9l-5 6'],
  dossier: ['M3 7h7l2 2h9v10H3z'],
  copier: ['M8 8h12v12H8z', 'M4 16V4h12'],
  corbeille: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13'],
  crayon: ['M4 20l4-1 11-11-3-3L5 16z', 'M14 6l3 3'],
}

export function Icone({ nom, taille = 24, couleur = 'currentColor', epaisseur = 2.2, ...rest }: { nom: NomIcone; taille?: number; couleur?: string; epaisseur?: number } & SVGProps<SVGSVGElement>) {
  if (nom === 'points') {
    return (
      <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
        <circle cx="5" cy="12" r="2.2" fill={couleur} />
        <circle cx="12" cy="12" r="2.2" fill={couleur} />
        <circle cx="19" cy="12" r="2.2" fill={couleur} />
      </svg>
    )
  }
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={epaisseur} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {TRACES[nom].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

/** Small round dot (state of the band, pills). */
export function Point({ couleur, taille = 10 }: { couleur: string; taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 10 10" aria-hidden="true" focusable="false" className="flex-none">
      <circle cx="5" cy="5" r="5" fill={couleur} />
    </svg>
  )
}
