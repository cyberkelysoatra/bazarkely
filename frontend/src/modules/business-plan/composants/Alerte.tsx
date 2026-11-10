// Red alert of the workbook: icon + plain French text.
import { Icone } from './Icones';

export function Alerte({ texte }: { texte: string }) {
  return (
    <div role="alert" className="bp-alerte flex items-start gap-2.5 rounded-xl border-2 border-alerte bg-white px-3 py-2.5 mb-3">
      <span className="text-alerte shrink-0 mt-0.5">
        <Icone nom="alerte" titre="Attention" />
      </span>
      <p className="text-[15px] leading-snug text-encre">{texte}</p>
    </div>
  );
}
