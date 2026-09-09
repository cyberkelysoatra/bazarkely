import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { analyserSms } from '../parseurOrangeMoney'
import { deciderEcriture, type LigneSms } from '../decisionEcriture'
import { identifiantTransactionSms, uuidV5 } from '../identifiantTransaction'
import { libelleFrais, libelleOperation, operateurDepuisExpediteur, TYPE_DE_COMPTE } from '../libelles'

const ICI = dirname(fileURLToPath(import.meta.url))

/**
 * Le corpus reel des 50 SMS, transforme en lignes `sms_inbox` : la reference
 * est celle que le parseur extrait (comme le fait l'ingestion serveur).
 */
function corpus(): LigneSms[] {
  const texte = readFileSync(resolve(ICI, 'corpus-50-sms.txt'), 'utf8')
  return texte
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== '')
    .map((texteBrut, index) => {
      const analyse = analyserSms(texteBrut)
      return {
        reference: analyse.reconnu ? analyse.reference : `NON-RECONNU-${index}`,
        texteBrut,
        etat: 'a_valider',
        expediteur: 'OrangeMoney'
      }
    })
}

describe('deciderEcriture — corpus des 50 SMS reels', () => {
  const lignes = corpus()
  const decision = deciderEcriture(lignes)

  it('traite les 50 SMS, chacun exactement une fois', () => {
    expect(lignes).toHaveLength(50)
    expect(decision.aEcrire.length + decision.ecartes.length).toBe(50)
  })

  it('ecarte tout SMS non reconnu ou dont le solde ne concorde pas', () => {
    for (const ecarte of decision.ecartes) {
      expect(['non reconnu', 'solde non concordant']).toContain(ecarte.motif)
      expect(ecarte.detail).not.toBe('')
    }
  })

  it('n ecrit que des operations completes et de sens connu', () => {
    for (const operation of decision.aEcrire) {
      expect(operation.modele).not.toBe('ECHEC')
      expect(['credit', 'debit']).toContain(operation.sens)
      expect(operation.montant).toBeGreaterThan(0)
      expect(operation.frais).toBeGreaterThanOrEqual(0)
      expect(Number.isFinite(operation.solde)).toBe(true)
      expect(operation.horodatage).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    }
  })

  it('chaque operation ecrite recolle EXACTEMENT au solde precedent', () => {
    // Recalcul independant : on rejoue la chaine et on verifie que chaque
    // operation retenue a bien un predecesseur qui la justifie au franc pres.
    const reconnues = lignes
      .map((ligne) => ({ ligne, analyse: analyserSms(ligne.texteBrut) }))
      .filter((entree) => entree.analyse.reconnu && entree.analyse.modele !== 'ECHEC')
      .map((entree) => entree.analyse as Extract<ReturnType<typeof analyserSms>, { reconnu: true }>)
      .sort((a, b) =>
        a.horodatage === b.horodatage
          ? a.reference < b.reference
            ? -1
            : 1
          : (a.horodatage ?? '') < (b.horodatage ?? '')
            ? -1
            : 1
      )

    const retenues = new Set(decision.aEcrire.map((operation) => operation.reference))

    for (let i = 1; i < reconnues.length; i++) {
      const courant = reconnues[i]
      const signe = courant.sens === 'credit' ? 1 : -1
      const attendu = (reconnues[i - 1].solde ?? 0) + signe * ((courant.montant ?? 0) + courant.frais)
      expect(retenues.has(courant.reference)).toBe(attendu === courant.solde)
    }

    // La toute premiere ligne n'a aucun predecesseur : sa concordance est
    // INDETERMINEE, pas fausse. Elle ancre la chaine et EST ecrite (v3.76.0),
    // sans quoi chaque rattrapage d'historique perdrait une operation reelle.
    expect(retenues.has(reconnues[0].reference)).toBe(true)
    expect(decision.ecartes.some((e) => e.reference === reconnues[0].reference)).toBe(false)
  })

  it('ne rejoue pas une ligne deja ecrite, mais la garde dans la chaine', () => {
    const dejaEcrites = lignes.map((ligne, index) =>
      index % 2 === 0 ? { ...ligne, etat: 'auto_ecrit' } : ligne
    )
    const seconde = deciderEcriture(dejaEcrites)

    // Meme verdict pour tout le monde : l'etat ne change pas la decision,
    // il ne sert qu'a filtrer ce qu'il reste a ecrire.
    expect(seconde.aEcrire.map((o) => o.reference).sort()).toEqual(
      decision.aEcrire.map((o) => o.reference).sort()
    )
    const restant = seconde.aEcrire.filter((o) => o.etat === 'a_valider')
    expect(restant.length).toBeLessThan(seconde.aEcrire.length)
  })

  it('bilan du corpus (AC7)', () => {
    const parMotif = decision.ecartes.reduce<Record<string, number>>((accumulateur, ecarte) => {
      accumulateur[ecarte.motif] = (accumulateur[ecarte.motif] ?? 0) + 1
      return accumulateur
    }, {})

    const avecFrais = decision.aEcrire.filter((operation) => operation.frais > 0).length
    const transactions = decision.aEcrire.length + avecFrais

    console.log('--- Corpus 50 SMS ---')
    console.log('operations ecrites      :', decision.aEcrire.length)
    console.log('dont avec frais         :', avecFrais)
    console.log('transactions creees     :', transactions)
    console.log('SMS ecartes             :', decision.ecartes.length, parMotif)
    for (const ecarte of decision.ecartes) {
      console.log(`  ${ecarte.reference} | ${ecarte.motif} | ${ecarte.detail}`)
    }

    expect(transactions).toBeGreaterThan(0)
  })
})

describe('identifiantTransactionSms — idempotence', () => {
  it('produit un UUID v5 valide', () => {
    const id = identifiantTransactionSms('user-1', 'CI260730.1122.D89206', 'principal')
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('donne le MEME identifiant a chaque rejeu', () => {
    const a = identifiantTransactionSms('user-1', 'CI260730.1122.D89206', 'principal')
    const b = identifiantTransactionSms('user-1', 'CI260730.1122.D89206', 'principal')
    expect(a).toBe(b)
  })

  it('separe le mouvement principal de la ligne de frais', () => {
    const principal = identifiantTransactionSms('user-1', 'CO260729.1038.C39365', 'principal')
    const frais = identifiantTransactionSms('user-1', 'CO260729.1038.C39365', 'frais')
    expect(principal).not.toBe(frais)
  })

  it('separe deux utilisateurs et deux references', () => {
    const reference = 'PP260730.0949.D63236'
    expect(identifiantTransactionSms('user-1', reference, 'principal')).not.toBe(
      identifiantTransactionSms('user-2', reference, 'principal')
    )
    expect(identifiantTransactionSms('user-1', reference, 'principal')).not.toBe(
      identifiantTransactionSms('user-1', 'PP260730.0949.D63237', 'principal')
    )
  })

  it('donne 50 identifiants distincts sur le corpus', () => {
    const identifiants = new Set(
      corpus().flatMap((ligne) => [
        identifiantTransactionSms('user-1', ligne.reference, 'principal'),
        identifiantTransactionSms('user-1', ligne.reference, 'frais')
      ])
    )
    expect(identifiants.size).toBe(100)
  })

  it('respecte le vecteur de reference RFC 4122 (namespace DNS, python.org)', () => {
    // Vecteur public de UUID v5 : verifie l implementation de SHA-1.
    expect(uuidV5('python.org', '6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(
      '886313e1-3b8a-5372-9b90-0c9aee199e5d'
    )
  })
})

describe('rattachement au bon operateur', () => {
  it('rattache Orange Money a un compte orange_money', () => {
    expect(TYPE_DE_COMPTE[operateurDepuisExpediteur('OrangeMoney')]).toBe('orange_money')
  })

  it('reconnait MVola et Airtel Money', () => {
    expect(TYPE_DE_COMPTE[operateurDepuisExpediteur('MVola')]).toBe('mvola')
    expect(TYPE_DE_COMPTE[operateurDepuisExpediteur('Airtel Money')]).toBe('airtel_money')
  })

  it('retombe sur Orange Money, jamais sur un compte bancaire', () => {
    const types = ['orange_money', 'mvola', 'airtel_money']
    for (const expediteur of [null, undefined, '', 'BMOI', 'inconnu']) {
      expect(types).toContain(TYPE_DE_COMPTE[operateurDepuisExpediteur(expediteur)])
    }
  })
})

describe('libelles', () => {
  it('distingue la ligne de frais du mouvement principal', () => {
    expect(libelleOperation('CO_RETRAIT', '0327376371')).toBe('Retrait aupres du 0327376371')
    expect(libelleFrais('CO_RETRAIT', '0327376371')).toBe('Frais - Retrait aupres du 0327376371')
  })
})
