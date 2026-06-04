import { describe, it, expect } from 'vitest';
import { filterNavByRoles } from '../components/navConfig';
import type { EauRoles } from '../types/gestionEau';

const labels = (roles: EauRoles) => filterNavByRoles(roles).map((i) => i.label);

describe('Navigation filtrée par rôle (cumulable)', () => {
  it('admin voit tous les écrans d’administration (Phase 1 + Phase 2)', () => {
    const l = labels({ admin: true, releveur: false, client: false });
    expect(l).toEqual([
      'Tableau de bord',
      'Saisie bassin',
      'Saisie compteur',
      'Anomalies',
      'Facturation',
      'Compteurs',
      'Utilisateurs',
      'Demandes',
      'Configuration',
    ]);
  });

  it('releveur voit saisies + anomalies, PAS facturation/compteurs/utilisateurs/config', () => {
    const l = labels({ admin: false, releveur: true, client: false });
    expect(l).toContain('Saisie bassin');
    expect(l).toContain('Saisie compteur');
    expect(l).toContain('Anomalies');
    expect(l).not.toContain('Compteurs');
    expect(l).not.toContain('Configuration');
    expect(l).not.toContain('Facturation');
    expect(l).not.toContain('Utilisateurs');
    expect(l).not.toContain('Demandes');
  });

  it('client seul voit le tableau de bord + ses factures', () => {
    const l = labels({ admin: false, releveur: false, client: true });
    expect(l).toEqual(['Tableau de bord', 'Mes factures']);
  });

  it('aucun rôle → uniquement les items publics du module (tableau de bord)', () => {
    const l = labels({ admin: false, releveur: false, client: false });
    expect(l).toEqual(['Tableau de bord']);
  });

  it('cumul admin+releveur voit tout (compteurs + saisies)', () => {
    const l = labels({ admin: true, releveur: true, client: false });
    expect(l).toContain('Compteurs');
    expect(l).toContain('Saisie compteur');
    expect(l).toContain('Configuration');
  });
});
