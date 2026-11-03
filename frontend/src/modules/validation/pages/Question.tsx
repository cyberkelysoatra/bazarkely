// Question screens (/q/:questionnaire/:numero, numero = rank on the current path): screen 4
// (validation question), screen 5 (3 choices, offline banner), screen 6 (refusal with its reason),
// and the read-only state of a confirmed or closed questionnaire (VC-04 to VC-11, VC-17, VC-19).
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEspace } from '../EspaceContexte';
import { JaugeEnTete } from '../composants/EnTete';
import ChoixQuestion from '../composants/ChoixQuestion';
import { BarreRetour, CARTE, Corps, PRIMAIRE, SECONDAIRE, useCouleurTheme } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { ajouterReponse, etatFile, reessayer, useFile } from '../appels/file';
import { appareil } from '../appels/local';
import { calculerChemin, etatChemin, type EtapeChemin } from '../utils/chemin';
import { NOM_CYCLE, dateSeule, personneValidant, phraseEquipe, votantsParChoix } from '../utils/regles';
import { usePresence } from '../appels/presence';
import type { Espace, QuestionClient, QuestionnaireComplet } from '../utils/types';
import { Attente, BandeauReseau, CarteClose, CarteInfo, EnTeteClient, documentDe, useProjet, useQuestionnaire } from './Cadre';
import { PastilleQuestion } from '../composants/VersDiscussion';
import { libelleQuestion } from '../utils/discussion';
import { useMicro } from '../composants/Micro';

export const MAX_COMMENTAIRE = 2000;
const COMPTEUR_DES = 1800;

export const DANGER_PLEIN = 'min-h-12 rounded-xl text-[16px] font-semibold flex items-center justify-center gap-2 px-4 cursor-pointer bg-white text-danger border-2 border-danger disabled:opacity-60';

/** Server code of a questionnaire that no longer takes answers → client text (RM4, section 7). */
export const TEXTES_CODE: Record<string, string> = {
  QUESTIONNAIRE_REMPLACE: 'Une nouvelle version est disponible. Vos réponses à l’ancienne sont conservées.',
  QUESTIONNAIRE_CLOS: 'Cette consultation est close. Vos réponses sont conservées.'
};

export function reponsesDe(q: QuestionnaireComplet): Record<string, string> {
  return Object.fromEntries((q.mes_reponses ?? []).map((r) => [r.question_id, r.choix_id]));
}

export default function Question() {
  useCouleurTheme('#0369a1');
  const { questionnaire: qid = '', numero = '1' } = useParams();
  const { statut, p, email, lent } = useProjet();
  const { recharger } = useEspace();
  const { q, chargement } = useQuestionnaire(qid);
  const f = useFile();

  const code = f.codes[qid];
  const cheminPresence = q ? calculerChemin(q.questions, reponsesDe(q)) : null;
  const rangPresence = cheminPresence ? Math.min(Math.max(1, parseInt(numero, 10) || 1), Math.max(1, cheminPresence.length)) : 0;
  usePresence(
    p?.client_id,
    p && q && cheminPresence ? { type: 'question', titre: q.titre_client, n: rangPresence, total: etatChemin(cheminPresence).total } : null
  );
  useEffect(() => {
    // A newer version or a closing seen by the server: re-read the home data (new card).
    if (code) void recharger();
  }, [code, recharger]);

  if (statut === 'sortie' || chargement === 'refuse') return <Navigate to="/" replace />;
  if (statut === 'attente' || !q) {
    if (chargement === 'erreur' && statut === 'pret')
      return (
        <>
          <EnTeteClient p={p} email={email} />
          {!f.enLigne && <BandeauReseau texte="Pas de réseau : cette question n’a pas encore été ouverte sur ce téléphone." />}
          <Corps>
            <BarreRetour />
            <CarteInfo texte="Le réseau ne répond pas. Vérifiez votre connexion, puis réessayez." data-erreur-chargement="" />
          </Corps>
        </>
      );
    return (
      <>
        <EnTeteClient p={p} email={email} />
        <Attente lent={lent} />
      </>
    );
  }

  const chemin = calculerChemin(q.questions, reponsesDe(q));
  const e = etatChemin(chemin);
  const n = Math.min(Math.max(1, parseInt(numero, 10) || 1), Math.max(1, chemin.length));
  const etape = chemin[n - 1];
  const contributeur = q.role === 'contributeur';
  const serveur = f.etatServeur[qid];
  const bas = <JaugeEnTete pourcent={e.jauge} texte={`Question ${n} sur ${e.total}${contributeur ? ' (votre avis)' : ''}`} sansJauge={contributeur} />;
  const doc = documentDe(p, qid);
  // Closed while answering (RM4): read-only too, with the message and the discussion button.
  const lectureSeule = q.etat !== 'ouvert' || code === 'QUESTIONNAIRE_CONFIRME' || code === 'QUESTIONNAIRE_CLOS';

  return (
    <>
      <EnTeteClient p={p} email={email} bas={bas} />
      {!f.enLigne && !lectureSeule && <BandeauReseau />}
      <Corps
        data-question-page=""
        data-t-local={e.total}
        data-jauge-local={e.jauge}
        data-t-serveur={serveur?.total ?? ''}
        data-jauge-serveur={serveur?.jauge ?? ''}
        data-pret-local={e.pret ? 'oui' : 'non'}
      >
        {etape ? (
          <FormulaireQuestion
            key={etape.question.id}
            q={q}
            etape={etape}
            n={n}
            total={chemin.length}
            lectureSeule={lectureSeule}
            confirmeAt={doc?.confirme_at ?? null}
            code={code}
            p={p}
            nouvelle={doc ? (p?.documents ?? []).find((d) => d.type === doc.type && d.etat !== 'remplace' && d.questionnaire_id !== qid) ?? null : null}
          />
        ) : (
          <>
            <BarreRetour />
            <CarteInfo texte="Joël prépare encore ces questions." data-sans-question="" />
          </>
        )}
      </Corps>
    </>
  );
}

interface PropsFormulaire {
  q: QuestionnaireComplet;
  etape: EtapeChemin<QuestionClient>;
  n: number;
  total: number;
  lectureSeule: boolean;
  confirmeAt: string | null;
  code: string | undefined;
  p: Espace | null;
  nouvelle: { questionnaire_id: string } | null;
}

function FormulaireQuestion({ q, etape, n, total, lectureSeule, confirmeAt, code, p, nouvelle }: PropsFormulaire) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const f = useFile();
  const x = etape.question;
  const precedente = q.mes_reponses.find((r) => r.question_id === x.id) ?? null;
  const [selection, setSelection] = useState<string | null>(precedente?.choix_id ?? null);
  const [commentaire, setCommentaire] = useState(precedente?.commentaire ?? '');
  const [mode, setMode] = useState<'choix' | 'refus'>(etape.choix?.nature === 'refus' ? 'refus' : 'choix');
  const [manque, setManque] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const champ = useRef<HTMLTextAreaElement>(null);

  const choisi = x.choix.find((c) => c.id === selection) ?? null;
  const cycle = `${NOM_CYCLE[q.type] ?? 'Document'}, v${q.version}`;
  // Any answer of this questionnaire still waiting after a failed send: never a silent loss.
  const erreurEnvoi = echec ?? (f.erreurs[x.id] || Object.entries(f.erreurs).some(([k, v]) => v === 'reseau' && q.questions.some((y) => y.id === k)) ? 'reseau' : null);
  const enCours = envoi || f.envoi === x.id;
  const contributeur = q.role === 'contributeur';
  const validant = personneValidant(p?.validant);
  // Validant: opinions of the team on this question (VC-14); never shown to a contributor.
  const avisEquipe = q.role === 'validant' ? (q.equipe ?? []).filter((a) => a.question_id === x.id) : [];
  const phrase = phraseEquipe(avisEquipe, Object.fromEntries(x.choix.map((c) => [c.id, c.libelle])), !lectureSeule);
  const votants = avisEquipe.length ? votantsParChoix(avisEquipe) : undefined;

  const lien = (
    <Link to={`/document/${q.document_id}`} state={{ retour: pathname }} className="text-ciel underline" data-lire-document="">
      Lire le document
    </Link>
  );

  async function continuer() {
    const c = choisi;
    if (!c || enCours) return;
    const com = commentaire.trim();
    if ((c.nature === 'reserve' || c.nature === 'refus') && !com) {
      setManque(true);
      champ.current?.focus();
      return;
    }
    const inchangee = precedente && precedente.choix_id === c.id && (precedente.commentaire ?? '').trim() === com;
    if (!inchangee) {
      setEnvoi(true);
      setEchec(null);
      const issue = await ajouterReponse({
        id: crypto.randomUUID(),
        questionnaire: q.id,
        question: x.id,
        choix: c.id,
        commentaire: com || null,
        repondu_at: new Date().toISOString(),
        appareil: appareil()
      });
      setEnvoi(false);
      if (issue === 'erreur' || (issue !== 'envoye' && issue !== 'garde')) {
        if (!/^QUESTIONNAIRE_/.test(issue)) setEchec('reseau');
        return;
      }
    }
    // The answer may change the path (VC-19): next rank on the recomputed path.
    const chemin = calculerChemin(q.questions, { ...reponsesDe(q), [x.id]: c.id });
    if (n < chemin.length) navigate(`/q/${q.id}/${n + 1}`);
    else navigate(q.role === 'validant' ? `/confirmer/${q.id}` : `/merci/${q.id}`);
  }

  async function relancer() {
    setEchec(null);
    setEnvoi(true);
    await reessayer();
    setEnvoi(false);
    // Error state right after the retry, read outside the React state.
    if (etatFile().erreurs[x.id] || etatFile().file.some((r) => r.question === x.id)) setEchec('reseau');
    else void continuer();
  }

  const carteQuestion = (
    <div className={CARTE} data-carte-question={x.numero}>
      <p className="text-[13px] text-doux m-0 leading-[1.45]" data-sujet="">
        {cycle} : {x.sujet_client}. {lien}
      </p>
      <h1 className="text-[19px] leading-tight font-bold m-0" data-texte-question="">
        {x.texte}
      </h1>
      {phrase && (
        <div className="bg-fond border border-[#bae6fd] rounded-[10px] p-3 text-[14px] text-nuit leading-[1.45]" data-votre-equipe="">
          <strong>Votre équipe</strong> : {phrase}
        </div>
      )}
      <PastilleQuestion question={{ id: x.id, libelle: libelleQuestion(x.numero, x.sujet_client) }} />
      {contributeur && !lectureSeule && (
        <p className="text-[13px] text-doux m-0 leading-[1.45]" data-ligne-avis="">
          Votre choix est un avis : {validant.prenom || 'la personne qui décide'} tranche. Vous ne voyez pas les avis des autres membres de l'équipe.
        </p>
      )}
      {x.extrait && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-3 text-[14px] text-[#334155] leading-[1.45]" data-extrait="">
          « {x.extrait} »
        </div>
      )}
      {mode === 'refus' && !lectureSeule && <BlocRefus commentaire={commentaire} setCommentaire={setCommentaire} manque={manque} setManque={setManque} champ={champ} id={x.id} />}
    </div>
  );

  // ---------------------------------------------------------------- read-only (RM4, VC-12)
  if (lectureSeule) {
    const c = etape.choix;
    return (
      <>
        <BarreRetour vers={`/confirmer/${q.id}`} />
        {code === 'QUESTIONNAIRE_CLOS' || (q.etat === 'clos' && !code) ? (
          <CarteClose qid={q.id} texte={TEXTES_CODE.QUESTIONNAIRE_CLOS} nonLus={p?.messages_non_lus ?? 0} />
        ) : (
          code && TEXTES_CODE[code] && <CarteInfo texte={TEXTES_CODE[code]} data-code={code} />
        )}
        {carteQuestion}
        <div className={`${CARTE} !gap-2`} data-lecture-seule="">
          {c ? (
            <>
              <p className="text-[13px] text-doux m-0">{contributeur ? 'Votre avis' : 'Votre réponse'}</p>
              <p className="text-[16px] font-bold m-0" data-reponse-figee={c.lettre}>
                {c.libelle}
              </p>
              {precedente?.commentaire && <p className="text-[14px] m-0 leading-[1.45] whitespace-pre-wrap">« {precedente.commentaire} »</p>}
            </>
          ) : (
            <p className="text-[14px] m-0">Pas de réponse à cette question.</p>
          )}
          {q.etat === 'confirme' && (
            <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#166534] m-0" data-confirmee="">
              <Icone nom="coche" epaisseur={2.4} className="w-4 h-4" />
              {contributeur
                ? `Confirmé par ${validant.nom}${confirmeAt ? ` le ${dateSeule(confirmeAt)}` : ''}`
                : confirmeAt
                  ? `Réponse confirmée le ${dateSeule(confirmeAt)}`
                  : 'Réponse confirmée'}
            </p>
          )}
        </div>
      </>
    );
  }

  const piedErreur = erreurEnvoi && (
    <div className="flex flex-col gap-2 bg-[#fee2e2] border border-[#fecaca] rounded-[10px] px-3 py-2.5" role="alert" data-erreur-envoi="">
      <p className="text-[14px] font-semibold text-[#991b1b] m-0">Réponse non enregistrée, réessayez.</p>
      <button type="button" className={`${SECONDAIRE} !min-h-11 !text-[15px]`} onClick={() => void relancer()} disabled={enCours} data-reessayer="">
        Réessayer
      </button>
    </div>
  );

  const codeBloc = code && TEXTES_CODE[code] && (
    <CarteInfo
      texte={TEXTES_CODE[code]}
      data-code={code}
      action={
        code === 'QUESTIONNAIRE_REMPLACE' ? (
          <button type="button" className={PRIMAIRE} onClick={() => navigate(nouvelle ? `/q/${nouvelle.questionnaire_id}/1` : '/')} data-nouvelle-version="">
            Ouvrir la nouvelle version
          </button>
        ) : undefined
      }
    />
  );

  // ---------------------------------------------------------------- screen 6: refusal
  if (mode === 'refus') {
    return (
      <>
        <BarreRetour />
        {codeBloc}
        {carteQuestion}
        <div className="vc-action" data-pied="">
          {piedErreur}
          <button type="button" className={DANGER_PLEIN} onClick={() => void continuer()} disabled={enCours || !!code} data-envoyer-refus="">
            Envoyer mon refus et continuer
          </button>
          <button
            type="button"
            className={SECONDAIRE}
            onClick={() => {
              setMode('choix');
              setManque(false);
              setSelection(precedente && precedente.choix_id !== choisi?.id ? precedente.choix_id : null);
            }}
            disabled={enCours}
            data-revenir="">
            Revenir sur ma réponse
          </button>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------- screens 4 and 5
  const validation = x.type === 'validation';
  const reserve = choisi?.nature === 'reserve';
  return (
    <>
      <BarreRetour />
      {codeBloc}
      {carteQuestion}
      <ChoixQuestion
        choix={x.choix}
        selection={selection}
        votants={votants}
        desactive={enCours}
        onChoisir={(c) => {
          setSelection(c.id);
          setManque(false);
          if (c.nature === 'refus') setMode('refus');
        }}
      />
      {!validation && x.choix.some((c) => c.suivante) && <p className="text-[13px] text-doux m-0">Votre choix oriente les questions suivantes.</p>}
      <Commentaire
        id={x.id}
        libelle={validation ? 'Commentaire (facultatif ; obligatoire avec une réserve)' : 'Commentaire (facultatif)'}
        valeur={commentaire}
        changer={(v) => {
          setCommentaire(v);
          if (v.trim()) setManque(false);
        }}
        rouge={manque && reserve}
        champ={champ}
      />
      {manque && reserve && (
        <p className="text-[13px] font-semibold text-danger m-0" role="alert" data-manque-reserve="">
          Précisez votre réserve en quelques mots.
        </p>
      )}
      <div className="vc-action" data-pied="">
        {piedErreur}
        <button type="button" className={PRIMAIRE} onClick={() => void continuer()} disabled={!choisi || enCours || !!code} data-continuer={n < total ? 'suivante' : 'fin'}>
          {contributeur ? 'Enregistrer mon avis' : 'Continuer'}
        </button>
      </div>
    </>
  );
}


function Commentaire({
  id,
  libelle,
  valeur,
  changer,
  rouge,
  champ
}: {
  id: string;
  libelle: string;
  valeur: string;
  changer: (v: string) => void;
  rouge: boolean;
  champ: RefObject<HTMLTextAreaElement | null>;
}) {
  const fid = `commentaire-${id}`;
  const micro = useMicro({ valeur, changer, max: MAX_COMMENTAIRE });
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fid} className="text-[14px] font-semibold text-encre">
        {libelle}
      </label>
      <div className="relative">
        <textarea
          id={fid}
          ref={champ}
          value={valeur}
          maxLength={MAX_COMMENTAIRE}
          onChange={(ev) => changer(ev.target.value.slice(0, MAX_COMMENTAIRE))}
          className={`block w-full box-border min-h-[96px] rounded-[10px] p-2.5 pr-[60px] text-[15px] font-[inherit] resize-none bg-white ${rouge ? 'border-2 border-danger' : 'border border-[#94a3b8]'}`}
          aria-invalid={rouge}
          data-commentaire=""
        />
        <div className="absolute right-2 bottom-2.5">{micro.bouton}</div>
      </div>
      {micro.message}
      {valeur.length >= COMPTEUR_DES && (
        <p className="text-[12px] text-doux m-0 text-right" data-compteur="">
          {valeur.length} / {MAX_COMMENTAIRE}
        </p>
      )}
    </div>
  );
}

function BlocRefus({
  commentaire,
  setCommentaire,
  manque,
  setManque,
  champ,
  id
}: {
  commentaire: string;
  setCommentaire: (v: string) => void;
  manque: boolean;
  setManque: (v: boolean) => void;
  champ: RefObject<HTMLTextAreaElement | null>;
  id: string;
}) {
  const fid = `motif-${id}`;
  const changer = (v: string) => {
    setCommentaire(v);
    if (v.trim()) setManque(false);
  };
  const micro = useMicro({ valeur: commentaire, changer, max: MAX_COMMENTAIRE });
  return (
    <>
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-full self-start bg-[#fee2e2] text-[#991b1b]" data-pastille-refus="">
        <Icone nom="croix" epaisseur={2.4} />
        Vous ne validez pas
      </span>
      <label htmlFor={fid} className="text-[14px] font-semibold text-encre">
        Pourquoi ? (obligatoire)
      </label>
      <div className="relative">
        <textarea
          id={fid}
          ref={champ}
          value={commentaire}
          maxLength={MAX_COMMENTAIRE}
          onChange={(ev) => changer(ev.target.value.slice(0, MAX_COMMENTAIRE))}
          className="block w-full box-border min-h-[96px] rounded-[10px] p-2.5 pr-[60px] text-[15px] font-[inherit] resize-none bg-white border-2 border-danger"
          aria-invalid={manque}
          aria-required="true"
          data-motif=""
        />
        <div className="absolute right-2 bottom-2.5">{micro.bouton}</div>
      </div>
      {micro.message}
      {commentaire.length >= COMPTEUR_DES && (
        <p className="text-[12px] text-doux m-0 text-right" data-compteur="">
          {commentaire.length} / {MAX_COMMENTAIRE}
        </p>
      )}
      {manque && (
        <p className="text-[13px] font-semibold text-danger m-0" role="alert" data-manque-motif="">
          Écrivez pourquoi en quelques mots.
        </p>
      )}
      <p className="text-[13px] text-doux m-0 leading-[1.45]">
        Joël est prévenu tout de suite et reprendra ce point avec vous dans la version suivante. Vous passez ensuite à la question suivante.
      </p>
    </>
  );
}

