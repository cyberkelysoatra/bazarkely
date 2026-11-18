// Header of MODELE B: black, yellow 44 px square with the mountain (back to the work sites), title in
// Barlow Condensed 26 px / 800, subtitle, and a `droite` slot (menu button by default).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from './Icones'

export interface PropsEnTete {
  titre: string
  sousTitre?: string | null
  /** Right action (48 px). */
  droite?: ReactNode
}

export function EnTete({ titre, sousTitre, droite }: PropsEnTete) {
  return (
    <header className="rt-sombre sticky top-0 z-10 flex items-center gap-3 bg-encre px-4 py-3 text-white">
      <Link to="/" aria-label="Mes terrains" className="flex h-11 w-11 flex-none items-center justify-center rounded-rt bg-jaune">
        <Icone nom="montagne" taille={26} couleur="#000000" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h1 className="rt-etroite m-0 truncate text-[26px] font-extrabold leading-[1.1] tracking-[0.01em]">{titre}</h1>
        {sousTitre ? <p className="m-0 truncate text-[14px] font-medium text-white/85">{sousTitre}</p> : null}
      </div>
      {droite}
    </header>
  )
}

/** 48 px button of the header (menu). */
export function BoutonEnTete({ libelle, onClick, icone = 'menu' }: { libelle: string; onClick: () => void; icone?: 'menu' | 'points' }) {
  return (
    <button type="button" aria-label={libelle} onClick={onClick} className="flex h-12 w-12 flex-none items-center justify-center rounded-rt bg-white/[0.16]">
      <Icone nom={icone} taille={22} couleur="#FFFFFF" />
    </button>
  )
}
