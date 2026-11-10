// "Et après ?" (workbook page 18): the NEC 2026 calendar (read only) and my three next actions.
import type { AtelierProps, Plan } from '../../types';
import { ChampTexte } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';
import { nouvelId } from '../../etat/vide';
import { CALENDRIER_NEC, NB_ACTIONS } from './calendrier';

type Action = Plan['actions'][number];

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const lignes: Action[] = Array.from({ length: NB_ACTIONS }, (_, i) => plan.actions[i] ?? { id: `vide-${i}`, action: '', quand: '' });
  const changer = (i: number, patch: Partial<Action>) =>
    modifier((p) => {
      while (p.actions.length < NB_ACTIONS) p.actions.push({ id: nouvelId(), action: '', quand: '' });
      Object.assign(p.actions[i], patch);
    });

  return (
    <>
      <Carte titre="Le calendrier NEC 2026" className="bp-calendrier-nec">
        <ol className="divide-y divide-filet">
          {CALENDRIER_NEC.map((c) => (
            <li key={c.date} className="py-2.5 first:pt-0 last:pb-0">
              <p className="text-[15px] font-bold text-violet leading-snug">{c.date}</p>
              <p className="text-[15px] text-encre leading-snug mt-0.5">{c.etape}</p>
            </li>
          ))}
        </ol>
      </Carte>

      <Carte titre="Mes trois prochaines actions">
        {lignes.map((a, i) => (
          // Index key: the first keystroke gives the line its real id, the field must keep the focus.
          <div key={i} className="bp-action rounded-xl border border-filet p-3 mb-3 last:mb-0">
            <ChampTexte label={`Action ${i + 1}`} valeur={a.action} onChange={(v) => changer(i, { action: v })} lectureSeule={ls} />
            <ChampTexte label="Pour quand ?" placeholder="Ex. : 20 novembre 2026" ligne valeur={a.quand} onChange={(v) => changer(i, { quand: v })} lectureSeule={ls} />
          </div>
        ))}
      </Carte>
    </>
  );
}
