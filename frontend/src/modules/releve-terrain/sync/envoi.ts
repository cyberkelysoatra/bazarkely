// Sending to the server (F8, PRD 6.10, D32). Reads the rows envoi = 'a_envoyer' and sends them in a fixed
// order: domains, work sites, relevés not yet known by the server, objects per relevé by saisi_at in
// batches of 500 (with the entete when the relevé row waits), deletions. A row becomes 'envoye' only after
// an OK answer (depot.marquerEnvoye, which keeps a row written meanwhile); a replay never duplicates (ids
// drawn on the phone, upsert on the server). A network failure stops the pass at once (the order holds:
// a work site is never sent before its domain). Answers about the input lock only suspend that relevé.
import { db } from '../db/base'
import * as depot from '../db/depot'
import type { Domaine, Objet, Releve, Saisie } from '../db/types'
import { ErreurReseau } from './client'
import { ErreurServeur, type Rpc } from './rpc'

export interface ContexteSync {
  rpc: Rpc
  appareil: { id: string; libelle: string }
  compteId: string
}

export const TAILLE_LOT = 500

/**
 * Local states that stop the sending of a relevé: held elsewhere, free, read-only after a withdrawn
 * right (DR10), taken over (except the rows typed before learning it, sent once, D19).
 */
export const SAISIES_SUSPENDUES: readonly Saisie[] = ['ailleurs', 'lecture', 'reprise', 'libre']

/** Server answers about the input lock and the local state they give. */
const SAISIE_DU_CODE: Record<string, Saisie> = { DROIT_RETIRE: 'lecture', SAISIE_REPRISE: 'reprise', PAS_LA_SAISIE: 'ailleurs', EN_SAISIE: 'ailleurs' }

export interface Restauration {
  type: 'releve' | 'chantier' | 'domaine'
  id: string
  code: string
}

export interface BilanEnvoi {
  appels: number
  marques: number
  suspendus: { releve: string; code: string }[]
  renouveles: { type: 'domaine' | 'releve' | 'objets'; id: string; code: string }[]
  restaures: Restauration[]
  /** Server refusals left as they are (row kept 'a_envoyer', written in the journal). */
  refus: { type: string; id: string; code: string }[]
}

function nom80(n: string): string {
  return n.trim().slice(0, 80)
}

function ref(table: depot.TableEnvoi, r: { id: string; maj_at: string }): depot.LigneLue {
  return { table, id: r.id, maj_at: r.maj_at }
}

function parCreation<T extends { cree_at: string; id: string }>(a: T, b: T): number {
  return a.cree_at.localeCompare(b.cree_at) || a.id.localeCompare(b.id)
}

function parSaisie(a: Objet, b: Objet): number {
  return a.saisi_at.localeCompare(b.saisi_at) || a.id.localeCompare(b.id)
}

function morceaux<T>(l: T[], n: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < l.length; i += n) out.push(l.slice(i, i + n))
  return out
}

/** A domain is the account's when it was made on this phone ('local') or owned by the account. */
function domaineAMoi(d: Domaine, compteId: string): boolean {
  return d.a_moi !== false && (d.proprietaire === 'local' || d.proprietaire === compteId)
}

async function enAttenteSous(releveIds: string[]): Promise<depot.LigneLue[]> {
  if (!releveIds.length) return []
  return (await db.objets.where('releve_id').anyOf(releveIds).toArray()).filter((o) => o.envoi === 'a_envoyer').map((o) => ref('objets', o))
}

/** Sends everything waiting. Throws ErreurReseau at the first network failure (rows stay 'a_envoyer'). */
export async function envoyerTout(ctx: ContexteSync): Promise<BilanEnvoi> {
  const bilan: BilanEnvoi = { appels: 0, marques: 0, suspendus: [], renouveles: [], restaures: [], refus: [] }
  // New ids drawn (D28, RT_ID_PRIS): the pass starts again with them.
  for (let passe = 0; passe < 5; passe++) {
    if (!(await unePasse(ctx, bilan))) break
  }
  return bilan
}

async function unePasse(ctx: ContexteSync, bilan: BilanEnvoi): Promise<boolean> {
  const appel = async (fonction: string, args: Record<string, unknown>): Promise<unknown> => {
    bilan.appels++
    return ctx.rpc(fonction, args)
  }
  const marquer = async (lignes: depot.LigneLue[]) => {
    bilan.marques += await depot.marquerEnvoye(lignes)
  }
  const refuser = async (type: string, id: string, code: string) => {
    bilan.refus.push({ type, id, code })
    await depot.ajouterJournalEnvoi({ cas: 'envoi_suspendu', detail: { type, id, code } })
  }
  const renouvelerDomaine = async (d: Domaine, code: string) => {
    const m = await depot.renouvelerIdsDomaine(d.id, code)
    bilan.renouveles.push({ type: 'domaine', id: d.id, code })
    await depot.ajouterJournalEnvoi({ cas: 'ids_renouveles', detail: { domaine: d.id, nouveau: m.get(d.id), code, ids: m.size } })
  }
  const suspendre = async (r: Releve, saisie: Saisie, code: string) => {
    await depot.appliquerServeur({ etats: [{ id: r.id, saisie }] })
    bilan.suspendus.push({ releve: r.id, code })
    await depot.ajouterJournalEnvoi({ cas: 'envoi_suspendu', detail: { releve: r.id, code } })
  }
  const serveur = (e: unknown): ErreurServeur => {
    if (e instanceof ErreurServeur) return e
    throw e instanceof ErreurReseau ? e : new ErreurReseau(e instanceof Error ? e.message : String(e))
  }

  // 1. Domains.
  const domaines = (await db.domaines.toArray()).filter((d) => d.envoi === 'a_envoyer' && !d.supprime_at && domaineAMoi(d, ctx.compteId)).sort(parCreation)
  for (const d of domaines) {
    try {
      await appel('rt_domaine_enregistrer', { p_id: d.id, p_nom: nom80(d.nom) })
      await marquer([ref('domaines', d)])
    } catch (e) {
      const { code } = serveur(e)
      if (code === 'RT_NON_PROPRIETAIRE' || code === 'RT_ID_PRIS') {
        await renouvelerDomaine(d, code)
        return true
      }
      if (code === 'RT_SUPPRIME') await marquer([ref('domaines', d)])
      await refuser('domaine', d.id, code)
    }
  }

  // 2. Work sites, never before their domain.
  const chantiers = (await db.chantiers.toArray()).filter((c) => c.envoi === 'a_envoyer' && !c.supprime_at).sort(parCreation)
  for (const c of chantiers) {
    const d = await db.domaines.get(c.domaine_id)
    if (!d || d.supprime_at || !domaineAMoi(d, ctx.compteId) || d.envoi !== 'envoye') continue
    try {
      await appel('rt_chantier_enregistrer', { p_id: c.id, p_domaine: c.domaine_id, p_nom: nom80(c.nom) })
      await marquer([ref('chantiers', c)])
    } catch (e) {
      const { code } = serveur(e)
      if (code === 'RT_NON_PROPRIETAIRE' || code === 'RT_ID_PRIS') {
        await renouvelerDomaine(d, code)
        return true
      }
      if (code === 'RT_SUPPRIME') await marquer([ref('chantiers', c)])
      await refuser('chantier', c.id, code)
    }
  }

  // 3. Relevés not yet known by the server, created by this account or before it: the creating phone holds the input.
  const nouveaux = (await db.releves.toArray())
    .filter((r) => !r.supprime_at && !r.serveur_connu && (r.cree_par === 'local' || r.cree_par === ctx.compteId))
    .sort(parCreation)
  for (const r of nouveaux) {
    if (r.saisie && SAISIES_SUSPENDUES.includes(r.saisie)) continue
    const c = await db.chantiers.get(r.chantier_id)
    if (!c || c.supprime_at || c.envoi !== 'envoye') continue
    try {
      await appel('rt_releve_creer', { p_id: r.id, p_chantier: r.chantier_id, p_appareil: ctx.appareil.id, p_nom: nom80(r.nom), p_entete: { ...r.entete, nom: nom80(r.nom) } })
      await depot.appliquerServeur({ etats: [{ id: r.id, serveur_connu: true, saisie: r.saisie === 'fin_en_attente' ? 'fin_en_attente' : 'ici' }] })
      await marquer([ref('releves', r)])
    } catch (e) {
      const { code } = serveur(e)
      if (code === 'RT_ID_PRIS') {
        await depot.renouvelerIdsReleve(r.id, code)
        bilan.renouveles.push({ type: 'releve', id: r.id, code })
        await depot.ajouterJournalEnvoi({ cas: 'ids_renouveles', detail: { releve: r.id, code } })
        return true
      }
      // The phone must be registered first (rt_ouvrir): replayed at the next cycle.
      if (code === 'RT_APPAREIL_INCONNU') throw new ErreurReseau(code)
      if (code === 'RT_DROIT_INSUFFISANT' || code === 'RT_INCONNU') await suspendre(r, 'lecture', code)
      else await refuser('releve', r.id, code)
    }
  }

  // 4. Objects of the relevés known by the server, by saisi_at, in batches of 500, with the entete when it waits.
  const connus = (await db.releves.toArray()).filter((r) => !r.supprime_at && r.serveur_connu).sort(parCreation)
  for (const r of connus) {
    // D19: after a take-over, the old phone still sends what it typed before learning it, then acknowledges.
    let solder = r.reprise_a_accuser === true
    if (!solder && r.saisie && SAISIES_SUSPENDUES.includes(r.saisie)) continue
    const attente = (await db.objets.where('releve_id').equals(r.id).toArray()).filter((o) => o.envoi === 'a_envoyer').sort(parSaisie)
    const avecEntete = r.envoi === 'a_envoyer'
    const finir = !solder && r.terminer_demande === true
    if (!attente.length && !avecEntete && !solder && !finir) continue
    const lots = morceaux(attente, TAILLE_LOT)
    if (!lots.length && avecEntete) lots.push([])
    let arret = false
    for (let i = 0; i < lots.length && !arret; i++) {
      const lot = lots[i]
      let rep: { ok?: boolean; code?: string; apres_reprise?: boolean; reprise_at?: string | null }
      try {
        rep = ((await appel('rt_envoyer', {
          p_releve: r.id,
          p_appareil: ctx.appareil.id,
          p_objets: lot.map((o) => ({ id: o.id, type: o.type, donnees: o.donnees, supprime: o.supprime, saisi_at: o.saisi_at })),
          p_entete: i === 0 && avecEntete ? { ...r.entete, nom: nom80(r.nom) } : null,
        })) ?? {}) as typeof rep
      } catch (e) {
        const { code } = serveur(e)
        if (code === 'RT_ID_PRIS') {
          // Ids of this batch already used in another relevé: new ids for those the server does not have here.
          const lu = (await appel('rt_releve_lire', { p_releve: r.id })) as { objets?: { id: string }[] } | null
          const surServeur = new Set((lu?.objets ?? []).map((o) => o.id))
          const pris = lot.filter((o) => !surServeur.has(o.id)).map((o) => o.id)
          await depot.renouvelerIdsReleve(r.id, code, pris)
          bilan.renouveles.push({ type: 'objets', id: r.id, code })
          await depot.ajouterJournalEnvoi({ cas: 'ids_renouveles', detail: { releve: r.id, objets: pris.length, code } })
          return true
        }
        if (code === 'RT_INCONNU') await suspendre(r, 'lecture', code)
        else await refuser('objets', r.id, code)
        arret = true
        break
      }
      if (rep.ok !== true) {
        const code = rep.code ?? 'REFUSE'
        await suspendre(r, SAISIE_DU_CODE[code] ?? 'ailleurs', code)
        // Already acknowledged (another tab, an older pass): nothing more of this phone enters.
        if (code === 'SAISIE_REPRISE') await depot.appliquerServeur({ etats: [{ id: r.id, reprise_a_accuser: false, terminer_demande: null }] })
        arret = true
      } else {
        // Accepted, marked « arrivé après reprise » by the server when it is late (D19): sent either way.
        await marquer(lot.map((o) => ref('objets', o)))
        if (rep.apres_reprise === true && !solder) {
          solder = true
          await depot.appliquerServeur({ etats: [{ id: r.id, saisie: 'reprise', reprise_a_accuser: true, reprise_at: rep.reprise_at ?? null, terminer_demande: null }] })
          await depot.ajouterJournalEnvoi({ cas: 'envoi_suspendu', detail: { releve: r.id, code: 'APRES_REPRISE' } })
        }
      }
    }
    if (arret) continue
    if (avecEntete) await marquer([ref('releves', r)])
    if (solder) {
      // Everything typed before learning the take-over has left: the old phone acknowledges (D19).
      const reste = (await db.objets.where('releve_id').equals(r.id).toArray()).some((o) => o.envoi === 'a_envoyer')
      if (reste) continue
      try {
        await appel('rt_reprise_accuser', { p_releve: r.id, p_appareil: ctx.appareil.id })
      } catch (e) {
        await refuser('reprise', r.id, serveur(e).code)
        continue
      }
      await depot.appliquerServeur({ etats: [{ id: r.id, saisie: 'reprise', reprise_a_accuser: false, terminer_demande: null }] })
      await depot.ajouterJournalEnvoi({ cas: 'reprise_accusee', detail: { releve: r.id } })
      continue
    }
    if (finir) {
      // H28: rt_saisie_terminer last, only once every row of the relevé is on the server.
      const frais = await db.releves.get(r.id)
      const reste = (await db.objets.where('releve_id').equals(r.id).toArray()).some((o) => o.envoi === 'a_envoyer')
      if (!frais || frais.envoi === 'a_envoyer' || reste || frais.terminer_demande !== true) continue
      try {
        await appel('rt_saisie_terminer', { p_releve: r.id, p_appareil: ctx.appareil.id })
      } catch (e) {
        await refuser('fin_saisie', r.id, serveur(e).code)
        continue
      }
      await depot.appliquerServeur({ etats: [{ id: r.id, saisie: 'libre', terminer_demande: null, detenteur: null }] })
      await depot.ajouterJournalEnvoi({ cas: 'saisie_terminee', detail: { releve: r.id } })
    }
  }

  // 5. Deletions: relevés, work sites, domains. A relevé or a work site deleted with its parent goes with it.
  const enAttenteSuppression = <T extends { supprime_at: string | null; envoi: string }>(x: T | undefined): x is T => !!x && !!x.supprime_at && x.envoi === 'a_envoyer'

  for (const r of (await db.releves.toArray()).filter(enAttenteSuppression)) {
    if (enAttenteSuppression(await db.chantiers.get(r.chantier_id))) continue
    const lignes = [ref('releves', r), ...(await enAttenteSous([r.id]))]
    if (!r.serveur_connu) {
      await marquer(lignes)
      continue
    }
    try {
      await appel('rt_releve_supprimer', { p_releve: r.id, p_appareil: ctx.appareil.id })
      await marquer(lignes)
    } catch (e) {
      const { code } = serveur(e)
      if (code === 'RT_INCONNU') await marquer(lignes)
      else await restaurer(bilan, { type: 'releve', id: r.id, code }, { releves: [r.id] })
    }
  }

  for (const c of (await db.chantiers.toArray()).filter(enAttenteSuppression)) {
    if (enAttenteSuppression(await db.domaines.get(c.domaine_id))) continue
    const releves = (await db.releves.where('chantier_id').equals(c.id).toArray()).filter(enAttenteSuppression)
    const lignes = [ref('chantiers', c), ...releves.map((r) => ref('releves', r)), ...(await enAttenteSous(releves.map((r) => r.id)))]
    try {
      await appel('rt_chantier_supprimer', { p_id: c.id, p_appareil: ctx.appareil.id })
      await marquer(lignes)
    } catch (e) {
      const { code } = serveur(e)
      if (code === 'RT_INCONNU') await marquer(lignes)
      else await restaurer(bilan, { type: 'chantier', id: c.id, code }, { chantiers: [c.id], releves: releves.filter((r) => r.supprime_at === c.supprime_at).map((r) => r.id) })
    }
  }

  for (const d of (await db.domaines.toArray()).filter(enAttenteSuppression)) {
    const chs = (await db.chantiers.where('domaine_id').equals(d.id).toArray()).filter(enAttenteSuppression)
    const releves = chs.length ? (await db.releves.where('chantier_id').anyOf(chs.map((c) => c.id)).toArray()).filter(enAttenteSuppression) : []
    const lignes = [ref('domaines', d), ...chs.map((c) => ref('chantiers', c)), ...releves.map((r) => ref('releves', r)), ...(await enAttenteSous(releves.map((r) => r.id)))]
    if (!domaineAMoi(d, ctx.compteId)) continue
    try {
      await appel('rt_domaine_supprimer', { p_id: d.id, p_appareil: ctx.appareil.id })
      await marquer(lignes)
    } catch (e) {
      const { code } = serveur(e)
      if (code === 'RT_INCONNU') await marquer(lignes)
      else
        await restaurer(
          bilan,
          { type: 'domaine', id: d.id, code },
          {
            domaines: [d.id],
            chantiers: chs.filter((c) => c.supprime_at === d.supprime_at).map((c) => c.id),
            releves: releves.filter((r) => r.supprime_at === d.supprime_at).map((r) => r.id),
          },
        )
    }
  }
  return false
}

/** Deletion refused by the server (RT_RELEVE_TENU_AILLEURS...): the deleted rows come back on the phone. */
async function restaurer(bilan: BilanEnvoi, r: Restauration, ids: depot.IdsTerrains): Promise<void> {
  await depot.appliquerServeur({ restaurer: ids })
  bilan.restaures.push(r)
  await depot.ajouterJournalEnvoi({ cas: 'suppression_refusee', detail: { ...r, ids } })
}
