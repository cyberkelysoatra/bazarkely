import { describe, expect, it } from 'vitest';
import { modulesDesIds, modulesDuCompte } from './modulesCompte';

const AVANT = new Date('2026-11-03T12:00:00+03:00');
const APRES = new Date('2027-01-28T00:00:01+03:00');
const ids = (l: { id: string }[] | null) => (l ? l.map((m) => m.id) : l);

describe('modulesDuCompte (VC-45)', () => {
  it('admin: the five host modules, Validation excluded, host order', () => {
    const l = modulesDuCompte({ role: 'admin', preferences: { modules: ['validation'] } }, AVANT);
    expect(ids(l)).toEqual(['bazarkely', 'construction', 'gestion-eau', 'navy-ay', 'pudi']);
    expect(l!.map((m) => m.adresse)).toEqual(['/dashboard', '/construction/dashboard', '/gestion-eau', '/navy', '/pudi']);
  });

  it("list exactly ['validation']: empty list (no NAVY ay, no PUDi)", () => {
    expect(modulesDuCompte({ role: 'user', preferences: { modules: ['validation'] } }, AVANT)).toEqual([]);
  });

  it("list ['validation', 'bazarkely']: BazarKELY, NAVY ay and PUDi", () => {
    const l = modulesDuCompte({ role: 'user', preferences: { modules: ['validation', 'bazarkely'] } }, AVANT);
    expect(ids(l)).toEqual(['bazarkely', 'navy-ay', 'pudi']);
  });

  it('Gestion Eau and Construction only when in the list; missing list = NAVY ay and PUDi', () => {
    expect(ids(modulesDuCompte({ role: 'user', preferences: { modules: ['gestion-eau', 'construction'] } }, AVANT))).toEqual([
      'construction',
      'gestion-eau',
      'navy-ay',
      'pudi'
    ]);
    expect(ids(modulesDuCompte({ role: null, preferences: null }, AVANT))).toEqual(['navy-ay', 'pudi']);
  });

  it('moduleOrder respected, unknown or absent ids ignored, new modules at the end', () => {
    const l = modulesDuCompte(
      { role: 'admin', preferences: { moduleOrder: ['pudi', 'validation', 'navy-ay', 'inconnu', 'pudi', 'bazarkely'] } },
      AVANT
    );
    expect(ids(l)).toEqual(['pudi', 'navy-ay', 'bazarkely', 'construction', 'gestion-eau']);
  });

  it('PUDi no longer shown after 28/01/2027', () => {
    expect(ids(modulesDuCompte({ role: 'admin', preferences: {} }, APRES))).toEqual(['bazarkely', 'construction', 'gestion-eau', 'navy-ay']);
    expect(ids(modulesDuCompte({ role: 'user', preferences: { modules: ['bazarkely'] } }, APRES))).toEqual(['bazarkely', 'navy-ay']);
  });

  it('unknown row: null, never a refusal', () => {
    expect(modulesDuCompte(null)).toBeNull();
    expect(modulesDuCompte(undefined)).toBeNull();
  });
});

describe('modulesDesIds (list kept on the phone)', () => {
  it('keeps the stored order, drops unknown ids and doubles', () => {
    expect(ids(modulesDesIds(['navy-ay', 'x', 'bazarkely', 'navy-ay'], AVANT))).toEqual(['navy-ay', 'bazarkely']);
  });
  it('drops PUDi after its date; not an array = unknown', () => {
    expect(ids(modulesDesIds(['pudi', 'navy-ay'], APRES))).toEqual(['navy-ay']);
    expect(modulesDesIds(undefined)).toBeNull();
  });
});
