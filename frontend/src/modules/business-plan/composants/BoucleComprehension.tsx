// Comprehension loop (fiche ETAPE-02, section 1), data driven: several right boxes, each box carries an
// error code; the first code met (in the order of the fiche) shows its explanation, then the next question
// (or the same one again). Passed when all right; after 2 explanations, passed with the notion "à revoir".
import { useState } from 'react';
import type { Boucle } from '../types';
import { Icone } from './Icones';

export interface CaseBoucle {
  texte: string;
  juste: boolean;
  /** Error code when this box is answered wrongly (right box left empty, or wrong box ticked). */
  code: string;
}

export interface QuestionBoucle {
  enonce: string;
  cases: CaseBoucle[];
}

export interface DonneesBoucle {
  /** Asked in turn; the last one is asked again after an explanation when there is no next question. */
  questions: QuestionBoucle[];
  /** Codes in the order of the fiche: the first one met gives the explanation shown. */
  ordre: string[];
  explications: Record<string, string>;
}

/** First error code of the ticked boxes, in the order of the fiche (null = all right). */
export function premiereErreur(q: QuestionBoucle, cochees: boolean[], ordre: string[]): string | null {
  const codes = new Set(q.cases.filter((c, i) => c.juste !== !!cochees[i]).map((c) => c.code));
  if (!codes.size) return null;
  return ordre.find((c) => codes.has(c)) ?? [...codes][0];
}

export function BoucleComprehension({
  donnees,
  etat,
  onChange,
  lectureSeule
}: {
  donnees: DonneesBoucle;
  etat: Boucle;
  onChange: (b: Boucle) => void;
  lectureSeule?: boolean;
}) {
  const [cochees, setCochees] = useState<boolean[]>([]);
  const [explication, setExplication] = useState<string | null>(null);
  const fini = etat.statut !== '';
  const n = Math.min(etat.explications, donnees.questions.length - 1);
  const q = donnees.questions[n];

  if (lectureSeule || fini) {
    return (
      <div className="bp-boucle rounded-xl border border-filet bg-white p-3.5 mb-4">
        <p className="text-[15px] font-bold text-encre leading-snug mb-2">{donnees.questions[0].enonce}</p>
        <ul className="space-y-1.5 mb-2">
          {donnees.questions[0].cases.map((c) => (
            <li key={c.texte} className={`flex items-start gap-2 text-[15px] leading-snug ${c.juste ? 'text-encre font-bold' : 'text-doux'}`}>
              <span className="shrink-0 mt-0.5">{c.juste ? <Icone nom="coche" /> : <span className="inline-block w-5 text-center">-</span>}</span>
              {c.texte}
            </li>
          ))}
        </ul>
        {lectureSeule ? null : (
          <p role="status" className={`text-[15px] font-bold ${etat.statut === 'reussi' ? 'text-turquoiseTexte' : 'text-alerte'}`}>
            {etat.statut === 'reussi' ? 'Bravo, tu as compris.' : 'Notion à revoir : on la reprendra à la relecture.'}
          </p>
        )}
        {explication ? <p className="bp-explication mt-2 rounded-lg bg-turquoiseClair px-3 py-2 text-[15px] leading-relaxed text-encre">{explication}</p> : null}
      </div>
    );
  }

  const verifier = () => {
    const code = premiereErreur(q, cochees, donnees.ordre);
    if (!code) {
      setExplication(null);
      onChange({ statut: 'reussi', explications: etat.explications });
      return;
    }
    const explications = etat.explications + 1;
    setExplication(donnees.explications[code] ?? null);
    setCochees([]);
    if (explications >= 2) {
      onChange({ statut: 'arevoir', explications });
    } else onChange({ statut: '', explications });
  };

  return (
    <div className="bp-boucle rounded-xl border-2 border-violet bg-white p-3.5 mb-4">
      {explication ? (
        <p role="status" className="bp-explication mb-3 rounded-lg bg-turquoiseClair px-3 py-2 text-[15px] leading-relaxed text-encre">
          {explication}
        </p>
      ) : null}
      <p className="text-[15px] font-bold text-encre leading-snug mb-2">{q.enonce}</p>
      <ul className="space-y-2 mb-3">
        {q.cases.map((c, i) => (
          <li key={c.texte}>
            <label className="flex items-start gap-2.5 min-h-[44px] rounded-lg border border-filet px-3 py-2.5 text-[15px] leading-snug text-encre active:bg-violetClair">
              <input
                type="checkbox"
                className="shrink-0 mt-0.5 w-5 h-5 accent-violet"
                checked={!!cochees[i]}
                onChange={(e) =>
                  setCochees((t) => {
                    const s = [...t];
                    s[i] = e.target.checked;
                    return s;
                  })
                }
              />
              <span>{c.texte}</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" onClick={verifier} className="w-full min-h-[48px] rounded-xl bg-violet text-white font-bold active:opacity-90">
        Vérifier mes réponses
      </button>
    </div>
  );
}
