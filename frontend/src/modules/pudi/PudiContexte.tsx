// Shared state of the PUDi entry: draft of the choice, state of the consultation, data file.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { chargerDonnees, donneesChargees, type PudiDonnees } from './data';
import { jetonLocal, lireEtat, type EtatConsultation } from './appels/api';
import { ecrireBrouillon, lireBrouillon } from './appels/brouillon';
import { retirerPropositionsAbsentes, type Brouillon } from './utils/regles';
import { estProposition, propositionParId, rafraichirPropositions } from './appels/propositions';
import { CLOTURE_PAR_DEFAUT } from './utils/format';
import { renouvelerSessionExpiree, useSessionLocale } from './appels/session';
import { lireMesMasquages, type MonMasquage } from './appels/masquages';
import { useApercuStocke } from './appels/apercu';
import { activerParcours, noterEtape } from './appels/parcours';
import { usePresence } from './appels/presence';
import { etapesDuChoix, etatEffectif, masquageApercu, peutApercu, type Apercu } from './utils/apercu';
import { effacerVoteCache, ecrireVoteCache, lireMonVoteServeur, lireVoteCache, resumeDuVote } from './appels/monVote';
import { brouillonDuVote, doitRemplirDepuisServeur, voteDuCompte, type VoteResume } from './utils/monVote';
import { brouillonVide } from './appels/brouillon';
import type { MonVote } from './appels/api';

interface PudiContexteValeur {
  brouillon: Brouillon;
  majBrouillon: (b: Brouillon) => void;
  /** null while unknown (first load, offline without answer). Seen through JOEL's preview when one is on. */
  etat: EtatConsultation | null;
  /** Server state, never changed by the preview. */
  etatReel: EtatConsultation | null;
  /** JOEL may use « Voir comme » (PUDI-CC-11). */
  joel: boolean;
  /** Active preview (always null for anyone but JOEL). */
  apercu: Apercu | null;
  /** The maskings were read for the current state (or there is nothing to read). */
  masquagesLus: boolean;
  /** Server unreachable on the last read. */
  horsLigne: boolean;
  /** Server time minus device time (ms), so the countdown never trusts the phone clock. */
  decalage: number;
  clotureAt: string;
  rechargerEtat: () => Promise<void>;
  /** Replace the state (e.g. with the authenticated read on the sending page). */
  definirEtat: (e: EtatConsultation) => void;
  /** True when the final sending is allowed for this visitor. */
  envoiOuvert: boolean;
  /** Titles of the proposals removed from the draft because they were withdrawn. */
  propositionsRetirees: string[];
  effacerPropositionsRetirees: () => void;
  /** Active automatic maskings of the signed-in account (PUDI-CC-09), empty otherwise. */
  masquages: MonMasquage[];
  rechargerMasquages: () => Promise<void>;
  /** Own vote of the signed-in account (server, or the device copy offline); null in the preview. */
  monVote: VoteResume | null;
  /** Call after a vote was sent or read on the sending page. */
  noterMonVote: (v: MonVote) => void;
}

const Ctx = createContext<PudiContexteValeur | null>(null);

export function PudiProvider({ children }: { children: ReactNode }) {
  const [brouillon, setBrouillon] = useState<Brouillon>(() => lireBrouillon());
  const [etatReel, setEtat] = useState<EtatConsultation | null>(null);
  const [horsLigne, setHorsLigne] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);
  const [decalage, setDecalage] = useState(0);

  const definirEtat = useCallback((e: EtatConsultation) => {
    setEtat(e);
    setHorsLigne(false);
    const serveur = Date.parse(e.maintenant);
    if (Number.isFinite(serveur)) setDecalage(serveur - Date.now());
  }, []);

  const rechargerEtat = useCallback(async () => {
    try {
      definirEtat(await lireEtat());
    } catch {
      setHorsLigne(true);
    }
  }, [definirEtat]);

  // Re-read the state when the visitor signs in or out (est_admin, a_vote change).
  const email = useSessionLocale()?.email ?? null;
  useEffect(() => {
    void rechargerEtat();
  }, [email, rechargerEtat]);
  // PUDI-CC-16.1: signed in on this device but the token expired (pages without supabase-js never
  // renew it): renew it once, then read the state again as the signed-in account.
  useEffect(() => {
    if (!email || horsLigne || jetonLocal()) return;
    void renouvelerSessionExpiree().then((ok) => {
      if (ok) void rechargerEtat();
    });
  }, [email, horsLigne, rechargerEtat]);

  useEffect(() => {
    const enLigne = () => void rechargerEtat();
    const horsLigneEv = () => setHorsLigne(true);
    window.addEventListener('online', enLigne);
    window.addEventListener('offline', horsLigneEv);
    return () => {
      window.removeEventListener('online', enLigne);
      window.removeEventListener('offline', horsLigneEv);
    };
  }, [rechargerEtat]);

  const majBrouillon = useCallback((b: Brouillon) => {
    ecrireBrouillon(b);
    setBrouillon(lireBrouillon());
  }, []);

  // Proposals: refreshed on each online visit; a withdrawn proposal leaves the draft with a message.
  const [propositionsRetirees, setPropositionsRetirees] = useState<string[]>([]);
  const verifierPropositions = useCallback(async () => {
    try {
      const { liste, avant } = await rafraichirPropositions();
      const { brouillon: b, retires } = retirerPropositionsAbsentes(lireBrouillon(), liste.map((p) => p.id), estProposition);
      if (!retires.length) return;
      ecrireBrouillon(b);
      setBrouillon(lireBrouillon());
      setPropositionsRetirees(retires.map((id) => propositionParId(avant, id)?.intitule ?? id));
    } catch {
      /* offline: the cached list is shown, the draft is kept as it is */
    }
  }, []);
  useEffect(() => {
    void verifierPropositions();
    window.addEventListener('online', verifierPropositions);
    return () => window.removeEventListener('online', verifierPropositions);
  }, [verifierPropositions]);
  const effacerPropositionsRetirees = useCallback(() => setPropositionsRetirees([]), []);

  // Maskings: read only for a signed-in account that voted, again on each new server state.
  const [masquages, setMasquages] = useState<MonMasquage[]>([]);
  const doitLireMasquages = !!etatReel?.connecte && !!etatReel?.a_vote;
  // Key of the state the maskings were read for: the results on return wait for it.
  const cleMasquages = `${email ?? ''}|${etatReel?.maintenant ?? ''}`;
  const [masquagesLusPour, setMasquagesLusPour] = useState<string | null>(null);
  const masquagesLus = !doitLireMasquages || masquagesLusPour === cleMasquages;
  const lireMasquagesPour = useCallback(async (cle: string) => {
    try {
      setMasquages(await lireMesMasquages());
    } catch {
      /* offline: the last answer stays */
    } finally {
      setMasquagesLusPour(cle);
    }
  }, []);
  const rechargerMasquages = useCallback(() => lireMasquagesPour(cleMasquages), [lireMasquagesPour, cleMasquages]);
  useEffect(() => {
    if (!doitLireMasquages) {
      setMasquages([]);
      return;
    }
    void lireMasquagesPour(cleMasquages);
  }, [doitLireMasquages, cleMasquages, lireMasquagesPour]);

  // PUDI-CC-11: JOEL's preview, ignored for anyone else (the server rights never change).
  const apercuStocke = useApercuStocke();
  const joel = peutApercu(etatReel, email) && !!etatReel;
  const apercu = apercuStocke && peutApercu(etatReel, email) ? apercuStocke : null;
  const etat = useMemo(() => etatEffectif(etatReel, apercu), [etatReel, apercu]);
  const masquagesVus = useMemo(
    () =>
      apercu ? (apercu.role === 'votant' && apercu.masque ? [masquageApercu()] : []) : masquages,
    [apercu, masquages]
  );

  // PUDI-CC-16.1: own vote on every device. Read once per account as soon as the server says
  // « a_vote »; an EMPTY draft is filled with it, a different draft is kept (« Vous modifiez… »).
  // Never in the preview; the device copy is cleared on sign-out.
  const [monVoteReel, setMonVoteReel] = useState<VoteResume | null>(() => lireVoteCache());
  const voteLuPour = useRef<string | null>(null);
  const noterMonVote = useCallback(
    (v: MonVote) => {
      if (!email) return;
      const r = resumeDuVote(v, email);
      ecrireVoteCache(r);
      setMonVoteReel(r);
    },
    [email]
  );
  useEffect(() => {
    if (email) return;
    voteLuPour.current = null;
    effacerVoteCache();
    setMonVoteReel(null);
  }, [email]);
  const avecApercu = !!apercuStocke && joel;
  useEffect(() => {
    if (!email || !etatReel?.connecte || avecApercu) return;
    if (!etatReel.a_vote) {
      // Confirmed by the server: no vote for this account (e.g. vote removed).
      effacerVoteCache();
      setMonVoteReel(null);
      return;
    }
    if (voteLuPour.current === email) return;
    voteLuPour.current = email;
    const pour = email;
    lireMonVoteServeur()
      .then((v) => {
        if (voteLuPour.current !== pour || !v) return;
        noterMonVote(v);
        if (doitRemplirDepuisServeur(lireBrouillon(), v)) {
          ecrireBrouillon(brouillonDuVote(v));
          setBrouillon(lireBrouillon());
        }
      })
      .catch(() => {
        // Offline or refused: the device copy stays, another try on the next state.
        if (voteLuPour.current === pour) voteLuPour.current = null;
      });
  }, [email, etatReel, avecApercu, noterMonVote]);
  const monVote = avecApercu ? null : voteDuCompte(monVoteReel, email);
  // Offline on a device that already showed the vote: an empty draft takes the device copy.
  useEffect(() => {
    if (!monVote || !brouillonVide(lireBrouillon())) return;
    ecrireBrouillon(brouillonDuVote(monVote));
    setBrouillon(lireBrouillon());
  }, [monVote]);

  // Anonymous funnel: only once published (no test votes) and never during the preview.
  const parcoursOk = apercu ? false : etatReel ? etatReel.publie : null;
  useEffect(() => {
    activerParcours(parcoursOk);
  }, [parcoursOk]);
  useEffect(() => {
    noterEtape('visite');
  }, []);
  // PUDI-CC-14.3: « En ligne en ce moment », same switch as the funnel.
  usePresence(parcoursOk === true);
  useEffect(() => {
    if (parcoursOk === false) return;
    for (const e of etapesDuChoix(brouillon.priorites.length)) noterEtape(e);
  }, [parcoursOk, brouillon.priorites.length]);

  const valeur = useMemo<PudiContexteValeur>(
    () => ({
      brouillon,
      majBrouillon,
      etat,
      etatReel,
      joel,
      apercu,
      masquagesLus,
      horsLigne,
      decalage,
      clotureAt: etat?.cloture_at ?? CLOTURE_PAR_DEFAUT,
      rechargerEtat,
      definirEtat,
      envoiOuvert: !!etat && !etat.clos && (etat.publie || etat.est_admin),
      propositionsRetirees,
      effacerPropositionsRetirees,
      masquages: masquagesVus,
      rechargerMasquages,
      monVote,
      noterMonVote
    }),
    [
      brouillon,
      majBrouillon,
      etat,
      etatReel,
      joel,
      apercu,
      masquagesLus,
      horsLigne,
      decalage,
      rechargerEtat,
      definirEtat,
      propositionsRetirees,
      effacerPropositionsRetirees,
      masquagesVus,
      rechargerMasquages,
      monVote,
      noterMonVote
    ]
  );

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function usePudi(): PudiContexteValeur {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePudi outside PudiProvider');
  return v;
}

/** Data file, loaded on demand (discovery and choice pages only). */
export function useDonnees(): { donnees: PudiDonnees | null; erreur: boolean; reessayer: () => void } {
  const [donnees, setDonnees] = useState<PudiDonnees | null>(() => donneesChargees());
  const [erreur, setErreur] = useState(false);
  const [essai, setEssai] = useState(0);
  useEffect(() => {
    if (donnees) return;
    let actif = true;
    chargerDonnees()
      .then((d) => actif && setDonnees(d))
      .catch(() => actif && setErreur(true));
    return () => {
      actif = false;
    };
  }, [donnees, essai]);
  return {
    donnees,
    erreur,
    reessayer: () => {
      setErreur(false);
      setEssai((n) => n + 1);
    }
  };
}
