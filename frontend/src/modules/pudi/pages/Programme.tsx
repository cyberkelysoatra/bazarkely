import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { BoutonsChoix } from '../composants/BoutonsChoix';
import { Icone } from '../composants/Icones';
import { BadgeTranche, Chargement, ErreurDonnees, Page } from '../composants/Mise';
import { programmeParId, secteurParId } from '../data';
import { fr } from '../i18n/fr';
import { noterEtape } from '../appels/parcours';
import { usePudi, useDonnees } from '../PudiContexte';
import { formatAr } from '../utils/format';
import { LiensPages } from '../composants/LiensPages';
import { documentPudi } from '../utils/documents';

export default function Programme() {
  const { id = '' } = useParams();
  useEffect(() => noterEtape('fiche'), []);
  const { donnees, erreur, reessayer } = useDonnees();
  const { etat } = usePudi();
  if (erreur) return <Page><ErreurDonnees reessayer={reessayer} /></Page>;
  if (!donnees) return <Page><Chargement /></Page>;
  const p = programmeParId(donnees, id);
  if (!p) return <Navigate to="/secteurs" replace />;
  const s = secteurParId(donnees, p.secteur);
  const couleur = s?.couleur ?? '#0B2A8C';
  const fonce = s?.couleurFoncee ?? '#0B2A8C';
  const doc = documentPudi(donnees);
  const inclut = p.incluAussi.map((x) => secteurParId(donnees, x)?.nom ?? x).join(', ');
  return (
    <Page>
      <Link
        to={`/secteur/${p.secteur}`}
        className="inline-flex items-center gap-1 min-h-[44px] font-bold text-[15px]"
        style={{ color: fonce }}
      >
        <Icone nom="gauche" />
        {s?.nom}
      </Link>
      <div className="border-l-[6px] pl-3 mt-1" style={{ borderColor: couleur }}>
        <p className="text-[13px] text-gris">
          {fr.programme.secteur} : <span className="font-bold" style={{ color: fonce }}>{s?.nom}</span>
        </p>
        <h1 className="font-titre text-[23px] leading-tight text-marine mt-1">{p.nom}</h1>
      </div>

      <p className="mt-4 text-[16px] leading-relaxed">{p.resume}</p>

      {p.sites.length > 0 && (
        <section className="mt-4">
          <h2 className="font-bold text-[16px] text-marine flex items-center gap-1.5">
            <Icone nom="lieu" className="w-4 h-4" />
            {fr.programme.sites}
          </h2>
          <ul className="mt-1 list-disc pl-5 text-[15px] space-y-0.5">
            {p.sites.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4 bg-white border border-filet rounded-xl p-3">
        <h2 className="font-bold text-[16px] text-marine">{fr.programme.tranche}</h2>
        <div className="mt-2">
          <BadgeTranche tranche={p.trancheAffichee} />
        </div>
        <h3 className="mt-3 text-[14px] font-bold text-gris">{fr.programme.detail}</h3>
        <ul className="mt-1 divide-y divide-filet">
          {p.codes.map((c) => (
            <li key={c.code} className="py-2 text-[14px]">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-bold text-profond">{c.code}</span>
                <span className="flex-1 min-w-[10rem]">{c.libelle}</span>
                <span className="text-gris whitespace-nowrap">{c.tranches.join(', ')}</span>
              </div>
              {c.libelleComplet && <p className="mt-1 text-[14px] leading-relaxed break-words">{c.libelleComplet}</p>}
              {c.pagesPudi && c.pagesPudi.length > 0 && (
                <LiensPages doc={doc} pages={c.pagesPudi} className="block mt-0.5 text-[13px] text-gris" />
              )}
              {c.coutA && (
                <p className="mt-1 text-gris">
                  {fr.programme.projetA(c.coutA.numero)} : {formatAr(c.coutA.montantAr)}
                  {c.coutA.detail ? ` (${c.coutA.detail})` : ''}
                  {c.coutA.correspondanceIncertaine && (
                    <span className="ml-1 italic text-[#9C3F21]">, {fr.programme.incertaine}</span>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="font-bold text-[16px] text-marine">{fr.programme.cout}</h2>
        <p className="mt-1 font-titre text-[19px] text-profond">{p.cout.mention}</p>
        {inclut && <p className="mt-1 text-[14px] text-gris">{fr.programme.inclutAussi(inclut)}</p>}
      </section>

      {p.precision && (
        <section className="mt-4 bg-[#FFF6E0] border border-[#E9D29A] rounded-xl p-3">
          <h2 className="font-bold text-[16px] text-marine flex items-center gap-1.5">
            <Icone nom="info" className="w-4 h-4" />
            {fr.programme.precision}
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed">{p.precision}</p>
        </section>
      )}

      {p.pagesPudi && p.pagesPudi.length > 0 && (
        <section className="mt-4 bg-white border border-filet rounded-xl p-3">
          <h2 className="font-bold text-[16px] text-marine flex items-center gap-1.5">
            <Icone nom="document" className="w-4 h-4" />
            {fr.programme.enSavoirPlus}
          </h2>
          <LiensPages doc={doc} pages={p.pagesPudi} className="block mt-1 text-[15px]" />
          <p className="mt-1 text-[13px] text-gris">
            {fr.programme.renvoi}{' '}
            <Link to="/documents" className="font-bold text-marine underline underline-offset-2">
              {fr.programme.tousDocuments}
            </Link>
          </p>
        </section>
      )}

      <div className="mt-5">
        <BoutonsChoix id={p.id} tranche={p.trancheAffichee} desactive={!!etat?.clos} />
      </div>
    </Page>
  );
}
