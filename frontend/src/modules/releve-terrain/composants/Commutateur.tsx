// Module switcher of the header logo (RELEVE-CC-09, H23), copy of Validation's Commutateur adapted to the
// MODELE B look: a bar fixed at the bottom with one tile per other module of the account, full page
// navigation. First tile « Mes terrains » (the logo's former link). Escape and a tap outside close it.
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import type { IdModule, ModuleHote } from '../sync/modules'
import { Icone } from './Icones'

let ouvert = false
const abonnes = new Set<() => void>()
const notifier = () => abonnes.forEach((f) => f())

export function basculerCommutateur(): void {
  ouvert = !ouvert
  notifier()
}

export function fermerCommutateur(): void {
  if (!ouvert) return
  ouvert = false
  notifier()
}

export function useCommutateurOuvert(): boolean {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f)
      return () => abonnes.delete(f)
    },
    () => ouvert,
    () => false,
  )
}

const COULEURS: Record<IdModule, { fond: string; texte: string; lettre: string }> = {
  bazarkely: { fond: '#7C3AED', texte: '#FFFFFF', lettre: 'B' },
  construction: { fond: '#C2410C', texte: '#FFFFFF', lettre: 'C' },
  'gestion-eau': { fond: '#0F766E', texte: '#FFFFFF', lettre: 'E' },
  'navy-ay': { fond: '#FACC15', texte: '#1F2937', lettre: 'N' },
  pudi: { fond: '#0B2A8C', texte: '#FFFFFF', lettre: 'P' },
  validation: { fond: '#0369A1', texte: '#FFFFFF', lettre: 'V' },
}

const TUILE = 'flex h-11 w-11 items-center justify-center rounded-rt border-2 border-encre text-[20px] font-extrabold'
const BOUTON = 'flex min-h-[72px] min-w-[64px] flex-none flex-col items-center gap-1 px-1 py-1.5 text-[12px] font-bold text-encre'

export function Commutateur({ modules }: { modules: ModuleHote[] }) {
  const nav = useRef<HTMLElement>(null)
  const naviguer = useNavigate()
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermerCommutateur()
    }
    const dehors = (e: Event) => {
      const t = e.target as Element | null
      if (!t || nav.current?.contains(t) || t.closest?.('[data-rt-logo]')) return
      fermerCommutateur()
    }
    document.addEventListener('keydown', touche)
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', dehors)
      document.addEventListener('touchstart', dehors)
    }, 50)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('keydown', touche)
      document.removeEventListener('mousedown', dehors)
      document.removeEventListener('touchstart', dehors)
    }
  }, [])
  return (
    <nav ref={nav} aria-label="Changer de module" data-rt-commutateur className="fixed bottom-0 left-1/2 z-50 w-full max-w-[520px] -translate-x-1/2 border-t-[3px] border-encre bg-fond pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex flex-nowrap items-start gap-1 overflow-x-auto px-2 py-1.5">
        <button
          type="button"
          className={BOUTON}
          onClick={() => {
            fermerCommutateur()
            naviguer('/')
          }}
          data-rt-tuile="releve"
        >
          <span className={`${TUILE} bg-jaune`}>
            <Icone nom="montagne" taille={26} couleur="#000000" />
          </span>
          Mes terrains
        </button>
        {modules.map((m) => {
          const c = COULEURS[m.id]
          return (
            <button
              key={m.id}
              type="button"
              className={BOUTON}
              aria-label={`Ouvrir ${m.nom}`}
              data-rt-tuile={m.id}
              onClick={() => {
                fermerCommutateur()
                window.location.assign(m.adresse)
              }}
            >
              <span className={TUILE} style={{ background: c.fond, color: c.texte }}>
                {c.lettre}
              </span>
              <span className="whitespace-nowrap">{m.nom}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
