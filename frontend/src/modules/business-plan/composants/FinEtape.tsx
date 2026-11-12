// NEC-CC-18 end-of-step screen: when the step of the open section becomes done DURING the visit, a
// full-screen veil with a drawn check mark and a short CSS confetti fall, once per step and per plan
// (localStorage `nec.fetes.<planId>`). Participant view only; offline; no animation under reduced motion.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Plan } from '../types';
import type { IdRubrique } from '../rubriques/registre';
import { etape, etapeDeRubrique, etapesDuPlan, etapesRestantes, lireFetes, noterFete, texteRestantes } from '../etat/journee';

/**
 * Step to celebrate now, or null. A step already done when the page opens (plans finished before this
 * version) is recorded silently: no flood of celebrations after the deployment.
 */
export function useFeteEtape(plan: Plan | null, idRubrique: IdRubrique | undefined, actif: boolean) {
  const [fete, setFete] = useState<number | null>(null);
  const precedent = useRef<{ cle: string; fait: boolean } | null>(null);
  const n = idRubrique ? etapeDeRubrique(idRubrique) : null;
  const fait = plan && n !== null ? etapesDuPlan(plan)[n - 1].fait : false;
  const cle = plan && n !== null ? `${plan.id}:${n}` : '';

  useEffect(() => {
    if (!actif || !plan || n === null) {
      precedent.current = null;
      return;
    }
    const avant = precedent.current;
    precedent.current = { cle, fait };
    if (!fait) return;
    const dejaFetee = lireFetes(plan.id).includes(n);
    if (dejaFetee) return;
    noterFete(plan.id, n);
    // First look at this step in this visit: done before, recorded without a celebration.
    if (!avant || avant.cle !== cle) return;
    if (!avant.fait) setFete(n);
  }, [actif, plan, n, cle, fait]);

  const fermer = useCallback(() => setFete(null), []);
  return { fete, fermer };
}

const COULEURS = ['#0F98A3', '#60005A', '#F2A900'];

function mouvementReduit(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function FinEtape({ plan, n, onFermer }: { plan: Plan; n: number; onFermer: () => void }) {
  const naviguer = useNavigate();
  const bouton = useRef<HTMLButtonElement>(null);
  const lienPdf = useRef<HTMLAnchorElement>(null);
  const [reduit] = useState(mouvementReduit);
  const [confettis, setConfettis] = useState(!reduit);
  const e = etape(n)!;
  const suivante = n < 11 ? etape(n + 1)! : null;
  const restantes = etapesRestantes(plan);
  const fermerRef = useRef(onFermer);
  fermerRef.current = onFermer;

  // Once, when the screen opens.
  useEffect(() => {
    (bouton.current ?? lienPdf.current)?.focus();
    try {
      navigator.vibrate?.(40);
    } catch {
      /* no vibration on this phone */
    }
    const fin = window.setTimeout(() => setConfettis(false), 1700);
    const touche = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') fermerRef.current();
    };
    window.addEventListener('keydown', touche);
    return () => {
      window.clearTimeout(fin);
      window.removeEventListener('keydown', touche);
    };
  }, []);

  const allerSuivante = () => {
    if (!suivante) return;
    onFermer();
    window.scrollTo(0, 0);
    naviguer(`/p/${plan.id}/${suivante.chemin}`);
  };

  return (
    <div className="bp-fete-voile fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onFermer}>
      {confettis ? (
        <div className="bp-confettis pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 20 }, (_, i) => (
            <span
              key={i}
              className="bp-confetti"
              style={
                {
                  left: `${(i * 37) % 100}%`,
                  background: COULEURS[i % COULEURS.length],
                  animationDelay: `${(i % 7) * 0.05}s`,
                  '--bp-derive': `${((i % 5) - 2) * 18}px`
                } as CSSProperties
              }
            />
          ))}
        </div>
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bp-fete-titre"
        className="bp-fete relative w-full max-w-[400px] rounded-2xl bg-white p-5 text-center shadow-xl"
        onClick={(ev) => ev.stopPropagation()}
      >
        <svg viewBox="0 0 60 60" className="mx-auto w-16 h-16" aria-hidden="true">
          <circle className="bp-coche-cercle" cx="30" cy="30" r="26" fill="none" stroke="#0F98A3" strokeWidth="4" />
          <path className="bp-coche-trace" d="M18 31 L26 39 L43 22" fill="none" stroke="#0F98A3" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 id="bp-fete-titre" className="mt-3 text-[26px] font-bold text-violet leading-tight">
          Étape {n} terminée
        </h2>
        {e.points ? <p className="mt-2 text-[16px] text-encre leading-snug">{e.points}</p> : null}
        <p className="mt-2 text-[15px] text-doux">{texteRestantes(restantes)}</p>
        <div className="mt-4 grid gap-2.5">
          {suivante ? (
            <button
              ref={bouton}
              type="button"
              onClick={allerSuivante}
              className="min-h-[52px] rounded-xl bg-violet px-4 text-white text-[16px] font-bold leading-tight active:opacity-90"
            >
              Étape suivante : {suivante.label} ({suivante.fin - suivante.debut} min)
            </button>
          ) : (
            <Link
              ref={lienPdf}
              to={`/p/${plan.id}/exporter`}
              onClick={onFermer}
              className="min-h-[52px] rounded-xl bg-violet px-4 text-white text-[16px] font-bold leading-tight flex items-center justify-center active:opacity-90"
            >
              Prochaine étape : mon PDF
            </Link>
          )}
          <button type="button" onClick={onFermer} className="min-h-[48px] rounded-xl border-2 border-filet text-encre font-bold">
            Rester ici
          </button>
        </div>
      </div>
    </div>
  );
}
