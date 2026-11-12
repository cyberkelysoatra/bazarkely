import { describe, expect, it } from 'vitest';
import { planExemple } from '../data/exemple';
import { planVide } from '../etat/vide';
import { SauvegardeInvalide, lireSauvegarde, nomFichier, nomSauvegarde, texteSauvegarde } from './sauvegarde';
import { NON_REMPLI, phraseCouverture, resteAFaire, resumePdf, sectionsPdf, textePdf } from './contenu';
import { EXEMPLES } from '../data/exemples';
import type { Plan } from '../types';
import { texteWhatsApp } from './texte';
import { CARTES, brouillon } from '../ateliers/synthese/brouillons';
import { RUBRIQUES } from '../rubriques/registre';

const INTERDITS = /[—–·]/;

describe('Sauvegarde', () => {
  it('round trip: the plan read back is identical', () => {
    const plan = planExemple();
    plan.identite.telephone = '034 00 000 00';
    const relu = lireSauvegarde(texteSauvegarde(plan));
    expect(relu).toEqual(plan);
  });

  it('a bare plan (without the wrapper) is accepted and completed', () => {
    const p = planVide();
    const brut = JSON.parse(JSON.stringify(p));
    delete brut.notes;
    const relu = lireSauvegarde(JSON.stringify(brut));
    expect(relu.notes).toBe('');
    expect(relu.id).toBe(p.id);
  });

  it.each([
    ['not JSON', 'bonjour'],
    ['an array', '[1,2]'],
    ['another JSON file', '{"nom":"liste de courses"}'],
    ['a plan without module 5', JSON.stringify({ ...planVide(), m5: undefined })],
    ['a plan whose costs are not a list', JSON.stringify({ ...planVide(), m5: { ...planVide().m5, couts: 'x' } })],
    ['a wrapper without plan', JSON.stringify({ format: 'nec-business-plan', version: 1 })]
  ])('refuses %s with a plain message', (_nom, texte) => {
    expect(() => lireSauvegarde(texte)).toThrow(SauvegardeInvalide);
    expect(() => lireSauvegarde(texte)).toThrow(/n'est pas une sauvegarde de Mon business plan/);
  });

  it('file names', () => {
    expect(nomFichier("JUS'NOSY (ma copie)")).toBe('JUS-NOSY-ma-copie');
    expect(nomFichier('Épicerie à Hell-Ville')).toBe('Epicerie-a-Hell-Ville');
    expect(nomFichier('  ')).toBe('projet');
    expect(nomSauvegarde(planExemple())).toBe('Business-plan_JUS-NOSY.json');
  });
});

/** Identity full, module 1 half filled (1a and 1b), as most participants at the end of the day. */
function partiel(): Plan {
  const p = planVide();
  Object.assign(p.identite, {
    nomPrenom: 'Rasoa Hanta',
    nomProjet: 'Jus des écoles',
    telephone: '0340000000',
    email: 'rasoa@exemple.mg',
    secteur: 'agriculture',
    lieu: 'Hell-Ville',
    unePhrase: 'Des jus frais pour les écoles.',
    avancement: 'idee',
    porteurs: 'Rasoa, porteuse',
    attentes: 'Un plan clair.'
  });
  p.m1.probleme = 'Les enfants boivent des sodas.';
  p.m1.causes = 'Pas de jus local vendu près des écoles.';
  p.m1.client.qui = 'Les parents d’élèves';
  p.m1.client.ou = 'Hell-Ville';
  return p;
}

describe('Contenu du PDF', () => {
  const plan = planExemple();
  for (const c of CARTES) plan.synthese[c.cle] = brouillon(plan, c.cle);
  const sections = sectionsPdf(plan);

  // The examples leave empty what the participant does himself (peer review, prices, notes): those sections
  // hold no answer, so they are left out like any empty section (NEC-CC-19).
  const SANS_REPONSE = ['synthese', 'relecture', 'prix', 'notes'];
  const attendues = (p: Plan) =>
    RUBRIQUES.filter((r) => r.id !== 'synthese' && (!SANS_REPONSE.includes(r.id) || (r.id === 'prix' ? p.prix.some((x) => x.element.trim()) : r.id === 'notes' ? !!p.notes.trim() : false))).map((r) => r.titre);

  it('every section of the workbook in order, the synthesis being the one-page summary', () => {
    expect(sections.map((s) => s.titre)).toEqual(attendues(plan));
  });

  it.each(EXEMPLES.map((e) => [e.nom, e]))('example %s prints every section holding an answer, no empty field', (_nom, e) => {
    const p = e.plan();
    const s = sectionsPdf(p);
    expect(s.map((x) => x.titre)).toEqual(attendues(p));
    expect(JSON.stringify(s)).not.toContain(NON_REMPLI);
    expect(resteAFaire(p)).toBeNull();
  });

  it('module 5 holds the 3-year table with the exact figures', () => {
    const m5 = sections.find((s) => s.titre.startsWith('Module 5'))!;
    const tab = m5.blocs.find((b) => b.type === 'tableau' && b.entetes[1] === 'Année 1');
    expect(tab && tab.type === 'tableau').toBe(true);
    const lignes = tab!.type === 'tableau' ? tab!.lignes.map((l) => l.map(textePdf)) : [];
    expect(lignes.find((l) => l[0] === "Chiffre d'affaires")).toEqual(["Chiffre d'affaires", '43 200 000 Ar', '57 600 000 Ar', '72 000 000 Ar']);
    expect(lignes.find((l) => l[0] === 'Résultat avant amortissements et avant impôt')).toEqual(['Résultat avant amortissements et avant impôt', '8 280 000 Ar', '14 760 000 Ar', '20 040 000 Ar']);
  });

  it('empty answers are omitted; telephone and e-mail never in the sections', () => {
    const p = planVide();
    p.identite.telephone = '0340000000';
    p.identite.email = 'moi@exemple.mg';
    p.identite.nomProjet = 'Mon projet';
    const json = JSON.stringify(sectionsPdf(p));
    expect(json).not.toContain(NON_REMPLI);
    expect(json).not.toContain('0340000000');
    expect(json).not.toContain('moi@exemple.mg');
  });

  it('a partial plan (identity full, module 1 half filled): no "(non rempli)", no empty section', () => {
    const p = partiel();
    const s = sectionsPdf(p);
    const json = JSON.stringify(s);
    expect(json).not.toContain(NON_REMPLI);
    // The pitch frame is built from the answers; "Et après ?" keeps the NEC calendar (fixed, useful to all).
    expect(s.map((x) => x.titre)).toEqual(["Fiche d'identité", 'Module 1. Structurer le projet', 'Mon pitch de 2 minutes', 'Et après ?']);
    for (const x of s) {
      expect(x.blocs.length).toBeGreaterThan(0);
      x.blocs.forEach((b, i) => {
        if (b.type === 'sousTitre') expect(x.blocs[i + 1] && x.blocs[i + 1].type !== 'sousTitre').toBe(true);
        if (b.type === 'champ') expect(b.valeur.trim()).not.toBe('');
        if (b.type === 'tableau') expect(b.lignes.length).toBeGreaterThan(0);
      });
    }
    const m1 = s[1];
    expect(m1.blocs.filter((b) => b.type === 'sousTitre').map((b) => (b.type === 'sousTitre' ? b.texte : ''))).toEqual(['1a. Mon arbre à problèmes', '1b. Mon client cible']);
    expect(phraseCouverture(p)).toBe('Des jus frais pour les écoles.');
  });

  it('one-page summary: drafts marked as drawn from the answers, missing figures skipped', () => {
    const r = resumePdf(partiel());
    expect(r.cartes.map((c) => c.titre)).toEqual(['Le problème et mon client', 'Mon équipe et ce que je demande']);
    expect(r.cartes.every((c) => c.tire)).toBe(true);
    expect(r.chiffres).toEqual([]);
    const ex = planExemple();
    ex.synthese.probleme = 'Mon texte.';
    const rex = resumePdf(ex);
    expect(rex.cartes[0]).toEqual({ titre: 'Le problème et mon client', texte: 'Mon texte.', tire: false });
    expect(rex.chiffres.map((c) => c.label)).toEqual(['Besoin total', "Chiffre d'affaires année 1", 'Seuil de rentabilité']);
  });

  it('what is left: the steps 1 to 11 not done with their percentage', () => {
    const reste = resteAFaire(partiel())!;
    expect(reste.map((e) => e.n)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(reste[0].pct).toBeGreaterThan(0);
    expect(reste[0].pct).toBeLessThan(100);
    expect(resteAFaire(planVide())!.length).toBe(11);
  });

  it('textePdf removes dashes, middle dots and characters outside the standard font', () => {
    const t = textePdf('a — b – c · d 1 200 Ar ✓ l’été œuf');
    expect(INTERDITS.test(t)).toBe(false);
    expect(t).toBe("a , b , c , d 1 200 Ar  l'été œuf");
    expect(sections.every((s) => s.blocs.every((b) => !INTERDITS.test(JSON.stringify(b).replace(/\\u/g, ''))))).toBe(true);
  });
});

describe('Texte WhatsApp', () => {
  it('synthesis and key figures, no dash, no middle dot, no thin space', () => {
    const plan = planExemple();
    for (const c of CARTES) plan.synthese[c.cle] = brouillon(plan, c.cle);
    const t = texteWhatsApp(plan);
    expect(t).toContain("*Mon business plan : JUS'NOSY*");
    expect(t).toContain('Besoin total : 9 000 000 Ar');
    expect(t).toContain('Financement demandé : 7 000 000 Ar');
    expect(t).toContain("Chiffre d'affaires année 1 : 43 200 000 Ar");
    expect(t).toContain('Seuil de rentabilité : 769 bouteilles de 50 cl par mois');
    expect(/[—–· ]/.test(t)).toBe(false);
  });
});
