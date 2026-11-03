// Three choice cards of a question (VC-04, screens 4 and 5, mockup Client-Carte « choice »):
// recommended first with « Conseillé », no choice preselected (RM13), one visible line each,
// « Pourquoi ? » opening advantages and weaknesses as a drawer sliding under the card (520 ms ease
// in and out) while the page scrolls gently to put the card under the « Retour » line; « Masquer »
// closes; one drawer open at a time; opening it never selects. Shared by the client question
// screens and the pilotage preview (outside the pilotage chunk).
import { useState } from 'react';
import type { ChoixClient } from '../utils/types';
import { Icone } from './Icones';
import { aChoisi } from '../utils/regles';

type Choix = Pick<ChoixClient, 'id' | 'lettre' | 'nature' | 'libelle' | 'ligne' | 'avantages' | 'faiblesses' | 'conseille'>;

const COURBE = 'cubic-bezier(0.32, 0.72, 0, 1)';

/** Recommended first, then by letter (same order as vc_questionnaire). */
export function ordonnerChoix<C extends Pick<Choix, 'conseille' | 'lettre'>>(choix: C[]): C[] {
  return [...choix].sort((a, b) => Number(b.conseille) - Number(a.conseille) || a.lettre.localeCompare(b.lettre));
}

/** Gentle scroll (560 ms, ease in and out) placing the card right under the « Retour » line. */
export function placerSousRetour(el: Element | null): void {
  if (!el) return;
  const entete = document.querySelector('.vc-entete');
  const retour = document.querySelector('.vc-retour');
  const haut = (entete?.getBoundingClientRect().bottom ?? 0) + 6 + (retour instanceof HTMLElement ? retour.offsetHeight : 0) + 10;
  const depart = window.scrollY;
  const arrivee = Math.max(0, depart + el.getBoundingClientRect().top - haut);
  const duree = 560;
  const t0 = performance.now();
  const courbe = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pas = (maintenant: number) => {
    const t = Math.min(1, (maintenant - t0) / duree);
    window.scrollTo(0, depart + (arrivee - depart) * courbe(t));
    if (t < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

interface Props {
  choix: Choix[];
  /** Selected choice id (null: none, RM13). */
  selection: string | null;
  onChoisir?: (c: Choix) => void;
  /** Accessible label of each card (preview: « passer à la suite »). */
  libelleAction?: (c: Choix) => string;
  desactive?: boolean;
  /** Validant only: choice id → first names of the colleagues who chose it (VC-14). */
  votants?: Record<string, string[]>;
}

export default function ChoixQuestion({ choix, selection, onChoisir, libelleAction, desactive = false, votants }: Props) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  return (
    <div role="radiogroup" aria-label="Votre réponse" className="flex flex-col gap-2.5" data-choix-question="">
      {ordonnerChoix(choix).map((c) => {
        const choisi = selection === c.id;
        const estOuvert = ouvert === c.id;
        const detail = !!(c.avantages || c.faiblesses);
        return (
          <div key={c.id} className="flex flex-col" data-choice={c.id}>
            <div
              className={`relative z-[1] flex gap-3 items-start rounded-xl px-3.5 py-3 min-h-[52px] ${choisi ? 'border-2 border-ciel bg-fond' : 'border border-[#cbd5e1] bg-white'}`}
              data-carte-choix={c.lettre}
              data-choisi={choisi ? 'oui' : 'non'}
            >
              <button
                type="button"
                role="radio"
                aria-checked={choisi}
                disabled={desactive}
                className="absolute inset-0 rounded-xl cursor-pointer disabled:cursor-default"
                aria-label={libelleAction ? libelleAction(c) : c.libelle}
                onClick={() => onChoisir?.(c)}
                data-choisir={c.lettre}
              />
              <span className={`w-5 h-5 rounded-full flex-none mt-0.5 box-border ${choisi ? 'border-[6px] border-ciel' : 'border-2 border-[#64748b]'}`} aria-hidden="true" />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex gap-2 items-center flex-wrap">
                  <strong className="text-[15px]">{c.libelle}</strong>
                  {c.conseille && (
                    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#166534]" data-conseille="">
                      Conseillé
                    </span>
                  )}
                </div>
                {c.ligne && <p className={`text-[13px] m-0 ${c.nature === 'refus' ? 'text-[#991b1b]' : 'text-doux'}`}>{c.ligne}</p>}
                {!!votants?.[c.id]?.length && (
                  <span className="self-start inline-flex items-center gap-1 text-[12px] font-semibold text-[#5b21b6] bg-[#ede9fe] rounded-full px-[9px] py-[3px] mt-0.5" data-votants={c.lettre}>
                    <Icone nom="equipe" epaisseur={2.2} className="w-3.5 h-3.5" />
                    {aChoisi(votants[c.id])}
                  </span>
                )}
                {detail && (
                  <button
                    type="button"
                    className="relative self-start py-1.5 min-h-8 text-[13px] font-semibold text-ciel underline"
                    aria-expanded={estOuvert}
                    aria-controls={`volet-${c.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOuvert(estOuvert ? null : c.id);
                      if (!estOuvert) placerSousRetour(e.currentTarget.closest('[data-choice]'));
                    }}
                    data-pourquoi={c.lettre}
                  >
                    {estOuvert ? 'Masquer' : 'Pourquoi ?'}
                  </button>
                )}
              </div>
            </div>
            {detail && (
              <div
                className="grid"
                style={{ gridTemplateRows: estOuvert ? '1fr' : '0fr', transition: `grid-template-rows 520ms ${COURBE}` }}
                data-volet-cadre={c.lettre}
                data-ouvert={estOuvert ? 'oui' : 'non'}
              >
                <div className="overflow-hidden min-h-0">
                  <div
                    id={`volet-${c.id}`}
                    aria-hidden={!estOuvert}
                    className="-mt-3 mx-2.5 pt-[22px] px-3.5 pb-3.5 bg-clair border border-[#bae6fd] border-t-0 rounded-b-xl text-[13px] text-nuit leading-normal flex flex-col gap-1.5"
                    style={{
                      transform: estOuvert ? 'translateY(0)' : 'translateY(-24px)',
                      opacity: estOuvert ? 1 : 0,
                      transition: `transform 520ms ${COURBE}, opacity 360ms ease`
                    }}
                    data-volet={c.lettre}
                  >
                    {c.avantages && (
                      <p className="m-0">
                        <strong>Avantages</strong> : {c.avantages}
                      </p>
                    )}
                    {c.faiblesses && (
                      <p className="m-0">
                        <strong>Faiblesses</strong> : {c.faiblesses}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
