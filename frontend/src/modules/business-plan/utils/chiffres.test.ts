import { describe, it, expect } from 'vitest';
import { alertes, calculer, phraseSeuil, texteChiffres } from './chiffres';
import { planExemple } from '../data/exemple';
import { planVide } from '../etat/vide';
import type { Plan } from '../types';

const cles = (p: Plan) => alertes(p).map((a) => a.cle);

describe('module 5, exact JUS\'NOSY example (workbook pages 13 to 14)', () => {
  const c = calculer(planExemple());

  it('unit: cost, price, margin, rate', () => {
    expect(c.coutUnitaire).toBe(1400);
    expect(c.prix).toBe(3000);
    expect(c.marge).toBe(1600);
    expect(c.tauxMarge).toBe(53);
  });

  it('fixed costs and break-even', () => {
    expect(c.chargesFixes).toBe(1230000); // NEC-CC-13: salaries at the minimum wage (630 000)
    expect(c.seuilMois).toBe(769);
    expect(c.seuilJour).toBe(31);
    expect(phraseSeuil(planExemple(), c)).toBe('Mon seuil de rentabilité : 769 bouteilles de 50 cl par mois, soit 31 par jour de travail.');
  });

  it('starting needs and resources', () => {
    expect(c.investissements).toBe(5000000);
    expect(c.stock).toBe(310000);
    expect(c.fondsPropose).toBe(4000000);
    expect(c.fondsRetenu).toBe(4000000);
    expect(c.besoins).toBe(9000000);
    expect(c.ressources).toBe(9000000);
    expect(c.ecart).toBe(0);
  });

  it('three years', () => {
    const [a1, a2, a3] = c.annees;
    expect(a1).toMatchObject({ quantites: 14400, ca: 43200000, cv: 20160000, marge: 23040000, chargesAnnee: 14760000, resultat: 8280000, impot: null, net: null });
    expect(a2?.resultat).toBe(14760000);
    expect(a3?.resultat).toBe(20040000);
  });

  it('no alert on the example', () => {
    expect(alertes(planExemple())).toEqual([]);
  });

  it('tax only when the rate is set, never on a loss', () => {
    const p = planExemple();
    p.m5.tauxImpot = 20;
    const a1 = calculer(p).annees[0]!;
    expect(a1.impot).toBe(1656000);
    expect(a1.net).toBe(6624000);
    p.m5.annees[0].ventesParMois = 100;
    expect(calculer(p).annees[0]!.impot).toBe(0);
  });
});

describe('module 5 alerts (trigger and no trigger)', () => {
  it('margin <= 0', () => {
    const p = planExemple();
    p.m5.prixVente = 1400;
    expect(alertes(p).find((a) => a.cle === 'marge')?.texte).toBe("Votre prix ne couvre pas le coût d'une unité : chaque vente vous fait perdre de l'argent.");
    p.m5.prixVente = 1401;
    expect(cles(p)).not.toContain('marge');
  });

  it('break-even above year 1 monthly sales', () => {
    const p = planExemple();
    p.m5.annees[0].ventesParMois = 700;
    expect(alertes(p).find((a) => a.cle === 'seuil')?.texte).toBe("Pour ne pas perdre d'argent, il faut vendre 769 bouteilles de 50 cl par mois. Vous en prévoyez 700.");
    p.m5.annees[0].ventesParMois = 769;
    expect(cles(p)).not.toContain('seuil');
  });

  it('unbalanced financing (missing and surplus)', () => {
    const p = planExemple();
    p.m5.ressources.subvention = 4000000;
    expect(alertes(p).find((a) => a.cle === 'financement')?.texte).toBe('Il manque 1 000 000 Ar pour financer le démarrage.');
    p.m5.ressources.subvention = 5500000;
    expect(alertes(p).find((a) => a.cle === 'financement')?.texte).toBe('Vos ressources dépassent vos besoins de 500 000 Ar.');
    p.m5.ressources.subvention = 5000000;
    expect(cles(p)).not.toContain('financement');
  });

  it('working capital below 3 months of fixed costs plus stock', () => {
    const p = planExemple();
    p.m5.fondsRoulementSaisi = 1000000;
    expect(alertes(p).find((a) => a.cle === 'fonds')?.texte).toBe(
      'Fonds de roulement trop faible : prévoyez au moins 3 mois de charges fixes (3 690 000 Ar) plus votre stock de départ.'
    );
    p.m5.fondsRoulementSaisi = 4000000;
    expect(cles(p)).not.toContain('fonds');
  });

  it('no alert while the inputs are empty', () => {
    expect(alertes(planVide())).toEqual([]);
    const p = planVide();
    p.m5.prixVente = 1000; // price without any cost: nothing to compare yet
    expect(alertes(p)).toEqual([]);
  });
});

describe('share text', () => {
  it('has the key figures and no em dash, en dash or middle dot', () => {
    const t = texteChiffres(planExemple()).replace(/\u202F/g, ' ');
    expect(t).toContain("JUS'NOSY");
    expect(t).toContain('769 bouteilles de 50 cl par mois');
    expect(t).toContain('Besoins de d\u00e9marrage : 9 000 000 Ar');
    expect(t).toContain("Ann\u00e9e 3 : chiffre d'affaires 72 000 000 Ar, r\u00e9sultat avant amortissements et avant imp\u00f4t 20 040 000 Ar");
    expect(/[\u2014\u2013\u00B7]/.test(texteChiffres(planExemple()))).toBe(false);
  });
});
