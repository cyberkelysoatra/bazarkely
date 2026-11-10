// Module 2 "Le Business Model Canvas" (workbook pages 6 and 7): version date, the 9 blocks in filling
// order with the JUS'NOSY example of each, and the overview "Voir mon canvas".
import { useCallback, useId, useState } from 'react';
import type { AtelierProps, Plan } from '../../types';
import { ChampTexte } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';
import { Icone } from '../../composants/Icones';
import { Aide } from '../../composants/Aide';
import { BLOCS, aujourdhuiMadagascar, jourFr, type Bloc } from './blocs';
import { Canvas } from './Canvas';

/** Canvas outline (5 columns on top, 2 at the bottom), drawn like the icons of composants/Icones. */
function IconeCanvas() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="M2.5 15h19M12 15v5M6.3 4v11M10 4v11M14 4v11M17.7 4v11M6.3 9.5H10M14 9.5h3.7" />
    </svg>
  );
}

function CarteBloc({ bloc, valeur, onChange, lectureSeule }: { bloc: Bloc; valeur: string; onChange: (v: string) => void; lectureSeule: boolean }) {
  const [exemple, setExemple] = useState(false);
  const id = useId();
  return (
    <section className="bp-bloc rounded-2xl border border-filet bg-white p-4 mb-4" data-bloc={bloc.n}>
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-9 h-9 rounded-full bg-violet text-white font-bold text-[17px] flex items-center justify-center">{bloc.n}</span>
        <h2 className="min-w-0 text-[19px] font-bold text-violet leading-tight break-words">{bloc.titre}</h2>
      </div>
      <div className="mt-3">
        <ChampTexte label={bloc.question} mention="Une idée par ligne, en quelques mots." valeur={valeur} onChange={onChange} lectureSeule={lectureSeule} />
      </div>
      {valeur.trim() ? null : <p className="bp-bloc-vide -mt-2 mb-3 text-[14px] text-doux italic leading-snug">Un bloc vide est une question à travailler, pas un détail.</p>}
      <button
        type="button"
        aria-expanded={exemple}
        aria-controls={id}
        onClick={() => setExemple((e) => !e)}
        className="min-h-[44px] -ml-1 px-1 flex items-center gap-1.5 text-turquoiseTexte font-bold text-[15px]"
      >
        <Icone nom="info" />
        {exemple ? "Masquer l'exemple" : "Voir l'exemple"}
      </button>
      {exemple ? (
        <p id={id} className="rounded-xl bg-turquoiseClair px-3.5 py-3 text-[15px] leading-relaxed text-encre">
          <span className="font-bold">JUS'NOSY : </span>
          {bloc.exemple}
        </p>
      ) : null}
    </section>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const m2 = plan.m2;
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  const idDate = useId();
  // "Version du" defaults to today (Madagascar): kept in the plan with the first change of the canvas.
  const set = (recette: (m: Plan['m2']) => void) =>
    modifier((p) => {
      recette(p.m2);
      if (!p.m2.versionDu) p.m2.versionDu = aujourdhuiMadagascar();
    });
  const version = m2.versionDu || aujourdhuiMadagascar();

  return (
    <>
      <Carte ton="violet" titre="Le Business Model Canvas">
        <p className="text-[16px] leading-relaxed text-encre">
          Le Business Model Canvas montre sur une seule page comment votre projet crée de la valeur et gagne de l'argent. Il compte 9 blocs. On le remplit dans l'ordre : d'abord le
          client et la valeur, ensuite l'organisation, enfin l'argent.
        </p>
      </Carte>

      <Aide titre="À retenir">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Une idée par post-it ou par ligne, en quelques mots.</li>
          <li>Chaque segment de clients doit avoir sa proposition de valeur et sa source de revenus.</li>
          <li>Si un bloc reste vide, c'est une question à travailler, pas un détail.</li>
        </ul>
      </Aide>

      <div className="mb-4">
        <label htmlFor={idDate} className="block text-[15px] font-bold text-encre leading-snug">
          Version du
        </label>
        {ls ? (
          <p className="mt-1 text-base text-encre">{jourFr(version)}</p>
        ) : (
          <input
            id={idDate}
            type="date"
            className="bp-champ bp-version mt-1.5"
            value={version}
            onChange={(e) => {
              const v = e.target.value;
              modifier((p) => {
                p.m2.versionDu = v;
              });
            }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="bp-voir-canvas w-full min-h-[52px] mb-4 rounded-xl bg-violet text-white text-[17px] font-bold flex items-center justify-center gap-2 active:opacity-90"
      >
        <IconeCanvas /> Voir mon canvas
      </button>

      {BLOCS.map((b) => (
        <CarteBloc key={b.cle} bloc={b} valeur={m2[b.cle]} onChange={(v) => set((m) => void (m[b.cle] = v))} lectureSeule={ls} />
      ))}

      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="w-full min-h-[52px] rounded-xl border-2 border-violet text-violet text-[17px] font-bold flex items-center justify-center gap-2 active:bg-violetClair"
      >
        <IconeCanvas /> Voir mon canvas
      </button>

      {ouvert ? <Canvas plan={plan} fermer={fermer} /> : null}
    </>
  );
}
