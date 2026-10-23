// PUDI-CC-14.4: network retry shared by the vote, the public and private messages and the group
// lines. On a network failure or a timeout what was typed is kept, « Pas de réseau : rien n'est
// perdu » is shown with « Réessayer », and the same send is retried once by itself when the
// browser comes back online. Every retried send is idempotent on the server (one vote per
// account, messages with a client id, a group line refused when its numbers are already there).
import { useCallback, useEffect, useRef, useState } from 'react';
import { extraireCode } from '../utils/erreurs';
import { Icone } from './Icones';

export const PAS_DE_RESEAU = 'Pas de réseau : rien n’est perdu';

/** Network failure or timeout (a timeout is not a failure: the server may have written). */
export function estErreurReseau(e: unknown): boolean {
  return extraireCode(e) === 'RESEAU' || (typeof navigator !== 'undefined' && navigator.onLine === false);
}

/**
 * `envoyer` returns once done or throws. On a network error the hook keeps the send pending:
 * `enAttente` is true, `reessayer()` retries by hand, and one automatic retry runs on `online`.
 */
export function useEnvoiFiable<A extends unknown[]>(envoyer: (...a: A) => Promise<void>, surErreur?: (e: unknown) => void) {
  const [enAttente, setEnAttente] = useState(false);
  const derniers = useRef<A | null>(null);
  const auto = useRef(false);
  const fonction = useRef(envoyer);
  fonction.current = envoyer;
  const erreur = useRef(surErreur);
  erreur.current = surErreur;

  const lancer = useCallback(async (...a: A): Promise<boolean> => {
    derniers.current = a;
    try {
      await fonction.current(...a);
      setEnAttente(false);
      derniers.current = null;
      return true;
    } catch (e) {
      if (estErreurReseau(e)) {
        setEnAttente(true);
        auto.current = true;
        return false;
      }
      setEnAttente(false);
      derniers.current = null;
      throw e;
    }
  }, []);

  const reessayer = useCallback(async () => {
    if (!derniers.current) return false;
    return lancer(...derniers.current);
  }, [lancer]);

  useEffect(() => {
    if (!enAttente) return;
    const enLigne = () => {
      if (!auto.current) return;
      auto.current = false;
      void reessayer().catch((e) => erreur.current?.(e));
    };
    window.addEventListener('online', enLigne);
    return () => window.removeEventListener('online', enLigne);
  }, [enAttente, reessayer]);

  const abandonner = useCallback(() => {
    derniers.current = null;
    setEnAttente(false);
  }, []);

  return { lancer, reessayer, enAttente, abandonner };
}

export function BandeauReseau({ reessayer, cours = false }: { reessayer: () => void; cours?: boolean }) {
  return (
    <div role="alert" className="flex items-center gap-2 bg-[#FFF6E0] border-l-4 border-[#926407] rounded-r-lg px-3 py-2" data-pas-de-reseau="">
      <Icone nom="horsLigne" className="w-5 h-5 shrink-0" />
      <p className="flex-1 min-w-0 text-[0.875rem] font-bold">{PAS_DE_RESEAU}</p>
      <button type="button" onClick={reessayer} disabled={cours} className="min-h-[44px] px-3 rounded-lg bg-marine text-white text-[0.875rem] font-bold disabled:opacity-50" data-reessayer="">
        Réessayer
      </button>
    </div>
  );
}
