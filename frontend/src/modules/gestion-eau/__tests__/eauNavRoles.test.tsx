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

describe('Navigation filtrée par domaine (ELEC-CC-01)', () => {
  it('domaine Électricité : admin et promoteur voient le seul bouton Électricité', () => {
    expect(labelsElec(r({ admin: true }))).toEqual(['Électricité']);
    expect(labelsElec(r({ promoteur: true }))).toEqual(['Électricité']);
  });

  it('les trois rôles électricité voient Électricité et aucun bouton eau', () => {
    for (const k of ['releveurElec', 'gestionElec', 'lectureElec'] as const) {
      expect(labelsElec(r({ [k]: true }))).toEqual(['Électricité']);
      expect(labels(r({ [k]: true }))).toEqual([]);
    }
  });

  it('un releveur eau ne voit jamais le bouton Électricité', () => {
    expect(labelsElec(r({ releveur: true }))).toEqual([]);
    expect(labels(r({ releveur: true }))).not.toContain('Électricité');
  });

  it('au plus 6 boutons par domaine, même en cumul de tous les rôles', () => {
    const all = r({ admin: true, releveur: true, client: true, promoteur: true, releveurElec: true, gestionElec: true, lectureElec: true });
    expect(labels(all).length).toBeLessThanOrEqual(6);
    expect(labelsElec(all).length).toBeLessThanOrEqual(6);
  });
});
