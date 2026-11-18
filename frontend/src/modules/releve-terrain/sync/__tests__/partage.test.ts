// Integration of sharing (RELEVE-CC-10, C1) against the REAL server SQL in PGlite (fixture of RELEVE-CC-08):
// DR1, DR2, DR5, DR9, DR11, DR12, DR13, DR15, DR16, DR17 of the PRD (jeu H), through the module's own
// functions (sync/partage.ts, sync/lecture.ts, db/depot.ts, db/lecture.ts). The phone under test is the
// real Dexie on fake-indexeddb, opened for one account at a time; the owner P acts through the same
// sharing functions his phone calls.
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('dexie')

import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import Dexie from 'dexie'
import { webcrypto } from 'node:crypto'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange
const cryptoGlobal = globalThis.crypto as unknown as { randomUUID: () => string }
cryptoGlobal.randomUUID = () => webcrypto.randomUUID()
vi.setConfig({ testTimeout: 120000, hookTimeout: 120000 })

const { db } = await import('../../db/base')
const depot = await import('../../db/depot')
const { listePartages, listeTerrains } = await import('../../db/lecture')
const { envoyerTout } = await import('../envoi')
const { lireServeur } = await import('../lecture')
const { ouvrir } = await import('../moteur')
const { prendreSaisie } = await import('../saisie')
const partage = await import('../partage')
const { nouveauServeur, P, R, C, N } = await import('./serveur')
type Serveur = Awaited<ReturnType<typeof nouveauServeur>>
type DroitPartage = import('../partage').DroitPartage

const U = () => webcrypto.randomUUID()

let srv: Serveur
beforeEach(async () => {
  await viderTelephone()
  srv = await nouveauServeur()
})

async function viderTelephone() {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
}

/** The phone under test, emptied then opened for an account, and read from the server. */
async function telephone(uid: string) {
  await viderTelephone()
  const rpc = srv.rpc(uid)
  const o = await ouvrir(rpc)
  const ctx = { rpc, appareil: o.appareil, compteId: o.user_id }
  await lireServeur(ctx)
  return ctx
}

/** What « Partagés avec moi » shows: domain → work site → right. */
async function vue(): Promise<Record<string, Record<string, string>>> {
  const out: Record<string, Record<string, string>> = {}
  for (const d of await listePartages()) out[d.domaine.nom] = Object.fromEntries(d.chantiers.map((c) => [c.chantier.nom, c.droit]))
  return out
}

/** Jeu H: P owns Domaine 1 (Chantier 1, Chantier 2) and Domaine 2 (Chantier 3). */
async function jeuH() {
  const p = srv.rpc(P)
  await p('rt_ouvrir', { p_appareil: U(), p_libelle: 'tel P' })
  const ids = { D1: U(), D2: U(), C1: U(), C2: U(), C3: U() }
  await p('rt_domaine_enregistrer', { p_id: ids.D1, p_nom: 'Domaine 1' })
  await p('rt_domaine_enregistrer', { p_id: ids.D2, p_nom: 'Domaine 2' })
  await p('rt_chantier_enregistrer', { p_id: ids.C1, p_domaine: ids.D1, p_nom: 'Chantier 1' })
  await p('rt_chantier_enregistrer', { p_id: ids.C2, p_domaine: ids.D1, p_nom: 'Chantier 2' })
  await p('rt_chantier_enregistrer', { p_id: ids.C3, p_domaine: ids.D2, p_nom: 'Chantier 3' })
  for (const u of [R, C, N]) await srv.rpc(u)('rt_ouvrir', { p_appareil: U(), p_libelle: `tel ${u.slice(-1)}` })
  return ids
}

/** P prepares an invitation (module function), returns the token. */
async function inviter(domaine: string, chantiers: string[] | null, droit: DroitPartage): Promise<string> {
  const r = await partage.creerInvitation(srv.rpc(P), domaine, chantiers, droit)
  if (!r.ok) throw new Error(r.message)
  expect(r.valeur.jeton).toMatch(/^[0-9a-f]{64}$/)
  return r.valeur.jeton
}

async function accepter(uid: string, jeton: string) {
  return partage.accepterInvitation(srv.rpc(uid), jeton)
}

async function partageDe(uid: string, domaine: string, chantierNom: string | null) {
  const a = await partage.lireAcces(srv.rpc(P), domaine)
  if (!a.ok) throw new Error(a.message)
  const l = a.valeur.comptes.find((c) => c.inviteId === uid)?.lignes.find((x) => x.chantierNom === chantierNom)
  if (!l) throw new Error('partage absent')
  return { acces: a.valeur, ligne: l }
}

describe('Message WhatsApp', () => {
  it('texte exact, sans tiret cadratin, demi-cadratin ni point médian', () => {
    const t = partage.messageInvitation({ domaine: 'Domaine 1', chantiers: ['Chantier 1', 'Chantier 2'], droit: 'relever', jeton: 'abc' })
    expect(t).toBe(
      '*RELEVÉ TERRAIN : INVITATION*\n\nJe vous partage Chantier 1 et Chantier 2 (Domaine 1), droit « relever ». Ouvrez ce lien et connectez-vous à 1sakely.org :\nhttps://1sakely.org/releve/i/abc',
    )
    expect(partage.messageInvitation({ domaine: 'D', chantiers: null, droit: 'consulter', jeton: 'x' })).toContain('Je vous partage tout le domaine (D), droit « consulter ».')
    expect(t).not.toMatch(/[—–·]/)
  })
})

describe('DR1 et DR2 : partage par lien, le domaine entier suit ses chantiers à venir', () => {
  it('R voit Chantier 1 seul en « relever », C voit Chantier 1 et 2 en « consulter », N ne voit rien ; Chantier 4 pour C seulement', async () => {
    const ids = await jeuH()
    const jr = await inviter(ids.D1, [ids.C1], 'relever')
    const jc = await inviter(ids.D1, null, 'consulter')
    // The preview without session (anonymous call).
    const ap = await partage.apercuInvitation(srv.rpc(''), jr)
    expect(ap).toEqual({ ok: true, valeur: { valide: true, proprietaire: 'P', domaine: 'Domaine 1', chantiers: ['Chantier 1'], droit: 'relever' } })
    const apc = await partage.apercuInvitation(srv.rpc(''), jc)
    expect(apc.ok && apc.valeur.chantiers).toBeNull()
    expect((await accepter(R, jr)).ok).toBe(true)
    expect((await accepter(C, jc)).ok).toBe(true)
    // R's phone.
    await telephone(R)
    expect(await vue()).toEqual({ 'Domaine 1': { 'Chantier 1': 'relever' } })
    expect(await listeTerrains()).toEqual([])
    const dR = (await db.domaines.toArray())[0]
    expect(dR.proprietaire_nom).toBe('P')
    expect(dR.partage_entier).toBeNull()
    // C's phone.
    await telephone(C)
    expect(await vue()).toEqual({ 'Domaine 1': { 'Chantier 1': 'consulter', 'Chantier 2': 'consulter' } })
    expect((await db.domaines.toArray())[0].partage_entier).toBe('consulter')
    // N's phone.
    await telephone(N)
    expect(await vue()).toEqual({})
    expect(await db.domaines.count()).toBe(0)
    // DR2: P creates Chantier 4 in Domaine 1.
    await srv.rpc(P)('rt_chantier_enregistrer', { p_id: U(), p_domaine: ids.D1, p_nom: 'Chantier 4' })
    await telephone(C)
    expect(await vue()).toEqual({ 'Domaine 1': { 'Chantier 1': 'consulter', 'Chantier 2': 'consulter', 'Chantier 4': 'consulter' } })
    await telephone(R)
    expect(await vue()).toEqual({ 'Domaine 1': { 'Chantier 1': 'relever' } })
  })
})

describe('DR5 : « consulter » voit et exporte, ne crée ni ne saisit', () => {
  it('création et saisie refusées (téléphone et serveur), sauvegarde de R1 exportée', async () => {
    const ids = await jeuH()
    await accepter(R, await inviter(ids.D1, [ids.C1], 'relever'))
    await accepter(C, await inviter(ids.D1, null, 'consulter'))
    // R creates R1 with one station.
    const ctxR = await telephone(R)
    const r1 = await depot.creerReleve(ids.C1, { nom: 'R1' })
    await depot.ecrireObjet(r1.id, { type: 'station', donnees: { numero: 'S01', heure: new Date().toISOString(), visees: [], etat: 'normale', note: null, sans_visee: null } }, r1.rev)
    await envoyerTout(ctxR)
    // C's phone.
    const ctxC = await telephone(C)
    await expect(depot.creerReleve(ids.C1, { nom: 'Essai C' })).rejects.toThrow(depot.MESSAGE_CONSULTER_SEULEMENT)
    await expect(srv.rpc(C)('rt_releve_creer', { p_id: U(), p_chantier: ids.C1, p_appareil: ctxC.appareil.id, p_nom: 'Essai C', p_entete: {} })).rejects.toMatchObject({ code: 'RT_DROIT_INSUFFISANT' })
    const l = (await db.releves.get(r1.id))!
    expect(l.saisie).toBe('lecture')
    await expect(depot.ecrireObjet(r1.id, { type: 'station', donnees: { numero: 'S02', heure: new Date().toISOString(), visees: [], etat: 'normale', note: null, sans_visee: null } }, l.rev)).rejects.toBeInstanceOf(depot.SaisieNonTenue)
    expect((await prendreSaisie(ctxC, r1.id)).ok).toBe(false)
    await expect(depot.dupliquerReleve(r1.id)).rejects.toBeInstanceOf(depot.DroitInsuffisant)
    // Export allowed: the backup of R1 holds its station.
    const s = await depot.lireSauvegarde(r1.id)
    expect(s.releve.nom).toBe('R1')
    expect(s.objets.filter((o) => o.type === 'station').map((o) => (o.donnees as { numero: string }).numero)).toEqual(['S01'])
  })
})

describe('DR9 : « relever » supprime seulement ses relevés', () => {
  it('R1 (créé par R) supprimé ; le relevé de P refusé sur le téléphone et sur le serveur', async () => {
    const ids = await jeuH()
    await accepter(R, await inviter(ids.D1, [ids.C1], 'relever'))
    const RP = U()
    const apP = U()
    await srv.rpc(P)('rt_ouvrir', { p_appareil: apP, p_libelle: 'tel P2' })
    await srv.rpc(P)('rt_releve_creer', { p_id: RP, p_chantier: ids.C1, p_appareil: apP, p_nom: 'Releve P', p_entete: {} })
    await srv.rpc(P)('rt_saisie_terminer', { p_releve: RP, p_appareil: apP })
    const ctxR = await telephone(R)
    const r1 = await depot.creerReleve(ids.C1, { nom: 'R1' })
    await envoyerTout(ctxR)
    await lireServeur(ctxR)
    const lp = (await db.releves.get(RP))!
    await expect(depot.supprimerReleve(RP, lp.rev)).rejects.toThrow(depot.MESSAGE_SUPPRIMER_SIEN)
    await expect(srv.rpc(R)('rt_releve_supprimer', { p_releve: RP, p_appareil: ctxR.appareil.id })).rejects.toMatchObject({ code: 'RT_DROIT_INSUFFISANT' })
    const l1 = (await db.releves.get(r1.id))!
    await depot.supprimerReleve(r1.id, l1.rev)
    await envoyerTout(ctxR)
    const srvRel = await srv.sql<{ id: string; supprime: boolean }>(`select id, supprime_at is not null as supprime from rt_releves order by nom`)
    expect(srvRel).toEqual(
      expect.arrayContaining([
        { id: r1.id, supprime: true },
        { id: RP, supprime: false },
      ]),
    )
  })
})

describe('DR11 : retrait du partage', () => {
  it('Chantier 1 disparaît du téléphone de R (qui n’a aucun domaine à lui) ; ses stations envoyées restent sur le serveur', async () => {
    const ids = await jeuH()
    await accepter(R, await inviter(ids.D1, [ids.C1], 'relever'))
    const ctxR = await telephone(R)
    const r1 = await depot.creerReleve(ids.C1, { nom: 'R1' })
    await depot.ecrireObjet(r1.id, { type: 'station', donnees: { numero: 'S01', heure: new Date().toISOString(), visees: [], etat: 'normale', note: null, sans_visee: null } }, r1.rev)
    await envoyerTout(ctxR)
    const { ligne } = await partageDe(R, ids.D1, 'Chantier 1')
    expect((await partage.retirerPartage(srv.rpc(P), ligne.id)).ok).toBe(true)
    // Next connection of R: an empty but complete answer removes the shared domain.
    expect(await srv.rpc(R)('rt_mes_terrains', {})).toEqual([])
    await lireServeur(ctxR)
    expect(await vue()).toEqual({})
    expect(await db.domaines.count()).toBe(0)
    expect(await db.releves.get(r1.id)).toBeUndefined()
    const st = await srv.sql<{ n: number }>(`select count(*)::int as n from rt_objets where releve_id = $1 and type = 'station'`, [r1.id])
    expect(st[0].n).toBe(1)
  })
})

describe('DR12 : un invité ne partage pas et ne renomme pas', () => {
  it('R ne peut pas partager Chantier 1 à N ; C ne peut pas renommer Chantier 2', async () => {
    const ids = await jeuH()
    await accepter(R, await inviter(ids.D1, [ids.C1], 'relever'))
    await accepter(C, await inviter(ids.D1, null, 'consulter'))
    const r = await partage.creerInvitation(srv.rpc(R), ids.D1, [ids.C1], 'relever')
    expect(r).toEqual({ ok: false, message: partage.MESSAGE_RESERVE_PROPRIETAIRE, code: 'RT_NON_PROPRIETAIRE' })
    expect((await partage.lireAcces(srv.rpc(R), ids.D1)).ok).toBe(false)
    expect(await srv.sql(`select 1 from rt_invitations where domaine_id = $1`, [ids.D1])).toHaveLength(2)
    await telephone(C)
    await expect(depot.renommerChantier(ids.C2, 'Autre nom')).rejects.toThrow(depot.MESSAGE_RESERVE_PROPRIETAIRE)
    await expect(depot.supprimerChantier(ids.C2)).rejects.toBeInstanceOf(depot.DroitInsuffisant)
    await expect(depot.renommerDomaine(ids.D1, 'Autre')).rejects.toBeInstanceOf(depot.DroitInsuffisant)
    await expect(depot.creerChantier(ids.D1, 'Nouveau')).rejects.toBeInstanceOf(depot.DroitInsuffisant)
    expect((await db.chantiers.get(ids.C2))!.nom).toBe('Chantier 2')
    await expect(srv.rpc(C)('rt_chantier_enregistrer', { p_id: ids.C2, p_domaine: ids.D1, p_nom: 'Autre nom' })).rejects.toMatchObject({ code: 'RT_NON_PROPRIETAIRE' })
    expect((await srv.sql<{ nom: string }>(`select nom from rt_chantiers where id = $1`, [ids.C2]))[0].nom).toBe('Chantier 2')
  })
})

describe('DR13 : lien déjà accepté', () => {
  it('N reçoit « invitation plus valable » ; l’aperçu le dit aussi ; P ne peut accepter sa propre invitation ; une invitation retirée ne vaut plus', async () => {
    const ids = await jeuH()
    const j = await inviter(ids.D1, [ids.C1], 'relever')
    expect((await accepter(R, j)).ok).toBe(true)
    expect(await accepter(N, j)).toEqual({ ok: false, message: partage.MESSAGE_PLUS_VALABLE, code: 'RT_INVITATION_PLUS_VALABLE' })
    const ap = await partage.apercuInvitation(srv.rpc(''), j)
    expect(ap.ok && ap.valeur.valide).toBe(false)
    expect(partage.MESSAGE_PLUS_VALABLE).toBe('Invitation plus valable : elle a déjà été acceptée ou elle a été retirée. Demandez-en une nouvelle au propriétaire.')
    await telephone(N)
    expect(await vue()).toEqual({})
    // P's own invitation.
    const jp = await inviter(ids.D1, null, 'consulter')
    expect(await accepter(P, jp)).toEqual({ ok: false, message: "C'est votre propre invitation.", code: 'RT_INVITATION_PROPRIETAIRE' })
    // A pending invitation withdrawn by P: shown pending in « Qui a accès », then no longer valid.
    const a = await partage.lireAcces(srv.rpc(P), ids.D1)
    const attente = a.ok ? a.valeur.invitations : []
    expect(attente).toHaveLength(1)
    expect(attente[0]).toMatchObject({ droit: 'consulter', chantiers: null })
    expect((await partage.retirerInvitation(srv.rpc(P), attente[0].id)).ok).toBe(true)
    const ap2 = await partage.apercuInvitation(srv.rpc(''), jp)
    expect(ap2.ok && ap2.valeur.valide).toBe(false)
    expect((await accepter(C, jp)).ok).toBe(false)
  })
})

describe('DR15 et DR16 : le plus précis l’emporte', () => {
  it('Domaine 1 en « relever » et Chantier 2 en « consulter » ; retrait du partage de Chantier 2 : retour au droit du domaine', async () => {
    const ids = await jeuH()
    await accepter(R, await inviter(ids.D1, null, 'relever'))
    await accepter(R, await inviter(ids.D1, [ids.C2], 'consulter'))
    const C4 = U()
    await srv.rpc(P)('rt_chantier_enregistrer', { p_id: C4, p_domaine: ids.D1, p_nom: 'Chantier 4' })
    const ctxR = await telephone(R)
    expect(await vue()).toEqual({ 'Domaine 1': { 'Chantier 1': 'relever', 'Chantier 2': 'consulter', 'Chantier 4': 'relever' } })
    expect((await depot.creerReleve(ids.C1, { nom: 'R1' })).chantier_id).toBe(ids.C1)
    expect((await depot.creerReleve(C4, { nom: 'R4' })).chantier_id).toBe(C4)
    await expect(depot.creerReleve(ids.C2, { nom: 'R2' })).rejects.toBeInstanceOf(depot.DroitInsuffisant)
    await envoyerTout(ctxR)
    expect((await srv.sql(`select 1 from rt_releves where cree_par = $1`, [R])).length).toBe(2)
    // « Qui a accès »: the line of 6.8.
    const { acces, ligne } = await partageDe(R, ids.D1, 'Chantier 2')
    const compte = acces.comptes.find((c) => c.inviteId === R)!
    expect(compte.lignes.map((l) => [l.chantierNom, l.droit])).toEqual([
      [null, 'relever'],
      ['Chantier 2', 'consulter'],
    ])
    expect(compte.precisions).toEqual(['Sur Chantier 2, r ne fait que consulter : le partage du chantier passe avant celui du domaine.'])
    // DR16: P withdraws the share of Chantier 2.
    expect((await partage.retirerPartage(srv.rpc(P), ligne.id)).ok).toBe(true)
    await lireServeur(ctxR)
    expect(await vue()).toEqual({ 'Domaine 1': { 'Chantier 1': 'relever', 'Chantier 2': 'relever', 'Chantier 4': 'relever' } })
    expect((await depot.creerReleve(ids.C2, { nom: 'R2' })).chantier_id).toBe(ids.C2)
    // Change of right of the domain line to « consulter », then back.
    const dom = (await partageDe(R, ids.D1, null)).ligne
    expect((await partage.modifierPartage(srv.rpc(P), dom.id, 'consulter')).ok).toBe(true)
    await envoyerTout(ctxR)
    await lireServeur(ctxR)
    expect(Object.values((await vue())['Domaine 1'])).toEqual(['consulter', 'consulter', 'consulter'])
    expect((await partage.modifierPartage(srv.rpc(P), dom.id, 'relever')).ok).toBe(true)
    await lireServeur(ctxR)
    expect(Object.values((await vue())['Domaine 1'])).toEqual(['relever', 'relever', 'relever'])
  })
})

describe('DR17 : un lien de 30 jours ni accepté ni retiré', () => {
  it('est accepté', async () => {
    const ids = await jeuH()
    const j = await inviter(ids.D1, [ids.C1], 'relever')
    await srv.sql(`update rt_invitations set cree_at = now() - interval '30 days'`)
    expect((await srv.sql<{ vieux: boolean }>(`select cree_at < now() - interval '29 days' as vieux from rt_invitations`))[0].vieux).toBe(true)
    const ap = await partage.apercuInvitation(srv.rpc(''), j)
    expect(ap.ok && ap.valeur.valide).toBe(true)
    expect((await accepter(R, j)).ok).toBe(true)
    await telephone(R)
    expect(await vue()).toEqual({ 'Domaine 1': { 'Chantier 1': 'relever' } })
  })
})
