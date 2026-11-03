import { describe, expect, it } from 'vitest';
import { PLUS_TARD_MS, cartesRecu, plusTardActif, type EtatTelephone } from './telephone';

const JOUR = 24 * 3600 * 1000;
const T0 = Date.parse('2026-11-03T10:00:00Z');

const base: EtatTelephone = {
  installee: false,
  interne: false,
  android: true,
  chromeAndroid: true,
  invitation: true,
  attenteFinie: true,
  plusTardAt: null,
  installationRepondue: false,
  notificationsPossibles: true,
  permission: 'default',
  notificationsRepondues: false,
  pilote: 'non'
};

describe('« Plus tard » rule: 30 days', () => {
  it('hidden during 30 days, shown again after', () => {
    expect(PLUS_TARD_MS).toBe(30 * JOUR);
    expect(plusTardActif(null, T0)).toBe(false);
    expect(plusTardActif(T0, T0)).toBe(true);
    expect(plusTardActif(T0, T0 + 29 * JOUR)).toBe(true);
    expect(plusTardActif(T0, T0 + 30 * JOUR)).toBe(false);
    expect(plusTardActif(T0, T0 + 45 * JOUR)).toBe(false);
  });
  it('installation card hidden by an earlier « Plus tard », then the question shows on its own', () => {
    expect(cartesRecu({ ...base, plusTardAt: T0 - 2 * JOUR }, T0)).toEqual({ installation: null, notifications: true });
    expect(cartesRecu({ ...base, plusTardAt: T0 - 31 * JOUR }, T0)).toEqual({ installation: 'installer', notifications: false });
  });
});

describe('cards of the receipt (VC-42, decision of 03/11/2026)', () => {
  it('installable: the installation card first, the question after its answer', () => {
    expect(cartesRecu(base, T0)).toEqual({ installation: 'installer', notifications: false });
    expect(cartesRecu({ ...base, installationRepondue: true }, T0)).toEqual({ installation: null, notifications: true });
  });
  it('already installed (standalone): no installation card, the question on its own', () => {
    expect(cartesRecu({ ...base, installee: true, invitation: false }, T0)).toEqual({ installation: null, notifications: true });
  });
  it('WhatsApp built-in browser: « Ouvrir dans Chrome », never the question', () => {
    expect(cartesRecu({ ...base, interne: true, invitation: false }, T0)).toEqual({ installation: 'chrome', notifications: false });
    expect(cartesRecu({ ...base, interne: true, invitation: false, installationRepondue: true }, T0).notifications).toBe(false);
  });
  it('Android browser that never offered to install within 3 s: « Ouvrir dans Chrome »', () => {
    const e = { ...base, chromeAndroid: false, invitation: false };
    expect(cartesRecu({ ...e, attenteFinie: false }, T0)).toEqual({ installation: null, notifications: false });
    expect(cartesRecu(e, T0)).toEqual({ installation: 'chrome', notifications: false });
  });
  it('Chrome or computer without any offer: no installation card, the question after 3 s', () => {
    const e = { ...base, invitation: false };
    expect(cartesRecu({ ...e, attenteFinie: false }, T0).notifications).toBe(false);
    expect(cartesRecu(e, T0)).toEqual({ installation: null, notifications: true });
    expect(cartesRecu({ ...e, android: false, chromeAndroid: false }, T0)).toEqual({ installation: null, notifications: true });
  });
  it('the question: once per device, never refused, never without Notification / PushManager, never Joël', () => {
    const e = { ...base, installee: true, invitation: false };
    expect(cartesRecu({ ...e, notificationsRepondues: true }, T0).notifications).toBe(false);
    expect(cartesRecu({ ...e, permission: 'denied' }, T0).notifications).toBe(false);
    expect(cartesRecu({ ...e, permission: 'granted' }, T0).notifications).toBe(true);
    expect(cartesRecu({ ...e, notificationsPossibles: false }, T0).notifications).toBe(false);
    expect(cartesRecu({ ...e, pilote: 'oui' }, T0).notifications).toBe(false);
    expect(cartesRecu({ ...e, pilote: null }, T0).notifications).toBe(false);
    expect(cartesRecu({ ...e, pilote: 'erreur' }, T0).notifications).toBe(false);
  });
});
