import { describe, expect, it } from 'vitest';
import {
  adresseChrome,
  champDuCode,
  choisirProjet,
  comptes,
  dateHeure,
  delaiRestant,
  erreursFormulaire,
  estNavigateurInterne,
  estNouvelleVersion,
  etatCarte,
  initiales,
  lignePour,
  nomCycle,
  normaliserNumero,
  ordonnerDocuments,
  premierChampFautif,
  questionAOuvrir,
  retourSur
} from './regles';
import type { DocumentEspace } from './types';

const doc = (x: Partial<DocumentEspace> = {}): DocumentEspace => ({
  questionnaire_id: 'q1',
  document_id: 'd1',
  type: 'note_cadrage',
  version: '0.1',
  titre_client: 'Le résumé de votre projet',
  etat: 'ouvert',
  etat_personne: { total: 3, repondues: 0, acceptees: 0, refus: 0, reserves: 0, jauge: 0, pret: false },
  confirme_at: null,
  echeance_at: null,
  ...x
});

describe('header', () => {
  it('initials and « pour » line', () => {
    expect(initiales('Joël SOATRA')).toBe('JS');
    expect(initiales('Fara Rakoto Be')).toBe('FB');
    expect(initiales('')).toBe('?');
    expect(lignePour({ nom: 'Fara Rakoto', fonction: 'Directrice', entreprise: 'Hôtel Les Palmiers' })).toBe('pour Fara Rakoto, directrice, Hôtel Les Palmiers');
    expect(lignePour({ nom: 'Joël SOATRA', fonction: 'PDG', entreprise: null })).toBe('pour Joël SOATRA, PDG');
    expect(lignePour({ nom: null, fonction: null, entreprise: null })).toBe('');
  });
});

describe('choisirProjet', () => {
  it('active project first, else archived, revoked, none', () => {
    expect(choisirProjet([]).type).toBe('aucun');
    expect(choisirProjet(null).type).toBe('aucun');
    expect(choisirProjet([{ client_id: 'a', revoque: true }]).type).toBe('revoque');
    expect(choisirProjet([{ client_id: 'a', revoque: false, archive: true }]).type).toBe('archive');
    const c = choisirProjet([{ client_id: 'a', revoque: true }, { client_id: 'b', revoque: false, nom_court: 'X' }]);
    expect(c.type === 'projet' && c.espace.client_id).toBe('b');
  });
});

describe('home cards (VC-08)', () => {
  it('state of a card', () => {
    expect(etatCarte(doc())).toBe('a_commencer');
    expect(etatCarte(doc({ etat_personne: { total: 3, repondues: 1, acceptees: 1, refus: 0, reserves: 0, jauge: 33, pret: false } }))).toBe('en_cours');
    expect(etatCarte(doc({ etat_personne: { total: 3, repondues: 3, acceptees: 2, refus: 1, reserves: 0, jauge: 67, pret: true } }))).toBe('pret');
    expect(etatCarte(doc({ etat: 'confirme', confirme_at: '2026-11-02T18:32:00Z' }))).toBe('confirme');
    expect(etatCarte(doc({ etat: 'remplace' }))).toBe('remplace');
    expect(etatCarte(doc({ etat: 'clos' }))).toBe('clos');
    expect(etatCarte(doc({ etat_personne: null }))).toBe('a_commencer');
  });
  it('question to open', () => {
    expect(questionAOuvrir(doc())).toBe(1);
    expect(questionAOuvrir(doc({ etat_personne: { total: 3, repondues: 2, acceptees: 2, refus: 0, reserves: 0, jauge: 67, pret: false } }))).toBe(3);
  });
  it('cycle name, counts', () => {
    expect(nomCycle('note_cadrage', '1.2')).toBe('Note de cadrage, version 1.2');
    expect(comptes(doc({ etat_personne: { total: 8, repondues: 8, acceptees: 7, refus: 1, reserves: 1, jauge: 88, pret: true } }))).toBe('6 validées, 1 réserve, 1 refus');
  });
  it('replaced version sits under the new one, which says « Nouvelle version »', () => {
    const nouveau = doc({ questionnaire_id: 'n', version: '1.3' });
    const autre = doc({ questionnaire_id: 'c', type: 'cahier_charges' });
    const ancien = doc({ questionnaire_id: 'a', version: '1.2', etat: 'remplace' });
    const l = ordonnerDocuments([nouveau, autre, ancien]);
    expect(l.map((d) => d.questionnaire_id)).toEqual(['n', 'a', 'c']);
    expect(estNouvelleVersion(nouveau, l)).toBe(true);
    expect(estNouvelleVersion(autre, l)).toBe(false);
    expect(estNouvelleVersion(ancien, l)).toBe(false);
  });
});

describe('Madagascar time', () => {
  it('date and hour in Indian/Antananarivo (UTC+3)', () => {
    expect(dateHeure('2026-11-05T18:32:00Z')).toBe('05/11/2026 à 21 h 32');
    expect(dateHeure('2026-11-05T22:05:00Z')).toBe('06/11/2026 à 01 h 05');
  });
  it('time left', () => {
    const t0 = Date.parse('2026-11-02T18:32:00Z');
    expect(delaiRestant('2026-11-05T18:32:00Z', t0 + 3600000)).toBe('dans 2 j 23 h');
    expect(delaiRestant('2026-11-02T20:32:00Z', t0)).toBe('dans 2 h');
    expect(delaiRestant('2026-11-02T18:40:00Z', t0)).toBe('dans 8 min');
    expect(delaiRestant('2026-11-02T18:00:00Z', t0)).toBeNull();
  });
});

describe('registration form (VC-16)', () => {
  const ok = { civilite: 'Monsieur', entreprise: 'Essai', fonction: 'Gérant', whatsapp: '+261 32 00 000 00', emailPro: '' };
  it('accepts a valid form, international number with spaces', () => {
    expect(erreursFormulaire(ok)).toEqual({});
    expect(normaliserNumero('+261 32 00-000.00')).toBe('+261320000000');
  });
  it('refuses a wrong number and a wrong e-mail, first faulty field in screen order', () => {
    const e = erreursFormulaire({ ...ok, whatsapp: '0320000000', emailPro: 'pas-un-email' });
    expect(e.whatsapp).toMatch(/format international/);
    expect(e.emailPro).toMatch(/pas valide/);
    expect(premierChampFautif(e)).toBe('whatsapp');
    expect(premierChampFautif(erreursFormulaire({ ...ok, entreprise: ' ', whatsapp: '' }))).toBe('entreprise');
  });
  it('server codes map to their field', () => {
    expect(Object.keys(champDuCode('NUMERO_INVALIDE', ok))).toEqual(['whatsapp']);
    expect(Object.keys(champDuCode('EMAIL_INVALIDE', ok))).toEqual(['emailPro']);
    expect(Object.keys(champDuCode('CHAMP_OBLIGATOIRE', { ...ok, fonction: '' }))).toEqual(['fonction']);
    expect(champDuCode('AUTRE', ok)).toEqual({});
  });
});

describe('sign-in helpers', () => {
  it('WhatsApp built-in browser and Chrome address', () => {
    expect(estNavigateurInterne('Mozilla/5.0 (Linux; Android 14; wv) WhatsApp/2.24')).toBe(true);
    expect(estNavigateurInterne('Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile')).toBe(false);
    expect(adresseChrome('https://1sakely.org/validation/i/abc#x', true)).toBe(
      'intent://1sakely.org/validation/i/abc#Intent;scheme=https;package=com.android.chrome;end'
    );
    expect(adresseChrome('https://1sakely.org/validation/i/abc', false)).toBe('https://1sakely.org/validation/i/abc');
  });
  it('return address stays inside the module', () => {
    expect(retourSur('/i/abc123')).toBe('/i/abc123');
    expect(retourSur('//evil.example')).toBe('/');
    expect(retourSur('https://evil.example')).toBe('/');
    expect(retourSur(null)).toBe('/');
  });
});
