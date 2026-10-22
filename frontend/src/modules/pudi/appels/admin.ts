// Calls to the administration functions of PUDi (phase 2 API contract). Every function checks
// the caller on the server: nothing here is a security boundary. Loaded by the admin chunk only
// (and by the account menu for the refusals badge).
import { rpc } from './api';
import type { VoteAdmin } from '../utils/exports';

export type { VoteAdmin };

export interface Suivi {
  calcule_at: string;
  nb_votes: number;
  nb_tests: number;
  nb_masques: number;
  nb_connexions: number;
  nb_refus: number;
  /** Automatic maskings (PUDI-CC-09), absent on an older server answer. */
  nb_masquages_actifs?: number;
  nb_masquages_retablis?: number;
  par_jour: Record<string, number>;
  par_canal: { code: string; n: number; hors_liste: number }[];
  dans_nos_reseaux: number;
  fokontany_autre: number;
  indices_ip: { groupe: string; n: number; du: string; au: string }[];
}

export type TypeCanal = 'groupe_whatsapp' | 'affiche' | 'reunion' | 'autre';

export interface Canal {
  code: string;
  nom: string;
  type: TypeCanal;
  liste_membres: boolean;
  responsable: string | null;
  remarque: string | null;
  actif: boolean;
  nb_numeros: number;
  nb_votes: number;
  nb_votes_hors_liste: number;
}

export interface Liste {
  id: string;
  canal_code: string;
  source: string;
  date_source: string | null;
  importe_at: string;
  nb_numeros: number;
}

export interface ResultatImport {
  liste_id: string;
  recus: number;
  enregistres: number;
  invalides: number;
  doublons_dans_le_fichier: number;
  deja_dans_un_autre_canal: number;
}

export interface MultiCanaux {
  numeros_total: number;
  numeros_multi_canaux: number;
  combinaisons: { canaux: string[]; n: number }[];
}

export interface Connexion {
  user_id: string;
  email: string;
  premiere: string;
  derniere: string;
  est_admin: boolean;
  a_vote: boolean;
}

export interface Refus {
  at: string;
  email_refuse: string | null;
  /** numero_deja_utilise | personne_deja_votee (v6). */
  motif: string | null;
  id_anonyme_detenteur: string | null;
}

/** Automatic masking as seen by the organisers: never a vote's content, never a phone number. */
export interface MasquageAdmin {
  id: string;
  at: string;
  canal_code: string | null;
  /** Gmail of the person who created or last modified the line. */
  auteur_email: string | null;
  /** Gmail of the masked account (to answer a claim). */
  email_masque: string | null;
  id_anonyme: string;
  retabli_at: string | null;
  retabli_motif: string | null;
  retabli_par_email: string | null;
  vu_at: string | null;
}

export interface EntreeJournal {
  at: string;
  email: string | null;
  action: string;
  cible: string | null;
  details: Record<string, unknown> | null;
}

export const lireSuivi = () => rpc<Suivi>('pudi_admin_suivi');
export const lireVotes = () => rpc<VoteAdmin[]>('pudi_admin_votes');
export const masquerVote = (id: string, masque: boolean, motif: string | null) =>
  rpc<null>('pudi_admin_masquer', { p_id_anonyme: id, p_masque: masque, p_motif: motif });
export const lireRefus = () => rpc<Refus[]>('pudi_admin_refus');
export const libererNumero = (id: string, motif: string) =>
  rpc<null>('pudi_admin_liberer_numero', { p_id_anonyme: id, p_motif: motif });
export const lireMasquages = () => rpc<MasquageAdmin[]>('pudi_admin_masquages');
export const retablirMasquage = (id: string, motif: string) => rpc<null>('pudi_admin_masquage_retablir', { p_id: id, p_motif: motif });
export const lireCanaux = () => rpc<Canal[]>('pudi_admin_canaux');
export const enregistrerCanal = (c: Omit<Canal, 'nb_numeros' | 'nb_votes' | 'nb_votes_hors_liste'>) =>
  rpc<null>('pudi_admin_canal_enregistrer', {
    p_code: c.code,
    p_nom: c.nom,
    p_type: c.type,
    p_liste_membres: c.liste_membres,
    p_responsable: c.responsable || null,
    p_remarque: c.remarque || null,
    p_actif: c.actif
  });
export const importerListe = (canal: string, source: string, date: string | null, numeros: string[]) =>
  rpc<ResultatImport>('pudi_admin_importer_liste', { p_canal: canal, p_source: source, p_date: date, p_numeros: numeros });
export const lireListes = () => rpc<Liste[]>('pudi_admin_listes');
export const supprimerListe = (id: string) => rpc<null>('pudi_admin_supprimer_liste', { p_liste: id });
export const lireMultiCanaux = () => rpc<MultiCanaux>('pudi_admin_multi_canaux');
export const lireConnexions = () => rpc<Connexion[]>('pudi_admin_connexions');
export const definirAdmin = (user: string, admin: boolean) => rpc<null>('pudi_admin_set_admin', { p_user: user, p_admin: admin });
export const definirCloture = (iso: string) => rpc<null>('pudi_admin_set_cloture', { p_at: iso });
export const definirPublie = (publie: boolean) =>
  rpc<{ publie: boolean; votes_test_supprimes: number }>('pudi_admin_set_publie', { p_publie: publie });
export const lireJournal = () => rpc<EntreeJournal[]>('pudi_admin_journal');

/** Proposal as seen by the administrators (masked ones included, real votes counted). */
export interface PropositionAdmin {
  id: string;
  intitule: string;
  lieu: string | null;
  source: string;
  date_source: string | null;
  precision_texte: string | null;
  origine_vote: string | null;
  ajoute_at: string;
  masque: boolean;
  masque_motif: string | null;
  nb_priorite: number;
  nb_urgent: number;
}

export interface SaisieProposition {
  id: string | null;
  intitule: string;
  lieu: string;
  source: string;
  dateSource: string;
  precision: string;
}

export const lirePropositionsAdmin = () => rpc<PropositionAdmin[]>('pudi_admin_propositions');
/** id null = new proposal (next free Pn); returns the id. */
export const enregistrerProposition = (s: SaisieProposition) =>
  rpc<string>('pudi_admin_proposition_enregistrer', {
    p_id: s.id,
    p_intitule: s.intitule,
    p_lieu: s.lieu || null,
    p_source: s.source,
    p_date_source: s.dateSource || null,
    p_precision: s.precision || null
  });
export const retirerProposition = (id: string, motif: string) =>
  rpc<{ id: string; votes: number; efface: boolean }>('pudi_admin_proposition_retirer', { p_id: id, p_motif: motif });
export const retablirProposition = (id: string) => rpc<null>('pudi_admin_proposition_retablir', { p_id: id });
/** Free text of a voter -> proposal. An empty precision lets the server quote the text. */
export const transformerManquant = (idAnonyme: string, intitule: string, lieu: string, precision: string) =>
  rpc<string>('pudi_admin_transformer_manquant', {
    p_id_anonyme: idAnonyme,
    p_intitule: intitule,
    p_lieu: lieu || null,
    p_precision: precision.trim() || null
  });
export const purger = () => rpc<{ purge: boolean; votes?: number; contacts?: number }>('pudi_purger', { p_forcer: true });

/**
 * Scheduled purge: pg_cron is installed on the project and the job `pudi-purge`
 * ('5 21 27 1 *' UTC = 28/01 at 00:05 Madagascar time) was checked when the phase 2 SQL was
 * applied (21/10/2026). Clients cannot read cron.job, so the fact is recorded here.
 */
export const PURGE_AUTOMATIQUE = true;
export const DATE_PURGE = '2027-01-28T00:00:00+03:00';
export const RAPPEL_PURGE_DES = '2027-01-21T00:00:00+03:00';
export const EMAIL_JOEL = 'joelsoatra@gmail.com';
