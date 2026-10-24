// « Propositions »: projects asked by the stakeholders and absent from the list retained in the PUDi (counted
// apart in the results). The list comes from the server and is kept on the device for offline use.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CarteChoix } from '../composants/CarteChoix';
import { Icone } from '../composants/Icones';
import { BandeauxEtat, Chargement, Page, boutonSecondaire } from '../composants/Mise';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { usePudi } from '../PudiContexte';
import { rafraichirPropositions, usePropositions, type Proposition } from '../appels/propositions';
import { dateJour } from '../utils/format';

/** List of proposals, loaded if needed (shared by the list page and the sheet). */
export function useListePropositions(): { liste: Proposition[] | null; erreur: boolean; reessayer: () => void } {
  const { liste } = usePropositions();
  const [erreur, setErreur] = useState(false);
  const [essai, setEssai] = useState(0);
  useEffect(() => {
    if (liste) return;
    let actif = true;
    rafraichirPropositions().catch(() => actif && setErreur(true));
    return () => {
      actif = false;
    };
  }, [liste, essai]);
  return {
    liste,
    erreur: erreur && !liste,
    reessayer: () => {
      setErreur(false);
      setEssai((n) => n + 1);
    }
  };
}

export function BadgeProposition({ court = false }: { court?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-marine bg-sable px-2.5 py-0.5 text-[0.75rem] font-bold text-marine whitespace-nowrap">
      <Icone nom="ampoule" className="w-3.5 h-3.5" />
      {court ? frPages.propositions.badgeCourt : frPages.propositions.badge}
    </span>
  );
}

export function ErreurPropositions({ reessayer }: { reessayer: () => void }) {
  return (
    <div className="py-6 space-y-3">
      <p>{frPages.propositions.indisponibles}</p>
      <button type="button" className={boutonSecondaire} onClick={reessayer}>
        <Icone nom="actualiser" />
        {fr.app.reessayer}
      </button>
    </div>
  );
}

export default function Propositions() {
  const { liste, erreur, reessayer } = useListePropositions();
  const { etat } = usePudi();
  const clos = !!etat?.clos;
  return (
    <Page>
      <Link to="/secteurs" className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[0.9375rem]">
        <Icone nom="gauche" />
        {fr.secteurs.titre}
      </Link>
      <h1 className="font-titre text-[1.5rem] leading-tight text-marine mt-1 mb-2">{frPages.propositions.titre}</h1>
      <p className="text-[0.9375rem] mb-4">{frPages.propositions.intro}</p>
      <div className="mb-4">
        <BandeauxEtat />
      </div>
      {erreur ? (
        <ErreurPropositions reessayer={reessayer} />
      ) : !liste ? (
        <Chargement />
      ) : !liste.length ? (
        <p className="text-gris py-4">{frPages.propositions.aucune}</p>
      ) : (
        <ul className="space-y-2.5">
          {liste.map((p) => (
            <CarteChoix
              key={p.id}
              id={p.id}
              titre={p.intitule}
              details={`/proposition/${p.id}`}
              desactive={clos}
              className="bg-sable border-2 border-dashed border-marine/60"
              etiquette={<BadgeProposition court />}
              pied={
                <p className="text-[0.875rem] text-gris leading-snug">
                  {p.lieu ? `${p.lieu} · ` : ''}
                  {frPages.propositions.ajoutee(dateJour(p.ajoute_at))}
                </p>
              }
            >
                <p className="font-bold text-[1rem] leading-snug" data-titre-carte="">{p.intitule}</p>
            </CarteChoix>
          ))}
        </ul>
      )}
    </Page>
  );
}
