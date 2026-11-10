import { describe, expect, it } from 'vitest';
import { planExemple } from '../data/exemple';
import { planVide } from '../etat/vide';
import { SauvegardeInvalide, lireSauvegarde, nomFichier, nomSauvegarde, texteSauvegarde } from './sauvegarde';
import { NON_REMPLI, sectionsPdf, textePdf } from './contenu';
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

describe('Contenu du PDF', () => {
  const plan = planExemple();
  for (const c of CARTES) plan.synthese[c.cle] = brouillon(plan, c.cle);
  const sections = sectionsPdf(plan);

  it('the synthesis first, then every section of the workbook in order', () => {
    expect(sections[0].titre).toMatch(/^Synthèse/);
    expect(sections.slice(1).map((s) => s.titre)).toEqual(RUBRIQUES.filter((r) => r.id !== 'synthese').map((r) => r.titre));
  });

  it('module 5 holds the 3-year table with the exact figures', () => {
    const m5 = sections.find((s) => s.titre.startsWith('Module 5'))!;
    const tab = m5.blocs.find((b) => b.type === 'tableau' && b.entetes[1] === 'Année 1');
    expect(tab && tab.type === 'tableau').toBe(true);
    const lignes = tab!.type === 'tableau' ? tab!.lignes.map((l) => l.map(textePdf)) : [];
    expect(lignes.find((l) => l[0] === "Chiffre d'affaires")).toEqual(["Chiffre d'affaires", '43 200 000 Ar', '57 600 000 Ar', '72 000 000 Ar']);
    expect(lignes.find((l) => l[0] === 'Résultat avant impôt')).toEqual(['Résultat avant impôt', '8 640 000 Ar', '15 120 000 Ar', '20 400 000 Ar']);
  });

  it('empty answers are "(non rempli)"; telephone and e-mail never in the sections', () => {
    const p = planVide();
    p.identite.telephone = '0340000000';
    p.identite.email = 'moi@exemple.mg';
    const json = JSON.stringify(sectionsPdf(p));
    expect(json).toContain(NON_REMPLI);
    expect(json).not.toContain('0340000000');
    expect(json).not.toContain('moi@exemple.mg');
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
    expect(t).toContain('Seuil de rentabilité : 750 bouteilles de 50 cl par mois');
    expect(/[—–· ]/.test(t)).toBe(false);
  });
});
