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
  transferFee?: number
}

interface CompteCree {
  id: string
  userId: string
  name: string
  type: string
  balance: number
}

/** Une transaction deja presente cote serveur (saisie manuelle, par exemple). */
interface TransactionExistante {
  id: string
  amount: number
  date: string
  notes: string | null
}

/** Etat partage entre les doublures et les assertions. */
const monde = {
  userId: 'utilisateur-test',
  inbox: [] as LigneInbox[],
  transactions: new Map<string, TransactionEcrite>(),
  /** Ce que la table `transactions` de Supabase contient DEJA. */
  existantes: [] as TransactionExistante[],
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
      // Garde anti-doublon : lecture des transactions deja presentes.
      if (table === 'transactions') {
        const chaine: any = {
          select: () => chaine,
          eq: () => chaine,
          gte: () => chaine,
          lte: () => chaine,
          then: (resoudre: (v: unknown) => unknown) =>
            Promise.resolve({ data: monde.existantes, error: null }).then(resoudre)
        }
        return chaine
      }
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
      get: async (id: string) => monde.transactions.get(id),
      // Les transactions ecrites par les passes precedentes sont aussi des
      // voisines : la garde doit pouvoir les lire sans jamais s'y meprendre
      // (elles portent la marque `SMS `).
      where: () => ({
        equals: () => ({
          toArray: async () => [...monde.transactions.values()]
        })
      })
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
    monde.existantes = []
    monde.comptes = []
    monde.comptesCrees = 0
  })

  it('AC1 — ecrit les operations reconnues et concordantes, sans intervention', async () => {
    const bilan = await executerEcritureAutomatique()

    expect(bilan.ignore).toBeUndefined()
    expect(bilan.lignesLues).toBe(50)
    // 49 operations : les 48 d'avant, PLUS l'ancre de chaine desormais ecrite.
    expect(bilan.operationsEcrites).toBe(49)
    expect(bilan.ecartees).toBe(1) // seul le SMS d'echec reste ecarte
    expect(bilan.doublons).toBe(0)
    expect(bilan.erreurs).toEqual([])
    // UNE seule transaction par operation, frais compris (v3.76.0).
    expect(monde.transactions.size).toBe(49)
  })

  it('AC7 — la premiere ligne de la chaine est desormais ecrite', async () => {
    await executerEcritureAutomatique()

    // CO260729.1038.C39365 : aucun solde precedent, donc concordance
    // indeterminee — plus jamais un motif d'abandon.
    const ancre = [...monde.transactions.values()].filter(
      (t) => t.notes === 'SMS CO260729.1038.C39365'
    )
    expect(ancre).toHaveLength(1)
    expect(monde.inbox.find((l) => l.reference === 'CO260729.1038.C39365')?.etat).toBe('auto_ecrit')
  })

  it('AC3 — aucun SMS ecarte ne produit de transaction ni d erreur', async () => {
    await executerEcritureAutomatique()

    const ecrites = [...monde.transactions.values()]
    // Le SMS d echec (OR260903ZQO043) ne laisse aucune trace.
    expect(ecrites.some((t) => t.notes?.includes('OR260903ZQO043'))).toBe(false)

    const ecartees = monde.inbox.filter((l) => l.etat === 'a_valider')
    expect(ecartees).toHaveLength(1)
    expect(ecartees.every((l) => l.transaction_id === null)).toBe(true)
  })

  it('AC1 — un SMS avec frais cree UNE SEULE transaction, frais inclus', async () => {
    await executerEcritureAutomatique()

    const reference = 'CO260801.0732.C44491' // retrait 60 000, frais 1 900
    const lignes = [...monde.transactions.values()].filter((t) => t.notes === `SMS ${reference}`)

    expect(lignes).toHaveLength(1)
    // Le total reellement debite, et le detail des frais a cote.
    expect(lignes[0].amount).toBe(-61900)
    expect(lignes[0].transferFee).toBe(1900)
    // La description ne mentionne pas les frais.
    expect(lignes[0].description).not.toMatch(/frais/i)
  })

  it('AC2 — aucune transaction de frais n est creee, sur tout le corpus', async () => {
    await executerEcritureAutomatique()

    const lignesDeFrais = [...monde.transactions.values()].filter((t) =>
      t.description.startsWith('Frais - ')
    )
    expect(lignesDeFrais).toHaveLength(0)

    // Une transaction par operation ecrite : la liste affiche une seule ligne.
    const references = new Set([...monde.transactions.values()].map((t) => t.notes))
    expect(references.size).toBe(monde.transactions.size)
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
    expect(lignes[0].transferFee).toBeUndefined() // aucun frais : rien a detailler
  })

  it('AC5 — rejouer l ecriture ne cree aucun doublon', async () => {
    await executerEcritureAutomatique()
    const apresPremierePasse = new Set(monde.transactions.keys())

    // On remet toute la file a `a_valider` : le cas le plus defavorable, celui
    // ou le marquage aurait echoue (un timeout n est pas un echec).
    for (const ligne of monde.inbox) ligne.etat = 'a_valider'

    const bilan = await executerEcritureAutomatique()

    expect(bilan.transactionsCreees).toBe(0)
    expect(bilan.dejaEcrites).toBe(49)
    expect(bilan.doublons).toBe(0) // une ligne deja ecrite n'est pas son propre doublon
    expect(monde.transactions.size).toBe(49)
    expect(new Set(monde.transactions.keys())).toEqual(apresPremierePasse)
  })

  it('AC5/AC6 — le cas reel : « Karate 3mois » deja saisi a la main', async () => {
    // Le SMS PP260905.0925.B08754 : transfert 91 900 Ar + 500 Ar de frais,
    // le 05/09/2026 a 09:25 (heure de Madagascar). JOEL avait deja saisi la
    // meme depense a la main, frais compris : 92 400 Ar.
    monde.existantes = [
      {
        id: 'saisie-manuelle-karate',
        amount: -92400,
        date: new Date('2026-09-05T10:00:00+03:00').toISOString(),
        notes: null
      }
    ]

    const bilan = await executerEcritureAutomatique()

    expect(bilan.doublons).toBe(1)

    // Rien n'a ete ecrit pour ce SMS.
    const ecrites = [...monde.transactions.values()].filter(
      (t) => t.notes === 'SMS PP260905.0925.B08754'
    )
    expect(ecrites).toHaveLength(0)

    // La ligne est marquee et pointe vers la transaction deja existante.
    const ligne = monde.inbox.find((l) => l.reference === 'PP260905.0925.B08754')!
    expect(ligne.etat).toBe('doublon_probable')
    expect(ligne.transaction_id).toBe('saisie-manuelle-karate')

    // Le reste du corpus n'est pas affecte.
    expect(bilan.operationsEcrites).toBe(48)
  })

  it('AC5 — un montant SANS les frais suffit aussi a reconnaitre le doublon', async () => {
    monde.existantes = [
      {
        id: 'saisie-montant-seul',
        amount: -91900, // le montant seul, frais non saisis
        date: new Date('2026-09-05T14:30:00+03:00').toISOString(),
        notes: null
      }
    ]

    const bilan = await executerEcritureAutomatique()

    expect(bilan.doublons).toBe(1)
    expect(
      monde.inbox.find((l) => l.reference === 'PP260905.0925.B08754')?.transaction_id
    ).toBe('saisie-montant-seul')
  })

  it('AC5 — une transaction issue d un SMS ne peut JAMAIS prouver un doublon', async () => {
    // Meme jour, meme montant, mais elle porte la marque `SMS ` : c'est une
    // ecriture automatique, pas une saisie manuelle. Elle ne bloque rien.
    monde.existantes = [
      {
        id: 'ecriture-sms-anterieure',
        amount: -92400,
        date: new Date('2026-09-05T09:25:00+03:00').toISOString(),
        notes: 'SMS PP260905.0925.B08754'
      }
    ]

    const bilan = await executerEcritureAutomatique()

    expect(bilan.doublons).toBe(0)
    expect(bilan.operationsEcrites).toBe(49)
  })

  it('AC5 — un montant identique un AUTRE jour ne bloque rien', async () => {
    monde.existantes = [
      {
        id: 'autre-jour',
        amount: -92400,
        date: new Date('2026-09-04T09:25:00+03:00').toISOString(),
        notes: null
      }
    ]

    const bilan = await executerEcritureAutomatique()

    expect(bilan.doublons).toBe(0)
    expect(bilan.operationsEcrites).toBe(49)
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
    expect(ecrites).toHaveLength(49)
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
