import { describe, it, expect } from 'vitest';
import { filterEauNavByRoles } from '../components/eauNav';
import type { EauRoles } from '../types/gestionEau';

const labels = (roles: EauRoles) => filterEauNavByRoles(roles).map((i) => i.label);

describe('Navigation principale gestion-eau filtrée par rôle (boutons-thèmes, cumulable)', () => {
  it('admin voit les 5 thèmes d’administration', () => {
    const l = labels({ admin: true, releveur: false, client: false });
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Suivi', 'Compteurs', 'Facturation']);
  });

  it('releveur voit les 3 thèmes opérationnels, PAS compteurs/facturation', () => {
    const l = labels({ admin: false, releveur: true, client: false });
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Suivi']);
    expect(l).not.toContain('Compteurs');
    expect(l).not.toContain('Facturation');
  });

  it('client seul voit ses 2 thèmes (Ma conso / Mes factures)', () => {
    const l = labels({ admin: false, releveur: false, client: true });
    expect(l).toEqual(['Ma conso', 'Mes factures']);
  });

  it('aucun rôle → aucun bouton-thème', () => {
    const l = labels({ admin: false, releveur: false, client: false });
    expect(l).toEqual([]);
  });

  it('cumul admin+releveur voit les thèmes admin (releveur n’ajoute rien)', () => {
    const l = labels({ admin: true, releveur: true, client: false });
    expect(l).toEqual(['Tableau de bord', 'Relevés', 'Suivi', 'Compteurs', 'Facturation']);
  });

  it('chaque rôle réel reste ≤ 6 items (contrainte BottomNav ; le cumul atypique est tronqué côté UI)', () => {
    expect(labels({ admin: true, releveur: false, client: false }).length).toBeLessThanOrEqual(6);
    expect(labels({ admin: false, releveur: true, client: false }).length).toBeLessThanOrEqual(6);
    expect(labels({ admin: false, releveur: false, client: true }).length).toBeLessThanOrEqual(6);
  });
});
