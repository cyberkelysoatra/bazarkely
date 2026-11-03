// Pieces shared by the client answer screens (questions, « Avant de confirmer », receipt, document).
import { useEffect, type ReactNode } from 'react';
import { useEspace } from '../EspaceContexte';
import EnTete from '../composants/EnTete';
import { CARTE, Corps, Squelette } from '../composants/Mise';
import { chargerQuestionnaire, etatFile, lireFileLocale, useFile } from '../appels/file';
import { BoutonDiscussion } from '../composants/VersDiscussion';
import { choisirProjet, lignePour } from '../utils/regles';
import type { DocumentEspace, Espace, QuestionnaireComplet } from '../utils/types';
import type { Chargement } from '../appels/file';

export interface Projet {
  /** 'attente': still loading; 'sortie': signed out or no active project (go home). */
  statut: 'attente' | 'sortie' | 'pret';
  p: Espace | null;
  email: string;
  lent: boolean;
}

export function useProjet(): Projet {
  const { session, etat, liste, lent } = useEspace();
  if (etat === 'deconnecte') return { statut: 'sortie', p: null, email: '', lent };
  if (etat !== 'pret' || !liste) return { statut: etat === 'erreur' ? 'sortie' : 'attente', p: null, email: '', lent };
  const choix = choisirProjet(liste);
  if (choix.type !== 'projet' || !choix.espace.inscrit) return { statut: 'sortie', p: null, email: '', lent };
  return { statut: 'pret', p: choix.espace, email: session?.email ?? '', lent };
}

/** Questionnaire kept on the device, refreshed from the server when online. */
export function useQuestionnaire(id: string): { q: QuestionnaireComplet | undefined; chargement: Chargement | undefined } {
  const f = useFile();
  // Signed-out visitor: no server call at all (the page goes back home).
  const connecte = !!useEspace().session;
  useEffect(() => {
    if (id && connecte) void chargerQuestionnaire(id);
  }, [id, connecte]);
  return { q: f.questionnaires[id], chargement: f.chargements[id] };
}

export function documentDe(p: Espace | null, questionnaire: string): DocumentEspace | null {
  return p?.documents?.find((d) => d.questionnaire_id === questionnaire) ?? null;
}

/** Client header (title, « pour ... », account circle) with an optional line under the square. */
export function EnTeteClient({ p, email, bas }: { p: Espace | null; email: string; bas?: ReactNode }) {
  if (!p) return <EnTete variante="neutre" />;
  return <EnTete variante="client" titre={p.nom_court ?? ''} sousTitre={lignePour(p)} nom={p.nom ?? ''} email={email} bas={bas} />;
}

/** Network banner under the header (mockup Client-Choix .net). */
export function BandeauReseau({ texte = 'Pas de réseau : votre réponse est gardée, elle partira dès le retour du réseau.' }: { texte?: string }) {
  return (
    <div className="bg-[#fef3c7] text-[#78350f] text-[13px] font-semibold px-4 py-2" role="status" data-bandeau-reseau="">
      {texte}
    </div>
  );
}

export function Attente({ lent }: { lent: boolean }) {
  return (
    <Corps>
      <Squelette lent={lent} />
    </Corps>
  );
}

/** Message card with one primary action (replaced or closed questionnaire...). */
export function CarteInfo({ texte, action, children, ...reste }: { texte: string; action?: ReactNode; children?: ReactNode; [k: `data-${string}`]: string }) {
  return (
    <div className={`${CARTE} !bg-[#fffbeb] !border-[#fcd34d]`} {...reste}>
      <p className="text-[14px] text-[#78350f] leading-[1.45] m-0">{texte}</p>
      {children}
      {action}
    </div>
  );
}

/**
 * Closed (or replaced) questionnaire: its message, the answers the server refused, kept with their
 * text so they can be copied into the discussion (never a silent loss), and the discussion button.
 */
export function CarteClose({ qid, texte, nonLus = 0 }: { qid: string; texte: string; nonLus?: number }) {
  return (
    <CarteInfo texte={texte} data-carte-close={qid}>
      <ReponsesRefusees qid={qid} />
      <BoutonDiscussion texte="Écrire à Joël" nonLus={nonLus} />
    </CarteInfo>
  );
}

/** Answers of `qid` refused by the server (closed questionnaire), with their text; nothing if none. */
export function ReponsesRefusees({ qid }: { qid: string }) {
  const f = useFile();
  // Home opened first: read the refused answers (and the questions, for their labels) from the device.
  useEffect(() => {
    void lireFileLocale().then(() => {
      if (etatFile().refusees[qid]?.length && !etatFile().questionnaires[qid]) void chargerQuestionnaire(qid);
    });
  }, [qid]);
  const q = f.questionnaires[qid];
  const refusees = f.refusees[qid] ?? [];
  if (!refusees.length) return null;
  return (
    <div className="flex flex-col gap-2" data-reponses-refusees={refusees.length}>
      <p className="text-[14px] font-semibold text-[#78350f] m-0">
        {refusees.length > 1
          ? 'Ces réponses n’ont pas été enregistrées : recopiez-les dans la discussion si vous le souhaitez.'
          : 'Cette réponse n’a pas été enregistrée : recopiez-la dans la discussion si vous le souhaitez.'}
      </p>
      {refusees.map((r) => {
        const x = q?.questions.find((y) => y.id === r.question);
        const c = x?.choix.find((y) => y.id === r.choix);
        return (
          <div key={r.id} className="bg-white border border-[#fcd34d] rounded-[10px] p-3 text-[14px] leading-[1.45] select-text" data-reponse-refusee={r.question}>
            {x && (
              <p className="text-[13px] text-doux m-0">
                Question {x.numero} : {x.sujet_client}
              </p>
            )}
            <p className="font-semibold m-0">{c ? c.libelle : 'Votre réponse'}</p>
            {r.commentaire && <p className="m-0 whitespace-pre-wrap break-words">« {r.commentaire} »</p>}
          </div>
        );
      })}
    </div>
  );
}
