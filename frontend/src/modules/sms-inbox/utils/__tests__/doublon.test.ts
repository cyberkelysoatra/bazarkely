/**
 * Tests de la garde anti-doublon. Fonction pure : aucune doublure necessaire.
 *
 * Le cas fondateur est reel : « Karate 3mois −92 400 » saisi a la main le
 * 05/09/2026, puis recree par le SMS PP260905.0925 (91 900 + 500 de frais).
 */

import { describe, expect, it } from 'vitest'

import { chercherDoublon, estIssueDunSms, jourLocal } from '../doublon'

/** L'operation portee par le SMS PP260905.0925.B08754. */
const KARATE = { horodatage: '2026-09-05T09:25:00+03:00', montant: 91900, frais: 500 }

describe('chercherDoublon', () => {
  it('reconnait une saisie manuelle au montant TOTAL (montant + frais)', () => {
    const manuelle = { id: 'm1', amount: -92400, date: '2026-09-05T10:00:00+03:00', notes: null }
    expect(chercherDoublon(KARATE, [manuelle])).toBe(manuelle)
  })

  it('reconnait aussi une saisie au montant SEUL, frais non saisis', () => {
    const manuelle = { id: 'm2', amount: -91900, date: '2026-09-05T10:00:00+03:00', notes: null }
    expect(chercherDoublon(KARATE, [manuelle])).toBe(manuelle)
  })

  it('ignore le sens : un doublon reste un doublon, dans le doute on n ecrit pas', () => {
    const manuelle = { id: 'm3', amount: 92400, date: '2026-09-05T10:00:00+03:00', notes: null }
    expect(chercherDoublon(KARATE, [manuelle])).toBe(manuelle)
  })

  it('ne retient pas une transaction issue d un SMS', () => {
    const auto = {
      id: 'a1',
      amount: -92400,
      date: '2026-09-05T09:25:00+03:00',
      notes: 'SMS PP260905.0925.B08754'
    }
    expect(chercherDoublon(KARATE, [auto])).toBeNull()
  })

  it('ne retient pas un montant identique un autre jour', () => {
    const veille = { id: 'v1', amount: -92400, date: '2026-09-04T09:25:00+03:00', notes: null }
    expect(chercherDoublon(KARATE, [veille])).toBeNull()
  })

  it('ne retient pas un montant different le meme jour', () => {
    const autre = { id: 'x1', amount: -92401, date: '2026-09-05T09:25:00+03:00', notes: null }
    expect(chercherDoublon(KARATE, [autre])).toBeNull()
  })

  it('n apparie une saisie manuelle qu a UNE SEULE operation', () => {
    const manuelle = { id: 'm4', amount: -92400, date: '2026-09-05T10:00:00+03:00', notes: null }
    const consommees = new Set<string>()

    const premier = chercherDoublon(KARATE, [manuelle], consommees)
    expect(premier).toBe(manuelle)
    consommees.add(premier!.id)

    // Une seconde operation jumelle le meme jour doit, elle, etre ecrite :
    // une seule saisie manuelle ne peut pas justifier deux SMS.
    expect(chercherDoublon(KARATE, [manuelle], consommees)).toBeNull()
  })

  it('accepte une date deja portee par un objet Date', () => {
    const manuelle = {
      id: 'm5',
      amount: -92400,
      date: new Date('2026-09-05T10:00:00+03:00'),
      notes: undefined
    }
    expect(chercherDoublon(KARATE, [manuelle])).toBe(manuelle)
  })
})

describe('estIssueDunSms', () => {
  it('distingue une ecriture automatique d une saisie libre', () => {
    expect(estIssueDunSms({ id: '1', amount: 0, date: new Date(), notes: 'SMS CI260730.1122' })).toBe(true)
    expect(estIssueDunSms({ id: '2', amount: 0, date: new Date(), notes: 'Karate 3mois' })).toBe(false)
    expect(estIssueDunSms({ id: '3', amount: 0, date: new Date(), notes: null })).toBe(false)
  })
})

describe('jourLocal', () => {
  it('compare le meme instant a l identique, quelle que soit sa forme', () => {
    const instant = '2026-09-05T10:00:00+03:00'
    expect(jourLocal(instant)).toBe(jourLocal(new Date(instant)))
  })

  it('ne rapproche pas deux instants separes de 24 h', () => {
    expect(jourLocal('2026-09-05T10:00:00+03:00')).not.toBe(jourLocal('2026-09-06T10:00:00+03:00'))
  })

  it('rend une chaine vide sur une date illisible, plutot que de lever', () => {
    expect(jourLocal('pas une date')).toBe('')
  })
})
