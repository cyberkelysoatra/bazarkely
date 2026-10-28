/**
 * Queue robustness (DICTEE-CC-02): shared phone, app killed during
 * `processing`, dictation recorded with no known user, « Réessayer ».
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const base = vi.hoisted(() => {
  const pending = new Map<string, any>()
  return { pending, utilisateur: 'u1' as string | null }
})

const table = {
  get: async (id: string) => structuredClone(base.pending.get(id)),
  put: async (d: any) => {
    base.pending.set(d.id, structuredClone(d))
  },
  delete: async (id: string) => {
    base.pending.delete(id)
  },
  where: (champ: string) => ({
    equals: (v: any) => ({
      toArray: async () =>
        [...base.pending.values()]
          .filter((d) => (champ === '[userId+status]' ? d.userId === v[0] && d.status === v[1] : d[champ] === v))
          .map((d) => structuredClone(d))
    })
  }),
  bulkDelete: async () => undefined
}

vi.mock('../../../../lib/database', () => ({
  db: { pendingDictations: table, transaction: (_m: string, _t: unknown, fn: () => Promise<unknown>) => fn(), transactions: { get: async () => undefined } }
}))
vi.mock('../../../../lib/supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: base.utilisateur ? { user: { id: base.utilisateur } } : null } }) } }
}))
vi.mock('../../../../stores/appStore', () => ({ useAppStore: { getState: () => ({ user: base.utilisateur ? { id: base.utilisateur } : null }) } }))
vi.mock('../../../../services/accountService', () => ({ default: { getAccounts: async () => [{ id: 'cash', name: 'Espèces', type: 'especes', isDefault: true }] } }))
vi.mock('../../components/toastDictee', () => ({ toastDicteeEnregistree: vi.fn() }))
const envoyer = vi.hoisted(() => vi.fn())
vi.mock('../dicteeApi', () => ({ envoyerDictee: envoyer, CATEGORIES_DICTEE: [] }))
const enregistrer = vi.hoisted(() => vi.fn())
vi.mock('../dicteeSaveService', () => ({ enregistrerDictee: enregistrer }))

const RESULTAT_SUR = {
  transcript: 'Taxi 3000 en espèces',
  items: [{ type: 'expense', amount: 3000, currency: 'MGA', description: 'Taxi', category: 'transport', accountId: 'cash', targetAccountId: null, date: '2026-10-28T22:00:00+03:00', confidence: 1, doubts: [] }]
}

const enAttente = (id: string, userId: string, p: Record<string, unknown> = {}) => ({
  id, userId, recordedAt: `2026-10-28T22:0${id.length}:00+03:00`, audio: new Blob(['x']), mime: 'audio/webm',
  durationMs: 4000, status: 'waiting', attempts: 0, updatedAt: new Date().toISOString(), ...p
})

let file: typeof import('../dicteeQueueService')

beforeEach(async () => {
  base.pending.clear()
  base.utilisateur = 'u1'
  envoyer.mockReset()
  envoyer.mockResolvedValue({ kind: 'ok', result: RESULTAT_SUR })
  enregistrer.mockReset()
  enregistrer.mockImplementation(async (d: any) => {
    const fini = { ...d, status: 'done' }
    base.pending.set(d.id, fini)
    return fini
  })
  ;(navigator as any).onLine = true
  vi.resetModules()
  file = await import('../dicteeQueueService')
})

describe('téléphone partagé', () => {
  it('la dictée d\'un autre utilisateur n\'est ni traitée ni montrée, et reste gardée', async () => {
    base.pending.set('a', enAttente('a', 'u2'))
    base.pending.set('mien', enAttente('mien', 'u1'))
    await file.traiterFile()
    expect(envoyer).toHaveBeenCalledTimes(1)
    expect(base.pending.get('mien').status).toBe('done')
    expect(base.pending.get('a').status).toBe('waiting')
    expect(base.pending.get('a').audio).toBeDefined()
    expect((await file.dicteesDeLaListe('u1')).map((d) => d.id)).toEqual([])
    expect((await file.dicteesDeLaListe('u2')).map((d) => d.id)).toEqual(['a'])
    expect(await file.lireDicteeDe('a', 'u1')).toBeUndefined()
    expect((await file.lireDicteeDe('a', 'u2'))?.id).toBe('a')
  })

  it('« Réessayer » ne touche jamais la dictée d\'un autre', async () => {
    base.pending.set('a', enAttente('a', 'u2', { status: 'failed', attempts: 2, error: '503_ai_not_configured' }))
    await file.reessayer(['a'], 'u1')
    expect(base.pending.get('a').status).toBe('failed')
    expect(envoyer).not.toHaveBeenCalled()
  })
})

describe('appli fermée pendant le traitement', () => {
  it('« processing » depuis plus de 2 min : remise en attente même hors ligne, puis traitée une seule fois', async () => {
    base.pending.set('p', enAttente('p', 'u1', { status: 'processing', updatedAt: new Date(Date.now() - 3 * 60_000).toISOString() }))
    ;(navigator as any).onLine = false
    expect(await file.recupererTraitementsAbandonnes('u1')).toBe(1)
    expect(base.pending.get('p').status).toBe('waiting')
    expect(envoyer).not.toHaveBeenCalled()
    ;(navigator as any).onLine = true
    await file.traiterFile()
    await file.traiterFile()
    expect(envoyer).toHaveBeenCalledTimes(1)
    expect(enregistrer).toHaveBeenCalledTimes(1)
  })

  it('« processing » récent (autre onglet) laissé tel quel', async () => {
    base.pending.set('p', enAttente('p', 'u1', { status: 'processing' }))
    expect(await file.recupererTraitementsAbandonnes('u1')).toBe(0)
    expect(base.pending.get('p').status).toBe('processing')
  })

  it('un enregistrement commencé reprend avec les identifiants figés, jamais de nouveaux', async () => {
    const ids = [{ lineIndex: 0, transactionId: 'tx-fige', dictationRowId: 'tr-fige' }]
    base.pending.set('r', enAttente('r', 'u1', { status: 'needs_review', audio: undefined, result: RESULTAT_SUR, transactionIds: ids }))
    await file.traiterFile()
    // Frozen ids: the queue never re-saves it by itself, the recap finishes it with the same ids.
    expect(envoyer).not.toHaveBeenCalled()
    expect(enregistrer).not.toHaveBeenCalled()
    expect(base.pending.get('r').transactionIds).toEqual(ids)
  })
})

describe('session absente ou expirée', () => {
  it('dictée sans personne connectée : adoptée et traitée seulement par la dernière personne connectée', async () => {
    base.utilisateur = null
    base.pending.set('o', enAttente('o', '', { dernierUtilisateur: 'u1' }))
    await file.traiterFile()
    expect(envoyer).not.toHaveBeenCalled()
    expect(base.pending.get('o').status).toBe('waiting')
    base.utilisateur = 'u1'
    await file.traiterFile()
    expect(base.pending.get('o').userId).toBe('u1')
    expect(base.pending.get('o').dernierUtilisateur).toBeUndefined()
    expect(envoyer).toHaveBeenCalledTimes(1)
  })

  it("quelqu'un d'autre se connecte : jamais adoptée ni traitée, visible avec « Supprimer » seulement", async () => {
    base.pending.set('o', enAttente('o', '', { dernierUtilisateur: 'u1' }))
    base.utilisateur = 'u2'
    await file.traiterFile()
    expect(await file.adopterOrphelines('u2')).toBe(0)
    expect(envoyer).not.toHaveBeenCalled()
    expect(base.pending.get('o')).toMatchObject({ userId: '', status: 'waiting', dernierUtilisateur: 'u1' })
    expect(base.pending.get('o').audio).toBeDefined()
    expect((await file.orphelinesEtrangeres('u2')).map((d) => d.id)).toEqual(['o'])
    expect(await file.lireDicteeDe('o', 'u2')).toBeUndefined()
    // « Réessayer » cannot send it either.
    await file.reessayer(['o'], 'u2')
    expect(envoyer).not.toHaveBeenCalled()
    // The owner comes back: adopted and processed.
    base.utilisateur = 'u1'
    expect(await file.orphelinesEtrangeres('u1')).toEqual([])
    await file.traiterFile()
    expect(base.pending.get('o').userId).toBe('u1')
    expect(envoyer).toHaveBeenCalledTimes(1)
  })

  it('aucune personne connue sur ce téléphone : jamais adoptée', async () => {
    base.pending.set('o', enAttente('o', ''))
    await file.traiterFile()
    expect(envoyer).not.toHaveBeenCalled()
    expect(base.pending.get('o').userId).toBe('')
    expect((await file.orphelinesEtrangeres('u1')).map((d) => d.id)).toEqual(['o'])
  })

  it('401 : gardée en attente, aucun essai compté', async () => {
    envoyer.mockResolvedValue({ kind: 'session' })
    base.pending.set('s', enAttente('s', 'u1'))
    await file.traiterFile()
    expect(base.pending.get('s')).toMatchObject({ status: 'waiting', error: 'session', attempts: 0 })
    expect(base.pending.get('s').audio).toBeDefined()
  })
})

describe('échec puis « Réessayer »', () => {
  it('503 : carte en échec ; « Réessayer » relance tout de suite, sans attendre le délai', async () => {
    envoyer.mockResolvedValue({ kind: 'erreur', code: '503_ai_not_configured' })
    base.pending.set('f', enAttente('f', 'u1'))
    await file.traiterFile()
    expect(base.pending.get('f')).toMatchObject({ status: 'failed', attempts: 1, error: '503_ai_not_configured' })
    // Still inside the backoff window: an ordinary pass does nothing.
    await file.traiterFile()
    expect(envoyer).toHaveBeenCalledTimes(1)
    envoyer.mockResolvedValue({ kind: 'ok', result: RESULTAT_SUR })
    await file.reessayer(['f'], 'u1')
    expect(envoyer).toHaveBeenCalledTimes(2)
    expect(base.pending.get('f').status).toBe('done')
  })
})
