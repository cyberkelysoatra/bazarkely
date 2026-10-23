// Trigger of the top-right menu (main chunk, tiny). Signed in or not is read from localStorage
// (no supabase-js); the panel and the Supabase client load when the menu opens.
import { Suspense, lazy, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { Icone } from './Icones';
import { useSessionLocale } from '../appels/session';
import { usePriveNonLu } from '../appels/priveNonLu';
import { usePudi } from '../PudiContexte';

const MenuPanneau = lazy(() => import('./MenuPanneau'));

/** Refusals not seen yet by this administrator (loaded with the menu, kept for the session). */
let badgeRefus = 0;
const abonnesBadge = new Set<() => void>();
export function definirBadgeRefus(n: number): void {
  badgeRefus = Math.max(0, n);
  abonnesBadge.forEach((f) => f());
}
export function useBadgeRefus(): number {
  return useSyncExternalStore(
    (f) => {
      abonnesBadge.add(f);
      return () => abonnesBadge.delete(f);
    },
    () => badgeRefus,
    () => 0
  );
}

export function DeclencheurMenu() {
  const session = useSessionLocale();
  const badge = useBadgeRefus();
  // PUDI-CC-14.2: an organisers' answer is waiting (never read in JOEL's preview).
  const priveNonLu = usePriveNonLu(!!session && !usePudi().apercu);
  const [ouvert, setOuvert] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);
  const commun = {
    ref: bouton,
    type: 'button' as const,
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      setOuvert((o) => !o);
    },
    'aria-haspopup': 'menu' as const,
    'aria-expanded': ouvert,
    'aria-controls': 'pudi-menu'
  };
  return (
    <>
      {session ? (
        <button {...commun} aria-label="Menu du compte" className="pudi-focus relative flex-shrink-0 min-h-[44px] flex items-center gap-1 pl-0.5 pr-1 rounded-full">
          <span className="w-10 h-10 rounded-full bg-white text-marine flex items-center justify-center">
            <Icone nom="utilisateur" className="w-5 h-5" />
          </span>
          <Icone nom={ouvert ? 'haut' : 'bas'} className="w-4 h-4" />
          {priveNonLu && (
            <span className="absolute top-0 left-0.5 w-3 h-3 rounded-full bg-[#E5484D] ring-2 ring-marine" data-point-prive-menu="" aria-label="Réponse des organisateurs non lue" />
          )}
          {badge > 0 && (
            <span
              className="absolute -top-0.5 left-7 min-w-[20px] h-5 px-1 rounded-full bg-[#F2B705] text-[#2F3547] text-[0.6875rem] font-bold flex items-center justify-center ring-2 ring-marine"
              aria-label={`${badge} tentative${badge > 1 ? 's' : ''} refusée${badge > 1 ? 's' : ''} à examiner`}
            >
              {badge}
            </span>
          )}
        </button>
      ) : (
        <button {...commun} className="pudi-focus flex-shrink-0 min-h-[44px] px-3.5 rounded-full bg-white text-marine font-bold text-[0.875rem] flex items-center gap-1.5">
          <Icone nom="connexion" className="w-4 h-4" />
          Se connecter
          <Icone nom={ouvert ? 'haut' : 'bas'} className="w-4 h-4" />
        </button>
      )}
      {ouvert && (
        <Suspense fallback={null}>
          <MenuPanneau ancre={bouton} fermer={() => setOuvert(false)} />
        </Suspense>
      )}
    </>
  );
}
