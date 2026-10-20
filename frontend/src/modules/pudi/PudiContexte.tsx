// Shared state of the PUDi entry: draft of the choice, state of the consultation, data file.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { chargerDonnees, donneesChargees, type PudiDonnees } from './data';
import { lireEtat, type EtatConsultation } from './appels/api';
import { ecrireBrouillon, lireBrouillon } from './appels/brouillon';
import type { Brouillon } from './utils/regles';
import { CLOTURE_PAR_DEFAUT } from './utils/format';

interface PudiContexteValeur {
  brouillon: Brouillon;
  majBrouillon: (b: Brouillon) => void;
  /** null while unknown (first load, offline without answer). */
  etat: EtatConsultation | null;
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
}

const Ctx = createContext<PudiContexteValeur | null>(null);

export function PudiProvider({ children }: { children: ReactNode }) {
  const [brouillon, setBrouillon] = useState<Brouillon>(() => lireBrouillon());
  const [etat, setEtat] = useState<EtatConsultation | null>(null);
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

  useEffect(() => {
    void rechargerEtat();
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

  const valeur = useMemo<PudiContexteValeur>(
    () => ({
      brouillon,
      majBrouillon,
      etat,
      horsLigne,
      decalage,
      clotureAt: etat?.cloture_at ?? CLOTURE_PAR_DEFAUT,
      rechargerEtat,
      definirEtat,
      envoiOuvert: !!etat && !etat.clos && (etat.publie || etat.est_admin)
    }),
    [brouillon, majBrouillon, etat, horsLigne, decalage, rechargerEtat, definirEtat]
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
