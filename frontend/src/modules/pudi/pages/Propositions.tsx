// « Propositions »: projects asked by the stakeholders and absent from the PIC list (counted
// apart in the results). The list comes from the server and is kept on the device for offline use.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { BandeauxEtat, Chargement, Page, boutonSecondaire } from '../composants/Mise';
import { fr } from '../i18n/fr';
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
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-marine bg-sable px-2.5 py-0.5 text-[12px] font-bold text-marine whitespace-nowrap">
      <Icone nom="ampoule" className="w-3.5 h-3.5" />
      {court ? fr.propositions.badgeCourt : fr.propositions.badge}
    </span>
  );
}

export function ErreurPropositions({ reessayer }: { reessayer: () => void }) {
  return (
    <div className="py-6 space-y-3">
      <p>{fr.propositions.indisponibles}</p>
      <button type="button" className={boutonSecondaire} onClick={reessayer}>
        <Icone nom="actualiser" />
        {fr.app.reessayer}
      </button>
    </div>
  );
}

export default function Propositions() {
  const { liste, erreur, reessayer } = useListePropositions();
  const { brouillon } = usePudi();
  return (
    <Page>
      <Link to="/secteurs" className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[15px]">
        <Icone nom="gauche" />
        {fr.secteurs.titre}
      </Link>
      <h1 className="font-titre text-[24px] leading-tight text-marine mt-1 mb-2">{fr.propositions.titre}</h1>
      <p className="text-[15px] mb-4">{fr.propositions.intro}</p>
      <div className="mb-4">
        <BandeauxEtat />
      </div>
      {erreur ? (
        <ErreurPropositions reessayer={reessayer} />
      ) : !liste ? (
        <Chargement />
      ) : !liste.length ? (
        <p className="text-gris py-4">{fr.propositions.aucune}</p>
      ) : (
        <ul className="space-y-2.5">
          {liste.map((p) => (
            <li key={p.id}>
              <Link
                to={`/proposition/${p.id}`}
                className="block bg-sable border-2 border-dashed border-marine/60 rounded-xl p-3"
              >
                <p className="font-bold text-[16px] leading-snug">{p.intitule}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <BadgeProposition court />
                  {brouillon.priorites.includes(p.id) && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-marine">
                      <Icone nom="etoile" className="w-3.5 h-3.5" />
                      {fr.programme.estPriorite}
                    </span>
                  )}
                  {brouillon.urgents.includes(p.id) && (
                    <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[#9C3F21]">
                      <Icone nom="horloge" className="w-3.5 h-3.5" />
                      {fr.programme.estUrgent}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[14px] text-gris flex items-center gap-1">
                  <span className="min-w-0">
                    {p.lieu ? `${p.lieu} · ` : ''}
                    {fr.propositions.ajoutee(dateJour(p.ajoute_at))}
                  </span>
                  <Icone nom="droite" className="w-4 h-4 ml-auto shrink-0" />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
