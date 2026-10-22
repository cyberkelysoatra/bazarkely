// Shared state of the PUDi entry: draft of the choice, state of the consultation, data file.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { chargerDonnees, donneesChargees, type PudiDonnees } from './data';
import { lireEtat, type EtatConsultation } from './appels/api';
import { ecrireBrouillon, lireBrouillon } from './appels/brouillon';
import { retirerPropositionsAbsentes, type Brouillon } from './utils/regles';
import { estProposition, propositionParId, rafraichirPropositions } from './appels/propositions';
import { CLOTURE_PAR_DEFAUT } from './utils/format';
import { useSessionLocale } from './appels/session';
import { lireMesMasquages, type MonMasquage } from './appels/masquages';
import { useApercuStocke } from './appels/apercu';
import { activerParcours, noterEtape } from './appels/parcours';
import { etapesDuChoix, etatEffectif, masquageApercu, peutApercu, type Apercu } from './utils/apercu';

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

  // Anonymous funnel: only once published (no test votes) and never during the preview.
  const parcoursOk = apercu ? false : etatReel ? etatReel.publie : null;
  useEffect(() => {
    activerParcours(parcoursOk);
  }, [parcoursOk]);
  useEffect(() => {
    noterEtape('visite');
  }, []);
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
      rechargerMasquages
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
      rechargerMasquages
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
