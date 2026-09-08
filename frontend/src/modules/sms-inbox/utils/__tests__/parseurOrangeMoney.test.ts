import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { analyserSms, type ModeleSms, type SmsAnalyse } from '../parseurOrangeMoney'
import { controlerChaine, type Maillon } from '../controleChaine'

const ICI = dirname(fileURLToPath(import.meta.url))

/** Le corpus est charge tel quel : espaces, accents et casse sont l'objet du test. */
const CORPUS: string[] = readFileSync(resolve(ICI, 'corpus-50-sms.txt'), 'utf8')
  .split(/\r?\n/)
  .filter(ligne => ligne.trim() !== '')

/** Repartition attendue, etablie sur le corpus reel du 29/07 au 06/09/2026. */
const REPARTITION_ATTENDUE: Record<ModeleSms, number> = {
  PP_ENVOI: 20,
  MP_MARCHAND: 13,
  CI_BANQUE: 10,
  CO_RETRAIT: 3,
  CI_DEPOT: 1,
  PP_NOMME: 1,
  MP_OFFRE: 1,
  ECHEC: 1
}

function analyserCorpus(): SmsAnalyse[] {
  return CORPUS.map((texte, i) => {
    const r = analyserSms(texte)
    if (!r.reconnu) throw new Error(`SMS ${i + 1} non reconnu (${r.raison}) : ${texte}`)
    return r
  })
}

/** Maillons ordonnes comme dans le fichier, c'est-a-dire par ordre d'arrivee. */
function maillonsOrdreArrivee(): Maillon[] {
  return analyserCorpus()
    .filter(a => a.solde !== null && a.horodatage !== null && a.sens !== 'aucun')
    .map(a => ({
      reference: a.reference,
      horodatage: a.horodatage as string,
      sens: a.sens as 'credit' | 'debit',
      montant: a.montant as number,
      frais: a.frais,
      solde: a.solde as number
    }))
}

describe('analyserSms — corpus de 50 SMS reels', () => {
  it('contient bien 50 SMS', () => {
    expect(CORPUS).toHaveLength(50)
  })

  it('reconnait les 50 SMS, aucun `reconnu: false`', () => {
    const echecs = CORPUS.map((texte, i) => ({ i, texte, r: analyserSms(texte) })).filter(
      x => !x.r.reconnu
    )
    expect(echecs.map(x => `#${x.i + 1} ${x.texte}`)).toEqual([])
  })

  it('repartit exactement les 50 SMS entre les 8 modeles', () => {
    const compte = {} as Record<ModeleSms, number>
    for (const a of analyserCorpus()) compte[a.modele] = (compte[a.modele] ?? 0) + 1
    expect(compte).toEqual(REPARTITION_ATTENDUE)
  })

  it('attribue une reference unique a chaque SMS', () => {
    const refs = analyserCorpus().map(a => a.reference)
    expect(new Set(refs).size).toBe(50)
  })

  it('date tous les SMS sauf ECHEC (reference sans horodatage)', () => {
    const sansDate = analyserCorpus().filter(a => a.horodatage === null)
    expect(sansDate.map(a => a.modele)).toEqual(['ECHEC'])
  })
})

describe('analyserSms — particularites de chaque modele', () => {
  const parModele = (m: ModeleSms) => analyserCorpus().filter(a => a.modele === m)

  it('CI_BANQUE : montant a decimales tronque, reference sans etiquette `Trans Id`', () => {
    const a = parModele('CI_BANQUE')[0]
    expect(a).toMatchObject({
      sens: 'credit',
      montant: 200000, // lu depuis « 200000.00 »
      frais: 0,
      solde: 269588,
      reference: 'CI260730.1122.D89206',
      horodatage: '2026-07-30T11:22:00+03:00'
    })
    // Le double espace de « BMOI Compte  vue » est reduit a un espace unique.
    expect(a.tiers).toBe('BMOI Compte vue M SOATRA')
  })

  it('CI_DEPOT : aucun champ Frais dans le SMS -> frais forces a 0', () => {
    const a = parModele('CI_DEPOT')[0]
    expect(a).toMatchObject({
      sens: 'credit',
      montant: 400000,
      frais: 0,
      solde: 400243,
      tiers: '0324813191',
      reference: 'CI260808.1220.D56174'
    })
  })

  it('PP_ENVOI : cas le plus frequent', () => {
    const a = parModele('PP_ENVOI')[0]
    expect(a).toMatchObject({
      sens: 'debit',
      montant: 61900,
      frais: 500,
      solde: 69588,
      tiers: '0326528126',
      reference: 'PP260730.0949.D63236',
      horodatage: '2026-07-30T09:49:00+03:00'
    })
  })

  it('PP_NOMME : reference sans date -> horodatage lu dans le champ `Date :`', () => {
    const a = parModele('PP_NOMME')[0]
    expect(a).toMatchObject({
      sens: 'debit',
      montant: 160000,
      frais: 3000,
      solde: 6418,
      reference: 'a7924941',
      horodatage: '2026-08-31T13:00:24+03:00'
    })
    expect(a.tiers).toBe('Faraniaina Elina (0345607200) : TNR/NOS')
  })

  it('CO_RETRAIT : les deux orthographes (aupres / auprès) donnent le meme modele', () => {
    const retraits = parModele('CO_RETRAIT')
    expect(retraits).toHaveLength(3)
    // Le 1er SMS du corpus est accentue, le dernier ne l'est pas.
    expect(retraits[0]).toMatchObject({
      montant: 60000,
      frais: 1900,
      solde: 131988,
      reference: 'CO260729.1038.C39365'
    })
    expect(retraits[2]).toMatchObject({
      montant: 160000,
      frais: 3400,
      solde: 13018,
      reference: 'CO260903.1636.A44780' // espace avant le point final
    })
  })

  it('MP_MARCHAND : espace avant le point final apres la reference', () => {
    const a = parModele('MP_MARCHAND')[0]
    expect(a).toMatchObject({
      sens: 'debit',
      montant: 2000,
      frais: 0,
      solde: 172088,
      tiers: 'REVE DOR',
      reference: 'MP260730.1242.D23906'
    })
  })

  it('MP_OFFRE : aucun champ Frais, « 30000Ar » colle, « Trans id » minuscule', () => {
    const a = parModele('MP_OFFRE')[0]
    expect(a).toMatchObject({
      sens: 'debit',
      montant: 30000,
      frais: 0,
      solde: 176418,
      tiers: 'Orange Be connect 5Go',
      reference: 'MP260903.1159.D16200'
    })
  })

  it('ECHEC : ni montant, ni solde, ni frais, aucun sens', () => {
    const a = parModele('ECHEC')[0]
    expect(a).toMatchObject({
      sens: 'aucun',
      montant: null,
      frais: 0,
      solde: null,
      reference: 'OR260903ZQO043',
      horodatage: null
    })
  })
})

describe('analyserSms — normalisation', () => {
  const REF = CORPUS[1] // PP_ENVOI

  it('resiste a la casse, aux accents et aux espaces multiples', () => {
    const attendu = analyserSms(REF)
    const maltraite = REF.toUpperCase()
      .replace(/REUSSI/g, 'RÉUSSI')
      .replace(/ /g, '   ')
    expect(analyserSms(maltraite)).toEqual(attendu)
  })

  it('refuse un texte inconnu sans lever d exception', () => {
    expect(analyserSms('Bonjour, votre forfait expire demain.')).toEqual({
      reconnu: false,
      raison: 'aucun modele ne correspond'
    })
  })

  it('refuse un texte vide', () => {
    expect(analyserSms('   ')).toMatchObject({ reconnu: false })
  })
})

describe('controlerChaine — corpus de 50 SMS', () => {
  it('verifie 48 maillons et ne trouve aucune rupture', () => {
    const maillons = maillonsOrdreArrivee()
    // 50 SMS - 1 ECHEC (sans solde) = 49 maillons, donc 48 liens a verifier.
    expect(maillons).toHaveLength(49)

    const resultat = controlerChaine(maillons)
    expect(resultat.ruptures).toEqual([])
    expect(resultat.verifies).toBe(48)
  })

  it('trie par horodatage et non par ordre d arrivee (CI260821.1510 avant PP260821.1512)', () => {
    const maillons = maillonsOrdreArrivee()
    const iCi = maillons.findIndex(m => m.reference === 'CI260821.1510.B53175')
    const iPp = maillons.findIndex(m => m.reference === 'PP260821.1512.C18172')
    // Dans le fichier, le PP arrive AVANT le CI...
    expect(iPp).toBeLessThan(iCi)
    // ...alors que la transaction du CI precede celle du PP.
    const ci = maillons[iCi]
    const pp = maillons[iPp]
    expect(ci.horodatage < pp.horodatage).toBe(true)
  })

  it('reste insensible a l ordre dans lequel les SMS sont fournis', () => {
    const maillons = maillonsOrdreArrivee()
    const melanges = [...maillons].reverse()
    expect(controlerChaine(melanges)).toEqual(controlerChaine(maillons))
  })

  it('signale une rupture quand un maillon manque', () => {
    const maillons = maillonsOrdreArrivee().filter(
      m => m.reference !== 'PP260803.2059.D33994'
    )
    const resultat = controlerChaine(maillons)
    expect(resultat.ruptures).toHaveLength(1)
    expect(resultat.ruptures[0]).toMatchObject({
      reference: 'CI260804.1334.D30976',
      // Le debit retire n a pas ete deduit : le solde annonce est en dessous
      // de l attendu, de son montant + ses frais.
      ecart: -14675
    })
  })
})

describe('controlerChaine — test de mutation sur le tri', () => {
  /**
   * Meme calcul que controlerChaine, mais SANS tri : la mutation consiste a
   * faire confiance a l ordre d arrivee. Ce test echoue (ruptures non vides)
   * tant que le corpus contient des SMS delivres dans le desordre. S il venait
   * a passer, c est que le tri par horodatage de reference n est plus exige.
   */
  function controlerParOrdreArrivee(maillons: Maillon[]) {
    const ruptures: string[] = []
    let precedent = maillons[0].solde
    for (let i = 1; i < maillons.length; i++) {
      const m = maillons[i]
      const attendu = precedent + (m.montant + m.frais) * (m.sens === 'credit' ? 1 : -1)
      if (attendu !== m.solde) ruptures.push(m.reference)
      precedent = m.solde
    }
    return ruptures
  }

  it('le tri par ordre d arrivee casse la chaine, le tri par horodatage la repare', () => {
    const maillons = maillonsOrdreArrivee()

    const mutant = controlerParOrdreArrivee(maillons)
    expect(mutant.length).toBeGreaterThan(0)
    expect(mutant).toContain('PP260821.1512.C18172')

    expect(controlerChaine(maillons).ruptures).toEqual([])
  })
})
