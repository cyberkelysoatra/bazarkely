// PUDI-CC-17 (specification v9 4.5): « − n + » stepper of the votes placed on a programme or a
// proposal, and the 12-dot gauge. Buttons keep a 44 px touch target (invisible enlarged area when
// drawn smaller); the count is announced to screen readers. Used by lazy pages only.
import { frPages } from '../i18n/frPages';
import { VOIX } from '../utils/regles';
import { Icone } from './Icones';

export function CompteurVoix({
  titre,
  n,
  ajouter,
  retirer,
  desactive = false,
  grand = false
}: {
  titre: string;
  n: number;
  ajouter: () => void;
  retirer: () => void;
  desactive?: boolean;
  /** Programme or proposal sheet: real 48 px buttons. */
  grand?: boolean;
}) {
  const taille = grand ? 'w-12 h-12' : 'w-8 h-8';
  const zone = grand ? '' : "before:absolute before:content-[''] before:-inset-[6px]";
  const bouton = `relative ${taille} ${zone} shrink-0 rounded-full border-2 inline-flex items-center justify-center disabled:opacity-40`;
  return (
    <div role="group" aria-label={titre} className="inline-flex items-center gap-2" data-compteur-voix={n}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          retirer();
        }}
        disabled={desactive || n === 0}
        aria-label={frPages.voix.retirer(titre)}
        className={`${bouton} border-marine text-marine bg-white`}
        data-voix-moins=""
      >
        <Icone nom="moins" className={grand ? 'w-6 h-6' : 'w-4 h-4'} />
      </button>
      <span
        aria-live="polite"
        className={`min-w-[2.75rem] text-center font-titre leading-none ${grand ? 'text-[1.5rem]' : 'text-[1.125rem]'} ${n ? 'text-marine' : 'text-gris'}`}
        data-voix-nombre=""
      >
        {n}
        <span className={grand ? 'text-[0.875rem] font-sans font-bold ml-1' : 'sr-only'}>{frPages.voix.unite(n)}</span>
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          ajouter();
        }}
        disabled={desactive}
        aria-label={frPages.voix.ajouter(titre)}
        className={`${bouton} border-marine bg-marine text-white`}
        data-voix-plus=""
      >
        <Icone nom="plus" className={grand ? 'w-6 h-6' : 'w-4 h-4'} />
      </button>
    </div>
  );
}

/** 12 dots, one per vote: filled for the votes placed. Decorative, the text says the same. */
export function JaugeVoix({ n, clair = false }: { n: number; clair?: boolean }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-[3px] align-middle" data-jauge-voix={n}>
      {Array.from({ length: VOIX }, (_, i) => (
        <span
          key={i}
          className={`w-[7px] h-[7px] rounded-full ${
            i < n ? (clair ? 'bg-white' : 'bg-marine') : clair ? 'bg-white/30' : 'bg-white border border-[#9AA3BD]'
          }`}
        />
      ))}
    </span>
  );
}
