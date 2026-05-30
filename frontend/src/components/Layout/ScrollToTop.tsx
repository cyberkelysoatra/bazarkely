import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Remonte la fenêtre en haut à chaque ouverture de page (navigation PUSH),
 * afin que toutes les pages s'ouvrent alignées sous l'en-tête plutôt qu'à la
 * position de défilement héritée de la page précédente.
 *
 * - Ignore les retours/avances (POP) : on laisse le navigateur restaurer la
 *   position de défilement précédente.
 * - Ignore les navigations qui ciblent un élément précis (ex: retour à la liste
 *   des transactions avec défilement vers une carte via scrollToTransactionId),
 *   pour ne pas écraser ce comportement.
 */
const ScrollToTop = () => {
  const { pathname, state } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if ((state as { scrollToTransactionId?: string } | null)?.scrollToTransactionId) return;
    if (navigationType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname, navigationType, state]);

  return null;
};

export default ScrollToTop;
