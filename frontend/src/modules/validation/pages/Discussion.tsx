// Screen 8 ter: discussion of the project (/discussion, VC-39). One thread per project (D16: one
// project per account, so the address carries no id: the server notification opens it as it is).
// « Retour » goes back to the screen it was opened from; opened directly, to the home.
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import EnTete from '../composants/EnTete';
import Fil, { type QuestionJointe } from '../composants/Fil';
import { BarreRetour, Corps, useCouleurTheme } from '../composants/Mise';
import type { EtatDiscussion } from '../composants/VersDiscussion';
import { chargerQuestionnaire, etatFile } from '../appels/file';
import { usePresence } from '../appels/presence';
import { calculerChemin } from '../utils/chemin';
import { lignePour } from '../utils/regles';
import type { Espace } from '../utils/types';
import { Attente, EnTeteClient, useProjet } from './Cadre';
import { reponsesDe } from './Question';

/** Questionnaire of the project holding `questionId`, and the rank of that question on its path. */
export async function trouverQuestion(p: Espace, questionId: string): Promise<{ questionnaire: string; rang: number } | null> {
  for (const d of p.documents ?? []) {
    if (!etatFile().questionnaires[d.questionnaire_id]) await chargerQuestionnaire(d.questionnaire_id);
    const q = etatFile().questionnaires[d.questionnaire_id];
    if (!q?.questions?.some((x) => x.id === questionId)) continue;
    const i = calculerChemin(q.questions, reponsesDe(q)).findIndex((e) => e.question.id === questionId);
    return { questionnaire: q.id, rang: i >= 0 ? i + 1 : 1 };
  }
  return null;
}

export default function Discussion() {
  useCouleurTheme('#0369a1');
  const { statut, p, email, lent } = useProjet();
  const { state } = useLocation();
  const navigate = useNavigate();
  const etat = (state ?? {}) as EtatDiscussion;
  const [question, setQuestion] = useState<QuestionJointe | null>(etat.question ?? null);
  const [introuvable, setIntrouvable] = useState(false);
  usePresence(p?.client_id, p ? { type: 'discussion' } : null);

  if (statut === 'sortie') return <Navigate to="/" replace />;
  if (statut === 'attente' || !p) {
    return (
      <>
        <EnTeteClient p={p} email={email} />
        <Attente lent={lent} />
      </>
    );
  }

  async function ouvrirQuestion(id: string) {
    if (!p) return;
    setIntrouvable(false);
    const r = await trouverQuestion(p, id);
    if (r) navigate(`/q/${r.questionnaire}/${r.rang}`);
    else setIntrouvable(true);
  }

  return (
    <>
      <EnTete variante="client" titre="Discussion : votre projet" sousTitre={lignePour(p)} nom={p.nom ?? ''} email={email} />
      <Corps className="!gap-3.5" data-discussion={p.client_id}>
        <BarreRetour vers={etat.retour && etat.retour !== '/discussion' ? etat.retour : '/'} />
        {introuvable && (
          <p className="text-[13px] text-[#92400e] m-0" role="status" data-question-introuvable="">
            Cette question n’est pas encore sur ce téléphone : réessayez avec le réseau.
          </p>
        )}
        <Fil
          client={p.client_id}
          auteur={{ nom: [p.civilite, p.nom].filter(Boolean).join(' '), fonction: p.fonction ?? null }}
          client_ecran
          placeholder="Votre message"
          question={question}
          retirerQuestion={() => setQuestion(null)}
          ouvrirQuestion={(id) => void ouvrirQuestion(id)}
        />
      </Corps>
    </>
  );
}
