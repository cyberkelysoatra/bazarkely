// Card of a programme or proposal in the voting path (specification v9, 4.3 bis and 4.5).
// Votes (PUDI-CC-17): a « − n + » stepper at the bottom of the card, and a tap anywhere else on
// the card adds one vote. The separate « Détails » link opens the sheet without changing the
// choice; it is never nested in another control.
// PUDI-CC-19: the badge and « Détails » sit on the line of the stepper, right-aligned, so the title
// takes the full width of the card; the last line (cost, date) goes under the title. With the 12
// votes placed, « + » unfolds the quick transfer panel under the card (animated, PUDI-CC-20).
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { voixPour } from '../utils/regles';
import { useBasculeChoix } from './BoutonsChoix';
import { Icone } from './Icones';
import { TransfertDeroulant } from './Transfert';
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
  /** PUDI-CC-16.4: main badge (sector, tranche or « Proposition »), on the stepper line before « Détails ». */
  etiquette?: ReactNode;
  /** PUDI-CC-17: last line of the card (cost, date), under the title since PUDI-CC-19. */
  pied?: ReactNode;
  children?: ReactNode;
}) {
  const { brouillon, ajouter, retirer, plein, fermerPlein } = useBasculeChoix();
  const n = voixPour(brouillon, id);
  const actif = n > 0;
  // Badge above « Détails » (not enough room before it): the little column rises into the free
  // space under the title (8 px, the title is never covered) so the card grows as little as possible.
  const colonne = useRef<HTMLDivElement>(null);
  const [empile, setEmpile] = useState(false);
  useLayoutEffect(() => {
    const el = colonne.current;
    if (!el) return;
    const mesurer = () => {
      const [a, z] = [el.firstElementChild, el.lastElementChild] as (HTMLElement | null)[];
      setEmpile(!!a && !!z && a !== z && z.offsetTop > a.offsetTop + 2);
    };
    mesurer();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const toucher = () => {
    if (!desactive) ajouter(id);
  };
  return (
    <li data-carte-choix={id} data-voix-carte={n}>
      <div className={`relative rounded-xl select-none ${className} ${actif ? '!border-marine shadow-md' : ''}`} style={style}>
        {/* The card body only adds a vote on a tap (pointer shortcut); keyboard and screen
            readers use the « − » and « + » buttons, so the body is not a control of its own. */}
        <div onClick={toucher} className={`rounded-xl p-3 ${desactive ? 'cursor-default' : 'cursor-pointer'}`} data-corps-carte="">
          {/* The last line (cost, date) follows the title in the same paragraph: on its last line
              when there is room, as a whole on the next line otherwise. */}
          {pied ? (
            // Same line height as the titles (1rem, snug), so the inline lines are not taller.
            <div className="leading-snug [&>p]:inline" data-bloc-titre="">
              {children}{' '}
              <span className="inline-block max-w-full align-baseline" data-pied="">
                {pied}
              </span>
            </div>
          ) : (
            <div data-bloc-titre="">{children}</div>
          )}
          <div className={`${pied ? 'mt-1.5' : 'mt-2'} flex items-center gap-2`} data-ligne-voix="">
            <CompteurVoix titre={titre} n={n} ajouter={() => ajouter(id)} retirer={() => retirer(id)} desactive={desactive} />
            <div
              ref={colonne}
              className={`ml-auto min-w-0 flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 text-right ${empile ? (pied ? '-mt-1.5' : '-mt-2') : ''}`}
              data-colonne-droite={empile ? 'empilee' : 'ligne'}
            >
              {etiquette && (
                // Own click handler and above the « Détails » target: Chrome's touch adjustment
                // would otherwise move a tap on the badge to the nearby link.
                <div
                  className="relative z-10 flex justify-end text-right leading-snug"
                  onClick={(e) => {
                    e.stopPropagation();
                    toucher();
                  }}
                  data-etiquette=""
                >
                  {etiquette}
                </div>
              )}
              {/* 44 x 44 px target through an invisible area around the text, larger downwards
                  (card padding and the gap under the card) so it stays 44 px tall when the badge
                  sits above it; never over the badge (drawn above it) nor over the stepper. */}
              <Link
                to={details}
                state={ETAT_DEPUIS_LISTE}
                onClick={(e) => e.stopPropagation()}
                className="relative p-0 leading-snug inline-flex items-center gap-0.5 text-marine font-bold text-[0.875rem] underline underline-offset-2 decoration-[#9AA3BD] whitespace-nowrap rounded before:absolute before:content-[''] before:-top-[6px] before:-bottom-[21px] before:-inset-x-2"
                aria-label={`${fr.carte.details} : ${titre}`}
                data-details=""
              >
                {fr.carte.details}
                <Icone nom="droite" className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <TransfertDeroulant ouvert={plein === id} vers={id} titreVers={titre} fermer={fermerPlein} />
    </li>
  );
}
