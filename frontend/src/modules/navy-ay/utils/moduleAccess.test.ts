import { describe, it, expect } from 'vitest';
import {
  resolveAccessibleModules,
  pickStartModule,
  mergePreferences,
  combinePatches,
  hasResolvedModules,
} from './moduleAccess';

describe('resolveAccessibleModules (A1)', () => {
  it('new account without preferences.modules → navy-ay only', () => {
    expect(resolveAccessibleModules({ role: 'user', preferences: { theme: 'system' } }, null, null)).toEqual([
      'navy-ay',
    ]);
  });

  it('migrated existing account → bazarkely and navy-ay', () => {
    const res = resolveAccessibleModules({ role: 'user', preferences: { modules: ['bazarkely'] } }, null, null);
    expect(res).toContain('bazarkely');
    expect(res).toContain('navy-ay');
    expect(res).not.toContain('gestion-eau');
    expect(res).not.toContain('construction');
  });

  it('admin → all 4 modules', () => {
    expect(resolveAccessibleModules({ role: 'admin', preferences: {} }, false, false)).toEqual([
      'bazarkely',
      'construction',
      'gestion-eau',
      'navy-ay',
    ]);
  });

  it('Eau present only when confirmed (or remembered and not refused)', () => {
    const u = { role: 'user', preferences: { modules: ['bazarkely'] } };
    expect(resolveAccessibleModules(u, null, null)).not.toContain('gestion-eau');
    expect(resolveAccessibleModules(u, true, null)).toContain('gestion-eau');
    const remembered = { role: 'user', preferences: { modules: ['bazarkely', 'gestion-eau'] } };
    expect(resolveAccessibleModules(remembered, null, null)).toContain('gestion-eau');
    expect(resolveAccessibleModules(remembered, false, null)).not.toContain('gestion-eau');
  });

  it('Construction follows hasConstructionAccess', () => {
    const u = { role: 'user', preferences: { modules: [] } };
    expect(resolveAccessibleModules(u, null, true)).toContain('construction');
    expect(resolveAccessibleModules(u, null, false)).not.toContain('construction');
  });

  it('no user → nothing', () => {
    expect(resolveAccessibleModules(null, null, null)).toEqual([]);
  });
});

describe('pickStartModule (A2)', () => {
  const all = ['bazarkely', 'construction', 'gestion-eau', 'navy-ay'];

  it('takes the most recent of local and account', () => {
    const local = { id: 'bazarkely', at: '2026-09-01T10:00:00.000Z' };
    const account = { id: 'navy-ay', at: '2026-09-02T10:00:00.000Z' };
    expect(pickStartModule(local, account, all)).toBe('navy-ay');
    expect(pickStartModule({ ...local, at: '2026-09-03T10:00:00.000Z' }, account, all)).toBe('bazarkely');
  });

  it('uses whichever exists', () => {
    expect(pickStartModule(null, { id: 'gestion-eau', at: '2026-09-02T10:00:00.000Z' }, all)).toBe('gestion-eau');
    expect(pickStartModule({ id: 'navy-ay', at: '' }, null, all)).toBe('navy-ay');
  });

  it('ignores a module that is not accessible', () => {
    const local = { id: 'gestion-eau', at: '2026-09-05T10:00:00.000Z' };
    const account = { id: 'navy-ay', at: '2026-09-01T10:00:00.000Z' };
    expect(pickStartModule(local, account, ['bazarkely', 'navy-ay'])).toBe('navy-ay');
    expect(pickStartModule(local, null, ['bazarkely', 'navy-ay'])).toBe('bazarkely');
  });

  it('falls back to bazarkely, then navy-ay', () => {
    expect(pickStartModule(null, null, ['bazarkely', 'navy-ay'])).toBe('bazarkely');
    expect(pickStartModule(null, null, ['navy-ay'])).toBe('navy-ay');
  });
});

describe('mergePreferences (A3)', () => {
  const base = { theme: 'system', moduleOrder: ['navy-ay', 'bazarkely'], someUnknownKey: { a: 1 }, modules: ['bazarkely'] };

  it('never loses moduleOrder nor unknown keys', () => {
    const merged = mergePreferences(
      base,
      { addModules: ['gestion-eau'], removeModules: ['construction'], lastModule: { id: 'navy-ay', at: '2026-09-24T00:00:00.000Z' } },
      true
    );
    expect(merged.moduleOrder).toEqual(['navy-ay', 'bazarkely']);
    expect(merged.someUnknownKey).toEqual({ a: 1 });
    expect(merged.theme).toBe('system');
    expect(merged.modules).toEqual(['bazarkely', 'gestion-eau']);
    expect(merged.lastModule).toEqual({ id: 'navy-ay', at: '2026-09-24T00:00:00.000Z' });
  });

  it('does not mutate its input and is idempotent', () => {
    const patch = { addModules: ['bazarkely'] };
    const once = mergePreferences(base, patch, true);
    const twice = mergePreferences(once, patch, true);
    expect(twice).toEqual(once);
    expect(base.modules).toEqual(['bazarkely']);
  });

  it('keeps the most recent lastModule', () => {
    const withLast = { ...base, lastModule: { id: 'bazarkely', at: '2026-09-25T00:00:00.000Z' } };
    const merged = mergePreferences(withLast, { lastModule: { id: 'navy-ay', at: '2026-09-24T00:00:00.000Z' } }, true);
    expect(merged.lastModule.id).toBe('bazarkely');
  });

  it('local unresolved list stays unresolved; server unresolved list is initialised', () => {
    const local = mergePreferences({ theme: 'system' }, { addModules: ['gestion-eau'] }, false);
    expect(hasResolvedModules(local)).toBe(false);
    const server = mergePreferences({ theme: 'system' }, { initModules: ['navy-ay'], addModules: ['gestion-eau'] }, true);
    expect(server.modules).toEqual(['navy-ay', 'gestion-eau']);
  });

  it('combinePatches: later add/remove wins, lastModule most recent', () => {
    const p = combinePatches(
      { addModules: ['gestion-eau'], lastModule: { id: 'a', at: '2026-09-02T00:00:00.000Z' } },
      { removeModules: ['gestion-eau'], lastModule: { id: 'b', at: '2026-09-01T00:00:00.000Z' } }
    );
    expect(p.addModules).toBeUndefined();
    expect(p.removeModules).toEqual(['gestion-eau']);
    expect(p.lastModule?.id).toBe('a');
  });
});
