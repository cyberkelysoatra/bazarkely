// Bottom sheet (menus ⋯, forms) and confirmation dialog for irreversible actions. Escape and the dark
// backdrop close them; focus goes into the sheet and back to the opener.
import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Bouton } from './Bouton'
import { Icone } from './Icones'

function useFermerParEchap(ouvert: boolean, onFermer: () => void) {
  useEffect(() => {
    if (!ouvert) return
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onFermer()
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [ouvert, onFermer])
}

function useFocusRetour(ouvert: boolean, cible: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ouvert) return
    const avant = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => {
      // By priority: the marked element, the first field, the first menu line, then any button.
      for (const sel of ['[data-autofocus]', 'input', 'button[role="menuitem"]', 'button']) {
        const el = cible.current?.querySelector<HTMLElement>(sel)
        if (el) {
          el.focus()
          break
        }
      }
    }, 0)
    return () => {
      window.clearTimeout(t)
      avant?.focus?.()
    }
  }, [ouvert, cible])
}

export interface PropsFeuille {
  ouvert: boolean
  titre: string
  onFermer: () => void
  children: ReactNode
  /** role of the sheet: 'dialog' (form) or 'menu' (FeuilleMenu). */
  role?: 'dialog' | 'menu'
}

/** Bottom sheet: black 3 px frame on top, title, close button, content. */
export function Feuille({ ouvert, titre, onFermer, children, role = 'dialog' }: PropsFeuille) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useFermerParEchap(ouvert, onFermer)
  useFocusRetour(ouvert, ref)
  if (!ouvert) return null
  // Portal: a sheet opened from the black header never inherits its white text nor its focus ring.
  return createPortal(
    <div className="fixed inset-0 z-30 flex items-end justify-center text-encre">
      <div className="absolute inset-0 bg-black/55" onClick={onFermer} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        data-role={role}
        aria-modal="true"
        aria-labelledby={id}
        className="rt-feuille relative max-h-[88dvh] w-full max-w-[520px] overflow-y-auto rounded-t-rt border-t-[3px] border-encre bg-fond px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3"
      >
        <div className="mb-3 flex items-center gap-2">
          <h2 id={id} className="rt-etroite m-0 min-w-0 flex-1 truncate text-[26px] font-extrabold">
            {titre}
          </h2>
          <button type="button" aria-label="Fermer" onClick={onFermer} className="flex h-12 w-12 flex-none items-center justify-center rounded-rt border-[3px] border-encre bg-surface">
            <Icone nom="croix" taille={22} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export interface ElementMenu {
  libelle: string
  onClick: () => void
  danger?: boolean
}

/** Menu ⋯ as a bottom sheet: one 60 px line per action. */
export function FeuilleMenu({ ouvert, titre, onFermer, elements, pied }: { ouvert: boolean; titre: string; onFermer: () => void; elements: ElementMenu[]; pied?: ReactNode }) {
  return (
    <Feuille ouvert={ouvert} titre={titre} onFermer={onFermer} role="menu">
      <div role="menu" aria-label={titre} className="flex flex-col gap-2">
        {elements.map((e) => (
          <button
            key={e.libelle}
            type="button"
            role="menuitem"
            onClick={e.onClick}
            className={`rt-etroite flex min-h-[60px] w-full items-center rounded-rt border-2 bg-surface px-4 text-left text-[21px] font-bold ${e.danger ? 'border-danger text-danger' : 'border-encre text-encre'}`}
          >
            {e.libelle}
          </button>
        ))}
      </div>
      {pied}
    </Feuille>
  )
}

export interface PropsConfirmation {
  ouvert: boolean
  titre: string
  texte: ReactNode
  confirmer: { libelle: string; onClick: () => void }
  onAnnuler: () => void
  /** Optional extra action (« Exporter la sauvegarde d'abord »). */
  autre?: { libelle: string; onClick: () => void }
}

/** Dialog for irreversible actions: the dangerous action is never the first button. */
export function Confirmation({ ouvert, titre, texte, confirmer, onAnnuler, autre }: PropsConfirmation) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const idTexte = useId()
  useFermerParEchap(ouvert, onAnnuler)
  useFocusRetour(ouvert, ref)
  if (!ouvert) return null
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 text-encre">
      <div className="absolute inset-0 bg-black/60" onClick={onAnnuler} aria-hidden="true" />
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={id} aria-describedby={idTexte} className="relative w-full max-w-[440px] rounded-rt border-[3px] border-encre bg-surface p-4">
        <h2 id={id} className="rt-etroite m-0 mb-2 text-[26px] font-extrabold leading-tight">
          {titre}
        </h2>
        <div id={idTexte} className="mb-4 text-[17px] leading-snug">
          {texte}
        </div>
        <div className="flex flex-col gap-2">
          <Bouton variante="secondaire" onClick={onAnnuler} data-autofocus>
            Annuler
          </Bouton>
          {autre ? (
            <Bouton variante="principal" onClick={autre.onClick}>
              {autre.libelle}
            </Bouton>
          ) : null}
          <Bouton variante="danger" onClick={confirmer.onClick}>
            {confirmer.libelle}
          </Bouton>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Folded help ⓘ, in plain French. */
export function Aide({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <details className="rounded-rt border-2 border-encre bg-surface">
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-3 text-[16px] font-semibold">
        <span aria-hidden="true" className="flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 border-encre text-[15px] font-bold">
          i
        </span>
        <span className="flex-1">{titre}</span>
      </summary>
      <div className="border-t-2 border-encre px-3 py-3 text-[16px] leading-relaxed">{children}</div>
    </details>
  )
}
