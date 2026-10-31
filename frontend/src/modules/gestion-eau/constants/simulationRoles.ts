/**
 * Configuration du sélecteur « Simulation de rôle » (module Gestion Eau — AHUVI).
 *
 * L'admin peut INCARNER un autre rôle pour voir l'app telle que ce rôle la voit
 * (menus, écrans, permissions). 100 % frontend : aucune table, aucun SQL.
 *
 * Table de config unique → ajouter un rôle simulable = ajouter une ligne (ex. un
 * futur rôle « élec »). Les rôles « larges » (releveur / promoteur) sont actifs en
 * Phase 1. Le rôle « propriétaire » (client, avec choix d'une villa et re-filtrage
 * des données) est posé ici mais DÉSACTIVÉ jusqu'à la Phase 2.
 */
import { BarChart3, ClipboardList, Eye, Home, Receipt, Zap, type LucideIcon } from 'lucide-react';
import type { EauRole } from '../types/gestionEau';

export interface SimulationRoleOption {
  role: EauRole;
  /** Famille affichée dans le sélecteur (ELEC-CC-01) : Eau, Électricité ou les deux. */
  famille: 'eau' | 'elec' | 'tous';
  /** Libellé affiché (charte AHUVI, français). */
  label: string;
  icon: LucideIcon;
  /** true = simulable en Phase 1 ; false = grisé (« Phase 2 »). */
  available: boolean;
  /** Suffixe affiché quand indisponible (ex. « Phase 2 »). */
  soon?: string;
}

/**
 * Rôles réellement SIMULABLES via le sélecteur. Le contexte s'appuie sur cette liste
 * pour valider une valeur (restauration localStorage / setSimulation). Le rôle `client`
 * (Propriétaire) exige EN PLUS le choix d'une villa (cf. `EauSimulatedClient`).
 */
export const SIMULATABLE_ROLES: EauRole[] = [
  'releveur',
  'promoteur',
  'client',
  'releveurElec',
  'gestionElec',
  'lectureElec',
];

/** Options présentées dans le sélecteur (l'ordre = ordre d'affichage). */
export const SIMULATION_ROLE_OPTIONS: SimulationRoleOption[] = [
  { role: 'promoteur', famille: 'tous', label: 'Promoteur', icon: Eye, available: true },
  { role: 'releveur', famille: 'eau', label: 'Releveur eau', icon: ClipboardList, available: true },
  // Phase 2 — vue « propriétaire » : choix d'une villa + re-filtrage des données à ses compteurs.
  { role: 'client', famille: 'eau', label: 'Propriétaire', icon: Home, available: true },
  // ELEC-CC-01 : rôles du domaine Électricité (RTB Énergie).
  { role: 'releveurElec', famille: 'elec', label: 'Releveur électricité', icon: Zap, available: true },
  { role: 'gestionElec', famille: 'elec', label: 'Gestion électricité', icon: Receipt, available: true },
  { role: 'lectureElec', famille: 'elec', label: 'Lecture électricité', icon: BarChart3, available: true },
];

/** Libellé court d'un rôle simulé (utilisé par la marque du header). */
export function simulationRoleLabel(role: EauRole): string {
  return SIMULATION_ROLE_OPTIONS.find((o) => o.role === role)?.label ?? role;
}
