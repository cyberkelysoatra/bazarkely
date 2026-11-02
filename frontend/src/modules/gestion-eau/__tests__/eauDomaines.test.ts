import { describe, it, expect, vi } from 'vitest';
import {
  accueilElec,
  domainesPourRoles,
  resolveDomaineActif,
  domaineDeRoute,
  domaineStorageKey,
} from '../utils/domaines';
import type { EauRoles } from '../types/gestionEau';

// Base locale simulée (ELEC-CC-02) : u-eau a un compte client d'eau, u-elec une fiche RTB
// active, u-pause une fiche RTB en pause, u-deux les deux.
vi.mock('../db/gestionEauDb', () => {
  const comptes = [{ id: 'cc1', user_id: 'u-eau' }, { id: 'cc2', user_id: 'u-deux' }];
  const elec = [
    { id: 'e1', code: 'A', user_id: 'u-elec', statut: 'actif' },
    { id: 'e2', code: 'B', user_id: 'u-pause', statut: 'pause' },
    { id: 'e3', code: 'C', user_id: 'u-deux', statut: 'actif' },
    { id: 'e4', code: 'D', user_id: null, statut: 'actif' },
  ];
  return {
    eauDb: {
      eau_comptes_client: {
        where: () => ({ equals: (v: string) => ({ first: async () => comptes.find((c) => c.user_id === v) }) }),
      },
      eau_elec_clients: { toArray: async () => elec },
      eau_roles: { get: async () => undefined },
    },
  };
});
vi.mock('../services/eauSync', () => ({ pullTable: vi.fn(), saveLocal: vi.fn() }));

const { getClientDomaines, getRolesForUser } = await import('../services/eauRoleService');

const r = (over: Partial<EauRoles>): EauRoles => ({
  admin: false,
  releveur: false,
  client: false,
  promoteur: false,
  releveurElec: false,
  gestionElec: false,
  lectureElec: false,
  validationElec: false,
  ...over,
});

describe('domainesPourRoles (ELEC-CC-01)', () => {
  it('admin : les deux domaines', () => {
    expect(domainesPourRoles(r({ admin: true }))).toEqual({ eau: true, elec: true });
  });

  it('promoteur : les deux domaines', () => {
    expect(domainesPourRoles(r({ promoteur: true }))).toEqual({ eau: true, elec: true });
  });

  it('releveur eau seul : eau uniquement', () => {
    expect(domainesPourRoles(r({ releveur: true }))).toEqual({ eau: true, elec: false });
  });

  it('releveur électricité seul : électricité uniquement', () => {
    expect(domainesPourRoles(r({ releveurElec: true }))).toEqual({ eau: false, elec: true });
  });

  it('gestion électricité seule : électricité uniquement', () => {
    expect(domainesPourRoles(r({ gestionElec: true }))).toEqual({ eau: false, elec: true });
  });

  it('lecture électricité seule : électricité uniquement', () => {
    expect(domainesPourRoles(r({ lectureElec: true }))).toEqual({ eau: false, elec: true });
  });

  it('client eau seul (phase 0, paramètre par défaut) : eau uniquement', () => {
    expect(domainesPourRoles(r({ client: true }))).toEqual({ eau: true, elec: false });
  });

  it('client avec compteurs eau et électricité : les deux', () => {
    expect(domainesPourRoles(r({ client: true }), { eau: true, elec: true })).toEqual({ eau: true, elec: true });
  });

  it('client avec seulement un compteur électricité : électricité uniquement', () => {
    expect(domainesPourRoles(r({ client: true }), { eau: false, elec: true })).toEqual({ eau: false, elec: true });
  });

  it('les domaines client sont ignorés si la personne n’est pas cliente', () => {
    expect(domainesPourRoles(r({}), { eau: true, elec: true })).toEqual({ eau: false, elec: false });
  });

  it('releveur eau + releveur électricité : les deux', () => {
    expect(domainesPourRoles(r({ releveur: true, releveurElec: true }))).toEqual({ eau: true, elec: true });
  });
});

describe('Clients électricité (ELEC-CC-02) : domaine lu sur la fiche RTB active', () => {
  it('client électricité seul : rôle client, domaine électricité et PAS l’eau', async () => {
    const dom = await getClientDomaines('u-elec');
    expect(dom).toEqual({ eau: false, elec: true });
    const roles = await getRolesForUser('u-elec');
    expect(roles.client).toBe(true);
    expect(domainesPourRoles(roles, dom)).toEqual({ eau: false, elec: true });
  });

  it('fiche RTB en pause : aucun domaine client', async () => {
    const dom = await getClientDomaines('u-pause');
    expect(dom).toEqual({ eau: false, elec: false });
    expect((await getRolesForUser('u-pause')).client).toBe(false);
  });

  it('client d’eau seul : eau uniquement ; client des deux : les deux', async () => {
    expect(domainesPourRoles(await getRolesForUser('u-eau'), await getClientDomaines('u-eau'))).toEqual({ eau: true, elec: false });
    expect(domainesPourRoles(await getRolesForUser('u-deux'), await getClientDomaines('u-deux'))).toEqual({ eau: true, elec: true });
  });

  it('compte inconnu : aucun domaine', async () => {
    expect(domainesPourRoles(await getRolesForUser('u-x'), await getClientDomaines('u-x'))).toEqual({ eau: false, elec: false });
  });

  it('accueil : releveur électricité seul → relevés ; client RTB, gestion, lecture → tableau de bord', () => {
    expect(accueilElec(r({ releveurElec: true }))).toBe('/gestion-eau/elec/releves');
    expect(accueilElec(r({ client: true }))).toBe('/gestion-eau/elec');
    expect(accueilElec(r({ gestionElec: true }))).toBe('/gestion-eau/elec');
    expect(accueilElec(r({ lectureElec: true, releveurElec: true }))).toBe('/gestion-eau/elec');
    expect(accueilElec(r({ admin: true }))).toBe('/gestion-eau/elec');
  });
});

describe('resolveDomaineActif', () => {
  it('deux domaines : le choix mémorisé, eau par défaut', () => {
    expect(resolveDomaineActif({ eau: true, elec: true }, 'elec')).toBe('elec');
    expect(resolveDomaineActif({ eau: true, elec: true }, 'eau')).toBe('eau');
    expect(resolveDomaineActif({ eau: true, elec: true }, null)).toBe('eau');
    expect(resolveDomaineActif({ eau: true, elec: true }, 'n’importe quoi')).toBe('eau');
  });

  it('un seul domaine : celui-là, quel que soit le choix mémorisé', () => {
    expect(resolveDomaineActif({ eau: false, elec: true }, 'eau')).toBe('elec');
    expect(resolveDomaineActif({ eau: true, elec: false }, 'elec')).toBe('eau');
  });
});

describe('domaineDeRoute', () => {
  it('routes électricité', () => {
    expect(domaineDeRoute('/gestion-eau/elec')).toBe('elec');
    expect(domaineDeRoute('/gestion-eau/elec/')).toBe('elec');
    expect(domaineDeRoute('/gestion-eau/elec/releves')).toBe('elec');
  });

  it('routes eau', () => {
    expect(domaineDeRoute('/gestion-eau')).toBe('eau');
    expect(domaineDeRoute('/gestion-eau/releves')).toBe('eau');
    expect(domaineDeRoute('/gestion-eau/client/factures')).toBe('eau');
  });

  it('routes neutres : version, simulation, anciens coûts électricité', () => {
    expect(domaineDeRoute('/gestion-eau/version')).toBeNull();
    expect(domaineDeRoute('/gestion-eau/simulation')).toBeNull();
    expect(domaineDeRoute('/gestion-eau/elec-couts')).toBeNull();
    expect(domaineDeRoute('/gestion-eau/annonces')).toBeNull();
    expect(domaineDeRoute('/gestion-eau/utilisateurs')).toBeNull();
    expect(domaineDeRoute('/gestion-eau/demandes')).toBeNull();
    expect(domaineDeRoute('/gestion-eau/elec/clients')).toBe('elec');
    expect(domaineDeRoute('/gestion-eau/elec/reglages')).toBe('elec');
    expect(domaineDeRoute('/dashboard')).toBeNull();
  });

  it('clé de mémorisation par utilisateur', () => {
    expect(domaineStorageKey('u1')).toBe('eau_domaine_u1');
  });
});
