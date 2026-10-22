// PUDI-CC-09: notice of an automatic masking (links, deadline), unseen restorations, sector pictures,
// fallback closing time.
import { describe, expect, it } from 'vitest';
import donneesBrutes from '../data/pudi-donnees.json';
import type { PudiDonnees } from '../data/types';
import { fr } from '../i18n/fr';
import { messageErreur } from './erreurs';
import { CLOTURE_PAR_DEFAUT } from './format';
import {
  EMAIL_GIHTNB,
  dateGel,
  lienCourrielMasquage,
  lienWhatsAppMasquage,
  reclamationsOuvertes,
  retablissementsNouveaux
} from './masquage';

const D = donneesBrutes as unknown as PudiDonnees;
const GEL = '2026-10-27T15:00:00+00:00';

describe('notice texts', () => {
  it('deadline and frozen lists, Madagascar time', () => {
    expect(dateGel(GEL)).toBe('mardi 27/10/2026 à 18 h');
    expect(fr.masquage.texte(dateGel(GEL))).toBe(
      "Votre vote a été remplacé par un vote plus récent attribué à la même personne. Si c'est une erreur, vous pouvez réclamer jusqu'au mardi 27/10/2026 à 18 h."
    );
    expect(fr.groupe.erreurs.LISTES_FIGEES).toBe('Les listes sont figées depuis le mardi 27/10/2026 à 18 h.');
    expect(fr.masquage.courriel).toBe('Écrire au GIHTNB');
    expect(fr.masquage.whatsapp).toBe('Contacter le responsable du groupe sur WhatsApp');
  });
  it('the words are « masqué », never « annulé »', () => {
    const tout = JSON.stringify(fr.masquage) + fr.erreurs.VOTE_MASQUE + fr.groupe.aideWhatsApp;
    expect(tout).not.toMatch(/annul/i);
  });
  it('claims open until the freeze', () => {
    expect(reclamationsOuvertes(GEL, Date.parse('2026-10-27T14:59:59Z'))).toBe(true);
    expect(reclamationsOuvertes(GEL, Date.parse('2026-10-27T15:00:00Z'))).toBe(false);
  });
  it('VOTE_MASQUE is a known server error', () => {
    expect(messageErreur({ erreur: 'PUDI_VOTE_MASQUE' }).code).toBe('VOTE_MASQUE');
  });
});

describe('claim links', () => {
  it('mailto to the GIHTNB with reference and Gmail, no phone number', () => {
    const l = lienCourrielMasquage('M-1A2B3C', 'pers@gmail.com');
    expect(EMAIL_GIHTNB).toBe('info.gihtnb@gmail.com');
    expect(l.startsWith('mailto:info.gihtnb@gmail.com?subject=')).toBe(true);
    const u = new URL(l);
    expect(u.searchParams.get('subject')).toBe('Réclamation PUDi, masquage M-1A2B3C');
    expect(u.searchParams.get('body')).toBe(
      "Bonjour, mon vote a été masqué (référence M-1A2B3C). Il s'agit d'une erreur : ... Adresse Gmail de mon compte de vote : pers@gmail.com. Merci."
    );
  });
  it('wa.me to the manager', () => {
    const l = lienWhatsAppMasquage('261349900004', 'M-1A2B3C');
    expect(l.startsWith('https://wa.me/261349900004?text=')).toBe(true);
    expect(new URL(l).searchParams.get('text')).toBe(
      'Bonjour, mon vote PUDi a été masqué (référence M-1A2B3C) à cause de la liste du groupe. Pouvez-vous vérifier la ligne ? Merci.'
    );
  });
});

describe('unseen restorations', () => {
  const liste = [
    { id: 'M-000001', retabli_at: null },
    { id: 'M-000002', retabli_at: '2026-10-23T10:00:00Z' },
    { id: 'M-000003', retabli_at: '2026-10-23T12:00:00Z' },
    { id: 'M-000004', retabli_at: '2026-10-23T11:00:00Z' }
  ];
  it('the most recent ones beyond the count already seen', () => {
    expect([...retablissementsNouveaux(liste, 0)].sort()).toEqual(['M-000002', 'M-000003', 'M-000004']);
    expect([...retablissementsNouveaux(liste, 2)]).toEqual(['M-000003']);
    expect(retablissementsNouveaux(liste, 3).size).toBe(0);
    expect(retablissementsNouveaux(liste, 9).size).toBe(0);
  });
});

describe('sector pictures and closing fallback', () => {
  const s = (id: string) => D.secteurs.find((x) => x.id === id)!;
  it('Transport and Sécurité have their own picture, Énergie keeps the solar plant', () => {
    expect(s('TRA').images).toEqual(['transport.webp']);
    expect(s('SEC').images).toEqual(['securite.webp']);
    expect(s('ENE').images).toEqual(['energie-transport-securite.webp']);
  });
  it('fallback closing = Tuesday 27/10 at 8 h', () => {
    expect(CLOTURE_PAR_DEFAUT).toBe('2026-10-27T08:00:00+03:00');
  });
});
