// NEC-CC-38: module 5 in lists. Cahier CGA v0.3, section 11 ("Boulangerie test") and the enriched
// JUS'NOSY of LISTES-M5-EXEMPLES.md v0.3, every expected figure to the ariary.
import { describe, it, expect } from 'vitest';
import { alertes, calculer, coutComposant, phraseSeuil, phraseSeuilUnites, texteChiffres } from './chiffres';
import { planExemple } from '../data/exemple';
import { planVide } from '../etat/vide';
import { planBoulangerie } from './boulangerie.fixture';
import { chiffresCles, brouillon } from '../ateliers/synthese/brouillons';
import { motsProposes } from '../ateliers/pitch/trame';
import type { Plan } from '../types';

const cles = (p: Plan) => alertes(p).map((a) => a.cle);
const n = (s: string | null) => (s ?? '').replace(/[  ]/g, ' ');

describe('Boulangerie test (cahier section 11)', () => {
  const p = planBoulangerie();
  const c = calculer(p);

  it('component costs after unit conversion', () => {
    expect(c.produits[0].composants.map((x) => x.cout)).toEqual([900, 200, 10, 100]);
    expect(c.produits[1].composants.map((x) => x.cout)).toEqual([180, 500, 40, 120]);
    expect(c.produits[2].composants.map((x) => x.cout)).toEqual([3000, 6000, 4000, 6250, 7500]);
  });

  it('cost, margin and rate per product', () => {
    expect(c.produits.map((x) => x.cout)).toEqual([1210, 840, 26750]);
    expect(c.produits.map((x) => x.marge)).toEqual([590, 660, 18250]);
    expect(c.produits.map((x) => x.tauxMarge)).toEqual([33, 44, 41]);
  });

  it('totals per month (R4)', () => {
    expect(c.caMois).toBe(9450000);
    expect(c.produits.map((x) => x.caMois)).toEqual([5400000, 2250000, 1800000]);
    expect(c.cvMois).toBe(5960000);
    expect(c.produits.map((x) => x.cvMois)).toEqual([3630000, 1260000, 1070000]);
    expect(c.margeMois).toBe(3490000);
    expect(Math.round(c.tauxMoyen! * 10000) / 100).toBe(36.93);
  });

  it('break-even in turnover, no sentence in units with 3 products', () => {
    expect(c.chargesFixes).toBe(2100000);
    expect(c.seuilCaMois).toBe(5686247);
    expect(c.seuilCaJour).toBe(227450);
    expect(c.seuilUnites).toBeNull();
    expect(phraseSeuilUnites(p, c)).toBeNull();
    expect(n(phraseSeuil(p, c))).toBe("Mon seuil de rentabilité : 5 686 247 Ar de chiffre d'affaires par mois, soit 227 450 Ar par jour de travail.");
  });

  it('year 1, years 2 and 3 empty (no growth typed)', () => {
    expect(c.annees[0]).toMatchObject({ ca: 113400000, cv: 71520000, marge: 41880000, chargesAnnee: 25200000, resultat: 16680000 });
    expect(c.annees[1]).toBeNull();
    expect(c.annees[2]).toBeNull();
  });

  it('needs, resources, gap (R6, R7)', () => {
    expect(c.fondsPropose).toBe(6800000);
    expect(c.investissements).toBe(8500000);
    expect(c.apporte).toBe(1500000);
    expect(c.besoins).toBe(16800000);
    expect(c.ressources).toBe(9500000);
    expect(c.ecart).toBe(-7300000);
    expect(n(alertes(p).find((a) => a.cle === 'financement')?.texte ?? '')).toBe('Il manque 7 300 000 Ar pour financer le démarrage.');
  });

  it('the showcase is counted once: resources only, added to the needs, never an investment line', () => {
    expect(p.m5.investissements.some((i) => /vitrine/i.test(i.designation))).toBe(false);
    expect(p.m5.ressources.filter((r) => /vitrine/i.test(r.designation))).toHaveLength(1);
  });

  it('300 g and 0,3 kg give the same cost of bread', () => {
    const q = planBoulangerie();
    Object.assign(q.m5.produits[0].composants[0], { quantiteUtilisee: 0.3, uniteUtilisee: 'kg' });
    const d = calculer(q);
    expect(d.produits[0].composants[0].cout).toBe(900);
    expect(d.produits[0].cout).toBe(1210);
  });

  it('croissant moved to the top: produit principal of pitch and synthesis, same totals', () => {
    const q = planBoulangerie();
    q.m5.produits.unshift(q.m5.produits.splice(1, 1)[0]);
    const d = calculer(q);
    expect(d.principal?.nom).toBe('Croissant');
    expect(chiffresCles(q).principal?.nom).toBe('Croissant');
    expect(brouillon(q, 'chiffres')).toContain('Produit principal : Croissant');
    expect(motsProposes(q, 'chiffres')).toContain('Croissant');
    for (const k of ['caMois', 'cvMois', 'margeMois', 'seuilCaMois', 'seuilCaJour', 'besoins', 'ressources', 'ecart'] as const) expect(d[k]).toBe(c[k]);
    expect(d.annees[0]?.resultat).toBe(16680000);
    expect(brouillon(p, 'chiffres')).toContain('Produit principal : Pain');
  });
});

describe("JUS'NOSY enriched (LISTES-M5-EXEMPLES.md v0.3)", () => {
  const p = planExemple();
  const c = calculer(p);

  it('products', () => {
    expect(c.produits.map((x) => x.cout)).toEqual([1400, 1070, 150]);
    expect(c.produits.map((x) => x.marge)).toEqual([1600, 930, 350]);
    expect(c.produits.map((x) => x.tauxMarge)).toEqual([53, 47, 70]);
  });

  it('totals per month and break-even', () => {
    expect(c.caMois).toBe(4500000);
    expect(c.cvMois).toBe(2091000);
    expect(c.margeMois).toBe(2409000);
    expect(Math.round(c.tauxMoyen! * 1000) / 10).toBe(53.5);
    expect(c.chargesFixes).toBe(1230000);
    expect(c.seuilCaMois).toBe(2297634);
    expect(c.seuilCaJour).toBe(91906);
    expect(c.seuilUnites).toBeNull();
  });

  it('needs and resources', () => {
    expect(c.investissements).toBe(4200000);
    expect(c.apporte).toBe(800000);
    expect(c.fondsRetenu).toBe(4000000);
    expect(c.besoins).toBe(9000000);
    expect(c.ressources).toBe(9000000);
    expect(c.ecart).toBe(0);
  });

  it('three years (growth 33 % then 25 %)', () => {
    expect(c.annees.map((a) => a?.resultat)).toEqual([14148000, 22487640, 29699550]);
  });

  it('no alert on the example', () => {
    expect(alertes(p)).toEqual([]);
  });

  it('a component with a lot of 0 is ignored and flagged, never NaN', () => {
    const q = planExemple();
    q.m5.produits[0].composants[0].quantiteLot = 0;
    const d = calculer(q);
    expect(d.produits[0].composants[0]).toEqual({ cout: null, ignore: true });
    expect(d.produits[0].ignores).toBe(1);
    expect(d.produits[0].cout).toBe(600);
    expect(JSON.stringify(d)).not.toContain('NaN');
    expect(texteChiffres(q)).not.toMatch(/NaN|undefined/);
    q.m5.produits[0].composants[0].quantiteLot = null;
    expect(calculer(q).produits[0].cout).toBe(600);
  });

  it('tax only when the rate is set, never on a loss', () => {
    const q = planExemple();
    q.m5.tauxImpot = 20;
    const a1 = calculer(q).annees[0]!;
    expect(a1.impot).toBe(2829600);
    expect(a1.net).toBe(11318400);
    for (const x of q.m5.produits) x.ventesParMois = 10;
    expect(calculer(q).annees[0]!.impot).toBe(0);
  });
});

describe('units (R2)', () => {
  it('piece or another unit: no conversion, the used unit is the lot unit', () => {
    expect(coutComposant({ id: 'x', designation: 'a', prixLot: 1000, quantiteLot: 10, uniteLot: 'piece', quantiteUtilisee: 2, uniteUtilisee: 'g' }).cout).toBe(200);
    expect(coutComposant({ id: 'x', designation: 'a', prixLot: 60000, quantiteLot: 1000, uniteLot: 'pages', quantiteUtilisee: 1, uniteUtilisee: 'pages' }).cout).toBe(60);
  });
  it('kg <-> g, l <-> ml both ways', () => {
    expect(coutComposant({ id: 'x', designation: 'a', prixLot: 20000, quantiteLot: 500, uniteLot: 'g', quantiteUtilisee: 0.005, uniteUtilisee: 'kg' }).cout).toBe(200);
    expect(coutComposant({ id: 'x', designation: 'a', prixLot: 30000, quantiteLot: 1000, uniteLot: 'ml', quantiteUtilisee: 0.25, uniteUtilisee: 'l' }).cout).toBe(7500);
  });
});

describe('module 5 alerts (trigger and no trigger)', () => {
  it('margin <= 0 (one product: old sentence; several: names the product)', () => {
    const p = planVide();
    Object.assign(p.m5.produits[0], { nom: 'Jus', prix: 1400 });
    p.m5.produits[0].composants[0].prixLot = 1400;
    expect(alertes(p).find((a) => a.cle === 'marge')?.texte).toBe("Votre prix ne couvre pas le coût d'une unité : chaque vente vous fait perdre de l'argent.");
    p.m5.produits[0].prix = 1401;
    expect(cles(p)).not.toContain('marge');
    const q = planExemple();
    q.m5.produits[2].prix = 100;
    expect(alertes(q).find((a) => a.cle === 'marge')?.texte).toContain('« Glace de fruits »');
  });

  it('break-even above the planned turnover (several products, in ariary)', () => {
    const p = planExemple();
    for (const x of p.m5.produits) x.ventesParMois = Math.round((x.ventesParMois ?? 0) / 3);
    expect(n(alertes(p).find((a) => a.cle === 'seuil')?.texte ?? '')).toContain("il faut vendre pour 2 297 634 Ar par mois");
    expect(cles(planExemple())).not.toContain('seuil');
  });

  it('break-even in units with one product', () => {
    const p = planVide();
    p.uniteVente = 'bouteille';
    Object.assign(p.m5.produits[0], { nom: 'Jus', prix: 3000, ventesParMois: 700, unite: 'bouteille' });
    p.m5.produits[0].composants[0].prixLot = 1400;
    p.m5.chargesFixes.loyer = 1230000;
    const c = calculer(p);
    expect(c.seuilUnites).toBe(769);
    expect(c.seuilUnitesJour).toBe(31);
    expect(n(phraseSeuilUnites(p, c))).toBe('En unités : 769 bouteilles par mois, soit 31 par jour de travail.');
    expect(alertes(p).find((a) => a.cle === 'seuil')?.texte).toBe("Pour ne pas perdre d'argent, il faut vendre 769 bouteilles par mois. Vous en prévoyez 700.");
    p.m5.produits[0].ventesParMois = 769;
    expect(cles(p)).not.toContain('seuil');
  });

  it('working capital below 3 months of fixed costs plus stock', () => {
    const p = planExemple();
    p.m5.fondsRoulementSaisi = 1000000;
    expect(n(alertes(p).find((a) => a.cle === 'fonds')?.texte ?? '')).toBe(
      'Fonds de roulement trop faible : prévoyez au moins 3 mois de charges fixes (3 690 000 Ar) plus votre stock de départ.'
    );
  });

  it('no alert while the inputs are empty', () => {
    expect(alertes(planVide())).toEqual([]);
    const p = planVide();
    p.m5.produits[0].prix = 1000;
    expect(alertes(p)).toEqual([]);
  });

  it('growth: empty = year empty, 0 = stable, -100 or below refused', () => {
    const p = planExemple();
    p.m5.hausses = [0, null];
    const c = calculer(p);
    expect(c.annees[1]?.ca).toBe(c.annees[0]?.ca);
    expect(c.annees[2]).toBeNull();
    p.m5.hausses = [null, 10];
    expect(calculer(p).annees.slice(1)).toEqual([null, null]);
    p.m5.hausses = [-100, null];
    expect(calculer(p).annees[1]).toBeNull();
    p.m5.hausses = [-50, null];
    expect(calculer(p).annees[1]?.ca).toBe(27000000);
  });
});

describe('share text', () => {
  it('has the key figures and no em dash, en dash or middle dot', () => {
    const t = n(texteChiffres(planExemple()));
    expect(t).toContain("JUS'NOSY");
    expect(t).toContain("Seuil de rentabilité : 2 297 634 Ar de chiffre d'affaires par mois");
    expect(t).toContain('Jus de fruits 1 L (produit principal)');
    expect(t).toContain('Besoins de démarrage : 9 000 000 Ar');
    expect(t).toContain("Année 3 : chiffre d'affaires 89 775 000 Ar, résultat avant amortissements et avant impôt 29 699 550 Ar");
    expect(/[—–·]/.test(texteChiffres(planExemple()))).toBe(false);
  });
});
