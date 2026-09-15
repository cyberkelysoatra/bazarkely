/**
 * Hook de message d'erreur de formulaire qui ramène la vue sur le bandeau
 *
 * Remplace le `useState<string | null>` d'erreur d'une page. À chaque nouvelle
 * erreur (y compris identique à la précédente) :
 * - fait défiler la page jusqu'au bandeau, centré verticalement (le header
 *   applicatif, collé en haut, masquerait un bandeau aligné en haut) ;
 * - donne le focus au bandeau (lecteurs d'écran, navigation clavier) ;
 * - allume `errorFlash` ~1,4 s pour l'animation `animate-error-pulse` ;
 * - émet une courte vibration quand l'appareil le permet.
 *
 * Pourquoi un compteur de tentative : si l'utilisateur reclique sur
 * « Enregistrer » sans rien changer, le message est identique. Un état
 * `string` ne changerait pas, React ne relancerait pas l'effet, et le
 * défilement ne se rejouerait jamais. On stocke donc `{ message, seq }` et
 * `seq` augmente à chaque erreur non nulle : chaque tentative produit un
 * nouvel objet d'état, donc un nouveau déclenchement.
 *
 * `prefers-reduced-motion: reduce` → saut instantané, sans halo ni vibration.
 * Le saut utilise `behavior: 'instant'` et non `'auto'` : `index.css` définit
 * `scroll-behavior: smooth` sur `html`, et `'auto'` hériterait de ce lissage.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const FLASH_DURATION_MS = 1400;

interface ErrorState {
  message: string | null;
  seq: number;
}

export function useScrollToError() {
  const [errorState, setErrorState] = useState<ErrorState>({ message: null, seq: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const errorRef = useRef<HTMLDivElement | null>(null);

  // Même signature que l'ancien setter : setError('...') / setError(null)
  const setError = useCallback((message: string | null) => {
    setErrorState(prev => (
      message === null
        ? (prev.message === null ? prev : { message: null, seq: prev.seq })
        : { message, seq: prev.seq + 1 }
    ));
  }, []);

  useEffect(() => {
    if (errorState.message === null) {
      setErrorFlash(false);
      return;
    }

    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    let flashFrame: number | undefined;

    // Le bandeau est monté conditionnellement : attendre la peinture
    const frame = requestAnimationFrame(() => {
      const node = errorRef.current;
      if (!node) return;

      const reduceMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      node.scrollIntoView({ behavior: reduceMotion ? 'instant' : 'smooth', block: 'center' });
      // preventScroll : ne pas interrompre le défilement doux en cours
      node.focus({ preventScroll: true });

      if (reduceMotion) {
        setErrorFlash(false);
        return;
      }

      // Relance l'animation même si le halo précédent n'était pas terminé
      setErrorFlash(false);
      flashFrame = requestAnimationFrame(() => setErrorFlash(true));
      flashTimer = setTimeout(() => setErrorFlash(false), FLASH_DURATION_MS);

      // Absente sur iOS Safari, peut lever dans certains contextes iframe
      if (typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(40);
        } catch {
          // ignorée
        }
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      if (flashFrame !== undefined) cancelAnimationFrame(flashFrame);
      if (flashTimer !== undefined) clearTimeout(flashTimer);
    };
  }, [errorState]);

  return { error: errorState.message, setError, errorRef, errorFlash };
}

export default useScrollToError;
