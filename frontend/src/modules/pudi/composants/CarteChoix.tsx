// Card of a programme or proposal in the voting path (specification v9, 4.3 bis and 4.5).
// Votes (PUDI-CC-17): a « − n + » stepper at the bottom of the card, and a tap anywhere else on
// the card adds one vote (13th refused with a message). The separate « Détails » link opens the
// sheet without changing the choice; it is never nested in another control.
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { voixPour } from '../utils/regles';
import { MessageBlocage, useBasculeChoix } from './BoutonsChoix';
import { Icone } from './Icones';
import { CompteurVoix } from './Voix';

/** Coming back from the sheet uses the history (same scroll position, same checks). */
export const ETAT_DEPUIS_LISTE = { depuisListe: true } as const;

export function CarteChoix({
  id,
  titre,
  details,
  desactive = false,
  className = '',
  style,
  etiquette,
  pied,
  children
}: {
  id: string;
  titre: string;
  details: string;
  desactive?: boolean;
  className?: string;
  style?: CSSProperties;
  /** PUDI-CC-16.4: main badge (sector, tranche or « Proposition »), top right above « Détails ». */
  etiquette?: ReactNode;
  /** PUDI-CC-17: last line of the card (cost, date), beside the votes stepper so the card stays short. */
  pied?: ReactNode;
  children?: ReactNode;
}) {
  const { brouillon, ajouter, retirer, message } = useBasculeChoix();
  const n = voixPour(brouillon, id);
  const actif = n > 0;
  const toucher = () => {
    if (!desactive) ajouter(id);
  };
  // The right column floats over the top right corner; a spacer of its size, floated at the start
  // of the content, makes the title wrap beside it while the lines below take the full width.
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
  const contenu = (
    <div className="flex-1 min-w-0 flow-root">
      <span aria-hidden="true" className="float-right" style={{ width: place.l, height: place.h }} data-place-colonne="" />
      {children}
      <div className="mt-2 clear-right flex items-center gap-3" data-ligne-voix="">
        <CompteurVoix titre={titre} n={n} ajouter={() => ajouter(id)} retirer={() => retirer(id)} desactive={desactive} />
        {pied && <div className="min-w-0 flex-1">{pied}</div>}
      </div>
    </div>
  );
  return (
    <li data-carte-choix={id} data-voix-carte={n}>
      <div className={`relative rounded-xl select-none ${className} ${actif ? '!border-marine shadow-md' : ''}`} style={style}>
        {/* The card body only adds a vote on a tap (pointer shortcut); keyboard and screen
            readers use the « − » and « + » buttons, so the body is not a control of its own. */}
        <div onClick={toucher} className={`rounded-xl p-3 flex ${desactive ? 'cursor-default' : 'cursor-pointer'}`} data-corps-carte="">
          {contenu}
        </div>
        {/* PUDI-CC-17 retouch: badge (line 1) and « Détails » (line 2) one normal line break apart,
            same right edge; « Détails » keeps a 44 x 44 px target through an invisible area below
            its text (never over the badge, whose tap still adds a vote). */}
        <div
          ref={colonne}
          className={`absolute top-0 right-0 max-w-[45%] pt-3 pr-1.5 flex flex-col items-end gap-0 ${desactive ? 'cursor-default' : 'cursor-pointer'}`}
          onClick={toucher}
        >
          {etiquette && (
            // Own click handler: Chrome's touch adjustment would otherwise move a tap on the badge
            // to the nearby « Détails » link (its parent column is an ancestor of the link).
            <div
              className="flex justify-end text-right pr-1.5"
              onClick={(e) => {
                e.stopPropagation();
                toucher();
              }}
              data-etiquette=""
            >
              {etiquette}
            </div>
          )}
          <Link
            to={details}
            state={ETAT_DEPUIS_LISTE}
            onClick={(e) => e.stopPropagation()}
            className="relative mr-1.5 p-0 leading-snug inline-flex items-center gap-0.5 text-marine font-bold text-[0.875rem] underline underline-offset-2 decoration-[#9AA3BD] whitespace-nowrap rounded before:absolute before:content-[''] before:top-0 before:h-[46px] before:-inset-x-2"
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
