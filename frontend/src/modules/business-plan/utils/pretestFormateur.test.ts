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

describe('adopterPretest, correction by the trainer (NEC-CC-21)', () => {
  const LE1 = '2026-11-12T15:00:00.123456+00:00';
  const LE2 = '2026-11-12T15:05:00.654321+00:00';
  const TREIZE: ReponsePretest[] = ['a', 'a', ...BONNES.slice(2)];
  const recu = () => adopterPretest(completerPlan(planVide()), papier(TREIZE), MAINTENANT, LE1)!;
  const app = () => {
    const plan = completerPlan(planVide());
    plan.pretest = { reponses: { 1: 'a' }, auto: [1, 1, 1, 1, 1, 1], valideLe: '2026-11-12T08:00:00.000Z', source: 'app' };
    return plan;
  };

  it('stores the server time of the version adopted', () => {
    const plan = recu();
    expect(score(pretestDe(plan))).toBe(13);
    expect(pretestDe(plan).recuLe).toBe(LE1);
    expect(pretestDe(completerPlan(JSON.parse(JSON.stringify(plan)))).recuLe).toBe(LE1);
  });
  it('adopts a correction when the server time is later', () => {
    const corrige = adopterPretest(recu(), papier(), '2026-11-12T16:10:00.000Z', LE2);
    expect(corrige).not.toBeNull();
    const t = pretestDe(corrige!);
    expect(score(t)).toBe(15);
    expect(t.source).toBe('formateur');
    expect(t.recuLe).toBe(LE2);
    expect(corrige!.niveauChiffres).toBe('rapide');
  });
  it('ignores the same or an older server time', () => {
    expect(adopterPretest(recu(), papier(), MAINTENANT, LE1)).toBeNull();
    expect(adopterPretest(recu(), papier(), MAINTENANT, '2026-11-12T14:00:00+00:00')).toBeNull();
    expect(adopterPretest(recu(), papier(), MAINTENANT, null)).toBeNull();
  });
  it('a clear by the trainer removes the paper pre-test (back to not done)', () => {
    const efface = adopterPretest(recu(), null, MAINTENANT, null);
    expect(efface).not.toBeNull();
    expect(efface!.pretest).toBeUndefined();
    expect(pretestDe(efface!).valideLe).toBeNull();
  });
  it('a pre-test done in the app is kept, for a correction and for a clear', () => {
    expect(adopterPretest(app(), papier(), MAINTENANT, LE2)).toBeNull();
    expect(adopterPretest(app(), null, MAINTENANT, null)).toBeNull();
    const sansSource = app();
    delete sansSource.pretest!.source;
    expect(adopterPretest(sansSource, papier(), MAINTENANT, LE2)).toBeNull();
    expect(adopterPretest(sansSource, null, MAINTENANT, null)).toBeNull();
  });
  it('an old plan without recuLe takes the correction (and is not cleared)', () => {
    const vieux = adopterPretest(completerPlan(planVide()), papier(TREIZE), MAINTENANT)!;
    expect(pretestDe(vieux).recuLe).toBeUndefined();
    const corrige = adopterPretest(vieux, papier(), MAINTENANT, LE2);
    expect(score(pretestDe(corrige!))).toBe(15);
    expect(pretestDe(corrige!).recuLe).toBe(LE2);
    expect(adopterPretest(vieux, null, MAINTENANT, null)).toBeNull();
  });
  it('nothing on the server and nothing received: no change', () => {
    expect(adopterPretest(completerPlan(planVide()), null, MAINTENANT, null)).toBeNull();
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
