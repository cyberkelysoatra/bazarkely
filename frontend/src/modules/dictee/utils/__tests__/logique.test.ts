import { describe, expect, it } from 'vitest'
import type { DicteeItem, PendingDictation } from '../../types'
import { deciderDictee, ligneEnregistrable, ligneSure } from '../decision'
import { categorieDominante, comptePrefere, ordonnerComptes } from '../comptePrefere'
import { encoderWav } from '../wav'
import {
  delaiAvantNouvelEssai,
  estAPurger,
  estEligible,
  prochaineDictee,
  TENTATIVES_MAX,
  versAnalysee,
  versAttenteSession,
  versEchec,
  versTerminee,
  versTraitement
} from '../etatFile'
import { planifierIdentifiants } from '../plan'
import { dateTransactionDepuisIso, isoDepuisChampDate, valeurChampDate } from '../dates'
import { formaterMontant, libelleAttente, messageEnregistre } from '../libelles'

const COMPTES = ['cash', 'om', 'mvola']

const ligne = (p: Partial<DicteeItem> = {}): DicteeItem => ({
  type: 'expense',
  amount: 5000,
  currency: 'MGA',
  description: 'Taxi',
  category: 'transport',
  accountId: 'cash',
  targetAccountId: null,
  date: '2026-10-28T19:00:00+03:00',
  confidence: 0.95,
  doubts: [],
  ...p
})

describe('décision sûr / doute', () => {
  it('ligne complète et confiante = sûre, enregistrée directement', () => {
    expect(ligneSure(ligne(), new Set(COMPTES))).toBe(true)
    expect(deciderDictee([ligne()], COMPTES)).toEqual({ kind: 'sure' })
  })

  it('confiance sous 0,85 = doute', () => {
    expect(deciderDictee([ligne({ confidence: 0.84 })], COMPTES).kind).toBe('review')
    expect(deciderDictee([ligne({ confidence: 0.85 })], COMPTES).kind).toBe('sure')
  })

  it('montant nul, doute signalé ou catégorie absente = doute', () => {
    expect(deciderDictee([ligne({ amount: 0 })], COMPTES).kind).toBe('review')
    expect(deciderDictee([ligne({ doubts: ['Montant dit en francs'] })], COMPTES).kind).toBe('review')
    expect(deciderDictee([ligne({ category: null })], COMPTES).kind).toBe('review')
    expect(deciderDictee([ligne({ type: 'income', category: null })], COMPTES).kind).toBe('review')
  })

  it('compte non dit sur des lignes sûres = feuille des comptes, une seule fois', () => {
    const d = deciderDictee([ligne({ accountId: null }), ligne({ description: 'Pain', category: 'alimentation' }), ligne({ accountId: null })], COMPTES)
    expect(d).toEqual({ kind: 'account', lineIndexes: [0, 2] })
  })

  it('compte disparu depuis la compréhension = compte manquant, la feuille (DICTEE-CC-02)', () => {
    // The server never sends an unknown id: an unknown one is an account deleted since.
    expect(deciderDictee([ligne({ accountId: 'inexistant' })], COMPTES)).toEqual({ kind: 'account', lineIndexes: [0] })
  })

  it('transfert : les deux comptes requis, sinon récapitulatif', () => {
    const t = ligne({ type: 'transfer', category: null, accountId: 'om', targetAccountId: 'cash' })
    expect(deciderDictee([t], COMPTES).kind).toBe('sure')
    expect(deciderDictee([{ ...t, targetAccountId: null }], COMPTES).kind).toBe('review')
    expect(deciderDictee([{ ...t, targetAccountId: 'om' }], COMPTES).kind).toBe('review')
  })

  it('plusieurs lignes dont une en doute = un seul récapitulatif', () => {
    expect(deciderDictee([ligne(), ligne({ confidence: 0.5 }), ligne()], COMPTES).kind).toBe('review')
  })

  it('aucune ligne = vide', () => {
    expect(deciderDictee([], COMPTES).kind).toBe('empty')
  })

  it('le récapitulatif n\'enregistre qu\'une ligne complète', () => {
    const ids = new Set(COMPTES)
    expect(ligneEnregistrable(ligne({ confidence: 0.1, doubts: ['x'] }), ids)).toBe(true)
    expect(ligneEnregistrable(ligne({ accountId: null }), ids)).toBe(false)
    expect(ligneEnregistrable(ligne({ amount: 0 }), ids)).toBe(false)
  })
})

describe('compte préféré par catégorie', () => {
  const comptes = [
    { id: 'cash', isDefault: false },
    { id: 'om', isDefault: true },
    { id: 'mvola', isDefault: false }
  ]
  const now = new Date('2026-10-28T12:00:00Z')
  const tx = (accountId: string, category: any, joursAvant: number, type: any = 'expense') => ({
    accountId,
    category,
    type,
    date: new Date(now.getTime() - joursAvant * 86_400_000)
  })

  it('le compte le plus utilisé pour la catégorie sur 90 jours passe en premier', () => {
    const t = [tx('mvola', 'transport', 3), tx('cash', 'transport', 2), tx('cash', 'transport', 10), tx('om', 'alimentation', 1)]
    expect(comptePrefere(comptes, t, 'transport', now)).toBe('cash')
  })

  it('les transactions de plus de 90 jours et les transferts ne comptent pas', () => {
    const t = [tx('mvola', 'transport', 120), tx('mvola', 'transport', 100), tx('cash', 'transport', 5, 'transfer'), tx('mvola', 'transport', 95)]
    expect(comptePrefere(comptes, t, 'transport', now)).toBe('om')
  })

  it('égalité : le plus récent gagne', () => {
    const t = [tx('mvola', 'transport', 1), tx('cash', 'transport', 4)]
    expect(comptePrefere(comptes, t, 'transport', now)).toBe('mvola')
  })

  it('repli : compte par défaut, puis premier compte', () => {
    expect(comptePrefere(comptes, [], 'transport', now)).toBe('om')
    expect(comptePrefere([{ id: 'a', isDefault: false }, { id: 'b', isDefault: false }], [], null, now)).toBe('a')
    expect(comptePrefere([], [], 'transport', now)).toBeNull()
  })

  it('ordonne la feuille et choisit la catégorie dominante', () => {
    expect(ordonnerComptes([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 'c').map((c) => c.id)).toEqual(['c', 'a', 'b'])
    expect(categorieDominante(['transport', 'alimentation', 'transport', null])).toBe('transport')
    expect(categorieDominante([null])).toBeNull()
  })
})

describe('conversion WAV 16 kHz mono', () => {
  it('en-tête RIFF/WAVE PCM 16 bits mono 16 000 Hz exact', () => {
    const tampon = encoderWav(new Float32Array([0, 1, -1, 0.5]), 16000)
    const v = new DataView(tampon)
    const texte = (pos: number) => String.fromCharCode(...new Uint8Array(tampon, pos, 4))
    expect(tampon.byteLength).toBe(44 + 8)
    expect(texte(0)).toBe('RIFF')
    expect(v.getUint32(4, true)).toBe(36 + 8)
    expect(texte(8)).toBe('WAVE')
    expect(texte(12)).toBe('fmt ')
    expect(v.getUint32(16, true)).toBe(16)
    expect(v.getUint16(20, true)).toBe(1) // PCM
    expect(v.getUint16(22, true)).toBe(1) // mono
    expect(v.getUint32(24, true)).toBe(16000)
    expect(v.getUint32(28, true)).toBe(32000)
    expect(v.getUint16(32, true)).toBe(2)
    expect(v.getUint16(34, true)).toBe(16)
    expect(texte(36)).toBe('data')
    expect(v.getUint32(40, true)).toBe(8)
    expect([v.getInt16(44, true), v.getInt16(46, true), v.getInt16(48, true), v.getInt16(50, true)]).toEqual([0, 32767, -32768, 16383])
  })

  it('écrête les valeurs hors de [-1, 1]', () => {
    const v = new DataView(encoderWav(new Float32Array([2, -3])))
    expect([v.getInt16(44, true), v.getInt16(46, true)]).toEqual([32767, -32768])
  })
})

describe('file : machine à états', () => {
  const base: PendingDictation = {
    id: 'd1',
    userId: 'u1',
    recordedAt: '2026-10-28T19:00:00+03:00',
    audio: new Blob(['x']),
    mime: 'audio/webm',
    durationMs: 3000,
    status: 'waiting',
    attempts: 0,
    updatedAt: '2026-10-28T16:00:00.000Z'
  }
  const t0 = new Date('2026-10-28T16:00:00.000Z').getTime()

  it('waiting → processing → needs_review : audio effacé, résultat gardé', () => {
    const p = versTraitement(base, t0)
    expect(p.status).toBe('processing')
    const a = versAnalysee(p, { transcript: 'taxi', items: [ligne()] }, t0)
    expect(a.status).toBe('needs_review')
    expect(a.audio).toBeUndefined()
    expect(a.result?.transcript).toBe('taxi')
  })

  it('needs_review → done : ne garde que id, statut et identifiants', () => {
    const a = versAnalysee(base, { transcript: 'taxi', items: [ligne()] }, t0)
    const fige = { ...a, lignesFinales: [{ item: ligne(), origine: 0 }], transactionIds: planifierIdentifiants(['expense'], undefined) }
    const d = versTerminee(fige, [fige.transactionIds[0].transactionId], t0)
    expect(d.status).toBe('done')
    expect(d.result).toBeUndefined()
    expect(d.lignesFinales).toBeUndefined()
    expect(d.audio).toBeUndefined()
    expect(d.createdTransactionIds).toEqual([fige.transactionIds[0].transactionId])
    expect(estAPurger(d, t0 + 6 * 86_400_000)).toBe(false)
    expect(estAPurger(d, t0 + 8 * 86_400_000)).toBe(true)
  })

  it('401 → waiting sans compter de tentative ; erreur → failed avec tentative + 1', () => {
    expect(versAttenteSession(versTraitement(base, t0), t0)).toMatchObject({ status: 'waiting', attempts: 0, audio: base.audio })
    const f = versEchec(versTraitement(base, t0), '502_ai_http_error', t0)
    expect(f).toMatchObject({ status: 'failed', attempts: 1, audio: base.audio })
  })

  it('failed : réessai après attente croissante, jamais au-delà de 5 tentatives', () => {
    const f = versEchec(base, 'reseau', t0)
    expect(estEligible(f, t0 + 10_000)).toBe(false)
    expect(estEligible(f, t0 + delaiAvantNouvelEssai(1))).toBe(true)
    expect(delaiAvantNouvelEssai(3)).toBe(4 * delaiAvantNouvelEssai(1))
    expect(estEligible({ ...f, attempts: TENTATIVES_MAX }, t0 + 10 * 86_400_000)).toBe(false)
  })

  it('la plus ancienne dictée éligible passe en premier, une seule à la fois', () => {
    const file = [
      { ...base, id: 'b', recordedAt: '2026-10-28T19:05:00+03:00' },
      { ...base, id: 'a', recordedAt: '2026-10-28T19:01:00+03:00' },
      { ...base, id: 'c', recordedAt: '2026-10-28T18:00:00+03:00', status: 'needs_review' as const }
    ]
    expect(prochaineDictee(file, t0)?.id).toBe('a')
    expect(prochaineDictee([], t0)).toBeNull()
  })

  it('rejeu : les identifiants stockés ne sont jamais régénérés', () => {
    let n = 0
    const gen = () => `id-${++n}`
    const plan1 = planifierIdentifiants(['expense', 'transfer'], undefined, gen)
    expect(plan1[1].targetTransactionId).toBeDefined()
    const plan2 = planifierIdentifiants(['expense', 'transfer'], plan1, gen)
    expect(plan2).toEqual(plan1)
    // A line turned into a transfer gets its extra ids once, the others stay.
    const plan3 = planifierIdentifiants(['transfer', 'transfer'], plan1, gen)
    expect(plan3[0].transactionId).toBe(plan1[0].transactionId)
    expect(plan3[0].targetTransactionId).toBeDefined()
    expect(planifierIdentifiants(['transfer', 'transfer'], plan3, gen)).toEqual(plan3)
  })
})

describe('dates et libellés', () => {
  it('garde le moment dit quand le jour UTC est le même que le jour malgache', () => {
    expect(dateTransactionDepuisIso('2026-10-28T19:30:00+03:00').toISOString()).toBe('2026-10-28T16:30:00.000Z')
  })

  it('01 h du matin à Antananarivo reste le bon jour une fois coupé en date', () => {
    const d = dateTransactionDepuisIso('2026-10-29T01:00:00+03:00')
    expect(d.toISOString().slice(0, 10)).toBe('2026-10-29')
  })

  it('champ date du récapitulatif : aller-retour sans changer l\'heure', () => {
    expect(valeurChampDate('2026-10-29T01:00:00+03:00')).toBe('2026-10-29')
    expect(isoDepuisChampDate('2026-10-27', '2026-10-29T01:00:00+03:00')).toBe('2026-10-27T01:00:00+03:00')
  })

  it('messages en français simple', () => {
    expect(formaterMontant(5000, 'MGA')).toBe('5 000 Ar')
    expect(formaterMontant(12.5, 'EUR')).toBe('12,5 €')
    const nom = (id: string | null) => (id === 'cash' ? 'Espèces' : 'compte')
    expect(messageEnregistre([ligne()], nom)).toBe('Taxi, 5 000 Ar, Espèces : enregistré')
    expect(messageEnregistre([ligne(), ligne({ amount: 2000 }), ligne({ amount: 1000 })], nom)).toBe('3 transactions enregistrées, 8 000 Ar')
    expect(libelleAttente(1)).toBe('1 dictée en attente')
    expect(libelleAttente(2)).toBe('2 dictées en attente')
  })
})
