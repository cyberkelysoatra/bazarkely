// NEC-CC-17: "Mon projet et l'environnement" in 6b (ETAPE-06 v0.2): old plans, check V7, export.
import { describe, expect, it } from 'vitest';
import type { Plan } from '../../types';
import { completerPlan, copier, impactDe, planVide } from '../../etat/vide';
import { impactTermine, regles } from './regles';
import { progression } from './progression';
import { sectionsPdf } from '../../export/contenu';
import { texteWhatsApp } from '../../export/texte';
import { exempleParId } from '../../data/exemples';

const V7 = "Aucun projet n'est sans trace. Note la tienne et une chose que tu fais pour la réduire : le jury et les bailleurs le demandent de plus en plus.";

/** A plan as stored before NEC-CC-17: an impact without the two fields. */
function ancienPlan(): Plan {
  const p = planVide();
  const brut = JSON.parse(JSON.stringify(p));
  delete brut.impact.envTrace;
  delete brut.impact.envReduction;
  brut.impact.autreEffet = 'garder';
  return brut as Plan;
}

// NEC-CC-19: a section not started is left out of the PDF (no block).
const blocsImpact = (p: Plan) => sectionsPdf(p).find((s) => s.titre === 'Impact et emplois')?.blocs ?? [];

describe("NEC-CC-17 Mon projet et l'environnement", () => {
  it('a plan saved before this version opens and exports without error', () => {
    const brut = ancienPlan();
    expect(impactDe(brut).envTrace).toBe('');
    expect(impactDe(brut).envReduction).toBe('');
    expect('envTrace' in brut.impact!).toBe(false); // read only: nothing written
    expect(() => regles(brut)).not.toThrow();
    expect(() => sectionsPdf(brut)).not.toThrow();
    expect(() => texteWhatsApp(brut)).not.toThrow();
    const complete = completerPlan(copier(brut));
    expect(complete.impact?.envTrace).toBe('');
    expect(complete.impact?.autreEffet).toBe('garder');
  });

  it('V7 with both lines empty, gone as soon as one is filled', () => {
    const p = planVide();
    expect(regles(p).find((r) => r.cle === 'V7')?.texte).toBe(V7);
    p.impact!.envTrace = 'Emballages';
    expect(regles(p).some((r) => r.cle === 'V7')).toBe(false);
    p.impact!.envTrace = '  ';
    p.impact!.envReduction = 'Je trie';
    expect(regles(p).some((r) => r.cle === 'V7')).toBe(false);
  });

  it('never blocks the end of the step, never changes the progress', () => {
    const p = planVide();
    p.impact!.emplois = [{ id: 'a', role: "Moi, j'en vis", statut: 'moi', annees: ['plein', '', ''] }];
    p.impact!.phrase = 'Mon projet fait vivre 1 personne.';
    expect(impactTermine(p)).toBe(true);
    expect(progression(p)).toBe(100);
    expect(regles(p).some((r) => r.cle === 'V7')).toBe(true);
  });

  it('PDF: subtitle and the two lines after "Autre effet positif"; nothing when both are empty', () => {
    const p = planVide();
    p.impact!.autreEffet = 'Un quartier plus propre';
    expect(JSON.stringify(blocsImpact(p))).not.toContain("Mon projet et l'environnement");
    p.impact!.envTrace = 'Sacs plastique';
    let blocs = blocsImpact(p);
    expect(JSON.stringify(blocs)).not.toContain('Ce que je fais pour la réduire');
    p.impact!.envReduction = 'Sacs en tissu';
    blocs = blocsImpact(p);
    const i = blocs.findIndex((b) => b.type === 'champ' && b.label === 'Autre effet positif');
    expect(blocs[i + 1]).toEqual({ type: 'sousTitre', texte: "Mon projet et l'environnement" });
    expect(blocs[i + 2]).toEqual({ type: 'champ', label: "Ce qu'il abîme", valeur: 'Sacs plastique' });
    expect(blocs[i + 3]).toEqual({ type: 'champ', label: 'Ce que je fais pour la réduire', valeur: 'Sacs en tissu' });
  });

  it('MADIO NOSY copied "pour m\'entraîner" keeps its two lines in the PDF', () => {
    const copie = copier(exempleParId('exemple-environnement')!.plan());
    copie.exemple = false;
    copie.id = 'copie';
    const json = JSON.stringify(blocsImpact(copie));
    expect(json).toContain('Fumée et carburant du tricycle ; jus des tas de compost');
    expect(json).toContain('Tournées regroupées par quartier ; aire couverte, sur bâche, avec rigole');
    expect(JSON.stringify(sectionsPdf(copie))).toContain('Environnement et recyclage');
  });
});
