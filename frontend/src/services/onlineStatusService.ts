/**
 * Service centralisé de détection du statut online/offline
 *
 * Architecture (STATUT-CC-01) :
 * - Singleton initialisé une fois au démarrage (App.tsx)
 * - Décisions dans utils/onlineStatusLogic.ts (pur, testé) ; ce fichier applique les décisions
 * - Événements navigator online/offline → réaction instantanée
 * - Signal passif : toute réponse HTTP de Supabase (lib/serverReachability.ts) prouve que le
 *   serveur répond → « En ligne » tout de suite
 * - Ping serveur en secours : une seule chaîne setTimeout, jamais deux pings en vol,
 *   « Hors ligne » seulement après 2 échecs de suite
 * - Page Visibility API → pause quand l'onglet est caché, reprise 2 s après le retour
 * - Source de vérité : useAppStore.isOnline (+ useSyncStore.isOnline pour rétrocompat)
 */

import { useAppStore, useSyncStore } from '../stores/appStore';
import apiService from './apiService';
import { subscribeServerReachability } from '../lib/serverReachability';
import {
  createInitialState,
  onBrowserOffline,
  onBrowserOnline,
  onNetworkFailureReported,
  onPingFailure,
  onPingSuccess,
  onServerResponse,
  onVisible,
  type OnlineStatusDecision,
  type OnlineStatusState,
} from '../utils/onlineStatusLogic';

let state: OnlineStatusState = createInitialState(true);
let pingTimer: ReturnType<typeof setTimeout> | null = null;
let nextPingAt: number | null = null;
let pingInFlight = false;
let confirmingPingPending = false;
let paused = false;
let initialized = false;
let unsubscribeReachability: (() => void) | null = null;
/** Dev only: number of next pings forced to behave as timeouts. */
let simulatedFailures = 0;

function setOnlineEverywhere(isOnline: boolean) {
  useAppStore.getState().setOnline(isOnline);
  useSyncStore.getState().setOnline(isOnline);
}

function clearPingTimer() {
  if (pingTimer !== null) {
    clearTimeout(pingTimer);
    pingTimer = null;
  }
  nextPingAt = null;
}

function schedulePing(delayMs: number) {
  if (paused) return;
  clearPingTimer();
  nextPingAt = Date.now() + delayMs;
  pingTimer = setTimeout(() => {
    pingTimer = null;
    nextPingAt = null;
    void pingServer();
  }, delayMs);
}

/** Applies a decision: store update + log on transition only, then the next ping. */
function apply(decision: OnlineStatusDecision) {
  const wasOnline = state.isOnline;
  state = decision.state;
  if (state.isOnline !== wasOnline) {
    console.log(`🌐 [OnlineStatus] → ${state.isOnline ? 'En ligne' : 'Hors ligne'} (${decision.reason})`);
    setOnlineEverywhere(state.isOnline);
  }
  // A ping in flight reschedules itself when it ends.
  if (decision.nextPingMs !== null && !pingInFlight) {
    schedulePing(decision.nextPingMs);
  }
}

async function pingServer() {
  if (pingInFlight || paused) return;
  confirmingPingPending = false;

  // Le navigateur dit déjà offline : pas la peine de tenter
  if (!navigator.onLine) {
    apply(onBrowserOffline(state));
    return;
  }

  pingInFlight = true;
  let online = false;
  let error: string | null = null;
  try {
    if (simulatedFailures > 0) {
      simulatedFailures -= 1;
      error = 'échec simulé (dev)';
    } else {
      const status = await apiService.getServerStatus();
      online = status.online;
      error = status.error;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    pingInFlight = false;
  }

  const decision = online ? onPingSuccess(state, Date.now()) : onPingFailure(state, Date.now());
  if (!online && state.isOnline && decision.state.isOnline && decision.state.consecutiveFailures > 0) {
    console.warn(`🌐 [OnlineStatus] Ping échoué (${error}) : ${decision.reason}`);
  }
  apply(decision);
}

function handleReachability(event: 'response' | 'network-failure') {
  if (event === 'response') {
    // Online at once if needed, next ping pushed back to 120 s (cancels a pending confirmation)
    confirmingPingPending = false;
    apply(onServerResponse(state, Date.now()));
    return;
  }
  // Network failure of an app request: never offline by itself, at most one confirming ping.
  if (paused || pingInFlight || confirmingPingPending || !navigator.onLine) return;
  confirmingPingPending = true;
  apply(onNetworkFailureReported(state));
}

function handleOnline() {
  console.log('🌐 [OnlineStatus] Événement navigator: online');
  apply(onBrowserOnline(state));
}

function handleOffline() {
  console.log('🌐 [OnlineStatus] Événement navigator: offline');
  apply(onBrowserOffline(state));
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    console.log('🌐 [OnlineStatus] Onglet visible → ping dans 2 s');
    paused = false;
    apply(onVisible(state));
  } else {
    console.log('🌐 [OnlineStatus] Onglet caché → pause polling');
    paused = true;
    confirmingPingPending = false;
    clearPingTimer();
  }
}

function installDevDebug() {
  if (!import.meta.env.DEV) return;
  (window as unknown as Record<string, unknown>).__bazarkelyOnlineDebug = {
    failNextPings(n: number) {
      simulatedFailures = Math.max(0, Math.floor(n));
      return simulatedFailures;
    },
    state() {
      return {
        ...state,
        simulatedFailures,
        pingInFlight,
        paused,
        nextPingInMs: nextPingAt === null ? null : nextPingAt - Date.now(),
      };
    },
  };
}

/**
 * Initialise le service de détection online/offline.
 * À appeler une seule fois au démarrage de l'application (App.tsx).
 * Retourne une fonction de cleanup (utile pour StrictMode/tests).
 */
export function initOnlineStatusService(): () => void {
  if (initialized) {
    return () => {};
  }
  initialized = true;

  // État initial basé sur navigator.onLine
  state = createInitialState(navigator.onLine);
  setOnlineEverywhere(navigator.onLine);

  // Listeners événements navigator (réaction instantanée perte/retour wifi)
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Page Visibility API (pause polling quand onglet caché)
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Signal passif : chaque réponse Supabase prouve que le serveur répond
  unsubscribeReachability = subscribeServerReachability(handleReachability);

  installDevDebug();

  // Premier ping 2 s après le démarrage si l'onglet est visible
  paused = document.visibilityState !== 'visible';
  if (!paused) {
    apply(onVisible(state));
  }

  console.log('🌐 [OnlineStatus] Service initialisé (events + visibility + réponses serveur + ping)');

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    unsubscribeReachability?.();
    unsubscribeReachability = null;
    clearPingTimer();
    confirmingPingPending = false;
    initialized = false;
  };
}
