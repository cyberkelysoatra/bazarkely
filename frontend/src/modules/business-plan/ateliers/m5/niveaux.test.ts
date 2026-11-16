// NEC-CC-15: formulas written with the participant's own numbers, and the Bases screens walk.
import { describe, it, expect } from 'vitest';
import { exempleParId } from '../../data/exemples';
import { calculer } from '../../utils/chiffres';
import { DEBUT, PIEGES, PIEGES_PARTIE, ecransBases, formuleComposant, formules, formulesProduit, suivante } from './niveaux';

const n = (s: string | null) => (s ?? '').replace(/ /g, ' ');

describe('NEC-CC-15 levels of module 5', () => {
  const p = exempleParId('exemple')!.plan();
  const c = calculer(p);

  it('formulas use the plan numbers (JUS\'NOSY, NEC-CC-38: every product)', () => {
    const f = formules(p, c, 0);
    expect(n(f.caMois)).toBe("Chiffre d'affaires par mois = 3 000 × 1 200 + 2 000 × 300 + 500 × 600 = 4 500 000 Ar");
    expect(n(f.seuil)).toContain('1 230 000 ÷ 53,53 % = 2 297 634 Ar de chiffre d\'affaires par mois (arrondi au-dessus) ; 2 297 634 ÷ 25 jours = 91 906 Ar par jour');
    expect(n(f.resultat)).toBe('Résultat = 28 908 000 moins 14 760 000 = 14 148 000 Ar');
    expect(n(formulesProduit(c.produits[0]).marge)).toBe('Marge = 3 000 moins 1 400 = 1 600 Ar');
    expect(n(formuleComposant(p.m5.produits[0].composants[1]))).toBe('150 000 ÷ 50 kg × 50 g (= 0,05 kg) = 150 Ar');
    expect(n(formules(p, c, 1).ca)).toBe("Chiffre d'affaires = celui de l'année 1 × (1 + 33 %) = 71 820 000 Ar");
  });

  it('one product: the break-even in units stays in the formula', () => {
    const m = exempleParId('exemple-education')!.plan();
    m.m5.produits = m.m5.produits.slice(0, 1);
    const f = formules(m, calculer(m), 0);
    expect(n(f.seuil)).toContain('En unités : 750 000 ÷ 17 500 = 42,86, arrondi au-dessus : 43');
  });

  it('Bases 5b: beignet threshold 40 000 ÷ 80 = 500, pieces one per tap, then the part', () => {
    const e = ecransBases('5b', p, c);
    expect(e[1].morceaux).toContain('40 000 ÷ 80 = 500 beignets par mois.');
    let pos = DEBUT;
    let taps = 0;
    for (let next = suivante(e, pos); next; next = suivante(e, pos)) {
      pos = next;
      taps++;
    }
    expect(taps).toBe(e.reduce((t, x) => t + x.morceaux.length, 0) - 1);
  });

  it('Ciblé: codes per part, no em or en dash', () => {
    expect(PIEGES_PARTIE['5d']).toEqual(['CF', 'CA']);
    expect(JSON.stringify(PIEGES)).not.toMatch(/[\u2014\u2013]/);
  });
});
