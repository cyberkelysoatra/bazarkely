import { describe, it, expect } from 'vitest';
import {
  domainesPourRoles,
  resolveDomaineActif,
  domaineDeRoute,
  domaineStorageKey,
} from '../utils/domaines';
import type { EauRoles } from '../types/gestionEau';

const r = (over: Partial<EauRoles>): EauRoles => ({
  admin: false,
  releveur: false,
  client: false,
  promoteur: false,
  releveurElec: false,
  gestionElec: false,
  lectureElec: false,
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
    expect(domaineDeRoute('/dashboard')).toBeNull();
  });

  it('clé de mémorisation par utilisateur', () => {
    expect(domaineStorageKey('u1')).toBe('eau_domaine_u1');
  });
});
