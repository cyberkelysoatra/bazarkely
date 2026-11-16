// NEC-CC-38 (cahier R9, NEC-193): an old plan keeps every figure after the move to the lists.
// Synthetic old plans only (never a real participant's plan in git).
import { describe, it, expect } from 'vitest';
import { completerPlan, copier } from './vide';
import { hausseEntre, migrerM5 } from './migrerM5';
import { calculer } from '../utils/chiffres';
import { lireSauvegarde } from '../export/sauvegarde';
import { sectionsPdf } from '../export/contenu';
import type { M5Ancien, Plan } from '../types';

/** Old module 5 as saved before NEC-CC-38. */
function ancienM5(x: Partial<M5Ancien> = {}): M5Ancien {
  return {
    couts: [{ id: 'c1', libelle: '', montant: null }],
    prixVente: null,
    chargesFixes: { loyer: null, salaires: null, energie: null, transport: null, telephone: null, autres: null, lignes: [] },
    joursParMois: 25,
    investissements: [{ id: 'i1', libelle: '', montant: null }],
    stockDepart: null,
    fondsRoulementSaisi: null,
    ressources: { apport: null, subvention: null, pret: null, autre: null, autreLibelle: '' },
    annees: [0, 1, 2].map(() => ({ ventesParMois: null, chargesFixesMois: null })),
    tauxImpot: null,
    hypotheses: '',
    risques: [{ id: 'r1', risque: '', reponse: '' }],
    ...x
  };
}

const JUS_ANCIEN = ancienM5({
  couts: [
    { id: 'ex-c1', libelle: 'Fruits', montant: 800 },
    { id: 'ex-c2', libelle: 'Sucre', montant: 150 },
    { id: 'ex-c3', libelle: 'Bouteille', montant: 200 },
    { id: 'ex-c4', libelle: 'Étiquette', montant: 100 },
    { id: 'ex-c5', libelle: 'Énergie', montant: 150 }
  ],
  prixVente: 3000,
  chargesFixes: { loyer: 300000, salaires: 630000, energie: 100000, transport: 150000, telephone: 50000, autres: null, lignes: [{ id: 'f1', libelle: 'Promo', montant: 0 }] },
  investissements: [
    { id: 'ex-i1', libelle: 'Extracteur', montant: 1500000 },
    { id: 'ex-i2', libelle: 'Réfrigérateur', montant: 2000000 },
    { id: 'ex-i3', libelle: 'Cuisine', montant: 800000 },
    { id: 'ex-i4', libelle: 'Bouteilles', montant: 700000 }
  ],
  stockDepart: 310000,
  ressources: { apport: 2000000, subvention: 5000000, pret: 2000000, autre: 0, autreLibelle: 'Famille' },
  annees: [
    { ventesParMois: 1200, chargesFixesMois: null },
    { ventesParMois: 1600, chargesFixesMois: 1330000 },
    { ventesParMois: 2000, chargesFixesMois: 1530000 }
  ],
  tauxImpot: 20,
  hypotheses: 'Hôtels',
  risques: [{ id: 'r1', risque: 'Pluie', reponse: 'Stock' }]
});

function planAncien(m5: M5Ancien, uniteVente = 'bouteille'): Partial<Plan> & { id: string } {
  return { id: 'ancien', creeLe: '2026-11-11T08:00:00Z', modifieLe: '2026-11-11T08:00:00Z', rev: 4, uniteVente, m5: m5 as unknown as Plan['m5'] };
}

/** The figures of the OLD app (single product), recomputed here from the old fields as it did. */
function chiffresAnciens(m: M5Ancien) {
  const val = (x: number | null | undefined) => (typeof x === 'number' ? x : 0);
  const A = m.couts.reduce((t, l) => t + val(l.montant), 0);
  const B = typeof m.prixVente === 'number' ? m.prixVente : null;
  const cf = m.chargesFixes;
  const C = val(cf.loyer) + val(cf.salaires) + val(cf.energie) + val(cf.transport) + val(cf.telephone) + val(cf.autres) + cf.lignes.reduce((t, l) => t + val(l.montant), 0);
  const inv = m.investissements.reduce((t, l) => t + val(l.montant), 0);
  const fonds = typeof m.fondsRoulementSaisi === 'number' ? m.fondsRoulementSaisi : 3 * C + val(m.stockDepart);
  const ressources = val(m.ressources.apport) + val(m.ressources.subvention) + val(m.ressources.pret) + val(m.ressources.autre);
  const annees = m.annees.map((a, i) => {
    if (typeof a.ventesParMois !== 'number') return null;
    const q = a.ventesParMois * 12;
    const cfm = i === 0 ? C : typeof a.chargesFixesMois === 'number' ? a.chargesFixesMois : C;
    return Math.round(q * (B ?? 0) - q * A) - cfm * 12;
  });
  return { cout: A, marge: B === null ? null : B - A, C, besoins: inv + fonds, ressources, ecart: ressources - inv - fonds, annees };
}

function memesChiffres(m: M5Ancien) {
  const avant = chiffresAnciens(m);
  const plan = completerPlan(planAncien(copier(m)));
  const c = calculer(plan);
  expect(plan.m5.modele).toBe(2);
  expect(plan.m5.produits).toHaveLength(1);
  expect(c.coutUnitaire).toBe(avant.cout);
  expect(c.marge).toBe(avant.marge);
  expect(c.chargesFixes).toBe(avant.C);
  expect(c.besoins).toBe(avant.besoins);
  expect(c.ressources).toBe(avant.ressources);
  expect(c.ecart).toBe(avant.ecart);
  expect(c.annees.map((a) => (a ? a.resultat : null))).toEqual(avant.annees);
  return plan;
}

describe('migrerM5 (R9)', () => {
  it('full old plan: same figures, mapping of R9', () => {
    const plan = memesChiffres(JUS_ANCIEN);
    const m5 = plan.m5;
    expect(m5.produits[0]).toMatchObject({ nom: 'Produit principal', unite: 'bouteille', prix: 3000, ventesParMois: 1200 });
    expect(m5.produits[0].composants[0]).toEqual({ id: 'ex-c1', designation: 'Fruits', prixLot: 800, quantiteLot: 1, uniteLot: 'piece', quantiteUtilisee: 1, uniteUtilisee: 'piece' });
    expect(m5.investissements[2]).toEqual({ id: 'ex-i3', designation: 'Cuisine', quantite: 1, prixUnitaire: 800000 });
    // Lines at 0 or empty omitted ("autre" 0 here).
    expect(m5.ressources.map((r) => [r.nature, r.designation, r.valeur])).toEqual([
      ['argent', 'Apport personnel', 2000000],
      ['subvention', 'Subvention', 5000000],
      ['pret', 'Prêt', 2000000]
    ]);
    expect(m5.hausses[0]).toBeCloseTo(33.3333333, 6);
    expect(m5.hausses[1]).toBe(25);
    expect(m5.annees.map((a) => a.chargesFixesMois)).toEqual([null, 1330000, 1530000]);
    expect(m5.chargesFixes.loyer).toBe(300000);
    expect(m5.hypotheses).toBe('Hôtels');
    expect(m5.tauxImpot).toBe(20);
    expect('couts' in m5 || 'prixVente' in m5).toBe(false);
    expect(calculer(plan).annees.map((a) => a?.impot)).toEqual([1656000, 2952000, 4008000]);
  });

  it('half empty old plan (costs and price, no sales, other resource)', () => {
    const m = ancienM5({ couts: [{ id: 'a', libelle: 'Farine', montant: 120 }, { id: 'b', libelle: '', montant: null }], prixVente: 200, chargesFixes: { ...ancienM5().chargesFixes, loyer: 40000 }, ressources: { apport: 100000, subvention: null, pret: null, autre: 50000, autreLibelle: 'Tontine' } });
    const plan = memesChiffres(m);
    expect(plan.m5.ressources.map((r) => [r.nature, r.designation])).toEqual([
      ['argent', 'Apport personnel'],
      ['autre', 'Tontine']
    ]);
    expect(plan.m5.hausses).toEqual([null, null]);
  });

  it('empty old plan', () => {
    const plan = memesChiffres(ancienM5());
    expect(plan.m5.ressources).toEqual([]);
    expect(calculer(plan).annees).toEqual([null, null, null]);
  });

  it('3 years filled, with a year 2 lower than year 1 and decimals', () => {
    memesChiffres(ancienM5({ couts: [{ id: 'a', libelle: 'x', montant: 1000 }], prixVente: 20000, annees: [{ ventesParMois: 600 / 12, chargesFixesMois: null }, { ventesParMois: 37, chargesFixesMois: 750000 }, { ventesParMois: 800 / 12, chargesFixesMois: null }], chargesFixes: { ...ancienM5().chargesFixes, salaires: 460000 } }));
  });

  it('an empty old year leaves its growth empty', () => {
    const m = ancienM5({ annees: [{ ventesParMois: 100, chargesFixesMois: null }, { ventesParMois: null, chargesFixesMois: null }, { ventesParMois: 300, chargesFixesMois: null }] });
    expect(completerPlan(planAncien(m)).m5.hausses).toEqual([null, null]);
    expect(hausseEntre(1200, 1600)).toBeCloseTo(33.33, 2);
    expect(hausseEntre(0, 5)).toBeNull();
  });

  it('idempotent: twice = once; a new plan is returned unchanged', () => {
    const une = migrerM5(copier(JUS_ANCIEN), 'bouteille');
    const deux = migrerM5(copier(une), 'bouteille');
    expect(deux).toEqual(une);
    expect(migrerM5(une, 'x')).toBe(une);
    const plan = completerPlan(planAncien(copier(JUS_ANCIEN)));
    expect(completerPlan(copier(plan))).toEqual(plan);
    // Two phones migrating the same old plan give the same object (deterministic ids).
    expect(completerPlan(planAncien(copier(JUS_ANCIEN)))).toEqual(plan);
  });

  it('old safety copy (localStorage) and trainer screen: completerPlan of the raw JSON', () => {
    const brut = JSON.parse(JSON.stringify(planAncien(JUS_ANCIEN)));
    const plan = completerPlan(brut);
    expect(calculer(plan).annees[2]?.resultat).toBe(chiffresAnciens(JUS_ANCIEN).annees[2]);
    expect(JSON.stringify(sectionsPdf(plan))).not.toMatch(/undefined|NaN/);
  });

  it('old saved file is read and migrated; a new saved file is read too', () => {
    const fichier = JSON.stringify({ format: 'nec-business-plan', version: 1, enregistreLe: '2026-11-11T10:00:00Z', plan: { ...completerPlan({ id: 'z' }), m5: JUS_ANCIEN, uniteVente: 'bouteille' } });
    const plan = lireSauvegarde(fichier);
    expect(plan.m5.modele).toBe(2);
    expect(calculer(plan).besoins).toBe(chiffresAnciens(JUS_ANCIEN).besoins);
    const nouveau = lireSauvegarde(JSON.stringify({ format: 'nec-business-plan', version: 1, enregistreLe: '', plan }));
    expect(nouveau).toEqual(plan);
  });
});
