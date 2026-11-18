// Integration of the input lock (RELEVE-CC-09, C1) against the REAL server SQL in PGlite (fixture of
// RELEVE-CC-08): DR3, DR4, DR7, DR8 (with and without waiting rows), DR8b, DR10 of the PRD (jeu H) and the
// same account on two phones. The phone under test is the real Dexie on fake-indexeddb with sync/; the
// other phone acts on the server through the same functions its phone would call (its own device id).
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
const { enAttenteReleve } = await import('../../db/lecture')
const { ErreurReseau } = await import('../client')
const { envoyerTout } = await import('../envoi')
const { lireServeur } = await import('../lecture')
const { cycle, ouvrir } = await import('../moteur')
const { MESSAGE_REPRISE_PROPRIETAIRE, MESSAGE_RESEAU_PRENDRE, messageTenuAilleurs } = await import('../messages')
const { prendreSaisie, reprendreSaisie, terminerSaisie } = await import('../saisie')
const { nouveauServeur, P, R } = await import('./serveur')
type Serveur = Awaited<ReturnType<typeof nouveauServeur>>
type Rpc = import('../rpc').Rpc

const U = () => webcrypto.randomUUID()

let srv: Serveur
beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
  srv = await nouveauServeur()
})

/** The phone under test (Dexie), opened for an account. */
async function telephone(uid: string) {
  const rpc = srv.rpc(uid)
  const o = await ouvrir(rpc)
  return { rpc, ctx: { rpc, appareil: o.appareil, compteId: o.user_id }, ouvert: { user_id: o.user_id, appareil: o.appareil } }
}

/** Another phone acting on the server only. */
async function autre(uid: string, libelle: string) {
  const rpc = srv.rpc(uid)
  const ap = U()
  await rpc('rt_ouvrir', { p_appareil: ap, p_libelle: libelle })
  return { rpc, ap }
}

/** P owns Domaine 1 / Chantier 1 and shares Chantier 1 in « relever » to R. */
async function partage() {
  const D1 = U()
  const C1 = U()
  const p = srv.rpc(P)
  await p('rt_ouvrir', { p_appareil: U(), p_libelle: 'tel P init' })
  await p('rt_domaine_enregistrer', { p_id: D1, p_nom: 'Domaine 1' })
  await p('rt_chantier_enregistrer', { p_id: C1, p_domaine: D1, p_nom: 'Chantier 1' })
  const inv = (await p('rt_invitation_creer', { p_domaine: D1, p_chantiers: `{${C1}}`, p_droit: 'relever' })) as { jeton: string }
  await srv.rpc(R)('rt_ouvrir', { p_appareil: U(), p_libelle: 'tel R init' })
  await srv.rpc(R)('rt_invitation_accepter', { p_jeton: inv.jeton })
  return { D1, C1 }
}

function station(numero: string) {
  return { type: 'station' as const, donnees: { numero, heure: new Date().toISOString(), visees: [], etat: 'normale' as const, note: null, sans_visee: null } }
}

async function saisir(releveId: string, numero: string): Promise<void> {
  const rev = (await db.releves.get(releveId))!.rev
  await depot.ecrireObjet(releveId, station(numero), rev)
}

async function serveurReleve(id: string) {
  return (await srv.sql<{ detenteur_user: string | null; detenteur_appareil: string | null; ancien_clos: boolean | null; reprise_at: string | null }>(`select detenteur_user, detenteur_appareil, ancien_clos, reprise_at from rt_releves where id = $1`, [id]))[0]
}

async function stationsServeur(id: string) {
  return srv.sql<{ numero: string; apres_reprise: boolean }>(`select donnees->>'numero' as numero, apres_reprise from rt_objets where releve_id = $1 and type = 'station' order by donnees->>'numero'`, [id])
}

const horsReseau: Rpc = async () => {
  throw new ErreurReseau('hors réseau')
}

describe('DR3 et DR4 : un téléphone à la fois', () => {
  it('R crée et tient R1 ; P le voit « en saisie sur le téléphone de R » ; P ne peut pas prendre la saisie', async () => {
    const { C1 } = await partage()
    const r = await autre(R, 'Téléphone R')
    const R1 = U()
    await r.rpc('rt_releve_creer', { p_id: R1, p_chantier: C1, p_appareil: r.ap, p_nom: 'R1', p_entete: {} })
    // P's phone reads: R1 held elsewhere, read-only.
    const tP = await telephone(P)
    await lireServeur(tP.ctx)
    const l = (await db.releves.get(R1))!
    expect(l.saisie).toBe('ailleurs')
    expect(l.detenteur?.appareil).toBe(r.ap)
    expect(l.detenteur?.moi).toBe(false)
    expect(messageTenuAilleurs(l.detenteur)).toMatch(/^En saisie sur le téléphone de r depuis le \d\d\/\d\d à \d\d:\d\d\.$/)
    expect(depot.saisieTenueIci(l)).toBe(false)
    // DR4: P tries to take it: refused with the holder (H27), nothing changes on the server.
    const res = await prendreSaisie(tP.ctx, R1)
    expect(res.ok).toBe(false)
    expect(res.ok ? '' : res.message).toMatch(/^En saisie sur le téléphone de r depuis le /)
    expect((await serveurReleve(R1)).detenteur_appareil).toBe(r.ap)
    // Without network: the message of H27.
    expect(await prendreSaisie(null, R1)).toEqual({ ok: false, message: MESSAGE_RESEAU_PRENDRE })
    // The phone refuses any write into it (guard of depot.ts).
    await expect(saisir(R1, 'S01')).rejects.toBeInstanceOf(depot.SaisieNonTenue)
  })
})

describe('DR7 : Terminer la saisie hors réseau', () => {
  it('fin enregistrée, relevé tenu jusqu’au retour du réseau, tout part puis rt_saisie_terminer en dernier ; P peut alors prendre', async () => {
    const { C1 } = await partage()
    const tR = await telephone(R)
    await lireServeur(tR.ctx)
    const r1 = await depot.creerReleve(C1, { nom: 'R1' })
    await envoyerTout(tR.ctx)
    const ap = tR.ctx.appareil.id
    expect((await serveurReleve(r1.id)).detenteur_appareil).toBe(ap)
    // Airplane mode: one station, then « Terminer la saisie ».
    await saisir(r1.id, 'S01')
    await terminerSaisie(r1.id)
    expect((await db.releves.get(r1.id))!.saisie).toBe('fin_en_attente')
    await expect(envoyerTout({ ...tR.ctx, rpc: horsReseau })).rejects.toBeInstanceOf(ErreurReseau)
    expect((await db.releves.get(r1.id))!.saisie).toBe('fin_en_attente')
    expect((await serveurReleve(r1.id)).detenteur_appareil).toBe(ap)
    // Back online: the station first, rt_saisie_terminer last.
    const avant = srv.appels.length
    await envoyerTout(tR.ctx)
    const ordre = srv.appels.slice(avant).map((a) => a.fonction)
    expect(ordre).toEqual(['rt_envoyer', 'rt_saisie_terminer'])
    expect((await serveurReleve(r1.id)).detenteur_appareil).toBeNull()
    expect(await stationsServeur(r1.id)).toEqual([{ numero: 'S01', apres_reprise: false }])
    const l = (await db.releves.get(r1.id))!
    expect(l.saisie).toBe('libre')
    expect(l.terminer_demande).toBeNull()
    // P takes it now.
    const p = await autre(P, 'Téléphone P')
    expect(await p.rpc('rt_saisie_prendre', { p_releve: r1.id, p_appareil: p.ap })).toEqual({ ok: true })
    await lireServeur(tR.ctx)
    expect((await db.releves.get(r1.id))!.saisie).toBe('ailleurs')
  })
})

describe('DR8 : reprise par le propriétaire', () => {
  it('S04 à S07 saisies sans réseau entrent toutes, marquées ; R accuse, passe en lecture seule, une nouvelle station est refusée', async () => {
    const { C1 } = await partage()
    const tR = await telephone(R)
    await lireServeur(tR.ctx)
    const r1 = await depot.creerReleve(C1, { nom: 'R1' })
    await envoyerTout(tR.ctx)
    // R in airplane mode: S04, S05.
    await saisir(r1.id, 'S04')
    await saisir(r1.id, 'S05')
    // P takes it over with the network.
    const p = await autre(P, 'Téléphone P')
    expect(await p.rpc('rt_saisie_reprendre', { p_releve: r1.id, p_appareil: p.ap })).toEqual({ ok: true, reprise: true })
    // R, still offline, types S06 and S07 later (it does not know yet).
    await saisir(r1.id, 'S06')
    await saisir(r1.id, 'S07')
    expect(await enAttenteReleve(r1.id)).toBe(4)
    // R back online: one cycle.
    await cycle(tR.rpc, tR.ouvert)
    expect(await stationsServeur(r1.id)).toEqual(['S04', 'S05', 'S06', 'S07'].map((numero) => ({ numero, apres_reprise: true })))
    const s = await serveurReleve(r1.id)
    expect(s.detenteur_appareil).toBe(p.ap)
    expect(s.ancien_clos).toBe(true)
    const l = (await db.releves.get(r1.id))!
    expect(l.saisie).toBe('reprise')
    expect(l.reprise_a_accuser).toBe(false)
    expect(l.reprise_at).toBeTruthy()
    expect(await enAttenteReleve(r1.id)).toBe(0)
    // A new station is refused by the phone; the server refuses R too.
    await expect(saisir(r1.id, 'S08')).rejects.toThrow('Saisie reprise par le propriétaire : ce relevé est en lecture seule.')
    const rep = (await tR.rpc('rt_envoyer', { p_releve: r1.id, p_appareil: tR.ctx.appareil.id, p_objets: [], p_entete: null })) as { code: string }
    expect(rep.code).toBe('SAISIE_REPRISE')
    // The owner sees the 4 stations marked « arrivé après reprise ».
    const lu = (await p.rpc('rt_releve_lire', { p_releve: r1.id })) as { objets: { type: string; apres_reprise: boolean }[] }
    expect(lu.objets.filter((o) => o.type === 'station' && o.apres_reprise)).toHaveLength(4)
  })

  it('ancien téléphone sans rien en attente : il apprend la reprise en lisant, accuse, passe en lecture seule', async () => {
    const { C1 } = await partage()
    const tR = await telephone(R)
    await lireServeur(tR.ctx)
    const r1 = await depot.creerReleve(C1, { nom: 'R1' })
    await saisir(r1.id, 'S01')
    await envoyerTout(tR.ctx)
    expect(await enAttenteReleve(r1.id)).toBe(0)
    const p = await autre(P, 'Téléphone P')
    await p.rpc('rt_saisie_reprendre', { p_releve: r1.id, p_appareil: p.ap })
    const avant = srv.appels.length
    await cycle(tR.rpc, tR.ouvert)
    expect(srv.appels.slice(avant).map((a) => a.fonction)).toContain('rt_reprise_accuser')
    expect((await serveurReleve(r1.id)).ancien_clos).toBe(true)
    const l = (await db.releves.get(r1.id))!
    expect(l.saisie).toBe('reprise')
    expect(l.reprise_a_accuser).toBe(false)
    await expect(saisir(r1.id, 'S02')).rejects.toBeInstanceOf(depot.SaisieNonTenue)
    expect(await stationsServeur(r1.id)).toEqual([{ numero: 'S01', apres_reprise: false }])
  })
})

describe('DR8 côté propriétaire (écran 15)', () => {
  it('après la reprise, les stations tardives de R arrivent sur le téléphone de P, marquées, et P écrit toujours', async () => {
    const { C1 } = await partage()
    const r = await autre(R, 'Téléphone R')
    const R1 = U()
    await r.rpc('rt_releve_creer', { p_id: R1, p_chantier: C1, p_appareil: r.ap, p_nom: 'R1', p_entete: {} })
    const tP = await telephone(P)
    await lireServeur(tP.ctx)
    expect(await reprendreSaisie(tP.ctx, R1)).toEqual({ ok: true })
    expect((await db.releves.get(R1))!.saisie).toBe('ici')
    // R's phone comes back with two stations typed without network.
    const tard = ['S04', 'S05'].map((numero) => ({ id: U(), type: 'station', donnees: station(numero).donnees, supprime: false, saisi_at: new Date().toISOString() }))
    const rep = (await r.rpc('rt_envoyer', { p_releve: R1, p_appareil: r.ap, p_objets: tard, p_entete: null })) as { apres_reprise: boolean }
    expect(rep.apres_reprise).toBe(true)
    await r.rpc('rt_reprise_accuser', { p_releve: R1, p_appareil: r.ap })
    // P's next cycle reads them although P holds the relevé.
    await cycle(tP.rpc, tP.ouvert)
    const locales = (await db.objets.where('releve_id').equals(R1).toArray()).filter((o) => o.type === 'station')
    expect(locales.map((o) => [(o.donnees as { numero: string }).numero, o.apres_reprise]).sort()).toEqual([
      ['S04', true],
      ['S05', true],
    ])
    expect((await db.releves.get(R1))!.saisie).toBe('ici')
    await saisir(R1, 'S06')
    await cycle(tP.rpc, tP.ouvert)
    expect(await stationsServeur(R1)).toEqual([
      { numero: 'S04', apres_reprise: true },
      { numero: 'S05', apres_reprise: true },
      { numero: 'S06', apres_reprise: false },
    ])
  })
})

describe('DR8b : seul le propriétaire reprend', () => {
  it('R ne peut pas reprendre la saisie de R1 tenue par P', async () => {
    const { C1 } = await partage()
    const p = await autre(P, 'Téléphone P')
    const R1 = U()
    await p.rpc('rt_releve_creer', { p_id: R1, p_chantier: C1, p_appareil: p.ap, p_nom: 'R1', p_entete: {} })
    const tR = await telephone(R)
    await lireServeur(tR.ctx)
    expect((await db.releves.get(R1))!.saisie).toBe('ailleurs')
    expect(await reprendreSaisie(tR.ctx, R1)).toEqual({ ok: false, message: MESSAGE_REPRISE_PROPRIETAIRE })
    expect((await serveurReleve(R1)).detenteur_appareil).toBe(p.ap)
  })
})

describe('DR10 : droit passé en « consulter » pendant que R tient la saisie', () => {
  it('saisie libérée ; la station en attente reste sur le téléphone de R et dans sa sauvegarde, pas dans le relevé', async () => {
    const { C1 } = await partage()
    const tR = await telephone(R)
    await lireServeur(tR.ctx)
    const r1 = await depot.creerReleve(C1, { nom: 'R1' })
    await envoyerTout(tR.ctx)
    await saisir(r1.id, 'S01')
    const part = (await srv.sql<{ id: string }>(`select id from rt_partages where invite_id = $1`, [R]))[0]
    await srv.rpc(P)('rt_partage_modifier', { p_partage: part.id, p_droit: 'consulter' })
    expect((await serveurReleve(r1.id)).detenteur_appareil).toBeNull()
    await cycle(tR.rpc, tR.ouvert)
    const l = (await db.releves.get(r1.id))!
    expect(l.saisie).toBe('lecture')
    expect(await enAttenteReleve(r1.id)).toBe(1)
    expect(await stationsServeur(r1.id)).toEqual([])
    const sauvegarde = await depot.lireSauvegarde(r1.id)
    expect(sauvegarde.objets.filter((o) => o.type === 'station').map((o) => (o.donnees as { numero: string }).numero)).toEqual(['S01'])
    await expect(saisir(r1.id, 'S02')).rejects.toBeInstanceOf(depot.SaisieNonTenue)
    // A second cycle changes nothing (the waiting row never leaves).
    await cycle(tR.rpc, tR.ouvert)
    expect((await db.releves.get(r1.id))!.saisie).toBe('lecture')
    expect(await stationsServeur(r1.id)).toEqual([])
  })
})

describe('Même compte sur deux téléphones', () => {
  it('le message nomme l’autre téléphone ; le propriétaire peut reprendre sa propre saisie', async () => {
    const tA = await telephone(P)
    const d = await depot.creerDomaine('Domaine A')
    const c = await depot.creerChantier(d.id, 'Chantier A')
    const r1 = await depot.creerReleve(c.id, { nom: 'Relevé A' })
    await cycle(tA.rpc, tA.ouvert)
    expect((await db.releves.get(r1.id))!.saisie).toBe('ici')
    await terminerSaisie(r1.id)
    await cycle(tA.rpc, tA.ouvert)
    expect((await db.releves.get(r1.id))!.saisie).toBe('libre')
    // Phone B of the same account takes it.
    const b = await autre(P, 'Téléphone B test')
    expect(await b.rpc('rt_saisie_prendre', { p_releve: r1.id, p_appareil: b.ap })).toEqual({ ok: true })
    await cycle(tA.rpc, tA.ouvert)
    const l = (await db.releves.get(r1.id))!
    expect(l.saisie).toBe('ailleurs')
    expect(l.detenteur?.moi).toBe(true)
    expect(messageTenuAilleurs(l.detenteur)).toMatch(/^En saisie sur votre autre téléphone, Téléphone B test, depuis le \d\d\/\d\d à \d\d:\d\d\.$/)
    const refus = await prendreSaisie(tA.ctx, r1.id)
    expect(refus.ok ? '' : refus.message).toMatch(/^En saisie sur votre autre téléphone, Téléphone B test, depuis le /)
    // The owner takes his own input back from phone A.
    expect(await reprendreSaisie(tA.ctx, r1.id)).toEqual({ ok: true })
    expect((await serveurReleve(r1.id)).detenteur_appareil).toBe(tA.ctx.appareil.id)
    expect((await db.releves.get(r1.id))!.saisie).toBe('ici')
    await saisir(r1.id, 'S01')
    await cycle(tA.rpc, tA.ouvert)
    expect(await stationsServeur(r1.id)).toEqual([{ numero: 'S01', apres_reprise: false }])
  })
})
