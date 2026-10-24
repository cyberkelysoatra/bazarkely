// Votes of the sheet (« − n + », PUDI-CC-17) with the blocking message of the 13th vote.
// PUDI-CC-18: no more « Marquer urgent » (urgency is read from the votes ranking).
import { useState } from 'react';
import { frPages } from '../i18n/frPages';
import { usePudi } from '../PudiContexte';
import { ajouterVoix, peutAjouterVoix, retirerVoix, voixPour } from '../utils/regles';
import { Icone } from './Icones';
import { CompteurVoix } from './Voix';

export function useBasculeChoix() {
  const { brouillon, majBrouillon } = usePudi();
  const [message, setMessage] = useState<{ id: string; texte: string } | null>(null);
  /** One more vote (the 13th is refused with a message). */
  const ajouter = (id: string) => {
    if (!peutAjouterVoix(brouillon)) {
      setMessage({ id, texte: frPages.voix.plein });
      return;
    }
    setMessage(null);
    majBrouillon(ajouterVoix(brouillon, id));
  };
  const retirer = (id: string) => {
    setMessage(null);
    majBrouillon(retirerVoix(brouillon, id));
  };
  return { brouillon, ajouter, retirer, message };
}

export function MessageBlocage({ texte }: { texte: string }) {
  return (
    <p role="alert" className="mt-2 flex gap-2 items-start text-[0.875rem] text-[#9C3F21] font-bold">
      <Icone nom="alerte" className="w-4 h-4 mt-0.5" />
      {texte}
    </p>
  );
}

/** `tranche` is kept in the props for the callers (sheet of a programme or of a proposal). */
export function BoutonsChoix({ id, titre, desactive = false }: { id: string; titre: string; tranche?: string; desactive?: boolean }) {
  const { brouillon, ajouter, retirer, message } = useBasculeChoix();
  const n = voixPour(brouillon, id);
  return (
    <div className="space-y-2">
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 ${n ? 'border-marine bg-[#EAF0FF]' : 'border-filet bg-white'}`}
        data-voix-fiche={n}
      >
        <span className="font-bold text-[0.9375rem] text-marine">
          {frPages.voix.mesVoixFiche}
          <span className="block text-[0.8125rem] font-normal text-gris">{frPages.voix.compteur(brouillon.priorites.length)}</span>
        </span>
        <CompteurVoix titre={titre} n={n} ajouter={() => ajouter(id)} retirer={() => retirer(id)} desactive={desactive} grand />
      </div>
      {message?.id === id && <MessageBlocage texte={message.texte} />}
    </div>
  );
}
