// NEC-CC-15: formulas written with the participant's own numbers, and the Bases screens walk.
import { describe, it, expect } from 'vitest';
import { exempleParId } from '../../data/exemples';
import { calculer } from '../../utils/chiffres';
import { DEBUT, PIEGES, PIEGES_PARTIE, ecransBases, formules, suivante } from './niveaux';

const n = (s: string | null) => (s ?? '').replace(/ /g, ' ');

describe('NEC-CC-15 levels of module 5', () => {
  const p = exempleParId('exemple')!.plan();
  const c = calculer(p);

  it('formulas use the plan numbers (JUS\'NOSY)', () => {
    const f = formules(p, c, 0);
    expect(n(f.marge)).toBe('Marge = 3 000 moins 1 400 = 1 600 Ar');
    expect(n(f.seuil)).toContain('1 230 000 ÷ 1 600 = 768,75, arrondi au-dessus : 769');
    expect(n(f.resultat)).toBe('Résultat = 23 040 000 moins 14 760 000 = 8 280 000 Ar');
  });

  it('12-month average sales written with a comma (MIANATRA PLUS)', () => {
    const m = exempleParId('exemple-education')!.plan();
    expect(n(formules(m, calculer(m), 1).quantites)).toBe('Quantités = 58,33 par mois × 12 mois = 700');
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
