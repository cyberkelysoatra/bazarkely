// Collapsible help (ⓘ), closed by default.
import { useId, useState, type ReactNode } from 'react';
import { Icone } from './Icones';

export function Aide({ titre = 'Aide', children }: { titre?: string; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  return (
    <div className="mb-3">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((o) => !o)}
        className="min-h-[44px] -ml-1 px-1 flex items-center gap-1.5 text-turquoiseTexte font-bold text-[15px]"
      >
        <Icone nom="info" />
        {titre}
      </button>
      {ouvert ? (
        <div id={id} className="bp-aide rounded-xl bg-turquoiseClair px-3.5 py-3 text-[15px] leading-relaxed text-encre">
          {children}
        </div>
      ) : null}
    </div>
  );
}
