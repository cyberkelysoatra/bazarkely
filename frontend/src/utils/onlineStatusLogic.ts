/**
 * Pure decision logic of the online / offline indicator (no React, no Supabase, no store).
 *
 * Each function takes the current state and returns the next state plus the delay before the
 * next ping (null = keep the current schedule). onlineStatusService applies the result.
 *
 * Rules (STATUT-CC-01):
 * - one failed ping is not enough to show "Hors ligne": two in a row are needed;
 * - any server response observed (ping or any other Supabase request) means online at once;
 * - a failed ping shortly after a server response is ignored (the server is reachable);
 * - the browser "offline" event is trusted at once, "online" too (with a confirming ping);
 * - when the tab comes back, the first ping waits for the radio to wake up.
 */

export const PING_INTERVAL_ONLINE_MS = 120_000;
export const RETRY_FAST_MS = 15_000;
export const RETRY_OFFLINE_MS = 30_000;
export const WAKE_DELAY_MS = 2_000;
export const FAILURES_BEFORE_OFFLINE = 2;
export const RECENT_CONTACT_MS = 20_000;
export const PING_TIMEOUT_MS = 8_000;

export interface OnlineStatusState {
  isOnline: boolean;
  consecutiveFailures: number;
  /** Timestamp (ms) of the last HTTP response received from the server, null if none yet. */
  lastServerContactAt: number | null;
}

export interface OnlineStatusDecision {
  state: OnlineStatusState;
  /** Delay before the next ping, null = leave the current schedule untouched. */
  nextPingMs: number | null;
  /** Human readable reason (French, used in transition logs). */
  reason: string;
}

export function createInitialState(isOnline: boolean): OnlineStatusState {
  return { isOnline, consecutiveFailures: 0, lastServerContactAt: null };
}

/** A ping succeeded: the server answered. */
export function onPingSuccess(state: OnlineStatusState, now: number): OnlineStatusDecision {
  return {
    state: { ...state, isOnline: true, consecutiveFailures: 0, lastServerContactAt: now },
    nextPingMs: PING_INTERVAL_ONLINE_MS,
    reason: 'ping réussi',
  };
}

/** Any Supabase HTTP response was observed (whatever its status): the server is reachable. */
export function onServerResponse(state: OnlineStatusState, now: number): OnlineStatusDecision {
  return {
    state: { ...state, isOnline: true, consecutiveFailures: 0, lastServerContactAt: now },
    nextPingMs: PING_INTERVAL_ONLINE_MS,
    reason: 'réponse serveur observée',
  };
}

/** A ping failed (timeout or network error). */
export function onPingFailure(state: OnlineStatusState, now: number): OnlineStatusDecision {
  if (state.lastServerContactAt !== null && now - state.lastServerContactAt < RECENT_CONTACT_MS) {
    return {
      state: { ...state, consecutiveFailures: 0 },
      nextPingMs: PING_INTERVAL_ONLINE_MS,
      reason: 'échec ignoré (le serveur a répondu il y a moins de 20 s)',
    };
  }
  const consecutiveFailures = state.consecutiveFailures + 1;
  if (consecutiveFailures < FAILURES_BEFORE_OFFLINE) {
    return {
      state: { ...state, consecutiveFailures },
      nextPingMs: RETRY_FAST_MS,
      reason: `${consecutiveFailures} échec, nouvel essai dans 15 s`,
    };
  }
  return {
    state: { ...state, isOnline: false, consecutiveFailures },
    // First retry after going offline is fast, then every 30 s while offline.
    nextPingMs: consecutiveFailures === FAILURES_BEFORE_OFFLINE ? RETRY_FAST_MS : RETRY_OFFLINE_MS,
    reason: `${consecutiveFailures} échecs de suite`,
  };
}

/** Browser "offline" event: reliable, applied at once. */
export function onBrowserOffline(state: OnlineStatusState): OnlineStatusDecision {
  return {
    state: {
      ...state,
      isOnline: false,
      consecutiveFailures: Math.max(state.consecutiveFailures, FAILURES_BEFORE_OFFLINE),
    },
    nextPingMs: RETRY_OFFLINE_MS,
    reason: 'le navigateur signale la perte du réseau',
  };
}

/** Browser "online" event: online at once, confirming ping shortly after. */
export function onBrowserOnline(state: OnlineStatusState): OnlineStatusDecision {
  return {
    state: { ...state, isOnline: true, consecutiveFailures: 0 },
    nextPingMs: WAKE_DELAY_MS,
    reason: 'le navigateur signale le retour du réseau',
  };
}

/** Tab or app became visible again: give the radio time to wake up before pinging. */
export function onVisible(state: OnlineStatusState): OnlineStatusDecision {
  return { state, nextPingMs: WAKE_DELAY_MS, reason: 'onglet visible' };
}

/** A Supabase request failed at network level: never offline by itself, only a confirming ping. */
export function onNetworkFailureReported(state: OnlineStatusState): OnlineStatusDecision {
  return { state, nextPingMs: WAKE_DELAY_MS, reason: 'échec réseau signalé, ping de confirmation' };
}
