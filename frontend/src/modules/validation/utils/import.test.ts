import { describe, expect, it } from 'vitest';
import { lireImport } from './import';
import { questionSuivante, verifierArbre } from './arbre';

// Example of the prompt (VALIDCLIENT-CC-03), completed to 4 questions.
const EXEMPLE = `CONSULTATION : note_cadrage | 1.2 | Le résumé de votre projet
DOCUMENT
# Note de cadrage
(texte Markdown complet du document, autant de lignes qu'il faut)
FIN DOCUMENT
QUESTION 1 [essentielle] le problème, vu par vous
CRITÈRE : le problème, vu par l'utilisateur
EXTRAIT : Les réservations arrivent par WhatsApp, téléphone et e-mail ; personne n'a la vue complète.
Ce constat décrit-il bien votre situation actuelle ?
CHOIX A [validation] Je valide | Le constat est juste : on passe à la suite. | Avantages : la consultation avance. | Faiblesses : plus de retour possible une fois confirmé. | -> 2
CHOIX B [réserve] Je valide avec une réserve | Juste dans l'ensemble ; vous précisez un point. | -> 2
CHOIX C [refus] Je ne valide pas | Le constat ne vous ressemble pas : Joël le reprend avec vous. | -> 2
QUESTION 2 [essentielle] votre objectif
CRITÈRE : objectif chiffré et daté
Quel objectif visez-vous pour la première saison ?
CHOIX A [conseillé] Zéro double réservation | Le gain le plus rapide à constater. | Avantages : mesurable dès le premier mois. | Faiblesses : n'augmente pas le chiffre d'affaires à lui seul. | -> 3
CHOIX B Moitié des réservations en ligne | Plus de clients directs. | -> 2 bis
CHOIX C Les deux à la fois | Le plus ambitieux. | -> 2 bis
QUESTION 2 bis canaux en ligne
Par quels canaux vendez-vous en ligne aujourd'hui ?
CHOIX A Aucun | ... |
CHOIX B Une plateforme | ... |
CHOIX C Plusieurs | ... |
QUESTION 3 [essentielle] le budget
CRITÈRE : budget connu
Quel budget prévoyez-vous pour la première version ?
CHOIX A [validation] Le budget annoncé me convient | Nous partons sur cette base. | -> FIN
CHOIX B [réserve] Avec une réserve | Vous précisez un point. | -> FIN
CHOIX C [refus] Je ne valide pas | Joël reprend le budget avec vous. | -> FIN`;

const sans = (texte: string, ligne: string) => texte.replace(`${ligne}\n`, '');

describe('lireImport', () => {
  it('reads the example: document, 4 questions, types, natures, recommended choice, next questions', () => {
    const r = lireImport(EXEMPLE, 'c1', 'assistant');
    expect(r.problemes).toEqual([]);
    expect(r.nbQuestions).toBe(4);
    expect(r.nbChoix).toBe(12);
    const b = r.brouillon;
    expect(b.client_id).toBe('c1');
    expect(b.saisi_par).toBe('assistant');
    expect(b.source_texte).toBe(EXEMPLE);
    expect(b.document).toEqual({
      type: 'note_cadrage',
      version: '1.2',
      titre_client: 'Le résumé de votre projet',
      contenu_md: "# Note de cadrage\n(texte Markdown complet du document, autant de lignes qu'il faut)"
    });
    const [q1, q2, q2b, q3] = b.questions;
    expect(b.questions.map((q) => q.numero)).toEqual(['1', '2', '2 bis', '3']);
    expect(q1).toMatchObject({
      type: 'validation',
      sujet_client: 'le problème, vu par vous',
      critere: "le problème, vu par l'utilisateur",
      texte: 'Ce constat décrit-il bien votre situation actuelle ?',
      essentielle: true,
      obligatoire: true
    });
    expect(q1.extrait).toMatch(/^Les réservations arrivent/);
    expect(q1.choix.map((c) => c.nature)).toEqual(['validation', 'reserve', 'refus']);
    expect(q1.choix[0]).toEqual({
      lettre: 'A',
      nature: 'validation',
      libelle: 'Je valide',
      ligne: 'Le constat est juste : on passe à la suite.',
      avantages: 'la consultation avance.',
      faiblesses: 'plus de retour possible une fois confirmé.',
      conseille: false,
      suivante: '2'
    });
    expect(q2.type).toBe('choix');
    expect(q2.choix.map((c) => c.nature)).toEqual(['choix', 'choix', 'choix']);
    expect(q2.choix.map((c) => c.conseille)).toEqual([true, false, false]);
    expect(q2.choix.map((c) => c.suivante)).toEqual(['3', '2 bis', '2 bis']);
    expect(q2b).toMatchObject({ type: 'choix', essentielle: false, critere: null, extrait: null, sujet_client: 'canaux en ligne' });
    expect(q2b.choix.map((c) => c.suivante)).toEqual([null, null, null]);
    expect(q2b.choix[0]).toMatchObject({ libelle: 'Aucun', ligne: '...', avantages: null, faiblesses: null });
    expect(q3.choix.map((c) => c.suivante)).toEqual(['FIN', 'FIN', 'FIN']);
    expect(r.cheminMin).toBe(3);
    expect(r.cheminMax).toBe(4);
  });

  it('flags a missing target « 1 bis » on the choice line', () => {
    const t = EXEMPLE.replace('| Le gain le plus rapide à constater. | Avantages : mesurable dès le premier mois. | Faiblesses : n\'augmente pas le chiffre d\'affaires à lui seul. | -> 3', '| Le gain le plus rapide à constater. | -> 1 bis');
    const r = lireImport(t);
    expect(r.problemes).toEqual(['Ligne 16 : question 2, choix A : la question « 1 bis » est annoncée mais absente.']);
  });

  it('flags a question with two choices', () => {
    const r = lireImport(sans(EXEMPLE, 'CHOIX C Plusieurs | ... |'));
    expect(r.problemes).toEqual(['Ligne 19 : question 2 bis : 2 choix écrits, il en faut exactement 3 (CHOIX A, B et C).']);
  });

  it('flags two recommended choices', () => {
    const r = lireImport(EXEMPLE.replace('CHOIX B Moitié', 'CHOIX B [conseillé] Moitié'));
    expect(r.problemes).toEqual(['Ligne 17 : question 2 : deux choix [conseillé] ; un seul par question.']);
  });

  it('flags an unknown tag', () => {
    const r = lireImport(EXEMPLE.replace('CHOIX C Les deux', 'CHOIX C [urgent] Les deux'));
    expect(r.problemes).toEqual([
      'Ligne 18 : question 2, choix C : balise « [urgent] » inconnue ([validation], [réserve], [refus] ou [conseillé]).'
    ]);
  });

  it('flags a missing DOCUMENT block', () => {
    const t = EXEMPLE.replace(/DOCUMENT\n[\s\S]*?FIN DOCUMENT\n/, '');
    const r = lireImport(t);
    expect(r.problemes).toEqual(['Ligne 2 : bloc « DOCUMENT » … « FIN DOCUMENT » absent : le texte complet du document est attendu ici.']);
    expect(r.nbQuestions).toBe(4);
  });

  it('flags a validation question with an incomplete set of tags, a loop and an unreachable question', () => {
    expect(lireImport(EXEMPLE.replace('CHOIX B [réserve] Je valide avec', 'CHOIX B [validation] Je valide avec')).problemes).toEqual([
      'Ligne 6 : question 1 : une question de validation a exactement un choix [validation], un [réserve] et un [refus] ; sans ces balises, c’est une question à choix.'
    ]);
    const boucle = lireImport(EXEMPLE.replace('Plus de clients directs. | -> 2 bis', 'Plus de clients directs. | -> 1'));
    expect(boucle.problemes).toEqual(['Ligne 6 : l’arbre contient une boucle : un chemin revient sur une question déjà posée.']);
    const seule = lireImport(EXEMPLE.replace(/-> 2 bis/g, '-> 3'));
    expect(seule.problemes).toEqual(['Ligne 19 : question 2 bis : aucun chemin n’y mène (question inatteignable).']);
  });

  it('never throws, whatever the input', () => {
    const entrees: unknown[] = ['', '   \n\n', 'n’importe quoi', 'CONSULTATION :', 'QUESTION', 'CHOIX A |||', null, undefined, 42, EXEMPLE.repeat(3), 'DOCUMENT'];
    for (const e of entrees) {
      expect(() => lireImport(e as string)).not.toThrow();
      expect(Array.isArray(lireImport(e as string).problemes)).toBe(true);
    }
    expect(lireImport('').problemes).toEqual(['Ligne 1 : le texte est vide.']);
    expect(lireImport('DOCUMENT\nabc').problemes[0]).toMatch(/^Ligne 1 : la première ligne doit être/);
  });
});

describe('arbre', () => {
  const qs = lireImport(EXEMPLE).brouillon.questions;
  it('follows the next question, the order, and the end', () => {
    expect(questionSuivante(qs, '2', '2 bis')).toBe('2 bis');
    expect(questionSuivante(qs, '2 bis', null)).toBe('3');
    expect(questionSuivante(qs, '3', 'FIN')).toBeNull();
    expect(questionSuivante(qs, '3', null)).toBeNull();
  });
  it('measures the paths', () => {
    expect(verifierArbre(qs)).toEqual({ boucle: false, inatteignables: [], cheminMin: 3, cheminMax: 4 });
  });
});
