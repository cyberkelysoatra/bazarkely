// "Ajouter à mes 3 priorités / Retirer" and "Marquer urgent 2026-2030 / Retirer", with the
// blocking messages of the choice rules (4th priority, 11th urgent).
import { useState } from 'react';
import { fr } from '../i18n/fr';
import { usePudi } from '../PudiContexte';
import { basculerPriorite, basculerUrgent, ecartPudi, peutAjouterPriorite, peutAjouterUrgent } from '../utils/regles';
import { Icone } from './Icones';

export function useBasculeChoix() {
  const { brouillon, majBrouillon } = usePudi();
  const [message, setMessage] = useState<{ id: string; texte: string } | null>(null);
  const priorite = (id: string) => {
    if (!brouillon.priorites.includes(id) && !peutAjouterPriorite(brouillon, id)) {
      setMessage({ id, texte: fr.choix.maxPriorites });
      return;
    }
    setMessage(null);
    majBrouillon(basculerPriorite(brouillon, id));
  };
  const urgent = (id: string) => {
    if (!brouillon.urgents.includes(id) && !peutAjouterUrgent(brouillon, id)) {
      setMessage({ id, texte: fr.choix.maxUrgents });
      return;
    }
    setMessage(null);
    majBrouillon(basculerUrgent(brouillon, id));
  };
  return { brouillon, priorite, urgent, message };
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
export function BoutonsChoix({ id, tranche, desactive = false }: { id: string; tranche?: string; desactive?: boolean }) {
  const { brouillon, priorite, urgent, message } = useBasculeChoix();
  const estP = brouillon.priorites.includes(id);
  const estU = brouillon.urgents.includes(id);
  const base =
    'w-full min-h-[48px] px-4 rounded-xl font-bold text-[0.9375rem] inline-flex items-center justify-center gap-2 border-2 disabled:opacity-50';
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={desactive}
        aria-pressed={estP}
        onClick={() => priorite(id)}
        className={`${base} ${estP ? 'bg-marine border-marine text-white' : 'bg-white border-marine text-marine'}`}
      >
        <Icone nom={estP ? 'croix' : 'etoile'} />
        {estP ? fr.programme.retirerPriorite : fr.programme.ajouterPriorite}
      </button>
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
