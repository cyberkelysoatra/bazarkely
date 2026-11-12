// NEC-CC-22: post-test scores, gains, answer key and trainer evaluation (lot 2 test set, U2, U3, U4).
import { describe, it, expect } from 'vitest';
import type { AutoPretest, Posttest, Pretest, ReponsePretest } from '../types';
import { planVide } from '../etat/vide';
import { QUESTIONS, bonneReponse } from './pretest';
import {
  corrige,
  evaluer,
  lirePosttest,
  marquerPosttestOuvert,
  planComplet,
  posttestComplet,
  posttestOuvert,
  resultats,
  resultatsPlan,
  scoreA,
  scoreB,
  texteGain,
  texteIndicateurs,
  type LigneServeur
} from './posttest';

function reps(s: string): Record<number, ReponsePretest> {
  const r: Record<number, ReponsePretest> = {};
  s.split(' ').forEach((x, i) => (r[i + 1] = x as ReponsePretest));
  return r;
}
// Lot 2 test set: 1c 2a 3b 4 jnsp 5b 6a 7a 8b 9b 10c 11 jnsp 12b 13b 14a 15c = 9/15.
const PRE_LOT2: Pretest = { reponses: reps('c a b jnsp b a a b b c jnsp b b a c'), auto: [2, 2, 1, 2, 1, 2] as AutoPretest[], valideLe: '2026-11-14T06:00:00.000Z', source: 'app' };
const TOUTES_BONNES = (): Record<number, ReponsePretest> => Object.fromEntries(QUESTIONS.map((q) => [q.n, bonneReponse(q.n)]));
function post(termine = true): Posttest {
  return { reponses: TOUTES_BONNES(), auto: [3, 4, 3, 3, 4, 3], satisfaction: [4, 4, 3, 3, 4], servi: 'Le module 5', ameliorer: '', termineLe: termine ? '2026-11-14T14:00:00.000Z' : null };
}

describe('NEC-CC-22 post-test scores and gains', () => {
  it('lot 2 test set: 9/15, 15/15, gain A = 6', () => {
    const r = resultats(PRE_LOT2, post());
    expect(r.aPre).toBe(9);
    expect(r.aPost).toBe(15);
    expect(r.gainA).toBe(6);
    expect(texteGain(r.gainA)).toBe('+6');
  });

  it('score B /24 and gain B', () => {
    expect(scoreB(PRE_LOT2)).toBe(10);
    expect(scoreB(post())).toBe(20);
    expect(resultats(PRE_LOT2, post()).gainB).toBe(10);
    expect(scoreA(post())).toBe(15);
  });

  it('U4: no pre-test gives "non calculable"', () => {
    const r = resultats(null, post());
    expect(r.aPost).toBe(15);
    expect(r.gainA).toBeNull();
    expect(r.gainB).toBeNull();
    expect(texteGain(r.gainA)).toBe('non calculable');
  });

  it('a post-test not finished counts as no post-test', () => {
    expect(resultats(PRE_LOT2, post(false)).aPost).toBeNull();
  });

  it('reference pre-test of the plan: validated only (app or paper received)', () => {
    const plan = planVide();
    plan.posttest = post();
    expect(resultatsPlan(plan).gainA).toBeNull();
    plan.pretest = { ...PRE_LOT2, valideLe: null };
    expect(resultatsPlan(plan).gainA).toBeNull();
    plan.pretest = { ...PRE_LOT2, source: 'formateur' };
    expect(resultatsPlan(plan).gainA).toBe(6);
  });

  it('"Terminer" needs 15 answers, 6 lines B and 5 lines C; free texts optional', () => {
    const t = post(false);
    t.servi = '';
    expect(posttestComplet(t)).toBe(true);
    t.satisfaction = [4, 4, 3, 3, 0];
    expect(posttestComplet(t)).toBe(false);
    const u = post(false);
    delete u.reponses[11];
    expect(posttestComplet(u)).toBe(false);
    u.reponses[11] = 'jnsp';
    expect(posttestComplet(u)).toBe(true);
  });

  it('answer key: pre, post, right answer, existing explanation of a missed question', () => {
    const lignes = corrige(PRE_LOT2, post());
    expect(lignes).toHaveLength(15);
    expect(lignes[1]).toMatchObject({ n: 2, pre: 'a', post: 'b', bonne: 'b' });
    expect(lignes[1].explications[0]).toMatch(/proposition de valeur/);
    expect(lignes[0].explications).toEqual([]);
    // Q11 not known at the pre-test: module 5 explanations CF and CA.
    expect(lignes[10].explications).toHaveLength(2);
    expect(corrige(null, post())[0].pre).toBeNull();
  });

  it('opened once: kept, never unset; examples never open', () => {
    const plan = planVide();
    expect(posttestOuvert(plan)).toBe(false);
    expect(marquerPosttestOuvert(plan, false, 'x')).toBeNull();
    const ouvert = marquerPosttestOuvert(plan, true, '2026-11-14T13:45:00.000Z');
    expect(ouvert?.posttestOuvertLe).toBe('2026-11-14T13:45:00.000Z');
    expect(posttestOuvert(ouvert!)).toBe(true);
    expect(marquerPosttestOuvert(ouvert!, true, 'plus tard')).toBeNull();
    expect(marquerPosttestOuvert({ ...plan, exemple: true }, true, 'x')).toBeNull();
  });

  it('old or malformed post-test read safely', () => {
    expect(lirePosttest(null)).toBeNull();
    const t = lirePosttest({ reponses: { 1: 'c' }, auto: [5, 2] });
    expect(t?.auto).toEqual([0, 2, 0, 0, 0, 0]);
    expect(t?.satisfaction).toEqual([0, 0, 0, 0, 0]);
    expect(t?.termineLe).toBeNull();
  });
});

describe('NEC-CC-22 trainer evaluation (NEC-96)', () => {
  const complet = { identite: 100, m1: 100, m2: 100, m3: 100, m4: 100, m5: 100, impact: 100, synthese: 100, pitch: 0, prix: 0 };
  const A: LigneServeur = { plan_id: 'a', prenom: 'Aina', nom_projet: 'A', progression: complet, pretest: PRE_LOT2, pretest_formateur: null, posttest: post() };
  const B: LigneServeur = {
    plan_id: 'b',
    prenom: 'Bako',
    nom_projet: 'B',
    progression: { ...complet, impact: 90 },
    pretest: null,
    pretest_formateur: null,
    posttest: { ...post(), satisfaction: [3, 2, 3, 3, 3], servi: '', ameliorer: 'Plus de temps' }
  };
  // C: paper pre-test typed by the trainer, not received by the phone yet; post-test not finished.
  const C: LigneServeur = {
    plan_id: 'c',
    prenom: 'Fara',
    nom_projet: 'C',
    progression: {},
    pretest: null,
    pretest_formateur: { reponses: TOUTES_BONNES(), auto: [4, 4, 4, 4, 4, 4] },
    posttest: post(false)
  };

  it('rows, mean row, U2, U3, U4', () => {
    const e = evaluer([A, B, C]);
    expect(e.lignes.map((l) => [l.aPre, l.aPost, l.gainA])).toEqual([
      [9, 15, 6],
      [null, 15, null],
      [15, null, null]
    ]);
    expect(e.moyenne.aPre).toBe(12);
    expect(e.moyenne.aPost).toBe(15);
    expect(e.moyenne.gainA).toBe(6);
    expect(e.moyenne.bPre).toBe(17);
    expect(e.indicateurs.progressent).toBe(1);
    expect(e.indicateurs.progressentB).toBe(1);
    expect(e.indicateurs.calculables).toBe(1);
    expect(e.indicateurs.complets).toBe(1);
    expect(planComplet(complet)).toBe(true);
    expect(planComplet({ ...complet, synthese: 99 })).toBe(false);
  });

  it('rates per question, satisfaction to the hundredth, comments', () => {
    const e = evaluer([A, B, C]);
    // Q2: A wrong at the pre-test, C right: 50 % before; A and B right after: 100 %.
    expect(e.taux[1]).toEqual({ n: 2, avant: 50, apres: 100 });
    expect(e.satisfaction[1].moyenne).toBe(3);
    expect(e.satisfaction[0].moyenne).toBe(3.5);
    // (4+4+3+3+4 + 3+2+3+3+3) / 10 = 3.2
    expect(e.satisfactionGenerale).toBe(3.2);
    expect(e.commentaires).toEqual([
      { prenom: 'Aina', servi: 'Le module 5', ameliorer: '' },
      { prenom: 'Bako', servi: '', ameliorer: 'Plus de temps' }
    ]);
  });

  it('WhatsApp text: plain, no em dash, en dash or middle dot', () => {
    const t = texteIndicateurs(evaluer([A, B, C]), 'TESTCC22');
    expect(t).toMatch(/Participants qui progressent : 1 sur 1/);
    expect(t).toMatch(/Satisfaction moyenne \(sur 4\) : 3,2/);
    expect(t).toMatch(/Business plans complets : 1 sur 3/);
    expect(/[—–·]/.test(t)).toBe(false);
  });
});

describe('NEC-CC-22 the post-test is never printed', () => {
  it('PDF sections, summary and WhatsApp text hold no post-test answer', async () => {
    const { sectionsPdf, resumePdf } = await import('../export/contenu');
    const { texteWhatsApp } = await import('../export/texte');
    const { planExemple } = await import('../data/exemple');
    const plan = { ...planExemple(), exemple: undefined, posttestOuvertLe: '2026-11-14T13:45:00.000Z' };
    plan.posttest = { ...post(), servi: 'ZZSERVIZZ', ameliorer: 'ZZAMELIORERZZ' };
    const tout = JSON.stringify([sectionsPdf(plan), resumePdf(plan), texteWhatsApp(plan)]);
    expect(tout).not.toMatch(/ZZSERVIZZ|ZZAMELIORERZZ|post-test|Post-test/);
  });
});
