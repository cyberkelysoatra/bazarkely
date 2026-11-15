import { describe, it, expect, vi } from 'vitest';
import { cacheBustedUrl, chunkReloadKey, isChunkLoadError, reloadOnceAfterChunkError } from '../chunkReload';

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe('chunkReload (MICRO-CC-01)', () => {
  it('reloads ONCE with a cache-busting query, then lets the error screen show', () => {
    const storage = memoryStorage();
    const replace = vi.fn();
    const deps = { storage, replace, href: 'https://1sakely.org/navy?x=1#h', version: '9.9.9', now: 123 };
    expect(reloadOnceAfterChunkError(deps)).toBe(true);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('https://1sakely.org/navy?x=1&_r=123#h');
    expect(storage.m.get(chunkReloadKey('9.9.9'))).toBe('123');
    // Second failure after the reload (same tab, same version): no reload, no loop.
    expect(reloadOnceAfterChunkError({ ...deps, now: 456 })).toBe(false);
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('a new app version gets its own single reload', () => {
    const storage = memoryStorage();
    const replace = vi.fn();
    expect(reloadOnceAfterChunkError({ storage, replace, href: 'https://a.b/', version: '1.0.0' })).toBe(true);
    expect(reloadOnceAfterChunkError({ storage, replace, href: 'https://a.b/', version: '1.0.1' })).toBe(true);
    expect(replace).toHaveBeenCalledTimes(2);
  });

  it('never reloads when sessionStorage is unusable', () => {
    const replace = vi.fn();
    expect(reloadOnceAfterChunkError({ storage: null, replace, href: 'https://a.b/' })).toBe(false);
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => undefined };
    expect(reloadOnceAfterChunkError({ storage: throwing, replace, href: 'https://a.b/' })).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });

  it('replaces a previous _r value', () => {
    expect(cacheBustedUrl('https://a.b/pudi/?_r=1', 2)).toBe('https://a.b/pudi/?_r=2');
  });

  it('recognises browser chunk errors only', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://a.b/assets/x.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    expect(isChunkLoadError(new Error('Unable to preload CSS for /assets/a.css'))).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
  });
});
