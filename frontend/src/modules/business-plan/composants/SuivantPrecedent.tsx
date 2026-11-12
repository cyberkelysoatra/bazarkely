// "‹ Précédent" / "Suivant ›" row at the bottom of every section page (NEC-CC-11), in RUBRIQUES order.
// A page with internal steps (module 5: 5a to 5f) registers them with useEtapesInternes(): the row then
// walks those steps first, and only leaves the page from its last (or first) step. Pure client navigation.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { RUBRIQUES, type Rubrique } from '../rubriques/registre';

/** Internal steps of a page: labels of the neighbouring steps (null = leave the page) and the moves. */
export interface EtapesInternes {
  suivante: string | null;
  precedente: string | null;
  avancer: () => void;
  reculer: () => void;
}

/** Navigation state set by the row: the next page knows it was reached by "Précédent". */
export interface EtatNavigation {
  bpDepuis?: 'suivant' | 'precedent';
}

const ContexteEtapes = createContext<((e: EtapesInternes | null) => void) | null>(null);

/** Called by a page with internal steps; the row reads them while the page is mounted. */
export function useEtapesInternes(etapes: EtapesInternes) {
  const publier = useContext(ContexteEtapes);
  const { suivante, precedente, avancer, reculer } = etapes;
  useEffect(() => {
    publier?.({ suivante, precedente, avancer, reculer });
  }, [publier, suivante, precedente, avancer, reculer]);
  useEffect(() => () => publier?.(null), [publier]);
}

/** "Module 4. Stratégie..." -> "Module 4"; other titles unchanged. */
function titreCourt(r: Rubrique): string {
  return /^(Module \d+)\./.exec(r.titre)?.[1] ?? r.titre;
}

export function FournisseurEtapes({ planId, chemin, children }: { planId: string; chemin: string; children: ReactNode }) {
  const [interne, setInterne] = useState<EtapesInternes | null>(null);
  const naviguer = useNavigate();
  const i = RUBRIQUES.findIndex((r) => r.chemin === chemin);
  const avant = i > 0 ? RUBRIQUES[i - 1] : null;
  const apres = i >= 0 && i < RUBRIQUES.length - 1 ? RUBRIQUES[i + 1] : null;

  const aller = (vers: string, depuis: EtatNavigation['bpDepuis']) => {
    window.scrollTo(0, 0);
    naviguer(vers, { state: { bpDepuis: depuis } satisfies EtatNavigation });
  };
  const suivant = () => {
    if (interne?.suivante) return interne.avancer();
    aller(apres ? `/p/${planId}/${apres.chemin}` : `/p/${planId}`, 'suivant');
  };
  const precedent = () => {
    if (interne?.precedente) return interne.reculer();
    if (avant) aller(`/p/${planId}/${avant.chemin}`, 'precedent');
  };
  const libelleSuivant = interne?.suivante ? `Suivant : ${interne.suivante}` : apres ? `Suivant : ${titreCourt(apres)}` : 'Retour au sommaire';
  const avecPrecedent = !!interne?.precedente || !!avant;

  return (
    <ContexteEtapes.Provider value={setInterne}>
      {children}
      {/* With internal steps the row stays stuck above the bottom nav: tapping it never needs a scroll to the page end. */}
      <div className={`bp-suivant-precedent mt-6 flex gap-2.5 ${interne ? 'bp-suivant-colle' : ''}`}>
        {avecPrecedent ? (
          <button
            type="button"
            onClick={precedent}
            className="shrink-0 min-h-[52px] px-4 rounded-xl border-2 border-violet text-violet text-[16px] font-bold active:bg-violetClair"
          >
            ‹ Précédent
          </button>
        ) : null}
        <button
          type="button"
          onClick={suivant}
          className="flex-1 min-w-0 min-h-[52px] px-4 rounded-xl bg-violet text-white text-[16px] font-bold leading-tight active:opacity-90"
        >
          {libelleSuivant} ›
        </button>
      </div>
    </ContexteEtapes.Provider>
  );
}
