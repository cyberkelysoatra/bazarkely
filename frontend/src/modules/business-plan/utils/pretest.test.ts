// NEC-CC-16: the path computed from 5 real pre-tests of the NEC 2026 camp.
import { describe, it, expect } from 'vitest';
import type { AutoPretest, NiveauChiffres, Pretest, ReponsePretest } from '../types';
import { AUTO, ECART, QUESTIONS, calculerParcours, codesPieges, pretestComplet, pretestDe, pretestVide } from './pretest';
import { PIEGES } from '../ateliers/m5/niveaux';
import { planVide } from '../etat/vide';

function saisie(reponses: string, auto: number[]): Pretest {
  const r: Record<number, ReponsePretest> = {};
  reponses.split(' ').forEach((x, i) => (r[i + 1] = x as ReponsePretest));
  return { reponses: r, auto: auto as AutoPretest[], valideLe: '2026-11-12T10:00:00.000Z' };
}

const R = 'rapide', C = 'cible', B = 'bases';
function niveaux(p: Pretest): NiveauChiffres[] {
  return calculerParcours(p).lignes.map((l) => l.niveau);
}

describe('NEC-CC-16 pre-test path', () => {
  it('Stevio: 13/15', () => {
    const p = saisie('c b b a b a a b b b a a b b c', [3, 3, 2, 2, 3, 2]);
    expect(calculerParcours(p).score).toBe(13);
    expect(niveaux(p)).toEqual([R, R, C, R, R, C]);
  });

  it('Noreshca: 7/15', () => {
    const p = saisie('c b a a b a a jnsp jnsp jnsp jnsp a b b a', [1, 1, 1, 1, 1, 1]);
    expect(calculerParcours(p).score).toBe(7);
    expect(niveaux(p)).toEqual([C, B, C, C, B, C]);
  });

  it('Kangadja: 8/15, module 5 traps FR and CA', () => {
    const p = saisie('c b c b b c a d b b c c b b a', [3, 2, 3, 2, 0, 2]);
    const parcours = calculerParcours(p);
    expect(parcours.score).toBe(8);
    expect(niveaux(p)).toEqual([C, C, C, C, C, C]);
    expect(codesPieges(p)).toEqual(['FR', 'CA']);
    expect(parcours.lignes[4].explications).toEqual([PIEGES.FR, PIEGES.CA]);
    // Q3 and Q4 missed: one explanation only.
    expect(parcours.lignes[0].explications).toHaveLength(1);
  });

  it('Socrato: 6/15, module 5 trap CA', () => {
    const p = saisie('jnsp jnsp jnsp a c jnsp b b b b c a b b a', [1, 2, 1, 2, 2, 1]);
    expect(calculerParcours(p).score).toBe(6);
    expect(niveaux(p)).toEqual([B, C, B, C, C, C]);
    expect(codesPieges(p)).toEqual(['CA']);
  });

  it('Christian: 4/15, self-assessment gap on B1, B4 and B5 only', () => {
    const p = saisie('jnsp jnsp jnsp jnsp a b a jnsp d b c jnsp jnsp jnsp c', [4, 2, 3, 3, 3, 2]);
    const parcours = calculerParcours(p);
    expect(parcours.score).toBe(4);
    expect(niveaux(p)).toEqual([B, C, C, B, B, B]);
    expect(parcours.lignes.filter((l) => l.ecart).map((l) => l.id)).toEqual(['m1', 'm4', 'm5']);
  });

  it('module 2 follows B2 and says so', () => {
    const base = 'c b b a b b a b b b a b b b c';
    expect(calculerParcours(saisie(base, [0, 1, 0, 0, 0, 0])).lignes[1]).toMatchObject({ niveau: B, parAuto: true });
    expect(calculerParcours(saisie(base, [0, 4, 0, 0, 0, 0])).lignes[1].niveau).toBe(R);
    expect(calculerParcours(saisie(base, [0, 0, 0, 0, 0, 0])).lignes[1].niveau).toBe(C);
    expect(calculerParcours(saisie(base, [4, 4, 4, 4, 4, 4])).score).toBe(15);
  });

  it('completeness, empty and old plans', () => {
    expect(pretestComplet(pretestVide())).toBe(false);
    expect(pretestComplet(saisie('jnsp jnsp jnsp jnsp jnsp jnsp jnsp jnsp jnsp jnsp jnsp jnsp jnsp jnsp jnsp', []))).toBe(true);
    const ancien = planVide();
    expect(ancien.pretest).toBeUndefined();
    expect(pretestDe(ancien)).toEqual(pretestVide());
  });

  it('texts: 15 questions, 6 lines, no long dash', () => {
    expect(QUESTIONS).toHaveLength(15);
    expect(AUTO).toHaveLength(6);
    const tout = JSON.stringify(QUESTIONS) + AUTO.join('') + ECART + JSON.stringify(calculerParcours(saisie('a a a a a a b a a a b a a a a', [])));
    expect(tout).not.toMatch(new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']'));
  });
});
