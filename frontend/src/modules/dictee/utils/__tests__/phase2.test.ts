/** DICTEE-CC-02: doubts by kind, account sheet, badge counts, list texts, queue states. */
import { describe, expect, it } from 'vitest'
import type { DicteeItem, PendingDictation } from '../../types'
import { comptesCandidats, deciderDictee } from '../decision'
import { doutesDe, doutesHorsCompte, typeDoutTexte } from '../doutes'
import { ordonnerAvecCandidats } from '../comptePrefere'
import { estAudioAncien, estEligible, estTraitementAbandonne, versEchec, versNouvelEssai } from '../etatFile'
import { libelleEssais, libelleStatut, raisonEchec } from '../libelles'
import { compterParStatut, libelleBadge } from '../compteurs'
import { estOrphelineEtrangere, peutAdopter } from '../proprietaire'

const COMPTES = ['cash1', 'cash2', 'om']

const ligne = (p: Partial<DicteeItem> = {}): DicteeItem => ({
  type: 'expense',
  amount: 3000,
  currency: 'MGA',
  description: 'Taxi',
  category: 'transport',
  accountId: null,
  targetAccountId: null,
  date: '2026-10-28T19:00:00+03:00',
  confidence: 0.95,
  doubts: [],
  ...p
})

const dictee = (p: Partial<PendingDictation> = {}): PendingDictation => ({
  id: 'd',
  userId: 'u1',
  recordedAt: '2026-10-28T20:00:00+03:00',
  mime: 'audio/webm',
  durationMs: 4000,
  status: 'waiting',
  attempts: 0,
  updatedAt: '2026-10-28T17:00:00.000Z',
  ...p
})

describe('doutes typés', () => {
  it('un doute qui ne porte que sur le compte = feuille des comptes, pas le récapitulatif', () => {
    const d = deciderDictee([ligne({ doubts: [{ kind: 'compte', text: 'Compte non précisé' }] })], COMPTES)
    expect(d).toEqual({ kind: 'account', lineIndexes: [0] })
  })

  it('un doute compte + un doute montant = récapitulatif', () => {
    const l = ligne({ doubts: [{ kind: 'compte', text: 'Compte non précisé' }, { kind: 'montant', text: 'Montant dit en francs' }] })
    expect(deciderDictee([l], COMPTES).kind).toBe('review')
  })

  it('compte nommé mais doute sur le compte = la feuille redemande', () => {
    const l = ligne({ accountId: 'om', doubts: [{ kind: 'compte', text: 'Orange Money probable' }] })
    expect(deciderDictee([l], COMPTES)).toEqual({ kind: 'account', lineIndexes: [0] })
  })

  it('ancien format (phrases de la phase 1) toujours lu', () => {
    // Exact doubts seen in production on 2026-10-28.
    expect(typeDoutTexte('Compte non précisé pour l\'achat de pain')).toBe('compte')
    expect(typeDoutTexte('Plusieurs comptes espèces possibles, compte exact non identifié')).toBe('compte')
    expect(typeDoutTexte("Compte d'arrivée non reconnu, à choisir")).toBe('compte')
    expect(typeDoutTexte('Montant dit en francs, à vérifier')).toBe('autre')
    expect(typeDoutTexte("Terme exact 're-rola' à vérifier")).toBe('autre')
    const ancienne = ligne({ doubts: ['Compte non précisé pour l\'achat de pain'] })
    expect(doutesDe(ancienne)).toEqual([{ kind: 'compte', text: 'Compte non précisé pour l\'achat de pain' }])
    expect(deciderDictee([ancienne], COMPTES).kind).toBe('account')
    expect(deciderDictee([ligne({ doubts: ['Montant dit en francs, à vérifier'] })], COMPTES).kind).toBe('review')
  })

  it('doutes vides, mal formés ou d\'un type inconnu', () => {
    expect(doutesDe(ligne({ doubts: ['  ', { kind: 'montant', text: '' } as any, null as any] }))).toEqual([])
    expect(doutesDe(ligne({ doubts: [{ kind: 'bizarre', text: 'x' } as any] }))).toEqual([{ kind: 'autre', text: 'x' }])
    expect(doutesHorsCompte(ligne({ doubts: [{ kind: 'compte', text: 'a' }] }))).toEqual([])
  })
})

describe('compte ambigu : comptes correspondants en tête de la feuille', () => {
  it('candidats encore existants, dans l\'ordre de l\'IA, sans doublon', () => {
    const items = [ligne({ accountCandidates: ['cash2', 'cash1', 'disparu'] }), ligne({ accountCandidates: ['cash1'] })]
    expect(comptesCandidats(items, [0, 1], COMPTES)).toEqual(['cash2', 'cash1'])
  })

  it('ordre de la feuille : candidats (préféré d\'abord) puis le reste', () => {
    const comptes = [{ id: 'om' }, { id: 'cash1' }, { id: 'bank' }, { id: 'cash2' }]
    expect(ordonnerAvecCandidats(comptes, ['cash1', 'cash2'], 'cash2').map((c) => c.id)).toEqual(['cash2', 'cash1', 'om', 'bank'])
    expect(ordonnerAvecCandidats(comptes, [], 'bank').map((c) => c.id)).toEqual(['bank', 'om', 'cash1', 'cash2'])
  })
})

describe('badge : décompte par statut', () => {
  const file = [
    dictee({ id: '1', status: 'waiting' }),
    dictee({ id: '2', status: 'processing' }),
    dictee({ id: '3', status: 'needs_review' }),
    dictee({ id: '4', status: 'failed' }),
    dictee({ id: '5', status: 'done' }),
    dictee({ id: '6', status: 'waiting', userId: 'autre' }),
    dictee({ id: '7', status: 'failed', userId: 'autre' })
  ]

  it('waiting + processing + needs_review + failed, jamais done, jamais un autre utilisateur', () => {
    expect(compterParStatut(file, 'u1')).toEqual({ waiting: 1, processing: 1, needs_review: 1, failed: 1, total: 4, aVerifier: 2 })
    expect(compterParStatut(file, 'autre').total).toBe(2)
    expect(compterParStatut(file, null).total).toBe(0)
    expect(compterParStatut([], 'u1').total).toBe(0)
  })

  it('texte lu par le lecteur d\'écran', () => {
    expect(libelleBadge({ total: 2, aVerifier: 1 })).toBe('2 dictées en attente, dont 1 à vérifier')
    expect(libelleBadge({ total: 1, aVerifier: 0 })).toBe('1 dictée en attente')
    expect(libelleBadge({ total: 3, aVerifier: 3 })).toBe('3 dictées en attente, dont 3 à vérifier')
  })
})

describe('textes de la liste', () => {
  it('statuts en français simple', () => {
    expect(libelleStatut('waiting')).toBe('En attente du réseau')
    expect(libelleStatut('waiting', 'session')).toBe('Session expirée, reconnecte-toi')
    expect(libelleStatut('processing')).toBe('En cours…')
    expect(libelleStatut('needs_review')).toBe('À vérifier')
  })

  it('raisons d\'échec', () => {
    expect(raisonEchec('503_ai_not_configured')).toBe('Service de compréhension indisponible')
    expect(raisonEchec('502_ai_quota')).toBe('Service de compréhension indisponible')
    expect(raisonEchec('504_ai_timeout')).toBe('Service de compréhension indisponible')
    expect(raisonEchec('reseau')).toBe('Service de compréhension indisponible')
    expect(raisonEchec('413_audio_too_large')).toBe('Enregistrement trop long')
    expect(raisonEchec('session')).toBe('Session expirée, reconnecte-toi')
    expect(libelleStatut('failed', '413_audio_too_large')).toBe('Enregistrement trop long')
    expect(libelleEssais(1)).toBe('1 essai')
    expect(libelleEssais(3)).toBe('3 essais')
  })

  it('aucun tiret cadratin dans les textes', () => {
    const textes = [libelleStatut('waiting'), libelleStatut('processing'), raisonEchec('x'), raisonEchec('413'), libelleBadge({ total: 2, aVerifier: 1 })]
    for (const t of textes) expect(t).not.toContain(String.fromCharCode(0x2014))
  })
})

describe('file : reprise et réessai', () => {
  const maintenant = Date.parse('2026-10-28T17:10:00.000Z')

  it('« processing » depuis plus de 2 min = abandonnée, depuis moins = peut-être un autre onglet', () => {
    expect(estTraitementAbandonne(dictee({ status: 'processing', updatedAt: '2026-10-28T17:07:00.000Z' }), maintenant)).toBe(true)
    expect(estTraitementAbandonne(dictee({ status: 'processing', updatedAt: '2026-10-28T17:09:00.000Z' }), maintenant)).toBe(false)
    expect(estTraitementAbandonne(dictee({ status: 'waiting', updatedAt: '2026-10-28T10:00:00.000Z' }), maintenant)).toBe(false)
  })

  it('« Réessayer » remet tout de suite en file, sans attendre le délai, essais gardés', () => {
    const echec = versEchec(dictee({ attempts: 4 }), '503_ai_not_configured', maintenant)
    expect(estEligible(echec, maintenant + 1000)).toBe(false)
    const relance = versNouvelEssai(echec, maintenant + 1000)
    expect(relance.status).toBe('waiting')
    expect(relance.attempts).toBe(5)
    expect(relance.error).toBeUndefined()
    expect(estEligible(relance, maintenant + 1000)).toBe(true)
  })

  it('audio de plus de 30 jours signalé, jamais pour une dictée sans audio', () => {
    const audio = new Blob(['x'])
    expect(estAudioAncien(dictee({ audio, recordedAt: '2026-09-20T10:00:00+03:00' }), maintenant)).toBe(true)
    expect(estAudioAncien(dictee({ audio, recordedAt: '2026-10-20T10:00:00+03:00' }), maintenant)).toBe(false)
    expect(estAudioAncien(dictee({ recordedAt: '2026-09-20T10:00:00+03:00' }), maintenant)).toBe(false)
  })
})

describe('dictée faite sans personne connectée', () => {
  it("seule la dernière personne connectée sur ce téléphone peut l'adopter", () => {
    expect(peutAdopter({ userId: '', dernierUtilisateur: 'u1' }, 'u1')).toBe(true)
    expect(peutAdopter({ userId: '', dernierUtilisateur: 'u1' }, 'u2')).toBe(false)
    expect(peutAdopter({ userId: '', dernierUtilisateur: undefined }, 'u1')).toBe(false)
    expect(peutAdopter({ userId: '', dernierUtilisateur: 'u1' }, null)).toBe(false)
    expect(peutAdopter({ userId: 'u3', dernierUtilisateur: 'u1' }, 'u1')).toBe(false)
  })

  it('pour les autres : affichée à part (« Supprimer » seulement), jamais comptée au badge', () => {
    expect(estOrphelineEtrangere({ userId: '', dernierUtilisateur: 'u1', status: 'waiting' }, 'u2')).toBe(true)
    expect(estOrphelineEtrangere({ userId: '', dernierUtilisateur: 'u1', status: 'waiting' }, 'u1')).toBe(false)
    expect(compterParStatut([dictee({ userId: '', status: 'waiting' })], 'u2').total).toBe(0)
  })
})
