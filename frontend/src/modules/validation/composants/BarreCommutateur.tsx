// Frame of the module switcher bar (VALIDCLIENT-CC-11), copy of BarreCommutateur of
// src/modules/pudi/composants/Mise.tsx, opened by the header logo (EnTete). The tiles are in
// their own chunk (./Commutateur), loaded on the first tap; while it loads, or when it cannot be
// loaded (offline, never cached), the bar shows a state line.
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { useFermetureCommutateur } from '../appels/commutateur';
import type { ModuleHote } from '../utils/modulesCompte';
import { SECONDAIRE } from './Mise';

/** Fixed at the bottom, above every fixed or sticky element of the module (header z-30, bars z-40). */
export function BarreCommutateur({ children, refNav }: { children: ReactNode; refNav?: Ref<HTMLElement> }) {
  return (
    <nav
      ref={refNav}
      aria-label="Changer de module"
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 border-t border-filet shadow-xl pb-[env(safe-area-inset-bottom)]"
      style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      data-vc-commutateur=""
    >
      <div className="mx-auto max-w-2xl">{children}</div>
    </nav>
  );
}

type Tuiles = ComponentType<{ modules: ModuleHote[] }>;
let charge: Tuiles | null = null;

function Attente({ erreur, reessayer }: { erreur: boolean; reessayer: () => void }) {
  const nav = useRef<HTMLElement>(null);
  useFermetureCommutateur(nav);
  return (
    <BarreCommutateur refNav={nav}>
      {erreur ? (
        <div className="px-4 py-3 flex items-center justify-between gap-3" role="status">
          <p className="text-[14px] text-encre m-0">Réseau indisponible, réessayez</p>
          <button type="button" className={`${SECONDAIRE} flex-none`} onClick={reessayer}>
            Réessayer
          </button>
        </div>
      ) : (
        <p className="py-4 m-0 flex items-center justify-center gap-2 text-[14px] text-doux" role="status">
          <span className="w-4 h-4 rounded-full border-2 border-ciel border-t-transparent motion-safe:animate-spin" aria-hidden="true" />
          Chargement de vos modules…
        </p>
      )}
    </BarreCommutateur>
  );
}

/** The open bar, rendered on <body> (the sticky header is its own stacking context). */
export function BarreModules({ modules }: { modules: ModuleHote[] }) {
  const [Composant, setComposant] = useState<Tuiles | null>(() => charge);
  const [erreur, setErreur] = useState(false);
  const [essai, setEssai] = useState(0);
  useEffect(() => {
    if (Composant) return;
    let vivant = true;
    setErreur(false);
    import('./Commutateur')
      .then((m) => {
        charge = m.default;
        if (vivant) setComposant(() => m.default);
      })
      .catch(() => vivant && setErreur(true));
    return () => {
      vivant = false;
    };
  }, [Composant, essai]);
  return createPortal(
    Composant ? <Composant modules={modules} /> : <Attente erreur={erreur} reessayer={() => setEssai((n) => n + 1)} />,
    document.body
  );
}
