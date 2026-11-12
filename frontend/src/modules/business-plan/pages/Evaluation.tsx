// /plan/formateur/evaluation (NEC-CC-22, lot 2 story NEC-96): results of the pre-test and post-test of the
// session, rates per question, satisfaction, comments and the B-lossom indicators, with a plain text copy.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Patience, RenvoiAccueil } from '../composants/GardeFormateur';
import { Mise } from '../composants/Mise';
import { Carte } from '../composants/Carte';
import { Icone } from '../composants/Icones';
import { codeMemorise } from '../sync';
import { lireEvaluation } from '../sync/formateur';
import { QUESTIONS } from '../utils/pretest';
import { evaluer, nombreFr, texteGain, texteIndicateurs, type Evaluation as TEvaluation, type Resultats } from '../utils/posttest';

type Etat = { statut: 'chargement' } | { statut: 'refuse' } | { statut: 'erreur' } | { statut: 'ok'; e: TEvaluation };

function v(x: number | null): string {
  return x === null ? '' : nombreFr(x);
}
function gain(x: number | null): string {
  return x === null ? 'non calc.' : texteGain(Math.round(x * 100) / 100).replace('.', ',');
}

/** Table inside its own horizontal scroll box: the page itself never scrolls sideways. */
function Defilant({ children, etiquette }: { children: ReactNode; etiquette: string }) {
  return (
    <div className="bp-defilant -mx-1 overflow-x-auto overscroll-x-contain" role="region" aria-label={etiquette} tabIndex={0}>
      {children}
    </div>
  );
}

function Cellules({ r }: { r: Resultats }) {
  const c = 'py-2 px-2 text-center tabular-nums whitespace-nowrap';
  return (
    <>
      <td className={c}>{v(r.aPre) || '-'}</td>
      <td className={c}>{v(r.aPost) || '-'}</td>
      <td className={`${c} font-bold ${r.gainA === null ? 'text-doux font-normal' : 'text-turquoiseTexte'}`}>{gain(r.gainA)}</td>
      <td className={c}>{v(r.bPre) || '-'}</td>
      <td className={c}>{v(r.bPost) || '-'}</td>
      <td className={`${c} font-bold ${r.gainB === null ? 'text-doux font-normal' : 'text-turquoiseTexte'}`}>{gain(r.gainB)}</td>
    </>
  );
}

function Indicateur({ titre, valeur, detail }: { titre: string; valeur: string; detail?: string }) {
  return (
    <div className="bp-indicateur rounded-xl bg-white border border-filet p-3">
      <p className="text-[13px] text-doux leading-snug">{titre}</p>
      <p className="text-[20px] font-bold text-violet leading-tight tabular-nums">{valeur}</p>
      {detail ? <p className="text-[13px] text-encre leading-snug">{detail}</p> : null}
    </div>
  );
}

export default function Evaluation() {
  const code = (codeMemorise() || 'NEC2026').toUpperCase();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const [copie, setCopie] = useState<'' | 'ok' | 'echec'>('');

  const charger = useCallback(async () => {
    const r = await lireEvaluation(code);
    if (r.statut === 'ok') setEtat({ statut: 'ok', e: evaluer(r.valeur ?? []) });
    else setEtat((avant) => (r.statut === 'refuse' ? { statut: 'refuse' } : avant.statut === 'ok' ? avant : { statut: 'erreur' }));
  }, [code]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const retour = { vers: '/formateur', texte: 'Participants' };
  if (etat.statut === 'chargement') return <Patience />;
  if (etat.statut === 'refuse') return <RenvoiAccueil />;
  if (etat.statut === 'erreur') {
    return (
      <Mise titre="Évaluation" retour={retour}>
        <p className="text-[16px] text-encre">Connexion impossible pour le moment.</p>
        <button type="button" onClick={() => void charger()} className="mt-4 w-full min-h-[48px] rounded-xl bg-violet text-white font-bold">
          Réessayer
        </button>
      </Mise>
    );
  }

  const e = etat.e;
  const i = e.indicateurs;
  const copier = async () => {
    const texte = texteIndicateurs(e, code);
    try {
      await navigator.clipboard.writeText(texte);
      setCopie('ok');
    } catch {
      setCopie('echec');
    }
  };
  const th = 'py-2 px-2 text-[12px] font-normal text-doux whitespace-nowrap';

  return (
    <Mise titre="Évaluation" sousTitre={`Session ${code} : ${i.participants} participant${i.participants > 1 ? 's' : ''}`} retour={retour}>
      <div className="bp-evaluation" data-participants={i.participants}>
        <div className="flex justify-end mb-3">
          <button type="button" onClick={() => void charger()} className="min-h-[40px] px-3 rounded-xl border-2 border-filet text-violet font-bold text-[14px]">
            Actualiser
          </button>
        </div>

        <Carte titre="Indicateurs B-lossom" ton="violet">
          <div className="grid grid-cols-2 gap-2">
            <Indicateur titre="Connaissances (sur 15)" valeur={`${nombreFr(i.moyenneAPre)} → ${nombreFr(i.moyenneAPost)}`} detail="avant, après" />
            <Indicateur titre="Je sais... (sur 24)" valeur={`${nombreFr(i.moyenneBPre)} → ${nombreFr(i.moyenneBPost)}`} detail="avant, après" />
            <Indicateur titre="Participants qui progressent" valeur={`${i.progressent} sur ${i.calculables}`} detail={`gain en « Je sais » : ${i.progressentB}`} />
            <Indicateur titre="Satisfaction (sur 4)" valeur={nombreFr(i.satisfaction)} />
            <Indicateur titre="Business plans complets" valeur={`${i.complets} sur ${i.participants}`} />
            <Indicateur titre="Tests reçus" valeur={`${i.pretests} + ${i.posttests}`} detail="pré-tests + post-tests" />
          </div>
          <button
            type="button"
            onClick={() => void copier()}
            className="bp-copier-whatsapp mt-3 w-full min-h-[48px] rounded-xl bg-violet text-white font-bold flex items-center justify-center gap-2"
          >
            <Icone nom="whatsapp" /> Copier pour WhatsApp
          </button>
          {copie ? (
            <p role="status" className={`bp-copie mt-2 text-[14px] font-bold ${copie === 'ok' ? 'text-turquoiseTexte' : 'text-alerte'}`}>
              {copie === 'ok' ? 'Texte copié.' : 'Copie impossible sur cet appareil.'}
            </p>
          ) : null}
        </Carte>

        <Carte titre="Résultats par participant" sousTitre="A : questions sur 15. B : je sais..., sur 24.">
          <Defilant etiquette="Tableau des résultats">
            <table className="bp-table-evaluation min-w-[520px] w-full border-collapse text-[14px] text-encre">
              <thead>
                <tr className="border-b border-filet">
                  <th scope="col" className={`${th} text-left sticky left-0 bg-white`}>
                    Participant
                  </th>
                  <th scope="col" className={th}>A pré</th>
                  <th scope="col" className={th}>A post</th>
                  <th scope="col" className={th}>Gain A</th>
                  <th scope="col" className={th}>B pré</th>
                  <th scope="col" className={th}>B post</th>
                  <th scope="col" className={th}>Gain B</th>
                </tr>
              </thead>
              <tbody>
                {e.lignes.map((l) => (
                  <tr key={l.planId} className="bp-ligne-evaluation border-b border-filet" data-plan={l.planId}>
                    <th scope="row" className="py-2 pr-2 text-left font-bold sticky left-0 bg-white max-w-[140px] truncate">
                      {l.prenom || 'Sans prénom'}
                    </th>
                    <Cellules r={l} />
                  </tr>
                ))}
                <tr className="bp-ligne-moyenne bg-violetClair">
                  <th scope="row" className="py-2 pr-2 text-left font-bold sticky left-0 bg-violetClair">
                    Moyenne
                  </th>
                  <Cellules r={e.moyenne} />
                </tr>
              </tbody>
            </table>
          </Defilant>
          <p className="mt-2 text-[13px] text-doux leading-snug">Sans pré-test, le gain n'est pas calculable et n'entre pas dans la moyenne des gains.</p>
        </Carte>

        <Carte titre="Bonnes réponses par question" sousTitre="Pour repérer les notions mal passées.">
          <Defilant etiquette="Taux par question">
            <table className="bp-table-taux min-w-[320px] w-full border-collapse text-[14px] text-encre">
              <thead>
                <tr className="border-b border-filet">
                  <th scope="col" className={`${th} text-left`}>Question</th>
                  <th scope="col" className={th}>Avant</th>
                  <th scope="col" className={th}>Après</th>
                </tr>
              </thead>
              <tbody>
                {e.taux.map((t) => (
                  <tr key={t.n} className="bp-ligne-taux border-b border-filet" data-question={t.n}>
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal max-w-[200px] truncate" title={QUESTIONS[t.n - 1].texte}>
                      <b>{t.n}.</b> {QUESTIONS[t.n - 1].texte}
                    </th>
                    <td className="py-1.5 px-2 text-center tabular-nums whitespace-nowrap">{t.avant === null ? '-' : `${nombreFr(t.avant)} %`}</td>
                    <td className="py-1.5 px-2 text-center tabular-nums whitespace-nowrap font-bold">{t.apres === null ? '-' : `${nombreFr(t.apres)} %`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Defilant>
        </Carte>

        <Carte titre="Satisfaction" sousTitre="Moyenne sur 4 (1 = pas du tout, 4 = tout à fait).">
          <ul className="space-y-1.5">
            {e.satisfaction.map((s) => (
              <li key={s.texte} className="bp-satisfaction flex items-start justify-between gap-3 text-[14px] text-encre leading-snug">
                <span className="min-w-0">{s.texte}</span>
                <b className="shrink-0 tabular-nums">{s.moyenne === null ? '-' : nombreFr(s.moyenne)}</b>
              </li>
            ))}
            <li className="bp-satisfaction-generale flex items-start justify-between gap-3 border-t border-filet pt-1.5 text-[15px] font-bold text-violet">
              <span>Satisfaction générale</span>
              <span className="tabular-nums">{e.satisfactionGenerale === null ? '-' : nombreFr(e.satisfactionGenerale)}</span>
            </li>
          </ul>
        </Carte>

        <Carte titre="Commentaires">
          {e.commentaires.length === 0 ? (
            <p className="text-[14px] text-doux">Pas encore de commentaire.</p>
          ) : (
            <ul className="space-y-3">
              {e.commentaires.map((c, k) => (
                <li key={k} className="bp-commentaire rounded-xl border border-filet bg-white p-3 text-[14px] text-encre leading-snug">
                  <p className="font-bold">{c.prenom}</p>
                  {c.servi ? (
                    <p className="mt-1 break-words">
                      <span className="text-doux">Ce qui m'a le plus servi : </span>
                      {c.servi}
                    </p>
                  ) : null}
                  {c.ameliorer ? (
                    <p className="mt-1 break-words">
                      <span className="text-doux">Ce qu'il faudrait améliorer : </span>
                      {c.ameliorer}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Carte>
      </div>
    </Mise>
  );
}
