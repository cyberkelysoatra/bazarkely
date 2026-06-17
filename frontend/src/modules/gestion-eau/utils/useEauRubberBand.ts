/**
 * Rebond élastique iOS « rubber-band » prononcé pour les pages du module Gestion Eau (v3.64.0).
 *
 * En tirant la page au-delà du HAUT ou du BAS, le contenu s'étire (résistance dégressive),
 * puis revient en ressort au relâcher. Codé en JavaScript car l'`overscroll-behavior` natif
 * est verrouillé (`overscroll-behavior: none` sur <html>/<body>) et trop discret sur Android.
 *
 * ── Calque translaté & préservation du `position: sticky` ──────────────────────────────
 * On translate le `<main>` (le contenu défilant), JAMAIS la racine ni le `<header>`.
 * Le Header (`sticky top-0`) est un FRÈRE de `<main>` → il n'est jamais transformé : il reste
 * parfaitement épinglé pendant et après le rebond. La barre d'onglets (`sticky`) est, elle,
 * À L'INTÉRIEUR de `<main>` : pendant le geste d'overscroll aux extrémités, elle « voyage »
 * donc avec le contenu — ce qui est exactement le comportement natif (tout bouge ensemble au
 * rebond). Le `transform` n'est appliqué QUE pendant le geste actif et **entièrement retiré**
 * au repos → le `sticky` des onglets est intégralement restauré dès la fin du ressort. En
 * défilement normal il n'y a aucun transform : l'épinglage est nominal.
 *
 * ── Garde-fous ─────────────────────────────────────────────────────────────────────────
 *  - Actif seulement sur appareil tactile (écoute uniquement les `touch*` → inactif souris).
 *  - Ne déclenche qu'AUX extrémités du défilement page, et jamais si un conteneur défilant
 *    interne (liste de tiroir `overflow-y-auto`) n'est pas lui-même à sa propre extrémité
 *    dans le sens du geste → ne capture pas les scrolls internes.
 *  - `behavior` non concerné par le `scroll-behavior: smooth` de <html> (on translate, on ne
 *    fait pas de window.scrollTo).
 *  - Le calage des cartes (scrollUnderHeader) mesure hors geste (transform = 0) → non faussé.
 */
import { useEffect } from 'react';

// Constantes réglables ───────────────────────────────────────────────────────────────────
const RESISTANCE = 0.55; // plus haut = plus de résistance (montée plus lente vers le plafond)
const MAX_PULL = 140; // amplitude max de l'étirement, en px (plafond du rubber-band)
const SPRING_MS = 360; // durée du retour ressort, en ms

function isTouchDevice(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0)
  );
}

/** Déplacement amorti à résistance dégressive, plafonné à MAX_PULL. */
function damp(d: number): number {
  const a = Math.abs(d);
  const eased = (1 - 1 / ((a * RESISTANCE) / MAX_PULL + 1)) * MAX_PULL;
  return Math.sign(d) * eased;
}

export function useEauRubberBand(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !isTouchDevice()) return;
    const layer = document.querySelector('main');
    if (!layer) return;

    let startY = 0;
    let mode: 'top' | 'bottom' | null = null;
    let raf = 0;
    let innerScroll: HTMLElement | null = null;

    const atTop = () => window.scrollY <= 0;
    const atBottom = () =>
      window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;

    // Remonte depuis la cible jusqu'à `main` à la recherche d'un conteneur réellement
    // défilant (liste de tiroir) : si trouvé et pas à son extrémité, on lui laisse le scroll.
    const findInnerScroll = (el: HTMLElement | null): HTMLElement | null => {
      let n: HTMLElement | null = el;
      while (n && n !== layer && n !== document.body) {
        const s = getComputedStyle(n);
        if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
        n = n.parentElement;
      }
      return null;
    };

    const getOffset = (): number => {
      const m = /translateY\(([-0-9.]+)px\)/.exec(layer.style.transform);
      return m ? parseFloat(m[1]) : 0;
    };

    const setOffset = (px: number) => {
      if (px === 0) {
        layer.style.transform = '';
        layer.style.willChange = '';
        layer.style.overscrollBehavior = '';
      } else {
        layer.style.transform = `translateY(${px}px)`;
        layer.style.willChange = 'transform';
        layer.style.overscrollBehavior = 'contain';
      }
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      layer.style.transition = 'none';
      startY = e.touches[0].clientY;
      mode = null;
      innerScroll = findInnerScroll(e.target as HTMLElement);
    };

    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - startY;

      if (!mode) {
        const innerAtTop = !innerScroll || innerScroll.scrollTop <= 0;
        const innerAtBottom =
          !innerScroll ||
          innerScroll.scrollTop + innerScroll.clientHeight >= innerScroll.scrollHeight - 1;
        if (dy > 0 && atTop() && innerAtTop) mode = 'top';
        else if (dy < 0 && atBottom() && innerAtBottom) mode = 'bottom';
        else return; // défilement normal — on ne capture pas le geste
      }

      // Direction redevenue cohérente avec le repos → on relâche visuellement (offset 0).
      if ((mode === 'top' && dy <= 0) || (mode === 'bottom' && dy >= 0)) {
        e.preventDefault();
        setOffset(0);
        return;
      }
      e.preventDefault();
      setOffset(damp(dy));
    };

    const onEnd = () => {
      if (!mode) return;
      mode = null;
      const start = getOffset();
      if (start === 0) {
        setOffset(0);
        return;
      }
      const t0 = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / SPRING_MS);
        setOffset(start * (1 - easeOutCubic(t)));
        if (t < 1) raf = requestAnimationFrame(step);
        else {
          setOffset(0);
          raf = 0;
        }
      };
      raf = requestAnimationFrame(step);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      if (raf) cancelAnimationFrame(raf);
      setOffset(0);
      layer.style.transition = '';
    };
  }, [enabled]);
}
