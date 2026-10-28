/**
 * Voice entry (DICTEE-CC-01) : shared types.
 *
 * A dictation goes through ONE path: local queue (Dexie `pendingDictations`),
 * then the server function `/api/dictee-depense` (Gemini), then the decision
 * (saved directly, account sheet, or recap), then the idempotent save.
 */
import type { TransactionCategory } from '../../types'

export type DicteeStatus = 'waiting' | 'processing' | 'needs_review' | 'done' | 'failed'

export type DicteeItemType = 'expense' | 'income' | 'transfer'

/** What a doubt is about (DICTEE-CC-02). A line whose only doubts are `compte` goes to the account sheet. */
export type DicteeDoubtKind = 'compte' | 'montant' | 'categorie' | 'type' | 'date' | 'autre'

export interface DicteeDoubt {
  kind: DicteeDoubtKind
  text: string
}

/** One line as returned by the AI (validated by the server function). */
export interface DicteeItem {
  type: DicteeItemType
  amount: number
  currency: 'MGA' | 'EUR'
  description: string
  category: TransactionCategory | null
  accountId: string | null
  targetAccountId: string | null
  /** ISO string with offset. */
  date: string
  confidence: number
  /**
   * Objects since DICTEE-CC-02. Results stored by phase 1 still hold plain
   * strings: always read through `doutesDe()` (utils/doutes.ts).
   */
  doubts: (DicteeDoubt | string)[]
  /** Ambiguous account (two « espèces »…): the accounts that match what was said. */
  accountCandidates?: string[]
}

export interface DicteeResult {
  transcript: string
  items: DicteeItem[]
  model?: string
}

/**
 * Client ids planned BEFORE anything is created, stored in the queue record:
 * a crash in the middle replays with the same ids (upsert), never a duplicate.
 */
export interface DicteePlannedLine {
  lineIndex: number
  /** expense / income: the transaction. transfer: the debit line. */
  transactionId: string
  /** transfer only: the credit line. */
  targetTransactionId?: string
  /** transfer only: the fee line, used only if a fee applies. */
  feeTransactionId?: string
  /** transaction_dictations ids, one per created dictated transaction. */
  dictationRowId: string
  targetDictationRowId?: string
}

export interface PendingDictation {
  id: string
  /** '' when recorded with nobody signed in (see utils/proprietaire.ts). */
  userId: string
  /** Unowned dictation only: the last user signed in on this phone, the only one who may adopt it. */
  dernierUtilisateur?: string
  /** ISO string with offset, moment of the recording. */
  recordedAt: string
  audio?: Blob
  mime: string
  durationMs: number
  status: DicteeStatus
  attempts: number
  result?: DicteeResult
  /**
   * Lines as they will be saved (after the account sheet or the recap edits),
   * each pointing to its original AI line (`origine`, index in result.items).
   * Frozen once a save has started, together with `transactionIds`.
   */
  lignesFinales?: { item: DicteeItem; origine: number }[]
  /** Planned client ids (see DicteePlannedLine), index = position in lignesFinales. */
  transactionIds?: DicteePlannedLine[]
  /** Ids actually created, for the undo action and the 7-day trace. */
  createdTransactionIds?: string[]
  error?: string
  /** ISO string. */
  updatedAt: string
}

/** What the screen must do with an analysed dictation. */
export type DicteeDecision =
  | { kind: 'sure' }
  | { kind: 'account'; lineIndexes: number[] }
  | { kind: 'review' }
  | { kind: 'empty' }
