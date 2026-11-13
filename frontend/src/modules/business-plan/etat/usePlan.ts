// One plan on screen: load, immutable update, autosave (400 ms after the last change), and a flush
// when the page is hidden or closed, so that nothing typed is lost.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Plan } from '../types';
import { ConflitPlan, ecouterPlans, effacerSecours, ecrireSecours, enregistrerPlan, lirePlan } from '../db/plans';
import { planExempleParId } from '../data/exemples';
import { abonnerPretest, signalerModification } from '../sync';
import { copier } from './vide';
import { inscrireSauvegarde, suivreSauvegarde } from './pwa';
import { montrerAvisPlanPlusRecent } from './avisPlan';

const DELAI = 400;

export type EtatPlan = { statut: 'chargement' } | { statut: 'absent' } | { statut: 'pret'; plan: Plan };

export function usePlan(id: string | undefined) {
  const [etat, setEtat] = useState<EtatPlan>({ statut: 'chargement' });
  const planRef = useRef<Plan | null>(null);
  const minuterie = useRef<number | null>(null);
  const enAttente = useRef(false);
  // NEC-CC-25: this page's saves run one after the other (a save never starts from a rev that the
  // previous one of this same page is about to replace), and the highest rev known per plan.
  const file = useRef<Promise<void>>(Promise.resolve());
  const ecritureEnCours = useRef(false);
  const revConnue = useRef(new Map<string, number>());
  const generation = useRef(0);

  const noterRev = useCallback((p: Plan | null) => {
    if (p && !p.exemple) revConnue.current.set(p.id, Math.max(revConnue.current.get(p.id) ?? 0, p.rev ?? 0));
  }, []);

  /** NEC-CC-25: the stored plan is newer; it replaces this page's one. `refus`: this page's change was dropped. */
  const adopterStocke = useCallback(
    (stocke: Plan, refus: boolean) => {
      const actuel = planRef.current;
      if (!actuel || actuel.id !== stocke.id) return;
      if (minuterie.current !== null) {
        window.clearTimeout(minuterie.current);
        minuterie.current = null;
      }
      enAttente.current = false;
      generation.current += 1;
      // NEC-CC-22: the post-test seen open stays in memory (never unset by a later save).
      const ouvertLe = stocke.posttestOuvertLe ?? actuel.posttestOuvertLe;
      const suivant: Plan = ouvertLe ? { ...stocke, posttestOuvertLe: ouvertLe } : stocke;
      planRef.current = suivant;
      noterRev(suivant);
      setEtat({ statut: 'pret', plan: suivant });
      if (refus) montrerAvisPlanPlusRecent();
    },
    [noterRev]
  );

  /** `urgence`: the page is being hidden or closed, a synchronous safety copy is written first. */
  const sauverInterne = useCallback(
    (urgence = false): Promise<void> => {
      if (minuterie.current !== null) {
        window.clearTimeout(minuterie.current);
        minuterie.current = null;
      }
      const plan = planRef.current;
      if (!enAttente.current || !plan || plan.exemple) return file.current;
      enAttente.current = false;
      if (urgence) {
        // Base rev + 1 (+ 1 more when a save of this page is being written): an old page's copy loses at replay.
        const base = Math.max(plan.rev ?? 0, revConnue.current.get(plan.id) ?? 0) + (ecritureEnCours.current ? 1 : 0);
        ecrireSecours({ ...plan, rev: base + 1, modifieLe: new Date().toISOString() });
      }
      const gen = generation.current;
      const tache = async () => {
        // The stored plan replaced this page's one meanwhile: this older change is never written.
        if (generation.current !== gen) return;
        // Rev known by this page now (a previous save of this page may have finished meanwhile).
        const aEcrire: Plan = { ...plan, rev: Math.max(plan.rev ?? 0, revConnue.current.get(plan.id) ?? 0) };
        ecritureEnCours.current = true;
        try {
          const sauve = await enregistrerPlan(aEcrire);
          noterRev(sauve);
          if (urgence) effacerSecours(sauve.id, sauve.rev);
          // Keep the new rev unless the person typed again meanwhile (that version is saved next).
          if (planRef.current === plan) planRef.current = sauve;
          else if (planRef.current && planRef.current.id === sauve.id) planRef.current = { ...planRef.current, rev: sauve.rev };
          signalerModification(sauve);
        } catch (e) {
          if (e instanceof ConflitPlan) {
            // Another page saved this plan meanwhile: its version wins, this page's change is dropped.
            effacerSecours(e.plan.id, e.plan.rev ?? 0);
            adopterStocke(e.plan, true);
            return;
          }
          enAttente.current = true;
        } finally {
          ecritureEnCours.current = false;
        }
      };
      const p = file.current.then(tache);
      file.current = p.catch(() => undefined);
      return p;
    },
    [adopterStocke, noterRev]
  );

  /**
   * NEC-CC-25: reads the stored plan (page back to the front, or another page announced a save). Newer:
   * reloaded silently, or, when this page has a change not yet saved, that change is dropped and said.
   */
  const verifierStocke = useCallback(() => {
    file.current = file.current
      .then(async () => {
        const actuel = planRef.current;
        if (!actuel || actuel.exemple) return;
        const stocke = await lirePlan(actuel.id).catch(() => null);
        const maintenant = planRef.current;
        if (!stocke || !maintenant || maintenant.id !== stocke.id) return;
        if ((stocke.rev ?? 0) <= Math.max(maintenant.rev ?? 0, revConnue.current.get(stocke.id) ?? 0)) return;
        adopterStocke(stocke, enAttente.current);
      })
      .catch(() => undefined);
  }, [adopterStocke]);

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
      noterRev(plan);
      setEtat(plan ? { statut: 'pret', plan } : { statut: 'absent' });
    })();
    return () => {
      annule = true;
      void sauver();
    };
  }, [id, sauver, noterRev]);

  useEffect(() => {
    const cache = () => {
      if (document.visibilityState === 'hidden') void sauver(true);
      // NEC-CC-25: back to the front, the stored plan may have been saved by another page meanwhile.
      else if (document.visibilityState === 'visible') verifierStocke();
    };
    const quitter = () => void sauver(true);
    const retour = () => verifierStocke();
    document.addEventListener('visibilitychange', cache);
    window.addEventListener('pagehide', quitter);
    window.addEventListener('focus', retour);
    return () => {
      document.removeEventListener('visibilitychange', cache);
      window.removeEventListener('pagehide', quitter);
      window.removeEventListener('focus', retour);
      void sauver();
    };
  }, [sauver, verifierStocke]);

  // NEC-CC-25: another open page saved a plan; this page reloads it when it holds an older rev of it.
  useEffect(
    () =>
      ecouterPlans(({ id: planId, rev }) => {
        const actuel = planRef.current;
        if (!actuel || actuel.exemple || actuel.id !== planId) return;
        if (rev > Math.max(actuel.rev ?? 0, revConnue.current.get(planId) ?? 0)) verifierStocke();
      }),
    [verifierStocke]
  );

  // NEC-CC-20: the trainer's paper pre-test was saved behind this screen; keep it (and its rev) in memory
  // so the next save neither erases it nor reuses a rev the server already holds.
  useEffect(
    () =>
      abonnerPretest((sauve) => {
        const actuel = planRef.current;
        if (!actuel || actuel.id !== sauve.id) return;
        // NEC-CC-22: the post-test seen open is kept in memory too (never unset by a later save).
        const ouvertLe = actuel.posttestOuvertLe ?? sauve.posttestOuvertLe;
        const ouverture = ouvertLe ? { posttestOuvertLe: ouvertLe } : {};
        // NEC-CC-21: a pre-test received from the trainer is replaced or cleared by his correction.
        noterRev(sauve);
        if (actuel.pretest?.valideLe && actuel.pretest.source !== 'formateur') {
          planRef.current = { ...actuel, ...ouverture, rev: sauve.rev };
          if (sauve.pretest?.valideLe && sauve.pretest.source !== 'formateur') {
            // NEC-CC-22: only the post-test opening was saved behind this screen; nothing to save again.
            setEtat({ statut: 'pret', plan: planRef.current });
            return;
          }
          // Validated on this phone meanwhile: it wins, saved again over the trainer's one.
          enAttente.current = true;
          void sauver();
          return;
        }
        const suivant: Plan = { ...actuel, ...ouverture, pretest: sauve.pretest, niveauChiffres: sauve.niveauChiffres, rev: sauve.rev };
        planRef.current = suivant;
        setEtat({ statut: 'pret', plan: suivant });
      }),
    [sauver, noterRev]
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
