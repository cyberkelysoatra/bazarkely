// NEC-CC-13: the 6 worked examples, figures recomputed by the app against the totals written in each
// source file (contenu-pedagogique/exemples/*.md and the ETAPE files for TRANO KELY).
import { describe, it, expect } from 'vitest';
import { EXEMPLES, exempleDuSecteur, exempleParId, planExempleParId } from '.';
import { calculer, alertes } from '../../utils/chiffres';
import { calculerMarche } from '../../ateliers/m3/calculs';
import { textePhrase } from '../../ateliers/m1/phrase';

// NEC-CC-38: 3 products per example (LISTES-M5-EXEMPLES.md v0.3, validated by CGA). `cu`, `marge`, `taux` =
// produit principal (product 1 = the old single product, same cost); `seuil` = break-even in turnover per month
// (cahier R4); needs = resources unchanged; year results computed by the app (growth = exact ratio of the old sales).
const SOURCE: Record<string, { cu: number; marge: number; taux: number; cf: number; seuil: number; besoins: number; ca1: number; res: number[]; ventesM3: number }> = {
  agriculture: { cu: 1400, marge: 1600, taux: 53, cf: 1230000, seuil: 2297634, besoins: 9000000, ca1: 54000000, res: [14148000, 22487640, 29699550], ventesM3: 1200 },
  'economie-bleue': { cu: 12800, marge: 4200, taux: 25, cf: 785000, seuil: 3262819, besoins: 7655000, ca1: 105840000, res: [16044000, 23673000, 31362000], ventesM3: 400 },
  tourisme: { cu: 15250, marge: 29750, taux: 66, cf: 680000, seuil: 1004968, besoins: 7830000, ca1: 35700000, res: [15996000, 18478667, 19908000], ventesM3: 54 },
  energie: { cu: 150, marge: 850, taux: 85, cf: 590000, seuil: 689185, besoins: 9370000, ca1: 22680000, res: [12336000, 17812308, 20930770], ventesM3: 1560 },
  numerique: { cu: 13500, marge: 11500, taux: 46, cf: 580000, seuil: 1246192, besoins: 6740000, ca1: 41640000, res: [12420000, 19113334, 23713334], ventesM3: 90 },
  education: { cu: 2500, marge: 17500, taux: 88, cf: 750000, seuil: 866719, besoins: 8150000, ca1: 18000000, res: [6576000, 9172000, 11468000], ventesM3: 60 },
  // NEC-CC-17: MADIO NOSY, compost sale left out of the revenues as in the source.
  environnement: { cu: 13000, marge: 37000, taux: 74, cf: 740000, seuil: 991172, besoins: 10720000, ca1: 21120000, res: [6888000, 13458000, 16794000], ventesM3: 24 }
};

/** Known differences between the source and what the app computes (written in the NEC-CC-13 report). */
const ECARTS: Record<string, { ca1?: number; res?: number[]; ventesM3?: number }> = {
  // 10 % of 3 840 kg is 384; the source rounds to 400 kg (module 5 keeps the source's 400).
  'economie-bleue': { ventesM3: 384 }
};

describe('NEC-CC-13 worked examples', () => {
  it('one example per sector, stable ids, JUS\'NOSY keeps "exemple"', () => {
    expect(EXEMPLES.map((e) => e.secteur)).toEqual(['agriculture', 'economie-bleue', 'tourisme', 'energie', 'numerique', 'education', 'environnement']);
    expect(EXEMPLES.map((e) => e.id)).toEqual(['exemple', 'exemple-economie-bleue', 'exemple-tourisme', 'exemple-energie', 'exemple-numerique', 'exemple-education', 'exemple-environnement']);
    expect(EXEMPLES.map((e) => e.nom)).toEqual(["JUS'NOSY", 'FRAÎCHEUR BAY', 'TRANO KELY', 'JIRO KELY', "FIX'NOSY", 'MIANATRA PLUS', 'MADIO NOSY']);
  });

  it('autre, empty or unknown sector: TRANO KELY', () => {
    expect(exempleDuSecteur('autre').nom).toBe('TRANO KELY');
    expect(exempleDuSecteur('').nom).toBe('TRANO KELY');
    expect(exempleDuSecteur(undefined).nom).toBe('TRANO KELY');
    expect(exempleDuSecteur('economie-bleue').nom).toBe('FRAÎCHEUR BAY');
    expect(exempleDuSecteur('energie').nom).toBe('JIRO KELY');
    expect(exempleDuSecteur('environnement').nom).toBe('MADIO NOSY');
  });

  it('an id that is not an example loads nothing', () => {
    expect(planExempleParId('a1b2')).toBeNull();
    expect(planExempleParId(undefined)).toBeNull();
    expect(exempleParId('exemple-energie')?.nom).toBe('JIRO KELY');
  });

  it('MIANATRA PLUS: 50 pupils a month = the 600 yearly subscriptions of the source (NEC-CC-15-B), sentence kept', () => {
    const p = exempleParId('exemple-education')!.plan();
    const c = calculer(p);
    expect(p.m5.produits[0].ventesParMois).toBe(50);
    expect(c.produits[0].caMois * 12).toBe(12000000);
    expect(c.seuilCaJour).toBeNull();
    expect(p.m5.hypotheses).toContain('Cours payés 10 mois par an : ventes ramenées à une moyenne sur 12 mois');
  });

  it('NEC-CC-38: 3 products each, positive margins, equipment brought in JUS\'NOSY, product 1 = the old cost', () => {
    for (const e of EXEMPLES) {
      const c = calculer(e.plan());
      expect(c.produits).toHaveLength(3);
      expect(c.produits.every((x) => x.marge !== null && x.marge > 0)).toBe(true);
    }
    expect(calculer(exempleParId('exemple')!.plan()).apporte).toBe(800000);
  });

  for (const e of EXEMPLES) {
    describe(e.nom, () => {
      const p = e.plan();
      const c = calculer(p);
      const s = SOURCE[e.secteur];
      const x = ECARTS[e.secteur] ?? {};

      it('read only, own id and sector, fresh copy each call', () => {
        expect(p.exemple).toBe(true);
        expect(p.id).toBe(e.id);
        expect(p.identite.secteur).toBe(e.secteur);
        expect(p.identite.nomProjet).toBe(e.nom);
        expect(e.plan()).not.toBe(p);
      });

      it('module 5 figures match the source totals', () => {
        expect(c.coutUnitaire).toBe(s.cu);
        expect(c.marge).toBe(s.marge);
        expect(c.tauxMarge).toBe(s.taux);
        expect(c.chargesFixes).toBe(s.cf);
        expect(c.seuilCaMois).toBe(s.seuil);
        expect(c.besoins).toBe(s.besoins);
        expect(c.ressources).toBe(s.besoins);
        expect(c.annees[0]?.ca).toBe(x.ca1 ?? s.ca1);
        expect(c.annees.map((a) => a?.resultat)).toEqual(x.res ?? s.res);
        expect(alertes(p)).toEqual([]);
      });

      it('both environment lines filled (ETAPE-06 v0.2, part 7 bis)', () => {
        expect(p.impact?.envTrace?.trim()).toBeTruthy();
        expect(p.impact?.envReduction?.trim()).toBeTruthy();
      });

      it('module 3 market matches the source', () => {
        expect(calculerMarche(p.m3).ventesMois).toBe(x.ventesM3 ?? s.ventesM3);
      });

      it('complete value proposition sentence, no em dash, no en dash, no "(?)"', () => {
        expect(textePhrase(p)).not.toContain('[');
        const json = JSON.stringify(p);
        expect(json).not.toMatch(/[—–]/);
        expect(json).not.toContain('(?)');
      });
    });
  }
});
