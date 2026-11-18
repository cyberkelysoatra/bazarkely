// Sharing (F13, H25, H26, PRD 6.8 and section 8): invitation by a one-time link without time limit,
// preview without session, acceptance, who has access, change of right, withdrawal. Server functions
// rt_invitation_*, rt_acces, rt_partage_* (SUPABASE-SQL.md section 3): the server is the only real
// protection; these functions only call it and turn its answers into the screens' words. The token is
// returned once by rt_invitation_creer and never stored on the phone by this module (except, during the
// Google redirect, by the invitation screen, removed after use).
import type { Droit } from '../db/types'
import { ErreurReseau } from './client'
import { classerErreur, type Rpc } from './rpc'

export type DroitPartage = Exclude<Droit, 'proprietaire'>

export const MESSAGE_PLUS_VALABLE = "Invitation plus valable : elle a déjà été acceptée ou elle a été retirée. Demandez-en une nouvelle au propriétaire."
export const MESSAGE_PROPRE_INVITATION = "C'est votre propre invitation."
export const MESSAGE_RESERVE_PROPRIETAIRE = 'Réservé au propriétaire du domaine.'
export const MESSAGE_RESEAU_PARTAGE = 'Il faut du réseau pour partager : réessayez avec du réseau.'
export const MESSAGE_RESEAU_INVITATION = "Il faut du réseau pour lire l'invitation."
export const MESSAGE_PAS_ENVOYE = "Ce domaine n'est pas encore sur le serveur : attendez le réseau, il partira tout seul, puis recommencez."
export const MESSAGE_UNE_FOIS = "Ce lien sert une seule fois. Il reste valable tant que personne ne l'a accepté et que vous ne l'avez pas retiré."
export const MESSAGE_CUMUL = "Un même compte peut recevoir plusieurs partages. Le plus précis l'emporte : un chantier partagé à part garde son propre droit."
export const MESSAGE_DROITS = 'Consulter : voir, exporter. Relever : caler, saisir des stations, créer ses relevés.'
export const MESSAGE_CHANGER_DROIT = "Sa saisie en cours sera libérée et ses saisies non envoyées n'entreront pas."

/** Address of an invitation link (screen 18). */
export function lienInvitation(jeton: string, origine = 'https://1sakely.org'): string {
  return `${origine}/releve/i/${jeton}`
}

/** « A », « A et B », « A, B et C ». */
export function enumerer(noms: string[]): string {
  if (noms.length <= 1) return noms[0] ?? ''
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`
}

/** What is shared, in words: « tout le domaine » or the work sites. */
export function portee(chantiers: string[] | null): string {
  return chantiers === null ? 'tout le domaine' : enumerer(chantiers)
}

/** Text of the WhatsApp message (3.1). No em dash, no en dash, no middle dot. */
export function messageInvitation(p: { domaine: string; chantiers: string[] | null; droit: DroitPartage; jeton: string; origine?: string }): string {
  return [
    '*RELEVÉ TERRAIN : INVITATION*',
    '',
    `Je vous partage ${portee(p.chantiers)} (${p.domaine}), droit « ${p.droit} ». Ouvrez ce lien et connectez-vous à 1sakely.org :`,
    lienInvitation(p.jeton, p.origine),
  ].join('\n')
}

export type Resultat<T> = { ok: true; valeur: T } | { ok: false; message: string; code?: string }

function refus(e: unknown): { ok: false; message: string; code?: string } {
  const x = classerErreur(e)
  if (x instanceof ErreurReseau) return { ok: false, message: MESSAGE_RESEAU_PARTAGE }
  switch (x.code) {
    case 'RT_INVITATION_PLUS_VALABLE':
      return { ok: false, message: MESSAGE_PLUS_VALABLE, code: x.code }
    case 'RT_INVITATION_PROPRIETAIRE':
      return { ok: false, message: MESSAGE_PROPRE_INVITATION, code: x.code }
    case 'RT_NON_PROPRIETAIRE':
      return { ok: false, message: MESSAGE_RESERVE_PROPRIETAIRE, code: x.code }
    case 'RT_INCONNU':
    case 'RT_CHANTIER_HORS_DOMAINE':
      return { ok: false, message: MESSAGE_PAS_ENVOYE, code: x.code }
    default:
      return { ok: false, message: `Refusé par le serveur (${x.code}).`, code: x.code }
  }
}

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const texte = (v: unknown): string => (typeof v === 'string' ? v : '')
const droitDe = (v: unknown): DroitPartage => (v === 'relever' ? 'relever' : 'consulter')

/** H25: the owner prepares an invitation (whole domain when `chantiers` is null). The token comes back once. */
export async function creerInvitation(rpc: Rpc, domaineId: string, chantiers: string[] | null, droit: DroitPartage): Promise<Resultat<{ invitationId: string; jeton: string }>> {
  try {
    const rep = await rpc('rt_invitation_creer', { p_domaine: domaineId, p_chantiers: chantiers === null ? null : `{${chantiers.join(',')}}`, p_droit: droit })
    if (!estObjet(rep) || !texte(rep.jeton)) return { ok: false, message: MESSAGE_RESEAU_PARTAGE }
    return { ok: true, valeur: { invitationId: texte(rep.invitation_id), jeton: texte(rep.jeton) } }
  } catch (e) {
    return refus(e)
  }
}

export interface Apercu {
  valide: boolean
  proprietaire: string
  domaine: string
  /** null: whole domain. */
  chantiers: string[] | null
  droit: DroitPartage
}

/** Screen 18 without session (anonymous call). An unknown, used or withdrawn link is `valide: false`. */
export async function apercuInvitation(rpc: Rpc, jeton: string): Promise<Resultat<Apercu>> {
  try {
    const rep = await rpc('rt_invitation_apercu', { p_jeton: jeton })
    if (!estObjet(rep) || rep.valide !== true) return { ok: true, valeur: { valide: false, proprietaire: '', domaine: '', chantiers: [], droit: 'consulter' } }
    return {
      ok: true,
      valeur: {
        valide: true,
        proprietaire: texte(rep.proprietaire_nom) || 'compte',
        domaine: texte(rep.domaine_nom),
        chantiers: rep.domaine_entier === true ? null : Array.isArray(rep.chantiers) ? rep.chantiers.map(texte).filter(Boolean) : [],
        droit: droitDe(rep.droit),
      },
    }
  } catch (e) {
    const r = refus(e)
    return r.message === MESSAGE_RESEAU_PARTAGE ? { ok: false, message: MESSAGE_RESEAU_INVITATION } : r
  }
}

/** Acceptance by the signed-in account (DR1, DR13, DR17). */
export async function accepterInvitation(rpc: Rpc, jeton: string): Promise<Resultat<{ domaineId: string }>> {
  try {
    const rep = await rpc('rt_invitation_accepter', { p_jeton: jeton })
    if (!estObjet(rep) || rep.ok !== true) return { ok: false, message: MESSAGE_PLUS_VALABLE }
    return { ok: true, valeur: { domaineId: texte(rep.domaine_id) } }
  } catch (e) {
    return refus(e)
  }
}

export interface LignePartage {
  id: string
  inviteId: string
  inviteNom: string
  /** null: whole domain. */
  chantierId: string | null
  chantierNom: string | null
  droit: DroitPartage
}

export interface InvitationAttente {
  id: string
  droit: DroitPartage
  /** null: whole domain. */
  chantiers: string[] | null
  creeAt: string
}

export interface CompteAcces {
  inviteId: string
  inviteNom: string
  /** Whole domain first, then the work sites. */
  lignes: LignePartage[]
  /** « Sur <chantier>, <nom> ne fait que consulter : ... » when a work site line and a domain line coexist. */
  precisions: string[]
}

export interface Acces {
  comptes: CompteAcces[]
  invitations: InvitationAttente[]
}

/** Line « le plus précis l'emporte » (6.8) for a work site line next to a whole domain line. */
export function precision(chantier: string, nom: string, droit: DroitPartage): string {
  return `Sur ${chantier}, ${nom} ne fait que ${droit} : le partage du chantier passe avant celui du domaine.`
}

/** Screen 17: active shares grouped by account, and pending invitations (owner only). */
export async function lireAcces(rpc: Rpc, domaineId: string): Promise<Resultat<Acces>> {
  let rep: unknown
  try {
    rep = await rpc('rt_acces', { p_domaine: domaineId })
  } catch (e) {
    return refus(e)
  }
  const partages = estObjet(rep) && Array.isArray(rep.partages) ? rep.partages.filter(estObjet) : []
  const invitations = estObjet(rep) && Array.isArray(rep.invitations) ? rep.invitations.filter(estObjet) : []
  const comptes = new Map<string, CompteAcces>()
  for (const p of partages) {
    const ligne: LignePartage = {
      id: texte(p.id),
      inviteId: texte(p.invite_id),
      inviteNom: texte(p.invite_nom) || 'compte',
      chantierId: texte(p.chantier_id) || null,
      chantierNom: texte(p.chantier_nom) || null,
      droit: droitDe(p.droit),
    }
    const c = comptes.get(ligne.inviteId) ?? { inviteId: ligne.inviteId, inviteNom: ligne.inviteNom, lignes: [], precisions: [] }
    c.lignes.push(ligne)
    comptes.set(ligne.inviteId, c)
  }
  for (const c of comptes.values()) {
    c.lignes.sort((a, b) => (a.chantierId === null ? -1 : b.chantierId === null ? 1 : (a.chantierNom ?? '').localeCompare(b.chantierNom ?? '')))
    if (c.lignes.some((l) => l.chantierId === null)) {
      for (const l of c.lignes) if (l.chantierId !== null) c.precisions.push(precision(l.chantierNom ?? 'ce chantier', c.inviteNom, l.droit))
    }
  }
  return {
    ok: true,
    valeur: {
      comptes: [...comptes.values()],
      invitations: invitations.map((i) => ({
        id: texte(i.id),
        droit: droitDe(i.droit),
        chantiers: i.domaine_entier === true ? null : Array.isArray(i.chantiers) ? i.chantiers.map(texte).filter(Boolean) : [],
        creeAt: texte(i.cree_at),
      })),
    },
  }
}

async function simple(rpc: Rpc, fonction: string, args: Record<string, unknown>): Promise<Resultat<null>> {
  try {
    await rpc(fonction, args)
    return { ok: true, valeur: null }
  } catch (e) {
    return refus(e)
  }
}

/** H26: change of right (to « consulter », the server releases the input and refuses what comes later, DR10). */
export function modifierPartage(rpc: Rpc, partageId: string, droit: DroitPartage): Promise<Resultat<null>> {
  return simple(rpc, 'rt_partage_modifier', { p_partage: partageId, p_droit: droit })
}

/** H26: withdrawal (DR11, DR16). */
export function retirerPartage(rpc: Rpc, partageId: string): Promise<Resultat<null>> {
  return simple(rpc, 'rt_partage_retirer', { p_partage: partageId })
}

/** A pending invitation withdrawn: its link no longer works. */
export function retirerInvitation(rpc: Rpc, invitationId: string): Promise<Resultat<null>> {
  return simple(rpc, 'rt_invitation_retirer', { p_invitation: invitationId })
}
