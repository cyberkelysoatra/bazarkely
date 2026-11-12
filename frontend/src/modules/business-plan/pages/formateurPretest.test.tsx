// NEC-CC-16: trainer line "Pré-test" for a plan with and without a pre-test (old plans included).
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LignePretest } from './FormateurPlan';
import { completerPlan, planVide } from '../etat/vide';
import { progressionGlobale } from '../rubriques/registre';
import type { Pretest, ReponsePretest } from '../types';

describe('NEC-CC-16 trainer pre-test line', () => {
  it('old plan (no pretest): "non fait"', () => {
    const ancien = completerPlan({ ...planVide(), id: 'ancien' });
    delete ancien.pretest;
    const { container } = render(<LignePretest plan={ancien} />);
    expect(container.textContent).toBe('Pré-test : non fait');
  });

  it('typed but not validated: "non fait"', () => {
    const p = planVide();
    p.pretest = { reponses: { 1: 'c' }, auto: [0, 0, 0, 0, 0, 0], valideLe: null };
    expect(render(<LignePretest plan={p} />).container.textContent).toBe('Pré-test : non fait');
  });

  it('validated (Christian): score and levels, global progress unchanged', () => {
    const p = planVide();
    const avant = progressionGlobale(p);
    const reponses: Record<number, ReponsePretest> = {};
    'jnsp jnsp jnsp jnsp a b a jnsp d b c jnsp jnsp jnsp c'.split(' ').forEach((x, i) => (reponses[i + 1] = x as ReponsePretest));
    const t: Pretest = { reponses, auto: [4, 2, 3, 3, 3, 2], valideLe: '2026-11-12T10:00:00.000Z' };
    // As received from the server (contenu = the whole plan).
    const recu = completerPlan(JSON.parse(JSON.stringify({ ...p, pretest: t })));
    const texte = render(<LignePretest plan={recu} />).container.textContent ?? '';
    expect(texte).toContain('Pré-test : 4/15');
    expect(texte).toContain('Module 1 : Bases');
    expect(texte).toContain('Module 2 : Ciblé');
    expect(texte).toContain('Module 3 : Ciblé');
    expect(texte).toContain('Synthèse : Bases');
    expect(progressionGlobale(recu)).toBe(avant);
  });
});
