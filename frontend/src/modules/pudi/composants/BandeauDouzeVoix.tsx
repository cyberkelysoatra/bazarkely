// PUDI-CC-17 (specification v9 4.5): a voter whose vote was sent before the 12-vote rule (3 votes)
// is told he may place the remaining votes; his vote stays counted as it is if he does nothing.
// Shown until he sends again, dismissable for the visit. Lazy chunk (shown to few people).
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { frPages } from '../i18n/frPages';
import { dateCourte } from '../utils/format';
import { VOIX } from '../utils/regles';
import { Icone } from './Icones';

const CLE = 'pudi_douze_voix_ferme';

function ferme(): boolean {
  try {
    return sessionStorage.getItem(CLE) === '1';
  } catch {
    return false;
  }
}

export default function BandeauDouzeVoix({ utilisees, date }: { utilisees: number; date: string }) {
  const [cache, setCache] = useState(ferme);
  if (cache) return null;
  const fermer = () => {
    try {
      sessionStorage.setItem(CLE, '1');
    } catch {
      /* memory only */
    }
    setCache(true);
  };
  return (
    <div role="status" className="border-l-4 border-marine bg-[#EAF0FF] rounded-r-lg px-3 py-2.5 flex gap-2.5 items-start shadow-sm" data-bandeau-douze-voix="">
      <Icone nom="etoile" className="w-5 h-5 mt-0.5 text-marine shrink-0" />
      <div className="flex-1 min-w-0 text-[0.9375rem] leading-snug space-y-1.5">
        <p className="font-bold">{frPages.voix.banniere(VOIX - utilisees)}</p>
        <p>{frPages.voix.banniereTexte(dateCourte(date))}</p>
        <Link to="/choix" className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl bg-marine text-white font-bold text-[0.9375rem]" data-completer-vote="">
          <Icone nom="crayon" className="w-4 h-4" />
          {frPages.voix.completer}
        </Link>
      </div>
      <button
        type="button"
        onClick={fermer}
        aria-label={frPages.voix.fermer}
        className="shrink-0 -my-1 -mr-1 w-11 h-11 inline-flex items-center justify-center text-marine"
        data-fermer-douze-voix=""
      >
        <Icone nom="croix" className="w-5 h-5" />
      </button>
    </div>
  );
}
