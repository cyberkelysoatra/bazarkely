import { describe, expect, it } from 'vitest';
import {
  aRendre,
  adresseWhatsApp,
  brouillonSuivant,
  dateCourte,
  ilYa,
  lienInvitation,
  ligneCorrection,
  lignesCorrections,
  messageInvitation,
  messageRelance,
  messageSuite,
  numeroWhatsApp
} from './regles';
import type { EntreeJournal, QuestionnaireClient } from './api';

describe('person corrections (VC-44)', () => {
  const at = '2026-11-03T17:45:00Z'; // 20 h 45 in Madagascar
  it('writes one line per field', () => {
    expect(ligneCorrection({ champ: 'nom', avant: 'Rakotto', apres: 'Rakoto' }, at)).toBe('Nom corrigé le 03/11/2026 à 20 h 45 par Joël SOATRA, avant : « Rakotto ».');
    expect(ligneCorrection({ champ: 'civilite', avant: 'Monsieur', apres: 'Madame' }, at)).toBe('Civilité corrigée le 03/11/2026 à 20 h 45 par Joël SOATRA, avant : « Monsieur ».');
    expect(ligneCorrection({ champ: 'fonction', avant: null, apres: 'Gérante' }, at)).toBe('Fonction corrigée le 03/11/2026 à 20 h 45 par Joël SOATRA, avant : « (vide) ».');
    expect(ligneCorrection({ champ: 'whatsapp', avant: '', apres: '+261340000000' }, at)).toBe('Numéro corrigé le 03/11/2026 à 20 h 45 par Joël SOATRA, avant : « (vide) ».');
  });

  const ligne = (personne: string, iso: string, champs: string[]): EntreeJournal => ({
    action: 'personne_corrigee',
    personne_id: personne,
    at: iso,
    details: { changements: champs.map((c) => ({ champ: c as 'nom', avant: `${c}-${iso.slice(11, 13)}`, apres: 'x' })) }
  });

  it('keeps the person and the action, newest first, at most 3 then « et <n> autres »', () => {
    const journal: EntreeJournal[] = [
      ligne('p1', '2026-11-03T10:00:00Z', ['nom']),
      ligne('p1', '2026-11-03T12:00:00Z', ['nom', 'fonction']),
      ligne('p2', '2026-11-03T13:00:00Z', ['nom']),
      { action: 'suivi_preparation', personne_id: 'p1', at: '2026-11-03T14:00:00Z', details: null },
      ligne('p1', '2026-11-03T11:00:00Z', ['civilite'])
    ];
    const l = lignesCorrections(journal, 'p1');
    expect(l).toHaveLength(4);
    expect(l[0]).toContain('« nom-12 »');
    expect(l[1]).toContain('« fonction-12 »');
    expect(l[2]).toContain('Civilité corrigée');
    expect(l[3]).toBe('et 1 autre correction');
    expect(lignesCorrections([...journal, ligne('p1', '2026-11-03T09:00:00Z', ['nom'])], 'p1')[3]).toBe('et 2 autres corrections');
    expect(lignesCorrections(journal, 'p2')).toHaveLength(1);
    expect(lignesCorrections(undefined, 'p1')).toEqual([]);
  });
});

describe('next version to publish (VC-38)', () => {
  const q = (id: string, etat: QuestionnaireClient['etat'], type: string, version: string, cree_at: string): QuestionnaireClient => ({
    id,
    etat,
    type,
    version,
    titre_client: '',
    saisi_par: 'joel',
    cree_at,
    publie_at: null,
    confirme_at: null,
    questions: null
  });
  const confirme = q('c', 'confirme', 'note_cadrage', '0.1', '2026-11-02T10:00:00Z');

  it('takes the newest draft of the same type created later', () => {
    const qs = [
      confirme,
      q('a', 'brouillon', 'note_cadrage', '0.2', '2026-11-03T10:00:00Z'),
      q('b', 'brouillon', 'note_cadrage', '0.3', '2026-11-03T12:00:00Z'),
      q('t', 'brouillon', 'prd', '1.0', '2026-11-03T13:00:00Z'),
      q('o', 'brouillon', 'note_cadrage', '0.0', '2026-11-01T10:00:00Z')
    ];
    expect(brouillonSuivant(qs, confirme)?.id).toBe('b');
  });

  it('ignores another type, an older draft and non drafts', () => {
    const qs = [
      confirme,
      q('t', 'brouillon', 'prd', '1.0', '2026-11-03T13:00:00Z'),
      q('o', 'brouillon', 'note_cadrage', '0.0', '2026-11-01T10:00:00Z'),
      q('x', 'ouvert', 'note_cadrage', '0.2', '2026-11-03T10:00:00Z')
    ];
    expect(brouillonSuivant(qs, confirme)).toBeNull();
    expect(brouillonSuivant([confirme], confirme)).toBeNull();
  });
});

describe('pilotage rules', () => {
  const base = { civilite: 'Madame', nom: 'Fara Rakoto', questions: 4, minutes: 4, lien: lienInvitation('abc') };

  it('builds the WhatsApp message of VC-24', () => {
    expect(messageInvitation({ ...base, nomCourt: 'Réservations en ligne', phraseReve: 'Et si votre hôtel prenait ses réservations tout seul ?' })).toBe(
      [
        '*VOTRE PROJET : RÉSERVATIONS EN LIGNE*',
        '',
        '_Et si votre hôtel prenait ses réservations tout seul ?_',
        '',
        'Bonjour Madame Fara Rakoto,',
        'Votre projet prend forme. Avant de le construire, nous avons besoin de votre avis : 4 questions au plus, environ 4 minutes, depuis votre téléphone.',
        'https://1sakely.org/validation/i/abc',
        'Joël SOATRA, CyberKELY'
      ].join('\n')
    );
  });

  it('uses the general sentence when the dream is empty', () => {
    expect(messageInvitation({ ...base, nomCourt: 'x', phraseReve: '  ' })).toContain("_Et si votre idée devenait l'application dont vous rêvez ?_");
  });

  it('builds the wa.me address without « + » and with the encoded message', () => {
    expect(adresseWhatsApp('+261 34 00 000 00', 'a b\n*c*')).toBe('https://wa.me/261340000000?text=a%20b%0A*c*');
  });

  it('formats dates and delays in Madagascar time', () => {
    expect(dateCourte('2026-11-02T22:30:00Z')).toBe('03/11/2026');
    const t = Date.parse('2026-11-02T12:00:00Z');
    expect(ilYa('2026-11-02T11:50:00Z', t)).toBe('il y a 10 min');
    expect(ilYa('2026-10-31T12:00:00Z', t)).toBe('il y a 2 j');
    expect(aRendre('2026-11-05T11:00:00Z', t)).toBe('À rendre dans 2 j 23 h');
    expect(aRendre('2026-11-02T11:00:00Z', t)).toBeNull();
  });

  it('checks WhatsApp numbers', () => {
    expect(numeroWhatsApp('+261 32 00 000 00')).toBe('+261320000000');
    expect(numeroWhatsApp('0320000000')).toBeNull();
  });

  it('builds the reminder (VC-28) and the follow-up message (VC-38)', () => {
    expect(messageRelance({ nomCourt: 'Essai Validation', civilite: 'Monsieur', nom: 'Joël SOATRA', titreClient: 'Le résumé de votre projet', restantes: 3 })).toBe(
      [
        '*VOTRE PROJET : ESSAI VALIDATION*',
        '',
        'Bonjour Monsieur Joël SOATRA, votre avis sur le résumé de votre projet nous attend : il reste 3 questions.',
        'https://1sakely.org/validation/',
        'Joël SOATRA, CyberKELY'
      ].join('\n')
    );
    expect(messageRelance({ nomCourt: 'x', civilite: 'Madame', nom: 'Fara', titreClient: 'PRD', restantes: 1 })).toContain('votre avis sur PRD nous attend : il reste 1 question.');
    expect(messageSuite({ nomCourt: 'Essai Validation', civilite: 'Monsieur', nom: 'Joël SOATRA' })).toBe(
      '*VOTRE PROJET : ESSAI VALIDATION*\n\nBonjour Monsieur Joël SOATRA, la suite de votre projet est prête : https://1sakely.org/validation/\nJoël SOATRA, CyberKELY'
    );
  });
});
