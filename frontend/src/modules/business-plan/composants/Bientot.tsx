// Placeholder of a section built in a later phase: fill the paper workbook meanwhile.
import { Carte } from './Carte';
import { Icone } from './Icones';

export function Bientot({ page }: { page: number }) {
  return (
    <Carte ton="violet">
      <div className="flex items-start gap-3">
        <span className="text-violet shrink-0 mt-0.5">
          <Icone nom="livre" className="w-7 h-7" />
        </span>
        <p className="text-[17px] leading-snug text-encre">
          Bientôt dans l'app : remplissez la page {page} du cahier papier
        </p>
      </div>
    </Carte>
  );
}
