// Card of a section or subsection (white, or light violet / light turquoise for results).
import type { ReactNode } from 'react';

export function Carte({
  titre,
  sousTitre,
  ton = 'blanc',
  children,
  id,
  className = ''
}: {
  titre?: ReactNode;
  sousTitre?: ReactNode;
  ton?: 'blanc' | 'violet' | 'turquoise';
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  const fond = ton === 'violet' ? 'bg-violetClair border-violetClair' : ton === 'turquoise' ? 'bg-turquoiseClair border-turquoiseClair' : 'bg-white border-filet';
  return (
    <section id={id} className={`rounded-2xl border ${fond} p-4 mb-4 ${className}`}>
      {titre ? <h2 className="text-[19px] font-bold text-violet leading-tight">{titre}</h2> : null}
      {sousTitre ? <p className="text-[14px] text-doux mt-1 mb-1">{sousTitre}</p> : null}
      <div className={titre ? 'mt-3' : ''}>{children}</div>
    </section>
  );
}

/** One computed result line: label on the left, value on the right (wraps on small screens). */
export function Resultat({ label, valeur, fort = false }: { label: ReactNode; valeur: ReactNode; fort?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 py-1.5">
      <span className={`text-[15px] ${fort ? 'font-bold text-encre' : 'text-encre'}`}>{label}</span>
      <span className={`tabular-nums ml-auto text-right ${fort ? 'text-[18px] font-bold text-violet' : 'font-bold text-encre'}`}>{valeur}</span>
    </div>
  );
}
