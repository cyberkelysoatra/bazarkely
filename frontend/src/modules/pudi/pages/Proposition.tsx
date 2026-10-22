// Sheet of one proposal (outside the PUDi list): same choice buttons as a programme, with
// « Hors PUDi » in place of a PUDi tranche.
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BoutonsChoix } from '../composants/BoutonsChoix';
import { Icone } from '../composants/Icones';
import { Chargement, Page } from '../composants/Mise';
import { fr } from '../i18n/fr';
import { noterEtape } from '../appels/parcours';
import { usePudi } from '../PudiContexte';
import { propositionParId } from '../appels/propositions';
import { dateJour } from '../utils/format';
import { BadgeProposition, ErreurPropositions, useListePropositions } from './Propositions';

export default function Proposition() {
  const { id = '' } = useParams();
  useEffect(() => noterEtape('fiche'), []);
  const { liste, erreur, reessayer } = useListePropositions();
  const { etat } = usePudi();
  const retour = (
    <Link to="/propositions" className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[15px]">
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
        <p className="mt-4 text-[16px]">{fr.propositions.introuvable}</p>
      </Page>
    );
  return (
    <Page>
      {retour}
      <div className="border-l-[6px] border-dashed border-marine pl-3 mt-1">
        <BadgeProposition />
        <h1 className="font-titre text-[23px] leading-tight text-marine mt-2">{p.intitule}</h1>
      </div>

      <dl className="mt-4 bg-sable border-2 border-dashed border-marine/60 rounded-xl p-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-[15px]">
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
          <span className="inline-flex items-center rounded-full border border-marine px-2.5 py-0.5 text-[12px] font-bold text-marine">
            {fr.propositions.horsPudi}
          </span>
        </dd>
      </dl>
      <p className="mt-2 text-[13px] text-gris">{fr.propositions.ajoutee(dateJour(p.ajoute_at))}</p>

      {p.precision && (
        <section className="mt-4 bg-[#FFF6E0] border border-[#E9D29A] rounded-xl p-3">
          <h2 className="font-bold text-[16px] text-marine flex items-center gap-1.5">
            <Icone nom="info" className="w-4 h-4" />
            {fr.programme.precision}
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed">{p.precision}</p>
        </section>
      )}

      <div className="mt-5">
        <BoutonsChoix id={p.id} desactive={!!etat?.clos} />
      </div>
    </Page>
  );
}
