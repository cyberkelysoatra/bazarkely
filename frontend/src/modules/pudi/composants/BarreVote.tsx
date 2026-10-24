// « Envoyer mon vote » bar of the voting path (specification v9, 4.3 bis), above the bottom bar,
// with the counter « X/12 voix » and a 12-dot gauge. Translucent while no vote is placed (still
// announced to screen readers), fully visible from the first vote. At 0 vote: nothing is sent,
// « Mon choix » opens on question 1 with « Placez au moins 1 voix ». From 1 vote: questions 2 and 3
// (each shown once, one tap to skip), then the summary with the final « Envoyer mon vote ».
// Own lazy chunk. Sizes in px: like the bottom bar, it keeps its size whatever « Taille du texte ».
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { usePudi, useDonnees } from '../PudiContexte';
import { VOIX, voixUtilisees } from '../utils/regles';
import { tempsRestant, texteRestant } from '../utils/format';
import { etapeSuivante } from '../appels/questions';
import { Icone } from './Icones';
import { RappelVote, useComparaisonVote } from './RappelVote';
import { JaugeVoix } from './Voix';

export default function BarreVote() {
  const { brouillon, clotureAt, decalage } = usePudi();
  const navigate = useNavigate();
  // PUDI-CC-16.1: a signed-in voter who changed nothing sees « Modifier mon vote » and a reminder.
  const { donnees } = useDonnees();
  const comparaison = useComparaisonVote();
  const { pathname, search } = useLocation();
  // « Mon choix » shows the full reminder in the page itself.
  const surMonChoix = pathname.startsWith('/choix');
  const surResume = surMonChoix && new URLSearchParams(search).get('etape') === 'resume';
  const n = voixUtilisees(brouillon);
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
    if (n < 1) {
      navigate('/choix', { state: { relance: Date.now() } });
      return;
    }
    const suite = etapeSuivante();
    if (suite === 'resume' && surResume) navigate('/envoyer');
    else navigate(`/choix?etape=${suite}`);
  };
  return (
    <div
      className="fixed left-0 right-0 z-30 px-3 pb-2 pointer-events-none"
      style={{ bottom: 'calc(57px + env(safe-area-inset-bottom, 0px))' }}
      data-barre-vote=""
    >
      <div className="mx-auto max-w-2xl pr-[6px] pointer-events-auto">
        {!surMonChoix && <RappelVote donnees={donnees} compact />}
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
          className="w-full min-h-[52px] px-[12px] rounded-xl bg-marine text-white font-bold text-[16px] whitespace-nowrap shadow-lg flex items-center justify-center gap-2 transition-opacity"
          data-envoyer-vote=""
          data-nb={n}
        >
          <Icone nom="envoyer" className="w-[20px] h-[20px] shrink-0" />
          <span>{comparaison === 'identique' ? fr.vote.modifierMonVote : fr.vote.envoyer}</span>
          <span className="flex flex-col items-center gap-[3px] ml-[2px]">
            <span
              className={`rounded-full px-[8px] py-[1px] text-[13px] leading-[18px] ${n === VOIX ? 'bg-white text-marine' : 'bg-white/20 text-white'}`}
              data-compteur-vote=""
            >
              {frPages.voix.compteur(n)}
            </span>
            <JaugeVoix n={n} clair />
          </span>
        </button>
        <span id="pudi-barre-vote-etat" className="sr-only">
          {n === 0 ? frPages.voix.auMoinsUne : frPages.voix.compteur(n)}
        </span>
      </div>
    </div>
  );
}
