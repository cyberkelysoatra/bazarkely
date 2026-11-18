// Buttons of MODELE B: principal (yellow, black 3 px frame), secondaire (transparent, black frame), danger.
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type VarianteBouton = 'principal' | 'secondaire' | 'danger'

const CLASSES: Record<VarianteBouton, string> = {
  principal: 'bg-jaune text-encre border-encre',
  secondaire: 'bg-transparent text-encre border-encre',
  danger: 'bg-surface text-danger border-danger',
}

export interface PropsBouton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBouton
  /** 60 px high (main actions), else 52 px. */
  grand?: boolean
  pleineLargeur?: boolean
  icone?: ReactNode
}

export function Bouton({ variante = 'principal', grand = true, pleineLargeur = true, icone, className = '', children, type = 'button', ...rest }: PropsBouton) {
  return (
    <button
      type={type}
      className={`rt-etroite inline-flex items-center justify-center gap-2 rounded-rt border-[3px] px-4 font-extrabold text-[21px] leading-tight disabled:opacity-50 ${grand ? 'min-h-[60px]' : 'min-h-[52px] text-[19px]'} ${pleineLargeur ? 'w-full' : ''} ${CLASSES[variante]} ${className}`}
      {...rest}
    >
      {icone}
      {children}
    </button>
  )
}
