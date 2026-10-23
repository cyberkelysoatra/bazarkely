// Step indicator at the top of the voting path: « 1 Choisir · 2 Se connecter · 3 Envoyer ».
// Current step highlighted, steps done checked.
import { fr } from '../i18n/fr';
import { Icone } from './Icones';

export function IndicateurEtapes({ courante, faites }: { courante: 1 | 2 | 3 | null; faites: number[] }) {
  return (
    <ol aria-label={fr.vote.etapesLibelle} className="mb-3 flex items-center gap-1 text-[13px] min-[360px]:text-[14px]" data-etapes="">
      {fr.vote.etapes.map((libelle, i) => {
        const n = i + 1;
        const fait = faites.includes(n) && n !== courante;
        const actif = n === courante;
        return (
          <li
            key={libelle}
            aria-current={actif ? 'step' : undefined}
            data-etape-n={n}
            data-etat={actif ? 'courante' : fait ? 'faite' : 'a-venir'}
            className="flex items-center gap-1 min-w-0"
          >
            {i > 0 && <span aria-hidden="true" className="text-gris px-0.5">·</span>}
            <span
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold ${
                actif ? 'bg-marine text-white' : fait ? 'bg-[#1E7A46] text-white' : 'bg-white border border-filet text-gris'
              }`}
            >
              {fait ? <Icone nom="coche" className="w-4 h-4" /> : n}
            </span>
            <span className={`whitespace-nowrap ${actif ? 'font-bold text-marine' : fait ? 'text-[#1E7A46] font-bold' : 'text-gris'}`}>
              {libelle}
              {fait && <span className="sr-only"> (fait)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
