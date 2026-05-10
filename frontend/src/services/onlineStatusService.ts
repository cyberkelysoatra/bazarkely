/**
 * Service centralisé de détection du statut online/offline
 *
 * Architecture :
 * - Singleton initialisé une fois au démarrage (App.tsx)
 * - Écoute événements navigator online/offline → réaction instantanée
 * - Page Visibility API → pause polling quand onglet caché (économie batterie/data)
 * - Ping serveur toutes les 2 min en backup → détecte cas "wifi OK mais serveur planté"
 * - Source de vérité : useAppStore.isOnline (+ useSyncStore.isOnline pour rétrocompat)
 */

import { useAppStore, useSyncStore } from '../stores/appStore';
import apiService from './apiService';

const PING_INTERVAL_MS = 120_000; // 2 minutes
let pingTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function setOnlineEverywhere(isOnline: boolean) {
  useAppStore.getState().setOnline(isOnline);
  useSyncStore.getState().setOnline(isOnline);
}

async function pingServer() {
  // Si le navigateur dit déjà offline, pas la peine de tenter
  if (!navigator.onLine) {
    setOnlineEverywhere(false);
    return;
  }

  try {
    const status = await apiService.getServerStatus();
    setOnlineEverywhere(status.online);
  } catch (error) {
    console.warn('🌐 [OnlineStatus] Ping serveur échoué:', error);
    setOnlineEverywhere(false);
  }
}

function startPolling() {
  if (pingTimer !== null) return;
  // Ping immédiat pour rafraîchir l'état dès que l'onglet redevient visible
  pingServer();
  pingTimer = setInterval(pingServer, PING_INTERVAL_MS);
}

function stopPolling() {
  if (pingTimer !== null) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function handleOnline() {
  console.log('🌐 [OnlineStatus] Événement navigator: online');
  setOnlineEverywhere(true);
  // Réseau récupéré : ping immédiat pour confirmer que le serveur répond aussi
  pingServer();
}

function handleOffline() {
  console.log('🌐 [OnlineStatus] Événement navigator: offline');
  setOnlineEverywhere(false);
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    console.log('🌐 [OnlineStatus] Onglet visible → reprise polling');
    startPolling();
  } else {
    console.log('🌐 [OnlineStatus] Onglet caché → pause polling');
    stopPolling();
  }
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
  setOnlineEverywhere(navigator.onLine);

  // Listeners événements navigator (réaction instantanée perte/retour wifi)
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Page Visibility API (pause polling quand onglet caché)
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Démarrer le polling si l'onglet est visible au moment de l'init
  if (document.visibilityState === 'visible') {
    startPolling();
  }

  console.log('🌐 [OnlineStatus] Service initialisé (events + visibility + ping 2min)');

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    stopPolling();
    initialized = false;
  };
}
