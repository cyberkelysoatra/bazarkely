import { describe, expect, it } from 'vitest';
import { planExemple } from '../../data/exemple';
import { planVide } from '../../etat/vide';
import { CARTES, brouillon, chiffresCles } from './brouillons';
import { progression } from './progression';
import { POINTS } from '../relecture/points';
import { calculerMarche } from '../m3/calculs';

const INTERDITS = /[—–·]/;
const sp = (s: string) => s.replace(/ /g, ' ');

/** Every string answer of a plan (deep), and the figures the drafts may quote. */
function textesDuPlan(plan: ReturnType<typeof planExemple>): string[] {
  const out: string[] = [];
  const parcourir = (v: unknown) => {
    if (typeof v === 'string' && v.trim()) out.push(v.trim().replace(/[.,;:\s]+$/, ''));
    else if (Array.isArray(v)) v.forEach(parcourir);
    else if (v && typeof v === 'object') Object.values(v).forEach(parcourir);
  };
  parcourir(plan);
  return out;
}

// Fixed labels the drafts are allowed to add around the answers.
const LIBELLES = [
  'Le problème : ',
  'Ses causes : ',
  'Ses conséquences : ',
  'Mon client : ',
  'Où : ',
  'Combien : ',
  "Ce qu'il fait aujourd'hui : ",
  "Ce qu'il paie aujourd'hui : ",
  'Qui décide et qui paie : ',
  'Ma distribution : ',
  'Ma forme juridique : ',
  'Pourquoi : ',
  'Pourquoi nous : ',
  'Mes attentes : ',
  'Mes forces : ',
  'Ce que je fais mieux : '
];

describe('Synthèse : brouillons', () => {
  const plan = planExemple();
  const textes = textesDuPlan(plan);

  it('card 5 figures of JUS\'NOSY: 9 000 000, 7 000 000, 43 200 000, 769', () => {
    const k = chiffresCles(plan);
    expect(k.besoinTotal).toBe(9_000_000);
    expect(k.financementDemande).toBe(7_000_000);
    expect(k.caAnnee1).toBe(43_200_000);
    expect(k.seuilMois).toBe(769);
    const t = sp(brouillon(plan, 'chiffres'));
    for (const n of ['9 000 000 Ar', '7 000 000 Ar', '43 200 000 Ar', '769 bouteilles de 50 cl par mois']) expect(t).toContain(n);
  });

  it('every labelled sentence quotes an answer of the plan, word for word (no invented text)', () => {
    for (const c of ['probleme', 'organisation', 'equipeDemande'] as const) {
      const t = brouillon(plan, c);
      expect(t.length).toBeGreaterThan(20);
      for (const l of LIBELLES) {
        let i = t.indexOf(l);
        while (i >= 0) {
          const reste = t.slice(i + l.length);
          const fin = reste.indexOf('. ');
          const cite = (fin >= 0 ? reste.slice(0, fin) : reste).replace(/\.$/, '');
          // The quoted answer may itself hold sentences: it must start an answer of the plan.
          expect(textes.some((x) => x.startsWith(cite) || cite.startsWith(x.split('. ')[0])), `${c} : ${cite}`).toBe(true);
          i = t.indexOf(l, i + 1);
        }
      }
    }
  });

  it('value proposition: the sentence of 1c with the project name', () => {
    expect(brouillon(plan, 'solution')).toBe(
      "Pour les hôtels et restaurants de Nosy Be qui veulent servir des jus frais et locaux à leurs clients, JUS'NOSY propose des jus de fruits frais de l'île livrés deux fois par semaine qui valorisent l'image locale de l'établissement à un prix connu d'avance, contrairement aux jus importés ou industriels qu'ils servent aujourd'hui."
    );
  });

  it('market card: figures computed from 3a and the competitors named in 3b only', () => {
    const t = sp(brouillon(plan, 'marche'));
    expect(t).toContain('Marché potentiel : 6 000 bouteilles de 50 cl par mois.');
    expect(t).toContain('Part visée en année 1 : 20 %, soit 1 200 bouteilles de 50 cl par mois.');
    for (const c of plan.m3.concurrents) expect(t).toContain(c.nom);
  });

  it('empty plan: every draft is empty (nothing invented), progression 0', () => {
    const vide = planVide();
    for (const c of CARTES) expect(brouillon(vide, c.cle)).toBe('');
    expect(progression(vide)).toBe(0);
  });

  it('empty parts are skipped', () => {
    const p = planVide();
    p.m1.probleme = 'Pas de pain frais le soir';
    p.m1.client.combien = '300 familles';
    expect(brouillon(p, 'probleme')).toBe('Le problème : Pas de pain frais le soir. Combien : 300 familles.');
  });

  it('no em dash, en dash or middle dot in any draft; progression counts the cards filled', () => {
    const p = planExemple();
    p.m1.probleme = 'Problème — avec tiret';
    for (const c of CARTES) expect(INTERDITS.test(brouillon(p, c.cle))).toBe(false);
    for (const c of CARTES.slice(0, 3)) p.synthese[c.cle] = brouillon(p, c.cle);
    expect(progression(p)).toBe(50);
    for (const c of CARTES) p.synthese[c.cle] = brouillon(p, c.cle);
    expect(progression(p)).toBe(100);
  });
});

describe('Relecture : suggestions', () => {
  it("JUS'NOSY: every computable point says oui", () => {
    const plan = planExemple();
    expect(calculerMarche(plan.m3).ventesMois).toBe(plan.m5.annees[0].ventesParMois);
    const s = Object.fromEntries(POINTS.map((p) => [p.id, p.suggestion(plan)]));
    expect(s).toEqual({ probleme: null, client: 'oui', phrase: null, concurrent: 'oui', marge: 'oui', equilibre: 'oui', seuil: 'oui', ventes: 'oui', calendrier: 'oui', forme: 'oui' });
  });

  it('empty plan: every computable point says à vérifier', () => {
    const s = POINTS.map((p) => p.suggestion(planVide())).filter((x) => x !== null);
    expect(s.length).toBe(8);
    expect(s.every((x) => x === 'verifier')).toBe(true);
  });
});
