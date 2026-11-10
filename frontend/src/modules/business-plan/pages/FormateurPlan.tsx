// /plan/formateur/:planId(/:rubrique): a participant's plan, read only, with the existing atelier
// pages in `lectureSeule` mode (sections not delivered yet show their placeholder).
import { Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Plan } from '../types';
import { Mise } from '../composants/Mise';
import { Progression } from '../composants/Progression';
import { Icone } from '../composants/Icones';
import { RUBRIQUES, progressionGlobale, rubrique } from '../rubriques/registre';
import { completerPlan } from '../etat/vide';
import { planParticipant } from '../sync/formateur';
import { dateFr } from '../utils/format';

type Etat = { statut: 'chargement' } | { statut: 'refuse' } | { statut: 'erreur' } | { statut: 'absent' } | { statut: 'ok'; plan: Plan; prenom: string; majAt: string };

const rien = () => undefined;

export default function FormateurPlan() {
  const { planId, rubrique: chemin } = useParams();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });

  useEffect(() => {
    if (!planId) return;
    let vivant = true;
    void planParticipant(planId).then((r) => {
      if (!vivant) return;
      if (r.statut !== 'ok') return setEtat({ statut: r.statut });
      if (!r.valeur) return setEtat({ statut: 'absent' });
      const plan = completerPlan({ ...(r.valeur.contenu as Partial<Plan>), id: r.valeur.plan_id });
      delete plan.exemple;
      setEtat({ statut: 'ok', plan, prenom: r.valeur.prenom, majAt: r.valeur.maj_at });
    });
    return () => {
      vivant = false;
    };
  }, [planId]);

  const retourListe = { vers: '/formateur', texte: 'Participants' };
  if (etat.statut === 'chargement') return <Mise titre="Suivi formateur">{<p className="text-doux">Chargement...</p>}</Mise>;
  if (etat.statut === 'refuse') return <Mise titre="Suivi formateur" retour={{ vers: '/', texte: 'Mes projets' }}>{<p className="bp-reserve text-[17px] font-bold">Réservé au formateur</p>}</Mise>;
  if (etat.statut === 'erreur' || etat.statut === 'absent') {
    return (
      <Mise titre="Suivi formateur" retour={retourListe}>
        <p className="text-[16px] text-encre">{etat.statut === 'absent' ? "Ce projet n'est plus envoyé au formateur." : 'Connexion impossible pour le moment.'}</p>
      </Mise>
    );
  }

  const { plan, prenom, majAt } = etat;
  const titre = `${prenom || 'Sans prénom'} : ${plan.identite.nomProjet.trim() || 'Projet sans nom'}`;
  const r = rubrique(chemin);
  if (r) {
    const Page = r.page;
    return (
      <Mise titre={r.titre} sousTitre={titre} retour={{ vers: `/formateur/${plan.id}`, texte: prenom || 'Sommaire' }}>
        <p className="bp-lecture-seule mb-3 rounded-xl bg-violetClair px-3.5 py-2.5 text-[14px] font-bold text-violet">Lecture seule : le travail du participant</p>
        <Suspense fallback={<p className="text-doux">Chargement...</p>}>
          <Page plan={plan} modifier={rien} lectureSeule />
        </Suspense>
      </Mise>
    );
  }
  return (
    <Mise titre={titre} sousTitre={`Reçu le ${dateFr(majAt)}`} retour={retourListe}>
      <div className="rounded-2xl bg-violetClair p-4 mb-4">
        <p className="text-[15px] font-bold text-violet mb-2">Cahier rempli à</p>
        <Progression pct={progressionGlobale(plan)} label="Avancement du cahier" />
      </div>
      <ol className="space-y-2.5">
        {RUBRIQUES.map((x, i) => (
          <li key={x.id}>
            <Link to={`/formateur/${plan.id}/${x.chemin}`} className="bp-rubrique flex items-center gap-3 rounded-2xl border border-filet bg-white p-3.5 active:bg-violetClair">
              <span className="shrink-0 w-9 h-9 rounded-full bg-turquoiseClair text-turquoiseTexte font-bold flex items-center justify-center">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-bold text-encre leading-snug break-words">{x.titre}</span>
                <span className="block mt-1.5">
                  <Progression pct={x.progression(plan)} compact label={`Avancement : ${x.titre}`} />
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
