import { Link } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { BandeauxEtat, Chargement, ErreurDonnees, Image, Page } from '../composants/Mise';
import { programmesDuSecteur } from '../data';
import { fr } from '../i18n/fr';
import { useDonnees } from '../PudiContexte';
import { usePropositions } from '../appels/propositions';

export default function Secteurs() {
  const { donnees, erreur, reessayer } = useDonnees();
  const { liste: propositions } = usePropositions();
  return (
    <Page titre={fr.secteurs.titre}>
      <Link
        to="/recherche"
        state={{ focus: true }}
        className="mb-3 w-full min-h-[48px] rounded-xl border border-filet bg-white px-3 flex items-center gap-2 text-[16px] text-gris"
      >
        <Icone nom="recherche" className="w-5 h-5" />
        <span className="flex-1 min-w-0 truncate">{fr.secteurs.rechercher}</span>
      </Link>
      <p className="text-[15px] text-gris mb-4">{fr.secteurs.intro}</p>
      <div className="mb-4">
        <BandeauxEtat />
      </div>
      {erreur ? (
        <ErreurDonnees reessayer={reessayer} />
      ) : !donnees ? (
        <Chargement />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {donnees.secteurs.map((s) => {
            const n = programmesDuSecteur(donnees, s.id).length;
            return (
              <li key={s.id}>
                <Link
                  to={`/secteur/${s.id}`}
                  className="block rounded-xl overflow-hidden bg-white border border-filet shadow-sm h-full"
                >
                  <Image
                    src={`/pudi/images/${s.images[0]}`}
                    alt=""
                    width={1000}
                    height={714}
                    className="w-full aspect-[7/5] object-cover block"
                    fondSecours={s.couleur}
                  />
                  <div className="px-3 py-2.5 border-t-[5px]" style={{ borderColor: s.couleur }}>
                    <p className="font-bold text-[15px] leading-tight" style={{ color: s.couleurFoncee }}>
                      {s.nom}
                    </p>
                    <p className="text-[13px] text-gris mt-1 flex items-center gap-1">
                      {fr.secteurs.programmes(n)}
                      <Icone nom="droite" className="w-4 h-4 ml-auto" />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              to="/propositions"
              className="flex flex-col rounded-xl overflow-hidden bg-sable border-2 border-dashed border-marine h-full"
            >
              <span className="flex-1 min-h-[96px] flex items-center justify-center text-marine" aria-hidden="true">
                <Icone nom="ampoule" className="w-10 h-10" />
              </span>
              <div className="px-3 py-2.5 border-t-2 border-dashed border-marine/50">
                <p className="font-bold text-[15px] leading-tight text-marine">{fr.secteurs.carteProposition}</p>
                <p className="text-[13px] text-gris mt-1 flex items-center gap-1">
                  {propositions ? fr.secteurs.propositions(propositions.length) : fr.app.chargement}
                  <Icone nom="droite" className="w-4 h-4 ml-auto" />
                </p>
              </div>
            </Link>
          </li>
        </ul>
      )}
    </Page>
  );
}
