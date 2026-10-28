/**
 * Idempotent replay of a save: a crash in the middle, then a second run with
 * the ids stored in the queue record. Nothing is created twice.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const tables = vi.hoisted(() => ({
  pending: new Map<string, any>(),
  transactions: new Map<string, any>(),
  queue: [] as any[]
}))

vi.mock('../../../../lib/database', () => ({
  db: {
    transaction: (_m: string, _t: unknown, fn: () => Promise<unknown>) => fn(),
    pendingDictations: {
      get: async (id: string) => structuredClone(tables.pending.get(id)),
      put: async (d: any) => void tables.pending.set(d.id, structuredClone(d))
    },
    transactions: {
      get: async (id: string) => tables.transactions.get(id),
      bulkPut: async (l: any[]) => l.forEach((t) => tables.transactions.set(t.id, t))
    },
    syncQueue: {
      where: () => ({ equals: () => ({ filter: (f: any) => ({ count: async () => tables.queue.filter(f).length }) }) }),
      add: async (op: any) => void tables.queue.push(op)
    }
  }
}))

const creer = vi.hoisted(() => vi.fn())
const transferer = vi.hoisted(() => vi.fn())
vi.mock('../../../../services/transactionService', () => ({
  default: { createTransaction: creer, createTransfer: transferer, deleteTransaction: vi.fn(), mapSupabaseToTransaction: (l: any) => l }
}))
vi.mock('../../../../services/accountService', () => ({
  default: { getAccounts: async () => [{ id: 'cash', name: 'Espèces', type: 'especes' }, { id: 'om', name: 'Orange Money', type: 'orange_money' }] }
}))
vi.mock('../../../../services/feeService', () => ({ default: { calculateFees: async () => ({ transferFee: 0 }) } }))
const upsert = vi.hoisted(() => vi.fn(async () => ({ error: null })))
vi.mock('../../../../lib/supabase', () => ({
  supabase: { from: () => ({ upsert, select: () => ({ in: async () => ({ data: [], error: null }) }) }) },
  withTimeout: (p: any) => p
}))

import { enregistrerDictee } from '../dicteeSaveService'

const item = (description: string, amount: number) => ({
  type: 'expense' as const,
  amount,
  currency: 'MGA' as const,
  description,
  category: 'alimentation' as const,
  accountId: 'cash',
  targetAccountId: null,
  date: '2026-10-28T19:00:00+03:00',
  confidence: 0.95,
  doubts: []
})

beforeEach(() => {
  tables.pending.clear()
  tables.transactions.clear()
  tables.queue.length = 0
  creer.mockReset()
  // The global test setup returns one fixed uuid: unique ids here.
  let n = 0
  ;(crypto.randomUUID as any).mockImplementation(() => `uuid-${++n}`)
  upsert.mockClear()
  creer.mockImplementation(async (userId: string, data: any, opts: { id: string }) => {
    const t = { ...data, id: opts.id, userId }
    tables.transactions.set(opts.id, t)
    return t
  })
  tables.pending.set('d1', {
    id: 'd1',
    userId: 'u1',
    recordedAt: '2026-10-28T19:00:00+03:00',
    mime: 'audio/webm',
    durationMs: 3000,
    status: 'needs_review',
    attempts: 0,
    result: { transcript: 'pain deux mille, recharge mille', items: [item('Pain', 2000), item('Recharge', 1000)], model: 'm' },
    updatedAt: '2026-10-28T16:00:00.000Z'
  })
})

describe('enregistrement rejouable', () => {
  it('plantage après la 1re ligne puis reprise : mêmes identifiants, aucun doublon', async () => {
    const lignes = [{ item: item('Pain', 2000), origine: 0 }, { item: item('Recharge', 1000), origine: 1 }]
    creer.mockImplementationOnce(async (userId: string, data: any, opts: { id: string }) => {
      tables.transactions.set(opts.id, { ...data, id: opts.id, userId })
      return { id: opts.id }
    })
    creer.mockImplementationOnce(async () => {
      throw new Error('coupure')
    })

    await expect(enregistrerDictee(tables.pending.get('d1'), lignes)).rejects.toThrow('coupure')
    const apresPlantage = tables.pending.get('d1')
    expect(apresPlantage.status).toBe('needs_review')
    const ids = apresPlantage.transactionIds.map((p: any) => p.transactionId)
    expect(tables.transactions.has(ids[0])).toBe(true)
    expect(tables.transactions.has(ids[1])).toBe(false)

    // Replay, even with other lines in memory: the stored plan wins.
    const fini = await enregistrerDictee(apresPlantage, [{ item: item('Autre', 9), origine: 0 }])
    expect(fini.status).toBe('done')
    expect(creer).toHaveBeenCalledTimes(3) // 1 ok + 1 crash + only the missing one
    expect(creer.mock.calls[2][2]).toEqual({ id: ids[1] })
    expect(fini.createdTransactionIds).toEqual(ids)
    expect(fini.result).toBeUndefined()
    expect(tables.transactions.size).toBe(2)
    // Expense = negative amount, dictation note, AI line kept for phase 3.
    expect(creer.mock.calls[0][1]).toMatchObject({ amount: -2000, notes: 'Dictée : « pain deux mille, recharge mille »', originalCurrency: 'MGA', originalAmount: 2000 })
    const traces = upsert.mock.calls.map((c: any) => c[0])
    expect(new Set(traces.map((t: any) => t.transaction_id))).toEqual(new Set(ids))
    expect(traces[0]).toMatchObject({ dictation_id: 'd1', user_id: 'u1', transcript: 'pain deux mille, recharge mille' })
  })

  it('un 3e passage sur une dictée terminée ne crée rien', async () => {
    const lignes = [{ item: item('Pain', 2000), origine: 0 }]
    await enregistrerDictee(tables.pending.get('d1'), lignes)
    const n = creer.mock.calls.length
    await enregistrerDictee(tables.pending.get('d1'), lignes)
    expect(creer.mock.calls.length).toBe(n)
  })

  it('deux appels simultanés (file + écran) = un seul enregistrement', async () => {
    const lignes = [{ item: item('Pain', 2000), origine: 0 }]
    const d = tables.pending.get('d1')
    await Promise.all([enregistrerDictee(d, lignes), enregistrerDictee(d, lignes)])
    expect(creer).toHaveBeenCalledTimes(1)
  })

  it('trace refusée par le serveur : mise en file avec le même identifiant', async () => {
    upsert.mockImplementationOnce(async () => ({ error: { code: '23503' } }) as any)
    const fini = await enregistrerDictee(tables.pending.get('d1'), [{ item: item('Pain', 2000), origine: 0 }])
    expect(tables.queue).toHaveLength(1)
    expect(tables.queue[0]).toMatchObject({ table_name: 'transaction_dictations', operation: 'CREATE' })
    expect(tables.queue[0].data.id).toBe(fini.transactionIds![0].dictationRowId)
  })
})
