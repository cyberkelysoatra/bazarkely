import { describe, expect, it } from 'vitest';
import { planExemple } from '../../data/exemple';
import { completerPlan, planVide } from '../../etat/vide';
import { sectionsPdf } from '../../export/contenu';
import { RUBRIQUES } from '../../rubriques/registre';
import { ESPACE } from '../../utils/format';
import { MAX_MOTS, TEMPS, compterMots, couperMots, duree, partieLaPlusLongue, trame } from './trame';
import { questionsPieges } from './questions';
import { progression } from './progression';

const INTERDITS = /[\u2014\u2013]/;

describe('pitch: section order', () => {
  it('comes right after the synthesis', () => {
    const ids = RUBRIQUES.map((r) => r.id);
    expect(ids.indexOf('pitch')).toBe(ids.indexOf('synthese') + 1);
  });
});

describe('pitch: frame', () => {
  it('fills the 5 parts of the example plan within 12 words, from its summary', () => {
    const t = trame(planExemple());
    expect(t.map((x) => x.cle)).toEqual(TEMPS.map((x) => x.cle));
    for (const x of t) {
      expect(x.mots.trim().length).toBeGreaterThan(0);
      expect(compterMots(x.mots)).toBeLessThanOrEqual(MAX_MOTS);
      expect(x.mots).not.toMatch(INTERDITS);
    }
  });
  it('keeps the keywords the participant typed', () => {
    const p = planExemple();
    p.pitch!.motsCles.probleme = 'mes mots';
    expect(trame(p)[0]).toMatchObject({ mots: 'mes mots', modifie: true });
  });
  it('is empty for an empty plan, never invented', () => {
    for (const x of trame(planVide())) expect(x.mots).toBe('');
  });
  it('counts and cuts words', () => {
    expect(compterMots('7,8 millions ; seuil 434 bouteilles par mois')).toBe(7);
    expect(compterMots('45 000 Ar la nuit')).toBe(4);
    expect(compterMots(['45', '000', 'Ar'].join(ESPACE))).toBe(2);
    expect(compterMots(couperMots('a b c d e f g h i j k l m n o'))).toBe(12);
  });
  it('durations add up to 1 min 50 plus 10 s of margin', () => {
    expect(TEMPS.reduce((t, x) => t + x.duree, 0)).toBe(110);
  });
});

describe('pitch: rehearsal', () => {
  it('formats durations and finds the longest part', () => {
    expect(duree(130_000)).toBe('2 min 10 s');
    expect(duree(45_000)).toBe('45 s');
    expect(partieLaPlusLongue([20_000, 45_000, 20_000, 25_000, 20_000])).toBe(1);
  });
});

describe('pitch: trap questions', () => {
  it('asks about the grant when it covers more than 70 % of the needs', () => {
    const p = planVide();
    p.m5.investissements = [{ id: 'i', libelle: 'Matériel', montant: 1_000_000 }];
    p.m5.ressources.subvention = 900_000;
    const q = questionsPieges(p);
    expect(q[0].texte).toBe("« Et si tu n'obtiens pas la subvention ? »");
    expect(q).toHaveLength(3);
  });
  it('gives the 3 general questions to a plan without weak point', () => {
    expect(questionsPieges(planVide()).map((q) => q.id)).toEqual(['pourquoi-toi', 'concurrent', 'premiere-unite']);
  });
  it('detects an estimated figure, a large share and a threat without answer', () => {
    const p = planVide();
    p.m3.nbClients = 50;
    p.m3.nbClientsSource = "Je l'estime";
    p.m3.partVisee = 40;
    p.m3.swot.menaces = 'Un concurrent chinois, la saison des pluies.';
    expect(questionsPieges(p).map((q) => q.id)).toEqual(['source', 'part', 'menace']);
    expect(questionsPieges(p)[2].texte).toBe('« Que fais-tu si un concurrent chinois arrive ? »');
  });
});

describe('pitch: data and PDF', () => {
  it('opens an older plan without pitch and without loss', () => {
    const ancien = { ...planVide(), notes: 'garde' } as Partial<ReturnType<typeof planVide>> & { id: string };
    delete ancien.pitch;
    const p = completerPlan(ancien);
    expect(p.notes).toBe('garde');
    expect(p.pitch).toEqual({ motsCles: {}, essais: [], reponses: {} });
    expect(progression(p)).toBe(0);
  });
  it('puts the frame and the 3 answers in the PDF, in workbook order (after module 5)', () => {
    const p = planExemple();
    const q = questionsPieges(p);
    p.pitch!.reponses[q[0].id] = 'Ma réponse un.';
    const sections = sectionsPdf(p);
    expect(sections[0].titre).toBe("Fiche d'identité");
    const i = sections.findIndex((s) => s.titre === 'Mon pitch de 2 minutes');
    expect(sections[i - 1].titre).toMatch(/^Module 5/);
    const json = JSON.stringify(sections[i]);
    for (const t of trame(p)) expect(json).toContain(t.mots);
    // NEC-CC-19: an unanswered trap question is omitted (no empty field in the PDF).
    expect(json).toContain(q[0].texte);
    for (const x of q.slice(1)) expect(json).not.toContain(x.texte);
    expect(json).toContain('Ma réponse un.');
  });
});
