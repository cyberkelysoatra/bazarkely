// "Voir mon canvas": the 9 blocks on one screen. Canvas layout of workbook page 7 from 768 px wide
// (8 7 2 4 1 on top, 6 and 3 under, 9 and 5 at the bottom); stacked in filling order on a phone.
import { useEffect, useRef } from 'react';
import type { Plan } from '../../types';
import { BLOCS, jourFr } from './blocs';

export function Canvas({ plan, fermer }: { plan: Plan; fermer: () => void }) {
  const bouton = useRef<HTMLButtonElement>(null);
  const nom = plan.identite.nomProjet.trim();
  const version = jourFr(plan.m2.versionDu);

  useEffect(() => {
    bouton.current?.focus();
    const racine = document.documentElement;
    const avant = racine.style.overflow;
    racine.style.overflow = 'hidden';
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer();
    };
    window.addEventListener('keydown', touche);
    return () => {
      racine.style.overflow = avant;
      window.removeEventListener('keydown', touche);
    };
  }, [fermer]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="bp-canvas-titre" className="bp-canvas fixed inset-0 z-40 bg-white overflow-y-auto overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-8 bp-entete">
        <div className="flex items-start gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h2 id="bp-canvas-titre" className="text-[22px] font-bold text-violet leading-tight break-words">
              Mon canvas{nom ? ` : ${nom}` : ''}
            </h2>
            {version ? <p className="text-[14px] text-doux mt-0.5">Version du {version}</p> : null}
          </div>
          <button ref={bouton} type="button" onClick={fermer} className="shrink-0 min-h-[44px] px-4 rounded-xl border-2 border-violet text-violet font-bold">
            Fermer
          </button>
        </div>
        <div className="bp-canvas-grille flex flex-col gap-2.5 md:grid md:grid-cols-10 md:grid-rows-[minmax(170px,auto)_minmax(170px,auto)_minmax(130px,auto)] md:gap-2">
          {BLOCS.map((b) => {
            const texte = plan.m2[b.cle].trim();
            return (
              <section key={b.cle} data-bloc={b.n} className={`bp-canvas-bloc min-w-0 rounded-xl border-2 p-3 ${texte ? 'border-filet bg-white' : 'border-dashed border-filet bg-violetClair/40'} ${b.grille}`}>
                <h3 className="flex items-baseline gap-2 text-[15px] font-bold text-violet leading-tight">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-violet text-white text-[13px] flex items-center justify-center">{b.n}</span>
                  <span className="min-w-0 break-words">{b.titre}</span>
                </h3>
                {texte ? (
                  <p className="mt-2 text-[15px] leading-snug text-encre whitespace-pre-wrap break-words">{texte}</p>
                ) : (
                  <p className="mt-2 text-[14px] leading-snug text-doux italic">À travailler</p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
