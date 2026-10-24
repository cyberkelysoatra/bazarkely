// PUDI-CC-16.1: « Vous avez voté le … · 12 voix sur 3 programmes » (draft unchanged) or « Vous modifiez
// votre vote du … » (draft changed), shown by the vote bar and « Mon choix ». Lazy (shared by
// those two chunks only).
import { useEffect } from 'react';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { regrouperVoix } from '../utils/regles';
import { programmeParId, type PudiDonnees } from '../data';
import { propositionParId, usePropositions } from '../appels/propositions';
import { usePudi } from '../PudiContexte';
import { comparerAuVote, titreCourt, type ComparaisonVote } from '../utils/monVote';
import { dateCourte, dateJour } from '../utils/format';

/** Comparison of the draft with the own vote (none when not signed in, or in the preview). */
export function useComparaisonVote(): ComparaisonVote {
  const { brouillon, monVote, etat } = usePudi();
  if (etat && !etat.a_vote && etat.connecte) return 'aucun';
  return comparerAuVote(brouillon, monVote);
}

export function RappelVote({ donnees, compact = false }: { donnees: PudiDonnees | null; compact?: boolean }) {
  const { monVote } = usePudi();
  const { liste: propositions } = usePropositions();
  const etat = useComparaisonVote();
  const visible = !!monVote && etat !== 'aucun';
  // Room for the taller vote bar (the reminder sits above it).
  useEffect(() => {
    if (!compact || !visible) return;
    document.body.classList.add('pudi-rappel-vote');
    return () => document.body.classList.remove('pudi-rappel-vote');
  }, [compact, visible]);
  if (!monVote || etat === 'aucun') return null;
  // The bar has two short lines at most: day without year nor hour, shorter titles.
  const date = compact ? dateJour(monVote.date).replace(/ \d{4}$/, '') : dateCourte(monVote.date);
  const nom = (id: string) =>
    titreCourt((donnees ? programmeParId(donnees, id)?.nom : undefined) ?? propositionParId(propositions, id)?.intitule ?? id, compact ? 18 : 40);
  const groupes = regrouperVoix(monVote.priorites);
  const texte =
    etat === 'identique'
      ? `${frPages.voix.aVote(date, monVote.priorites.length, groupes.length)}${compact ? '' : ` · ${frPages.voix.detailVoix(groupes.map((g) => `${nom(g.id)} ×${g.n}`).join(', '))}`}`
      : fr.vote.modification(date);
  return (
    <p
      className={
        compact
          ? 'mb-1 rounded-lg bg-white border border-filet border-l-4 border-l-marine px-[10px] py-[4px] text-[12px] leading-snug text-profond shadow-sm line-clamp-2'
          : 'mb-3 bg-white border-l-4 border-marine rounded-r-lg px-3 py-2.5 text-[0.9375rem]'
      }
      data-rappel-vote={etat}
    >
      {texte}
    </p>
  );
}
