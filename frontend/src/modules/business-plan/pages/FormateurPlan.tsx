// /plan/formateur/:planId(/:rubrique): a participant's plan, read only, with the existing atelier
// pages in `lectureSeule` mode (sections not delivered yet show their placeholder).
import { Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Patience, RenvoiAccueil } from '../composants/GardeFormateur';
import type { AutoPretest, Plan, ReponsePretest } from '../types';
import { Mise } from '../composants/Mise';
import { Progression } from '../composants/Progression';
import { Icone } from '../composants/Icones';
import { RUBRIQUES, progressionGlobale, rubrique } from '../rubriques/registre';
import { completerPlan } from '../etat/vide';
import { planParticipant, poserPretest, type PretestPapier } from '../sync/formateur';
import { dateFr } from '../utils/format';
import { AUTO, NOM_NIVEAU, QUESTIONS, calculerParcours, lirePretestDistant, pretestDe, score } from '../utils/pretest';

type Etat =
  | { statut: 'chargement' }
  | { statut: 'refuse' }
  | { statut: 'erreur' }
  | { statut: 'absent' }
  | { statut: 'ok'; plan: Plan; prenom: string; majAt: string; papier: PretestPapier | null };

const rien = () => undefined;

/** NEC-CC-16: pre-test score and level per module, same computation as the participant screen. */
export function LignePretest({ plan }: { plan: Plan }) {
  const t = plan.pretest ? pretestDe(plan) : null;
  if (!t?.valideLe) return <p className="bp-pretest-formateur mb-4 text-[15px] font-bold text-encre">Pré-test : non fait</p>;
  const parcours = calculerParcours(t);
  return (
    <div className="bp-pretest-formateur mb-4 rounded-2xl border border-filet bg-white p-3.5">
      <p className="text-[15px] font-bold text-encre">Pré-test : {parcours.score}/15</p>
      <ul className="mt-1.5 text-[14px] text-encre leading-snug space-y-0.5">
        {parcours.lignes.map((l) => (
          <li key={l.id}>
            {/^(Module \d+)\./.exec(l.titre)?.[1] ?? l.titre} : <b>{NOM_NIVEAU[l.niveau]}</b>
            {l.ecart ? ' (s\'estime à l\'aise)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

const CHOIX_PAPIER: { v: ReponsePretest; t: string; titre: string }[] = [
  { v: 'a', t: 'a', titre: 'a' },
  { v: 'b', t: 'b', titre: 'b' },
  { v: 'c', t: 'c', titre: 'c' },
  { v: 'd', t: 'd', titre: 'd' },
  { v: 'jnsp', t: '?', titre: 'Je ne sais pas' }
];
const NOTES_PAPIER: Exclude<AutoPretest, 0>[] = [1, 2, 3, 4];
const AUTO_VIDE: AutoPretest[] = [0, 0, 0, 0, 0, 0];

function Bouton({ actif, titre, onClick, children }: { actif: boolean; titre: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titre}
      aria-label={titre}
      aria-pressed={actif}
      className={`min-h-[40px] min-w-[40px] rounded-lg border-2 text-[16px] font-bold ${actif ? 'border-violet bg-violet text-white' : 'border-filet bg-white text-encre active:bg-violetClair'}`}
    >
      {children}
    </button>
  );
}

/**
 * NEC-CC-20: the trainer types the participant's paper pre-test (15 answers, B1 to B6). Saved in its own
 * column (bp_admin_poser_pretest); the phone pulls it when online and keeps a pre-test validated on it.
 */
export function CartePretestPapier({ planId, plan, initial }: { planId: string; plan: Plan; initial: PretestPapier | null }) {
  const [reponses, setReponses] = useState<Record<number, ReponsePretest>>(() => ({ ...(initial?.reponses ?? {}) }));
  const [auto, setAuto] = useState<AutoPretest[]>(() => (initial?.auto ? [...initial.auto] : [...AUTO_VIDE]));
  const [enregistre, setEnregistre] = useState<PretestPapier | null>(initial);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);
  const valide = plan.pretest?.valideLe ? (plan.pretest.source === 'formateur' ? 'formateur' : 'app') : null;

  if (valide) {
    return (
      <div className="bp-pretest-papier-formateur mb-4 rounded-2xl border border-filet bg-white p-3.5">
        <p className="text-[15px] font-bold text-encre">Pré-test papier</p>
        <p className="bp-pretest-etat mt-1 text-[15px] text-encre">{valide === 'app' ? "Fait dans l'app" : 'Pré-test papier reçu par le téléphone'}</p>
      </div>
    );
  }

  const complet = QUESTIONS.every((q) => !!reponses[q.n]) && auto.length === AUTO.length && auto.every((v) => v > 0);
  const envoyer = async (pretest: PretestPapier | null) => {
    setEnCours(true);
    setMessage(null);
    const r = await poserPretest(planId, pretest);
    setEnCours(false);
    if (r.statut === 'ok' && r.valeur?.ok) {
      setEnregistre(pretest);
      if (pretest) {
        const s = score({ reponses: pretest.reponses, auto: pretest.auto, valideLe: null });
        setMessage({ texte: `Enregistré, le téléphone le recevra dès qu'il sera en ligne. Score : ${s}/15`, ok: true });
      } else {
        setReponses({});
        setAuto([...AUTO_VIDE]);
        setMessage({ texte: 'Pré-test papier effacé.', ok: true });
      }
    } else {
      setMessage({ texte: 'Enregistrement impossible pour le moment, réessayez.', ok: false });
    }
  };

  return (
    <div className="bp-pretest-papier-formateur mb-4 rounded-2xl border-2 border-violet bg-white p-3.5">
      <p className="text-[16px] font-bold text-encre">Pré-test papier</p>
      <p className="text-[14px] text-doux leading-snug mb-3">Recopiez les réponses de la feuille. « ? » = Je ne sais pas.</p>
      <ol className="space-y-2">
        {QUESTIONS.map((q) => (
          <li key={q.n} className="bp-papier-question sm:flex sm:items-center sm:gap-3" data-question={q.n}>
            <p className="text-[14px] text-encre leading-snug truncate sm:flex-1 sm:min-w-0" title={q.texte}>
              <b>{q.n}.</b> {q.texte}
            </p>
            <div className="mt-1 sm:mt-0 grid grid-cols-5 gap-1.5 sm:w-[240px] sm:shrink-0">
              {CHOIX_PAPIER.map((c) => (
                <Bouton
                  key={c.v}
                  actif={reponses[q.n] === c.v}
                  titre={`Question ${q.n} : ${c.titre}`}
                  onClick={() => {
                    setMessage(null);
                    setReponses((r) => ({ ...r, [q.n]: c.v }));
                  }}
                >
                  {c.t}
                </Bouton>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <ol className="mt-4 space-y-2">
        {AUTO.map((texte, i) => (
          <li key={i} className="bp-papier-auto sm:flex sm:items-center sm:gap-3" data-auto={i + 1}>
            <p className="text-[14px] text-encre leading-snug truncate sm:flex-1 sm:min-w-0" title={`Je sais ${texte}`}>
              <b>B{i + 1}.</b> Je sais {texte}
            </p>
            <div className="mt-1 sm:mt-0 grid grid-cols-4 gap-1.5 sm:w-[192px] sm:shrink-0">
              {NOTES_PAPIER.map((v) => (
                <Bouton
                  key={v}
                  actif={auto[i] === v}
                  titre={`B${i + 1} : ${v}`}
                  onClick={() => {
                    setMessage(null);
                    setAuto((a) => a.map((x, j) => (j === i ? v : x)));
                  }}
                >
                  {String(v)}
                </Bouton>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={!complet || enCours}
        onClick={() => void envoyer({ reponses, auto })}
        className="bp-enregistrer-papier mt-4 w-full min-h-[48px] rounded-xl bg-violet text-white text-[16px] font-bold px-3 disabled:opacity-50"
      >
        Enregistrer le pré-test papier
      </button>
      {enregistre ? (
        <button
          type="button"
          disabled={enCours}
          onClick={() => void envoyer(null)}
          className="bp-effacer-papier mt-2 w-full min-h-[44px] rounded-xl border-2 border-filet text-encre font-bold bg-white disabled:opacity-50"
        >
          Effacer
        </button>
      ) : null}
      {message ? (
        <p role="status" className={`bp-message-papier mt-2.5 text-[15px] font-bold ${message.ok ? 'text-turquoiseTexte' : 'text-alerte'}`}>
          {message.texte}
        </p>
      ) : null}
    </div>
  );
}

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
      setEtat({ statut: 'ok', plan, prenom: r.valeur.prenom, majAt: r.valeur.maj_at, papier: lirePretestDistant(r.valeur.pretest_formateur) });
    });
    return () => {
      vivant = false;
    };
  }, [planId]);

  const retourListe = { vers: '/formateur', texte: 'Participants' };
  if (etat.statut === 'chargement') return <Patience />;
  // NON_AUTORISE or permission denied from the server: back to the home, no history entry.
  if (etat.statut === 'refuse') return <RenvoiAccueil />;
  if (etat.statut === 'erreur' || etat.statut === 'absent') {
    return (
      <Mise titre="Suivi formateur" retour={retourListe}>
        <p className="text-[16px] text-encre">{etat.statut === 'absent' ? 'Ce projet a été retiré.' : 'Connexion impossible pour le moment.'}</p>
      </Mise>
    );
  }

  const { plan, prenom, majAt, papier } = etat;
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
      <LignePretest plan={plan} />
      <CartePretestPapier planId={plan.id} plan={plan} initial={papier} />
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
