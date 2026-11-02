// Screen 12: questionnaire tree, client preview, publication (VC-21, RM5, RM13, RM14).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BarreRetour, CARTE, Corps, PRIMAIRE, SECONDAIRE, Squelette } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import ChoixQuestion from '../composants/ChoixQuestion';
import { NOM_CYCLE } from '../utils/regles';
import { questionSuivante, verifierArbre } from '../utils/arbre';
import { ficheClient, publier, questionnaire, supprimerBrouillon, type FicheClient, type QuestionComplete, type QuestionnaireComplet } from './api';
import { DANGER, EnTetePilotage, ErreurReseau, P_ATTENTE, P_INFO, P_OK, Pilule } from './Commun';
import { dateCourte } from './regles';

const ERREURS_PUBLIER: Record<string, string> = {
  SANS_VALIDANT: 'Désignez d’abord un validant.',
  VERSION_DEJA_PUBLIEE: 'Cette version est déjà publiée : une correction demande une nouvelle version (RM5).',
  PAS_UN_BROUILLON: 'Ce questionnaire n’est plus un brouillon : il ne se publie pas une seconde fois.'
};

const ETATS: Record<string, { texte: string; classe: string }> = {
  brouillon: { texte: 'Brouillon', classe: P_ATTENTE },
  ouvert: { texte: 'Publié', classe: P_OK },
  confirme: { texte: 'Confirmé', classe: P_OK },
  remplace: { texte: 'Remplacé', classe: P_INFO },
  clos: { texte: 'Clos', classe: P_INFO }
};

const NATURES: Record<string, string> = { validation: 'validation', reserve: 'réserve', refus: 'refus, motif' };

export default function Questionnaire() {
  const { id = '' } = useParams();
  const [q, setQ] = useState<QuestionnaireComplet | null>(null);
  const [fiche, setFiche] = useState<FicheClient | null>(null);
  const [erreur, setErreur] = useState(false);
  const [mode, setMode] = useState<'arbre' | 'apercu'>('arbre');
  const [confirmer, setConfirmer] = useState<'publier' | 'supprimer' | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [supprime, setSupprime] = useState(false);

  const charger = useCallback(async () => {
    setErreur(false);
    try {
      const r = await questionnaire(id);
      setQ(r);
      ficheClient(r.questionnaire.client_id)
        .then(setFiche)
        .catch(() => undefined);
    } catch {
      setErreur(true);
    }
  }, [id]);
  useEffect(() => {
    setQ(null);
    setMode('arbre');
    setRetour(null);
    setSupprime(false);
    void charger();
  }, [charger]);

  const verif = useMemo(() => (q ? verifierArbre(q.questions.map((x) => ({ numero: x.numero, choix: x.choix }))) : null), [q]);
  const validant = fiche?.personnes.find((p) => p.role === 'validant' && !p.revoque_at);
  const clientId = q?.questionnaire.client_id ?? '';

  async function agir(action: 'publier' | 'supprimer') {
    setEnvoi(true);
    setRetour(null);
    try {
      if (action === 'publier') {
        const r = await publier(id);
        if (r.ok) {
          setRetour({ ok: true, texte: 'Questionnaire publié : il ne se modifie plus. Vous pouvez inviter depuis la fiche du client.' });
          await charger();
        } else setRetour({ ok: false, texte: ERREURS_PUBLIER[r.code ?? ''] ?? 'Le serveur a refusé la publication.' });
      } else {
        const r = await supprimerBrouillon(id);
        if (r.ok) setSupprime(true);
        else setRetour({ ok: false, texte: 'Ce brouillon n’existe plus ou n’est plus un brouillon.' });
      }
    } catch {
      setRetour({ ok: false, texte: 'Le réseau ne répond pas. Réessayez.' });
    } finally {
      setEnvoi(false);
      setConfirmer(null);
    }
  }

  const sousTitre = fiche ? `pour ${fiche.client.entreprise}` : '';
  const retourFiche = clientId ? `/pilotage/client/${clientId}/fiche` : '/pilotage';

  if (supprime) {
    return (
      <>
        <EnTetePilotage titre="Pilotage : consultation" sousTitre={sousTitre} />
        <Corps>
          <BarreRetour vers={retourFiche} libelle="Fiche du client" />
          <div className={CARTE} data-brouillon-supprime="">
            <p className="text-[15px] m-0">Brouillon supprimé.</p>
          </div>
        </Corps>
      </>
    );
  }

  if (q && mode === 'apercu') return <Apercu q={q} sousTitre={sousTitre} fermer={() => setMode('arbre')} />;

  const etat = q ? ETATS[q.questionnaire.etat] : null;
  const arbreOk = q ? !q.arbre.boucle && q.arbre.atteintes >= q.questions.length : false;
  const brouillon = q?.questionnaire.etat === 'brouillon';

  return (
    <>
      <EnTetePilotage titre="Pilotage : consultation" sousTitre={sousTitre} />
      <Corps className="!gap-2.5">
        <BarreRetour vers={retourFiche} libelle="Fiche du client" />
        {!q && !erreur && <Squelette lent={false} />}
        {!q && erreur && <ErreurReseau reessayer={() => void charger()} />}
        {q && etat && (
          <>
            <div className="flex flex-col gap-1">
              <p className="text-[14px] font-semibold m-0">Étape et version</p>
              <div className="flex items-center justify-between gap-3 min-h-[46px] border border-[#cbd5e1] rounded-xl px-3.5 bg-white text-[15px]">
                <span className="min-w-0">
                  {NOM_CYCLE[q.document.type] ?? 'Document'}, version {q.document.version}
                </span>
                <Pilule classe={etat.classe} data-etat={q.questionnaire.etat}>
                  {q.questionnaire.etat === 'ouvert' && q.questionnaire.publie_at ? `Publié le ${dateCourte(q.questionnaire.publie_at)}` : etat.texte}
                </Pilule>
              </div>
              <p className="text-[13px] text-doux m-0">Titre pour le client : « {q.document.titre_client} »</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[14px] font-semibold m-0">Validant</p>
              <div className="flex items-center min-h-[46px] border border-[#cbd5e1] rounded-xl px-3.5 bg-white text-[15px]" data-validant="">
                {validant ? `${validant.civilite} ${validant.nom}` : fiche ? 'Aucun validant désigné' : '…'}
              </div>
            </div>

            <div className={`${CARTE} !gap-0 !py-1`} data-arbre="">
              {q.questions.map((x, i) => (
                <LigneQuestion key={x.id} x={x} toutes={q.questions} derniere={i === q.questions.length - 1} />
              ))}
            </div>

            <p className={`text-[13px] font-semibold m-0 ${arbreOk ? 'text-[#166534]' : 'text-danger'}`} data-arbre-verifie={arbreOk ? 'oui' : 'non'}>
              {arbreOk
                ? 'Arbre vérifié : aucune boucle, aucune question inatteignable.'
                : q.arbre.boucle
                  ? 'L’arbre contient une boucle.'
                  : `${q.questions.length - q.arbre.atteintes} question(s) inatteignable(s).`}
            </p>
            <p className="text-[13px] text-doux m-0" data-resume="">
              Saisi par {q.questionnaire.saisi_par === 'assistant' ? 'l’assistant' : 'Joël'} le {dateCourte(q.questionnaire.cree_at)}. {q.questions.length} questions, de {verif?.cheminMin ?? 0} à{' '}
              {q.arbre.chemin_max} selon le chemin. Une fois publiée, la consultation ne se modifie plus.
            </p>

            {retour && (
              <p className={`text-[14px] font-semibold m-0 ${retour.ok ? 'text-[#166534]' : 'text-danger'}`} role={retour.ok ? 'status' : 'alert'} data-retour="">
                {retour.texte}
              </p>
            )}

            {confirmer ? (
              <div className={`${CARTE} !border-2 ${confirmer === 'publier' ? '!border-ciel' : '!border-danger'}`} role="alertdialog" aria-label="Confirmation" data-confirmation={confirmer}>
                <p className="text-[15px] font-semibold m-0">
                  {confirmer === 'publier' ? 'Une fois publiée, la consultation ne se modifie plus. Publier ?' : 'Supprimer ce brouillon ? Le texte importé est perdu.'}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" className={`${SECONDAIRE} !text-[15px]`} onClick={() => setConfirmer(null)} disabled={envoi}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className={confirmer === 'publier' ? `${PRIMAIRE} !text-[15px]` : `${DANGER} !text-[15px]`}
                    onClick={() => void agir(confirmer)}
                    disabled={envoi}
                    data-confirmer=""
                  >
                    {confirmer === 'publier' ? 'Publier' : 'Supprimer'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <button type="button" className={`${SECONDAIRE} !text-[15px]`} onClick={() => setMode('apercu')} data-apercu-client="">
                    Aperçu client
                  </button>
                  {brouillon ? (
                    <button type="button" className={`${PRIMAIRE} !text-[15px]`} disabled={!validant || !arbreOk} onClick={() => setConfirmer('publier')} data-publier="">
                      Publier
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
                {brouillon && fiche && !validant && <p className="text-[13px] text-doux m-0">Désignez d'abord un validant (fiche du client).</p>}
                {brouillon && (
                  <button type="button" className={`${DANGER} !min-h-11 !text-[15px]`} onClick={() => setConfirmer('supprimer')} data-supprimer="">
                    Supprimer le brouillon
                  </button>
                )}
              </>
            )}
          </>
        )}
      </Corps>
    </>
  );
}

function LigneQuestion({ x, toutes, derniere }: { x: QuestionComplete; toutes: QuestionComplete[]; derniere: boolean }) {
  return (
    <div className={`flex gap-2.5 items-start py-2.5 ${derniere ? '' : 'border-b border-[#e2e8f0]'}`} data-question={x.numero}>
      <span className="font-bold text-ciel min-w-[30px]">{x.numero}</span>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <p className="text-[14px] m-0 leading-[1.45]">{x.texte}</p>
        {x.critere && <p className="text-[13px] text-doux m-0">Critère : {x.critere}</p>}
        <div className="flex flex-col gap-0.5 mt-0.5">
          {x.choix.map((c) => {
            const vers = questionSuivante(toutes, x.numero, c.suivante);
            return (
              <p key={c.id} className="text-[12px] text-[#075985] m-0" data-choix={c.lettre}>
                {c.libelle}
                {c.conseille ? ' (conseillé)' : ''}
                {NATURES[c.nature] ? ` [${NATURES[c.nature]}]` : ''} → {vers ?? 'fin'}
              </p>
            );
          })}
        </div>
      </div>
      <Pilule classe={x.essentielle ? P_OK : P_INFO}>{x.essentielle ? 'Essentiel' : 'Info'}</Pilule>
    </div>
  );
}

/** « Aperçu client »: any branch, one question at a time, as the client will see it; nothing is recorded. */
function Apercu({ q, sousTitre, fermer }: { q: QuestionnaireComplet; sousTitre: string; fermer: () => void }) {
  const [chemin, setChemin] = useState<string[]>([q.questions[0]?.numero ?? '']);
  const courant = chemin[chemin.length - 1];
  const x = q.questions.find((y) => y.numero === courant) ?? null;
  const cycle = `${NOM_CYCLE[q.document.type] ?? 'Document'}, v${q.document.version}`;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [courant]);

  return (
    <>
      <EnTetePilotage titre="Pilotage : aperçu client" sousTitre={sousTitre} />
      <Corps>
        <div className="vc-retour">
          <button type="button" onClick={fermer} className="flex items-center gap-1.5 min-h-11 px-3 text-ciel text-[15px] font-semibold" data-fermer-apercu="">
            <Icone nom="retour" epaisseur={2.4} />
            Retour à l'arbre
          </button>
        </div>
        <p className="text-[13px] bg-clair text-[#075985] rounded-xl px-3.5 py-2.5 m-0 font-semibold" data-apercu="">
          Aperçu : rien n'est enregistré. Parcours : {chemin.map((n) => n || 'fin').join(' → ')}
        </p>
        {x ? (
          <>
            <div className={CARTE} data-question-apercu={x.numero}>
              <p className="text-[13px] text-doux m-0">
                {cycle} : {x.sujet_client}.
              </p>
              <h1 className="text-[19px] leading-tight font-bold m-0">{x.texte}</h1>
              {x.extrait && <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-3 text-[14px] text-[#334155] leading-[1.45]">« {x.extrait} »</div>}
            </div>
            <ChoixQuestion
              key={x.id}
              choix={x.choix}
              selection={null}
              libelleAction={(c) => `${c.libelle} : passer à la suite`}
              onChoisir={(c) => {
                const suite = x.choix.find((y) => y.id === c.id)?.suivante ?? null;
                setChemin((l) => [...l, questionSuivante(q.questions, x.numero, suite) ?? '']);
              }}
            />
            {(x.choix.some((c) => c.nature === 'reserve') || x.choix.some((c) => c.nature === 'refus')) && (
              <p className="text-[13px] text-doux m-0">Chez le client, une réserve ou un refus demande un commentaire avant de continuer.</p>
            )}
          </>
        ) : (
          <div className={CARTE} data-fin-apercu="">
            <p className="text-[15px] font-semibold m-0">Fin du parcours : {chemin.filter(Boolean).length} questions posées.</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" className={`${SECONDAIRE} !text-[15px]`} disabled={chemin.length < 2} onClick={() => setChemin((l) => l.slice(0, -1))} data-precedente="">
            Question précédente
          </button>
          <button type="button" className={`${SECONDAIRE} !text-[15px]`} onClick={() => setChemin([q.questions[0]?.numero ?? ''])} data-recommencer="">
            Recommencer
          </button>
        </div>
      </Corps>
    </>
  );
}
