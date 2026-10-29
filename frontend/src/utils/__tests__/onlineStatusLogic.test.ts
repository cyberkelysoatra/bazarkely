import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FAILURES_BEFORE_OFFLINE,
  PING_INTERVAL_ONLINE_MS,
  PING_TIMEOUT_MS,
  RECENT_CONTACT_MS,
  RETRY_FAST_MS,
  RETRY_OFFLINE_MS,
  WAKE_DELAY_MS,
  createInitialState,
  onBrowserOffline,
  onBrowserOnline,
  onNetworkFailureReported,
  onPingFailure,
  onPingSuccess,
  onServerResponse,
  onVisible,
} from '../onlineStatusLogic';

describe('onlineStatusLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes the agreed constants', () => {
    expect(PING_INTERVAL_ONLINE_MS).toBe(120000);
    expect(RETRY_FAST_MS).toBe(15000);
    expect(RETRY_OFFLINE_MS).toBe(30000);
    expect(WAKE_DELAY_MS).toBe(2000);
    expect(FAILURES_BEFORE_OFFLINE).toBe(2);
    expect(RECENT_CONTACT_MS).toBe(20000);
    expect(PING_TIMEOUT_MS).toBe(8000);
  });

  it('1 failure: still online, next ping in 15 s', () => {
    const d = onPingFailure(createInitialState(true), Date.now());
    expect(d.state.isOnline).toBe(true);
    expect(d.state.consecutiveFailures).toBe(1);
    expect(d.nextPingMs).toBe(15000);
  });

  it('2 failures in a row: offline', () => {
    const first = onPingFailure(createInitialState(true), Date.now());
    vi.advanceTimersByTime(first.nextPingMs!);
    const second = onPingFailure(first.state, Date.now());
    expect(second.state.isOnline).toBe(false);
    expect(second.state.consecutiveFailures).toBe(2);
  });

  it('offline retry delays: 15 s then 30 s, then stays at 30 s', () => {
    let s = createInitialState(true);
    const delays: number[] = [];
    for (let i = 0; i < 5; i++) {
      const d = onPingFailure(s, Date.now());
      delays.push(d.nextPingMs!);
      s = d.state;
      vi.advanceTimersByTime(d.nextPingMs!);
    }
    // failure 1 (still online), failure 2 (goes offline), then offline retries
    expect(delays).toEqual([15000, 15000, 30000, 30000, 30000]);
    expect(s.isOnline).toBe(false);
  });

  it('offline then ping success: online, next ping in 120 s', () => {
    let s = onPingFailure(createInitialState(true), Date.now()).state;
    s = onPingFailure(s, Date.now() + 15000).state;
    expect(s.isOnline).toBe(false);
    vi.advanceTimersByTime(15000);
    const d = onPingSuccess(s, Date.now());
    expect(d.state.isOnline).toBe(true);
    expect(d.state.consecutiveFailures).toBe(0);
    expect(d.nextPingMs).toBe(120000);
  });

  it('server response observed while offline: online at once, next ping in 120 s', () => {
    const offline = onBrowserOffline(createInitialState(true)).state;
    const d = onServerResponse(offline, Date.now());
    expect(d.state.isOnline).toBe(true);
    expect(d.state.consecutiveFailures).toBe(0);
    expect(d.state.lastServerContactAt).toBe(Date.now());
    expect(d.nextPingMs).toBe(120000);
  });

  it('failure within 20 s after a server response is ignored', () => {
    const s = onServerResponse(createInitialState(true), Date.now()).state;
    vi.advanceTimersByTime(19000);
    const d = onPingFailure(s, Date.now());
    expect(d.state.isOnline).toBe(true);
    expect(d.state.consecutiveFailures).toBe(0);
    expect(d.nextPingMs).toBe(120000);
  });

  it('failure more than 20 s after a server response counts', () => {
    const s = onServerResponse(createInitialState(true), Date.now()).state;
    vi.advanceTimersByTime(21000);
    const d = onPingFailure(s, Date.now());
    expect(d.state.consecutiveFailures).toBe(1);
    expect(d.nextPingMs).toBe(15000);
  });

  it('browser offline event: offline at once', () => {
    const d = onBrowserOffline(createInitialState(true));
    expect(d.state.isOnline).toBe(false);
  });

  it('browser online event: online at once, confirming ping in 2 s', () => {
    const offline = onBrowserOffline(createInitialState(true)).state;
    const d = onBrowserOnline(offline);
    expect(d.state.isOnline).toBe(true);
    expect(d.state.consecutiveFailures).toBe(0);
    expect(d.nextPingMs).toBe(2000);
  });

  it('tab visible: ping in 2 s, state unchanged', () => {
    const s = createInitialState(true);
    const d = onVisible(s);
    expect(d.nextPingMs).toBe(2000);
    expect(d.state).toEqual(s);
  });

  it('network failure reported: never offline by itself, confirming ping in 2 s', () => {
    const s = createInitialState(true);
    const d = onNetworkFailureReported(s);
    expect(d.state.isOnline).toBe(true);
    expect(d.state.consecutiveFailures).toBe(0);
    expect(d.nextPingMs).toBe(2000);
  });
});
