// PUDI-CC-07: wording, programme texts, QR label, default closing, group managers' helpers.
import { describe, expect, it } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { fr } from '../i18n/fr';
import { libelleQr } from '../appels/qr';
import { CLOTURE_PAR_DEFAUT, dateClotureLongue } from './format';
import { afficherNumero, filtrerMembres, messageGroupe, verifierSaisie } from './groupe';

const D = donneesBrutes as unknown as PudiDonnees;
const P = (id: string) => D.programmes.find((p) => p.id === id)!;

describe('wording requested by the PIC', () => {
  it('« Propositions de nouveaux projets » everywhere, no « hors liste », no em dash', () => {
    expect(fr.propositions.titre).toBe('Propositions de nouveaux projets');
    expect(fr.secteurs.carteProposition).toBe('Propositions de nouveaux projets');
    expect(fr.resultats.propositionsTitre).toBe('Propositions de nouveaux projets');
    const tout = JSON.stringify(fr);
    expect(tout).not.toMatch(/hors liste/i);
    expect(tout).not.toContain('—');
  });
});

describe('programme texts requested by the PIC', () => {
  it('A6 mentions the hospital and the new CHRD', () => {
    expect(P('A6').resume).toBe(
      'Créer une nouvelle ville à Madiro : habitat organisé, équipements publics dont un hôpital, zone sportive, parc solaire et gare routière.'
    );
    expect(P('A6').precision).toContain('nouveau CHRD');
    expect(P('A6').precision).toContain('(2,67 ha)');
  });
  it('H1 points to A6, H2 covers every district', () => {
    expect(P('H1').precision).toContain('programme A6');
    expect(P('H2').resume).toContain('dans tous les arrondissements');
    expect(P('H2').precision).toContain('PUDi p. 104');
  });
  it('the data file has no em dash', () => {
    expect(JSON.stringify(D)).not.toContain('—');
  });
});

describe('libelleQr', () => {
  it('WhatsApp group: « Groupe » + name, never the type word', () => {
    expect(libelleQr('Groupe WhatsApp « Opérateurs nosybe »', 'groupe_whatsapp')).toBe('Groupe « Opérateurs nosybe »');
    expect(libelleQr('Groupe WhatsApp du GIHTNB', 'groupe_whatsapp')).toBe('Groupe du GIHTNB');
    expect(libelleQr('WhatsApp Hôtels', 'groupe_whatsapp')).toBe('Groupe Hôtels');
    expect(libelleQr('Essai phase 2', 'groupe_whatsapp')).toBe('Groupe Essai phase 2');
    expect(libelleQr('Groupes de quartier', 'groupe_whatsapp')).toBe('Groupe Groupes de quartier');
  });
  it('other types: the name alone', () => {
    expect(libelleQr('Affiche, Commune Urbaine de Nosy Be', 'affiche')).toBe('Affiche, Commune Urbaine de Nosy Be');
    expect(libelleQr('Réunion PIC3 du 20/10/2026 (fiche de présence)', 'reunion')).toBe('Réunion PIC3 du 20/10/2026 (fiche de présence)');
    expect(libelleQr('Réseau du PIC3', 'autre')).toBe('Réseau du PIC3');
  });
});

describe('CLOTURE_PAR_DEFAUT', () => {
  it('Monday 26 October 2026 at 8 h, Madagascar time', () => {
    expect(CLOTURE_PAR_DEFAUT).toBe('2026-10-26T08:00:00+03:00');
    expect(dateClotureLongue(CLOTURE_PAR_DEFAUT)).toBe('lundi 26 octobre 2026 à 8 h (heure de Madagascar)');
  });
});

describe('group managers helpers', () => {
  const membres = [
    { id: 'a', numeros: ['261341234567', '33612345678'], email: 'hotel@gmail.com', etablissement: 'Hôtel Vanila', fokontany: 'Ambatoloaka' },
    { id: 'b', numeros: ['261329876543'], email: null, etablissement: null, fokontany: 'Dar-es-Salam' }
  ];
  it('shows the numbers in clear, local or international', () => {
    expect(afficherNumero('261341234567')).toBe('034 12 345 67');
    expect(afficherNumero('33612345678')).toBe('+33612345678');
  });
  it('searches numbers (any spacing), names, establishments, fokontany, without accents', () => {
    expect(filtrerMembres(membres, '').map((m) => m.id)).toEqual(['a', 'b']);
    expect(filtrerMembres(membres, '034 12').map((m) => m.id)).toEqual(['a']);
    expect(filtrerMembres(membres, '+33 6 12').map((m) => m.id)).toEqual(['a']);
    expect(filtrerMembres(membres, '0329876543').map((m) => m.id)).toEqual(['b']);
    expect(filtrerMembres(membres, 'hotel vanila').map((m) => m.id)).toEqual(['a']);
    expect(filtrerMembres(membres, 'dar es').map((m) => m.id)).toEqual(['b']);
    expect(filtrerMembres(membres, 'zzz')).toEqual([]);
  });
  it('checks the form like the server', () => {
    expect(verifierSaisie(['', ''], '')).toBe('PUDI_NUMERO_REQUIS');
    expect(verifierSaisie(['034 12 345 67', '+33 6 12 34 56 78'], '')).toBeNull();
    expect(verifierSaisie(['12345'], '')).toBe('PUDI_NUMERO_INVALIDE');
    expect(verifierSaisie(['0341234567', '0321234567', '0331234567', '0381234567'], '')).toBe('PUDI_NUMERO_INVALIDE');
    expect(verifierSaisie(['0341234567'], 'pas-un-email')).toBe('PUDI_EMAIL_INVALIDE');
    expect(verifierSaisie(['0341234567'], ' Nom@Gmail.com ')).toBeNull();
  });
  it('maps the server errors to French', () => {
    expect(messageGroupe({ message: 'PUDI_NUMERO_INVALIDE' })).toBe('Numéro non reconnu : écrivez-le comme 034 12 345 67 ou +33 6 12 34 56 78');
    expect(messageGroupe({ message: 'PUDI_NUMERO_DEJA_DANS_LE_GROUPE' })).toBe('Ce numéro est déjà dans la liste de ce groupe.');
    expect(messageGroupe({ message: 'PUDI_RESPONSABLE_REQUIS' })).toBe("Vous n'êtes pas responsable de ce groupe.");
    expect(messageGroupe({ message: 'PUDI_EMAIL_INVALIDE' })).toContain('nom@gmail.com');
    expect(messageGroupe(new Error('timeout'))).toBe('Le réseau ne répond pas. Réessayez.');
    expect(messageGroupe(new Error('boom'))).toBe('Une erreur est survenue. Réessayez.');
  });
});
