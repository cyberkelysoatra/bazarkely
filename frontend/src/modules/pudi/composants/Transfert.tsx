// PUDI-CC-19 (specification v11, 4.5): « + » with the 12 votes placed unfolds this panel under the
// card instead of an error line: the programmes and proposals that have votes (most first), each
// with « − » (frees a vote) and « Déplacer 1 voix ici » (takes one from there and puts it on the
// tapped card in one gesture). Announced to screen readers, focus moved to its title, buttons of
// 44 px at least. Closes after a transfer or on « Fermer ». Lazy pages only.
import { useEffect, useRef } from 'react';
import { frPages } from '../i18n/frPages';
import { useDonnees, usePudi } from '../PudiContexte';
import { programmeParId } from '../data';
import { propositionParId, usePropositions } from '../appels/propositions';
import { signalerGeste } from '../appels/autoEnregistrement';
import { VOIX, ajouterVoix, regrouperVoix, retirerVoix } from '../utils/regles';
import { titreCourt } from '../utils/monVote';
import { Icone } from './Icones';

export function PanneauTransfert({ vers, titreVers, fermer }: { vers: string; titreVers: string; fermer: () => void }) {
  const { brouillon, majBrouillon } = usePudi();
  const { donnees } = useDonnees();
  const { liste: propositions } = usePropositions();
  const titre = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titre.current?.focus();
  }, []);
  const nom = (id: string) => (donnees ? programmeParId(donnees, id)?.nom : undefined) ?? propositionParId(propositions, id)?.intitule ?? id;
  const libres = VOIX - brouillon.priorites.length;
  const lignes = regrouperVoix(brouillon.priorites)
    .filter((l) => l.id !== vers)
    .sort((a, b) => b.n - a.n);
  const terminer = () => {
    fermer();
    window.setTimeout(() => {
      document.querySelector<HTMLButtonElement>(`[data-carte-choix="${vers}"] [data-voix-plus], [data-voix-fiche] [data-voix-plus]`)?.focus();
    }, 0);
  };
  const deplacer = (de: string) => {
    majBrouillon(ajouterVoix(retirerVoix(brouillon, de), vers));
    signalerGeste('voix');
    terminer();
  };
  const liberer = (de: string) => {
    majBrouillon(retirerVoix(brouillon, de));
    signalerGeste('voix');
  };
  const placerLibre = () => {
    majBrouillon(ajouterVoix(brouillon, vers));
    signalerGeste('voix');
    terminer();
  };
  const idTitre = `pudi-transfert-${vers}`;
  return (
    <section
      role="region"
      aria-labelledby={idTitre}
      className="mt-2 rounded-xl border-2 border-marine bg-white p-3 shadow-md"
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
            <li key={l.id} className="py-2" data-transfert-id={l.id} data-transfert-n={l.n}>
              <p className="flex gap-2 text-[0.875rem] leading-snug">
                <span className="font-titre text-marine shrink-0 min-w-[2rem]">×{l.n}</span>
                <span className="min-w-0">{titreCourt(n, 60)}</span>
              </p>
              <div className="mt-1.5 flex items-center justify-end gap-2">
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
