// /plan/p/:id/pretest (NEC-CC-16): the paper pre-test typed again (15 questions, part B), then
// "Ton parcours": a level per module with the explanations of the missed questions. Not a section of
// RUBRIQUES (global progress unchanged). Every tap is saved at once (offline too); an example is read only.
import { useRef, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AutoPretest, Plan, Pretest as TPretest, ReponsePretest } from '../types';
import { usePlan } from '../etat/usePlan';
import { Mise } from '../composants/Mise';
import { Carte } from '../composants/Carte';
import { Aide } from '../composants/Aide';
import { Icone } from '../composants/Icones';
import { FournisseurEtapes } from '../composants/SuivantPrecedent';
import { Gras, NIVEAUX } from '../ateliers/m5/niveaux';
import { AUTO, ECART, ECHELLE, NOM_NIVEAU, PRETEST_PAPIER, QUESTIONS, calculerParcours, pretestComplet, pretestDe, reponse, type Lettre } from '../utils/pretest';
import { Introuvable } from './Introuvable';

const LETTRES: Lettre[] = ['a', 'b', 'c', 'd'];

function Choix({ nom, coche, desactive, onChoisir, children }: { nom: string; coche: boolean; desactive: boolean; onChoisir: () => void; children: ReactNode }) {
  return (
    <label
      className={`flex items-start gap-2.5 rounded-xl border-2 px-3 py-2.5 min-h-[44px] text-[15px] leading-snug ${coche ? 'border-violet bg-violetClair text-encre font-bold' : 'border-filet bg-white text-encre'} ${desactive ? 'opacity-80' : 'active:bg-violetClair'}`}
    >
      <input type="radio" name={nom} checked={coche} disabled={desactive} onChange={onChoisir} className="mt-0.5 w-5 h-5 shrink-0 accent-violet" />
      <span className="min-w-0 break-words">{children}</span>
    </label>
  );
}

/** "Ton parcours": score, then one line per module (level, link, explanations, self-assessment gap). */
export function CarteParcours({ planId, pretest }: { planId: string; pretest: TPretest }) {
  const parcours = calculerParcours(pretest);
  return (
    <Carte titre="Ton parcours" ton="violet" id="bp-parcours" className="bp-parcours">
      <p className="text-[17px] font-bold text-encre mb-3">Pré-test : {parcours.score}/15</p>
      <ol className="space-y-3">
        {parcours.lignes.map((l) => {
          const niveau = NIVEAUX.find((n) => n.v === l.niveau);
          return (
            <li key={l.id} className="bp-parcours-ligne rounded-xl bg-white border border-filet p-3" data-niveau={l.niveau}>
              <Link to={`/p/${planId}/${l.chemin}`} className="flex items-center gap-2 min-h-[44px] text-[16px] font-bold text-violet underline-offset-2 active:underline">
                <span className="min-w-0 flex-1 break-words">{l.titre}</span>
                <Icone nom="chevron" />
              </Link>
              <p className="text-[15px] text-encre leading-snug">
                <b>{NOM_NIVEAU[l.niveau]}</b> (« {niveau?.t} »){l.parAuto ? ", d'après ton auto-évaluation" : ''}
              </p>
              {l.ecart ? <p className="bp-ecart mt-2 rounded-lg bg-white border-2 border-alerte px-3 py-2 text-[14px] leading-snug text-encre">{ECART}</p> : null}
              {l.explications.length ? (
                <ul className="mt-2 space-y-1.5">
                  {l.explications.map((t) => (
                    <li key={t} className="bp-explication text-[14px] leading-snug text-encre pl-3 border-l-4 border-turquoise">
                      <Gras texte={t} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Carte>
  );
}

export default function Pretest() {
  const { id } = useParams();
  const { etat, modifier, sauverMaintenant } = usePlan(id);
  const refParcours = useRef<HTMLDivElement>(null);
  if (etat.statut === 'absent') return <Introuvable />;
  if (etat.statut === 'chargement') return <Mise titre="Mon pré-test">{null}</Mise>;
  const plan = etat.plan;
  const ls = !!plan.exemple;
  const pretest = pretestDe(plan);
  const complet = pretestComplet(pretest);
  const manquantes = QUESTIONS.filter((q) => reponse(pretest, q.n) === '').length;

  /** Each tap saved at once (no 400 ms wait). */
  const changer = (recette: (t: TPretest, p: Plan) => void) => {
    if (ls) return;
    modifier((p) => {
      const t = pretestDe(p);
      recette(t, p);
      p.pretest = t;
    });
    void sauverMaintenant();
  };
  const repondre = (n: number, r: ReponsePretest) =>
    changer((t) => {
      t.reponses = { ...t.reponses, [n]: r };
    });
  const evaluer = (i: number, v: AutoPretest) =>
    changer((t) => {
      t.auto = t.auto.map((x, j) => (j === i ? v : x));
    });
  const valider = () => {
    changer((t, p) => {
      t.valideLe = new Date().toISOString();
      // Updated on the phone: the participant's own pre-test from now on (NEC-CC-20).
      t.source = 'app';
      // Module 5 opens at the computed level (still changeable there, NEC-CC-15).
      p.niveauChiffres = calculerParcours(t).lignes.find((l) => l.id === 'm5')?.niveau ?? 'cible';
    });
    window.setTimeout(() => refParcours.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <Mise titre="Mon pré-test" sousTitre={plan.identite.nomProjet.trim() || 'Projet sans nom'} retour={{ vers: `/p/${plan.id}`, texte: 'Sommaire' }} plan={plan}>
      <FournisseurEtapes planId={plan.id} chemin="pretest">
        <Aide titre="À quoi sert ce test ?">
          Ce test ne compte pas. Si tu ne sais pas, coche Je ne sais pas : c'est une réponse honnête et utile, l'app t'expliquera les bases.
        </Aide>
        {ls ? <p className="mb-3 rounded-xl bg-violetClair px-3.5 py-2.5 text-[14px] font-bold text-violet">Exemple : le pré-test se consulte, rien n'est enregistré.</p> : null}

        <Carte titre="Partie A : 15 questions" sousTitre="Une seule réponse par question.">
          <div className="space-y-5">
            {QUESTIONS.map((q) => {
              const r = reponse(pretest, q.n);
              return (
                <fieldset key={q.n} className="bp-question" data-question={q.n}>
                  <legend className="text-[16px] font-bold text-encre leading-snug mb-2">
                    {q.n}. {q.texte}
                  </legend>
                  <div className="space-y-1.5">
                    {LETTRES.map((x) => (
                      <Choix key={x} nom={`q${q.n}`} coche={r === x} desactive={ls} onChoisir={() => repondre(q.n, x)}>
                        {x}) {q.choix[x]}
                      </Choix>
                    ))}
                    <Choix nom={`q${q.n}`} coche={r === 'jnsp'} desactive={ls} onChoisir={() => repondre(q.n, 'jnsp')}>
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
              <fieldset key={i} className="bp-auto" data-auto={i + 1}>
                <legend className="text-[15px] font-bold text-encre leading-snug mb-2">
                  B{i + 1}. Je sais {texte}
                </legend>
                <div className="grid grid-cols-4 gap-1.5">
                  {ECHELLE.map((e) => {
                    const coche = pretest.auto[i] === e.v;
                    return (
                      <label
                        key={e.v}
                        title={e.t}
                        className={`flex flex-col items-center justify-center rounded-xl border-2 min-h-[52px] px-1 py-1 text-center ${coche ? 'border-violet bg-violet text-white' : 'border-filet bg-white text-encre'}`}
                      >
                        <input type="radio" name={`b${i + 1}`} checked={coche} disabled={ls} onChange={() => evaluer(i, e.v)} className="sr-only" />
                        <span className="text-[17px] font-bold leading-none">{e.v}</span>
                        <span className={`text-[11px] leading-tight mt-0.5 ${coche ? 'text-white' : 'text-doux'}`}>{e.t}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </Carte>

        <button
          type="button"
          onClick={valider}
          disabled={!complet || ls}
          className="bp-voir-parcours w-full min-h-[52px] rounded-xl bg-turquoiseTexte text-white text-[17px] font-bold px-4 disabled:opacity-50"
        >
          {pretest.valideLe ? 'Mettre à jour mon parcours' : 'Voir mon parcours'}
        </button>
        {!complet ? (
          <p className="mt-2 text-[14px] text-doux">
            {manquantes === 1 ? 'Encore 1 question sans réponse.' : `Encore ${manquantes} questions sans réponse.`}
          </p>
        ) : null}

        <div ref={refParcours} className="mt-4 scroll-mt-20">
          {pretest.valideLe && pretest.source === 'formateur' ? (
            <p className="bp-pretest-papier mb-3 rounded-xl bg-violetClair px-3.5 py-2.5 text-[15px] font-bold text-violet">{PRETEST_PAPIER}</p>
          ) : null}
          {pretest.valideLe ? <CarteParcours planId={plan.id} pretest={pretest} /> : null}
        </div>
      </FournisseurEtapes>
    </Mise>
  );
}
