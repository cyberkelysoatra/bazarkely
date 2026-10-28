/**
 * Two tabs, one shared IndexedDB queue (bug seen in production on 2026-10-28:
 * the same dictation was sent twice to the AI and saved twice). Each tab is a
 * separate module instance; only the database is shared.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const base = vi.hoisted(() => {
  const pending = new Map<string, any>()
  let file: Promise<unknown> = Promise.resolve()
  return {
    pending,
    // IndexedDB serialises read-write transactions on the same store.
    transaction: (_m: string, _t: unknown, fn: () => Promise<unknown>) => {
      const suite = file.then(fn)
      file = suite.catch(() => undefined)
      return suite
    }
  }
})

const table = {
  get: async (id: string) => structuredClone(base.pending.get(id)),
  put: async (d: any) => {
    await new Promise((r) => setTimeout(r, 1))
    base.pending.set(d.id, structuredClone(d))
  },
  where: (champ: string) => ({
    equals: (v: any) => ({
      toArray: async () =>
        [...base.pending.values()].filter((d) =>
          champ === '[userId+status]' ? d.userId === v[0] && d.status === v[1] : d[champ] === v
        ),
      filter: () => ({ count: async () => 0 })
    })
  }),
  bulkDelete: async () => undefined
}

vi.mock('../../../../lib/database', () => ({ db: { pendingDictations: table, transaction: base.transaction, transactions: { get: async () => undefined } } }))
vi.mock('../../../../lib/supabase', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) } } }))
vi.mock('../../../../stores/appStore', () => ({ useAppStore: { getState: () => ({ user: { id: 'u1' } }) } }))
vi.mock('../../../../services/accountService', () => ({ default: { getAccounts: async () => [{ id: 'cash', name: 'Espèces', type: 'especes', isDefault: true }] } }))
vi.mock('../../components/toastDictee', () => ({ toastDicteeEnregistree: vi.fn() }))
const envoyer = vi.hoisted(() => vi.fn())
vi.mock('../dicteeApi', () => ({ envoyerDictee: envoyer, CATEGORIES_DICTEE: [] }))
const enregistrer = vi.hoisted(() => vi.fn())
vi.mock('../dicteeSaveService', () => ({ enregistrerDictee: enregistrer }))

beforeEach(() => {
  base.pending.clear()
  base.pending.set('d1', {
    id: 'd1', userId: 'u1', recordedAt: '2026-10-28T22:29:27+03:00', audio: new Blob(['x']), mime: 'audio/webm',
    durationMs: 7000, status: 'waiting', attempts: 0, error: 'session', updatedAt: new Date().toISOString()
  })
  envoyer.mockReset()
  envoyer.mockImplementation(async () => {
    await new Promise((r) => setTimeout(r, 20))
    return { kind: 'ok', result: { transcript: 'Taxi 5000 en espèces', items: [{ type: 'expense', amount: 5000, currency: 'MGA', description: 'Taxi', category: 'transport', accountId: 'cash', targetAccountId: null, date: '2026-10-28T22:29:27+03:00', confidence: 1, doubts: [] }] } }
  })
  enregistrer.mockReset()
  enregistrer.mockImplementation(async (d: any) => {
    const fini = { ...d, status: 'done' }
    base.pending.set(d.id, fini)
    return fini
  })
})

async function ongletNeuf() {
  vi.resetModules()
  return import('../dicteeQueueService')
}

describe('deux onglets, une seule file', () => {
  it('SIGNED_IN reçu par deux onglets : un seul envoi à l\'IA, un seul enregistrement', async () => {
    const ongletA = await ongletNeuf()
    const ongletB = await ongletNeuf()
    expect(ongletA).not.toBe(ongletB)
    await Promise.all([ongletA.traiterFile(), ongletB.traiterFile()])
    expect(envoyer).toHaveBeenCalledTimes(1)
    expect(enregistrer).toHaveBeenCalledTimes(1)
    expect(base.pending.get('d1').status).toBe('done')
  })

  it('une dictée « processing » récente d\'un autre onglet n\'est ni remise en attente ni renvoyée', async () => {
    base.pending.set('d1', { ...base.pending.get('d1'), status: 'processing', updatedAt: new Date().toISOString() })
    const onglet = await ongletNeuf()
    await onglet.traiterFile()
    expect(envoyer).not.toHaveBeenCalled()
    expect(base.pending.get('d1').status).toBe('processing')
  })

  it('une dictée « processing » abandonnée depuis plus de 2 min est reprise', async () => {
    base.pending.set('d1', { ...base.pending.get('d1'), status: 'processing', updatedAt: new Date(Date.now() - 3 * 60_000).toISOString() })
    const onglet = await ongletNeuf()
    await onglet.traiterFile()
    expect(envoyer).toHaveBeenCalledTimes(1)
  })
})
