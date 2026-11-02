import { describe, expect, it } from 'vitest';
import { calculerChemin, etatChemin, phraseRecapitulatif, texteComptes, type QuestionChemin } from './chemin';

// The 4-question tree of phase 1 (test client « Essai atelier »): 1 → 2; 2 A (recommended) → 3,
// 2 B and C → 2 bis; 2 bis → next by order (3); 3 → FIN.
const choix = (q: string, natures: string[], suites: (string | null)[], conseille = -1) =>
  natures.map((nature, i) => ({ id: `${q}${'ABC'[i]}`, nature, conseille: i === conseille, suivante: suites[i] }));

const ARBRE: QuestionChemin[] = [
  { id: 'q1', numero: '1', ordre: 1, choix: choix('q1', ['validation', 'reserve', 'refus'], ['2', '2', '2']) },
  { id: 'q2', numero: '2', ordre: 2, choix: choix('q2', ['choix', 'choix', 'choix'], ['3', '2 bis', '2 bis'], 0) },
  { id: 'q2b', numero: '2 bis', ordre: 3, choix: choix('q2b', ['choix', 'choix', 'choix'], [null, null, null]) },
  { id: 'q3', numero: '3', ordre: 4, choix: choix('q3', ['validation', 'reserve', 'refus'], ['FIN', 'FIN', 'FIN']) }
];

const numeros = (r: Record<string, string>) => calculerChemin(ARBRE, r).map((e) => e.question.numero);

describe('calculerChemin (same rule as vc_chemin)', () => {
  it('no answer follows the recommended choice: 1, 2, 3', () => {
    expect(numeros({})).toEqual(['1', '2', '3']);
    const c = calculerChemin(ARBRE, {});
    expect(c.map((e) => e.rang)).toEqual([1, 2, 3]);
    expect(c.every((e) => e.choix === null)).toBe(true);
  });

  it('A at 2 gives 1, 2, 3; B gives 1, 2, 2 bis, 3', () => {
    expect(numeros({ q1: 'q1A', q2: 'q2A' })).toEqual(['1', '2', '3']);
    expect(numeros({ q1: 'q1A', q2: 'q2B' })).toEqual(['1', '2', '2 bis', '3']);
  });

  it('a changed answer lengthens then shortens the path; answers off the path no longer count', () => {
    const long = calculerChemin(ARBRE, { q1: 'q1A', q2: 'q2B', q2b: 'q2bA' });
    expect(long.length).toBe(4);
    expect(etatChemin(long)).toMatchObject({ total: 4, repondues: 3, jauge: 75 });
    const court = calculerChemin(ARBRE, { q1: 'q1A', q2: 'q2A', q2b: 'q2bA' });
    expect(court.map((e) => e.question.numero)).toEqual(['1', '2', '3']);
    expect(etatChemin(court)).toMatchObject({ total: 3, repondues: 2, jauge: 67, pret: false });
  });

  it('FIN stops the path; a missing target stops; no question twice', () => {
    const fin: QuestionChemin[] = ARBRE.map((q) => (q.id === 'q1' ? { ...q, choix: choix('q1', ['validation', 'reserve', 'refus'], ['FIN', '2', '2']) } : q));
    expect(calculerChemin(fin, { q1: 'q1A' }).map((e) => e.question.numero)).toEqual(['1']);
    const absente: QuestionChemin[] = ARBRE.map((q) => (q.id === 'q1' ? { ...q, choix: choix('q1', ['validation', 'reserve', 'refus'], ['9', '9', '9']) } : q));
    expect(calculerChemin(absente, {}).map((e) => e.question.numero)).toEqual(['1', '2', '3']);
    expect(calculerChemin(absente, { q1: 'q1B' }).map((e) => e.question.numero)).toEqual(['1']);
    const boucle: QuestionChemin[] = ARBRE.map((q) => (q.id === 'q2' ? { ...q, choix: choix('q2', ['choix', 'choix', 'choix'], ['1', '1', '1'], 0) } : q));
    expect(calculerChemin(boucle, {}).map((e) => e.question.numero)).toEqual(['1', '2']);
    expect(calculerChemin([], {})).toEqual([]);
  });

  it('order is by « ordre », not by array position; an unknown choice id counts as no answer', () => {
    expect(calculerChemin([...ARBRE].reverse(), { q2: 'q2B' }).map((e) => e.question.numero)).toEqual(['1', '2', '2 bis', '3']);
    expect(numeros({ q2: 'zzz' })).toEqual(['1', '2', '3']);
  });
});

describe('etatChemin (same counts as vc_etat, RM1, RM16)', () => {
  it('a refusal leaves the gauge unchanged but the path can still be ready', () => {
    const avant = etatChemin(calculerChemin(ARBRE, { q1: 'q1A', q2: 'q2A' }));
    expect(avant).toEqual({ total: 3, repondues: 2, acceptees: 2, refus: 0, reserves: 0, jauge: 67, pret: false });
    const apres = etatChemin(calculerChemin(ARBRE, { q1: 'q1A', q2: 'q2A', q3: 'q3C' }));
    expect(apres).toEqual({ total: 3, repondues: 3, acceptees: 2, refus: 1, reserves: 0, jauge: 67, pret: true });
  });

  it('a reservation counts as accepted; all accepted gives 100', () => {
    expect(etatChemin(calculerChemin(ARBRE, { q1: 'q1B', q2: 'q2A', q3: 'q3A' }))).toMatchObject({ acceptees: 3, reserves: 1, jauge: 100, pret: true });
    expect(etatChemin([])).toMatchObject({ total: 0, jauge: 0, pret: false });
  });

  it('counts lines of screens 7 and 8', () => {
    const e = etatChemin(calculerChemin(ARBRE, { q1: 'q1A', q2: 'q2A', q3: 'q3C' }));
    expect(texteComptes(e)).toBe('2 validées, 0 réserve, 1 refus');
    expect(phraseRecapitulatif(e)).toBe('2 validées, 0 réserve, 1 refus. Joël reprendra le refus dans la version suivante.');
    expect(phraseRecapitulatif({ total: 8, repondues: 8, acceptees: 7, refus: 1, reserves: 1, jauge: 88, pret: true })).toBe(
      '6 validées, 1 réserve, 1 refus. Joël reprendra le refus et la réserve dans la version suivante.'
    );
    expect(phraseRecapitulatif({ total: 3, repondues: 1, acceptees: 1, refus: 0, reserves: 0, jauge: 33, pret: false })).toBe(
      '1 validée, 0 réserve, 0 refus. 2 questions restent à répondre.'
    );
  });
});
