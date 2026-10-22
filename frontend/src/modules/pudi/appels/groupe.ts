// Group managers (PUDI-CC-07): designation by the administrators, member lists kept by the
// managers. Every function checks the caller on the server (pudi_est_responsable /
// pudi_exiger_admin): nothing here is a security boundary. Online only, through rpc() which
// carries withTimeout. The numbers live in this state while the screen is open, never on the device.
import { rpc } from './api';

export interface Groupe {
  code: string;
  nom: string;
  type: string;
  nb_membres: number;
  /** Members (lines) with at least one number matching a vote (v6). */
  nb_ayant_vote: number;
}

export interface Membre {
  id: string;
  /** Normalised numbers (261341234567, 33612345678): shown to this channel's managers and admins only. */
  numeros: string[];
  email: string | null;
  etablissement: string | null;
  fokontany: string | null;
  modifie_at: string;
  /** True when one number of the line voted. Never the choices, the date or which number. */
  a_vote: boolean;
}

export interface SaisieMembre {
  id: string | null;
  numeros: string[];
  email: string;
  etablissement: string;
  fokontany: string;
}

export interface Responsable {
  email: string;
  ajoute_at: string;
}

export const lireMesGroupes = () => rpc<Groupe[]>('pudi_mes_groupes');
export const lireMembres = (canal: string) => rpc<Membre[]>('pudi_groupe_membres', { p_canal: canal });
/** id null = new member. Returns the member id. */
export const enregistrerMembre = (canal: string, s: SaisieMembre) =>
  rpc<string>('pudi_groupe_membre_enregistrer', {
    p_canal: canal,
    p_id: s.id,
    p_numeros: s.numeros.map((n) => n.trim()).filter(Boolean),
    p_email: s.email.trim() || null,
    p_etablissement: s.etablissement.trim() || null,
    p_fokontany: s.fokontany.trim() || null
  });
export const supprimerMembre = (canal: string, id: string) => rpc<null>('pudi_groupe_membre_supprimer', { p_canal: canal, p_id: id });

export const lireResponsables = (canal: string) => rpc<Responsable[]>('pudi_admin_responsables', { p_canal: canal });
export const ajouterResponsable = (canal: string, email: string) =>
  rpc<null>('pudi_admin_responsable_ajouter', { p_canal: canal, p_email: email.trim().toLowerCase() });
export const retirerResponsable = (canal: string, email: string) =>
  rpc<null>('pudi_admin_responsable_retirer', { p_canal: canal, p_email: email });
