import { afterEach, describe, expect, it, vi } from 'vitest';
import { RangeOrWholeSource } from './navyMapFile';

const FILE = new Uint8Array(Array.from({ length: 64 }, (_, i) => i)).buffer;

function rangeOf(init?: RequestInit): [number, number] {
  const h = (init?.headers ?? {}) as Record<string, string>;
  const m = /bytes=(\d+)-(\d+)/.exec(h.range ?? '');
  return m ? [Number(m[1]), Number(m[2])] : [0, FILE.byteLength - 1];
}

describe('RangeOrWholeSource', () => {
  afterEach(() => vi.restoreAllMocks());

  it('server ignoring ranges (Cloudflare Pages, 200): one download, every slice from it, kept once', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(FILE.slice(0), { status: 200 }));
    const onWhole = vi.fn();
    const onRanges = vi.fn();
    const src = new RangeOrWholeSource('https://x/nosybe.pmtiles', onWhole, onRanges);
    const a = await src.getBytes(0, 16);
    const b = await src.getBytes(40, 8);
    expect([...new Uint8Array(a.data)]).toEqual([...Array(16).keys()]);
    expect([...new Uint8Array(b.data)]).toEqual([40, 41, 42, 43, 44, 45, 46, 47]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(onWhole).toHaveBeenCalledTimes(1);
    expect(onRanges).not.toHaveBeenCalled();
  });

  it('server honouring ranges (206): reads slices, asks once for the background download', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_u, init) => {
      const [s, e] = rangeOf(init as RequestInit);
      return new Response(FILE.slice(s, e + 1), { status: 206 });
    });
    const onWhole = vi.fn();
    const onRanges = vi.fn();
    const src = new RangeOrWholeSource('https://x/nosybe.pmtiles', onWhole, onRanges);
    expect([...new Uint8Array((await src.getBytes(10, 4)).data)]).toEqual([10, 11, 12, 13]);
    await src.getBytes(20, 2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onRanges).toHaveBeenCalledTimes(1);
    expect(onWhole).not.toHaveBeenCalled();
  });

  it('an error status is an error (no silent empty map)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('nope', { status: 404 }));
    const src = new RangeOrWholeSource('https://x/nosybe.pmtiles', vi.fn(), vi.fn());
    await expect(src.getBytes(0, 16)).rejects.toThrow(/HTTP 404/);
  });
});
