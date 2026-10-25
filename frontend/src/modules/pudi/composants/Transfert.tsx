// PUDI-CC-19 (specification v11, 4.5): « + » with the 12 votes placed unfolds this panel under the
// card instead of an error line: the programmes and proposals that have votes (most first), each
// with « − » (frees a vote) and « Déplacer 1 voix ici » (takes one from there and puts it on the
// tapped card in one gesture). Announced to screen readers, focus moved to its title, buttons of
// 44 px at least. Lazy pages only.
// PUDI-CC-20: the panel slides out of the bottom of its card (height and fade, soft spring-like
// easing, reverse on closing), stays open while working in it and closes only with « Fermer » or a
// tap outside the card that holds it. The name of a line leads to that card in « Mon choix ».
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { frPages } from '../i18n/frPages';
import { useDonnees, usePudi } from '../PudiContexte';
import { programmeParId } from '../data';
import { propositionParId, usePropositions } from '../appels/propositions';
import { signalerGeste } from '../appels/autoEnregistrement';
import { VOIX, ajouterVoix, regrouperVoix, retirerVoix } from '../utils/regles';
import { titreCourt } from '../utils/monVote';
import { DUREE_PANNEAU, EASING_PANNEAU, demanderCentrage, montrerBloc, mouvementReduit } from '../utils/defilement';
import { Icone } from './Icones';

/** Card (list) or votes block (sheet) holding the panel: taps inside it never close the panel. */
const CONTENEUR = 'li[data-carte-choix], [data-bloc-voix]';

/** Goes to the card of a programme in « Mon choix »: smooth scroll when already on the list. */
export function useAllerACarte() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const surListe = pathname === '/choix' && (params.get('etape') ?? '1') === '1';
  return (id: string) => {
    if (surListe) demanderCentrage(id, true);
    else navigate('/choix', { state: { centrer: id } });
  };
}

export function PanneauTransfert({ vers, titreVers, fermer, actif = true }: { vers: string; titreVers: string; fermer: () => void; actif?: boolean }) {
  const { brouillon, majBrouillon } = usePudi();
  const { donnees } = useDonnees();
  const { liste: propositions } = usePropositions();
  const allerACarte = useAllerACarte();
  const titre = useRef<HTMLHeadingElement>(null);
  const racine = useRef<HTMLElement>(null);
  useEffect(() => {
    titre.current?.focus({ preventScroll: true });
  }, []);
  // A tap anywhere outside the card that holds the panel closes it.
  useEffect(() => {
    if (!actif) return;
    const dehors = (e: Event) => {
      const conteneur = racine.current?.closest(CONTENEUR) ?? racine.current;
      if (conteneur && e.target instanceof Node && !conteneur.contains(e.target)) fermer();
    };
    document.addEventListener('pointerdown', dehors, true);
    return () => document.removeEventListener('pointerdown', dehors, true);
  }, [actif, fermer]);
  const nom = (id: string) => (donnees ? programmeParId(donnees, id)?.nom : undefined) ?? propositionParId(propositions, id)?.intitule ?? id;
  const libres = VOIX - brouillon.priorites.length;
  const lignes = regrouperVoix(brouillon.priorites)
    .filter((l) => l.id !== vers)
    .sort((a, b) => b.n - a.n);
  const terminer = () => {
    fermer();
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(`[data-carte-choix="${vers}"] [data-voix-plus], [data-voix-fiche] [data-voix-plus]`)?.focus({ preventScroll: true });
    }, 0);
  };
  // The panel stays open: the list and the counters update in place.
  const deplacer = (de: string) => {
    majBrouillon(ajouterVoix(retirerVoix(brouillon, de), vers));
    signalerGeste('voix');
  };
  const liberer = (de: string) => {
    majBrouillon(retirerVoix(brouillon, de));
    signalerGeste('voix');
  };
  const placerLibre = () => {
    majBrouillon(ajouterVoix(brouillon, vers));
    signalerGeste('voix');
  };
  const idTitre = `pudi-transfert-${vers}`;
  return (
    <section
      ref={racine}
      role="region"
      aria-labelledby={idTitre}
      className="rounded-xl border-2 border-marine bg-white p-3 shadow-md"
      onClick={(e) => e.stopPropagation()}
      data-panneau-transfert={vers}
    >
      <h3 id={idTitre} ref={titre} tabIndex={-1} className="font-bold text-[0.9375rem] text-marine leading-snug outline-none" aria-live="polite">
        {libres > 0 ? frPages.transfert.titreLibre(libres) : frPages.transfert.titre}
      </h3>
      {libres > 0 && (
        <button
          type="button"
          onClick={placerLibre}
          className="mt-2 w-full min-h-[44px] px-3 rounded-lg bg-marine text-white font-bold text-[0.9375rem] inline-flex items-center justify-center gap-1.5"
          data-placer-libre=""
        >
          <Icone nom="plus" className="w-4 h-4" />
          {frPages.transfert.placerLibre}
        </button>
      )}
      <ul className="mt-2 divide-y divide-filet" data-liste-transfert="">
        {lignes.map((l) => {
          const n = nom(l.id);
          return (
            <li key={l.id} className="py-1.5" data-transfert-id={l.id} data-transfert-n={l.n}>
              <p className="flex gap-2 text-[0.875rem] leading-snug">
                <span className="font-titre text-marine shrink-0 min-w-[2rem] pt-[0.7rem]">×{l.n}</span>
                <button
                  type="button"
                  onClick={() => allerACarte(l.id)}
                  aria-label={frPages.transfert.allerAu(n)}
                  className="min-w-0 flex-1 min-h-[44px] py-1.5 text-left inline-flex items-center gap-1 underline underline-offset-2 decoration-[#9AA3BD]"
                  data-transfert-nom=""
                >
                  <span className="min-w-0">{titreCourt(n, 60)}</span>
                  <Icone nom="droite" className="w-4 h-4 shrink-0 text-marine" />
                </button>
              </p>
              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => liberer(l.id)}
                  aria-label={frPages.voix.retirer(n)}
                  className="w-11 h-11 shrink-0 rounded-full border-2 border-marine text-marine bg-white inline-flex items-center justify-center"
                  data-transfert-moins=""
                >
                  <Icone nom="moins" className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deplacer(l.id)}
                  aria-label={frPages.transfert.deplacerAria(n, titreVers)}
                  className="min-h-[44px] px-3 rounded-lg bg-marine text-white font-bold text-[0.875rem] inline-flex items-center gap-1.5"
                  data-transfert-deplacer=""
                >
                  <Icone nom="droite" className="w-4 h-4" />
                  {frPages.transfert.deplacer}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={terminer}
        className="mt-1 w-full min-h-[44px] inline-flex items-center justify-center text-marine font-bold text-[0.9375rem] underline underline-offset-2"
        data-transfert-fermer=""
      >
        {frPages.transfert.fermer}
      </button>
    </section>
  );
}

/**
 * The panel under its card, unfolded and folded with the height (0 to its natural height) and a
 * light fade; the following cards move with it. `montrer`: on opening, scrolls so the whole panel
 * is visible (its top first when the screen is too short). Reduced motion: instant.
 */
export function TransfertDeroulant({
  ouvert,
  vers,
  titreVers,
  fermer,
  montrer = true
}: {
  ouvert: boolean;
  vers: string;
  titreVers: string;
  fermer: () => void;
  montrer?: boolean;
}) {
  const [rendu, setRendu] = useState(ouvert);
  const boite = useRef<HTMLDivElement>(null);
  /** Box already on screen before this change (otherwise it unfolds from 0). */
  const affiche = useRef(false);
  useLayoutEffect(() => {
    if (ouvert) setRendu(true);
  }, [ouvert]);
  useLayoutEffect(() => {
    const el = boite.current;
    if (!el || !rendu) {
      affiche.current = false;
      return;
    }
    const reduit = mouvementReduit() || !el.animate;
    // Height read before cancelling a running animation (reopened while folding).
    const depuis = affiche.current ? el.getBoundingClientRect().height : 0;
    el.getAnimations?.().forEach((a) => a.cancel());
    affiche.current = true;
    if (ouvert) {
      el.style.height = '';
      const fin = el.scrollHeight;
      if (montrer) void montrerBloc(el.getBoundingClientRect().top, fin);
      if (reduit) return;
      el.style.overflow = 'hidden';
      const a = el.animate(
        [
          { height: `${depuis}px`, opacity: depuis ? 1 : 0 },
          { height: `${fin}px`, opacity: 1 }
        ],
        { duration: DUREE_PANNEAU, easing: EASING_PANNEAU }
      );
      a.onfinish = () => {
        el.style.overflow = '';
      };
      return;
    }
    if (reduit) {
      setRendu(false);
      return;
    }
    el.style.overflow = 'hidden';
    const a = el.animate(
      [
        { height: `${depuis}px`, opacity: 1 },
        { height: '0px', opacity: 0 }
      ],
      { duration: DUREE_PANNEAU, easing: EASING_PANNEAU, fill: 'forwards' }
    );
    a.onfinish = () => setRendu(false);
    // montrer and the panel contents are read at the moment of the change only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, rendu]);
  if (!rendu) return null;
  return (
    <div ref={boite} className="pt-2 pb-1" data-transfert-boite={ouvert ? 'ouvert' : 'ferme'}>
      <PanneauTransfert vers={vers} titreVers={titreVers} fermer={fermer} actif={ouvert} />
    </div>
  );
}
