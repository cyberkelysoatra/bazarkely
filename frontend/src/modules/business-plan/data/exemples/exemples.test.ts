// NEC-CC-13: the 6 worked examples, figures recomputed by the app against the totals written in each
// source file (contenu-pedagogique/exemples/*.md and the ETAPE files for TRANO KELY).
import { describe, it, expect } from 'vitest';
import { EXEMPLES, exempleDuSecteur, exempleParId, planExempleParId } from '.';
import { calculer, alertes } from '../../utils/chiffres';
import { calculerMarche } from '../../ateliers/m3/calculs';
import { textePhrase } from '../../ateliers/m1/phrase';

const SOURCE: Record<string, { cu: number; marge: number; taux: number; cf: number; seuil: number; besoins: number; ca1: number; res: number[]; ventesM3: number }> = {
  agriculture: { cu: 1400, marge: 1600, taux: 53, cf: 1230000, seuil: 769, besoins: 9000000, ca1: 43200000, res: [8280000, 14760000, 20040000], ventesM3: 1200 },
  'economie-bleue': { cu: 12800, marge: 4200, taux: 25, cf: 785000, seuil: 187, besoins: 7655000, ca1: 81600000, res: [10740000, 16380000, 22080000], ventesM3: 400 },
  tourisme: { cu: 15250, marge: 29750, taux: 66, cf: 680000, seuil: 23, besoins: 7830000, ca1: 29160000, res: [11118000, 12336000, 13404000], ventesM3: 54 },
  energie: { cu: 150, marge: 850, taux: 85, cf: 590000, seuil: 695, besoins: 9370000, ca1: 18720000, res: [8832000, 13320000, 15540000], ventesM3: 1560 },
  numerique: { cu: 13500, marge: 11500, taux: 46, cf: 580000, seuil: 51, besoins: 6740000, ca1: 27000000, res: [5460000, 9060000, 11340000], ventesM3: 90 },
  education: { cu: 2500, marge: 17500, taux: 88, cf: 750000, seuil: 43, besoins: 8150000, ca1: 12000000, res: [1500000, 3250000, 4700000], ventesM3: 60 },
  // NEC-CC-17: MADIO NOSY, compost sale left out of the revenues as in the source.
  environnement: { cu: 13000, marge: 37000, taux: 74, cf: 740000, seuil: 20, besoins: 10720000, ca1: 14400000, res: [1776000, 6216000, 7848000], ventesM3: 24 }
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

  it('MIANATRA PLUS: 10 paying months spread over 12, source totals, visible sentence (NEC-CC-15-B)', () => {
    const p = exempleParId('exemple-education')!.plan();
    const c = calculer(p);
    expect(c.annees.map((a) => a?.quantites)).toEqual([600, 700, 800]);
    expect(c.annees.map((a) => a?.ca)).toEqual([12000000, 14000000, 16000000]);
    expect(c.annees.map((a) => a?.cv)).toEqual([1500000, 1750000, 2000000]);
    expect(c.annees.map((a) => a?.chargesAnnee)).toEqual([9000000, 9000000, 9300000]);
    expect(c.annees[0]?.resultat).toBe(1500000);
    expect(p.m5.hypotheses).toContain('Cours payés 10 mois par an : ventes ramenées à une moyenne sur 12 mois');
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
        expect(c.seuilMois).toBe(s.seuil);
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
