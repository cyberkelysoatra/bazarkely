/**
 * Test d'integration de l'ecriture automatique, bout en bout, sur le corpus
 * reel des 50 SMS : file `sms_inbox` -> decision -> transactions.
 *
 * Les collaborateurs (base locale, services, Supabase) sont remplaces par des
 * doublures en memoire ; la logique testee — decision, rattachement du compte,
 * signe des montants, ligne de frais distincte, idempotence du rejeu — est la
 * VRAIE, celle qui tourne en production.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { analyserSms } from '../../utils/parseurOrangeMoney'

const ICI = dirname(fileURLToPath(import.meta.url))

interface LigneInbox {
  reference: string
  texte_brut: string
  etat: string
  expediteur: string | null
  transaction_id?: string | null
  traite_le?: string | null
}

interface TransactionEcrite {
  id: string
  userId: string
  accountId: string
  type: string
  amount: number
  description: string
  category: string
  date: Date
  notes?: string
}

interface CompteCree {
  id: string
  userId: string
  name: string
  type: string
  balance: number
}

/** Etat partage entre les doublures et les assertions. */
const monde = {
  userId: 'utilisateur-test',
  inbox: [] as LigneInbox[],
  transactions: new Map<string, TransactionEcrite>(),
  comptes: [] as CompteCree[],
  comptesCrees: 0
}

function chargerCorpusDansInbox(): void {
  const texte = readFileSync(resolve(ICI, '../../utils/__tests__/corpus-50-sms.txt'), 'utf8')
  monde.inbox = texte
    .split('\n')
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== '')
    .map((texteBrut, index) => {
      const analyse = analyserSms(texteBrut)
      return {
        reference: analyse.reconnu ? analyse.reference : `NON-RECONNU-${index}`,
        texte_brut: texteBrut,
        etat: 'a_valider',
        expediteur: 'OrangeMoney',
        transaction_id: null,
        traite_le: null
      }
    })
}

/** Constructeur de requete Supabase minimal : chainable ET attendable. */
function requete(resultat: () => { data: unknown; error: unknown }, effet?: () => void) {
  const objet: any = {
    select: () => objet,
    eq: () => objet,
    update: (valeurs: Record<string, unknown>) => {
      objet._valeurs = valeurs
      return objet
    },
    then: (resoudre: (v: unknown) => unknown) => {
      effet?.()
      return Promise.resolve(resultat()).then(resoudre)
    }
  }
  return objet
}

vi.mock('../../../../lib/supabase', () => ({
  withTimeout: <T,>(promesse: Promise<T>) => promesse,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: monde.userId } } } })
    },
    from: (table: string) => {
      if (table !== 'sms_inbox') throw new Error(`table inattendue: ${table}`)
      const objet: any = {
        select: () => ({
          eq: () => requete(() => ({ data: monde.inbox, error: null }))
        }),
        update: (valeurs: Record<string, unknown>) => {
          let reference: string | null = null
          const chaine: any = {
            eq: (colonne: string, valeur: string) => {
              if (colonne === 'reference') reference = valeur
              return chaine
            },
            then: (resoudre: (v: unknown) => unknown) => {
              const ligne = monde.inbox.find((l) => l.reference === reference)
              if (ligne) Object.assign(ligne, valeurs)
              return Promise.resolve({ data: null, error: null }).then(resoudre)
            }
          }
          return chaine
        }
      }
      return objet
    }
  }
}))

vi.mock('../../../../lib/database', () => ({
  db: {
    accounts: {
      where: () => ({
        equals: () => ({ toArray: async () => monde.comptes })
      })
    },
    transactions: {
      get: async (id: string) => monde.transactions.get(id)
    }
  }
}))

vi.mock('../../../../stores/appStore', () => ({
  useAppStore: { getState: () => ({ user: null }) }
}))

vi.mock('../../../../services/accountService', () => ({
  default: {
    createAccount: async (userId: string, donnees: any) => {
      monde.comptesCrees++
      const compte = { id: `compte-${monde.comptesCrees}`, userId, ...donnees }
      monde.comptes.push(compte)
      return compte
    }
  }
}))

vi.mock('../../../../services/transactionService', () => ({
  default: {
    createTransaction: async (userId: string, donnees: any, options?: { id?: string }) => {
      // L'ecriture DOIT imposer un identifiant : sans lui, le rejeu doublerait.
      if (!options?.id) throw new Error('identifiant non impose')
      const transaction = { id: options.id, userId, ...donnees }
      monde.transactions.set(options.id, transaction)
      return transaction
    }
  }
}))

const { executerEcritureAutomatique } = await import('../ecritureAutomatiqueService')

describe('executerEcritureAutomatique — corpus des 50 SMS', () => {
  beforeEach(() => {
    chargerCorpusDansInbox()
    monde.transactions.clear()
    monde.comptes = []
    monde.comptesCrees = 0
  })

  it('AC1 — ecrit les operations reconnues et concordantes, sans intervention', async () => {
    const bilan = await executerEcritureAutomatique()

    expect(bilan.ignore).toBeUndefined()
    expect(bilan.lignesLues).toBe(50)
    expect(bilan.operationsEcrites).toBe(48)
    expect(bilan.ecartees).toBe(2)
    expect(bilan.erreurs).toEqual([])
    expect(monde.transactions.size).toBe(71)
  })

  it('AC3 — aucun SMS ecarte ne produit de transaction ni d erreur', async () => {
    await executerEcritureAutomatique()

    const ecrites = [...monde.transactions.values()]
    // Le SMS d echec (OR260903ZQO043) et l ancre de chaine ne laissent aucune trace.
    expect(ecrites.some((t) => t.notes?.includes('OR260903ZQO043'))).toBe(false)
    expect(ecrites.some((t) => t.notes?.includes('CO260729.1038.C39365'))).toBe(false)

    const ecartees = monde.inbox.filter((l) => l.etat === 'a_valider')
    expect(ecartees).toHaveLength(2)
    expect(ecartees.every((l) => l.transaction_id === null)).toBe(true)
  })

  it('AC4 — un SMS avec frais cree DEUX transactions distinctes', async () => {
    await executerEcritureAutomatique()

    // CO260729.1038.C39365 est l ancre : on prend un retrait plus loin dans la chaine.
    const reference = 'CO260801.0732.C44491'
    const lignes = [...monde.transactions.values()].filter((t) => t.notes === `SMS ${reference}`)

    expect(lignes).toHaveLength(2)
    const principale = lignes.find((t) => !t.description.startsWith('Frais - '))!
    const frais = lignes.find((t) => t.description.startsWith('Frais - '))!

    expect(principale.amount).toBe(-60000) // retrait = depense = montant negatif
    expect(frais.amount).toBe(-1900) // frais jamais fondus dans le montant principal
    expect(principale.id).not.toBe(frais.id)
  })

  it('AC4bis — un SMS sans frais ne cree QU UNE transaction', async () => {
    await executerEcritureAutomatique()

    // CI260808.1220.D56174 : depot, aucun champ Frais dans le SMS.
    const lignes = [...monde.transactions.values()].filter(
      (t) => t.notes === 'SMS CI260808.1220.D56174'
    )
    expect(lignes).toHaveLength(1)
    expect(lignes[0].amount).toBeGreaterThan(0) // depot = recette = montant positif
    expect(lignes[0].type).toBe('income')
  })

  it('AC5 — rejouer l ecriture ne cree aucun doublon', async () => {
    await executerEcritureAutomatique()
    const apresPremierePasse = new Set(monde.transactions.keys())

    // On remet toute la file a `a_valider` : le cas le plus defavorable, celui
    // ou le marquage aurait echoue (un timeout n est pas un echec).
    for (const ligne of monde.inbox) ligne.etat = 'a_valider'

    const bilan = await executerEcritureAutomatique()

    expect(bilan.transactionsCreees).toBe(0)
    expect(bilan.dejaEcrites).toBe(48)
    expect(monde.transactions.size).toBe(71)
    expect(new Set(monde.transactions.keys())).toEqual(apresPremierePasse)
  })

  it('AC6 — tout est rattache au compte Orange Money, jamais a un autre', async () => {
    await executerEcritureAutomatique()

    expect(monde.comptesCrees).toBe(1)
    expect(monde.comptes[0].type).toBe('orange_money')
    expect(monde.comptes[0].name).toBe('Orange Money')

    const compteId = monde.comptes[0].id
    expect([...monde.transactions.values()].every((t) => t.accountId === compteId)).toBe(true)
  })

  it('reutilise un compte Orange Money existant au lieu d en creer un second', async () => {
    monde.comptes = [
      { id: 'compte-existant', userId: monde.userId, name: 'Mon Orange', type: 'orange_money', balance: 5000 }
    ]
    await executerEcritureAutomatique()

    expect(monde.comptesCrees).toBe(0)
    expect([...monde.transactions.values()].every((t) => t.accountId === 'compte-existant')).toBe(true)
  })

  it('marque les lignes ecrites et les fait pointer vers la transaction principale', async () => {
    await executerEcritureAutomatique()

    const ecrites = monde.inbox.filter((l) => l.etat === 'auto_ecrit')
    expect(ecrites).toHaveLength(48)
    for (const ligne of ecrites) {
      expect(ligne.transaction_id).toBeTruthy()
      expect(monde.transactions.has(ligne.transaction_id!)).toBe(true)
      expect(ligne.traite_le).toBeTruthy()
    }
  })

  it('chaque transaction porte la reference du SMS d origine (tracabilite)', async () => {
    await executerEcritureAutomatique()
    for (const transaction of monde.transactions.values()) {
      expect(transaction.notes).toMatch(/^SMS /)
      expect(transaction.category).toBe('autres')
    }
  })

  it('ne fait rien hors ligne, et ne leve jamais', async () => {
    // `src/test/setup.ts` pose `navigator.onLine` en propriete inscriptible :
    // une simple affectation suffit, et se remet en place ensuite.
    const original = navigator.onLine
    ;(navigator as any).onLine = false
    try {
      const bilan = await executerEcritureAutomatique()
      expect(bilan.ignore).toBe('hors ligne')
      expect(monde.transactions.size).toBe(0)
    } finally {
      ;(navigator as any).onLine = original
    }
  })
})
