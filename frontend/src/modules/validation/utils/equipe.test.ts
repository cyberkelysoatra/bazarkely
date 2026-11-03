import { describe, expect, it } from 'vitest';
import { aChoisi, jourHeure, libellePresence, lienEquipe, messageEquipe, personneValidant, phraseEquipe, prenomDe, votantsParChoix } from './regles';
import { adresseWhatsApp } from '../pilotage/regles';

describe('team invitation message (VC-18)', () => {
  const message = messageEquipe({
    nomCourt: 'Réservations en ligne',
    entreprise: 'Hôtel Les Palmiers',
    civilite: 'Monsieur',
    nom: 'Hery Rakoto',
    civiliteValidant: 'Madame',
    nomValidant: 'Fara Rakoto',
    lien: lienEquipe('abc123')
  });
  it('has the exact lines, upper case title, civilities, link and signature', () => {
    expect(message.split('\n')).toEqual([
      '*VOTRE PROJET : RÉSERVATIONS EN LIGNE*',
      '',
      'Bonjour Monsieur Hery Rakoto,',
      'Madame Fara Rakoto vous invite à donner votre avis sur le projet Réservations en ligne de Hôtel Les Palmiers.',
      'https://1sakely.org/validation/i/abc123',
      'Fara Rakoto'
    ]);
  });
  it('leaves out a missing civility', () => {
    const m = messageEquipe({ nomCourt: 'Essai', entreprise: 'E', civilite: null, nom: 'Lova', civiliteValidant: null, nomValidant: 'Joël SOATRA', lien: 'L' });
    expect(m.split('\n')[2]).toBe('Bonjour Lova,');
    expect(m.split('\n')[3]).toBe('Joël SOATRA vous invite à donner votre avis sur le projet Essai de E.');
  });
  it('builds a wa.me address that decodes back to the message', () => {
    const a = adresseWhatsApp('+261340000001', message);
    expect(a.startsWith('https://wa.me/261340000001?text=')).toBe(true);
    expect(decodeURIComponent(a.split('?text=')[1])).toBe(message);
  });
  it('has no long dash', () => {
    expect(/[\u2013\u2014]/.test(message)).toBe(false);
  });
});

describe('« a choisi » names (VC-14)', () => {
  it('reads 1, 2, 3 and 4 names', () => {
    expect(aChoisi([])).toBe('');
    expect(aChoisi(['Hery'])).toBe('Hery a choisi');
    expect(aChoisi(['Hery', 'Lova'])).toBe('Hery et Lova ont choisi');
    expect(aChoisi(['Hery', 'Lova', 'Fara'])).toBe('Hery, Lova et Fara ont choisi');
    expect(aChoisi(['Hery', 'Lova', 'Fara', 'Tiana'])).toBe('Hery, Lova, Fara et Tiana ont choisi');
  });
  it('groups the names by choice in answer order', () => {
    const v = votantsParChoix([
      { question_id: 'q', choix_id: 'b', nom: 'Lova', commentaire: null, repondu_at: '2026-11-02T18:20:00Z' },
      { question_id: 'q', choix_id: 'a', nom: 'Hery', commentaire: null, repondu_at: '2026-11-02T18:05:00Z' },
      { question_id: 'q', choix_id: 'b', nom: 'Fara', commentaire: null, repondu_at: '2026-11-02T18:10:00Z' }
    ]);
    expect(v).toEqual({ a: ['Hery'], b: ['Fara', 'Lova'] });
  });
});

describe('« Votre équipe » block', () => {
  const libelles = { a: 'Zéro double réservation', b: 'Moitié des réservations en ligne' };
  const avis = [
    { question_id: 'q', choix_id: 'b', nom: 'Hery', commentaire: 'Les plateformes nous prennent 18 %.', repondu_at: '2026-11-02T18:15:00Z' },
    { question_id: 'q', choix_id: 'a', nom: 'Lova', commentaire: null, repondu_at: '2026-11-02T17:05:00Z' }
  ];
  it('says who chose what, with comments and Madagascar dates', () => {
    expect(jourHeure('2026-11-02T18:15:00Z')).toBe('02/11 à 21 h 15');
    expect(phraseEquipe(avis, libelles)?.replace(/\u00a0/g, ' ')).toBe(
      'Lova a choisi « Zéro double réservation » (02/11 à 20 h 05) ; Hery a choisi « Moitié des réservations en ligne » (02/11 à 21 h 15) et commente : « Les plateformes nous prennent 18 %. » C’est à vous de trancher.'
    );
  });
  it('ends with a full stop without a comment, and without « trancher » once read-only', () => {
    expect(phraseEquipe([avis[1]], libelles, false)?.replace(/\u00a0/g, ' ')).toBe('Lova a choisi « Zéro double réservation » (02/11 à 20 h 05).');
  });
  it('keeps the date on one line', () => {
    expect(phraseEquipe([avis[1]], libelles)).toContain('(02/11\u00a0à\u00a020\u00a0h\u00a005)');
  });
  it('gives no block when nobody gave an opinion', () => {
    expect(phraseEquipe([], libelles)).toBeNull();
  });
});

describe('validant name pieces', () => {
  it('splits civility, name, first name and pronoun', () => {
    expect(personneValidant('Madame Fara Rakoto')).toEqual({ civilite: 'Madame', nom: 'Fara Rakoto', prenom: 'Fara', pronom: 'elle' });
    expect(personneValidant('Monsieur Joël SOATRA')).toEqual({ civilite: 'Monsieur', nom: 'Joël SOATRA', prenom: 'Joël', pronom: 'il' });
    expect(personneValidant('Joël SOATRA').pronom).toBe('elle ou il');
    expect(prenomDe('Hery Andrianantenaina')).toBe('Hery');
  });
});

describe('presence page label (VC-32)', () => {
  it('uses client words', () => {
    expect(libellePresence({ type: 'accueil' })).toBe('Accueil');
    expect(libellePresence({ type: 'question', titre: 'Le résumé de votre projet', n: 2, total: 3 })).toBe('Le résumé de votre projet, question 2 sur 3');
    expect(libellePresence({ type: 'relecture' })).toBe('Relecture avant confirmation');
    expect(libellePresence({ type: 'recu' })).toBe('Reçu');
    expect(libellePresence({ type: 'document', titre: 'Note de cadrage (essai)' })).toBe('Document : Note de cadrage (essai)');
    expect(libellePresence({ type: 'equipe' })).toBe('Mon équipe');
    expect(libellePresence({ type: 'infos' })).toBe('Mes informations');
  });
  it('never exceeds 80 characters', () => {
    const l = libellePresence({ type: 'question', titre: 'Un titre très long '.repeat(8), n: 12, total: 14 });
    expect(l.length).toBe(80);
    expect(l.endsWith('\u2026')).toBe(true);
  });
});
