/**
 * Toast after a direct save: « Taxi, 5 000 Ar, Espèces : enregistré » with an
 * « Annuler » action for 8 s that deletes the transactions, balances restored.
 */
import { toast } from 'react-hot-toast'
import type { Account } from '../../../types'
import type { DicteeItem, PendingDictation } from '../types'
import { messageEnregistre } from '../utils/libelles'
import { annulerDictee } from '../services/dicteeSaveService'

const DUREE_ANNULATION_MS = 8000

export function toastDicteeEnregistree(
  dictee: PendingDictation,
  items: DicteeItem[],
  comptes: Pick<Account, 'id' | 'name'>[]
): void {
  const lignes = dictee.lignesFinales?.map((l) => l.item) ?? items
  const message = messageEnregistre(lignes, (id) => comptes.find((c) => c.id === id)?.name ?? 'compte')

  toast.success(
    (t) => (
      <span className="flex items-center gap-3">
        <span>{message}</span>
        <button
          type="button"
          className="shrink-0 rounded-md bg-white/20 px-3 py-1.5 text-sm font-semibold text-white underline-offset-2 hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          onClick={async () => {
            toast.dismiss(t.id)
            const n = await annulerDictee(dictee)
            toast(n > 0 ? 'Dictée annulée, solde rétabli' : "Rien n'a pu être annulé", { duration: 4000 })
          }}
        >
          Annuler
        </button>
      </span>
    ),
    { duration: DUREE_ANNULATION_MS, id: `dictee-${dictee.id}` }
  )
}
