// Reading the server (H24, H29 reading part, DR11, DR14). rt_mes_terrains gives the domains and work
// sites of the account (and, already, those shared with it, with their right, for phase 4) and the
// summaries of the relevés (author, holder, last data received, number of stations); they are written
// through depot.appliquerServeur. The objects of a relevé this phone does not hold come from
// rt_releve_lire; a local row 'a_envoyer' is never overwritten. What the server no longer returns after a
// COMPLETE answer is removed from the phone, except what still has rows 'a_envoyer' (kept, read-only,
// exportable); an empty, partial or failed answer never removes anything.
import { db } from '../db/base'
import * as depot from '../db/depot'
import type { Detenteur, Droit, TypeObjet } from '../db/types'
import type { ContexteSync } from './envoi'
import { ErreurServeur } from './rpc'

const DROITS: Droit[] = ['proprietaire', 'relever', 'consulter']
const TYPES: TypeObjet[] = ['borne', 'cote', 'station', 'point_plan', 'journal']

export interface BilanLecture {
  complete: boolean
  domaines: number
  chantiers: number
  releves: number
  /** Relevés whose objects were read (rt_releve_lire). */
  lus: string[]
  gardesEnLecture: string[]
  retires: { domaines: number; chantiers: number; releves: number }
}

type Brut = Record<string, unknown>

const estObjet = (v: unknown): v is Brut => typeof v === 'object' && v !== null && !Array.isArray(v)
const texte = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

function detenteur(v: unknown): Detenteur | null {
  if (!estObjet(v) || !texte(v.user_id) || !texte(v.appareil)) return null
  return {
    user_id: v.user_id as string,
    nom: texte(v.nom) ?? 'compte',
    appareil: v.appareil as string,
    appareil_libelle: texte(v.appareil_libelle),
    depuis: texte(v.depuis) ?? new Date().toISOString(),
    moi: v.moi === true,
  }
}

/** A relevé summary (rt_releve_resume) checked and turned into the shape of the phone, or null. */
export function releveDepuisResume(v: unknown, chantierId?: string): depot.ReleveServeur | null {
  if (!estObjet(v) || !texte(v.id) || !texte(v.nom)) return null
  const chantier = texte(v.chantier_id) ?? chantierId
  if (!chantier) return null
  const nom = v.nom as string
  return {
    id: v.id as string,
    chantier_id: chantier,
    nom,
    entete: depot.enteteDepuis(nom, v.entete),
    cree_par: texte(v.cree_par) ?? '',
    cree_par_nom: texte(v.cree_par_nom) ?? undefined,
    cree_at: texte(v.cree_at) ?? new Date().toISOString(),
    maj_at: texte(v.maj_at) ?? new Date().toISOString(),
    saisie: detenteur(v.saisie),
    derniere_donnee_at: texte(v.derniere_donnee_at),
    nb_stations: typeof v.nb_stations === 'number' ? v.nb_stations : undefined,
  }
}

export interface Terrains {
  complete: boolean
  domaines: depot.DomaineServeur[]
  chantiers: depot.ChantierServeur[]
  releves: depot.ReleveServeur[]
}

/** Checks the answer of rt_mes_terrains: complete only when every domain, work site and relevé is readable. */
export function analyserTerrains(rep: unknown): Terrains {
  const t: Terrains = { complete: Array.isArray(rep), domaines: [], chantiers: [], releves: [] }
  if (!Array.isArray(rep)) return t
  for (const d of rep) {
    if (!estObjet(d) || !texte(d.id) || !texte(d.nom) || !Array.isArray(d.chantiers)) {
      t.complete = false
      continue
    }
    t.domaines.push({ id: d.id as string, nom: d.nom as string, a_moi: d.a_moi === true, proprietaire_nom: texte(d.proprietaire_nom) ?? undefined })
    for (const c of d.chantiers as unknown[]) {
      if (!estObjet(c) || !texte(c.id) || !texte(c.nom) || !Array.isArray(c.releves)) {
        t.complete = false
        continue
      }
      const droit = DROITS.includes(c.droit as Droit) ? (c.droit as Droit) : null
      t.chantiers.push({ id: c.id as string, domaine_id: d.id as string, nom: c.nom as string, droit })
      for (const r of c.releves as unknown[]) {
        const s = releveDepuisResume(r, c.id as string)
        if (s) t.releves.push(s)
        else t.complete = false
      }
    }
  }
  return t
}

/** What the phone holds that the server did not return (only rows already sent, never 'local' ones). */
async function aRetirer(t: Terrains): Promise<depot.IdsTerrains> {
  const domainesServeur = new Set(t.domaines.map((d) => d.id))
  const chantiersServeur = new Set(t.chantiers.map((c) => c.id))
  const relevesServeur = new Set(t.releves.map((r) => r.id))
  const [domaines, chantiers, releves] = await Promise.all([db.domaines.toArray(), db.chantiers.toArray(), db.releves.toArray()])
  return {
    domaines: domaines.filter((d) => d.envoi === 'envoye' && d.proprietaire !== 'local' && !domainesServeur.has(d.id)).map((d) => d.id),
    chantiers: chantiers.filter((c) => c.envoi === 'envoye' && domainesServeur.has(c.domaine_id) && !chantiersServeur.has(c.id)).map((c) => c.id),
    releves: releves.filter((r) => r.serveur_connu && chantiersServeur.has(r.chantier_id) && !relevesServeur.has(r.id)).map((r) => r.id),
  }
}

/** Reads the objects of one relevé and keeps a local copy (rows 'a_envoyer' untouched). */
export async function lireReleve(ctx: ContexteSync, releveId: string): Promise<boolean> {
  let rep: unknown
  try {
    rep = await ctx.rpc('rt_releve_lire', { p_releve: releveId })
  } catch (e) {
    // No longer visible: the next rt_mes_terrains decides (DR11).
    if (e instanceof ErreurServeur) return false
    throw e
  }
  const s = releveDepuisResume(rep)
  if (!s || !estObjet(rep)) return false
  const objets: depot.ObjetServeur[] = []
  for (const o of Array.isArray(rep.objets) ? rep.objets : []) {
    if (!estObjet(o) || !texte(o.id) || !TYPES.includes(o.type as TypeObjet) || !estObjet(o.donnees)) continue
    objets.push({
      id: o.id as string,
      releve_id: releveId,
      type: o.type as TypeObjet,
      donnees: o.donnees,
      supprime: o.supprime === true,
      saisi_at: texte(o.saisi_at),
      recu_at: texte(o.recu_at) ?? undefined,
      apres_reprise: o.apres_reprise === true,
    })
  }
  // The work site and its right come from rt_mes_terrains; without it on the phone, nothing to attach to.
  if (!(await db.chantiers.get(s.chantier_id))) return false
  await depot.appliquerServeur({
    compteId: ctx.compteId,
    appareilId: ctx.appareil.id,
    releves: [s],
    objets,
    etats: [{ id: releveId, lu_donnee_at: s.derniere_donnee_at ?? null }],
  })
  return true
}

/** rt_mes_terrains, then the objects of the relevés this phone does not hold that changed on the server. */
export async function lireServeur(ctx: ContexteSync): Promise<BilanLecture> {
  const rep = await ctx.rpc('rt_mes_terrains', {})
  const t = analyserTerrains(rep)
  const retirer = t.complete && t.domaines.length > 0 ? await aRetirer(t) : undefined
  const b = await depot.appliquerServeur({ compteId: ctx.compteId, appareilId: ctx.appareil.id, domaines: t.domaines, chantiers: t.chantiers, releves: t.releves, retirer })
  const lus: string[] = []
  for (const s of t.releves) {
    const l = await db.releves.get(s.id)
    if (!l || l.saisie === 'ici') continue
    const aJour = l.lu_donnee_at !== undefined && l.lu_donnee_at === (s.derniere_donnee_at ?? null)
    if (aJour) continue
    if (await lireReleve(ctx, s.id)) lus.push(s.id)
  }
  return { complete: t.complete, domaines: t.domaines.length, chantiers: t.chantiers.length, releves: t.releves.length, lus, gardesEnLecture: b.gardesEnLecture, retires: b.retires }
}
