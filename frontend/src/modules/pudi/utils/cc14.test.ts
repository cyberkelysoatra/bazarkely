import { describe, expect, it } from 'vitest';
import { tempsRestant, texteRestant } from './format';

const H = 3600000;
const fin = Date.parse('2026-10-27T05:00:00Z');
const texte = (ms: number) => texteRestant(tempsRestant(fin, fin - ms));

describe('PUDI-CC-14.1 short countdown', () => {
  it('shows days and hours under 3 days', () => {
    expect(texte((2 * 24 + 15) * H + 59000)).toBe('Plus que 2 j 15 h pour voter');
    expect(texte(5 * H + 20 * 60000)).toBe('Plus que 5 h pour voter');
  });
  it('says less than one hour at the end', () => {
    expect(texte(50 * 60000)).toBe('Moins d’une heure pour voter');
    expect(texte(1000)).toBe('Moins d’une heure pour voter');
  });
  it('shows nothing from 3 days, nor once closed', () => {
    expect(texte(3 * 24 * H)).toBeNull();
    expect(texte(0)).toBeNull();
    expect(texte(-H)).toBeNull();
  });
});
