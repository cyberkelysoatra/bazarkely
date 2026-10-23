// Card of a programme or proposal in the voting path (specification v8, 4.3 bis): tapping the
// card checks or unchecks it (same rules as the box: 3 priorities, 10 urgents), the separate
// « Détails » link opens the sheet without changing the choice. For screen readers the card is a
// checkbox labelled by its title and « Détails » a link of its own (siblings, never nested).
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { fr } from '../i18n/fr';
import { MessageBlocage, useBasculeChoix } from './BoutonsChoix';
import { Icone } from './Icones';

/** Coming back from the sheet uses the history (same scroll position, same checks). */
export const ETAT_DEPUIS_LISTE = { depuisListe: true } as const;

export function CarteChoix({
  id,
  titre,
  details,
  mode = 'priorite',
  desactive = false,
  className = '',
  style,
  children
}: {
  id: string;
  titre: string;
  details: string;
  mode?: 'priorite' | 'urgent';
  desactive?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const { brouillon, priorite, urgent, message } = useBasculeChoix();
  const actif = (mode === 'priorite' ? brouillon.priorites : brouillon.urgents).includes(id);
  const basculer = () => {
    if (desactive) return;
    (mode === 'priorite' ? priorite : urgent)(id);
  };
  const clavier = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      basculer();
    }
  };
  const couleur = mode === 'priorite' ? 'bg-marine border-marine' : 'bg-[#B85317] border-[#B85317]';
  return (
    <li className="relative" data-carte-choix={id}>
      <div
        role="checkbox"
        aria-checked={actif}
        aria-disabled={desactive || undefined}
        aria-label={titre}
        tabIndex={0}
        onClick={basculer}
        onKeyDown={clavier}
        className={`pudi-focus min-h-[44px] rounded-xl p-3 pb-12 flex gap-3 items-start select-none ${
          desactive ? 'cursor-default' : 'cursor-pointer'
        } ${className} ${actif ? '!border-marine shadow-md' : ''}`}
        style={style}
      >
        <span
          aria-hidden="true"
          className={`shrink-0 w-8 h-8 mt-0.5 rounded-lg border-2 flex items-center justify-center ${
            actif ? `${couleur} text-white` : 'bg-white border-[#9AA3BD] text-transparent'
          } ${desactive ? 'opacity-50' : ''}`}
        >
          <Icone nom="coche" className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      <Link
        to={details}
        state={ETAT_DEPUIS_LISTE}
        className="absolute right-1.5 bottom-1.5 min-h-[44px] min-w-[44px] px-3 rounded-lg inline-flex items-center justify-center gap-1 text-marine font-bold text-[14px] underline underline-offset-2 decoration-[#9AA3BD]"
        aria-label={`${fr.carte.details} : ${titre}`}
        data-details=""
      >
        {fr.carte.details}
        <Icone nom="droite" className="w-4 h-4" />
      </Link>
      {message?.id === id && <MessageBlocage texte={message.texte} />}
    </li>
  );
}
