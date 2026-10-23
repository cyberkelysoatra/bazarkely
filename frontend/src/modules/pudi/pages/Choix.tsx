import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageBlocage } from '../composants/BoutonsChoix';
import { CarteChoix } from '../composants/CarteChoix';
import { IndicateurEtapes } from '../composants/Etapes';
import { useSessionLocale } from '../appels/session';
import { allerAuChamp } from '../utils/champFautif';
import { Icone } from '../composants/Icones';
import { BadgeTranche, BandeauxEtat, Chargement, ErreurDonnees, Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { programmeParId, secteurParId, type PudiDonnees } from '../data';
import { fr } from '../i18n/fr';
import { usePudi, useDonnees } from '../PudiContexte';
import { MAX_MANQUANT, MAX_PRIORITES, MAX_URGENTS, brouillonValide, ecartPudi, limiterManquant } from '../utils/regles';
import { propositionParId, usePropositions, type Proposition } from '../appels/propositions';

type Etape = '1' | '2' | '3' | 'resume';

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

function ListeProgrammes({ donnees, mode }: { donnees: PudiDonnees; mode: 'priorite' | 'urgent' }) {
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
  const choisis = mode === 'priorite' ? brouillon.priorites : brouillon.urgents;
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
              mode={mode}
              desactive={clos}
              className={`border-2 ${p.proposition ? `bg-sable border-dashed ${actif ? 'border-marine' : 'border-marine/50'}` : `bg-white ${actif ? 'border-marine' : 'border-filet'}`}`}
            >
              <p className="font-bold text-[0.9375rem] leading-snug">{p.nom}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {p.proposition ? (
                  <span className="text-[0.75rem] font-bold text-marine">{fr.propositions.badge}</span>
                ) : (
                  <span className="text-[0.75rem] font-bold" style={{ color: s?.couleurFoncee }}>
                    {s?.nom}
                  </span>
                )}
                {mode === 'urgent' &&
                  (p.tranche ? (
                    <BadgeTranche tranche={p.tranche} />
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-marine px-2.5 py-0.5 text-[0.75rem] font-bold text-marine">
                      {fr.propositions.horsPudi}
                    </span>
                  ))}
              </div>
              {mode === 'urgent' && actif && p.tranche && ecartPudi(p.tranche) && <p className="text-[0.8125rem] text-gris mt-1">{fr.choix.avance}</p>}
            </CarteChoix>
          );
        })}
      </ul>
    </div>
  );
}

function Compteur({ n, max }: { n: number; max: number }) {
  return (
    <span
      className={`font-titre text-[1.375rem] ${n === max ? 'text-marine' : 'text-gris'}`}
      aria-live="polite"
      aria-label={`${n} sur ${max}`}
    >
      {fr.choix.compteur(n, max)}
    </span>
  );
}

function NomsProgrammes({ donnees, ids }: { donnees: PudiDonnees; ids: string[] }) {
  const { liste: propositions } = usePropositions();
  if (!ids.length) return <p className="text-gris text-[0.9375rem]">{fr.choix.aucun}</p>;
  return (
    <ol className="space-y-1.5">
      {ids.map((id, i) => (
        <li key={id} className="flex gap-2 text-[0.9375rem]">
          <span className="font-titre text-marine">{i + 1}</span>
          <span>{programmeParId(donnees, id)?.nom ?? propositionParId(propositions, id)?.intitule ?? id}</span>
        </li>
      ))}
    </ol>
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
  const etape: Etape = brut === '2' || brut === '3' || brut === 'resume' ? brut : '1';
  const aller = (e: Etape) => {
    const p = new URLSearchParams(params);
    if (e === '1') p.delete('etape');
    else p.set('etape', e);
    setParams(p);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };
  const valide = brouillonValide(brouillon);
  const clos = !!etat?.clos;
  const n = brouillon.priorites.length;
  const manque = MAX_PRIORITES - n;

  // « Envoyer mon vote » pressed with fewer than 3 priorities: scroll to them, highlight, say how many.
  const [relance, setRelance] = useState(false);
  const blocPriorites = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!state?.relance || !donnees) return;
    setRelance(true);
    const id = window.setTimeout(() => allerAuChamp(blocPriorites.current), 80);
    return () => window.clearTimeout(id);
  }, [state?.relance, donnees]);
  useEffect(() => {
    if (manque <= 0) setRelance(false);
  }, [manque]);

  if (erreur) return <Page titre={fr.choix.titre}><ErreurDonnees reessayer={reessayer} /></Page>;
  if (!donnees) return <Page titre={fr.choix.titre}><Chargement /></Page>;

  const retourPriorites = (
    <button type="button" className={`${boutonSecondaire} w-full mt-4`} onClick={() => aller('1')}>
      <Icone nom="gauche" />
      {fr.vote.retourPriorites}
    </button>
  );

  return (
    <Page titre={fr.choix.titre}>
      <IndicateurEtapes courante={1} faites={[...(n === MAX_PRIORITES ? [1] : []), ...(connecte ? [2] : [])]} />
      <div className="mb-3">
        <BandeauxEtat />
      </div>

      {etape === '1' && (
        <>
          <section ref={blocPriorites} tabIndex={-1} id="pudi-priorites" className="bg-white border border-filet rounded-xl p-3 outline-none" data-priorites="">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-bold text-[1.125rem] text-marine">{fr.choix.etape1Titre}</h2>
              <Compteur n={n} max={MAX_PRIORITES} />
            </div>
            <p className="text-[0.9375rem] mb-2">{fr.choix.etape1Aide}</p>
            {n > 0 && (
              <div className="mt-1">
                <p className="text-[0.8125rem] text-gris mb-1">{fr.vote.mesPriorites}</p>
                <NomsProgrammes donnees={donnees} ids={brouillon.priorites} />
              </div>
            )}
            {relance && manque > 0 && <MessageBlocage texte={fr.vote.encore(manque)} />}
          </section>

          <section className="mt-3 bg-white border border-dashed border-filet rounded-xl p-3" aria-labelledby="pudi-facultatif" data-facultatif="">
            <h2 id="pudi-facultatif" className="font-bold text-[0.9375rem] text-profond">{fr.vote.facultatifTitre}</h2>
            <div className="mt-1 flex flex-col">
              <button type="button" onClick={() => aller('2')} className="min-h-[44px] flex items-center gap-2 text-left text-marine font-bold text-[0.9375rem]" data-facultatif-urgents="">
                <Icone nom="horloge" className="w-5 h-5 shrink-0" />
                <span className="flex-1">{fr.vote.facultatifUrgents}</span>
                <span className="text-[0.8125rem] text-gris font-normal">{fr.choix.compteur(brouillon.urgents.length, MAX_URGENTS)}</span>
                <Icone nom="droite" className="w-4 h-4 shrink-0" />
              </button>
              <button type="button" onClick={() => aller('3')} className="min-h-[44px] flex items-center gap-2 text-left text-marine font-bold text-[0.9375rem]" data-facultatif-manquant="">
                <Icone nom="ampoule" className="w-5 h-5 shrink-0" />
                <span className="flex-1">{fr.vote.facultatifManquant}</span>
                {brouillon.manquant.trim() && <Icone nom="coche" className="w-4 h-4 text-[#1E7A46] shrink-0" />}
                <Icone nom="droite" className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </section>

          <div className="mt-4">
            <ListeProgrammes donnees={donnees} mode="priorite" />
          </div>
        </>
      )}

      {etape === '2' && (
        <section>
          <p className="text-[0.8125rem] text-gris">{fr.vote.facultatifTitre}</p>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold text-[1.125rem] text-marine">{fr.choix.etape2Titre}</h2>
            <Compteur n={brouillon.urgents.length} max={MAX_URGENTS} />
          </div>
          <p className="text-[0.9375rem] mb-3">{fr.choix.etape2Aide}</p>
          <ListeProgrammes donnees={donnees} mode="urgent" />
          {retourPriorites}
        </section>
      )}

      {etape === '3' && (
        <section>
          <p className="text-[0.8125rem] text-gris">{fr.vote.facultatifTitre}</p>
          <h2 className="font-bold text-[1.125rem] text-marine flex items-center gap-2">
            <Icone nom="ampoule" />
            {fr.choix.etape3Titre}
          </h2>
          <p className="text-[0.9375rem] mb-2">{fr.choix.etape3Aide}</p>
          <p className="text-[0.875rem] mb-3 flex gap-2 items-start bg-white border border-filet rounded-xl px-3 py-2">
            <Icone nom="recherche" className="w-4 h-4 mt-0.5 text-marine shrink-0" />
            <span>
              {fr.choix.etape3Verifier}{' '}
              <Link to="/recherche" className="font-bold text-marine underline underline-offset-2">
                {fr.recherche.titre}
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
          {retourPriorites}
        </section>
      )}

      {etape === 'resume' && (
        <section className="space-y-4">
          <h2 className="font-bold text-[1.125rem] text-marine">{fr.choix.resumeTitre}</h2>
          {[
            { titre: fr.choix.resumePriorites, e: '1' as Etape, contenu: <NomsProgrammes donnees={donnees} ids={brouillon.priorites} /> },
            { titre: fr.choix.resumeUrgents, e: '2' as Etape, contenu: <NomsProgrammes donnees={donnees} ids={brouillon.urgents} /> },
            {
              titre: fr.choix.resumeManquant,
              e: '3' as Etape,
              contenu: <p className="text-[0.9375rem] whitespace-pre-wrap break-words">{brouillon.manquant.trim() || fr.choix.aucun}</p>
            }
          ].map((b) => (
            <div key={b.e} className="bg-white border border-filet rounded-xl p-3">
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
          >
            <Icone nom="envoyer" />
            {fr.choix.envoyer}
          </button>
        </section>
      )}
      {etape !== 'resume' && <p className="mt-4 text-[0.875rem] text-gris">{fr.choix.brouillon}</p>}
    </Page>
  );
}
