// NEC-CC-20: merge rule of the paper pre-test typed by the trainer and pulled by the phone.
import { describe, it, expect } from 'vitest';
import { adopterPretest, lirePretestDistant, pretestDe, score } from './pretest';
import { completerPlan, planVide } from '../etat/vide';
import { tagPretest } from '../pages/Formateur';
import type { ReponsePretest } from '../types';

const BONNES: ReponsePretest[] = ['c', 'b', 'b', 'a', 'b', 'b', 'a', 'b', 'b', 'b', 'a', 'b', 'b', 'b', 'c'];
function papier(reps: ReponsePretest[] = BONNES, auto: number[] = [2, 3, 1, 4, 2, 3]) {
  return { reponses: Object.fromEntries(reps.map((r, i) => [String(i + 1), r])), auto };
}
const MAINTENANT = '2026-11-12T16:00:00.000Z';

describe('lirePretestDistant', () => {
  it('accepts a full paper pre-test (JSON keys are strings)', () => {
    const lu = lirePretestDistant(papier());
    expect(lu?.reponses[1]).toBe('c');
    expect(lu?.auto).toEqual([2, 3, 1, 4, 2, 3]);
  });
  it('ignores malformed or incomplete data', () => {
    expect(lirePretestDistant(null)).toBeNull();
    expect(lirePretestDistant('x')).toBeNull();
    expect(lirePretestDistant({ reponses: [], auto: [1, 1, 1, 1, 1, 1] })).toBeNull();
    expect(lirePretestDistant({ ...papier(), auto: [1, 1, 1] })).toBeNull();
    expect(lirePretestDistant({ ...papier(), auto: [1, 1, 1, 1, 1, 0] })).toBeNull();
    expect(lirePretestDistant(papier(BONNES.slice(0, 14)))).toBeNull();
    expect(lirePretestDistant(papier(['z' as ReponsePretest, ...BONNES.slice(1)]))).toBeNull();
  });
});

describe('adopterPretest', () => {
  it('adopts the paper pre-test when none is validated on the phone', () => {
    const plan = completerPlan(planVide());
    const adopte = adopterPretest(plan, papier(), MAINTENANT);
    expect(adopte).not.toBeNull();
    const t = pretestDe(adopte!);
    expect(t.valideLe).toBe(MAINTENANT);
    expect(t.source).toBe('formateur');
    expect(score(t)).toBe(15);
    expect(adopte!.niveauChiffres).toBe('rapide');
    expect(plan.pretest).toBeUndefined(); // the input is not changed
  });
  it('adopts over a pre-test started but not validated on the phone', () => {
    const plan = completerPlan(planVide());
    plan.pretest = { reponses: { 1: 'a' }, auto: [0, 0, 0, 0, 0, 0], valideLe: null };
    expect(adopterPretest(plan, papier(), MAINTENANT)?.pretest?.reponses[1]).toBe('c');
  });
  it("keeps the phone's validated pre-test", () => {
    const plan = completerPlan(planVide());
    plan.pretest = { reponses: { 1: 'a' }, auto: [1, 1, 1, 1, 1, 1], valideLe: '2026-11-12T08:00:00.000Z' };
    expect(adopterPretest(plan, papier(), MAINTENANT)).toBeNull();
  });
  it('ignores malformed data and example plans', () => {
    const plan = completerPlan(planVide());
    expect(adopterPretest(plan, { reponses: 'x', auto: [] }, MAINTENANT)).toBeNull();
    expect(adopterPretest(plan, null, MAINTENANT)).toBeNull();
    expect(adopterPretest({ ...plan, exemple: true }, papier(), MAINTENANT)).toBeNull();
  });
  it('keeps the source when the pre-test is read back', () => {
    const plan = adopterPretest(completerPlan(planVide()), papier(), MAINTENANT)!;
    expect(pretestDe(completerPlan(JSON.parse(JSON.stringify(plan)))).source).toBe('formateur');
  });
});

describe('tagPretest', () => {
  it('app, paper or nothing', () => {
    expect(tagPretest({ pretest_valide: 'app', pretest_formateur: papier() as never })).toBe('pré-test app');
    expect(tagPretest({ pretest_valide: null, pretest_formateur: papier() as never })).toBe('pré-test papier');
    expect(tagPretest({ pretest_valide: 'formateur', pretest_formateur: null })).toBe('pré-test papier');
    expect(tagPretest({ pretest_valide: null, pretest_formateur: null })).toBe('');
    expect(tagPretest({})).toBe('');
  });
});
