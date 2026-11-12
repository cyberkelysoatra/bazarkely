// NEC-CC-13: small "Voir un autre exemple" link at the bottom of an inline example box: lists the other
// sectors; the choice is remembered for this plan on this phone (etat/exempleChoisi.ts).
import { useState } from 'react';
import { EXEMPLES, type ExempleSecteur } from '../data/exemples';

export function AutreExemple({ actuel, choisir }: { actuel: ExempleSecteur; choisir: (secteur: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className="bp-autre-exemple mt-2">
      <button type="button" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} className="min-h-[44px] -ml-1 px-1 text-[14px] text-turquoiseTexte underline">
        {ouvert ? 'Fermer la liste des exemples' : 'Voir un autre exemple'}
      </button>
      {ouvert ? (
        <ul className="mt-1 grid gap-1.5">
          {EXEMPLES.filter((e) => e.secteur !== actuel.secteur).map((e) => (
            <li key={e.secteur}>
              <button
                type="button"
                onClick={() => {
                  choisir(e.secteur);
                  setOuvert(false);
                }}
                className="w-full min-h-[44px] rounded-lg border border-turquoise/40 bg-white px-3 text-left text-[15px] text-encre break-words"
              >
                <span className="font-bold">{e.libelleSecteur}</span> : {e.nom}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
