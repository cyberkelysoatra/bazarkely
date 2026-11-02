import { describe, expect, it } from 'vitest';
import { aRendre, adresseWhatsApp, dateCourte, ilYa, lienInvitation, messageInvitation, messageRelance, messageSuite, numeroWhatsApp } from './regles';

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
