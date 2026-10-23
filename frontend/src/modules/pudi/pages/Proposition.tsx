// Sheet of one proposal (outside the PUDi list): same choice buttons as a programme, with
// « Hors PUDi » in place of a PUDi tranche.
import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BoutonsChoix } from '../composants/BoutonsChoix';
import { Icone } from '../composants/Icones';
import { Chargement, Page } from '../composants/Mise';
import { fr } from '../i18n/fr';
import { noterEtape } from '../appels/parcours';
import { usePudi } from '../PudiContexte';
import { propositionParId } from '../appels/propositions';
import { dateJour } from '../utils/format';
import { BadgeProposition, ErreurPropositions, useListePropositions } from './Propositions';

/** Opened from a list card (« Détails »): the back link returns in the history (same scroll, same checks). */
function useRetourListe() {
  const navigate = useNavigate();
  const depuisListe = !!(useLocation().state as { depuisListe?: boolean } | null)?.depuisListe;
  return (e: { preventDefault: () => void }) => {
    if (!depuisListe) return;
    e.preventDefault();
    navigate(-1);
  };
}

export default function Proposition() {
  const { id = '' } = useParams();
  useEffect(() => noterEtape('fiche'), []);
  const retourListe = useRetourListe();
  const { liste, erreur, reessayer } = useListePropositions();
  const { etat } = usePudi();
  const retour = (
    <Link to="/propositions" onClick={retourListe} className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[0.9375rem]">
      <Icone nom="gauche" />
      {fr.propositions.retour}
    </Link>
  );
  if (erreur) return <Page>{retour}<ErreurPropositions reessayer={reessayer} /></Page>;
  if (!liste) return <Page>{retour}<Chargement /></Page>;
  const p = propositionParId(liste, id);
  if (!p)
    return (
      <Page>
        {retour}
        <p className="mt-4 text-[1rem]">{fr.propositions.introuvable}</p>
      </Page>
    );
  return (
    <Page>
      {retour}
      <div className="border-l-[6px] border-dashed border-marine pl-3 mt-1">
        <BadgeProposition />
        <h1 className="font-titre text-[1.4375rem] leading-tight text-marine mt-2">{p.intitule}</h1>
      </div>

      <dl className="mt-4 bg-sable border-2 border-dashed border-marine/60 rounded-xl p-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-[0.9375rem]">
        {p.lieu && (
          <>
            <dt className="text-gris flex items-center gap-1">
              <Icone nom="lieu" className="w-4 h-4" />
              {fr.propositions.lieu}
            </dt>
            <dd className="break-words">{p.lieu}</dd>
          </>
        )}
        <dt className="text-gris">{fr.propositions.source}</dt>
        <dd className="break-words">
          {p.source}
          {p.date_source && !/\d{4}/.test(p.source) ? ` (${dateJour(p.date_source)})` : ''}
        </dd>
        <dt className="text-gris">{fr.programme.tranche}</dt>
        <dd>
          <span className="inline-flex items-center rounded-full border border-marine px-2.5 py-0.5 text-[0.75rem] font-bold text-marine">
            {fr.propositions.horsPudi}
          </span>
        </dd>
      </dl>
      <p className="mt-2 text-[0.8125rem] text-gris">{fr.propositions.ajoutee(dateJour(p.ajoute_at))}</p>

      {p.precision && (
        <section className="mt-4 bg-[#FFF6E0] border border-[#E9D29A] rounded-xl p-3">
          <h2 className="font-bold text-[1rem] text-marine flex items-center gap-1.5">
            <Icone nom="info" className="w-4 h-4" />
            {fr.programme.precision}
          </h2>
          <p className="mt-1 text-[0.9375rem] leading-relaxed">{p.precision}</p>
        </section>
      )}

      <div className="mt-5">
        <BoutonsChoix id={p.id} desactive={!!etat?.clos} />
      </div>
    </Page>
  );
}
