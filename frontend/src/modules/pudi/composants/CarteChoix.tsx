// Card of a programme or proposal in the voting path (specification v8, 4.3 bis): tapping the
// card checks or unchecks it (same rules as the box: 3 priorities, 10 urgents), the separate
// « Détails » link opens the sheet without changing the choice. For screen readers the card is a
// checkbox labelled by its title and « Détails » a link of its own (siblings, never nested).
import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { MessageBlocage, useBasculeChoix } from './BoutonsChoix';
import { Icone } from './Icones';

/** Coming back from the sheet uses the history (same scroll position, same checks). */
export const ETAT_DEPUIS_LISTE = { depuisListe: true } as const;

export function CarteChoix({
  id,
  titre,
  details,
  mode = 'priorite',
  desactive = false,
  className = '',
  style,
  etiquette,
  children
}: {
  id: string;
  titre: string;
  details: string;
  mode?: 'priorite' | 'urgent';
  desactive?: boolean;
  className?: string;
  style?: CSSProperties;
  /** PUDI-CC-16.4: main badge (sector, tranche or « Proposition »), top right above « Détails ». */
  etiquette?: ReactNode;
  children?: ReactNode;
}) {
  const { brouillon, priorite, urgent, message } = useBasculeChoix();
  const actif = (mode === 'priorite' ? brouillon.priorites : brouillon.urgents).includes(id);
  const basculer = () => {
    if (desactive) return;
    (mode === 'priorite' ? priorite : urgent)(id);
  };
  const clavier = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      basculer();
    }
  };
  const couleur = mode === 'priorite' ? 'bg-marine border-marine' : 'bg-[#B85317] border-[#B85317]';
  // The right column floats over the top right corner; a spacer of its size, floated at the start of
  // the content, makes the title wrap beside it while the lines below take the full width.
  const colonne = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ l: number; h: number }>({ l: 0, h: 0 });
  useLayoutEffect(() => {
    const el = colonne.current;
    if (!el) return;
    const mesurer = () => setPlace({ l: Math.max(0, el.offsetWidth - 8), h: Math.max(0, el.offsetHeight - 12) });
    mesurer();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <li data-carte-choix={id}>
      {/* PUDI-CC-16.4: checkbox, then the title (wrapping), and top right the main badge (line 1)
          with « Détails » under it (line 2). « Détails » is a sibling of the checkbox, never inside
          it; a tap anywhere else on the card, the badge included, toggles. */}
      <div className={`relative rounded-xl select-none ${className} ${actif ? '!border-marine shadow-md' : ''}`} style={style}>
        <div
          role="checkbox"
          aria-checked={actif}
          aria-disabled={desactive || undefined}
          aria-label={titre}
          tabIndex={0}
          onClick={basculer}
          onKeyDown={clavier}
          className={`pudi-focus min-h-[44px] rounded-xl p-3 flex gap-3 items-start ${desactive ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <span
            aria-hidden="true"
            className={`shrink-0 w-8 h-8 mt-0.5 rounded-lg border-2 flex items-center justify-center ${
              actif ? `${couleur} text-white` : 'bg-white border-[#9AA3BD] text-transparent'
            } ${desactive ? 'opacity-50' : ''}`}
          >
            <Icone nom="coche" className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0 flow-root">
            <span aria-hidden="true" className="float-right" style={{ width: place.l, height: place.h }} data-place-colonne="" />
            {children}
          </div>
        </div>
        <div
          ref={colonne}
          className={`absolute top-0 right-0 max-w-[45%] pt-3 pr-1.5 flex flex-col items-end gap-0.5 ${desactive ? 'cursor-default' : 'cursor-pointer'}`}
          onClick={basculer}
        >
          {etiquette && (
            <div className="flex justify-end text-right pr-1.5" data-etiquette="">
              {etiquette}
            </div>
          )}
          <Link
            to={details}
            state={ETAT_DEPUIS_LISTE}
            onClick={(e) => e.stopPropagation()}
            className="min-h-[44px] min-w-[44px] px-3 rounded-lg inline-flex items-center justify-center gap-1 text-marine font-bold text-[0.875rem] underline underline-offset-2 decoration-[#9AA3BD] whitespace-nowrap"
            aria-label={`${fr.carte.details} : ${titre}`}
            data-details=""
          >
            {fr.carte.details}
            <Icone nom="droite" className="w-4 h-4" />
          </Link>
        </div>
      </div>
      {message?.id === id && <MessageBlocage texte={message.texte} />}
    </li>
  );
}
