// Input lock of a relevé (F14, H27, H28, PRD 6.10): take, take over (owner only), finish. Taking and
// taking over need the network (the server must know who holds it); finishing is recorded on the phone
// and leaves with the sending (rt_saisie_terminer last, sync/envoi.ts). Each action takes a sync context
// (the page engine's one, or the tests' one) and returns { ok } or the message to show.
import { db } from '../db/base'
import * as depot from '../db/depot'
import { ErreurReseau } from './client'
import type { ContexteSync } from './envoi'
import { detenteurDepuis, lireReleve } from './lecture'
import { MESSAGE_REPRISE_PROPRIETAIRE, MESSAGE_RESEAU_PRENDRE, messageTenuAilleurs } from './messages'
import { classerErreur } from './rpc'

export type ResultatSaisie = { ok: true } | { ok: false; message: string }

const MESSAGE_CONSULTER = 'Vous pouvez consulter ce relevé, pas y relever.'
const MESSAGE_INCONNU = "Ce relevé n'existe plus sur le serveur."

function refus(e: unknown): ResultatSaisie {
  const x = classerErreur(e)
  if (x instanceof ErreurReseau) return { ok: false, message: MESSAGE_RESEAU_PRENDRE }
  if (x.code === 'RT_DROIT_INSUFFISANT') return { ok: false, message: MESSAGE_CONSULTER }
  if (x.code === 'RT_REPRISE_PROPRIETAIRE_SEUL') return { ok: false, message: MESSAGE_REPRISE_PROPRIETAIRE }
  if (x.code === 'RT_INCONNU') return { ok: false, message: MESSAGE_INCONNU }
  return { ok: false, message: `Refusé par le serveur (${x.code}).` }
}

/** The input is now held here: the server's objects first (never over a waiting row), then the state. */
async function tenirIci(ctx: ContexteSync, releveId: string): Promise<void> {
  await lireReleve(ctx, releveId)
  const r = await db.releves.get(releveId)
  await depot.appliquerServeur({
    etats: [
      {
        id: releveId,
        saisie: 'ici',
        terminer_demande: null,
        reprise_a_accuser: false,
        detenteur: r?.detenteur && r.detenteur.appareil === ctx.appareil.id ? r.detenteur : { user_id: ctx.compteId, nom: '', appareil: ctx.appareil.id, appareil_libelle: ctx.appareil.libelle, depuis: depot.maintenant(), moi: true },
      },
    ],
  })
}

/** H27: « Prendre la saisie » of an existing relevé. Refused without network, or when another phone holds it. */
export async function prendreSaisie(ctx: ContexteSync | null, releveId: string): Promise<ResultatSaisie> {
  if (!ctx) return { ok: false, message: MESSAGE_RESEAU_PRENDRE }
  let rep: { ok?: boolean; code?: string; saisie?: unknown }
  try {
    rep = ((await ctx.rpc('rt_saisie_prendre', { p_releve: releveId, p_appareil: ctx.appareil.id })) ?? {}) as typeof rep
  } catch (e) {
    return refus(e)
  }
  if (rep.ok === true) {
    await tenirIci(ctx, releveId)
    return { ok: true }
  }
  // EN_SAISIE: shown in read-only with the holder (H27).
  const det = detenteurDepuis(rep.saisie)
  await depot.appliquerServeur({ etats: [{ id: releveId, saisie: 'ailleurs', detenteur: det }] })
  return { ok: false, message: messageTenuAilleurs(det) }
}

/** 6.10: the owner, and only him, takes the input over from another phone (after the warning). */
export async function reprendreSaisie(ctx: ContexteSync | null, releveId: string): Promise<ResultatSaisie> {
  if (!ctx) return { ok: false, message: MESSAGE_RESEAU_PRENDRE }
  try {
    await ctx.rpc('rt_saisie_reprendre', { p_releve: releveId, p_appareil: ctx.appareil.id })
  } catch (e) {
    return refus(e)
  }
  await tenirIci(ctx, releveId)
  return { ok: true }
}

/** H28: « Terminer la saisie » recorded; the engine sends what waits, then releases the input. */
export async function terminerSaisie(releveId: string): Promise<void> {
  await depot.demanderFinSaisie(releveId)
}
