/**
 * One recap screen for a dictation with a doubt: every line editable inline,
 * doubts in plain French under the line, the heard text at the top, one big
 * « Tout enregistrer ». Nothing is saved before that tap.
 */
import { useMemo, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import type { Account, TransactionCategory } from '../../../types'
import type { DicteeItem } from '../types'
import { CATEGORIES_DICTEE } from '../services/dicteeApi'
import { ligneEnregistrable } from '../utils/decision'
import { formaterMontant, LIBELLE_CATEGORIE, LIBELLE_TYPE } from '../utils/libelles'
import { isoDepuisChampDate, valeurChampDate } from '../utils/dates'

export interface LigneRecap {
  item: DicteeItem
  origine: number
}

interface Props {
  transcript: string
  lignesInitiales: LigneRecap[]
  comptes: Account[]
  /** A save already started: lines are frozen, only « Réessayer » remains. */
  fige: boolean
  occupe: boolean
  onEnregistrer: (lignes: LigneRecap[]) => void
  onAbandonner: () => void
}

const champ =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-gray-50'

export default function RecapDictee({ transcript, lignesInitiales, comptes, fige, occupe, onEnregistrer, onAbandonner }: Props) {
  const [lignes, setLignes] = useState<LigneRecap[]>(lignesInitiales)
  const [confirmerAbandon, setConfirmerAbandon] = useState(false)
  const ids = useMemo(() => new Set(comptes.map((c) => c.id)), [comptes])
  const valides = lignes.map((l) => ligneEnregistrable(l.item, ids))
  const toutValide = lignes.length > 0 && valides.every(Boolean)

  const modifier = (index: number, patch: Partial<DicteeItem>) =>
    setLignes((prec) => prec.map((l, i) => (i === index ? { ...l, item: { ...l.item, ...patch } } : l)))

  return (
    <section aria-labelledby="recap-titre" className="space-y-4">
      <div>
        <h2 id="recap-titre" className="text-lg font-semibold text-gray-900">
          Vérifiez avant d'enregistrer
        </h2>
        <p className="mt-1 text-sm text-gray-600">Rien n'est enregistré tant que vous n'avez pas touché « Tout enregistrer ».</p>
      </div>

      <figure className="rounded-xl border border-blue-100 bg-blue-50 p-3">
        <figcaption className="text-xs font-medium uppercase tracking-wide text-blue-700">Ce que j'ai entendu</figcaption>
        <blockquote className="mt-1 text-sm text-gray-900">« {transcript || '…'} »</blockquote>
      </figure>

      <ol className="space-y-3">
        {lignes.map((ligne, index) => {
          const { item } = ligne
          const n = index + 1
          const prefixe = `ligne-${index}`
          return (
            <li key={`${ligne.origine}-${index}`} className={`rounded-xl border bg-white p-3 shadow-sm ${valides[index] ? 'border-gray-200' : 'border-amber-300'}`}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Ligne {n} : {LIBELLE_TYPE[item.type]}
                  {item.amount > 0 && <span className="font-normal text-gray-600">, {formaterMontant(item.amount, item.currency)}</span>}
                </h3>
                {!fige && (
                  <button
                    type="button"
                    onClick={() => setLignes((prec) => prec.filter((_, i) => i !== index))}
                    className="-my-1 flex min-h-[2.75rem] items-center gap-1 rounded-md px-2 text-sm text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Supprimer la ligne
                    <span className="sr-only"> {n}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`${prefixe}-type`} className="mb-1 block text-xs font-medium text-gray-700">Type</label>
                  <select id={`${prefixe}-type`} disabled={fige} className={champ} value={item.type}
                    onChange={(e) => {
                      const type = e.target.value as DicteeItem['type']
                      modifier(index, type === 'transfer' ? { type, category: null } : { type, targetAccountId: null })
                    }}>
                    <option value="expense">Dépense</option>
                    <option value="income">Revenu</option>
                    <option value="transfer">Transfert</option>
                  </select>
                </div>
                <div>
                  <label htmlFor={`${prefixe}-date`} className="mb-1 block text-xs font-medium text-gray-700">Date</label>
                  <input id={`${prefixe}-date`} type="date" disabled={fige} className={champ} value={valeurChampDate(item.date)}
                    onChange={(e) => e.target.value && modifier(index, { date: isoDepuisChampDate(e.target.value, item.date) })} />
                </div>
                <div>
                  <label htmlFor={`${prefixe}-montant`} className="mb-1 block text-xs font-medium text-gray-700">Montant</label>
                  <input id={`${prefixe}-montant`} type="number" inputMode="decimal" min="0" step="any" disabled={fige} className={champ}
                    value={Number.isFinite(item.amount) && item.amount > 0 ? item.amount : ''}
                    onChange={(e) => modifier(index, { amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label htmlFor={`${prefixe}-devise`} className="mb-1 block text-xs font-medium text-gray-700">Devise</label>
                  <select id={`${prefixe}-devise`} disabled={fige} className={champ} value={item.currency}
                    onChange={(e) => modifier(index, { currency: e.target.value as 'MGA' | 'EUR' })}>
                    <option value="MGA">Ariary</option>
                    <option value="EUR">Euro</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label htmlFor={`${prefixe}-desc`} className="mb-1 block text-xs font-medium text-gray-700">Description</label>
                  <input id={`${prefixe}-desc`} type="text" disabled={fige} className={champ} value={item.description}
                    onChange={(e) => modifier(index, { description: e.target.value })} />
                </div>
                {item.type !== 'transfer' && (
                  <div className="col-span-2">
                    <label htmlFor={`${prefixe}-cat`} className="mb-1 block text-xs font-medium text-gray-700">Catégorie</label>
                    <select id={`${prefixe}-cat`} disabled={fige} className={champ} value={item.category ?? ''}
                      onChange={(e) => modifier(index, { category: (e.target.value || null) as TransactionCategory | null })}>
                      <option value="">À choisir</option>
                      {CATEGORIES_DICTEE.map((c) => <option key={c} value={c}>{LIBELLE_CATEGORIE[c]}</option>)}
                    </select>
                  </div>
                )}
                <div className={item.type === 'transfer' ? '' : 'col-span-2'}>
                  <label htmlFor={`${prefixe}-compte`} className="mb-1 block text-xs font-medium text-gray-700">
                    {item.type === 'transfer' ? 'Depuis' : 'Compte'}
                  </label>
                  <select id={`${prefixe}-compte`} disabled={fige} className={champ} value={item.accountId && ids.has(item.accountId) ? item.accountId : ''}
                    onChange={(e) => modifier(index, { accountId: e.target.value || null })}>
                    <option value="">À choisir</option>
                    {comptes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {item.type === 'transfer' && (
                  <div>
                    <label htmlFor={`${prefixe}-cible`} className="mb-1 block text-xs font-medium text-gray-700">Vers</label>
                    <select id={`${prefixe}-cible`} disabled={fige} className={champ} value={item.targetAccountId && ids.has(item.targetAccountId) ? item.targetAccountId : ''}
                      onChange={(e) => modifier(index, { targetAccountId: e.target.value || null })}>
                      <option value="">À choisir</option>
                      {comptes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {item.doubts.length > 0 && (
                <ul className="mt-2 space-y-1" aria-label={`Points à vérifier, ligne ${n}`}>
                  {item.doubts.map((d, k) => (
                    <li key={k} className="flex items-start gap-1.5 text-sm text-amber-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!valides[index] && (
                <p className="mt-2 text-sm text-amber-800">À compléter : montant, catégorie et compte.</p>
              )}
            </li>
          )
        })}
      </ol>

      {lignes.length === 0 && <p className="text-sm text-gray-600">Toutes les lignes ont été supprimées.</p>}

      <div className="space-y-2">
        <button
          type="button"
          disabled={!toutValide || occupe}
          onClick={() => onEnregistrer(lignes)}
          className="w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {occupe ? 'Enregistrement…' : fige ? 'Réessayer l\'enregistrement' : lignes.length > 1 ? `Tout enregistrer (${lignes.length})` : 'Tout enregistrer'}
        </button>
        {!fige && (
          confirmerAbandon ? (
            <div className="flex gap-2" role="group" aria-label="Confirmer l'abandon">
              <button type="button" onClick={onAbandonner} disabled={occupe}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                Oui, ne rien enregistrer
              </button>
              <button type="button" onClick={() => setConfirmerAbandon(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                Garder
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmerAbandon(true)} disabled={occupe}
              className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              Ne rien enregistrer
            </button>
          )
        )}
      </div>
    </section>
  )
}
