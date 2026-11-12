// NEC-CC-18 "Ma journée" (contents page, participant plans only): the 12 steps of the day as dots, the
// scheduled one pulsing, the ahead / late badge (refreshed every minute) and the steps left. Offline: pure
// computation on the plan and the phone's clock.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Plan } from '../types';
import { ecart, etapeCourante, etapePrevue, etapesDuPlan, etapesRestantes, texteEcart, texteRestantes } from '../etat/journee';
import { Icone } from './Icones';

const UNE_MINUTE = 60_000;

const TON_BADGE = {
  avance: 'bg-turquoiseClair text-turquoiseTexte border-turquoiseClair',
  heure: 'bg-white text-encre border-filet',
  // Amber of the charter, never red.
  retard: 'bg-[#FFF4DC] text-[#7A4B00] border-[#F2A900]'
} as const;

export function MaJournee({ plan, horloge = () => new Date() }: { plan: Plan; horloge?: () => Date }) {
  const [maintenant, setMaintenant] = useState(() => horloge());
  const rangee = useRef<HTMLOListElement>(null);
  const horlogeRef = useRef(horloge);
  horlogeRef.current = horloge;

  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(horlogeRef.current()), UNE_MINUTE);
    return () => window.clearInterval(id);
  }, []);

  const etapes = etapesDuPlan(plan);
  const courante = etapeCourante(plan);
  const prevue = etapePrevue(maintenant);
  const e = ecart(plan, maintenant);
  const restantes = etapesRestantes(plan);
  const etapeEnCours = etapes.find((x) => x.n === courante)!;

  // The participant's current step scrolled into view inside the row (never moves the page itself).
  useEffect(() => {
    const ol = rangee.current;
    const point = ol?.querySelector<HTMLElement>(`[data-etape="${courante}"]`);
    if (!ol || !point) return;
    ol.scrollLeft = Math.max(0, point.offsetLeft - ol.clientWidth / 2 + point.offsetWidth / 2);
  }, [courante]);

  return (
    <section className="bp-journee rounded-2xl border border-filet bg-white p-4 mb-4" aria-label="Ma journée">
      <h2 className="text-[19px] font-bold text-violet leading-tight">Ma journée</h2>
      <ol ref={rangee} className="bp-points mt-3 -mx-1 px-1 py-2 flex gap-2 overflow-x-auto">
        {etapes.map((x) => {
          const estPrevue = prevue === x.n;
          const estCourante = courante === x.n;
          const fond = x.fait ? 'bg-turquoise text-white border-turquoise' : 'bg-white text-encre';
          const bord = estCourante ? 'border-[3px] border-encre font-bold' : x.fait ? 'border-2' : 'border-2 border-filet';
          const chemin = x.chemin;
          return (
            <li key={x.n} className="shrink-0" data-etape={x.n}>
              <Link
                to={`/p/${plan.id}/${chemin}`}
                aria-label={`Étape ${x.n} : ${x.label}${x.fait ? ', faite' : ''}${estPrevue ? ', prévue maintenant' : ''}`}
                aria-current={estCourante ? 'step' : undefined}
                className={`bp-point w-9 h-9 rounded-full flex items-center justify-center text-[15px] tabular-nums ${fond} ${bord} ${estPrevue ? 'bp-point-prevu bp-pouls' : ''}`}
              >
                {x.fait ? <Icone nom="coche" className="w-5 h-5" /> : x.n}
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="bp-etape-courante mt-2 text-[16px] font-bold text-encre leading-snug">
        Étape {courante} : {etapeEnCours.label}
      </p>
      {e ? (
        <p role="status" className={`bp-badge-ecart bp-badge-${e.sorte} mt-2 inline-block rounded-xl border px-3 py-1.5 text-[15px] font-bold leading-snug ${TON_BADGE[e.sorte]}`}>
          {texteEcart(e)}
        </p>
      ) : null}
      <p className="bp-restantes mt-2 text-[15px] text-doux">{texteRestantes(restantes)}</p>
    </section>
  );
}
