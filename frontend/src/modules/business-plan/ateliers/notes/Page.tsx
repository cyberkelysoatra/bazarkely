// Mes notes: one free text.
import type { AtelierProps } from '../../types';
import { ChampTexte } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';

export default function Page({ plan, modifier, lectureSeule }: AtelierProps) {
  return (
    <Carte>
      <ChampTexte
        label="Mes notes"
        placeholder="Idées, contacts, prix entendus, questions pour les formateurs..."
        valeur={plan.notes}
        onChange={(v) =>
          modifier((p) => {
            p.notes = v;
          })
        }
        lectureSeule={lectureSeule}
      />
    </Carte>
  );
}
