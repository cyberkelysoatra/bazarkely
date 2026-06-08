/**
 * Phase 4 — helpers d'invitation par LIEN WhatsApp (jeton).
 * On vérifie la logique pure du message/URL wa.me et de la normalisation du numéro :
 *  - le message porte le LIEN `/i/<token>` (cœur de l'invitation, aperçu image),
 *  - il N'IMPOSE PAS d'adresse Google (l'octroi se fait par jeton, compte au choix),
 *  - le numéro est normalisé au format international malgache attendu par wa.me.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeWhatsappNumber,
  buildWhatsappInviteMessage,
  buildWhatsappInviteUrl,
  INVITATION_BASE_URL,
} from '../services/eauInvitationService';

const TOKEN = 'AbCd1234EfGh5678IjKl90';

describe('normalizeWhatsappNumber — format international malgache', () => {
  it('« 032 89 95 681 » (avec espaces) → 261328995681', () => {
    expect(normalizeWhatsappNumber('032 89 95 681')).toBe('261328995681');
  });
  it('« 0328995681 » (local collé) → 261328995681', () => {
    expect(normalizeWhatsappNumber('0328995681')).toBe('261328995681');
  });
  it('déjà international « 261328995681 » → conservé', () => {
    expect(normalizeWhatsappNumber('261328995681')).toBe('261328995681');
  });
  it('vide → chaîne vide', () => {
    expect(normalizeWhatsappNumber('')).toBe('');
    expect(normalizeWhatsappNumber(null)).toBe('');
  });
});

describe('buildWhatsappInviteMessage — lien jeton, sans adresse imposée', () => {
  it('contient le lien /i/<token> et le nom du module', () => {
    const msg = buildWhatsappInviteMessage({ nom: 'Rakoto', token: TOKEN });
    expect(msg).toContain(`/i/${TOKEN}`);
    expect(msg).toContain('Gestion Eau AHUVI');
    expect(msg).toContain('Rakoto');
  });
  it("n'impose AUCUNE adresse Google précise (contrairement au canal email)", () => {
    const msg = buildWhatsappInviteMessage({ nom: null, token: TOKEN });
    expect(msg).not.toMatch(/CETTE adresse Google/i);
    expect(msg).not.toMatch(/@gmail/i);
    expect(msg.toLowerCase()).toContain('compte google de votre choix');
  });
});

describe('buildWhatsappInviteUrl — wa.me décodé contient le lien', () => {
  it('cible wa.me/261328995681 et le texte décodé contient /i/<token>', () => {
    const url = buildWhatsappInviteUrl({ nom: 'Rakoto', phone: '032 89 95 681', token: TOKEN });
    expect(url.startsWith('https://wa.me/261328995681?text=')).toBe(true);
    const text = decodeURIComponent(url.split('?text=')[1]);
    expect(text).toContain(`/i/${TOKEN}`);
  });
});

describe('INVITATION_BASE_URL — base de prod', () => {
  it('pointe sur https://1sakely.org (lien prod = https://1sakely.org/i/<token>)', () => {
    expect(INVITATION_BASE_URL).toBe('https://1sakely.org');
  });
});
