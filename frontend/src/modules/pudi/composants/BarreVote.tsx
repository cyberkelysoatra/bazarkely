// « Envoyer mon vote » bar of the voting path (specification v9, 4.3 bis), above the bottom bar,
// with the counter « X/12 voix » and a 12-dot gauge. Translucent while no vote is placed (still
// announced to screen readers), fully visible from the first vote. At 0 vote: nothing is sent,
// « Mon choix » opens on question 1 with « Placez au moins 1 voix ». From 1 vote: questions 2 and 3
// (each shown once, one tap to skip), then the summary with the final « Envoyer mon vote ».
// Own lazy chunk. Sizes in px: like the bottom bar, it keeps its size whatever « Taille du texte ».
// PUDI-CC-19: after the first vote (vote on the server, outside « Voir comme »), the bar shows the
// state of the automatic saving instead of « Envoyer mon vote ».
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { usePudi, useDonnees } from '../PudiContexte';
import { VOIX, voixUtilisees } from '../utils/regles';
import { dateCourte, tempsRestant, texteRestant } from '../utils/format';
import { etapeSuivante } from '../appels/questions';
import { abonnerAuto, conditionsAuto, configurerAuto, enregistrerMaintenant, lireEtatAuto } from '../appels/autoEnregistrement';
import { connexionGoogle } from '../appels/session';
import { Icone } from './Icones';
import { RappelVote, useComparaisonVote } from './RappelVote';
import { JaugeVoix } from './Voix';

/** Keeps the automatic saving in step with the account, the vote and the preview. */
export function useAutoEnregistrement(): boolean {
  const { etatReel, apercu, monVote, envoiOuvert, noterMonVote, rechargerMasquages, masquages } = usePudi();
  const masque = masquages.length > 0;
  const actif = conditionsAuto({ etatReel, apercu, monVote, envoiOuvert });
  useEffect(() => {
    configurerAuto({ actif, serveur: monVote, masque, noter: noterMonVote, surMasque: () => void rechargerMasquages() });
  }, [actif, monVote, masque, noterMonVote, rechargerMasquages]);
  return actif;
}

/** « Enregistré ✓ 12/12 voix », « Enregistrement… », offline, 0 vote, sign in again, errors. */
function EtatAutomatique({ n }: { n: number }) {
  const { monVote } = usePudi();
  const etat = useSyncExternalStore(abonnerAuto, lireEtatAuto, lireEtatAuto);
  const comparaison = useComparaisonVote();
  const [heure, setHeure] = useState(false);
  const [connexion, setConnexion] = useState(false);
  const nServeur = monVote?.priorites.length ?? 0;
  const date = etat.at ?? monVote?.date ?? null;
  const cadre = 'w-full min-h-[52px] px-[12px] py-[6px] rounded-xl shadow-lg flex items-center justify-center gap-2 text-center';
  let contenu;
  if (etat.statut === 'attente' || etat.statut === 'envoi')
    contenu = (
      <div className={`${cadre} bg-marine text-white font-bold text-[16px]`} data-auto-statut="envoi">
        <Icone nom="actualiser" className="w-[18px] h-[18px] shrink-0 animate-spin" />
        {frPages.auto.envoi}
      </div>
    );
  else if (etat.statut === 'horsLigne')
    contenu = (
      <div className={`${cadre} bg-[#FFF6E0] border-2 border-[#926407] text-profond font-bold text-[14px] leading-snug`} data-auto-statut="horsLigne">
        <Icone nom="horsLigne" className="w-[18px] h-[18px] shrink-0" />
        {frPages.auto.horsLigne}
      </div>
    );
  else if (etat.statut === 'zero' || (n === 0 && comparaison === 'modifie'))
    contenu = (
      <div className={`${cadre} bg-white border-2 border-[#B85317] text-[#9C3F21] font-bold text-[13px] leading-snug`} data-auto-statut="zero">
        <Icone nom="alerte" className="w-[18px] h-[18px] shrink-0" />
        {frPages.auto.zero(nServeur)}
      </div>
    );
  else if (etat.statut === 'reconnexion')
    contenu = (
      <div className={`${cadre} flex-col bg-white border-2 border-marine text-profond`} data-auto-statut="reconnexion">
        <span className="font-bold text-[14px] leading-snug">{frPages.auto.reconnexion}</span>
        <button
          type="button"
          disabled={connexion}
          onClick={() => {
            setConnexion(true);
            void connexionGoogle().catch(() => setConnexion(false));
          }}
          className="min-h-[44px] px-3 rounded-lg bg-marine text-white font-bold text-[14px] inline-flex items-center gap-1.5"
        >
          <Icone nom="connexion" className="w-[18px] h-[18px]" />
          {connexion ? fr.envoi.connexionEnCours : fr.envoi.google}
        </button>
      </div>
    );
  else if (etat.statut === 'erreur' && etat.erreur)
    contenu = (
      <div role="alert" className={`${cadre} flex-col bg-white border-2 border-[#B85317] text-[#9C3F21]`} data-auto-statut="erreur">
        <span className="font-bold text-[13px] leading-snug">{etat.erreur.message}</span>
        {/* A masked vote cannot be changed (claims go through the masking banner). */}
        {etat.erreur.code !== 'VOTE_MASQUE' && (
          <button type="button" onClick={() => void enregistrerMaintenant()} className="min-h-[44px] px-3 rounded-lg bg-marine text-white font-bold text-[14px]">
            {fr.app.reessayer}
          </button>
        )}
      </div>
    );
  else if (comparaison === 'modifie')
    // Draft already different when the page opened (no gesture here yet): one tap saves it.
    contenu = (
      <button type="button" onClick={() => void enregistrerMaintenant()} className={`${cadre} bg-marine text-white font-bold text-[15px]`} data-auto-statut="modifie">
        <Icone nom="envoyer" className="w-[20px] h-[20px] shrink-0" />
        <span className="flex flex-col items-start leading-tight">
          <span>{frPages.auto.enregistrerChangements}</span>
          <span className="text-[12px] font-normal opacity-90">{frPages.auto.modifie}</span>
        </span>
      </button>
    );
  else
    contenu = (
      <button
        type="button"
        onClick={() => setHeure((h) => !h)}
        aria-expanded={heure}
        className={`${cadre} bg-white border-2 border-[#1E7A46] text-[#1E7A46] font-bold text-[16px] flex-col gap-0`}
        data-auto-statut="enregistre"
      >
        <span className="inline-flex items-center gap-2">
          {frPages.auto.enregistre(n)}
          <JaugeVoix n={n} />
        </span>
        {heure && date && <span className="text-[12px] font-normal text-profond">{frPages.auto.heure(dateCourte(date))}</span>}
      </button>
    );
  return (
    <div aria-live="polite" data-barre-auto="">
      {contenu}
    </div>
  );
}

export default function BarreVote() {
  const { brouillon, clotureAt, decalage } = usePudi();
  const auto = useAutoEnregistrement();
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
        {!surMonChoix && !auto && <RappelVote donnees={donnees} compact />}
        {court && (
          <p className="mb-1 mx-auto w-fit rounded-full bg-white/95 border border-filet px-3 py-0.5 text-[13px] font-bold text-[#9C3F21] shadow-sm" data-restant-barre="">
            {court}
          </p>
        )}
        {auto ? (
          <EtatAutomatique n={n} />
        ) : (
        <>
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
        </>
        )}
      </div>
    </div>
  );
}
