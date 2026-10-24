import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { Icone } from '../composants/Icones';
import { BandeauxEtat, Chargement, ErreurDonnees, Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { BandeauMasquage } from '../composants/Masquage';
import { PROFIL_VALEURS } from '../data';
import { fr } from '../i18n/fr';
import { usePudi, useDonnees } from '../PudiContexte';
import { lireEtatConnecte, lireMonVote, ping, soumettreVote, type FormulaireVote, type MonVote } from '../appels/api';
import { brouillonVide } from '../appels/brouillon';
import { lireCanal } from '../appels/provenance';
import { noterEtape } from '../appels/parcours';
import { definirApercu } from '../appels/apercu';
import { connexionGoogle as connexionGoogleSession } from '../appels/session';
import { getSupabase, withTimeout } from '../appels/supabaseClient';
import { messageErreur, type ChampFormulaire, type ErreurAffichee } from '../utils/erreurs';
import { dateCourte } from '../utils/format';
import { brouillonValide, normaliserTelephone, type Brouillon } from '../utils/regles';
import { allerAuChamp } from '../utils/champFautif';
import OuvrirDansChrome from '../composants/OuvrirDansChrome';
import { lierVote } from '../appels/choixAppareil';
import { BandeauReseau, useEnvoiFiable } from '../composants/Reseau';
import { IndicateurEtapes } from '../composants/Etapes';
import { programmeParId } from '../data';
import { propositionParId, usePropositions } from '../appels/propositions';

/** Rule 11: the field each blocking error points at (first faulty field of the form). */
const CIBLES: Record<ChampFormulaire, string | null> = {
  fokontany: 'pudi-fkt',
  profil: 'pudi-profil',
  telephone: 'pudi-tel',
  resident: 'pudi-resident',
  choix: null,
  general: null
};

const memeChoix = (a: Brouillon, b: { priorites: string[]; urgents: string[]; manquant: string | null }) =>
  [...a.priorites].sort().join() === [...b.priorites].sort().join() &&
  [...a.urgents].sort().join() === [...b.urgents].sort().join() &&
  a.manquant.trim() === (b.manquant ?? '').trim();

const FORM_VIDE: FormulaireVote = { fokontany: '', fokontanyAutre: '', profil: '', telephone: '', resident: false };

function ErreurChamp({ e, champ }: { e: ErreurAffichee | null; champ: ChampFormulaire }) {
  if (!e || e.champ !== champ) return null;
  return (
    <p role="alert" className="mt-1.5 flex gap-1.5 items-start text-[0.875rem] font-bold text-[#9C3F21]">
      <Icone nom="alerte" className="w-4 h-4 mt-0.5" />
      {e.message}
    </p>
  );
}

export default function Envoyer() {
  const { donnees, erreur: erreurDonnees, reessayer } = useDonnees();
  const { brouillon, majBrouillon, etat, definirEtat, envoiOuvert, masquages, rechargerMasquages, apercu, noterMonVote } = usePudi();
  const { liste: propositions } = usePropositions();
  // PUDI-CC-11: in JOEL's « Votant » preview every client check runs, but nothing reaches the server.
  const apercuVotant = apercu?.role === 'votant';
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [vote, setVote] = useState<MonVote | null>(null);
  const [form, setForm] = useState<FormulaireVote>(FORM_VIDE);
  const [erreur, setErreur] = useState<ErreurAffichee | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [redirection, setRedirection] = useState(false);
  const initialise = useRef<string | null>(null);

  // Session (shared with 1sakely.org). supabase-js is loaded here only.
  useEffect(() => {
    let actif = true;
    let desabonner: (() => void) | undefined;
    getSupabase()
      .then(async (sb) => {
        const { data } = await withTimeout(sb.auth.getSession());
        if (actif) setSession(data.session);
        const abo = sb.auth.onAuthStateChange((_ev, s) => {
          if (actif) setSession(s);
        });
        desabonner = () => abo.data.subscription.unsubscribe();
      })
      .catch(() => {
        if (actif) {
          setSession(null);
          setErreur(messageErreur(new Error('timeout')));
        }
      });
    return () => {
      actif = false;
      desabonner?.();
    };
  }, []);

  // Funnel (anonymous): the screen is shown, then a session exists on it.
  useEffect(() => {
    noterEtape('envoyer');
  }, []);
  useEffect(() => {
    if (session) noterEtape('connecte');
  }, [session]);

  // After sign-in: ping once, authenticated state, own vote (prefill).
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || initialise.current === uid) return;
    initialise.current = uid;
    (async () => {
      try {
        if (apercuVotant) {
          // Preview: no connection record, no prefill from JOEL's real vote.
          definirEtat(await lireEtatConnecte());
          return;
        }
        const cle = `pudi_ping:${uid}`;
        let deja = false;
        try {
          deja = sessionStorage.getItem(cle) === '1';
        } catch {
          /* no storage */
        }
        if (!deja) {
          await ping();
          try {
            sessionStorage.setItem(cle, '1');
          } catch {
            /* no storage */
          }
        }
        const e = await lireEtatConnecte();
        definirEtat(e);
        if (e.a_vote) {
          const v = await lireMonVote();
          setVote(v);
          if (v) {
            noterMonVote(v);
            if (brouillonVide(brouillon)) {
              majBrouillon({ priorites: v.priorites, urgents: v.urgents, manquant: v.manquant ?? '' });
            }
            setForm((f) => ({
              ...f,
              fokontany: v.fokontany,
              fokontanyAutre: v.fokontany_autre ?? '',
              profil: v.profil,
              resident: true
            }));
          }
        }
      } catch (e) {
        setErreur(messageErreur(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const connexionGoogle = async () => {
    setRedirection(true);
    setErreur(null);
    try {
      // Same return address as before on the web; inside the NAVY ay app the host signs in.
      await connexionGoogleSession('/pudi/envoyer');
    } catch (e) {
      setRedirection(false);
      setErreur(messageErreur(e));
    }
  };

  const valider = (): ErreurAffichee | null => {
    if (!brouillonValide(brouillon)) return messageErreur('PUDI_PRIORITES');
    if (!form.fokontany || (form.fokontany === 'AUTRE' && !form.fokontanyAutre.trim())) return messageErreur('PUDI_FOKONTANY');
    if (!form.profil) return messageErreur('PUDI_PROFIL');
    const tel = form.telephone.trim();
    if (!tel && !vote) return messageErreur('PUDI_NUMERO_INVALIDE');
    if (tel && !normaliserTelephone(tel)) return messageErreur('PUDI_NUMERO_INVALIDE');
    if (!form.resident) return messageErreur('PUDI_RESIDENCE');
    return null;
  };

  const montrerErreur = (e: ErreurAffichee | null) => {
    setErreur(e);
    if (!e) return;
    // The other « Précisez » box when « Autre fokontany » is chosen and left empty.
    const cible = e.champ === 'fokontany' && form.fokontany === 'AUTRE' ? 'pudi-fkt-autre' : CIBLES[e.champ];
    window.setTimeout(() => allerAuChamp(cible), 30);
  };

  const erreurEnvoi = (e: unknown) => {
    const er = messageErreur(e);
    montrerErreur(er);
    // PUDI-CC-09: masked vote, the notice with its two buttons is shown next to the button.
    if (er.code === 'VOTE_MASQUE') void rechargerMasquages();
  };
  // PUDI-CC-14.4: a network failure keeps the form and retries once when back online. The vote
  // is one per account on the server, so a retry never makes two votes.
  const envoiVote = useEnvoiFiable(async (b: Brouillon, f: FormulaireVote, c: string | null) => {
    setEnvoi(true);
    try {
      const v = await soumettreVote(b, f, c);
      setVote(v);
      noterMonVote(v);
      // PUDI-CC-16.2: this device's choice is now « sent » (never counted as unsent).
      void lierVote();
      if (!v.est_test) noterEtape('vote');
      navigate('/merci', { state: { test: v.est_test } });
    } finally {
      setEnvoi(false);
    }
  }, erreurEnvoi);

  const envoyer = async (ev: FormEvent) => {
    ev.preventDefault();
    const local = valider();
    montrerErreur(local);
    if (local) return;
    if (apercuVotant && apercu) {
      definirApercu({ ...apercu, voteFictif: true });
      navigate('/merci', { state: { apercu: true } });
      return;
    }
    try {
      if (!(await envoiVote.lancer(brouillon, form, lireCanal()))) setErreur(null);
    } catch (e) {
      erreurEnvoi(e);
    }
  };

  if (erreurDonnees) return <Page titre={fr.envoi.titre}><ErreurDonnees reessayer={reessayer} /></Page>;

  const champ = 'w-full min-h-[48px] rounded-xl border border-filet bg-white px-3 text-[1rem]';
  const choixValide = brouillonValide(brouillon);
  const nomChoix = (id: string) => (donnees ? programmeParId(donnees, id)?.nom : undefined) ?? propositionParId(propositions, id)?.intitule ?? id;

  return (
    <Page titre={fr.envoi.titre}>
      <IndicateurEtapes courante={session ? 3 : 2} faites={[...(choixValide ? [1] : []), ...(session ? [2] : [])]} />
      <div className="mb-4">
        <BandeauxEtat />
      </div>
      <p className="mb-4 text-[0.875rem] text-gris" data-rappel-facultatif="">
        <Link to="/choix" className="font-bold text-marine underline underline-offset-2">
          {fr.vote.rappelFacultatif}
        </Link>
      </p>

      {!choixValide && (
        <div className="mb-4 bg-white border border-filet rounded-xl p-3 space-y-3">
          <p className="text-[0.9375rem]">{fr.choix.incomplet}</p>
          <Link to="/choix" className={`${boutonSecondaire} w-full`}>
            <Icone nom="liste" />
            {fr.envoi.verifierChoix}
          </Link>
        </div>
      )}

      {session === undefined || !donnees ? (
        <Chargement />
      ) : !session ? (
        <div className="space-y-4">
          <p className="text-[1rem] flex gap-2 items-start">
            <Icone nom="personnes" className="w-5 h-5 text-marine mt-0.5" />
            {fr.envoi.unVote}
          </p>
          {brouillon.priorites.length > 0 && (
            <div className="bg-white border-l-4 border-[#1E7A46] rounded-r-lg px-3 py-2.5" data-priorites-gardees="">
              <p className="font-bold text-[0.9375rem]">{brouillon.priorites.length === 3 ? fr.vote.gardees : fr.vote.gardeesPartiel}</p>
              <ol className="mt-1 space-y-0.5 text-[0.9375rem] list-decimal pl-5">
                {brouillon.priorites.map((id) => (
                  <li key={id}>{nomChoix(id)}</li>
                ))}
              </ol>
            </div>
          )}
          <OuvrirDansChrome />
          <button type="button" className={`${boutonPrincipal} w-full`} onClick={connexionGoogle} disabled={redirection}>
            <Icone nom="connexion" />
            {redirection ? fr.envoi.connexionEnCours : fr.envoi.google}
          </button>
          {erreur && <ErreurChamp e={erreur} champ={erreur.champ} />}
        </div>
      ) : (
        <form onSubmit={envoyer} noValidate className="space-y-5">
          <p className="text-[0.8125rem] text-gris">{fr.envoi.connecteEn(session.user.email ?? '')}</p>
          {vote && (
            <p className="bg-white border-l-4 border-marine rounded-r-lg px-3 py-2.5 text-[0.9375rem]">
              {memeChoix(brouillon, vote) ? fr.envoi.dejaVote(dateCourte(vote.created_at)) : fr.vote.modification(dateCourte(vote.created_at))}
            </p>
          )}

          <div>
            <label htmlFor="pudi-fkt" className="block font-bold text-[0.9375rem] mb-1.5">
              {fr.envoi.fokontany}
            </label>
            <select
              id="pudi-fkt"
              className={champ}
              value={form.fokontany}
              onChange={(e) => setForm({ ...form, fokontany: e.target.value })}
            >
              <option value="">{fr.envoi.fokontanyChoisir}</option>
              {donnees.fokontany.map((f) => (
                <option key={f.n} value={f.ceni ?? 'AUTRE'}>
                  {f.affichage}
                </option>
              ))}
            </select>
            {form.fokontany === 'AUTRE' && (
              <input
                aria-label={fr.envoi.fokontanyAutre}
                placeholder={fr.envoi.fokontanyAutre}
                id="pudi-fkt-autre"
                className={`${champ} mt-2`}
                maxLength={80}
                value={form.fokontanyAutre}
                onChange={(e) => setForm({ ...form, fokontanyAutre: e.target.value })}
              />
            )}
            <ErreurChamp e={erreur} champ="fokontany" />
          </div>

          <fieldset id="pudi-profil">
            <legend className="font-bold text-[0.9375rem] mb-1.5">{fr.envoi.profil}</legend>
            <div className="space-y-1.5">
              {PROFIL_VALEURS.map((p) => (
                <label key={p} className="flex items-center gap-3 min-h-[44px] bg-white border border-filet rounded-xl px-3">
                  <input
                    type="radio"
                    name="profil"
                    value={p}
                    checked={form.profil === p}
                    onChange={() => setForm({ ...form, profil: p })}
                    className="w-5 h-5 accent-[#0B2A8C]"
                  />
                  <span className="text-[1rem]">{fr.envoi.profils[p]}</span>
                </label>
              ))}
            </div>
            <ErreurChamp e={erreur} champ="profil" />
          </fieldset>

          <div>
            <label htmlFor="pudi-tel" className="block font-bold text-[0.9375rem] mb-1.5">
              {fr.envoi.telephone}
            </label>
            <input
              id="pudi-tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={champ}
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              aria-describedby="pudi-tel-aide"
            />
            <p id="pudi-tel-aide" className="mt-1 text-[0.8125rem] text-gris">
              {vote ? fr.envoi.telephoneGarde : fr.envoi.telephoneAide}
            </p>
            <ErreurChamp e={erreur} champ="telephone" />
          </div>

          <div>
            <label className="flex items-center gap-3 min-h-[48px] bg-white border border-filet rounded-xl px-3">
              <input
                id="pudi-resident"
                type="checkbox"
                checked={form.resident}
                onChange={(e) => setForm({ ...form, resident: e.target.checked })}
                className="w-5 h-5 accent-[#0B2A8C]"
              />
              <span className="text-[1rem]">{fr.envoi.resident}</span>
            </label>
            <ErreurChamp e={erreur} champ="resident" />
          </div>

          <p className="text-[0.8125rem] leading-relaxed text-gris bg-white border border-filet rounded-xl p-3">{fr.envoi.notice}</p>

          <ErreurChamp e={erreur} champ="choix" />
          {erreur?.code === 'VOTE_MASQUE' && masquages.length ? (
            <BandeauMasquage toujoursOuvert />
          ) : (
            <ErreurChamp e={erreur} champ="general" />
          )}
          {envoiVote.enAttente && <BandeauReseau cours={envoi} reessayer={() => void envoiVote.reessayer().catch(erreurEnvoi)} />}
          {!envoiOuvert && etat && !etat.clos && <p className="text-[0.875rem] text-gris">{fr.envoi.envoiFerme}</p>}
          <button type="submit" className={`${boutonPrincipal} w-full`} disabled={envoi || !envoiOuvert || !choixValide}>
            <Icone nom="envoyer" />
            {envoi ? fr.envoi.envoiEnCours : vote ? fr.envoi.modifierVote : fr.envoi.envoyer}
          </button>
        </form>
      )}
    </Page>
  );
}
