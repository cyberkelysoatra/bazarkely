import { describe, expect, it } from 'vitest';
import {
  SEUIL_MAINTIEN_MS,
  SEUIL_VERROU_PX,
  TEXTES_DICTEE,
  adresseIntent,
  ajouterDictee,
  doitVerrouiller,
  gesteAuRelachement,
  messageBloque,
  messageSansMoteur,
  navigateurDe,
  texteEntendu
} from './dictee';

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A146P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const WHATSAPP = 'Mozilla/5.0 (Linux; Android 14; SM-A146P; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36 WhatsApp/2.24.21.80';
const BUREAU = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

describe('append rule (VC-13: after what is written, never in its place)', () => {
  it('empty field: the dictated text alone', () => {
    expect(ajouterDictee('', 'trop court', 2000)).toBe('trop court');
  });
  it('field with text: one space, then the dictated text', () => {
    expect(ajouterDictee('Délai', 'trop court', 2000)).toBe('Délai trop court');
    expect(ajouterDictee('Délai ', 'trop court', 2000)).toBe('Délai trop court');
  });
  it('nothing heard yet: the field is unchanged', () => {
    expect(ajouterDictee('Délai', '', 2000)).toBe('Délai');
    expect(ajouterDictee('Délai', '   ', 2000)).toBe('Délai');
  });
  it('limit of 2 000 characters applies to dictation too', () => {
    const avant = 'a'.repeat(1995);
    const r = ajouterDictee(avant, 'trop court', 2000);
    expect(r.length).toBe(2000);
    expect(r).toBe(`${avant} trop`);
    expect(ajouterDictee('a'.repeat(2000), 'mot', 2000)).toBe('a'.repeat(2000));
  });
  it('final and interim results are read in order', () => {
    expect(texteEntendu([[{ transcript: 'trop' }], [{ transcript: ' court' }]])).toBe('trop court');
    expect(texteEntendu([])).toBe('');
  });
});

describe('gestures (tap, hold, slide up to lock)', () => {
  it('thresholds', () => {
    expect(SEUIL_MAINTIEN_MS).toBe(300);
    expect(SEUIL_VERROU_PX).toBe(40);
  });
  it('a short press is a tap', () => {
    expect(gesteAuRelachement(120, 0)).toBe('toucher');
    expect(gesteAuRelachement(299, 10)).toBe('toucher');
  });
  it('a press held 300 ms or more is a hold', () => {
    expect(gesteAuRelachement(300, 0)).toBe('maintien');
    expect(gesteAuRelachement(2500, 40)).toBe('maintien');
  });
  it('sliding up more than 40 px locks', () => {
    expect(doitVerrouiller(40)).toBe(false);
    expect(doitVerrouiller(41)).toBe(true);
    expect(gesteAuRelachement(900, 60)).toBe('verrou');
    // Sliding down never locks.
    expect(doitVerrouiller(-80)).toBe(false);
  });
});

describe('browser detection and messages', () => {
  it('Chrome on Android, WhatsApp built-in browser, computer', () => {
    expect(navigateurDe(CHROME_ANDROID)).toBe('chrome_android');
    expect(navigateurDe(WHATSAPP)).toBe('interne');
    expect(navigateurDe(BUREAU)).toBe('bureau');
    expect(navigateurDe('Mozilla/5.0 (Linux; Android 14) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36')).toBe('autre');
    expect(navigateurDe('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')).toBe('autre');
  });
  it('blocked microphone: the way to allow it, adapted to the browser', () => {
    expect(messageBloque('chrome_android')).toEqual({ type: 'bloque', texte: `Le micro est bloqué. ${TEXTES_DICTEE.cheminChrome}`, chrome: false });
    expect(messageBloque('chrome_android').texte).toContain('cadenas à gauche de l');
    expect(messageBloque('bureau').texte).toContain('cliquez sur le cadenas');
    expect(messageBloque('interne')).toEqual({ type: 'bloque', texte: 'Le micro est bloqué. Ouvrez 1saKELY dans Chrome.', chrome: true });
    expect(messageSansMoteur().chrome).toBe(true);
    expect(messageSansMoteur().texte).toMatch(/Ouvrez 1saKELY dans Chrome\.$/);
  });
  it('intent address of « Ouvrir dans Chrome »', () => {
    expect(adresseIntent('https://1sakely.org/validation/q/abc/2#x')).toBe(
      'intent://1sakely.org/validation/q/abc/2#Intent;scheme=https;package=com.android.chrome;end'
    );
    expect(adresseIntent('https://1sakely.org/validation/recu/abc?x=1')).toBe(
      'intent://1sakely.org/validation/recu/abc?x=1#Intent;scheme=https;package=com.android.chrome;end'
    );
  });
  it('no em dash nor en dash in the texts', () => {
    for (const t of Object.values(TEXTES_DICTEE)) expect(t).not.toMatch(/[\u2013\u2014]/);
  });
});
