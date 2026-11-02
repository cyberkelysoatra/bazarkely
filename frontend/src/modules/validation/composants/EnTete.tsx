// Header of the module (VC-17, charter of the validated mockup): white 64 px square « 1saKELY »
// on the left, title on ONE line fitted by measuring (22 px max, 11 px min, recomputed on resize),
// « pour ... » bottom-aligned (2 lines max), account circle (44 px) on the right.
// Variants: 'client' (signed in), 'invitation' (screen 1, no circle), 'neutre' (screen 9 and
// signed-out screens: « Espace de validation CyberKELY » only, bold 22 px, may wrap).
import { useLayoutEffect, useRef } from 'react';
import { initiales } from '../utils/regles';
import { ouvrirMenu, useMenuOuvert, fermerMenu } from '../appels/menu';
import MenuCompte from './MenuCompte';

export function Carre() {
  return (
    <div className="w-16 h-16 flex-none bg-white rounded-xl flex items-center justify-center" aria-label="1saKELY" role="img">
      <span className="text-[13px] font-extrabold text-ciel tracking-[-0.01em] leading-none" aria-hidden="true">
        <span className="relative inline-block">
          1<span className="absolute -top-1 left-1/2 -ml-px w-[3px] h-[3px] rounded-full bg-current" />
        </span>
        saKELY
      </span>
    </div>
  );
}

/** Largest font size (22 → 11 px, by 0.5) for which the text fits on its line. */
export function ajusterTitre(el: HTMLElement): number {
  let s = 22;
  el.style.fontSize = `${s}px`;
  const tient = () => {
    const r = document.createRange();
    r.selectNodeContents(el);
    return r.getBoundingClientRect().width <= el.clientWidth - 2;
  };
  while (!tient() && s > 11) {
    s -= 0.5;
    el.style.fontSize = `${s}px`;
  }
  return s;
}

interface Props {
  variante: 'client' | 'invitation' | 'neutre';
  titre?: string;
  sousTitre?: string;
  /** Name shown on the circle and in the menu. */
  nom?: string;
  email?: string;
}

export default function EnTete({ variante, titre = '', sousTitre = '', nom = '', email = '' }: Props) {
  const titreRef = useRef<HTMLParagraphElement>(null);
  const enteteRef = useRef<HTMLElement>(null);
  const menuOuvert = useMenuOuvert();

  useLayoutEffect(() => {
    const ajuster = () => {
      if (titreRef.current) ajusterTitre(titreRef.current);
      // Height of the sticky header, read by the sticky « Retour » line (.vc-retour).
      if (enteteRef.current) document.documentElement.style.setProperty('--vc-hdr', `${enteteRef.current.offsetHeight}px`);
    };
    ajuster();
    window.addEventListener('resize', ajuster);
    document.fonts?.ready.then(ajuster).catch(() => undefined);
    return () => window.removeEventListener('resize', ajuster);
  }, [titre, sousTitre, variante]);

  return (
    <header ref={enteteRef} className="vc-entete sticky top-0 z-30 bg-ciel text-white px-4 pb-3.5" data-entete={variante}>
      <div className="flex items-stretch gap-3">
        <Carre />
        {variante === 'neutre' ? (
          <div className="flex-1 min-w-0 min-h-16 flex flex-col justify-start">
            <p className="text-[22px] font-bold leading-[1.2] m-0" data-titre="">
              Espace de validation CyberKELY
            </p>
          </div>
        ) : (
          <div className="flex-1 min-w-0 min-h-16 flex flex-col justify-between gap-1">
            <p ref={titreRef} className="font-bold leading-[1.2] m-0 whitespace-nowrap overflow-hidden" style={{ fontSize: 22 }} data-titre="">
              {titre}
            </p>
            {sousTitre && (
              <p className="text-[13px] leading-[1.3] m-0 text-clair vc-deux-lignes" data-sous-titre="">
                {sousTitre}
              </p>
            )}
          </div>
        )}
        {variante === 'client' && (
          <button
            type="button"
            onClick={() => (menuOuvert ? fermerMenu() : ouvrirMenu())}
            aria-label="Menu du compte"
            aria-expanded={menuOuvert}
            className="w-11 h-11 flex-none self-start rounded-full bg-white text-ciel border-2 border-[#bae6fd] flex items-center justify-center text-[15px] font-bold"
            data-rond-compte=""
          >
            {initiales(nom)}
          </button>
        )}
      </div>
      {variante === 'client' && menuOuvert && <MenuCompte nom={nom} email={email} />}
    </header>
  );
}
