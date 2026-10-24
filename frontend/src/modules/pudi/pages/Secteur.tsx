import { Link, Navigate, useParams } from 'react-router-dom';
import { CarteChoix } from '../composants/CarteChoix';
import { Icone } from '../composants/Icones';
import { BadgeTranche, Chargement, ErreurDonnees, Image, Page } from '../composants/Mise';
import { programmesDuSecteur, secteurParId } from '../data';
import { fr } from '../i18n/fr';
import { usePudi, useDonnees } from '../PudiContexte';
import { formatAr } from '../utils/format';

export default function Secteur() {
  const { id = '' } = useParams();
  const { donnees, erreur, reessayer } = useDonnees();
  const { brouillon, etat } = usePudi();
  const clos = !!etat?.clos;
  if (erreur) return <Page><ErreurDonnees reessayer={reessayer} /></Page>;
  if (!donnees) return <Page><Chargement /></Page>;
  const s = secteurParId(donnees, id);
  if (!s) return <Navigate to="/secteurs" replace />;
  const programmes = programmesDuSecteur(donnees, s.id);
  return (
    <Page>
      <Link to="/secteurs" className="inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[0.9375rem]">
        <Icone nom="gauche" />
        {fr.secteurs.titre}
      </Link>
      <div className="-ml-4 -mr-6 mt-1 sm:mx-0 sm:rounded-xl overflow-hidden" style={{ background: s.couleurFoncee }}>
        <div className={`grid ${s.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {s.images.map((img) => (
            <Image
              key={img}
              src={`/pudi/images/${img}`}
              alt=""
              width={1000}
              height={714}
              className="w-full aspect-[7/4] object-cover block"
              fondSecours={s.couleur}
              prioritaire
            />
          ))}
        </div>
        <h1 className="font-titre text-[1.5rem] leading-tight text-white px-4 py-3">{s.nom}</h1>
      </div>

      {s.forfait && (
        <div className="mt-4 bg-white border-2 rounded-xl p-3" style={{ borderColor: s.couleur }}>
          <p className="font-bold text-[0.9375rem]" style={{ color: s.couleurFoncee }}>
            {fr.secteurs.forfaitTitre(s.forfait.numero)}
          </p>
          <p className="font-titre text-[1.375rem] text-marine mt-1">{formatAr(s.forfait.montantAr)}</p>
          <p className="text-[0.875rem] mt-1">{fr.secteurs.forfaitTexte(
              s.forfait.intitule,
              s.forfait.programmes.map((id) => programmes.find((p) => p.id === id)?.nom ?? id).join(', ')
            )}</p>
        </div>
      )}

      <h2 className="mt-5 mb-2 font-bold text-[1.0625rem] text-marine">
        {fr.secteurs.listeTitre} ({programmes.length})
      </h2>
      <ul className="space-y-2.5">
        {programmes.map((p) => (
          <CarteChoix
            key={p.id}
            id={p.id}
            titre={p.nom}
            details={`/programme/${p.id}`}
            desactive={clos}
            className="bg-white border border-filet border-l-[6px]"
            style={{ borderLeftColor: s.couleur }}
            etiquette={<BadgeTranche tranche={p.trancheAffichee} />}
            pied={<p className="text-[0.875rem] text-gris leading-snug">{p.cout.mention}</p>}
          >
            <p className="font-bold text-[1rem] leading-snug" data-titre-carte="">{p.nom}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 empty:hidden">
              {brouillon.urgents.includes(p.id) && (
                <span className="inline-flex items-center gap-1 text-[0.75rem] font-bold text-[#9C3F21]">
                  <Icone nom="horloge" className="w-3.5 h-3.5" />
                  {fr.programme.estUrgent}
                </span>
              )}
            </div>
          </CarteChoix>
        ))}
      </ul>
    </Page>
  );
}
