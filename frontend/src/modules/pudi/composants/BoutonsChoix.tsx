// Votes of the sheet (« − n + », PUDI-CC-17) with the blocking message of the 13th vote.
// PUDI-CC-18: no more « Marquer urgent » (urgency is read from the votes ranking).
// PUDI-CC-19: the 13th vote unfolds the quick transfer panel instead of an error line, and every
// gesture tells the automatic saving (after the first vote) that the draft changed.
// PUDI-CC-20: a gesture inside the card that holds the panel never closes it (only « Fermer » or a
// tap outside); on the sheet, each « + » / « − » that opens or changes the panel scrolls smoothly so
// the votes block sits just under the header with the whole panel visible.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { frPages } from '../i18n/frPages';
import { usePudi } from '../PudiContexte';
import { signalerGeste } from '../appels/autoEnregistrement';
import { ajouterVoix, peutAjouterVoix, retirerVoix, voixPour } from '../utils/regles';
import { Icone } from './Icones';
import { TransfertDeroulant } from './Transfert';
import { defilerVers, zoneVisible } from '../utils/defilement';
import { CompteurVoix } from './Voix';

/** Page and card whose « + » was refused (12 votes placed): one transfer panel open at a time. */
let pleinCourant: string | null = null;
const abonnesPlein = new Set<() => void>();
function setPlein(id: string | null): void {
  if (pleinCourant === id) return;
  pleinCourant = id;
  abonnesPlein.forEach((f) => f());
}
const abonnerPlein = (f: () => void) => {
  abonnesPlein.add(f);
  return () => abonnesPlein.delete(f);
};
const lirePlein = () => pleinCourant;
const fermerPlein = () => setPlein(null);

export function useBasculeChoix() {
  const { brouillon, majBrouillon } = usePudi();
  const { pathname } = useLocation();
  const ouvert = useSyncExternalStore(abonnerPlein, lirePlein, lirePlein);
  // Opened on another page: closed here, and forgotten as soon as a card of this page shows.
  const plein = ouvert?.startsWith(`${pathname}|`) ? ouvert.slice(pathname.length + 1) : null;
  useEffect(() => {
    if (ouvert && !ouvert.startsWith(`${pathname}|`)) setPlein(null);
  }, [ouvert, pathname]);
  /** One more vote (with 12 placed: the transfer panel opens under the card). */
  const ajouter = (id: string) => {
    if (!peutAjouterVoix(brouillon)) {
      setPlein(`${pathname}|${id}`);
      return;
    }
    if (pleinCourant !== `${pathname}|${id}`) setPlein(null);
    majBrouillon(ajouterVoix(brouillon, id));
    signalerGeste('voix');
  };
  const retirer = (id: string) => {
    if (pleinCourant !== `${pathname}|${id}`) setPlein(null);
    majBrouillon(retirerVoix(brouillon, id));
    signalerGeste('voix');
  };
  return { brouillon, ajouter, retirer, plein, fermerPlein };
}

export function MessageBlocage({ texte }: { texte: string }) {
  return (
    <p role="alert" className="mt-2 flex gap-2 items-start text-[0.875rem] text-[#9C3F21] font-bold">
      <Icone nom="alerte" className="w-4 h-4 mt-0.5" />
      {texte}
    </p>
  );
}

/** `tranche` is kept in the props for the callers (sheet of a programme or of a proposal). */
export function BoutonsChoix({ id, titre, desactive = false }: { id: string; titre: string; tranche?: string; desactive?: boolean }) {
  const { brouillon, ajouter, retirer, plein, fermerPlein } = useBasculeChoix();
  const n = voixPour(brouillon, id);
  const bloc = useRef<HTMLDivElement>(null);
  // After the render (panel mounted or changed): top of the block just under the header.
  const aligner = () =>
    requestAnimationFrame(() => {
      const el = bloc.current;
      if (el) void defilerVers(window.scrollY + el.getBoundingClientRect().top - zoneVisible().haut);
    });
  const plus = () => {
    const panneau = !peutAjouterVoix(brouillon) || plein === id;
    ajouter(id);
    if (panneau) aligner();
  };
  const moins = () => {
    const panneau = plein === id;
    retirer(id);
    if (panneau) aligner();
  };
  return (
    <div ref={bloc} data-bloc-voix={id}>
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 ${n ? 'border-marine bg-[#EAF0FF]' : 'border-filet bg-white'}`}
        data-voix-fiche={n}
      >
        <span className="font-bold text-[0.9375rem] text-marine">
          {frPages.voix.mesVoixFiche}
          <span className="block text-[0.8125rem] font-normal text-gris">{frPages.voix.compteur(brouillon.priorites.length)}</span>
        </span>
        <CompteurVoix titre={titre} n={n} ajouter={plus} retirer={moins} desactive={desactive} grand />
      </div>
      <TransfertDeroulant ouvert={plein === id} vers={id} titreVers={titre} fermer={fermerPlein} montrer={false} />
    </div>
  );
}
