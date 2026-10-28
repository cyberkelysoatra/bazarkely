/**
 * Account sheet « Sur quel compte ? »: one tap on an account chooses AND
 * confirms. The account most used for that category comes first, pre-selected.
 */
import { useEffect, useRef } from 'react'
import { CreditCard, PiggyBank, Smartphone, Wallet, X } from 'lucide-react'
import type { Account } from '../../../types'

export function IconeCompte({ type, className }: { type: Account['type']; className?: string }) {
  const Icone =
    type === 'especes' ? Wallet : type === 'courant' ? CreditCard : type === 'epargne' ? PiggyBank : Smartphone
  return <Icone className={className} aria-hidden="true" />
}

interface Props {
  comptes: Account[]
  prefere: string | null
  resume: string
  occupe: boolean
  onChoisir: (id: string) => void
  onFermer: () => void
  onVerifier: () => void
}

export default function FeuilleCompte({ comptes, prefere, resume, occupe, onChoisir, onFermer, onVerifier }: Props) {
  const premier = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    premier.current?.focus()
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [onFermer])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feuille-compte-titre"
        className="w-full max-w-md rounded-t-2xl bg-white p-4 shadow-2xl"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="feuille-compte-titre" className="text-lg font-semibold text-gray-900">
              Sur quel compte ?
            </h2>
            <p className="mt-0.5 text-sm text-gray-600">{resume}</p>
          </div>
          <button
            type="button"
            onClick={onFermer}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Fermer sans enregistrer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <ul className="max-h-[50vh] space-y-2 overflow-y-auto" aria-label="Vos comptes">
          {comptes.map((c) => {
            const choisi = c.id === prefere
            return (
              <li key={c.id}>
                <button
                  ref={choisi ? premier : undefined}
                  type="button"
                  disabled={occupe}
                  aria-pressed={choisi}
                  onClick={() => onChoisir(c.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 ${
                    choisi ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                    <IconeCompte type={c.type} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-900">{c.name}</span>
                    {choisi && <span className="block text-xs text-blue-700">Le plus utilisé pour cette dépense</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={onVerifier}
          disabled={occupe}
          className="mt-3 w-full rounded-lg px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Vérifier les lignes avant d'enregistrer
        </button>
      </div>
    </div>
  )
}
