import { describe, expect, it } from 'vitest';
import { adresseChrome, decoderBrouillon, encoderBrouillon, estNavigateurInterne } from './navigateurInterne';

const B = { priorites: ['T3', 'A4', 'P1'], urgents: ['N3', 'W1'], manquant: 'jamais dans l’adresse' };

describe('PUDI-CC-16.2 built-in browsers', () => {
  it('detects the messaging apps, not Chrome', () => {
    expect(estNavigateurInterne('Mozilla/5.0 (Linux; Android 13; SM-A135F Build/TP1A; wv) AppleWebKit/537.36 Chrome/118 Mobile Safari/537.36 WhatsApp/2.23')).toBe(true);
    expect(estNavigateurInterne('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 [FBAN/FBIOS;FBAV/440.0]')).toBe(true);
    expect(estNavigateurInterne('Mozilla/5.0 (Linux; Android 12) Instagram 300.0')).toBe(true);
    expect(estNavigateurInterne('Mozilla/5.0 (Linux; Android 11; wv) Line/13.1.0')).toBe(true);
    expect(estNavigateurInterne('Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 Chrome/118 Mobile Safari/537.36')).toBe(false);
    expect(estNavigateurInterne('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1')).toBe(false);
  });
  it('draft in the address: ids only, round trip', () => {
    expect(encoderBrouillon(B)).toBe('T3.A4.P1-N3.W1');
    expect(decoderBrouillon('T3.A4.P1-N3.W1')).toEqual({ priorites: ['T3', 'A4', 'P1'], urgents: ['N3', 'W1'], manquant: '' });
    expect(decoderBrouillon('T3.T3.A4.P1.T1')).toEqual({ priorites: ['T3', 'A4', 'P1'], urgents: [], manquant: '' });
    expect(decoderBrouillon('<script>')).toBeNull();
    expect(decoderBrouillon(null)).toBeNull();
  });
  it('Chrome address keeps the channel and adds the draft', () => {
    expect(adresseChrome('https://1sakely.org/pudi/envoyer?c=old#x', B, 'gihtnb', true)).toBe(
      'intent://1sakely.org/pudi/envoyer?c=gihtnb&b=T3.A4.P1-N3.W1#Intent;scheme=https;package=com.android.chrome;end'
    );
    expect(adresseChrome('https://1sakely.org/pudi/envoyer', B, null, false)).toBe('https://1sakely.org/pudi/envoyer?b=T3.A4.P1-N3.W1');
  });
});
