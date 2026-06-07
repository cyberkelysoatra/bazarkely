/**
 * Base Dexie DÉDIÉE au module gestion-eau (isolée de BazarKELYDB).
 * Choix d'isolation : aucune migration sur la base partagée → modification
 * strictement additive. Offline-first : toute lecture/écriture passe par Dexie ;
 * la synchronisation Supabase se fait en arrière-plan (cf. services/eauSync.ts).
 *
 * Les noms de colonnes (snake_case) sont IDENTIQUES au schéma Supabase pour rendre
 * la sync triviale. Le champ Dexie-only `_dirty` (non indexé, non transmis) marque
 * les enregistrements en attente de push.
 */
import Dexie, { type Table } from 'dexie';
import type {
  CompteurLocal,
  QrCompteurLocal,
  ReleveCompteurLocal,
  ReleveBassinLocal,
  EntreeBassinLocal,
  BilanLocal,
  DebitTestLocal,
  FactureLocal,
  ConfigLocal,
  RoleLocal,
  CompteClientLocal,
  DemandeAccesLocal,
  InvitationLocal,
  ScanLocal,
  AlerteLocal,
  AuditLocal,
  AnnonceLocal,
} from '../types/gestionEau';

export class GestionEauDB extends Dexie {
  eau_compteurs!: Table<CompteurLocal, string>;
  eau_qr_compteur!: Table<QrCompteurLocal, string>;
  eau_releves_compteur!: Table<ReleveCompteurLocal, string>;
  eau_releves_bassin!: Table<ReleveBassinLocal, string>;
  eau_entrees_bassin!: Table<EntreeBassinLocal, string>;
  eau_bilans!: Table<BilanLocal, string>;
  eau_debit_tests!: Table<DebitTestLocal, string>;
  eau_factures!: Table<FactureLocal, string>;
  eau_config!: Table<ConfigLocal, string>;
  eau_roles!: Table<RoleLocal, string>;
  eau_comptes_client!: Table<CompteClientLocal, string>;
  eau_demandes_acces!: Table<DemandeAccesLocal, string>;
  eau_invitations!: Table<InvitationLocal, string>;
  eau_scans!: Table<ScanLocal, string>;
  eau_alertes!: Table<AlerteLocal, string>;
  eau_audit!: Table<AuditLocal, string>;
  eau_annonces!: Table<AnnonceLocal, string>;

  constructor() {
    super('GestionEauDB');

    this.version(1).stores({
      // PK = id (text/uuid client). _dirty volontairement NON indexé (filtré en mémoire).
      eau_compteurs: 'id, type, zone, actif, ordre',
      eau_qr_compteur: 'id, compteur_id, code',
      eau_releves_compteur: 'id, compteur_id, timestamp, [compteur_id+timestamp]',
      eau_releves_bassin: 'id, timestamp',
      eau_entrees_bassin: 'id, timestamp',
      eau_bilans: 'id, timestamp, anomalie, traitee',
      eau_factures: 'id, compteur_id, statut',
      eau_config: 'id',
      eau_roles: 'user_id, admin, releveur', // PK = user_id
      eau_comptes_client: 'id, user_id, code_enrolement, code_qr',
      eau_demandes_acces: 'id, user_id, statut',
      eau_scans: 'id, compteur_id, timestamp, [compteur_id+timestamp]',
      eau_alertes: 'id, type, lu, traitee',
      eau_audit: 'id, timestamp',
      eau_annonces: 'id, actif',
    });

    // v2 — Évolution « bassin/débit » : nouvelle table des tests de débit (vanne fermée).
    // Additif : Dexie reporte automatiquement les stores inchangés.
    this.version(2).stores({
      eau_debit_tests: 'id, timestamp',
    });

    // v3 — Invitations par email (octroi automatique du rôle au 1er login Google).
    // Additif : Dexie reporte automatiquement les stores inchangés (aucune perte).
    this.version(3).stores({
      eau_invitations: 'id, email, statut',
    });
  }
}

export const eauDb = new GestionEauDB();

/** Liste des tables synchronisables (nom Supabase == nom Dexie). */
export const EAU_TABLES = [
  'eau_compteurs',
  'eau_qr_compteur',
  'eau_releves_compteur',
  'eau_releves_bassin',
  'eau_entrees_bassin',
  'eau_bilans',
  'eau_debit_tests',
  'eau_factures',
  'eau_config',
  'eau_roles',
  'eau_comptes_client',
  'eau_demandes_acces',
  'eau_invitations',
  'eau_scans',
  'eau_alertes',
  'eau_audit',
  'eau_annonces',
] as const;

export type EauTableName = (typeof EAU_TABLES)[number];
