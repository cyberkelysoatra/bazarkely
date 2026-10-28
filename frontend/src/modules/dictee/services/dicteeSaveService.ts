/**
 * Idempotent save of a dictation.
 *
 * 1. The final lines and every client id are written to the queue record
 *    BEFORE anything is created: a crash in the middle replays with the same ids.
 * 2. Expense / income: transactionService.createTransaction(userId, data, { id })
 *    (same multi-currency path as AddTransactionPage). Skipped if already there.
 * 3. Transfer: transactionService.createTransfer with imposed ids (upsert), then
 *    the transfer fee exactly as TransferPage does (feeService, withdrawal off).
 * 4. One transaction_dictations row per dictated transaction (upsert, else syncQueue).
 */
import accountService from '../../../services/accountService'
import transactionService from '../../../services/transactionService'
import feeService from '../../../services/feeService'
import { db } from '../../../lib/database'
import { supabase, withTimeout } from '../../../lib/supabase'
import { SYNC_PRIORITY, type Account, type SyncOperation, type Transaction } from '../../../types'
import type { DicteeItem, DicteePlannedLine, PendingDictation } from '../types'
import { dateTransactionDepuisIso } from '../utils/dates'
import { planifierIdentifiants } from '../utils/plan'
import { versTerminee } from '../utils/etatFile'
import { sousVerrou } from '../utils/verrouPartage'

const DELAI_SUPABASE_MS = 5000

export function noteDictee(transcript: string): string {
  return `Dictée : « ${transcript.trim()} »`
}

/** Fige les lignes finales et les identifiants AVANT toute écriture. */
async function figerPlan(
  dictee: PendingDictation,
  lignes: { item: DicteeItem; origine: number }[]
): Promise<PendingDictation> {
  // Read-check-write in one IndexedDB transaction: the first writer wins and
  // every later caller (any tab) reuses the ids it froze.
  return db.transaction('rw', db.pendingDictations, async () => {
    const stockee = (await db.pendingDictations.get(dictee.id)) ?? dictee
    const dejaFige = stockee.transactionIds && stockee.lignesFinales
    const lignesFinales = dejaFige ? stockee.lignesFinales! : lignes
    const plan = planifierIdentifiants(
      lignesFinales.map((l) => l.item.type),
      stockee.transactionIds
    )
    const fige: PendingDictation = {
      ...stockee,
      lignesFinales,
      transactionIds: plan,
      updatedAt: new Date().toISOString()
    }
    await db.pendingDictations.put(fige)
    return fige
  })
}

/** Lignes du serveur déjà écrites (rejeu d'un transfert interrompu). */
async function lignesServeur(ids: string[]): Promise<any[] | null> {
  try {
    const { data, error } = (await withTimeout(
      (supabase as any).from('transactions').select('*').in('id', ids),
      DELAI_SUPABASE_MS,
      'dictee.lignesServeur'
    )) as any
    if (error) throw error
    return data ?? []
  } catch {
    return null
  }
}

async function ecrireDepenseOuRevenu(
  userId: string,
  item: DicteeItem,
  id: string,
  note: string
): Promise<void> {
  if (await db.transactions.get(id)) return // déjà créée (rejeu)
  const cree = await transactionService.createTransaction(
    userId,
    {
      accountId: item.accountId!,
      type: item.type === 'income' ? 'income' : 'expense',
      amount: item.type === 'income' ? item.amount : -item.amount,
      description: item.description,
      category: item.category!,
      date: dateTransactionDepuisIso(item.date),
      notes: note,
      originalCurrency: item.currency,
      originalAmount: item.amount,
      currentOwnerId: userId
    },
    { id }
  )
  if (!cree) throw new Error('creation_transaction')
}

async function ecrireTransfert(
  userId: string,
  item: DicteeItem,
  plan: DicteePlannedLine,
  note: string,
  comptes: Account[]
): Promise<string[]> {
  const fromId = plan.transactionId
  const toId = plan.targetTransactionId!
  const creees = [fromId, toId]

  const dejaLocal = await db.transactions.get(fromId)
  if (!dejaLocal) {
    const surServeur = await lignesServeur([fromId, toId])
    if (surServeur === null) throw new Error('verification_serveur')
    if (surServeur.length === 2) {
      // Écrit au serveur avant une coupure : on le ramène en local, sans
      // rejouer les mouvements de solde.
      await db.transactions.bulkPut(surServeur.map((l) => (transactionService as any).mapSupabaseToTransaction(l)))
    } else {
      const resultat = await transactionService.createTransfer(
        userId,
        {
          fromAccountId: item.accountId!,
          toAccountId: item.targetAccountId!,
          amount: item.amount,
          description: item.description,
          notes: note,
          date: dateTransactionDepuisIso(item.date),
          originalCurrency: item.currency
        },
        { ids: { fromId, toId } }
      )
      if (!resultat.success || !resultat.transactions) throw new Error(resultat.error || 'creation_transfert')
      // createTransfer écrit au serveur seulement : la copie locale permet
      // l'affichage immédiat et l'annulation (suppression des deux lignes).
      await db.transactions.bulkPut(resultat.transactions as Transaction[])
    }
  }

  // Frais : exactement comme TransferPage (retrait non inclus par défaut).
  const source = comptes.find((c) => c.id === item.accountId)
  const cible = comptes.find((c) => c.id === item.targetAccountId)
  if (source && cible && plan.feeTransactionId) {
    let frais = 0
    try {
      frais = (await feeService.calculateFees(source.type, cible.type, item.amount, false)).transferFee
    } catch {
      frais = 0
    }
    if (frais > 0) {
      if (!(await db.transactions.get(plan.feeTransactionId))) {
        const cree = await transactionService.createTransaction(
          userId,
          {
            type: 'expense',
            amount: -frais,
            description: 'Frais de transfert',
            category: 'autres',
            accountId: item.accountId!,
            date: dateTransactionDepuisIso(item.date),
            notes: 'Frais de transfert',
            originalCurrency: item.currency,
            originalAmount: frais,
            currentOwnerId: userId
          },
          { id: plan.feeTransactionId }
        )
        if (!cree) throw new Error('creation_frais')
      }
      creees.push(plan.feeTransactionId)
    }
  }
  return creees
}

async function mettreEnFileTrace(userId: string, ligne: Record<string, unknown>): Promise<void> {
  const deja = await db.syncQueue
    .where('table_name')
    .equals('transaction_dictations')
    .filter((op) => op.data?.id === ligne.id)
    .count()
  if (deja > 0) return
  const op: SyncOperation = {
    id: crypto.randomUUID(),
    userId,
    operation: 'CREATE',
    table_name: 'transaction_dictations',
    data: ligne,
    timestamp: new Date(),
    retryCount: 0,
    status: 'pending',
    priority: SYNC_PRIORITY.LOW,
    syncTag: 'bazarkely-sync',
    expiresAt: null
  }
  await db.syncQueue.add(op)
}

/** Une ligne transaction_dictations par transaction dictée. Jamais bloquant. */
async function ecrireTrace(userId: string, ligne: Record<string, unknown>): Promise<void> {
  if (navigator.onLine) {
    try {
      const { error } = (await withTimeout(
        (supabase as any)
          .from('transaction_dictations')
          .upsert(ligne, { onConflict: 'id', ignoreDuplicates: true }),
        DELAI_SUPABASE_MS,
        'dictee.trace'
      )) as any
      if (!error) return
      console.warn('[Dictée] Trace refusée, mise en file:', error?.code || error)
    } catch (erreur) {
      // Un délai dépassé n'est pas un échec : la file rejoue le même id.
      console.warn('[Dictée] Trace non confirmée, mise en file:', erreur)
    }
  }
  await mettreEnFileTrace(userId, ligne)
}

/**
 * Enregistre les lignes finales d'une dictée. Rejouable : en cas d'erreur la
 * dictée reste `needs_review` avec ses identifiants, rien n'est dupliqué.
 * Retourne la dictée passée à `done`.
 */
const enCours = new Map<string, Promise<PendingDictation>>()

export function enregistrerDictee(
  dictee: PendingDictation,
  lignes: { item: DicteeItem; origine: number }[]
): Promise<PendingDictation> {
  // The queue and the screen may both try: one save per dictation at a time.
  const deja = enCours.get(dictee.id)
  if (deja) return deja
  // Same tab: shared promise. Other tabs: Web Lock, then the stored state
  // (already `done`) makes the second run a no-op.
  const promesse = sousVerrou(`bazarkely-dictee-save-${dictee.id}`, 'attendre', () =>
    enregistrerSansVerrou(dictee.id, lignes)
  )
    .then((d) => {
      if (!d) throw new Error('verrou_indisponible')
      return d
    })
    .finally(() => enCours.delete(dictee.id))
  enCours.set(dictee.id, promesse)
  return promesse
}

async function enregistrerSansVerrou(
  id: string,
  lignes: { item: DicteeItem; origine: number }[]
): Promise<PendingDictation> {
  // Always the stored record: its frozen ids win over any copy in memory.
  const dictee = await db.pendingDictations.get(id)
  if (!dictee) throw new Error('dictee_introuvable')
  if (dictee.status === 'done') return dictee
  const result = dictee.result
  if (!result) throw new Error('dictee_sans_resultat')
  const fige = await figerPlan(dictee, lignes)
  const userId = fige.userId
  const comptes = await accountService.getAccounts()
  const note = noteDictee(result.transcript)
  const creees: string[] = []

  for (let i = 0; i < fige.lignesFinales!.length; i++) {
    const { item, origine } = fige.lignesFinales![i]
    const plan = fige.transactionIds![i]
    const aiItem = result.items[origine] ?? item
    const trace = (transactionId: string, id: string) => ({
      id,
      dictation_id: fige.id,
      transaction_id: transactionId,
      user_id: userId,
      transcript: result.transcript,
      ai_item: aiItem,
      model: result.model ?? null,
      recorded_at: fige.recordedAt
    })

    if (item.type === 'transfer') {
      const ids = await ecrireTransfert(userId, item, plan, note, comptes)
      creees.push(...ids)
      await ecrireTrace(userId, trace(plan.transactionId, plan.dictationRowId))
      await ecrireTrace(userId, trace(plan.targetTransactionId!, plan.targetDictationRowId!))
    } else {
      await ecrireDepenseOuRevenu(userId, item, plan.transactionId, note)
      creees.push(plan.transactionId)
      await ecrireTrace(userId, trace(plan.transactionId, plan.dictationRowId))
    }
  }

  const terminee = versTerminee(fige, creees)
  await db.pendingDictations.put(terminee)
  return terminee
}

/**
 * Ids to delete for « Annuler »: one per line (deleting a transfer's debit
 * line also deletes its credit line, balances restored on both accounts).
 */
export function idsPourAnnuler(dictee: PendingDictation): string[] {
  const creees = new Set(dictee.createdTransactionIds ?? [])
  const ids: string[] = []
  for (const p of dictee.transactionIds ?? []) {
    if (creees.has(p.transactionId)) ids.push(p.transactionId)
    if (p.feeTransactionId && creees.has(p.feeTransactionId)) ids.push(p.feeTransactionId)
  }
  return ids
}

export async function annulerDictee(dictee: PendingDictation): Promise<number> {
  let n = 0
  for (const id of idsPourAnnuler(dictee)) {
    if (await transactionService.deleteTransaction(id, { restoreBalance: true })) n++
  }
  return n
}
