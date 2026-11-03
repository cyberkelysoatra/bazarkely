import { describe, expect, it } from 'vitest';
import { lireImport } from './import';
import { dateHeureSeconde, partieQuestions, synthese, texteAssistant, versionSuivante, type DonneesResultats, type QuestionResultat } from './export';

const V = 'Madame Fara Rakoto';
const H = 'Monsieur Hery Rabe';

const choix = (q: string, l: string, nature: QuestionResultat['choix'][number]['nature'], libelle: string, suivante: string | null, extra: Partial<QuestionResultat['choix'][number]> = {}) => ({
  id: `${q}${l}`,
  lettre: l,
  nature,
  libelle,
  ligne: `Ligne ${q}${l}.`,
  avantages: null,
  faiblesses: null,
  conseille: false,
  suivante,
  ...extra
});

const rep = (personne: string, choix_id: string, repondu_at: string, commentaire: string | null = null) => ({
  personne,
  fonction: personne === V ? 'Directrice' : 'Associé',
  role: personne === V ? 'validant' : 'contributeur',
  choix_id,
  commentaire,
  version: '1.2',
  repondu_at
});

// 4 questions: 1 validation, 2 choice (B leads to 2 bis), 2 bis, 3 validation. The validant changed
// question 2 once (B then A, so 2 bis left the path), refused question 3 with a reason; the
// contributor gave an opinion on 2 bis (out of the validant's path).
const DONNEES: DonneesResultats = {
  type: 'note_cadrage',
  version: '1.2',
  titre_client: 'Le résumé de votre projet',
  entreprise: 'Hôtel Les Palmiers (exemple)',
  validant: { personne: V, fonction: 'Directrice' },
  confirme_at: '2026-11-02T18:32:00Z',
  chemin: ['1', '2', '3'],
  questions: [
    {
      id: 'q1',
      numero: '1',
      ordre: 1,
      type: 'validation',
      sujet_client: 'le problème, vu par vous',
      critere: "le problème, vu par l'utilisateur",
      texte: 'Ce constat décrit-il bien votre situation actuelle ?',
      extrait: 'Les réservations arrivent par WhatsApp, téléphone et e-mail.',
      essentielle: true,
      choix: [
        choix('q1', 'A', 'validation', 'Je valide', '2', { avantages: 'la consultation avance.', faiblesses: 'plus de retour possible.' }),
        choix('q1', 'B', 'reserve', 'Je valide avec une réserve', '2'),
        choix('q1', 'C', 'refus', 'Je ne valide pas', '2')
      ],
      reponses: [rep(V, 'q1A', '2026-11-02T18:28:10Z'), rep(H, 'q1A', '2026-11-02T18:16:30Z', 'oui, surtout en août.')]
    },
    {
      id: 'q2',
      numero: '2',
      ordre: 2,
      type: 'choix',
      sujet_client: 'votre objectif',
      critere: null,
      texte: 'Quel objectif visez-vous ?',
      extrait: null,
      essentielle: true,
      choix: [
        choix('q2', 'A', 'choix', 'Zéro double réservation', '3', { conseille: true }),
        choix('q2', 'B', 'choix', 'Moitié en ligne', '2 bis'),
        choix('q2', 'C', 'choix', 'Les deux', '2 bis')
      ],
      reponses: [rep(V, 'q2A', '2026-11-02T18:29:00Z', "D'ici la fin de la saison."), rep(V, 'q2B', '2026-11-02T18:28:40Z')]
    },
    {
      id: 'q2b',
      numero: '2 bis',
      ordre: 3,
      type: 'choix',
      sujet_client: 'canaux en ligne',
      critere: null,
      texte: 'Par quels canaux vendez-vous en ligne ?',
      extrait: null,
      essentielle: false,
      choix: [choix('q2b', 'A', 'choix', 'Aucun', null), choix('q2b', 'B', 'choix', 'Une plateforme', null), choix('q2b', 'C', 'choix', 'Plusieurs', null)],
      reponses: [rep(H, 'q2bC', '2026-11-02T18:15:00Z', 'WhatsApp et Booking.')]
    },
    {
      id: 'q3',
      numero: '3',
      ordre: 4,
      type: 'validation',
      sujet_client: 'le budget',
      critere: 'budget connu',
      texte: 'Le budget annoncé vous convient-il ?',
      extrait: null,
      essentielle: true,
      choix: [
        choix('q3', 'A', 'validation', 'Je valide', 'FIN'),
        choix('q3', 'B', 'reserve', 'Avec une réserve', 'FIN'),
        choix('q3', 'C', 'refus', 'Je ne valide pas', 'FIN')
      ],
      reponses: [rep(V, 'q3C', '2026-11-02T18:29:41Z', 'Trop élevé hors saison.')]
    }
  ],
  messages: []
};

describe('texteAssistant', () => {
  const texte = texteAssistant(DONNEES);
  const lignes = texte.split('\n');

  it('contains every expected line, in order', () => {
    const attendues = [
      'RÉSULTATS : note_cadrage v1.2',
      'CLIENT : Hôtel Les Palmiers (exemple) ; validant : Fara Rakoto, Directrice',
      'ÉTAT : confirmée le 02/11/2026 à 21:32 (heure de Madagascar) ; 3 questions sur le chemin, 1 hors chemin ; jauge 67 % ; 2 validées, 0 réserve, 1 refus',
      'POINTS À REPRENDRE : Q3 (refus)',
      'PROCHAINE ÉTAPE CONSEILLÉE : note de cadrage v1.3, puis une consultation de confirmation sur ces points.',
      'QUESTION 1 [essentielle] le problème, vu par vous',
      "CRITÈRE : le problème, vu par l'utilisateur",
      'EXTRAIT : Les réservations arrivent par WhatsApp, téléphone et e-mail.',
      'Ce constat décrit-il bien votre situation actuelle ?',
      'CHOIX A [validation] Je valide | Ligne q1A. | Avantages : la consultation avance. | Faiblesses : plus de retour possible. | -> 2',
      'CHOIX B [réserve] Je valide avec une réserve | Ligne q1B. | -> 2',
      'CHOIX C [refus] Je ne valide pas | Ligne q1C. | -> 2',
      'RÉPONSE : A Je valide | 02/11/2026 21:28:10',
      'ÉQUIPE : Hery Rabe, Associé : A Je valide | « oui, surtout en août. »',
      'QUESTION 2 [essentielle] votre objectif',
      'CHOIX A [conseillé] Zéro double réservation | Ligne q2A. | -> 3',
      'CHOIX B Moitié en ligne | Ligne q2B. | -> 2 bis',
      "RÉPONSE : A Zéro double réservation | 02/11/2026 21:29:00 | « D'ici la fin de la saison. »",
      'HISTORIQUE : B Moitié en ligne le 02/11/2026 21:28:40, remplacée',
      'QUESTION 2 bis canaux en ligne',
      'RÉPONSE : hors chemin',
      'ÉQUIPE : Hery Rabe, Associé : C Plusieurs | « WhatsApp et Booking. »',
      'QUESTION 3 [essentielle] le budget',
      'RÉPONSE : C Je ne valide pas | 02/11/2026 21:29:41 | « Trop élevé hors saison. »',
      'DISCUSSION : aucun message'
    ];
    let depuis = -1;
    for (const a of attendues) {
      const i = lignes.indexOf(a, depuis + 1);
      expect(i, `ligne attendue après la ligne ${depuis + 1} : ${a}`).toBeGreaterThan(depuis);
      depuis = i;
    }
    expect(texte).not.toMatch(/\nDOCUMENT\n/);
    expect(texte).not.toMatch(/[\u2013\u2014]/);
  });

  it('round trip: the question part re-read by lireImport gives the same questions and choices', () => {
    const relu = lireImport(`CONSULTATION : note_cadrage | 1.2 | Le résumé de votre projet\nDOCUMENT\n# Note\nFIN DOCUMENT\n${partieQuestions(texte)}`);
    expect(relu.problemes).toEqual([]);
    const attendu = DONNEES.questions.map((q) => ({
      numero: q.numero,
      type: q.type,
      sujet_client: q.sujet_client,
      critere: q.critere,
      texte: q.texte,
      extrait: q.extrait,
      essentielle: q.essentielle,
      choix: q.choix.map(({ lettre, nature, libelle, ligne, avantages, faiblesses, conseille, suivante }) => ({ lettre, nature, libelle, ligne, avantages, faiblesses, conseille, suivante }))
    }));
    expect(relu.brouillon.questions.map(({ obligatoire: _o, ...q }) => q)).toEqual(attendu);
  });

  it('writes one CORRECTION line per corrected field, with the team, ignored by the import (VC-44)', () => {
    const t = texteAssistant({
      ...DONNEES,
      corrections: [
        { personne: 'Madame Fara Rakoto', champ: 'fonction', avant: null, apres: 'Gérante', at: '2026-11-03T17:46:00Z' },
        { personne: 'Madame Fara Rakoto', champ: 'nom', avant: 'Fara Rakotto', apres: 'Fara Rakoto', at: '2026-11-03T17:45:10Z' }
      ]
    });
    const lignes = t.split('\n');
    const client = lignes.findIndex((l) => l.startsWith('CLIENT : '));
    expect(lignes[client + 1]).toBe('CORRECTION : nom de Madame Fara Rakoto le 03/11/2026 20:45:10, avant « Fara Rakotto », après « Fara Rakoto »');
    expect(lignes[client + 2]).toBe('CORRECTION : fonction de Madame Fara Rakoto le 03/11/2026 20:46:00, avant « (vide) », après « Gérante »');
    expect(partieQuestions(t)).not.toMatch(/CORRECTION/);
    const relu = lireImport(`CONSULTATION : note_cadrage | 1.2 | Le résumé de votre projet\nDOCUMENT\n# Note\nFIN DOCUMENT\n${partieQuestions(t)}`);
    expect(relu.problemes).toEqual([]);
    expect(texteAssistant(DONNEES)).not.toMatch(/CORRECTION/);
  });

  it('lists the discussion with dates and question references', () => {
    const t = texteAssistant({
      ...DONNEES,
      messages: [
        { auteur: 'Joël SOATRA', texte: 'Je reprends le budget.', cree_at: '2026-11-02T19:05:00Z', question_id: 'q3' },
        { auteur: V, texte: 'Merci.', cree_at: '2026-11-02T19:00:00Z', question_id: null }
      ]
    });
    expect(t).toContain('DISCUSSION : 02/11/2026 22:00 | Fara Rakoto | « Merci. »\nDISCUSSION : 02/11/2026 22:05 | Joël SOATRA | question 3 | « Je reprends le budget. »');
  });

  it('real thread: two messages and a withdrawn one, dated, with question references (phase 7)', () => {
    const t = texteAssistant({
      ...DONNEES,
      messages: [
        { auteur: 'Monsieur Hery Rabe', texte: 'Le budget comprend les photos ?', retire: false, cree_at: '2026-11-02T18:17:00Z', question_id: 'q3' },
        { auteur: 'Joël SOATRA', texte: 'Oui, photos comprises.', retire: false, cree_at: '2026-11-02T18:25:00Z', question_id: null },
        { auteur: V, texte: null, retire: true, cree_at: '2026-11-02T18:40:00Z', question_id: 'q1' }
      ]
    });
    const lignes = t.split('\n').filter((l) => l.startsWith('DISCUSSION'));
    expect(lignes).toEqual([
      'DISCUSSION : 02/11/2026 21:17 | Hery Rabe | question 3 | « Le budget comprend les photos ? »',
      'DISCUSSION : 02/11/2026 21:25 | Joël SOATRA | « Oui, photos comprises. »',
      'DISCUSSION : 02/11/2026 21:40 | Fara Rakoto | question 1 | Message retiré'
    ]);
  });

  it('marks an unconfirmed questionnaire as provisional and an unanswered question', () => {
    const t = texteAssistant({ ...DONNEES, confirme_at: null, questions: DONNEES.questions.map((q) => (q.id === 'q3' ? { ...q, reponses: [] } : q)) });
    expect(t).toContain('ÉTAT : Pas encore confirmée : résultats provisoires ; 3 questions sur le chemin');
    expect(t).toContain('RÉPONSE : sans réponse');
    expect(t).toContain('POINTS À REPRENDRE : aucun');
  });
});

describe('synthese', () => {
  it('figures, table rows and points of the phase 4 test data shape', () => {
    const s = synthese(DONNEES);
    expect(s.chiffres).toEqual({ total: 3, repondues: 3, validees: 2, reserves: 0, refus: 1, jauge: 67 });
    expect(s.tableau.map((l) => l.q.numero)).toEqual(['1', '2', '2 bis', '3']);
    expect(s.points).toEqual([{ numero: '3', nature: 'refus' }]);
    const q2 = s.lignes[1];
    expect(q2.reponse?.choix?.lettre).toBe('A');
    expect(q2.historique.map((h) => h.choix?.lettre)).toEqual(['B']);
  });

  it('an out-of-path question without opinion stays out of the table', () => {
    const s = synthese({ ...DONNEES, questions: DONNEES.questions.map((q) => (q.id === 'q2b' ? { ...q, reponses: [] } : q)) });
    expect(s.tableau.map((l) => l.q.numero)).toEqual(['1', '2', '3']);
  });
});

describe('helpers', () => {
  it('versionSuivante and dateHeureSeconde', () => {
    expect(versionSuivante('0.1')).toBe('0.2');
    expect(versionSuivante('1.9')).toBe('1.10');
    expect(versionSuivante('2')).toBe('3');
    expect(dateHeureSeconde('2026-11-02T22:10:41.484Z')).toBe('03/11/2026 01:10:41');
  });
});
