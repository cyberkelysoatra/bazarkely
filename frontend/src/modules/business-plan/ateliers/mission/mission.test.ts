import { describe, expect, it } from 'vitest';
import type { Plan } from '../../types';
import { completerPlan, planVide } from '../../etat/vide';
import { premiereErreur } from '../../composants/BoucleComprehension';
import { BOUCLE_A1, emploisDepuisEquipe, impactTermine, phraseProposee, regles as reglesImpact, reglesChiffres, totaux } from '../impact/regles';
import { progression as pImpact } from '../impact/progression';
import { BOUCLE_M1, DUREE_MISSION_MS, contientNumero, missionTerminee, reports, restant, suggestion } from './regles';
import { progression as pMission } from './progression';

const entretien = (paie: number | null, probleme: '' | 'oui' | 'non' = 'oui') => ({
  id: Math.random().toString(36),
  date: '2026-11-12T13:05:00+03:00',
  typeClient: 'Hôtel',
  aujourdhui: 'Jus en brique',
  paie,
  embete: 'Pas local',
  probleme,
  phrase: 'Livré à l\'heure, je prends'
});

describe('comprehension loops', () => {
  const q = BOUCLE_A1.questions[0];
  it('passes when all right boxes and no wrong box are ticked', () => {
    expect(premiereErreur(q, [true, true, true, false, false], BOUCLE_A1.ordre)).toBeNull();
  });
  it('gives the first code in the order B, C, G, T, E', () => {
    // Volunteer ticked (B) and the manager forgotten (G): B comes first.
    expect(premiereErreur(q, [false, true, true, true, false], BOUCLE_A1.ordre)).toBe('B');
    expect(premiereErreur(q, [false, true, true, false, true], BOUCLE_A1.ordre)).toBe('C');
    expect(premiereErreur(q, [false, true, false, false, false], BOUCLE_A1.ordre)).toBe('G');
    expect(premiereErreur(q, [true, true, false, false, false], BOUCLE_A1.ordre)).toBe('T');
    expect(premiereErreur(q, [true, false, true, false, false], BOUCLE_A1.ordre)).toBe('E');
  });
  it('mission loop: H before O before Q', () => {
    const m = BOUCLE_M1.questions[0];
    expect(premiereErreur(m, [true, true, false, false, false], BOUCLE_M1.ordre)).toBeNull();
    expect(premiereErreur(m, [false, true, false, true, true], BOUCLE_M1.ordre)).toBe('H');
    expect(premiereErreur(m, [true, true, false, true, false], BOUCLE_M1.ordre)).toBe('O');
    expect(premiereErreur(m, [true, false, false, false, false], BOUCLE_M1.ordre)).toBe('Q');
  });
});

describe('impact et emplois', () => {
  it('opens a plan saved before NEC-CC-12 without losing anything', () => {
    const ancien = planVide() as Partial<Plan> & { id: string };
    delete ancien.impact;
    delete ancien.mission;
    ancien.notes = 'garder';
    const plan = completerPlan(ancien);
    expect(plan.notes).toBe('garder');
    expect(plan.impact?.emplois).toEqual([]);
    expect(plan.mission?.entretiens).toEqual([]);
    expect(pImpact(plan)).toBe(0);
    expect(pMission(plan)).toBe(0);
  });

  it('prefills year 1 from the team of module 4', () => {
    const plan = planVide();
    plan.m4.equipe = [
      { id: 'a', personne: 'La porteuse du projet', role: 'Gérante', competences: '', temps: 'plein' },
      { id: 'b', personne: 'Un livreur', role: 'Livraison', competences: '', temps: 'partiel' },
      { id: 'c', personne: 'Ma mère', role: 'Aide', competences: '', temps: 'benevole' }
    ];
    const e = emploisDepuisEquipe(plan);
    expect(e.map((x) => [x.statut, x.annees[0]])).toEqual([
      ['moi', 'plein'],
      ['salarie', 'partiel'],
      ['benevole', '']
    ]);
    plan.impact!.emplois = e;
    expect(totaux(plan.impact!)).toEqual([2, 0, 0]);
  });

  it('applies V1, V2, V6 and the cross-check with module 5', () => {
    const plan = planVide();
    plan.m4.equipe = [{ id: 'b', personne: 'Un livreur', role: 'Livraison', competences: '', temps: 'partiel' }];
    const cles = () => reglesImpact(plan).map((r) => r.cle);
    expect(cles()).toEqual(['V1', 'V2-b', 'V6']);
    plan.impact!.emplois = [{ id: 'x', role: 'Livraison', statut: 'salarie', annees: ['partiel', '', ''], equipeId: 'b' }];
    expect(cles()).toEqual(['V6']);
    expect(reglesChiffres(plan).map((r) => r.cle)).toEqual(['S1']);
    plan.m5.chargesFixes.salaires = 150000;
    expect(reglesChiffres(plan)).toEqual([]);
  });

  it('proposes the impact sentence with the numbers of the participant', () => {
    const plan = planVide();
    plan.identite.nomProjet = 'TRANO KELY';
    plan.impact!.emplois = [
      { id: '1', role: 'Moi', statut: 'moi', annees: ['plein', 'plein', 'plein'] },
      { id: '2', role: 'Ménage', statut: 'salarie', annees: ['partiel', 'plein', 'plein'] },
      { id: '3', role: 'Accueil', statut: 'salarie', annees: ['', 'partiel', 'partiel'] },
      { id: '4', role: 'Ma mère', statut: 'benevole', annees: ['plein', '', ''] }
    ];
    plan.impact!.partenaires = [
      { id: 'a', nom: 'une blanchisserie', local: true },
      { id: 'b', nom: 'un taxi', local: true },
      { id: 'c', nom: 'des guides de Nosy Be', local: true }
    ];
    expect(phraseProposee(plan)).toBe('TRANO KELY fait vivre 2 personnes dès la première année, 3 en 2028, et fait travailler une blanchisserie, un taxi et des guides de Nosy Be.');
    expect(impactTermine(plan)).toBe(false);
    plan.impact!.phrase = phraseProposee(plan);
    expect(impactTermine(plan)).toBe(true);
    expect(pImpact(plan)).toBe(100);
  });
});

describe('mission de terrain', () => {
  it('refuses a phone number', () => {
    expect(contientNumero('034 12 345 67')).toBe(true);
    expect(contientNumero('+261 34')).toBe(true);
    expect(contientNumero('paie 4 000 Ar le litre')).toBe(false);
    expect(contientNumero('1 200 000 Ar')).toBe(false);
  });

  it('computes the remaining time from the stored start', () => {
    const debut = '2026-11-12T13:00:00+03:00';
    const t0 = Date.parse(debut);
    expect(restant(null)).toBeNull();
    expect(restant(debut, t0)).toBe(DUREE_MISSION_MS);
    expect(restant(debut, t0 + 31 * 60000)).toBe(9 * 60000);
    expect(restant(debut, t0 + 50 * 60000)).toBe(0);
  });

  it('is not complete with 0 interview, complete with 3, a decision and the updates answered', () => {
    const plan = planVide();
    expect(missionTerminee(plan)).toBe(false);
    plan.mission!.entretiens = [entretien(4000), entretien(5000), entretien(3500)];
    expect(missionTerminee(plan)).toBe(false);
    expect(suggestion(plan)).toBe('continuer');
    plan.mission!.decision = 'continuer';
    for (const r of reports(plan)) plan.mission!.reports[r.cle] = 'valide';
    expect(missionTerminee(plan)).toBe(true);
    expect(pMission(plan)).toBe(100);
  });

  it('suggests to change angle when 2 clients out of 3 do not have the problem', () => {
    const plan = planVide();
    plan.mission!.entretiens = [entretien(0, 'non'), entretien(0, 'non'), entretien(4000)];
    expect(suggestion(plan)).toBe('changer');
  });
});

describe('PDF export', () => {
  it('holds the two new sections and the decision', async () => {
    const { sectionsPdf } = await import('../../export/contenu');
    const { planExemple } = await import('../../data/exemple');
    const titres = sectionsPdf(planExemple()).map((s) => s.titre);
    const i = titres.indexOf('Impact et emplois');
    expect(titres[i - 1]).toMatch(/^Module 4/);
    expect(titres[i + 1]).toBe('Ma mission de terrain');
    expect(titres[i + 2]).toMatch(/^Module 5/);
    const json = JSON.stringify(sectionsPdf(planExemple()));
    expect(json).toContain('Je continue : Le problème et le prix sont confirmés.');
    expect(json).toContain("JUS'NOSY fait vivre 2 personnes");
  });
});
