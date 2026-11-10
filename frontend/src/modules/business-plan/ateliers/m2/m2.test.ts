import { describe, expect, it } from 'vitest';
import { planVide } from '../../etat/vide';
import { planExemple } from '../../data/exemple';
import { BLOCS, aujourdhuiMadagascar, jourFr } from './blocs';
import { progression } from './progression';

describe('module 2', () => {
  it('has the 9 blocks in filling order', () => {
    expect(BLOCS.map((b) => b.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(BLOCS.map((b) => b.cle)).size).toBe(9);
  });

  it('progress is the share of the 9 blocks filled', () => {
    const p = planVide();
    expect(progression(p)).toBe(0);
    p.m2.segments = 'Hôtels';
    p.m2.couts = 'Fruits';
    p.m2.versionDu = '2026-11-11';
    expect(progression(p)).toBe(22);
    expect(progression(planExemple())).toBe(100);
  });

  it('example blocks match the workbook examples', () => {
    const e = planExemple();
    for (const b of BLOCS) expect(e.m2[b.cle]).toBe(b.exemple);
  });

  it('dates in Madagascar time', () => {
    // 22:30 UTC on 10 November is already 11 November in Madagascar (UTC+3).
    expect(aujourdhuiMadagascar(Date.UTC(2026, 10, 10, 22, 30))).toBe('2026-11-11');
    expect(aujourdhuiMadagascar(Date.UTC(2026, 10, 10, 20, 59))).toBe('2026-11-10');
    expect(jourFr('2026-11-11')).toBe('11 novembre 2026');
    expect(jourFr('')).toBe('');
  });

  it('texts have no dash nor middle dot', () => {
    expect(JSON.stringify(BLOCS) + JSON.stringify(planExemple().m2)).not.toMatch(/[\u2014\u2013\u00b7]/);
  });
});
