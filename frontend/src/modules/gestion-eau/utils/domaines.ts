/**
 * Domaines du module (ELEC-CC-01) : Eau et Electricite vivent dans gestion-eau mais
 * ne se melangent jamais. Chaque role porte un domaine ; l'admin et le promoteur voient
 * les deux ; un client voit les domaines de ses compteurs. Logique PURE testable.
 */
import type { EauDomaine, EauRoles } from '../types/gestionEau';

export interface EauDomaines {
  eau: boolean;
  elec: boolean;
}

/** Route d'accueil de chaque domaine. */
export const ELEC_HOME = '/gestion-eau/elec';
export const EAU_HOME = '/gestion-eau';

/**
 * Domaines accessibles pour un jeu de roles (effectifs, simulation comprise).
 * `clientDomaines` = domaines des compteurs du client (phase 0 : aucun compteur
 * electricite de client n'existe ; par defaut un client = un client d'eau).
 */
export function domainesPourRoles(
  roles: EauRoles,
  clientDomaines: EauDomaines = { eau: roles.client, elec: false }
): EauDomaines {
  const isClient = roles.client;
  return {
    eau: roles.admin || roles.promoteur || roles.releveur || (isClient && clientDomaines.eau),
    elec:
      roles.admin ||
      roles.promoteur ||
      roles.releveurElec ||
      roles.gestionElec ||
      roles.lectureElec ||
      (isClient && clientDomaines.elec),
  };
}

/**
 * Domaine actif : celui memorise s'il est accessible, sinon le seul accessible,
 * sinon l'eau (comportement historique).
 */
export function resolveDomaineActif(domaines: EauDomaines, stored: string | null): EauDomaine {
  if (domaines.eau && domaines.elec) return stored === 'elec' ? 'elec' : 'eau';
  if (domaines.elec) return 'elec';
  return 'eau';
}

/**
 * Domaine d'une route du module. `null` = route neutre (version, simulation, coûts
 * electricite historiques reserves a l'admin, annonces et utilisateurs communs aux
 * deux domaines pour l'admin) : aucune redirection ni bascule de domaine.
 */
export function domaineDeRoute(pathname: string): EauDomaine | null {
  if (!pathname.startsWith('/gestion-eau')) return null;
  const rest = pathname.slice('/gestion-eau'.length).replace(/\/+$/, '');
  if (rest === '/elec' || rest.startsWith('/elec/')) return 'elec';
  if (
    rest === '/version' ||
    rest === '/simulation' ||
    rest === '/elec-couts' ||
    rest === '/annonces' ||
    rest === '/utilisateurs' ||
    rest === '/accueil' ||
    rest.startsWith('/accueil/')
  ) {
    return null;
  }
  return 'eau';
}

/** Cle localStorage du domaine memorise (par utilisateur). */
export function domaineStorageKey(userId: string): string {
  return `eau_domaine_${userId}`;
}
