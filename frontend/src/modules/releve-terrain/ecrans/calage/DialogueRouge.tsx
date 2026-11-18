// Dialog of a red calibration (H05): the message computed by calcul/ (messageRouge, real letters), then
// « Refaire » (first, safe) or « Continuer quand même » (noted in the relevé by the caller).
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bouton } from '../../composants/Bouton'

export interface PropsDialogueRouge {
  ouvert: boolean
  message: string
  onContinuer: () => void
  onRefaire: () => void
}

export function DialogueRouge({ ouvert, message, onContinuer, onRefaire }: PropsDialogueRouge) {
  const id = useId()
  const idTexte = useId()
  const ref = useRef<HTMLDivElement>(null)
  const refaire = useRef(onRefaire)
  refaire.current = onRefaire
  useEffect(() => {
    if (!ouvert) return
    const avant = document.activeElement as HTMLElement | null
    const t = window.setTimeout(() => ref.current?.querySelector<HTMLButtonElement>('button')?.focus(), 0)
    const f = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        refaire.current()
      }
    }
    window.addEventListener('keydown', f)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', f)
      avant?.focus?.()
    }
  }, [ouvert])
  if (!ouvert) return null
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 text-encre">
      <div className="absolute inset-0 bg-black/60" onClick={onRefaire} aria-hidden="true" />
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={id} aria-describedby={idTexte} className="relative w-full max-w-[440px] rounded-rt border-[3px] border-encre bg-surface p-4">
        <h2 id={id} className="rt-etroite m-0 mb-2 flex items-center gap-2 text-[26px] font-extrabold leading-tight">
          Calage rouge
        </h2>
        <p id={idTexte} className="m-0 mb-4 rounded-rt border-2 border-rougeTexte bg-rougeFond px-3 py-2 text-[18px] font-semibold leading-snug text-rougeTexte">
          {message}
        </p>
        <div className="flex flex-col gap-2">
          <Bouton variante="principal" onClick={onRefaire}>
            Refaire
          </Bouton>
          <Bouton variante="danger" onClick={onContinuer}>
            Continuer quand même
          </Bouton>
        </div>
      </div>
    </div>,
    document.body,
  )
}
