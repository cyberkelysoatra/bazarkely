// Frame of the module switcher (NEC-CC-06), copy of src/modules/validation/composants/BarreCommutateur.tsx,
// opened by the B-lossom logo of the header. The tiles are in their own chunk (./Commutateur), loaded
// on the first tap (precached with the rest of the plan); while it loads, or when it cannot be loaded,
// the bar shows a state line.
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { useFermetureCommutateur } from '../etat/commutateur';
import type { ModuleHote } from '../utils/modulesCompte';

/** Fixed at the bottom, above the bottom bar of the plan (z-20) and the canvas (z-40). */
export function BarreCommutateur({ children, refNav }: { children: ReactNode; refNav?: Ref<HTMLElement> }) {
  return (
    <nav
      ref={refNav}
      aria-label="Autres modules de 1saKELY"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[480px] bg-white/95 border-t border-filet shadow-xl pb-[env(safe-area-inset-bottom)] rounded-t-2xl"
      style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      data-bp-commutateur=""
    >
      {children}
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
          <p className="text-[15px] text-encre">Réseau indisponible, réessayez</p>
          <button type="button" className="flex-none min-h-[44px] px-4 rounded-xl border-2 border-violet text-violet font-bold" onClick={reessayer}>
            Réessayer
          </button>
        </div>
      ) : (
        <p className="py-4 flex items-center justify-center gap-2 text-[15px] text-doux" role="status">
          <span className="w-4 h-4 rounded-full border-2 border-violet border-t-transparent motion-safe:animate-spin" aria-hidden="true" />
          Chargement de vos modules...
        </p>
      )}
    </BarreCommutateur>
  );
}

/** The open bar, rendered on <body>. */
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
