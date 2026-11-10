// Violet header of every screen (charter of the NEC 2026 workbook), MODÈLE B (decision of 10/11/2026,
// NEC-CC-06): ONE row with the NEC logo on the left (44 px), overline, title and subtitle in the
// middle (min-w-0, so a long project name never pushes the logos out), the
// B-lossom Center logo (white, 44 px) on the right. The logos are precached: they show in airplane
// mode; a missing file is hidden without moving anything. Title and subtitle are cut to one line each
// (the full section titles stay in the Sommaire).
// Sticky at the top of every screen (NEC-CC-07, decision of 10/11/2026): no ancestor may get an
// `overflow` other than `clip` (memento section 30). Its height is published as `--bp-haut` on <html>
// (ResizeObserver, no scroll listener) for the sticky sub bars and the `scroll-margin-top` of inputs.
// Stacking order: header 30, sub bars 10, content below.
// The B-lossom logo is a plain image, except for an account signed in on 1sakely.org (shared session
// kept on the phone) that has other modules: then it is a button that opens the module switcher.
import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { useModulesCompte } from '../etat/modules';
import { basculerCommutateur, quitterCommutateur, useCommutateurOuvert } from '../etat/commutateur';
import { BarreModules } from './BarreCommutateur';
import type { ModuleHote } from '../utils/modulesCompte';

const cacher = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = 'hidden';
};

function ImageBlossom() {
  return <img src="/plan/logos/blossom-blanc-v2.png" alt="B-lossom Center, organisateur" width={46} height={44} className="h-[44px] w-auto block" onError={cacher} />;
}

/** The B-lossom logo as the module switcher (list known and not empty). */
function LogoCommutateur({ modules }: { modules: ModuleHote[] }) {
  const ouvert = useCommutateurOuvert();
  const [onde, setOnde] = useState(false);
  // A new screen of the plan replaces the history entry of the open bar.
  useEffect(() => () => quitterCommutateur(), []);
  return (
    <>
      <button
        type="button"
        data-bp-logo=""
        onClick={(e) => {
          e.stopPropagation();
          basculerCommutateur();
          setOnde(true);
          window.setTimeout(() => setOnde(false), 600);
        }}
        aria-label="Ouvrir les autres modules de 1saKELY"
        aria-expanded={ouvert}
        className="relative flex-none min-w-[44px] min-h-[44px] -m-1 p-1 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
      >
        {onde && <span className="absolute inset-0 bg-white/30 rounded-xl motion-safe:animate-ping" aria-hidden="true" />}
        <ImageBlossom />
      </button>
      {ouvert && <BarreModules modules={modules} />}
    </>
  );
}

export function EnTete({ titre, sousTitre, droite, surTitre = 'Mon business plan' }: { titre: ReactNode; sousTitre?: ReactNode; droite?: ReactNode; surTitre?: string | null }) {
  const modules = useModulesCompte();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publier = () => document.documentElement.style.setProperty('--bp-haut', `${Math.round(el.getBoundingClientRect().height)}px`);
    publier();
    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(publier);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <header ref={ref} className="bp-entete sticky top-0 z-30 bg-violet text-white px-4 pb-4">
      <div className="flex items-center gap-3">
        <img src="/plan/logos/nec-logo-v2.png" alt="Nosy Be Entrepreneurship Camp 2026" width={72} height={44} className="h-[44px] w-auto flex-none" onError={cacher} />
        <div className="min-w-0 flex-1">
          {surTitre ? <p className="text-[13px] font-bold tracking-wide uppercase opacity-80 truncate">{surTitre}</p> : null}
          <h1 className="text-[22px] font-bold leading-tight mt-0.5 truncate">{titre}</h1>
          {sousTitre ? <p className="text-[15px] opacity-90 mt-1 leading-snug truncate">{sousTitre}</p> : null}
        </div>
        {droite}
        <div className="bp-logos-droite flex-none">{modules?.length ? <LogoCommutateur modules={modules} /> : <ImageBlossom />}</div>
      </div>
    </header>
  );
}
