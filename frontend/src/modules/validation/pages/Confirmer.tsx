// Screen 7 « Avant de confirmer » (/confirmer/:questionnaire, VC-41, RM16): the path with the real
// state of each answer, counts, warning, « J'ai relu mes réponses » gate, vc_confirmer → receipt.
// Once confirmed (or closed, or for a contributor) the same list is shown read-only.
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEspace } from '../EspaceContexte';
import { BarreRetour, BOUTON, CARTE, Corps, PRIMAIRE, useCouleurTheme } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { confirmer } from '../appels/api';
import { etatFile, marquerConfirme, useFile, viderFile } from '../appels/file';
import { calculerChemin, etatChemin, phraseRecapitulatif, type EtapeChemin } from '../utils/chemin';
import { cycleEnLigne, duTitre } from '../utils/regles';
import type { QuestionClient } from '../utils/types';
import { Attente, BandeauReseau, CarteInfo, EnTeteClient, useProjet, useQuestionnaire } from './Cadre';
import { TEXTES_CODE, reponsesDe } from './Question';

const PASTILLE = 'inline-flex items-center text-[13px] font-semibold px-2.5 py-1 rounded-full flex-none max-w-[55%] text-right';

/** State shown on a line of the list: « Validé », the chosen label, « Réserve », « Refus », « À répondre ». */
export function etatLigne(e: EtapeChemin<QuestionClient>): { texte: string; classe: string; cle: string } {
  const c = e.choix;
  if (!c) return { texte: 'À répondre', classe: 'bg-clair text-[#075985]', cle: 'a_repondre' };
  if (c.nature === 'refus') return { texte: 'Refus', classe: 'bg-[#fee2e2] text-[#991b1b]', cle: 'refus' };
  if (c.nature === 'reserve') return { texte: 'Réserve', classe: 'bg-[#fef3c7] text-[#92400e]', cle: 'reserve' };
  if (c.nature === 'validation') return { texte: 'Validé', classe: 'bg-[#dcfce7] text-[#166534]', cle: 'valide' };
  return { texte: c.libelle, classe: 'bg-[#dcfce7] text-[#166534]', cle: 'choix' };
}

const ECHECS: Record<string, string> = {
  QUESTIONS_SANS_REPONSE: 'Une question n’a pas encore de réponse : répondez-y, puis confirmez.',
  ...TEXTES_CODE
};

export default function Confirmer() {
  useCouleurTheme('#0369a1');
  const { questionnaire: qid = '' } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { statut, p, email, lent } = useProjet();
  const { recharger } = useEspace();
  const { q, chargement } = useQuestionnaire(qid);
  const f = useFile();
  const [relu, setRelu] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  if (statut === 'sortie' || chargement === 'refuse') return <Navigate to="/" replace />;
  if (statut === 'attente' || !q) {
    return (
      <>
        <EnTeteClient p={p} email={email} />
        <Attente lent={lent} />
      </>
    );
  }

  const chemin = calculerChemin(q.questions, reponsesDe(q));
  const e = etatChemin(chemin);
  const lectureSeule = q.etat !== 'ouvert' || q.role !== 'validant' || f.codes[qid] === 'QUESTIONNAIRE_CONFIRME';
  const enAttente = f.file.some((r) => r.questionnaire === qid);
  const possible = !lectureSeule && f.enLigne && e.pret && relu && !envoi;

  async function confirmerReponses() {
    if (!possible || !q) return;
    setEnvoi(true);
    setEchec(null);
    try {
      // Answers kept offline leave first: the server confirms only a path fully answered.
      if (enAttente) await viderFile();
      if (etatFile().file.some((r) => r.questionnaire === qid)) throw new Error('reseau');
      const res = await confirmer(qid);
      if (!res?.ok) {
        setEchec(ECHECS[res?.code ?? ''] ?? 'La confirmation n’est pas partie, réessayez.');
        setEnvoi(false);
        return;
      }
      await marquerConfirme(qid);
      await recharger();
      navigate(`/recu/${qid}`, { replace: true });
    } catch {
      setEchec('La confirmation n’est pas partie, réessayez.');
      setEnvoi(false);
    }
  }

  return (
    <>
      <EnTeteClient
        p={p}
        email={email}
        bas={
          <p className="text-[13px] leading-[1.3] font-semibold text-white text-center m-0" data-sous-entete="">
            {lectureSeule ? 'Vos réponses' : 'Avant de confirmer'}
          </p>
        }
      />
      {!f.enLigne && !lectureSeule && <BandeauReseau texte="Pas de réseau : vos réponses sont gardées sur ce téléphone." />}
      <Corps data-confirmer={lectureSeule ? 'lecture' : 'ouvert'} data-t-local={e.total} data-jauge-local={e.jauge}>
        <BarreRetour vers={lectureSeule ? (q.etat === 'confirme' ? `/recu/${qid}` : '/') : `/q/${qid}/${Math.max(1, chemin.length)}`} libelle={lectureSeule ? 'Retour' : 'Revenir à mes réponses'} />
        <p className="text-[13px] text-doux m-0">Touchez une ligne pour revoir la question.</p>
        <div className={`${CARTE} !gap-0 !py-1`} data-liste-chemin="">
          {chemin.map((x) => {
            const l = etatLigne(x);
            return (
              <Link
                key={x.question.id}
                to={`/q/${qid}/${x.rang}`}
                className="flex justify-between items-center gap-2.5 py-2.5 min-h-11 text-[14px] text-encre no-underline border-b border-[#e2e8f0] last:border-b-0"
                data-ligne={x.question.numero}
                data-etat-ligne={l.cle}
              >
                <span className="min-w-0">
                  {x.rang}. {majuscule(x.question.sujet_client)}
                </span>
                <span className={`${PASTILLE} ${l.classe}`}>{l.texte}</span>
              </Link>
            );
          })}
        </div>
        <p className="text-[14px] font-semibold m-0 leading-[1.45]" data-comptes="">
          {phraseRecapitulatif(e)}
        </p>
        {f.codes[qid] && TEXTES_CODE[f.codes[qid]] && <CarteInfo texte={TEXTES_CODE[f.codes[qid]]} data-code={f.codes[qid]} />}
        {!lectureSeule && (
          <>
            <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-[10px] p-3 text-[14px] text-[#78350f] leading-[1.45]" data-avertissement="">
              Vous confirmez vos réponses sur la{' '}
              <strong>
                version {q.version} {duTitre(q.titre_client)}
              </strong>{' '}
              ({cycleEnLigne(q.type)}). Elles seront datées et conservées ; elles ne pourront plus être modifiées.{' '}
              <Link to={`/document/${q.document_id}`} state={{ retour: pathname }} className="text-ciel underline" data-lire-document="">
                Lire le document
              </Link>
            </div>
            <label htmlFor="case-relu" className="flex gap-2.5 items-center min-h-11 text-[15px] font-medium text-encre cursor-pointer" data-case-relu="">
              <input id="case-relu" type="checkbox" className="sr-only peer" checked={relu} onChange={(ev) => setRelu(ev.target.checked)} data-relu="" />
              <span
                className={`w-[22px] h-[22px] rounded-[5px] box-border flex-none flex items-center justify-center peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-ciel ${relu ? 'bg-ciel border-2 border-ciel text-white' : 'bg-white border-2 border-[#64748b] text-transparent'}`}
                aria-hidden="true"
              >
                <Icone nom="coche" epaisseur={3.2} className="w-3.5 h-3.5" />
              </span>
              J'ai relu mes réponses
            </label>
            {echec && (
              <p className="text-[14px] font-semibold text-danger m-0" role="alert" data-echec-confirmation="">
                {echec}
              </p>
            )}
            <button
              type="button"
              className={possible ? PRIMAIRE : `${BOUTON} !bg-[#cbd5e1] !text-[#475569] !cursor-not-allowed !opacity-100`}
              disabled={!possible}
              onClick={() => void confirmerReponses()}
              data-confirmer-bouton={possible ? 'actif' : 'inactif'}
            >
              {envoi ? 'Confirmation…' : 'Je confirme mes réponses'}
            </button>
            {!f.enLigne ? (
              <p className="text-[13px] text-doux text-center m-0" data-raison="reseau">
                La confirmation demande du réseau. Vos réponses sont gardées.
              </p>
            ) : !e.pret ? (
              <p className="text-[13px] text-doux text-center m-0" data-raison="a_repondre">
                Répondez d’abord aux questions « À répondre ».
              </p>
            ) : !relu ? (
              <p className="text-[13px] text-doux text-center m-0" data-raison="relu">
                Cochez « J'ai relu mes réponses » pour pouvoir confirmer.
              </p>
            ) : null}
          </>
        )}
      </Corps>
    </>
  );
}

function majuscule(t: string): string {
  return t ? t.charAt(0).toLocaleUpperCase('fr') + t.slice(1) : t;
}
