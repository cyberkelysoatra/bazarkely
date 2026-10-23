// « Envoyer mon vote » bar of the voting path (specification v8, 4.3 bis), above the bottom bar,
// replacing the old « Suivant ». Translucent while nothing is checked (still announced to screen
// readers), fully visible from the first check. Fewer than 3 priorities: nothing is sent, « Mon
// choix » opens on the priorities with « Encore N priorité(s) à choisir ». Own lazy chunk.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { usePudi } from '../PudiContexte';
import { MAX_PRIORITES } from '../utils/regles';
import { tempsRestant, texteRestant } from '../utils/format';
import { Icone } from './Icones';

export default function BarreVote() {
  const { brouillon, clotureAt, decalage } = usePudi();
  const navigate = useNavigate();
  const n = brouillon.priorites.length;
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(Date.now()), 60000);
    document.body.classList.add('pudi-barre-vote');
    return () => {
      window.clearInterval(id);
      document.body.classList.remove('pudi-barre-vote');
    };
  }, []);
  const court = texteRestant(tempsRestant(Date.parse(clotureAt), maintenant + decalage));
  const envoyer = () => {
    if (n < MAX_PRIORITES) navigate('/choix', { state: { relance: Date.now() } });
    else navigate('/envoyer');
  };
  return (
    <div
      className="fixed left-0 right-0 z-30 px-3 pb-2 pointer-events-none"
      style={{ bottom: 'calc(57px + env(safe-area-inset-bottom, 0px))' }}
      data-barre-vote=""
    >
      <div className="mx-auto max-w-2xl pr-[6px] pointer-events-auto">
        {court && (
          <p className="mb-1 mx-auto w-fit rounded-full bg-white/95 border border-filet px-3 py-0.5 text-[13px] font-bold text-[#9C3F21] shadow-sm" data-restant-barre="">
            {court}
          </p>
        )}
        <button
          type="button"
          onClick={envoyer}
          aria-describedby="pudi-barre-vote-etat"
          style={{ opacity: n === 0 ? 0.5 : 1 }}
          className="w-full min-h-[52px] px-4 rounded-xl bg-marine text-white font-bold text-[16px] shadow-lg flex items-center justify-center gap-2 transition-opacity"
          data-envoyer-vote=""
          data-nb={n}
        >
          <Icone nom="envoyer" />
          <span>{fr.vote.envoyer}</span>
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-[13px] ${n === MAX_PRIORITES ? 'bg-white text-marine' : 'bg-white/20 text-white'}`}
            data-compteur-vote=""
          >
            {fr.vote.compteur(n)}
          </span>
        </button>
        <span id="pudi-barre-vote-etat" className="sr-only">
          {n === 0 ? fr.vote.choisir3 : n < MAX_PRIORITES ? fr.vote.encore(MAX_PRIORITES - n) : fr.vote.compteur(n)}
        </span>
      </div>
    </div>
  );
}
