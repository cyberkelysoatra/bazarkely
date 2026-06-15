/**
 * Source UNIQUE de l'état « en ligne » pour le module gestion-eau.
 *
 * Le store `appStore.isOnline` est tenu à jour par `onlineStatusService` (écouteurs
 * window `online`/`offline`) → toujours synchrone avec `navigator.onLine`, mais centralisé.
 * On évite ainsi les lectures impératives éparses de `navigator.onLine` dans les composants.
 */
import { useAppStore } from '../../../stores/appStore';

/**
 * Lecture IMPÉRATIVE et TOUJOURS À JOUR de l'état en ligne (handlers, effets) — évite
 * la capture d'une valeur périmée au rendu. Repli `navigator.onLine` si le store n'est
 * pas initialisé (SSR / tests).
 */
export function eauIsOnline(): boolean {
  const s = useAppStore.getState();
  if (typeof s?.isOnline === 'boolean') return s.isOnline;
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** Lecture RÉACTIVE de l'état en ligne (re-render au changement). */
export function useEauOnline(): boolean {
  return useAppStore((s) => s.isOnline);
}
