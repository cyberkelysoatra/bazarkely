// Data of the signed-in person: vc_mon_espace(), read once per sign-in and re-read on demand
// (after the invitation, after « Mes infos », after an answer or a confirmation). The last copy is
// kept on the device (D6) so that the question pages open without network.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { monEspace } from './appels/api';
import { ecrireLocal, lireLocal } from './appels/local';
import { useSessionLocale, type SessionLocale } from './appels/session';
import type { Espace } from './utils/types';

export type EtatChargement = 'deconnecte' | 'chargement' | 'pret' | 'erreur';

interface Valeur {
  session: SessionLocale | null;
  etat: EtatChargement;
  liste: Espace[] | null;
  /** True after 5 s of loading (« Le réseau est lent, nous continuons. »). */
  lent: boolean;
  recharger: () => Promise<Espace[] | null>;
}

const Contexte = createContext<Valeur | null>(null);

export function EspaceProvider({ children }: { children: ReactNode }) {
  const session = useSessionLocale();
  const uid = session?.id ?? '';
  const [etat, setEtat] = useState<EtatChargement>(uid ? 'chargement' : 'deconnecte');
  const [liste, setListe] = useState<Espace[] | null>(null);
  const [lent, setLent] = useState(false);
  const demande = useRef(0);

  const recharger = useCallback(async () => {
    if (!uid) return null;
    const n = ++demande.current;
    setEtat((e) => (e === 'pret' ? e : 'chargement'));
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('hors ligne');
      const l = await monEspace();
      if (n !== demande.current) return l;
      setListe(Array.isArray(l) ? l : []);
      setEtat('pret');
      void ecrireLocal(`espace:${uid}`, Array.isArray(l) ? l : []);
      return l;
    } catch {
      // No network: the copy kept on the device, else the error card.
      const garde = await lireLocal<Espace[]>(`espace:${uid}`);
      if (n !== demande.current) return null;
      if (Array.isArray(garde)) {
        setListe((x) => x ?? garde);
        setEtat('pret');
        return null;
      }
      setEtat((e) => (e === 'pret' ? e : 'erreur'));
      return null;
    }
  }, [uid]);

  useEffect(() => {
    demande.current++;
    setListe(null);
    if (!uid) {
      setEtat('deconnecte');
      return;
    }
    setEtat('chargement');
    void recharger();
  }, [uid, recharger]);

  useEffect(() => {
    if (etat !== 'chargement') {
      setLent(false);
      return;
    }
    const t = window.setTimeout(() => setLent(true), 5000);
    return () => window.clearTimeout(t);
  }, [etat]);

  const valeur = useMemo(() => ({ session, etat, liste, lent, recharger }), [session, etat, liste, lent, recharger]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function useEspace(): Valeur {
  const v = useContext(Contexte);
  if (!v) throw new Error('useEspace outside EspaceProvider');
  return v;
}
