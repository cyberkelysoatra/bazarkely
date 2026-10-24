// Votes of the sheet (« − n + », PUDI-CC-17) and "Marquer urgent 2026-2030 / Retirer", with the
// blocking messages of the choice rules (13th vote, 11th urgent).
import { useState } from 'react';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { usePudi } from '../PudiContexte';
import { ajouterVoix, basculerUrgent, ecartPudi, peutAjouterVoix, peutAjouterUrgent, retirerVoix, voixPour } from '../utils/regles';
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
  const urgent = (id: string) => {
    if (!brouillon.urgents.includes(id) && !peutAjouterUrgent(brouillon, id)) {
      setMessage({ id, texte: fr.choix.maxUrgents });
      return;
    }
    setMessage(null);
    majBrouillon(basculerUrgent(brouillon, id));
  };
  return { brouillon, ajouter, retirer, urgent, message };
}

export function MessageBlocage({ texte }: { texte: string }) {
  return (
    <p role="alert" className="mt-2 flex gap-2 items-start text-[0.875rem] text-[#9C3F21] font-bold">
      <Icone nom="alerte" className="w-4 h-4 mt-0.5" />
      {texte}
    </p>
  );
}

/** `tranche` undefined = proposal outside the PUDi: no « vous avancez ce projet » note. */
export function BoutonsChoix({ id, titre, tranche, desactive = false }: { id: string; titre: string; tranche?: string; desactive?: boolean }) {
  const { brouillon, ajouter, retirer, urgent, message } = useBasculeChoix();
  const n = voixPour(brouillon, id);
  const estU = brouillon.urgents.includes(id);
  const base =
    'w-full min-h-[48px] px-4 rounded-xl font-bold text-[0.9375rem] inline-flex items-center justify-center gap-2 border-2 disabled:opacity-50';
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
      <button
        type="button"
        disabled={desactive}
        aria-pressed={estU}
        onClick={() => urgent(id)}
        className={`${base} ${estU ? 'bg-[#B85317] border-[#B85317] text-white' : 'bg-white border-[#B85317] text-[#9C3F21]'}`}
      >
        <Icone nom={estU ? 'croix' : 'horloge'} />
        {estU ? fr.programme.retirerUrgent : fr.programme.marquerUrgent}
      </button>
      {estU && tranche && ecartPudi(tranche) && <p className="text-[0.875rem] text-gris">{fr.choix.avance}</p>}
      {message?.id === id && <MessageBlocage texte={message.texte} />}
    </div>
  );
}
