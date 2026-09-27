import { describe, expect, it } from 'vitest';
import { cacheNameFor, isValidVersion, mapCachesNewestFirst, staleMapCaches } from './navyMapFile';

describe('navyMapFile rules', () => {
  it('accepts only a well-formed map-version.json', () => {
    expect(isValidVersion({ file: 'nosybe-20260927.pmtiles', date: '2026-09-27', bytes: 1529843 })).toBe(true);
    expect(isValidVersion({ file: '../evil.pmtiles', date: '2026-09-27', bytes: 1 })).toBe(false);
    expect(isValidVersion({ file: 'nosybe-20260927.pmtiles', date: 'hier', bytes: 1 })).toBe(false);
    expect(isValidVersion('<!doctype html>')).toBe(false);
    expect(isValidVersion(null)).toBe(false);
  });

  it('names one cache per map date', () => {
    expect(cacheNameFor({ date: '2026-09-27' })).toBe('navy-map-2026-09-27');
  });

  it('replaces the file when the date changes (older map caches are stale, others untouched)', () => {
    const names = ['workbox-precache-v2', 'navy-map-2026-09-20', 'navy-map-2026-09-27', 'navy-osm-tiles-v1', 'api-cache'];
    expect(staleMapCaches(names, 'navy-map-2026-09-27')).toEqual(['navy-map-2026-09-20']);
    expect(staleMapCaches(names, 'navy-map-2026-10-15')).toEqual(['navy-map-2026-09-20', 'navy-map-2026-09-27']);
  });

  it('offline: tries the kept maps newest first', () => {
    expect(mapCachesNewestFirst(['navy-map-2026-09-20', 'api-cache', 'navy-map-2026-10-01', 'navy-map-x'])).toEqual([
      'navy-map-2026-10-01',
      'navy-map-2026-09-20',
    ]);
    expect(mapCachesNewestFirst([])).toEqual([]);
  });
});
