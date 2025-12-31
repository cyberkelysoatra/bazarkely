/**
 * Hook personnalisé pour gérer les erreurs spécifiques à une page
 * Nettoie automatiquement les erreurs lors de la navigation vers une autre page
 */

import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useErrorStore } from '../stores/appStore';

/**
 * Type de retour du hook usePageError
 */
interface UsePageErrorReturn {
  /** Erreur de page actuelle (null si aucune erreur) */
  pageError: { message: string; pathname: string } | null;
  /** Fonction pour définir une erreur de page (le pathname est ajouté automatiquement) */
  setPageError: (message: string) => void;
  /** Fonction pour effacer l'erreur de page */
  clearPageError: () => void;
}

/**
 * Hook personnalisé pour gérer les erreurs spécifiques à une page
 * 
 * Ce hook :
 * - Wrappe les fonctionnalités de pageError du store d'erreurs
 * - Nettoie automatiquement les erreurs quand l'utilisateur navigue vers une autre page
 * - Fournit un wrapper setPageError qui inclut automatiquement le pathname actuel
 * 
 * @example
 * ```tsx
 * const { pageError, setPageError, clearPageError } = usePageError();
 * 
 * // Définir une erreur (le pathname est ajouté automatiquement)
 * setPageError('Erreur lors de la sauvegarde');
 * 
 * // L'erreur sera automatiquement effacée quand l'utilisateur navigue vers une autre page
 * 
 * // Effacer manuellement si nécessaire
 * clearPageError();
 * ```
 * 
 * @returns Objet avec pageError, setPageError et clearPageError
 */
export function usePageError(): UsePageErrorReturn {
  const location = useLocation();
  const { pageError, setPageError: storeSetPageError, clearPageError } = useErrorStore();

  // Effacer automatiquement l'erreur quand le pathname change
  useEffect(() => {
    clearPageError();
  }, [location.pathname, clearPageError]);

  // Wrapper pour setPageError qui inclut automatiquement le pathname actuel
  const setPageError = useCallback(
    (message: string) => {
      storeSetPageError(message, location.pathname);
    },
    [location.pathname, storeSetPageError]
  );

  return {
    pageError,
    setPageError,
    clearPageError,
  };
}

// Export par défaut pour la commodité
export default usePageError;











