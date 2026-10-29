/**
 * Passive reachability signal (STATUT-CC-01).
 *
 * Every HTTP response received from Supabase proves the server is reachable, whatever its status
 * (200, 401, 403, 404, 500). A thrown network error (TypeError) is a hint the network may be down.
 * onlineStatusService subscribes to these signals.
 *
 * No import on purpose: lib/supabase.ts uses trackedFetch, and onlineStatusService imports
 * apiService which imports lib/supabase.ts. An import here could create a cycle.
 */

export type ServerReachabilityEvent = 'response' | 'network-failure';
type Listener = (event: ServerReachabilityEvent) => void;

const listeners = new Set<Listener>();

function emit(event: ServerReachabilityEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // a listener must never break a request
    }
  });
}

export function reportServerResponse(): void {
  emit('response');
}

export function reportNetworkFailure(): void {
  emit('network-failure');
}

/** Returns the unsubscribe function. */
export function subscribeServerReachability(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

/**
 * fetch wrapper given to the Supabase client. Returns exactly what fetch returned (same Response,
 * body untouched) and rethrows exactly the same error: no behaviour change for any caller.
 */
export const trackedFetch: typeof fetch = async (input, init) => {
  try {
    const response = await globalThis.fetch(input, init);
    reportServerResponse();
    return response;
  } catch (error) {
    if (!isAbortError(error) && error instanceof TypeError) {
      reportNetworkFailure();
    }
    throw error;
  }
};
