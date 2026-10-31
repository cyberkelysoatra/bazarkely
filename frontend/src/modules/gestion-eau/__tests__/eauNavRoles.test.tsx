import { describe, it, expect } from 'vitest';
import { filterEauNavByRoles } from '../components/eauNav';
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
// Barre du domaine Eau (domaine actif par défaut).
const labels = (roles: EauRoles) => filterEauNavByRoles(roles, undefined, 'eau').map((i) => i.label);
const labelsElec = (roles: EauRoles) => filterEauNavByRoles(roles, undefined, 'elec').map((i) => i.label);

describe('Navigation principale gestion-eau filtrée par rôle (boutons-thèmes, cumulable)', () => {
  it('admin voit les 5 thèmes d’administration', () => {
    const l = labels(r({ admin: true }));
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Compteurs', 'Suivi', 'Facturation']);
  });

  it('releveur voit les 3 thèmes opérationnels, PAS compteurs/facturation', () => {
    const l = labels(r({ releveur: true }));
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Suivi']);
    expect(l).not.toContain('Compteurs');
    expect(l).not.toContain('Facturation');
  });

  it('client seul voit ses 3 thèmes (Ma conso / Le bassin / Mes factures)', () => {
    const l = labels(r({ client: true }));
    // « Le bassin » (vue bassin lecture seule du propriétaire) ajouté en v3.46.0.
    expect(l).toEqual(['Ma conso', 'Le bassin', 'Mes factures']);
  });

  it('promoteur (Phase 2) voit les 5 thèmes métier en lecture (comme admin), PAS les écrans propriétaire', () => {
    const l = labels(r({ promoteur: true }));
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Compteurs', 'Suivi', 'Facturation']);
    expect(l).not.toContain('Ma conso');
    expect(l).not.toContain('Mes factures');
  });

  it('aucun rôle → aucun bouton-thème', () => {
    const l = labels(r({}));
    expect(l).toEqual([]);
  });

  it('cumul admin+releveur voit les thèmes admin (releveur n’ajoute rien)', () => {
    const l = labels(r({ admin: true, releveur: true }));
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Compteurs', 'Suivi', 'Facturation']);
  });

  it('chaque rôle réel reste ≤ 6 items (contrainte BottomNav ; le cumul atypique est tronqué côté UI)', () => {
    expect(labels(r({ admin: true })).length).toBeLessThanOrEqual(6);
    expect(labels(r({ releveur: true })).length).toBeLessThanOrEqual(6);
    expect(labels(r({ client: true })).length).toBeLessThanOrEqual(6);
    expect(labels(r({ promoteur: true })).length).toBeLessThanOrEqual(6);
  });
});

describe('Navigation filtrée par domaine (ELEC-CC-01, ELEC-CC-02)', () => {
  const TROIS = ['Tableau de bord', 'Relevés', 'Clients'];

  it('domaine Électricité : admin et promoteur voient Tableau de bord, Relevés, Clients', () => {
    expect(labelsElec(r({ admin: true }))).toEqual(TROIS);
    expect(labelsElec(r({ promoteur: true }))).toEqual(TROIS);
  });

  it('gestion et lecture électricité voient les trois boutons, aucun bouton eau', () => {
    for (const k of ['gestionElec', 'lectureElec'] as const) {
      expect(labelsElec(r({ [k]: true }))).toEqual(TROIS);
      expect(labels(r({ [k]: true }))).toEqual([]);
    }
  });

  it('releveur électricité seul : le seul bouton Relevés, vers /gestion-eau/elec/releves', () => {
    const items = filterEauNavByRoles(r({ releveurElec: true }), undefined, 'elec');
    expect(items.map((i) => i.label)).toEqual(['Relevés']);
    expect(items[0].path).toBe('/gestion-eau/elec/releves');
    expect(labels(r({ releveurElec: true }))).toEqual([]);
  });

  it('client RTB seul : le seul tableau de bord (écran d’attente), jamais les clients', () => {
    expect(labelsElec(r({ client: true }))).toEqual(['Tableau de bord']);
  });

  it('un releveur eau ne voit aucun bouton du domaine Électricité', () => {
    expect(labelsElec(r({ releveur: true }))).toEqual([]);
    expect(filterEauNavByRoles(r({ releveur: true }), undefined, 'eau').some((i) => i.path.startsWith('/gestion-eau/elec'))).toBe(false);
  });

  it('au plus 6 boutons par domaine, même en cumul de tous les rôles', () => {
    const all = r({ admin: true, releveur: true, client: true, promoteur: true, releveurElec: true, gestionElec: true, lectureElec: true });
    expect(labels(all).length).toBeLessThanOrEqual(6);
    expect(labelsElec(all).length).toBeLessThanOrEqual(6);
  });
});
