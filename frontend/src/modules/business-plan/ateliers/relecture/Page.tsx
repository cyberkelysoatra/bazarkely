// "Relecture en binôme" (workbook page 17): the 10 points, each one Oui or À revoir, with a suggestion
// from the answers when it can be computed, and the question of my partner.
import type { AtelierProps } from '../../types';
import { ChampTexte, Choix } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';
import { Icone } from '../../composants/Icones';
import { POINTS, type Suggestion } from './points';

const OPTIONS = [
  { v: 'oui' as const, t: 'Oui' },
  { v: 'revoir' as const, t: 'À revoir' }
];

function Badge({ s }: { s: Suggestion }) {
  if (!s) return null;
  return s === 'oui' ? (
    <p className="bp-suggestion mt-1 inline-flex items-center gap-1.5 rounded-full bg-turquoiseClair px-3 py-1 text-[13px] font-bold text-turquoiseTexte">
      <Icone nom="coche" className="w-4 h-4" /> D'après vos réponses : oui
    </p>
  ) : (
    <p className="bp-suggestion mt-1 inline-flex items-center gap-1.5 rounded-full bg-violetClair px-3 py-1 text-[13px] font-bold text-violet">
      <Icone nom="info" className="w-4 h-4" /> D'après vos réponses : à vérifier
    </p>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  return (
    <>
      <Carte ton="violet" titre="Relecture en binôme">
        <p className="text-[16px] leading-relaxed text-encre">
          Échangez votre téléphone avec votre voisin. Il coche ce qui est clair et vous pose une question sur ce qui ne l'est pas.
        </p>
      </Carte>

      <ol className="space-y-3 mb-4">
        {POINTS.map((pt, i) => (
          <li key={pt.id} className="bp-point rounded-2xl border border-filet bg-white p-3.5 [&_fieldset]:mb-0" data-point={pt.id}>
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-violet text-white font-bold text-[15px] flex items-center justify-center">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <Choix
                  label={pt.texte}
                  options={OPTIONS}
                  valeur={plan.relecture.points[pt.id] ?? ''}
                  onChange={(v) =>
                    modifier((p) => {
                      p.relecture.points[pt.id] = v;
                    })
                  }
                  lectureSeule={ls}
                  aide={<Badge s={pt.suggestion(plan)} />}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <Carte titre="La question de mon binôme">
        <ChampTexte
          label="Ce qui n'est pas clair pour lui"
          valeur={plan.relecture.questionBinome}
          onChange={(v) =>
            modifier((p) => {
              p.relecture.questionBinome = v;
            })
          }
          lectureSeule={ls}
        />
      </Carte>
    </>
  );
}
