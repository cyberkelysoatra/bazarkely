// /plan/p/:id/:rubrique: one section of the workbook, its page loaded on demand from the registry.
import { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { usePlan } from '../etat/usePlan';
import { rubrique } from '../rubriques/registre';
import { Mise } from '../composants/Mise';
import { Introuvable } from './Introuvable';

export default function PageRubrique() {
  const { id, rubrique: chemin } = useParams();
  const r = rubrique(chemin);
  const { etat, modifier } = usePlan(id);
  if (!r || etat.statut === 'absent') return <Introuvable />;
  if (etat.statut === 'chargement') return <Mise titre={r.titre}>{null}</Mise>;
  const plan = etat.plan;
  const Page = r.page;
  return (
    <Mise titre={r.titre} sousTitre={plan.identite.nomProjet.trim() || 'Projet sans nom'} retour={{ vers: `/p/${plan.id}`, texte: 'Sommaire' }} plan={plan}>
      <Suspense fallback={<p className="text-doux">Chargement...</p>}>
        <Page plan={plan} modifier={modifier} lectureSeule={!!plan.exemple} />
      </Suspense>
    </Mise>
  );
}
