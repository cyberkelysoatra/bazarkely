import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageBlocage } from '../composants/BoutonsChoix';
import { CarteChoix } from '../composants/CarteChoix';
import { IndicateurEtapes } from '../composants/Etapes';
import { RappelVote, useComparaisonVote } from '../composants/RappelVote';
import { JaugeVoix } from '../composants/Voix';
import { useSessionLocale } from '../appels/session';
import { etapeSuivante, noterQuestionVue } from '../appels/questions';
import { allerAuChamp } from '../utils/champFautif';
import { Icone } from '../composants/Icones';
import { BandeauxEtat, Chargement, ErreurDonnees, Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { programmeParId, secteurParId, type PudiDonnees } from '../data';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { usePudi, useDonnees } from '../PudiContexte';
import { MAX_MANQUANT, VOIX, brouillonValide, limiterManquant, regrouperVoix } from '../utils/regles';
import { propositionParId, usePropositions, type Proposition } from '../appels/propositions';

// PUDI-CC-18: two numbered screens, « Question 1 sur 2 : Répartissez vos 12 voix » and
// « Question 2 sur 2 : Un projet manque au PUDi ? » (optional, one tap to skip), then the summary
// and the sending. The « urgents » question is gone: urgency is read from the votes ranking.
type Etape = '1' | '2' | 'resume';

/** Accent-insensitive search key. */
const cle = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** A line of the choice: one of the 52 programmes or a proposal outside the PUDi list. */
interface Choisissable {
  id: string;
  nom: string;
  secteur?: string;
  tranche?: string;
  proposition: boolean;
}

function ListeProgrammes({ donnees }: { donnees: PudiDonnees }) {
  const { brouillon } = usePudi();
  const { etat } = usePudi();
  const { liste: propositions } = usePropositions();
  const [secteur, setSecteur] = useState('');
  const [seulesPropositions, setSeulesPropositions] = useState(false);
  const [recherche, setRecherche] = useState('');
  const liste = useMemo(() => {
    const q = cle(recherche.trim());
    const prog: Choisissable[] = donnees.programmes
      .filter((p) => !secteur || p.secteur === secteur)
      .map((p) => ({ id: p.id, nom: p.nom, secteur: p.secteur, tranche: p.trancheAffichee, proposition: false }));
    const props: Choisissable[] = (propositions ?? []).map((p: Proposition) => ({ id: p.id, nom: p.intitule, proposition: true }));
    const tout = seulesPropositions ? props : secteur ? prog : [...prog, ...props];
    return tout.filter((p) => !q || cle(p.nom).includes(q));
  }, [donnees, propositions, secteur, seulesPropositions, recherche]);
  const choisis = brouillon.priorites;
  const clos = !!etat?.clos;

  return (
    <div>
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex gap-2">
        <label className="block flex-1 min-w-0">
          <span className="sr-only">{fr.choix.filtreSecteur}</span>
          <select
            value={secteur}
            onChange={(e) => {
              setSecteur(e.target.value);
              if (e.target.value) setSeulesPropositions(false);
            }}
            className="w-full min-h-[48px] rounded-xl border border-filet bg-white px-3 text-[1rem]"
          >
            <option value="">{fr.choix.tousSecteurs}</option>
            {donnees.secteurs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nom}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          aria-pressed={seulesPropositions}
          title={fr.choix.filtrePropositionsAide}
          onClick={() => {
            setSeulesPropositions(!seulesPropositions);
            setSecteur('');
          }}
          className={`shrink-0 min-h-[48px] px-3 rounded-xl border-2 border-dashed font-bold text-[0.9375rem] inline-flex items-center gap-1.5 ${
            seulesPropositions ? 'bg-marine border-marine text-white' : 'bg-sable border-marine text-marine'
          }`}
        >
          <Icone nom="ampoule" className="w-4 h-4" />
          {fr.choix.filtrePropositions}
        </button>
        </div>
        <label className="relative block">
          <span className="sr-only">{fr.choix.recherche}</span>
          <Icone nom="recherche" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gris" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder={fr.choix.recherche}
            className="w-full min-h-[48px] rounded-xl border border-filet bg-white pl-10 pr-3 text-[1rem]"
          />
        </label>
      </div>
      {liste.length === 0 && <p className="text-gris py-4">{fr.choix.aucunResultat}</p>}
      <ul className="space-y-2">
        {liste.map((p) => {
          const s = p.secteur ? secteurParId(donnees, p.secteur) : undefined;
          const actif = choisis.includes(p.id);
          return (
            <CarteChoix
              key={p.id}
              id={p.id}
              titre={p.nom}
              details={p.proposition ? `/proposition/${p.id}` : `/programme/${p.id}`}
              desactive={clos}
              className={`border-2 ${p.proposition ? `bg-sable border-dashed ${actif ? 'border-marine' : 'border-marine/50'}` : `bg-white ${actif ? 'border-marine' : 'border-filet'}`}`}
              etiquette={
                p.proposition ? (
                  <span className="text-[0.75rem] font-bold text-marine">{frPages.propositions.badge}</span>
                ) : (
                  <span className="text-[0.75rem] font-bold" style={{ color: s?.couleurFoncee }}>
                    {s?.nom}
                  </span>
                )
              }
            >
              <p className="font-bold text-[0.9375rem] leading-snug" data-titre-carte="">{p.nom}</p>
            </CarteChoix>
          );
        })}
      </ul>
    </div>
  );
}

function useNom(donnees: PudiDonnees) {
  const { liste: propositions } = usePropositions();
  return (id: string) => programmeParId(donnees, id)?.nom ?? propositionParId(propositions, id)?.intitule ?? id;
}

/** Votes grouped by programme (« ×5 »), most votes first. */
function NomsVoix({ donnees, priorites }: { donnees: PudiDonnees; priorites: string[] }) {
  const nom = useNom(donnees);
  if (!priorites.length) return <p className="text-gris text-[0.9375rem]">{fr.choix.aucun}</p>;
  return (
    <ul className="space-y-1.5" data-noms-voix="">
      {regrouperVoix(priorites).map((l) => (
        <li key={l.id} className="flex gap-2 text-[0.9375rem]" data-voix-id={l.id} data-voix-n={l.n}>
          <span className="font-titre text-marine shrink-0 min-w-[2.25rem]">×{l.n}</span>
          <span>{nom(l.id)}</span>
        </li>
      ))}
    </ul>
  );
}

/** « Question 2 sur 2 : … » heading (the number is read with the title). */
function TitreQuestion({ i, titre, facultatif = false }: { i: number; titre: string; facultatif?: boolean }) {
  return (
    <h2 className="font-bold text-[1.125rem] text-marine leading-snug min-w-0" data-question={i}>
      <span className="block text-[0.8125rem] font-bold text-gris">
        {frPages.voix.question(i)}
        {facultatif && ` · ${frPages.voix.facultatif}`}
        <span className="sr-only"> : </span>
      </span>
      {titre}
    </h2>
  );
}

/** Unused votes never block: « vous pouvez les placer ou envoyer tel quel ». */
function Reste({ n }: { n: number }) {
  if (n < 1) return null;
  return (
    <p className="mt-2 text-[0.875rem] text-profond flex gap-2 items-start" data-reste-voix={VOIX - n}>
      <Icone nom={n === VOIX ? 'coche' : 'info'} className={`w-4 h-4 mt-0.5 shrink-0 ${n === VOIX ? 'text-[#1E7A46]' : 'text-marine'}`} />
      {n === VOIX ? frPages.voix.toutes : frPages.voix.reste(VOIX - n)}
    </p>
  );
}

export default function Choix() {
  const { donnees, erreur, reessayer } = useDonnees();
  const { brouillon, majBrouillon, etat } = usePudi();
  const connecte = !!useSessionLocale();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { relance?: number } | null };
  const brut = params.get('etape');
  // An old link to « ?etape=3 » (missing project before PUDI-CC-18) opens question 2.
  const etape: Etape = brut === '2' || brut === '3' ? '2' : brut === 'resume' ? 'resume' : '1';
  const aller = (e: Etape) => {
    const p = new URLSearchParams(params);
    if (e === '1') p.delete('etape');
    else p.set('etape', e);
    setParams(p);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };
  // Question 2 (missing project): shown once before any sending.
  useEffect(() => {
    if (etape === '2') noterQuestionVue();
  }, [etape]);
  const suivante = () => aller(etapeSuivante());
  const valide = brouillonValide(brouillon);
  const clos = !!etat?.clos;
  const n = brouillon.priorites.length;
  const comparaison = useComparaisonVote();

  // « Envoyer mon vote » pressed with no vote: scroll to question 1, highlight it, « Placez au moins 1 voix ».
  const [relance, setRelance] = useState(false);
  const blocPriorites = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!state?.relance || !donnees) return;
    setRelance(true);
    const id = window.setTimeout(() => allerAuChamp(blocPriorites.current), 80);
    return () => window.clearTimeout(id);
  }, [state?.relance, donnees]);
  useEffect(() => {
    if (n > 0) setRelance(false);
  }, [n]);

  if (erreur) return <Page titre={fr.choix.titre}><ErreurDonnees reessayer={reessayer} /></Page>;
  if (!donnees) return <Page titre={fr.choix.titre}><Chargement /></Page>;

  const boutonsQuestion = (passer: string) => (
    <div className="mt-4 flex flex-col gap-2">
      <button type="button" className={`${boutonPrincipal} w-full`} onClick={suivante} data-continuer="">
        {frPages.voix.continuer}
        <Icone nom="droite" />
      </button>
      <button type="button" className={`${boutonSecondaire} w-full`} onClick={suivante} data-passer="">
        {passer}
      </button>
      <button
        type="button"
        className="min-h-[44px] inline-flex items-center justify-center gap-1.5 text-marine font-bold text-[0.9375rem]"
        onClick={() => aller('1')}
      >
        <Icone nom="gauche" className="w-4 h-4" />
        {frPages.voix.retourQ1}
      </button>
    </div>
  );
  // One tap to skip, also at the top.
  const passerHaut = (libelle: string) => (
    <button type="button" onClick={suivante} className={`${boutonSecondaire} w-full mt-3`} data-passer-haut="">
      {libelle}
      <Icone nom="droite" className="w-4 h-4" />
    </button>
  );

  return (
    <Page titre={fr.choix.titre}>
      <IndicateurEtapes courante={1} faites={[...(n >= 1 ? [1] : []), ...(connecte ? [2] : [])]} />
      <div className="mb-3">
        <BandeauxEtat />
      </div>

      {(etape === '1' || etape === 'resume') && <RappelVote donnees={donnees} />}
      {etape === '1' && (
        <>
          <section
            ref={blocPriorites}
            tabIndex={-1}
            id="pudi-priorites"
            className={`bg-white border rounded-xl p-3 outline-none ${relance && n === 0 ? 'border-[#B85317] ring-2 ring-[#B85317]' : 'border-filet'}`}
            data-priorites=""
            data-question-ecran="1"
          >
            <div className="flex items-start justify-between gap-2">
              <TitreQuestion i={1} titre={frPages.voix.q1Titre} />
              <span className="text-right shrink-0">
                <span className={`block font-titre text-[1.375rem] leading-tight ${n ? 'text-marine' : 'text-gris'}`} aria-live="polite" data-compteur-q1="">
                  {frPages.voix.compteur(n)}
                </span>
                <JaugeVoix n={n} />
              </span>
            </div>
            <p className="text-[0.9375rem] mt-1">{frPages.voix.q1Aide}</p>
            <p className="text-[0.8125rem] text-gris mt-1">{frPages.voix.q1Geste}</p>
            {n > 0 && (
              <div className="mt-2">
                <p className="text-[0.8125rem] text-gris mb-1">{frPages.voix.mesVoix}</p>
                <NomsVoix donnees={donnees} priorites={brouillon.priorites} />
              </div>
            )}
            <Reste n={n} />
            {relance && n === 0 && <MessageBlocage texte={frPages.voix.auMoinsUne} />}
          </section>
          <p className="mt-2 text-[0.8125rem] text-gris" data-ensuite="">{frPages.voix.ensuite}</p>

          <div className="mt-4">
            <ListeProgrammes donnees={donnees} />
          </div>
        </>
      )}

      {etape === '2' && (
        <section data-question-ecran="2">
          <TitreQuestion i={2} titre={frPages.voix.q3Titre} facultatif />
          <p className="text-[0.9375rem] mt-1 mb-2">{frPages.voix.q3Aide}</p>
          {passerHaut(frPages.voix.passer)}
          <p className="text-[0.875rem] my-3 flex gap-2 items-start bg-white border border-filet rounded-xl px-3 py-2">
            <Icone nom="recherche" className="w-4 h-4 mt-0.5 text-marine shrink-0" />
            <span>
              {fr.choix.etape3Verifier}{' '}
              <Link to="/recherche" className="font-bold text-marine underline underline-offset-2">
                {frPages.recherche.titre}
              </Link>
            </span>
          </p>
          <label className="block">
            <span className="sr-only">{fr.choix.etape3Titre}</span>
            <textarea
              value={brouillon.manquant}
              disabled={clos}
              maxLength={MAX_MANQUANT}
              rows={5}
              onChange={(e) => majBrouillon({ ...brouillon, manquant: limiterManquant(e.target.value) })}
              placeholder={fr.choix.etape3Placeholder}
              className="w-full rounded-xl border border-filet bg-white p-3 text-[1rem] leading-snug"
            />
          </label>
          <p className="text-right text-[0.8125rem] text-gris" aria-live="polite">
            {fr.choix.caracteres(brouillon.manquant.length)}
          </p>
          {boutonsQuestion(frPages.voix.passer)}
        </section>
      )}

      {etape === 'resume' && (
        <section className="space-y-4" data-question-ecran="resume">
          <h2 className="font-bold text-[1.125rem] text-marine">{fr.choix.resumeTitre}</h2>
          {[
            {
              titre: frPages.voix.resumeVoix(n),
              e: '1' as Etape,
              contenu: (
                <>
                  <NomsVoix donnees={donnees} priorites={brouillon.priorites} />
                  <Reste n={n} />
                </>
              )
            },
            {
              titre: fr.choix.resumeManquant,
              e: '2' as Etape,
              contenu: <p className="text-[0.9375rem] whitespace-pre-wrap break-words">{brouillon.manquant.trim() || fr.choix.aucun}</p>
            }
          ].map((b) => (
            <div key={b.e} className="bg-white border border-filet rounded-xl p-3" data-resume-bloc={b.e}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="font-bold text-[0.9375rem] text-profond">{b.titre}</h3>
                <button type="button" onClick={() => aller(b.e)} className="inline-flex items-center gap-1 min-h-[44px] px-2 text-marine font-bold text-[0.875rem]">
                  <Icone nom="crayon" className="w-4 h-4" />
                  {fr.choix.modifier}
                </button>
              </div>
              {b.contenu}
            </div>
          ))}
          <p className="text-[0.875rem] text-gris">{fr.choix.brouillon}</p>
          {!valide && <MessageBlocage texte={fr.choix.incomplet} />}
          <button
            type="button"
            className={`${boutonPrincipal} w-full`}
            disabled={!valide || clos}
            onClick={() => navigate('/envoyer')}
            data-envoyer-final=""
          >
            <Icone nom="envoyer" />
            {comparaison === 'identique' ? fr.vote.modifierMonVote : fr.vote.envoyer}
          </button>
        </section>
      )}
      {etape !== 'resume' && <p className="mt-4 text-[0.875rem] text-gris">{fr.choix.brouillon}</p>}
    </Page>
  );
}
