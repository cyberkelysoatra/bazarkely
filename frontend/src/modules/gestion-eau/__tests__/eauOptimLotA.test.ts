/**
 * LOT A/B — helpers purs ajoutés/corrigés par le chantier d'optimisation :
 *  - A-2 : clés d'idempotence des alertes en jour/mois LOCAL (pas UTC).
 *  - B-2 : id de bilan DÉTERMINISTE (même clé → même UUID) pour un upsert idempotent.
 */
import { describe, it, expect } from 'vitest';
import { dayKey, monthKey } from '../utils/alertes';
import { deterministicUuid } from '../utils/id';

describe('A-2 — clés d’alerte en jour/mois LOCAL (fuseau Madagascar UTC+3)', () => {
  it('dayKey reflète le jour LOCAL d’un horodatage à 01:00 locale', () => {
    const d = new Date(2026, 5, 11, 1, 0, 0); // 11 juin 2026, 01:00 LOCAL
    expect(dayKey(d)).toBe('2026-06-11');
  });

  it('monthKey reflète le mois LOCAL', () => {
    const d = new Date(2026, 0, 1, 1, 30, 0); // 1ᵉʳ janvier 2026, 01:30 LOCAL
    expect(monthKey(d)).toBe('2026-01');
  });

  it('format de chaîne inchangé (YYYY-MM-DD / YYYY-MM, zéro-paddé)', () => {
    const d = new Date(2026, 8, 5, 12, 0, 0); // 5 septembre 2026
    expect(dayKey(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dayKey(d)).toBe('2026-09-05');
    expect(monthKey(d)).toBe('2026-09');
  });
});

describe('B-2 — deterministicUuid (id de bilan stable pour upsert idempotent)', () => {
  it('même clé → même UUID (idempotence)', () => {
    expect(deterministicUuid('bilan:1700000000000')).toBe(deterministicUuid('bilan:1700000000000'));
  });

  it('clés différentes → UUID différents', () => {
    expect(deterministicUuid('bilan:1700000000000')).not.toBe(deterministicUuid('bilan:1700000000001'));
  });

  it('forme UUID 8-4-4-4-12 hex (acceptée par le type uuid Postgres)', () => {
    expect(deterministicUuid('x')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
