// /plan/p/:id/posttest (NEC-CC-22): the post-test, opened remotely by the trainer (seen open once by the
// phone, then open for good, offline too). Parts A, B, C on the model of the pre-test, every tap saved at
// once; "Terminer" freezes it and shows the results (rule E4 of lot 2) and the answer key. Sent with the
// plan, never printed.
import { useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { AutoPretest, Plan, Posttest as TPosttest, ReponsePretest } from '../types';
import { usePlan } from '../etat/usePlan';
import { Mise } from '../composants/Mise';
import { Carte } from '../composants/Carte';
import { Aide } from '../composants/Aide';
import { Icone } from '../composants/Icones';
import { FournisseurEtapes } from '../composants/SuivantPrecedent';
import { Gras } from '../ateliers/m5/niveaux';
import { AUTO, ECHELLE, QUESTIONS, type Lettre } from '../utils/pretest';
import {
  POSTTEST_VERROUILLE,
  QUESTION_AMELIORER,
  QUESTION_SERVI,
  SATISFACTION,
  TITRE_C,
  corrige,
  posttestComplet,
  posttestDe,
  posttestOuvert,
  pretestReference,
  reponsePost,
  resultats,
  texteGain,
  texteReponse,
  type Resultats
} from '../utils/posttest';
import { Choix } from './Pretest';
import { Introuvable } from './Introuvable';

const LETTRES: Lettre[] = ['a', 'b', 'c', 'd'];

/** One line noted 1 to 4 (parts B and C), large touch targets. */
function Notes({ nom, valeur, desactive, onNoter, children }: { nom: string; valeur: AutoPretest; desactive: boolean; onNoter: (v: AutoPretest) => void; children: ReactNode }) {
  return (
    <fieldset className="bp-note" data-note={nom}>
      <legend className="text-[15px] font-bold text-encre leading-snug mb-2">{children}</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {ECHELLE.map((e) => {
          const coche = valeur === e.v;
          return (
            <label
              key={e.v}
              title={e.t}
              className={`flex flex-col items-center justify-center rounded-xl border-2 min-h-[52px] px-1 py-1 text-center ${coche ? 'border-violet bg-violet text-white' : 'border-filet bg-white text-encre'}`}
            >
              <input type="radio" name={nom} checked={coche} disabled={desactive} onChange={() => onNoter(e.v)} className="sr-only" />
              <span className="text-[17px] font-bold leading-none">{e.v}</span>
              <span className={`text-[11px] leading-tight mt-0.5 ${coche ? 'text-white' : 'text-doux'}`}>{e.t}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Small table A pré, A post, gain A, B pré, B post, gain B (participant and trainer screens). */
export function TableauResultats({ r }: { r: Resultats }) {
  const v = (x: number | null) => (x === null ? 'pas fait' : String(x));
  const ligne = (nom: string, sur: number, pre: number | null, post: number | null, gain: number | null) => (
    <tr className="border-t border-filet">
      <th scope="row" className="py-2 pr-2 text-left text-[14px] font-bold text-encre leading-tight">
        {nom}
        <span className="block text-[12px] font-normal text-doux">sur {sur}</span>
      </th>
      <td className="py-2 px-1 text-center text-[16px] tabular-nums">{v(pre)}</td>
      <td className="py-2 px-1 text-center text-[16px] tabular-nums font-bold">{v(post)}</td>
      <td className={`py-2 pl-1 text-center tabular-nums ${gain === null ? 'text-[13px] text-doux' : 'text-[16px] font-bold text-turquoiseTexte'}`}>{texteGain(gain)}</td>
    </tr>
  );
  return (
    <table className="bp-resultats w-full border-collapse">
      <thead>
        <tr className="text-[13px] text-doux">
          <th scope="col" className="pb-1 text-left font-normal">
            Partie
          </th>
          <th scope="col" className="pb-1 font-normal">
            Pré-test
          </th>
          <th scope="col" className="pb-1 font-normal">
            Post-test
          </th>
          <th scope="col" className="pb-1 font-normal">
            Gain
          </th>
        </tr>
      </thead>
      <tbody>
        {ligne('A. Questions', 15, r.aPre, r.aPost, r.gainA)}
        {ligne('B. Je sais...', 24, r.bPre, r.bPost, r.gainB)}
      </tbody>
    </table>
  );
}

function Resultat({ plan, t }: { plan: Plan; t: TPosttest }) {
  const pre = pretestReference(plan);
  const r = resultats(pre, t);
  const lignes = corrige(pre, t);
  return (
    <>
      <Carte titre="Mes résultats" ton="violet" id="bp-resultats-posttest" className="bp-resultats-posttest">
        <TableauResultats r={r} />
        {pre ? null : <p className="mt-2 text-[14px] text-encre leading-snug">Tu n'as pas de pré-test enregistré : ton gain n'est pas calculable.</p>}
      </Carte>
      <Carte titre="Le corrigé" sousTitre="Ta réponse au pré-test, au post-test, et la bonne réponse.">
        <ol className="space-y-3">
          {lignes.map((l) => {
            const q = QUESTIONS[l.n - 1];
            const juste = l.post === l.bonne;
            return (
              <li key={l.n} className="bp-corrige rounded-xl border border-filet bg-white p-3" data-question={l.n} data-juste={juste}>
                <p className="text-[15px] font-bold text-encre leading-snug">
                  {l.n}. {l.texte}
                </p>
                <dl className="mt-1.5 text-[14px] leading-snug space-y-0.5">
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-doux">Pré-test :</dt>
                    <dd className="min-w-0 break-words">{texteReponse(l.pre, q.choix)}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-doux">Post-test :</dt>
                    <dd className={`min-w-0 break-words font-bold ${juste ? 'text-turquoiseTexte' : 'text-alerte'}`}>
                      {texteReponse(l.post, q.choix)}
                      {juste ? ' (juste)' : ''}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="shrink-0 text-doux">Bonne réponse :</dt>
                    <dd className="min-w-0 break-words font-bold">{texteReponse(l.bonne, q.choix)}</dd>
                  </div>
                </dl>
                {l.explications.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {l.explications.map((x) => (
                      <li key={x} className="bp-explication text-[14px] leading-snug text-encre pl-3 border-l-4 border-turquoise">
                        <Gras texte={x} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      </Carte>
    </>
  );
}

export default function Posttest() {
  const { id } = useParams();
  const { etat, modifier, sauverMaintenant } = usePlan(id);
  const [confirmer, setConfirmer] = useState(false);
  if (etat.statut === 'absent') return <Introuvable />;
  if (etat.statut === 'chargement') return <Mise titre="Mon post-test">{null}</Mise>;
  const plan = etat.plan;
  const retour = { vers: `/p/${plan.id}`, texte: 'Sommaire' };
  const sousTitre = plan.identite.nomProjet.trim() || 'Projet sans nom';

  if (!posttestOuvert(plan)) {
    return (
      <Mise titre="Mon post-test" sousTitre={sousTitre} retour={retour} plan={plan}>
        <p className="bp-posttest-verrouille flex items-center gap-3 rounded-2xl border-2 border-filet bg-white p-4 text-[16px] font-bold text-encre leading-snug">
          <Icone nom="cadenas" className="w-6 h-6 shrink-0 text-doux" />
          {POSTTEST_VERROUILLE}
        </p>
      </Mise>
    );
  }

  const t = posttestDe(plan);
  const fige = !!t.termineLe;
  const complet = posttestComplet(t);
  const manquantes = QUESTIONS.filter((q) => reponsePost(t, q.n) === '').length + t.auto.filter((v) => !v).length + t.satisfaction.filter((v) => !v).length;

  /** Each tap saved at once; free texts with the usual autosave. */
  const changer = (recette: (x: TPosttest) => void, tout = true) => {
    if (fige) return;
    modifier((p) => {
      const x = posttestDe(p);
      recette(x);
      p.posttest = x;
    });
    if (tout) void sauverMaintenant();
  };
  const repondre = (n: number, r: ReponsePretest) =>
    changer((x) => {
      x.reponses = { ...x.reponses, [n]: r };
    });
  const terminer = () => {
    changer((x) => {
      x.termineLe = new Date().toISOString();
    });
    setConfirmer(false);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  return (
    <Mise titre="Mon post-test" sousTitre={sousTitre} retour={retour} plan={plan}>
      <FournisseurEtapes planId={plan.id} chemin="posttest">
        {fige ? (
          <Resultat plan={plan} t={t} />
        ) : (
          <>
            <Aide titre="Comment ça marche ?">
              Les mêmes questions que ce matin, environ 15 minutes. Si tu ne sais pas, coche Je ne sais pas. Tu peux revenir sur tes réponses jusqu'à Terminer, puis tu
              verras tes résultats et le corrigé.
            </Aide>
            <Carte titre="Partie A : 15 questions" sousTitre="Une seule réponse par question.">
              <div className="space-y-5">
                {QUESTIONS.map((q) => {
                  const r = reponsePost(t, q.n);
                  return (
                    <fieldset key={q.n} className="bp-question" data-question={q.n}>
                      <legend className="text-[16px] font-bold text-encre leading-snug mb-2">
                        {q.n}. {q.texte}
                      </legend>
                      <div className="space-y-1.5">
                        {LETTRES.map((x) => (
                          <Choix key={x} nom={`q${q.n}`} coche={r === x} desactive={false} onChoisir={() => repondre(q.n, x)}>
                            {x}) {q.choix[x]}
                          </Choix>
                        ))}
                        <Choix nom={`q${q.n}`} coche={r === 'jnsp'} desactive={false} onChoisir={() => repondre(q.n, 'jnsp')}>
                          Je ne sais pas
                        </Choix>
                      </div>
                    </fieldset>
                  );
                })}
              </div>
            </Carte>

            <Carte titre="Partie B : je sais..." sousTitre="1 = pas du tout, 2 = un peu, 3 = assez bien, 4 = tout à fait">
              <div className="space-y-4">
                {AUTO.map((texte, i) => (
                  <Notes key={i} nom={`b${i + 1}`} valeur={t.auto[i]} desactive={false} onNoter={(v) => changer((x) => void (x.auto = x.auto.map((y, j) => (j === i ? v : y))))}>
                    B{i + 1}. Je sais {texte}
                  </Notes>
                ))}
              </div>
            </Carte>

            <Carte titre={`Partie C : ${TITRE_C}`} sousTitre="1 = pas du tout, 2 = un peu, 3 = assez bien, 4 = tout à fait">
              <div className="space-y-4">
                {SATISFACTION.map((texte, i) => (
                  <Notes
                    key={i}
                    nom={`c${i + 1}`}
                    valeur={t.satisfaction[i]}
                    desactive={false}
                    onNoter={(v) => changer((x) => void (x.satisfaction = x.satisfaction.map((y, j) => (j === i ? v : y))))}
                  >
                    C{i + 1}. {texte}
                  </Notes>
                ))}
                <label className="block">
                  <span className="block text-[15px] font-bold text-encre mb-1.5">
                    {QUESTION_SERVI} <span className="font-normal text-doux">(facultatif)</span>
                  </span>
                  <textarea
                    value={t.servi}
                    onChange={(e) => changer((x) => void (x.servi = e.target.value), false)}
                    rows={3}
                    className="bp-servi w-full rounded-xl border-2 border-filet bg-white px-3 py-2 text-[16px] text-encre focus:border-violet outline-none"
                  />
                </label>
                <label className="block">
                  <span className="block text-[15px] font-bold text-encre mb-1.5">
                    {QUESTION_AMELIORER} <span className="font-normal text-doux">(facultatif)</span>
                  </span>
                  <textarea
                    value={t.ameliorer}
                    onChange={(e) => changer((x) => void (x.ameliorer = e.target.value), false)}
                    rows={3}
                    className="bp-ameliorer w-full rounded-xl border-2 border-filet bg-white px-3 py-2 text-[16px] text-encre focus:border-violet outline-none"
                  />
                </label>
              </div>
            </Carte>

            {confirmer ? (
              <div className="bp-confirmer-terminer rounded-2xl border-2 border-turquoise bg-white p-3.5">
                <p className="text-[16px] font-bold text-encre leading-snug">Terminer le post-test ? Tu ne pourras plus changer tes réponses.</p>
                <div className="mt-2.5 flex gap-2.5">
                  <button type="button" onClick={terminer} className="bp-terminer-oui flex-1 min-h-[48px] rounded-xl bg-turquoiseTexte text-white font-bold">
                    Terminer
                  </button>
                  <button type="button" onClick={() => setConfirmer(false)} className="flex-1 min-h-[48px] rounded-xl border-2 border-filet text-encre font-bold bg-white">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmer(true)}
                disabled={!complet}
                className="bp-terminer w-full min-h-[52px] rounded-xl bg-turquoiseTexte text-white text-[17px] font-bold px-4 disabled:opacity-50"
              >
                Terminer
              </button>
            )}
            {!complet ? (
              <p className="mt-2 text-[14px] text-doux">{manquantes === 1 ? 'Encore 1 réponse à donner.' : `Encore ${manquantes} réponses à donner.`}</p>
            ) : null}
          </>
        )}
      </FournisseurEtapes>
    </Mise>
  );
}
