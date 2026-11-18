// Integration of sync/ against the REAL server SQL in PGlite (RELEVE-CC-08, C1): DR6, DR11, DR14, DR18 of
// the PRD (jeu H), sending order, D28 (data made before the account), deletion refused and restored,
// timeout then retry. The phone is the real Dexie on fake-indexeddb; the other accounts act on the server
// through the same functions their phone would call.
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
const { compterEnAttente, enAttenteReleve } = await import('../../db/lecture')
const { jeuB } = await import('../../etat/jeux')
const { ErreurReseau } = await import('../client')
const { envoyerTout } = await import('../envoi')
const { lireServeur } = await import('../lecture')
const { cycle, delaiReprise, ouvrir } = await import('../moteur')
const { md5, nouveauServeur, sqlServeur, P, R, C } = await import('./serveur')
type Serveur = Awaited<ReturnType<typeof nouveauServeur>>
type Rpc = import('../rpc').Rpc

const U = () => webcrypto.randomUUID()

async function nouveauTelephone(): Promise<void> {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
}

/** A relevé of game B on the phone: the 3 verified targets and the stations S01 to S0n. */
async function releveJeuB(chantierId: string, nom: string, stations = 3) {
  const s = jeuB()
  let k = 0
  const objets = s.objets.filter((o) => o.type === 'borne' || (o.type === 'station' && k++ < stations))
  return depot.importerReleve(chantierId, { ...s, releve: { ...s.releve, nom }, objets }, 'garder_les_deux')
}

/** Phone of an account: rpc of that account, opened (rt_ouvrir). */
async function telephone(srv: Serveur, uid: string) {
  const rpc = srv.rpc(uid)
  const o = await ouvrir(rpc)
  return { rpc, o, ctx: { rpc, appareil: o.appareil, compteId: o.user_id } }
}

async function compte<T = { n: number }>(srv: Serveur, q: string, p: unknown[] = []): Promise<T> {
  return (await srv.sql<T>(q, p))[0]
}

let srv: Serveur
beforeEach(async () => {
  await nouveauTelephone()
  srv = await nouveauServeur()
})

describe('serveur de test', () => {
  it('SQL du serveur identique à la référence (md5) et joué deux fois sans erreur', async () => {
    expect(md5(sqlServeur())).toBe('ec258885bc1b26735bfc311fe20299c0')
    const t = await compte<{ n: number }>(srv, `select count(*)::int as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname like 'rt\\_%'`)
    expect(t.n).toBe(31)
  })
})

describe('DR6 : 3 stations saisies hors réseau, envoyées au retour du réseau', () => {
  it('parties une seule fois, rejeu sans doublon, lignes envoyées, aucune écriture refusée ensuite', async () => {
    const { rpc, ctx } = await telephone(srv, R)
    // Owner P shares Chantier 1 in « relever » to R (as their phones would do).
    const D1 = U(), C1 = U()
    await srv.rpc(P)('rt_ouvrir', { p_appareil: U(), p_libelle: 'tel P' })
    await srv.rpc(P)('rt_domaine_enregistrer', { p_id: D1, p_nom: 'Domaine 1' })
    await srv.rpc(P)('rt_chantier_enregistrer', { p_id: C1, p_domaine: D1, p_nom: 'Chantier 1' })
    const inv = (await srv.rpc(P)('rt_invitation_creer', { p_domaine: D1, p_chantiers: `{${C1}}`, p_droit: 'relever' })) as { jeton: string }
    await rpc('rt_invitation_accepter', { p_jeton: inv.jeton })
    await lireServeur(ctx)
    // R1 created with the network, then the stations in airplane mode.
    const r1 = await depot.creerReleve(C1, { nom: 'R1' })
    await envoyerTout(ctx)
    expect((await db.releves.get(r1.id))!.serveur_connu).toBe(true)
    const s = jeuB()
    const bornes = (await db.objets.where('releve_id').equals(r1.id).toArray()).filter((o) => o.type === 'borne')
    const lien = new Map(s.objets.filter((o) => o.type === 'borne').map((o, i) => [o.id, bornes[i].id]))
    let rev = (await db.releves.get(r1.id))!.rev
    for (const st of s.objets.filter((o) => o.type === 'station').slice(0, 3)) {
      const d = JSON.parse(JSON.stringify(st.donnees)) as { visees: { borne_id: string }[] }
      d.visees = d.visees.map((v) => ({ ...v, borne_id: lien.get(v.borne_id) ?? v.borne_id }))
      rev = (await depot.ecrireObjet(r1.id, { type: 'station', donnees: d as never }, rev)).rev
    }
    expect(await enAttenteReleve(r1.id)).toBe(3)
    // Back online: the first answer is lost after the server wrote (timeout is not a failure).
    let perdre = true
    const rpcPerte: Rpc = async (f, a) => {
      const res = await rpc(f, a)
      if (f === 'rt_envoyer' && perdre) {
        perdre = false
        throw new ErreurReseau('timeout')
      }
      return res
    }
    await expect(envoyerTout({ ...ctx, rpc: rpcPerte })).rejects.toBeInstanceOf(ErreurReseau)
    expect(await enAttenteReleve(r1.id)).toBe(3)
    await envoyerTout({ ...ctx, rpc: rpcPerte })
    expect(await enAttenteReleve(r1.id)).toBe(0)
    const n = await compte(srv, `select count(*)::int as n from rt_objets where releve_id = $1 and type = 'station'`, [r1.id])
    expect(n.n).toBe(3)
    expect((await db.objets.where('releve_id').equals(r1.id).toArray()).every((o) => o.envoi === 'envoye')).toBe(true)
    // P and C read the same 3 stations.
    const lu = (await srv.rpc(P)('rt_releve_lire', { p_releve: r1.id })) as { objets: { type: string }[] }
    expect(lu.objets.filter((o) => o.type === 'station')).toHaveLength(3)
    // No write refused afterwards: the screen's rev still writes (sending never raised the rev).
    expect((await db.releves.get(r1.id))!.rev).toBe(rev)
    await expect(depot.ecrireObjet(r1.id, { type: 'point_plan', donnees: { nom: 'P1', x: 1, y: 2, z: 3 } }, rev)).resolves.toBeTruthy()
  })
})

describe('Ordre d’envoi (D32)', () => {
  it('domaine, chantier, relevé, objets, puis suppressions ; jamais un chantier avant son domaine', async () => {
    const { ctx } = await telephone(srv, P)
    const d = await depot.creerDomaine('Ordre')
    const c = await depot.creerChantier(d.id, 'Chantier ordre')
    const r = await releveJeuB(c.id, 'Releve ordre')
    const aSupprimer = await depot.creerDomaine('A supprimer')
    await depot.supprimerDomaine(aSupprimer.id)
    // Network lost on the domain: nothing after it leaves.
    const appels: string[] = []
    const coupe: Rpc = async (f, a) => {
      appels.push(f)
      if (f === 'rt_domaine_enregistrer') throw new ErreurReseau('timeout')
      return ctx.rpc(f, a)
    }
    await expect(envoyerTout({ ...ctx, rpc: coupe })).rejects.toBeInstanceOf(ErreurReseau)
    expect(appels).toEqual(['rt_domaine_enregistrer'])
    expect((await db.chantiers.get(c.id))!.envoi).toBe('a_envoyer')
    // With the network: the fixed order.
    const ordre: string[] = []
    await envoyerTout({ ...ctx, rpc: async (f, a) => (ordre.push(f), ctx.rpc(f, a)) })
    expect(ordre).toEqual(['rt_domaine_enregistrer', 'rt_chantier_enregistrer', 'rt_releve_creer', 'rt_envoyer', 'rt_domaine_supprimer'])
    expect(await compterEnAttente()).toBe(0)
    const o = await compte(srv, `select count(*)::int as n from rt_objets where releve_id = $1`, [r.id])
    expect(o.n).toBe(6)
  })

  it('un lot de plus de 500 objets part en lots de 500 au plus, par heure de saisie', async () => {
    const { ctx } = await telephone(srv, P)
    const d = await depot.creerDomaine('Gros')
    const c = await depot.creerChantier(d.id, 'Gros chantier')
    const r = await depot.creerReleve(c.id, { nom: 'Gros releve' })
    let rev = r.rev
    const base = Date.parse('2026-11-18T08:00:00Z')
    const objets = Array.from({ length: 1001 }, (_, i) => ({ type: 'point_plan' as const, donnees: { nom: `P${i}`, x: i, y: 0, z: 0 }, saisi_at: new Date(base + (1001 - i) * 1000).toISOString() }))
    rev = (await depot.ecrireObjets(r.id, objets, rev)).rev
    const lots: number[] = []
    const premiers: string[] = []
    await envoyerTout({
      ...ctx,
      rpc: async (f, a) => {
        if (f === 'rt_envoyer') {
          const l = a.p_objets as { saisi_at: string }[]
          lots.push(l.length)
          if (l.length) premiers.push(l[0].saisi_at)
        }
        return ctx.rpc(f, a)
      },
    })
    expect(lots).toEqual([500, 500, 4])
    expect([...premiers].sort()).toEqual(premiers)
    const n = await compte(srv, `select count(*)::int as n from rt_objets where releve_id = $1`, [r.id])
    expect(n.n).toBe(1004)
  })
})

describe('DR18 : relevé créé hors réseau', () => {
  it('tenu par son créateur une fois envoyé ; P le voit « en saisie sur le téléphone de R »', async () => {
    const { rpc, ctx, o } = await telephone(srv, R)
    const D1 = U(), C1 = U()
    await srv.rpc(P)('rt_ouvrir', { p_appareil: U(), p_libelle: 'tel P' })
    await srv.rpc(P)('rt_domaine_enregistrer', { p_id: D1, p_nom: 'Domaine 1' })
    await srv.rpc(P)('rt_chantier_enregistrer', { p_id: C1, p_domaine: D1, p_nom: 'Chantier 1' })
    const inv = (await srv.rpc(P)('rt_invitation_creer', { p_domaine: D1, p_chantiers: `{${C1}}`, p_droit: 'relever' })) as { jeton: string }
    await rpc('rt_invitation_accepter', { p_jeton: inv.jeton })
    await lireServeur(ctx)
    // Airplane mode: R2 and S01 on the phone only.
    const r2 = await releveJeuB(C1, 'R2', 1)
    expect((await db.releves.get(r2.id))!.serveur_connu).toBe(false)
    await cycle(rpc, { user_id: o.user_id, appareil: o.appareil })
    const local = (await db.releves.get(r2.id))!
    expect(local.serveur_connu).toBe(true)
    expect(local.saisie).toBe('ici')
    const lu = (await srv.rpc(P)('rt_releve_lire', { p_releve: r2.id })) as { saisie: { user_id: string; appareil: string; nom: string }; objets: { type: string }[] }
    expect(lu.saisie.user_id).toBe(R)
    expect(lu.saisie.appareil).toBe(o.appareil.id)
    expect(lu.objets.filter((x) => x.type === 'station')).toHaveLength(1)
  })
})

describe('DR11 : partage retiré', () => {
  it('le chantier disparaît du téléphone ; celui qui garde une ligne en attente reste, en lecture seule', async () => {
    const { rpc, ctx, o } = await telephone(srv, R)
    const D1 = U(), C1 = U(), C2 = U()
    await srv.rpc(P)('rt_ouvrir', { p_appareil: U(), p_libelle: 'tel P' })
    await srv.rpc(P)('rt_domaine_enregistrer', { p_id: D1, p_nom: 'Domaine 1' })
    await srv.rpc(P)('rt_chantier_enregistrer', { p_id: C1, p_domaine: D1, p_nom: 'Chantier 1' })
    await srv.rpc(P)('rt_chantier_enregistrer', { p_id: C2, p_domaine: D1, p_nom: 'Chantier 2' })
    const inv = (await srv.rpc(P)('rt_invitation_creer', { p_domaine: D1, p_chantiers: null, p_droit: 'relever' })) as { jeton: string }
    await rpc('rt_invitation_accepter', { p_jeton: inv.jeton })
    // R also has a domain of their own: the answer after the withdrawal is not empty.
    await depot.creerDomaine('Domaine de R')
    await envoyerTout(ctx)
    await lireServeur(ctx)
    expect((await db.chantiers.get(C1))!.droit).toBe('relever')
    const ra = await releveJeuB(C1, 'RA', 2)
    const rb = await releveJeuB(C2, 'RB', 2)
    await cycle(rpc, { user_id: o.user_id, appareil: o.appareil })
    expect(await compterEnAttente()).toBe(0)
    // One more station on RB in airplane mode, then P withdraws the share.
    const b = (await db.releves.get(rb.id))!
    await depot.ecrireObjet(rb.id, { type: 'point_plan', donnees: { nom: 'en attente', x: 1, y: 1, z: 1 } }, b.rev)
    const acces = (await srv.rpc(P)('rt_acces', { p_domaine: D1 })) as { partages: { id: string }[] }
    for (const p of acces.partages) await srv.rpc(P)('rt_partage_retirer', { p_partage: p.id })
    const res = await cycle(rpc, { user_id: o.user_id, appareil: o.appareil })
    expect(res.envoi.suspendus).toEqual([{ releve: rb.id, code: 'DROIT_RETIRE' }])
    expect(await db.chantiers.get(C1)).toBeUndefined()
    expect(await db.releves.get(ra.id)).toBeUndefined()
    expect(await db.objets.where('releve_id').equals(ra.id).count()).toBe(0)
    const gardé = (await db.releves.get(rb.id))!
    expect(gardé.saisie).toBe('lecture')
    expect(await db.chantiers.get(C2)).toBeTruthy()
    expect(await enAttenteReleve(rb.id)).toBe(1)
    expect(res.lecture.gardesEnLecture).toEqual([rb.id])
    // Already sent stations stay on the server.
    const n = await compte(srv, `select count(*)::int as n from rt_objets where releve_id in ($1, $2) and type = 'station'`, [ra.id, rb.id])
    expect(n.n).toBe(4)
  })

  it('une réponse vide, partielle ou en échec ne retire rien', async () => {
    const { ctx } = await telephone(srv, P)
    const d = await depot.creerDomaine('Garde')
    const c = await depot.creerChantier(d.id, 'Chantier garde')
    await releveJeuB(c.id, 'Releve garde', 1)
    await envoyerTout(ctx)
    const avant = await db.releves.count()
    await lireServeur({ ...ctx, rpc: async (f, a) => (f === 'rt_mes_terrains' ? [] : ctx.rpc(f, a)) })
    await lireServeur({ ...ctx, rpc: async (f, a) => (f === 'rt_mes_terrains' ? [{ id: U(), nom: 'autre' }] : ctx.rpc(f, a)) })
    await expect(lireServeur({ ...ctx, rpc: async () => Promise.reject(new ErreurReseau('timeout')) })).rejects.toBeInstanceOf(ErreurReseau)
    expect(await db.releves.count()).toBe(avant)
    expect(await db.domaines.get(d.id)).toBeTruthy()
  })
})

describe('DR14 : second téléphone du même compte', () => {
  it('retrouve domaines, chantiers et relevés, à jour de la dernière donnée reçue', async () => {
    const t1 = await telephone(srv, P)
    const d = await depot.creerDomaine('Domaine DR14')
    const c = await depot.creerChantier(d.id, 'Chantier DR14')
    const r = await releveJeuB(c.id, 'Releve DR14', 3)
    await cycle(t1.rpc, { user_id: t1.o.user_id, appareil: t1.o.appareil })
    const parId = async () => Object.fromEntries((await db.objets.where('releve_id').equals(r.id).toArray()).map((o) => [o.id, o.donnees]))
    const objetsAvant = await parId()
    const enteteAvant = (await db.releves.get(r.id))!.entete
    // Second phone: empty, its own identity.
    await nouveauTelephone()
    const t2 = await telephone(srv, P)
    expect(t2.o.appareil.id).not.toBe(t1.o.appareil.id)
    await cycle(t2.rpc, { user_id: t2.o.user_id, appareil: t2.o.appareil })
    expect((await db.domaines.get(d.id))!.nom).toBe('Domaine DR14')
    expect((await db.chantiers.get(c.id))!.nom).toBe('Chantier DR14')
    const r2 = (await db.releves.get(r.id))!
    expect(r2.nom).toBe('Releve DR14')
    expect(r2.entete).toEqual(enteteAvant)
    expect(r2.saisie).toBe('ailleurs')
    expect(r2.detenteur?.appareil).toBe(t1.o.appareil.id)
    expect(r2.nb_stations).toBe(3)
    expect(r2.lu_donnee_at).toBe(r2.derniere_donnee_at)
    expect(await parId()).toEqual(objetsAvant)
    expect(await compterEnAttente()).toBe(0)
  })
})

describe('D28 : données saisies avant le compte', () => {
  it('rattachées au premier compte avec les mêmes identifiants', async () => {
    const d = await depot.creerDomaine('Avant le compte')
    const c = await depot.creerChantier(d.id, 'Chantier avant')
    const r = await releveJeuB(c.id, 'Releve avant', 3)
    expect((await db.domaines.get(d.id))!.proprietaire).toBe('local')
    const rpc = srv.rpc(P)
    await cycle(rpc)
    expect((await db.domaines.get(d.id))!.proprietaire).toBe(P)
    expect((await db.releves.get(r.id))!.cree_par).toBe(P)
    const dom = await compte<{ proprietaire: string }>(srv, `select proprietaire::text from rt_domaines where id = $1`, [d.id])
    expect(dom.proprietaire).toBe(P)
    expect((await compte(srv, `select count(*)::int as n from rt_chantiers where id = $1`, [c.id])).n).toBe(1)
    const rel = await compte<{ cree_par: string; detenteur_user: string }>(srv, `select cree_par::text, detenteur_user::text from rt_releves where id = $1`, [r.id])
    expect(rel).toEqual({ cree_par: P, detenteur_user: P })
    expect((await compte(srv, `select count(*)::int as n from rt_objets where releve_id = $1`, [r.id])).n).toBe(6)
    expect(await compterEnAttente()).toBe(0)
  })

  it('un identifiant refusé reçoit de nouveaux identifiants, renvoyés, sans perte, cas au journal', async () => {
    const d = await depot.creerDomaine('Domaine pris')
    const c = await depot.creerChantier(d.id, 'Chantier pris')
    const r = await releveJeuB(c.id, 'Releve pris', 3)
    const objetsAvant = (await db.objets.where('releve_id').equals(r.id).toArray()).length
    // The same id already used on the server by another account.
    await srv.rpc(C)('rt_ouvrir', { p_appareil: U(), p_libelle: 'tel C' })
    await srv.rpc(C)('rt_domaine_enregistrer', { p_id: d.id, p_nom: 'Domaine de C' })
    const res = await cycle(srv.rpc(P))
    expect(res.envoi.renouveles).toEqual([{ type: 'domaine', id: d.id, code: 'RT_NON_PROPRIETAIRE' }])
    expect(await db.domaines.get(d.id)).toBeUndefined()
    const domaines = await db.domaines.toArray()
    expect(domaines).toHaveLength(1)
    const nd = domaines[0]
    expect(nd.id).not.toBe(d.id)
    expect(nd.nom).toBe('Domaine pris')
    const nc = (await db.chantiers.toArray())[0]
    expect(nc.domaine_id).toBe(nd.id)
    expect(nc.id).not.toBe(c.id)
    const nr = (await db.releves.toArray())[0]
    expect(nr.id).not.toBe(r.id)
    expect(nr.chantier_id).toBe(nc.id)
    const objets = await db.objets.where('releve_id').equals(nr.id).toArray()
    // Every object kept, plus the journal object of the case.
    expect(objets.filter((o) => o.type !== 'journal')).toHaveLength(objetsAvant)
    const journal = objets.filter((o) => o.type === 'journal')
    expect(journal).toHaveLength(1)
    expect((journal[0].donnees as { action: string }).action).toBe('ids_renouveles')
    // Links kept: every sight points to a target of the new relevé.
    const bornes = new Set(objets.filter((o) => o.type === 'borne').map((o) => o.id))
    for (const o of objets.filter((x) => x.type === 'station')) for (const v of (o.donnees as { visees: { borne_id: string }[] }).visees) expect(bornes.has(v.borne_id)).toBe(true)
    // Sent with the new ids, the other account's domain untouched.
    expect((await compte<{ proprietaire: string }>(srv, `select proprietaire::text from rt_domaines where id = $1`, [nd.id])).proprietaire).toBe(P)
    expect((await compte<{ nom: string }>(srv, `select nom from rt_domaines where id = $1`, [d.id])).nom).toBe('Domaine de C')
    expect((await compte(srv, `select count(*)::int as n from rt_objets where releve_id = $1`, [nr.id])).n).toBe(objetsAvant + 1)
    expect(await compterEnAttente()).toBe(0)
    const cas = (await depot.lireCle('journal_envoi')) ?? []
    expect(cas.some((x) => x.cas === 'ids_renouveles')).toBe(true)
  })
})

describe('Suppression refusée par RT_RELEVE_TENU_AILLEURS', () => {
  it('les lignes supprimées reviennent sur le téléphone', async () => {
    const { rpc, ctx, o } = await telephone(srv, P)
    const d = await depot.creerDomaine('Domaine tenu')
    const c = await depot.creerChantier(d.id, 'Chantier tenu')
    await envoyerTout(ctx)
    // R relève dans ce chantier et tient la saisie de RR sur son téléphone.
    const inv = (await rpc('rt_invitation_creer', { p_domaine: d.id, p_chantiers: `{${c.id}}`, p_droit: 'relever' })) as { jeton: string }
    const aR = U()
    await srv.rpc(R)('rt_ouvrir', { p_appareil: aR, p_libelle: 'Itel' })
    await srv.rpc(R)('rt_invitation_accepter', { p_jeton: inv.jeton })
    const RR = U()
    await srv.rpc(R)('rt_releve_creer', { p_id: RR, p_chantier: c.id, p_appareil: aR, p_nom: 'RR', p_entete: {} })
    await lireServeur(ctx)
    expect((await db.releves.get(RR))!.saisie).toBe('ailleurs')
    // Deleted on the phone anyway (screen check bypassed): the server refuses.
    await depot.supprimerChantier(c.id)
    expect((await db.chantiers.get(c.id))!.supprime_at).not.toBeNull()
    const res = await cycle(rpc, { user_id: o.user_id, appareil: o.appareil })
    expect(res.envoi.restaures).toEqual([{ type: 'chantier', id: c.id, code: 'RT_RELEVE_TENU_AILLEURS' }])
    expect((await db.chantiers.get(c.id))!.supprime_at).toBeNull()
    expect((await db.releves.get(RR))!.supprime_at).toBeNull()
    expect((await compte<{ supprime_at: string | null }>(srv, `select supprime_at from rt_chantiers where id = $1`, [c.id])).supprime_at).toBeNull()
    const { messageTenuAilleurs } = await import('../messages')
    expect(messageTenuAilleurs((await db.releves.get(RR))!.detenteur)).toMatch(/^En saisie sur le téléphone de r depuis le \d{2}\/\d{2} à \d{2}:\d{2}\.$/)
    const cas = (await depot.lireCle('journal_envoi')) ?? []
    expect(cas.some((x) => x.cas === 'suppression_refusee')).toBe(true)
  })
})

describe('Délai dépassé puis nouvel essai', () => {
  it('les lignes restent en attente, partent au nouvel essai ; délais 5 s doublés jusqu’à 60 s', async () => {
    const { ctx } = await telephone(srv, P)
    const d = await depot.creerDomaine('Delai')
    const c = await depot.creerChantier(d.id, 'Chantier delai')
    await releveJeuB(c.id, 'Releve delai', 2)
    let premier = true
    const lent: Rpc = async (f, a) => {
      if (premier) {
        premier = false
        throw new ErreurReseau('timeout')
      }
      return ctx.rpc(f, a)
    }
    await expect(envoyerTout({ ...ctx, rpc: lent })).rejects.toBeInstanceOf(ErreurReseau)
    expect(await compterEnAttente()).toBeGreaterThan(0)
    await envoyerTout({ ...ctx, rpc: lent })
    expect(await compterEnAttente()).toBe(0)
    expect([1, 2, 3, 4, 5, 6].map(delaiReprise)).toEqual([5000, 10000, 20000, 40000, 60000, 60000])
  })

  it('un appel qui pend est coupé à 10 s', async () => {
    vi.useFakeTimers()
    try {
      const { avecDelai } = await import('../client')
      const p = avecDelai(new Promise(() => undefined))
      const attente = expect(p).rejects.toBeInstanceOf(ErreurReseau)
      await vi.advanceTimersByTimeAsync(10000)
      await attente
    } finally {
      vi.useRealTimers()
    }
  })
})
