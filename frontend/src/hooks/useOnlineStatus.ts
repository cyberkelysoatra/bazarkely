import { useAppStore } from '../stores/appStore';

/**
 * Hook to read the current online status.
 * Source de vérité : useAppStore.isOnline, alimenté par onlineStatusService
 * (initialisé dans App.tsx au démarrage). Combine événements navigator
 * online/offline (instantané) + ping serveur backup (2 min) avec pause
 * automatique quand l'onglet est caché.
 */
export function useOnlineStatus(): boolean {
  return useAppStore((state) => state.isOnline);
}

export default useOnlineStatus;
