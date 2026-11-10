// Contents /plan/p/:id: the 11 sections in order, progress of each, global progress.
import { Link, useParams } from 'react-router-dom';
import { usePlan } from '../etat/usePlan';
import { RUBRIQUES, progressionGlobale } from '../rubriques/registre';
import { Mise } from '../composants/Mise';
import { Progression } from '../composants/Progression';
import { Icone } from '../composants/Icones';
import { Introuvable } from './Introuvable';

export default function Sommaire() {
  const { id } = useParams();
  const { etat } = usePlan(id);
  if (etat.statut === 'chargement') return <Mise titre="Mon business plan">{null}</Mise>;
  if (etat.statut === 'absent') return <Introuvable />;
  const plan = etat.plan;
  return (
    <Mise titre={plan.identite.nomProjet.trim() || 'Projet sans nom'} sousTitre="Sommaire du cahier" retour={{ vers: '/', texte: 'Mes projets' }} plan={plan}>
      <div className="rounded-2xl bg-violetClair p-4 mb-4">
        <p className="text-[15px] font-bold text-violet mb-2">Mon cahier est rempli à</p>
        <Progression pct={progressionGlobale(plan)} label="Avancement du cahier" />
      </div>
      <ol className="space-y-2.5">
        {RUBRIQUES.map((r, i) => (
          <li key={r.id}>
            <Link to={`/p/${plan.id}/${r.chemin}`} className="bp-rubrique flex items-center gap-3 rounded-2xl border border-filet bg-white p-3.5 active:bg-violetClair">
              <span className="shrink-0 w-9 h-9 rounded-full bg-turquoiseClair text-turquoiseTexte font-bold flex items-center justify-center">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-bold text-encre leading-snug break-words">{r.titre}</span>
                <span className="block text-[14px] text-doux leading-snug">{r.sousTitre}</span>
                <span className="block mt-1.5">
                  <Progression pct={r.progression(plan)} compact label={`Avancement : ${r.titre}`} />
                </span>
              </span>
              <span className="text-doux shrink-0">
                <Icone nom="chevron" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Mise>
  );
}
