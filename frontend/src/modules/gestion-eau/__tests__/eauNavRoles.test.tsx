import { describe, it, expect } from 'vitest';
import { filterEauNavByRoles } from '../components/eauNav';
import type { EauRoles } from '../types/gestionEau';

const r = (over: Partial<EauRoles>): EauRoles => ({
  admin: false,
  releveur: false,
  client: false,
  promoteur: false,
  ...over,
});
const labels = (roles: EauRoles) => filterEauNavByRoles(roles).map((i) => i.label);

describe('Navigation principale gestion-eau filtrée par rôle (boutons-thèmes, cumulable)', () => {
  it('admin voit les 5 thèmes d’administration', () => {
    const l = labels(r({ admin: true }));
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Suivi', 'Compteurs', 'Facturation']);
  });

  it('releveur voit les 3 thèmes opérationnels, PAS compteurs/facturation', () => {
    const l = labels(r({ releveur: true }));
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Suivi']);
    expect(l).not.toContain('Compteurs');
    expect(l).not.toContain('Facturation');
  });

  it('client seul voit ses 2 thèmes (Ma conso / Mes factures)', () => {
    const l = labels(r({ client: true }));
    expect(l).toEqual(['Ma conso', 'Mes factures']);
  });

  it('promoteur (Phase 2) voit les 5 thèmes métier en lecture (comme admin), PAS les écrans propriétaire', () => {
    const l = labels(r({ promoteur: true }));
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Suivi', 'Compteurs', 'Facturation']);
    expect(l).not.toContain('Ma conso');
    expect(l).not.toContain('Mes factures');
  });

  it('aucun rôle → aucun bouton-thème', () => {
    const l = labels(r({}));
    expect(l).toEqual([]);
  });

  it('cumul admin+releveur voit les thèmes admin (releveur n’ajoute rien)', () => {
    const l = labels(r({ admin: true, releveur: true }));
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Suivi', 'Compteurs', 'Facturation']);
  });

  it('chaque rôle réel reste ≤ 6 items (contrainte BottomNav ; le cumul atypique est tronqué côté UI)', () => {
    expect(labels(r({ admin: true })).length).toBeLessThanOrEqual(6);
    expect(labels(r({ releveur: true })).length).toBeLessThanOrEqual(6);
    expect(labels(r({ client: true })).length).toBeLessThanOrEqual(6);
    expect(labels(r({ promoteur: true })).length).toBeLessThanOrEqual(6);
  });
});
