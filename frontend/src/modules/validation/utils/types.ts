// Shapes returned by the vc_* SQL functions (phase 1, VALIDCLIENT-CC-01).

export type Role = 'validant' | 'contributeur';

/** vc_invitation_apercu(jeton): anonymous preview of an invitation. */
export interface Apercu {
  valide: boolean;
  deja_rattache?: boolean;
  deja_utilisee?: boolean;
  role?: Role;
  civilite?: string | null;
  nom?: string | null;
  entreprise?: string | null;
  nom_court?: string | null;
  phrase_reve?: string | null;
  invite_par?: string | null;
  nb_questions_max?: number;
  duree_minutes?: number;
}

/** vc_invitation_utiliser(jeton). */
export interface ResultatInvitation {
  ok: boolean;
  code?: 'INVITATION_DEJA_UTILISEE' | 'INVITATION_INVALIDE' | 'UN_SEUL_PROJET' | 'COMPTE_DEJA_DANS_LE_PROJET' | string;
  client_id?: string;
  personne_id?: string;
  inscription?: boolean;
}

export interface ResultatInfos {
  ok: boolean;
  code?: 'NUMERO_INVALIDE' | 'EMAIL_INVALIDE' | 'CHAMP_OBLIGATOIRE' | string;
}

/** vc_etat(questionnaire, personne). */
export interface EtatPersonne {
  total: number;
  repondues: number;
  acceptees: number;
  refus: number;
  reserves: number;
  jauge: number;
  pret: boolean;
}

export type EtatQuestionnaire = 'ouvert' | 'confirme' | 'remplace' | 'clos';

export interface DocumentEspace {
  questionnaire_id: string;
  document_id: string;
  type: string;
  version: string;
  titre_client: string;
  etat: EtatQuestionnaire;
  etat_personne: EtatPersonne | null;
  etat_validant?: EtatPersonne | null;
  confirme_at: string | null;
  confirme_par?: string | null;
  confirme_par_fonction?: string | null;
  etape_suivi?: string | null;
  etape_at?: string | null;
  echeance_at: string | null;
  numero_recu?: string | null;
}

/** One entry of vc_mon_espace(): a project the account belongs to. */
export interface Espace {
  client_id: string;
  revoque: boolean;
  archive?: boolean;
  personne_id?: string;
  role?: Role;
  civilite?: string | null;
  nom?: string | null;
  fonction?: string | null;
  entreprise?: string | null;
  whatsapp?: string | null;
  email_pro?: string | null;
  inscrit?: boolean;
  nom_court?: string | null;
  validant?: string | null;
  equipe?: number | null;
  documents?: DocumentEspace[];
  messages_non_lus?: number;
}

/** One choice of a question, as vc_questionnaire returns it (never the internal criterion). */
export interface ChoixClient {
  id: string;
  lettre: string;
  nature: 'validation' | 'reserve' | 'refus' | 'choix' | string;
  libelle: string;
  ligne: string | null;
  avantages: string | null;
  faiblesses: string | null;
  conseille: boolean;
  suivante: string | null;
}

export interface QuestionClient {
  id: string;
  numero: string;
  ordre: number;
  type: 'validation' | 'choix' | string;
  sujet_client: string;
  texte: string;
  extrait: string | null;
  obligatoire?: boolean;
  choix: ChoixClient[];
}

export interface MaReponse {
  question_id: string;
  choix_id: string;
  commentaire: string | null;
  repondu_at: string;
}

/** vc_questionnaire(id): the whole tree, kept on the device (D6). */
export interface QuestionnaireComplet {
  id: string;
  etat: EtatQuestionnaire | 'brouillon';
  type: string;
  version: string;
  titre_client: string;
  document_id: string;
  role: Role;
  personne_id: string;
  questions: QuestionClient[];
  mes_reponses: MaReponse[];
}

/** vc_document(id). */
export interface DocumentTexte {
  id: string;
  type: string;
  version: string;
  titre_client: string;
  contenu_md: string;
}

/** vc_repondre(...). */
export interface ResultatReponse {
  ok: boolean;
  deja?: boolean;
  code?: string;
  etat?: EtatPersonne;
}

/** vc_confirmer(questionnaire). */
export interface ResultatConfirmation {
  ok: boolean;
  deja?: boolean;
  code?: string;
  numero_recu?: string;
  etat?: EtatPersonne;
  confirme_at?: string;
}
