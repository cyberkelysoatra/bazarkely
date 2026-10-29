import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { subscribeServerReachability, trackedFetch } from '../serverReachability';

describe('trackedFetch', () => {
  const events: string[] = [];
  let unsubscribe: () => void;
  const fetchMock = vi.fn();

  beforeEach(() => {
    events.length = 0;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    unsubscribe = subscribeServerReachability((e) => events.push(e));
  });
  afterEach(() => {
    unsubscribe();
    vi.unstubAllGlobals();
  });

  it('returns the very same Response and reports reachability', async () => {
    const response = new Response('{"ok":true}', { status: 200 });
    fetchMock.mockResolvedValue(response);
    const init = { method: 'GET' };
    const result = await trackedFetch('https://example.test/rest', init);
    expect(result).toBe(response);
    expect(result.bodyUsed).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/rest', init);
    expect(events).toEqual(['response']);
  });

  it('a 401 response still reports reachability', async () => {
    const response = new Response('{"message":"JWT expired"}', { status: 401 });
    fetchMock.mockResolvedValue(response);
    const result = await trackedFetch('https://example.test/rest');
    expect(result).toBe(response);
    expect(result.status).toBe(401);
    expect(events).toEqual(['response']);
  });

  it('a TypeError is rethrown identical and reports a network failure', async () => {
    const error = new TypeError('Failed to fetch');
    fetchMock.mockRejectedValue(error);
    await expect(trackedFetch('https://example.test/rest')).rejects.toBe(error);
    expect(events).toEqual(['network-failure']);
  });

  it('an AbortError reports nothing and is rethrown identical', async () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');
    fetchMock.mockRejectedValue(error);
    await expect(trackedFetch('https://example.test/rest')).rejects.toBe(error);
    expect(events).toEqual([]);
  });

  it('unsubscribed listeners receive nothing', async () => {
    unsubscribe();
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));
    await trackedFetch('https://example.test/rest');
    expect(events).toEqual([]);
  });
});
