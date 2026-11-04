// Shared layout pieces of the module (charter of the validated mockup).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icone } from './Icones';
import { LIEN_WHATSAPP_JOEL } from '../utils/regles';

export const BOUTON = 'min-h-12 rounded-xl text-[16px] font-semibold flex items-center justify-center gap-2 px-4 no-underline cursor-pointer disabled:opacity-60';
export const PRIMAIRE = `${BOUTON} bg-ciel text-white`;
export const SECONDAIRE = `${BOUTON} bg-white text-ciel border-2 border-ciel`;
export const CARTE = 'bg-white border border-filet rounded-[14px] p-4 flex flex-col gap-2.5';

/** Colour of the phone bar = header colour of the current screen (D9). */
export function useCouleurTheme(couleur: string): void {
  useEffect(() => {
    let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!m) {
      m = document.createElement('meta');
      m.name = 'theme-color';
      document.head.appendChild(m);
    }
    m.content = couleur;
  }, [couleur]);
}

/** Page body under the header (max 480 px wide, centred). */
export function Corps({
  children,
  centre = false,
  className = '',
  ...reste
}: {
  children: ReactNode;
  centre?: boolean;
  className?: string;
  [k: `data-${string}`]: string | number;
}) {
  return (
    <main className={`vc-corps flex-1 p-4 flex flex-col gap-3 min-w-0 ${centre ? 'justify-center' : ''} ${className}`} {...reste}>
      {children}
    </main>
  );
}

/**
 * « Retour » line, sticky 6 px under the header; the frosted glass appears only once it is stuck
 * (mockup .backbar / .backbar.stuck).
 */
export function BarreRetour({
  vers = '/',
  libelle = 'Retour',
  surRetour
}: {
  vers?: string;
  libelle?: string;
  /** Called instead of leaving (unsaved changes): `aller` leaves. */
  surRetour?: (aller: () => void) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [colle, setColle] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const surDefilement = () => {
      const el = ref.current;
      const entete = document.querySelector('.vc-entete');
      if (!el || !entete) return;
      setColle(window.scrollY > 0 && el.getBoundingClientRect().top <= entete.getBoundingClientRect().bottom + 7);
    };
    surDefilement();
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
  }, []);
  return (
    <div ref={ref} className={`vc-retour ${colle ? 'vc-colle' : ''}`} data-barre-retour={colle ? 'collee' : 'repos'}>
      <button type="button" onClick={() => (surRetour ? surRetour(() => navigate(vers)) : navigate(vers))} className="flex items-center gap-1.5 min-h-11 px-3 text-ciel text-[15px] font-semibold">
        <Icone nom="retour" epaisseur={2.4} />
        {libelle}
      </button>
    </div>
  );
}

/** Loading skeleton of the cards (never a white screen); after 5 s, the slow network line. */
export function Squelette({ lent }: { lent: boolean }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Chargement" data-squelette="">
      <div className="h-5 w-40 rounded bg-[#dbe7f0] animate-pulse" />
      {[0, 1].map((i) => (
        <div key={i} className={`${CARTE} animate-pulse`}>
          <div className="h-5 w-3/4 rounded bg-[#e2ecf3]" />
          <div className="h-4 w-1/2 rounded bg-[#e2ecf3]" />
          <div className="h-2 w-full rounded-full bg-[#e2ecf3]" />
          <div className="h-12 w-full rounded-xl bg-[#e2ecf3]" />
        </div>
      ))}
      {lent && (
        <p className="text-[14px] text-doux text-center" data-reseau-lent="">
          Le réseau est lent, nous continuons.
        </p>
      )}
    </div>
  );
}

export function BoutonWhatsApp({ className = '' }: { className?: string }) {
  return (
    <a className={`${PRIMAIRE} ${className}`} href={LIEN_WHATSAPP_JOEL} target="_blank" rel="noopener noreferrer" data-whatsapp="">
      <Icone nom="whatsapp" />
      Écrire à Joël sur WhatsApp
    </a>
  );
}

/** Centred message card (states of planche 15 and screen 9). */
export function CarteMessage({ titre, texte, icone = true, children }: { titre?: string; texte: string; icone?: boolean; children?: ReactNode }) {
  return (
    <div className={`${CARTE} items-center text-center gap-3.5`} data-carte-message="">
      {icone && (
        <div className="w-[60px] h-[60px] rounded-full bg-[#fee2e2] text-[#991b1b] flex items-center justify-center">
          <Icone nom="alerte" className="w-[30px] h-[30px]" epaisseur={2.4} />
        </div>
      )}
      {titre && <h1 className="text-[22px] leading-tight font-bold m-0">{titre}</h1>}
      <p className="text-[14px] text-doux leading-[1.45] m-0">{texte}</p>
      {children}
    </div>
  );
}
