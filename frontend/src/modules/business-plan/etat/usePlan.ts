// One plan on screen: load, immutable update, autosave (400 ms after the last change), and a flush
// when the page is hidden or closed, so that nothing typed is lost.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Plan } from '../types';
import { effacerSecours, ecrireSecours, enregistrerPlan, lirePlan } from '../db/plans';
import { planExempleParId } from '../data/exemples';
import { abonnerPretest, signalerModification } from '../sync';
import { copier } from './vide';
import { inscrireSauvegarde, suivreSauvegarde } from './pwa';

const DELAI = 400;

export type EtatPlan = { statut: 'chargement' } | { statut: 'absent' } | { statut: 'pret'; plan: Plan };

export function usePlan(id: string | undefined) {
  const [etat, setEtat] = useState<EtatPlan>({ statut: 'chargement' });
  const planRef = useRef<Plan | null>(null);
  const minuterie = useRef<number | null>(null);
  const enAttente = useRef(false);

  /** `urgence`: the page is being hidden or closed, a synchronous safety copy is written first. */
  const sauverInterne = useCallback(async (urgence = false) => {
    if (minuterie.current !== null) {
      window.clearTimeout(minuterie.current);
      minuterie.current = null;
    }
    const plan = planRef.current;
    if (!enAttente.current || !plan || plan.exemple) return;
    enAttente.current = false;
    if (urgence) ecrireSecours({ ...plan, rev: (plan.rev ?? 0) + 1, modifieLe: new Date().toISOString() });
    try {
      const sauve = await enregistrerPlan(plan);
      if (urgence) effacerSecours(sauve.id, sauve.rev);
      // Keep the new rev unless the person typed again meanwhile (that version is saved next).
      if (planRef.current === plan) planRef.current = sauve;
      else if (planRef.current) planRef.current = { ...planRef.current, rev: sauve.rev };
      signalerModification(sauve);
    } catch {
      enAttente.current = true;
    }
  }, []);

  // NEC-CC-21: every save is followed by the automatic update, which waits for it before reloading.
  const sauver = useCallback(
    (urgence = false) => {
      const p = sauverInterne(urgence);
      suivreSauvegarde(p);
      return p;
    },
    [sauverInterne]
  );
  useEffect(() => inscrireSauvegarde(() => sauver()), [sauver]);

  useEffect(() => {
    let annule = false;
    setEtat({ statut: 'chargement' });
    planRef.current = null;
    if (!id) {
      setEtat({ statut: 'absent' });
      return;
    }
    (async () => {
      // The 6 worked examples (JUS'NOSY keeps its id 'exemple') are bundled and read only (NEC-CC-13).
      const plan = planExempleParId(id) ?? (await lirePlan(id).catch(() => null));
      if (annule) return;
      planRef.current = plan;
      setEtat(plan ? { statut: 'pret', plan } : { statut: 'absent' });
    })();
    return () => {
      annule = true;
      void sauver();
    };
  }, [id, sauver]);

  useEffect(() => {
    const cache = () => {
      if (document.visibilityState === 'hidden') void sauver(true);
    };
    const quitter = () => void sauver(true);
    document.addEventListener('visibilitychange', cache);
    window.addEventListener('pagehide', quitter);
    return () => {
      document.removeEventListener('visibilitychange', cache);
      window.removeEventListener('pagehide', quitter);
      void sauver();
    };
  }, [sauver]);

  // NEC-CC-20: the trainer's paper pre-test was saved behind this screen; keep it (and its rev) in memory
  // so the next save neither erases it nor reuses a rev the server already holds.
  useEffect(
    () =>
      abonnerPretest((sauve) => {
        const actuel = planRef.current;
        if (!actuel || actuel.id !== sauve.id) return;
        // NEC-CC-21: a pre-test received from the trainer is replaced or cleared by his correction.
        if (actuel.pretest?.valideLe && actuel.pretest.source !== 'formateur') {
          // Validated on this phone meanwhile: it wins, saved again over the trainer's one.
          planRef.current = { ...actuel, rev: sauve.rev };
          enAttente.current = true;
          void sauver();
          return;
        }
        const suivant: Plan = { ...actuel, pretest: sauve.pretest, niveauChiffres: sauve.niveauChiffres, rev: sauve.rev };
        planRef.current = suivant;
        setEtat({ statut: 'pret', plan: suivant });
      }),
    [sauver]
  );

  const modifier = useCallback(
    (recette: (p: Plan) => void) => {
      const actuel = planRef.current;
      if (!actuel || actuel.exemple) return;
      const suivant = copier(actuel);
      recette(suivant);
      planRef.current = suivant;
      setEtat({ statut: 'pret', plan: suivant });
      enAttente.current = true;
      if (minuterie.current !== null) window.clearTimeout(minuterie.current);
      minuterie.current = window.setTimeout(() => void sauver(), DELAI);
    },
    [sauver]
  );

  return { etat, modifier, sauverMaintenant: sauver };
}
