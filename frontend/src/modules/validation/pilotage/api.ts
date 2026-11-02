// Server calls of the pilotage (vc_admin_* functions, Joël only), each through rpc() (8 s timeout).
import { rpc } from '../appels/api';
import type { Apercu, EtatPersonne } from '../utils/types';
import type { BrouillonImport } from '../utils/import';

export interface PersonneTableau {
  nom: string;
  role: string;
  en_ligne: boolean;
  page: string | null;
  derniere_visite: string | null;
}

export interface QuestionnaireTableau {
  id: string;
  titre: string;
  type: string;
  version: string;
  etat: 'ouvert' | 'confirme';
  etat_validant: EtatPersonne | null;
  echeance_at: string | null;
  etape_suivi: string | null;
}

export interface LigneTableau {
  client_id: string;
  entreprise: string;
  nom_court: string;
  questionnaires: QuestionnaireTableau[];
  personnes: PersonneTableau[];
  messages_non_lus: number;
  derniere_activite: string | null;
}

export interface PersonneClient {
  id: string;
  civilite: 'Madame' | 'Monsieur';
  nom: string;
  fonction: string | null;
  role: 'validant' | 'contributeur';
  whatsapp: string | null;
  whatsapp_fiche: string | null;
  email: string | null;
  inscrit_at: string | null;
  revoque_at: string | null;
  invitation: 'envoyee' | 'utilisee' | 'annulee' | null;
}

export interface ChoixClient {
  id: string;
  lettre: string;
  nature: string;
  libelle: string;
  conseille: boolean;
  suivante: string | null;
}

export interface QuestionnaireClient {
  id: string;
  etat: 'brouillon' | 'ouvert' | 'confirme' | 'remplace' | 'clos';
  type: string;
  version: string;
  titre_client: string;
  saisi_par: 'joel' | 'assistant';
  cree_at: string;
  publie_at: string | null;
  confirme_at: string | null;
  questions: { id: string; numero: string; choix: ChoixClient[] }[] | null;
}

export interface FicheClient {
  client: { id: string; entreprise: string; nom_court: string; phrase_reve: string | null; statut: string };
  personnes: PersonneClient[];
  questionnaires: QuestionnaireClient[];
}

export interface ChoixComplet {
  id: string;
  lettre: string;
  nature: 'validation' | 'reserve' | 'refus' | 'choix';
  libelle: string;
  ligne: string;
  avantages: string | null;
  faiblesses: string | null;
  conseille: boolean;
  suivante: string | null;
}

export interface QuestionComplete {
  id: string;
  numero: string;
  ordre: number;
  type: 'validation' | 'choix';
  sujet_client: string;
  critere: string | null;
  texte: string;
  extrait: string | null;
  essentielle: boolean;
  choix: ChoixComplet[];
}

export interface QuestionnaireComplet {
  questionnaire: {
    id: string;
    client_id: string;
    etat: QuestionnaireClient['etat'];
    saisi_par: 'joel' | 'assistant';
    cree_at: string;
    publie_at: string | null;
  };
  document: { id: string; type: string; version: string; titre_client: string };
  arbre: { atteintes: number; boucle: boolean; chemin_max: number };
  questions: QuestionComplete[];
}

export interface Modele {
  id: string;
  type: string;
  nom: string;
  contenu: { texte?: string } | null;
}

export interface PersonneEnvoi {
  id?: string;
  civilite: string;
  nom: string;
  fonction: string;
  whatsapp: string;
  role: 'validant' | 'contributeur';
}

export type Resultat = { ok: boolean; code?: string; erreurs?: string[] };

export const tableau = () => rpc<LigneTableau[]>('vc_admin_tableau');

export const ficheClient = (id: string) => rpc<FicheClient>('vc_admin_client', { p_client: id });

export const enregistrerClient = (p: { id?: string; entreprise: string; nom_court: string; phrase_reve: string; personnes: PersonneEnvoi[] }) =>
  rpc<Resultat & { client_id?: string }>('vc_admin_client_enregistrer', { p_json: p });

export const creerInvitation = (personne: string) => rpc<Resultat & { jeton?: string }>('vc_admin_invitation_creer', { p_personne: personne });

export const apercu = (jeton: string) => rpc<Apercu>('vc_invitation_apercu', { p_jeton: jeton });

export const enregistrerBrouillon = (b: BrouillonImport) =>
  rpc<Resultat & { questionnaire_id?: string; questions?: number; chemin_max?: number }>('vc_admin_brouillon_enregistrer', { p_json: b });

export const questionnaire = (id: string) => rpc<QuestionnaireComplet>('vc_admin_questionnaire', { p_questionnaire: id });

export const publier = (id: string) => rpc<Resultat>('vc_admin_publier', { p_questionnaire: id });

export const supprimerBrouillon = (id: string) => rpc<Resultat>('vc_admin_brouillon_supprimer', { p_questionnaire: id });

export const modeles = () => rpc<Modele[]>('vc_admin_modeles');

export const enregistrerModele = (id: string | null, type: string, nom: string, texte: string) =>
  rpc<Resultat & { id?: string }>('vc_admin_modele_enregistrer', { p_id: id, p_type: type, p_nom: nom, p_contenu: { texte } });
