import { describe, expect, it } from 'vitest';
import {
  BROUILLON_VIDE,
  VOIX,
  ajouterVoix,
  basculerUrgent,
  brouillonValide,
  codeCanalValide,
  ecartPudi,
  limiterManquant,
  normaliserTelephone,
  normaliserTelephoneAffichage,
  peutAjouterUrgent,
  peutAjouterVoix,
  regrouperVoix,
  retirerVoix,
  texteVoix,
  voixPour,
  voixUtilisees,
  type Brouillon
} from './regles';
import { extraireCode, messageErreur } from './erreurs';
import { dateClotureLongue, formatAr, tempsRestant } from './format';

const b = (p: Partial<Brouillon>): Brouillon => ({ ...BROUILLON_VIDE, ...p });
const DIX = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'T1', 'T2'];

// PUDI-CC-17: 12 votes, several (up to 12) on the same programme.
const DOUZE = ['A1', 'A2', 'A3', 'A5', 'A6', 'A7', 'A8', 'T1', 'T2', 'T4', 'T5', 'T6'];
const repete = (id: string, n: number) => Array.from({ length: n }, () => id);

describe('12 voix', () => {
  it('VOIX is 12', () => {
    expect(VOIX).toBe(12);
  });
  it('places 12 votes on 12 different programmes, refuses the 13th', () => {
    let x = b({});
    for (const id of DOUZE) x = ajouterVoix(x, id);
    expect(voixUtilisees(x)).toBe(12);
    expect(peutAjouterVoix(x)).toBe(false);
    expect(ajouterVoix(x, 'T3')).toBe(x);
  });
  it('places all 12 votes on one programme', () => {
    let x = b({});
    for (let i = 0; i < 12; i++) x = ajouterVoix(x, 'A4');
    expect(voixPour(x, 'A4')).toBe(12);
    expect(ajouterVoix(x, 'A4')).toBe(x);
    expect(brouillonValide(x)).toBe(true);
  });
  it('5 + 4 + 3, then remove one vote', () => {
    const x = b({ priorites: [...repete('A4', 5), ...repete('T3', 4), ...repete('P1', 3)] });
    expect([voixPour(x, 'A4'), voixPour(x, 'T3'), voixPour(x, 'P1'), voixPour(x, 'W1')]).toEqual([5, 4, 3, 0]);
    expect(voixPour(retirerVoix(x, 'T3'), 'T3')).toBe(3);
    expect(voixUtilisees(retirerVoix(x, 'T3'))).toBe(11);
    expect(retirerVoix(x, 'W1')).toBe(x);
    expect(texteVoix(x.priorites)).toBe('A4 ×5, T3 ×4, P1 ×3');
  });
  it('groups the votes, most first then in the order placed', () => {
    expect(regrouperVoix(['T3', 'A4', 'A4', 'P1', 'T3', 'A4'])).toEqual([
      { id: 'A4', n: 3 },
      { id: 'T3', n: 2 },
      { id: 'P1', n: 1 }
    ]);
  });
  it('an old vote of 3 programmes = 3 votes used of 12', () => {
    const x = b({ priorites: ['T3', 'A1', 'W3'] });
    expect(voixUtilisees(x)).toBe(3);
    expect(peutAjouterVoix(x)).toBe(true);
    expect(brouillonValide(x)).toBe(true);
  });
});

describe('peutAjouterUrgent', () => {
  it('accepts a 10th urgent and refuses an 11th', () => {
    expect(peutAjouterUrgent(b({ urgents: DIX.slice(0, 9) }), 'T2')).toBe(true);
    expect(peutAjouterUrgent(b({ urgents: DIX }), 'T3')).toBe(false);
    expect(basculerUrgent(b({ urgents: DIX }), 'T3').urgents).toHaveLength(10);
  });
  it('a programme may be both priority and urgent', () => {
    expect(peutAjouterUrgent(b({ priorites: ['A1'] }), 'A1')).toBe(true);
  });
});

describe('brouillonValide', () => {
  it('needs 1 to 12 votes, repeats allowed', () => {
    expect(brouillonValide(b({ priorites: [] }))).toBe(false);
    expect(brouillonValide(b({ priorites: ['A1'] }))).toBe(true);
    expect(brouillonValide(b({ priorites: ['A1', 'A1', 'A3'] }))).toBe(true);
    expect(brouillonValide(b({ priorites: repete('A1', 13) }))).toBe(false);
  });
  it('limits urgents and text, checks known ids', () => {
    expect(brouillonValide(b({ priorites: ['A1', 'A2', 'A3'], urgents: [...DIX, 'T3'] }))).toBe(false);
    expect(brouillonValide(b({ priorites: ['A1', 'A2', 'A3'], manquant: 'x'.repeat(1001) }))).toBe(false);
    expect(brouillonValide(b({ priorites: ['A1', 'A2', 'A3'], manquant: 'x'.repeat(1000) }))).toBe(true);
    expect(brouillonValide(b({ priorites: ['A1', 'A2', 'ZZ'] }), ['A1', 'A2', 'A3'])).toBe(false);
  });
  it('limiterManquant makes the 1001st character impossible', () => {
    expect(limiterManquant('x'.repeat(1000))).toHaveLength(1000);
    expect(limiterManquant('x'.repeat(1001))).toHaveLength(1000);
  });
});

describe('telephone', () => {
  it('normalises Malagasy mobiles like the server', () => {
    expect(normaliserTelephone('034 12 345 67')).toBe('261341234567');
    expect(normaliserTelephone('+261 34 12 345 67')).toBe('261341234567');
    expect(normaliserTelephone('00261341234567')).toBe('261341234567');
    expect(normaliserTelephone('341234567')).toBe('261341234567');
  });
  it('refuses malformed numbers', () => {
    expect(normaliserTelephone('031 12 345 67')).toBeNull();
    expect(normaliserTelephone('12345')).toBeNull();
    expect(normaliserTelephone('0612345678')).toBeNull();
    expect(normaliserTelephone('')).toBeNull();
  });
  it('accepts foreign numbers only with + or 00', () => {
    expect(normaliserTelephone('+33 6 12 34 56 78')).toBe('33612345678');
  });
  it('display form', () => {
    expect(normaliserTelephoneAffichage('+261341234567')).toBe('034 12 345 67');
    expect(normaliserTelephoneAffichage('abc')).toBeNull();
  });
});

describe('ecartPudi and provenance', () => {
  it('flags programmes planned after 2030', () => {
    expect(ecartPudi('2026-2030')).toBe(false);
    expect(ecartPudi('2031-2035')).toBe(true);
    expect(ecartPudi('2036-2040')).toBe(true);
  });
  it('validates channel codes', () => {
    expect(codeCanalValide('test-canal')).toBe(true);
    expect(codeCanalValide('Bad Code')).toBe(false);
    expect(codeCanalValide('x'.repeat(25))).toBe(false);
    expect(codeCanalValide(null)).toBe(false);
  });
});

describe('error mapper', () => {
  it('maps PUDI_NUMERO_DEJA_UTILISE (returned, not raised) to the phone field', () => {
    const e = messageErreur({ erreur: 'PUDI_NUMERO_DEJA_UTILISE' });
    expect(e.code).toBe('NUMERO_DEJA_UTILISE');
    expect(e.champ).toBe('telephone');
    expect(e.message).toContain('a déjà servi à voter avec un autre compte Google');
  });
  it('maps raised errors from their message', () => {
    expect(messageErreur({ message: 'PUDI_NUMERO_INVALIDE' }).message).toBe(
      "Ce numéro n'est pas valide. Exemple : 034 12 345 67."
    );
    expect(messageErreur(new Error('PUDI_RESIDENCE')).champ).toBe('resident');
    expect(messageErreur({ message: 'PUDI_NON_PUBLIE' }).message).toBe("La consultation n'est pas encore ouverte.");
    expect(messageErreur({ message: 'PUDI_CLOS' }).message).toBe('La consultation est close.');
  });
  it('maps network timeouts and unknown errors', () => {
    expect(extraireCode(new Error('timeout'))).toBe('RESEAU');
    expect(messageErreur(new Error('boom')).message).toBe('Une erreur est survenue. Votre choix est gardé sur ce téléphone.');
  });
});

describe('format', () => {
  it('formats amounts with spaces and Ar', () => {
    expect(formatAr(610000000)).toBe('610 000 000 Ar');
  });
  it('writes the closing date in full, Madagascar time', () => {
    expect(dateClotureLongue('2026-10-26T17:00:00+00:00')).toBe('lundi 26 octobre 2026 à 20 h (heure de Madagascar)');
  });
  it('countdown', () => {
    const fin = Date.parse('2026-10-26T17:00:00Z');
    expect(tempsRestant(fin, fin - (2 * 1440 + 3 * 60 + 4) * 60000)).toEqual({ jours: 2, heures: 3, minutes: 4, fini: false });
    expect(tempsRestant(fin, fin + 1).fini).toBe(true);
  });
});

describe('charter', () => {
  it('no em dash in the French dictionary', async () => {
    const { fr } = await import('../i18n/fr');
    expect(JSON.stringify(fr)).not.toContain(String.fromCharCode(0x2014));
  });
});
