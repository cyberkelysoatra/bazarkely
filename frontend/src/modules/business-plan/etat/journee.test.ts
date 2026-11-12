// NEC-CC-18: day schedule, day gauge, ahead / late gap.
import { describe, expect, it } from 'vitest';
import { planVide } from './vide';
import { planExemple } from '../data/exemple';
import { ecart, etapePrevue, etapesDuPlan, progressionJournee, texteEcart, etapesRestantes, etapeDeRubrique } from './journee';
import { RUBRIQUES, progressionGlobale } from '../rubriques/registre';
import type { Plan } from '../types';

const a = (heure: number, minute: number) => new Date(2026, 10, 12, heure, minute, 0);

function remplirIdentite(p: Plan) {
  Object.assign(p.identite, { nomPrenom: 'Rasoa', nomProjet: 'Test', secteur: 'agriculture', lieu: 'Hell-Ville', unePhrase: 'Une phrase', avancement: 'idee', porteurs: 'Moi', attentes: 'Apprendre' });
}
function remplirM1(p: Plan) {
  const m = p.m1;
  Object.assign(m, { consequences: 'x', probleme: 'x', causes: 'x', pourquoiMoi: 'x' });
  Object.assign(m.client, { qui: 'x', ou: 'x', combien: 'x', aujourdhui: 'x', prixAujourdhui: 'x', decideur: 'x' });
  Object.assign(m.pv, { pour: 'x', qui: 'x', propose: 'x', quiBenefice: 'x', contrairement: 'x' });
}
function planIdentiteM1(): Plan {
  const p = planVide();
  remplirIdentite(p);
  remplirM1(p);
  return p;
}

describe('NEC-CC-18 day gauge', () => {
  it('identity and module 1 at 100 %, everything else empty: 18 %', () => {
    const p = planIdentiteM1();
    const e = etapesDuPlan(p);
    expect(e[0].fait).toBe(true);
    expect(e[1].fait).toBe(true);
    expect(e.slice(2).every((x) => !x.fait)).toBe(true);
    expect(progressionJournee(p)).toBe(18);
    expect(etapesRestantes(p)).toBe(9);
  });

  it('global progress itself is unchanged (still the mean of the 14 sections)', () => {
    expect(progressionGlobale(planIdentiteM1())).toBe(14);
  });

  it('step 9 is the mean of synthesis and pitch, done only when both are', () => {
    const p = planExemple();
    const e9 = etapesDuPlan(p)[8];
    expect(e9.rubriques).toEqual(['synthese', 'pitch']);
    expect(etapeDeRubrique('synthese')).toBe(9);
    expect(etapeDeRubrique('pitch')).toBe(9);
    expect(etapeDeRubrique('prix')).toBeNull();
    // Synthesis full (100 %), pitch not finished (its frame is built from the summary): the mean, not done.
    const q = planVide();
    q.synthese = { probleme: 'a', solution: 'b', marche: 'c', organisation: 'd', chiffres: 'e', equipeDemande: 'f' };
    const pSynthese = RUBRIQUES.find((r) => r.id === 'synthese')!.progression(q);
    const pPitch = RUBRIQUES.find((r) => r.id === 'pitch')!.progression(q);
    expect(pSynthese).toBe(100);
    expect(pPitch).toBeLessThan(100);
    const s = etapesDuPlan(q)[8];
    expect(s.fait).toBe(false);
    expect(s.pct).toBe(Math.round((pSynthese + pPitch) / 2));
  });

  it('step 12 is never checked', () => {
    expect(etapesDuPlan(planExemple())[11].fait).toBe(false);
  });
});

describe('NEC-CC-18 scheduled step', () => {
  it('08:10 outside the window', () => expect(etapePrevue(a(8, 10))).toBeNull());
  it('08:20 step 1 (before the start)', () => expect(etapePrevue(a(8, 20))).toBe(1));
  it('10:25 pause: step 4', () => expect(etapePrevue(a(10, 25))).toBe(4));
  it('14:10 step 8', () => expect(etapePrevue(a(14, 10))).toBe(8));
  it('16:10 step 10 (end of step 9 is the start of step 10)', () => expect(etapePrevue(a(16, 10))).toBe(10));
  it('17:40 outside the window', () => expect(etapePrevue(a(17, 40))).toBeNull());
});

describe('NEC-CC-18 ahead or late', () => {
  // Participant at step 3 (identity and module 1 done): step 3 runs 09:40 to 10:20.
  it('9 min ahead: on time', () => expect(ecart(planIdentiteM1(), a(9, 31))?.sorte).toBe('heure'));
  it('10 min ahead: ahead', () => {
    const e = ecart(planIdentiteM1(), a(9, 30))!;
    expect(e).toEqual({ sorte: 'avance', minutes: 10, etape: 3 });
    expect(texteEcart(e)).toBe('En avance de 10 min : tu peux soigner les parties facultatives.');
  });
  it('14 min late: on time', () => expect(ecart(planIdentiteM1(), a(10, 34))?.sorte).toBe('heure'));
  it('15 min late: late, no reproach, no score', () => {
    const e = ecart(planIdentiteM1(), a(10, 35))!;
    expect(e).toEqual({ sorte: 'retard', minutes: 15, etape: 3 });
    expect(texteEcart(e)).toBe("Décalage de 15 min : fais d'abord les blocs Clients, Proposition de valeur, Revenus et Coûts, le reste peut attendre ce soir.");
  });
  it('during the step: on time', () => expect(texteEcart(ecart(planIdentiteM1(), a(10, 0))!)).toBe("À l'heure."));
  it('over 60 min late: "plus d\'une heure", pauses not subtracted', () => {
    const e = ecart(planIdentiteM1(), a(11, 30))!;
    expect(e.minutes).toBe(70);
    expect(texteEcart(e)).toBe("Décalage de plus d'une heure : fais d'abord les blocs Clients, Proposition de valeur, Revenus et Coûts, le reste peut attendre ce soir.");
  });
  it('minutes rounded to 5', () => {
    expect(texteEcart(ecart(planIdentiteM1(), a(10, 37))!)).toContain('Décalage de 15 min');
    expect(texteEcart(ecart(planIdentiteM1(), a(10, 38))!)).toContain('Décalage de 20 min');
  });
  it('outside the window: null', () => {
    expect(ecart(planIdentiteM1(), a(8, 0))).toBeNull();
    expect(ecart(planIdentiteM1(), a(18, 0))).toBeNull();
  });
  it('example plan: null', () => expect(ecart(planExemple(), a(10, 0))).toBeNull());
  it('texts never use the long dashes nor the middle dot', () => {
    const textes = [a(9, 0), a(10, 35), a(11, 30), a(10, 0)].map((t) => texteEcart(ecart(planIdentiteM1(), t)!));
    for (const t of textes) expect(/[—–·]/.test(t)).toBe(false);
  });
});
