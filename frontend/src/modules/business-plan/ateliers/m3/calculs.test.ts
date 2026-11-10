import { describe, expect, it } from 'vitest';
import { planVide } from '../../etat/vide';
import { planExemple } from '../../data/exemple';
import { calculerMarche } from './calculs';
import { progression } from './progression';
import { progression as progressionM4 } from '../m4/progression';
import { progression as progressionPrix } from '../prix/progression';
import { ajouterAuxCouts } from '../prix/envoi';

describe('3a market size', () => {
  it('computes the JUS\'NOSY figures', () => {
    const m3 = { ...planVide().m3, nbClients: 60, qteParAchat: 25, achatsParMois: 4, partVisee: 20, prixPrevu: 3000 };
    expect(calculerMarche(m3)).toEqual({ potentielMois: 6000, prix: 3000, potentielAr: 18000000, ventesMois: 1200, ventesAn: 14400, ventesAnAr: 43200000 });
  });

  it('stays empty while an input is missing', () => {
    const r = calculerMarche({ ...planVide().m3, nbClients: 60, qteParAchat: 25 });
    expect(r.potentielMois).toBeNull();
    expect(r.ventesMois).toBeNull();
  });

  it('rounds the monthly sales', () => {
    expect(calculerMarche({ ...planVide().m3, nbClients: 7, qteParAchat: 1, achatsParMois: 1, partVisee: 15 }).ventesMois).toBe(1);
  });
});

describe('progression', () => {
  it('is 0 on an empty plan and 100 on the example', () => {
    const vide = planVide();
    expect(progression(vide)).toBe(0);
    expect(progressionM4(vide)).toBe(0);
    expect(progressionPrix(vide)).toBe(0);
    const ex = planExemple();
    expect(progression(ex)).toBe(100);
    expect(progressionM4(ex)).toBe(100);
    expect(progressionPrix(ex)).toBe(100);
  });

  it('counts the price lines proportionally', () => {
    const p = planVide();
    p.prix = [{ id: 'a', element: 'Mangues', unite: 'le kg', prix: 2000, ou: '' }];
    expect(progressionPrix(p)).toBe(33);
  });
});

describe('send a price to module 5', () => {
  it('replaces the blank default line, then appends', () => {
    const p = planVide();
    ajouterAuxCouts(p, { id: 'a', element: 'Mangues', unite: 'le kg', prix: 2000, ou: '' });
    expect(p.m5.couts.map((l) => [l.libelle, l.montant])).toEqual([['Mangues (le kg)', 2000]]);
    ajouterAuxCouts(p, { id: 'b', element: 'Sucre', unite: '', prix: 4000, ou: '' });
    expect(p.m5.couts.map((l) => [l.libelle, l.montant])).toEqual([
      ['Mangues (le kg)', 2000],
      ['Sucre', 4000]
    ]);
  });
});

describe('example texts', () => {
  it('have no em dash, en dash or middle dot', () => {
    const ex = planExemple();
    expect(JSON.stringify([ex.m3, ex.m4, ex.prix])).not.toMatch(/[—–·]/);
  });
});
