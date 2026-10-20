import { Link } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { BandeauxEtat, Chargement, ErreurDonnees, Image, Page } from '../composants/Mise';
import { programmesDuSecteur } from '../data';
import { fr } from '../i18n/fr';
import { useDonnees } from '../PudiContexte';

export default function Secteurs() {
  const { donnees, erreur, reessayer } = useDonnees();
  return (
    <Page titre={fr.secteurs.titre}>
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
        </ul>
      )}
    </Page>
  );
}
