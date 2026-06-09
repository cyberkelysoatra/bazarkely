/**
 * Types du module gestion-eau — alignés EXACTEMENT sur le schéma Supabase
 * (cf. SUPABASE-SQL.md, snake_case). Les enregistrements locaux Dexie utilisent
 * les mêmes noms de colonnes pour rendre la synchronisation triviale (aucun mapping).
 *
 * Convention :
 *  - `XxxRow`   : forme exacte d'une ligne Supabase (ce qui est envoyé / reçu).
 *  - `XxxLocal` : `XxxRow` + champ Dexie-only `_dirty` (jamais transmis à Supabase).
 *  - timestamps : stockés en ISO string (compatibles timestamptz).
 */

/** Champ technique local — présent uniquement dans Dexie, retiré avant tout upsert. */
export interface LocalMeta {
  /** true = modifié localement, en attente de push vers Supabase. */
  _dirty?: boolean;
}

// ───────────────────────────── eau_compteurs ─────────────────────────────
export type CompteurType = 'villa' | 'golf' | 'commun';

export interface CompteurRow {
  id: string;
  nom: string;
  type: CompteurType;
  proprietaire: string | null;
  zone: string | null;
  ordre: number | null;
  lat: number | null;
  lng: number | null;
  actif: boolean;
  created_at: string | null;
  updated_at: string | null;
}
export type CompteurLocal = CompteurRow & LocalMeta;

// ──────────────────────────── eau_qr_compteur ────────────────────────────
export interface QrCompteurRow {
  id: string;
  compteur_id: string;
  emplacement: string | null;
  code: string;
  actif: boolean;
  created_at: string | null;
}
export type QrCompteurLocal = QrCompteurRow & LocalMeta;

// ────────────────────────── eau_releves_compteur ─────────────────────────
export interface ReleveCompteurRow {
  id: string;
  compteur_id: string;
  index: number;
  rupture_index: boolean;
  aberrant_confirme: boolean;
  timestamp: string;
  agent_id: string | null;
  note: string | null;
  photo_url: string | null;
}
export type ReleveCompteurLocal = ReleveCompteurRow & LocalMeta;

// ─────────────────────────── eau_releves_bassin ──────────────────────────
export interface ReleveBassinRow {
  id: string;
  hauteur_cm: number;
  volume_m3: number;
  timestamp: string;
  agent_id: string | null;
  note: string | null;
}
export type ReleveBassinLocal = ReleveBassinRow & LocalMeta;

// ─────────────────────────── eau_entrees_bassin ──────────────────────────
export interface EntreeBassinRow {
  id: string;
  volume_m3: number;
  timestamp: string;
  agent_id: string | null;
  note: string | null;
}
export type EntreeBassinLocal = EntreeBassinRow & LocalMeta;

// ────────────────────────────── eau_bilans ───────────────────────────────
export interface BilanRow {
  id: string;
  timestamp: string;
  timestamp_prev: string | null;
  stock_prev: number | null;
  entrees_m3: number | null;
  conso_m3: number | null;
  stock_attendu: number | null;
  stock_mesure: number | null;
  ecart_m3: number | null;
  ecart_pct: number | null;
  anomalie: boolean;
  traitee: boolean;
  commentaire: string | null;
  // Évolution « bassin/débit » (additif) : apport mesuré (Q_in×Δt ou override),
  // conso réelle vers le réseau (apport − Δstock), pertes (conso réseau − Σ compteurs)
  // et débit courant utilisé pour le calcul. Nullables → rétrocompatibles.
  apport_m3?: number | null;
  conso_reseau_m3?: number | null;
  pertes_m3?: number | null;
  debit_m3h_utilise?: number | null;
}
export type BilanLocal = BilanRow & LocalMeta;

// ──────────────────────────── eau_debit_tests ────────────────────────────
/**
 * Test de débit des pompes « vanne fermée » : on mesure la montée de niveau
 * (cm) sur une durée (min) pour déduire Q_in (m³/h). Le dernier test = débit
 * courant supposé stable ; `ecart_pct` mémorise l'écart vs le test précédent.
 */
export interface DebitTestRow {
  id: string;
  niveau_debut_cm: number;
  niveau_fin_cm: number;
  duree_min: number;
  debit_m3h: number;
  ecart_pct: number | null;
  timestamp: string;
  agent_id: string | null;
  note: string | null;
  created_at: string | null;
}
export type DebitTestLocal = DebitTestRow & LocalMeta;

// ──────────────────── eau_elec_releves_compteur (Phase 1 élec) ────────────────────
/**
 * Relevé d'index d'un compteur ÉLECTRIQUE (kWh). Miroir de `ReleveCompteurRow`
 * (même logique rupture/aberrant), table dédiée pour ne pas mélanger eau et élec.
 * La saisie complète arrive en Phase 2 ; la table est posée dès la Phase 1.
 */
export interface ElecReleveRow {
  id: string;
  compteur_id: string;
  index: number;
  rupture_index: boolean;
  aberrant_confirme: boolean;
  timestamp: string;
  agent_id: string | null;
  note: string | null;
  photo_url: string | null;
  created_at: string | null;
}
export type ElecReleveLocal = ElecReleveRow & LocalMeta;

// ───────────────────────── eau_elec_couts (Phase 1 élec) ─────────────────────────
/**
 * Coûts d'électricité mensuels de la centrale (mutualisés) : facture JIRAMA (A),
 * gasoil du groupe électrogène (B), production totale en kWh (C). Le prix du kWh
 * (D) en découle : `prix_kwh = (total_jirama + total_gasoil) / total_kwh` quand
 * `total_kwh > 0`, sinon null. Sert de base au calcul du montant élec d'une facture.
 */
export interface ElecCoutRow {
  id: string;
  /** Mois facturé au format `YYYY-MM` (unique). */
  mois: string;
  total_jirama: number;
  total_gasoil: number;
  total_kwh: number;
  prix_kwh: number | null;
  devise: string;
  created_at: string | null;
  updated_at: string | null;
}
export type ElecCoutLocal = ElecCoutRow & LocalMeta;

// ────────────────────────────── eau_factures ─────────────────────────────
export type FactureStatut = 'paye' | 'impaye';

export interface FactureRow {
  id: string;
  numero: string | null;
  compteur_id: string | null;
  periode_start: string | null;
  periode_end: string | null;
  index_debut: number | null;
  index_fin: number | null;
  conso_m3: number | null;
  tarif: number | null;
  montant: number | null;
  devise: string;
  statut: FactureStatut;
  date_echeance: string | null;
  paye_at: string | null;
  relance_count: number;
  generated_at: string | null;
  // Facture combinée eau + électricité (Phase 1 élec) : volet électrique. Tous
  // nullables → rétrocompatibles avec les factures eau existantes.
  index_debut_elec: number | null;
  index_fin_elec: number | null;
  conso_kwh: number | null;
  prix_kwh: number | null;
  montant_elec: number | null;
  /** Mois de référence (`YYYY-MM`) du coût élec appliqué (FK logique vers `eau_elec_couts.mois`). */
  cout_mois: string | null;
  /** Montant total = montant (eau) + montant_elec. */
  montant_total: number | null;
}
export type FactureLocal = FactureRow & LocalMeta;

// ─────────────────────────────── eau_config ──────────────────────────────
export interface ConfigRow {
  id: string; // 'singleton'
  bassin_longueur_m: number | null;
  bassin_largeur_m: number | null;
  bassin_hauteur_max_m: number | null;
  /** Hauteur du flotteur (m) — arrêt des pompes / plafond opérationnel (réf. % remplissage). */
  bassin_hauteur_flotteur_m: number | null;
  /** Hauteur du trop-plein (m) — sécurité, atteinte seulement si flotteurs défaillants. */
  bassin_hauteur_trop_plein_m: number | null;
  /** Écart % max entre deux tests de débit au-delà duquel on alerte « débit instable » (déf. 15). */
  debit_ecart_max_pct: number | null;
  tarif_m3: number | null;
  devise: string;
  seuil_pct: number | null;
  seuil_m3: number | null;
  periode_facturation_jours: number | null;
  seuil_aberrant_facteur: number | null;
  jours_sans_releve_alerte: number | null;
  bassin_seuil_critique_pct: number | null;
  numero_facture_seq: number;
  copro_nom: string | null;
  copro_contact: string | null;
  logo_url: string | null;
  langue: string;
  map_centre_lat: number | null;
  map_centre_lng: number | null;
  map_rayon_km: number | null;
  map_zoom_min: number | null;
  map_zoom_max: number | null;
}
export type ConfigLocal = ConfigRow & LocalMeta;

export const CONFIG_SINGLETON_ID = 'singleton';

// ─────────────────────────────── eau_roles ───────────────────────────────
export interface RoleRow {
  user_id: string;
  admin: boolean;
  releveur: boolean;
  /**
   * Promoteur (Phase 2) : lecture TOTALE de tous les écrans (métier + admin) en
   * lecture seule + réglage des seuils d'alerte via RPC. N'écrit rien d'autre
   * (la RLS Phase 1 est le filet serveur). Cumulable, colonne `eau_roles.promoteur`.
   */
  promoteur: boolean;
  updated_at: string | null;
}
export type RoleLocal = RoleRow & LocalMeta;

// ─────────────────────────── eau_comptes_client ──────────────────────────
export interface CompteClientRow {
  id: string;
  nom: string;
  contact: string | null;
  compteur_ids: string[]; // jsonb
  code_enrolement: string;
  code_qr: string;
  user_id: string | null;
  actif: boolean;
  created_by: string | null;
  created_at: string | null;
}
export type CompteClientLocal = CompteClientRow & LocalMeta;

// ────────────────────────── eau_demandes_acces ───────────────────────────
export type DemandeStatut = 'en_attente' | 'validee' | 'refusee';

export interface DemandeAccesRow {
  id: string;
  user_id: string | null;
  email: string | null;
  nom: string | null;
  /** Fiche d'accès enrichie (ÉVO 1) : champs capturés sur la vitrine publique. */
  phone: string | null;
  fonction: string | null;
  message: string | null;
  statut: DemandeStatut;
  roles_attribues: unknown | null; // jsonb
  compteurs_visibles: unknown | null; // jsonb
  traitee_par: string | null;
  traitee_at: string | null;
  created_at: string | null;
}
export type DemandeAccesLocal = DemandeAccesRow & LocalMeta;

// ──────────────────────────── eau_invitations ────────────────────────────
/**
 * Invitation par email (octroi automatique du rôle au 1er login Google).
 * Un admin pré-enregistre l'email + les rôles ; à la connexion de la personne
 * avec cette adresse Google, la RPC `eau_claim_invitation()` attribue les rôles
 * (et crée/active le compte client + compteurs si `role_client`). Voir Phase 1.
 */
export type InvitationStatut = 'en_attente' | 'acceptee' | 'revoquee';

export interface InvitationRow {
  id: string;
  /** Nullable : une invitation WhatsApp par jeton n'a pas l'email d'avance. */
  email: string | null;
  nom: string | null;
  phone: string | null;
  role_admin: boolean;
  role_releveur: boolean;
  role_client: boolean;
  /** Promoteur (Phase 3) : invite un promoteur (lecture totale + seuils). Octroyé au login par les RPC de claim. */
  role_promoteur: boolean;
  compteur_ids: string[]; // jsonb
  cible: string | null;
  statut: InvitationStatut;
  invited_by: string | null;
  created_at: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  /** Jeton unguessable d'enrôlement (canal WhatsApp). null pour le canal email. */
  token: string | null;
  /** Expiration du jeton (ISO). null = pas d'expiration. */
  expires_at: string | null;
  /** Canal d'invitation : 'email' (match sur l'adresse Google) ou 'whatsapp' (match sur le jeton). */
  invite_channel: 'email' | 'whatsapp';
}
export type InvitationLocal = InvitationRow & LocalMeta;

// ─────────────────────────────── eau_scans ───────────────────────────────
export interface ScanRow {
  id: string;
  code: string | null;
  type: 'compteur' | 'client' | null;
  compteur_id: string | null;
  client_id: string | null;
  qr_id: string | null;
  emplacement: string | null;
  user_id: string | null;
  role: string | null;
  resultat: string | null;
  timestamp: string;
}
export type ScanLocal = ScanRow & LocalMeta;

// ────────────────────────────── eau_alertes ──────────────────────────────
export type AlerteType =
  | 'anomalie'
  | 'fuite'
  | 'compteur_non_releve'
  | 'bassin_critique'
  | 'flotteur_defaillant'
  | 'debit_instable';

export interface AlerteRow {
  id: string;
  type: AlerteType | null;
  ref_id: string | null;
  message: string | null;
  niveau: string | null;
  lu: boolean;
  traitee: boolean;
  created_at: string | null;
}
export type AlerteLocal = AlerteRow & LocalMeta;

// ─────────────────────────────── eau_audit ───────────────────────────────
export interface AuditRow {
  id: string;
  user_id: string | null;
  action: string | null;
  entite: string | null;
  entite_id: string | null;
  details: unknown | null; // jsonb
  timestamp: string;
}
export type AuditLocal = AuditRow & LocalMeta;

// ────────────────────────────── eau_annonces ─────────────────────────────
export interface AnnonceRow {
  id: string;
  titre: string | null;
  texte: string | null;
  type: 'promo' | 'evenement' | 'communaute' | null;
  actif: boolean;
  date_debut: string | null;
  date_fin: string | null;
  created_by: string | null;
  created_at: string | null;
}
export type AnnonceLocal = AnnonceRow & LocalMeta;

// ─────────────────────────── Rôles applicatifs ───────────────────────────
/**
 * Rôles cumulables du module. `client` est dérivé (un compte client lié au user)
 * et reste inexploité en phase 1. `admin`/`releveur` proviennent de eau_roles.
 */
export type EauRole = 'admin' | 'releveur' | 'client' | 'promoteur';

export interface EauRoles {
  admin: boolean;
  releveur: boolean;
  client: boolean;
  /** Promoteur (Phase 2) : lecture totale + seuils d'alerte ; aucune autre écriture. */
  promoteur: boolean;
}
