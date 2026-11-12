// Collapsible help (ⓘ), closed by default.
import { useId, useRef, useState, type ReactNode } from 'react';
import { BoutonEcouter } from './Ecouter';
import { Icone } from './Icones';

export function Aide({ titre = 'Aide', children }: { titre?: string; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const contenu = useRef<HTMLDivElement>(null);
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
        <div ref={contenu} id={id} className="bp-aide flow-root rounded-xl bg-turquoiseClair px-3.5 py-3 text-[15px] leading-relaxed text-encre">
          {/* NEC-CC-23: explanations only, never an example block. */}
          {/^exemple/i.test(titre) ? null : <BoutonEcouter cible={contenu} className="float-right ml-2 mb-1 -mt-1 -mr-1.5" />}
          {children}
        </div>
      ) : null}
    </div>
  );
}
