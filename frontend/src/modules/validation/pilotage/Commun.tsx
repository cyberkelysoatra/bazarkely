// Shared pieces of the pilotage screens: dark header (#0c4a6e), pills, error card.
import type { ReactNode } from 'react';
import { useEspace } from '../EspaceContexte';
import EnTete from '../composants/EnTete';
import { CarteMessage, PRIMAIRE, useCouleurTheme } from '../composants/Mise';

export const PILULE = 'inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-1 rounded-full self-start flex-none whitespace-nowrap';
export const P_OK = 'bg-[#dcfce7] text-[#166534]';
export const P_ATTENTE = 'bg-[#fef3c7] text-[#92400e]';
export const P_NON = 'bg-[#fee2e2] text-[#991b1b]';
export const P_INFO = 'bg-clair text-[#075985]';
export const P_MESSAGE = 'bg-[#ccfbf1] text-[#134e4a]';
export const CHAMP = 'h-[46px] w-full border border-[#94a3b8] rounded-[10px] px-3 text-[15px] font-[inherit] bg-white';
export const ETIQUETTE = 'text-[14px] font-semibold text-encre';
export const DANGER = 'min-h-12 rounded-xl text-[16px] font-semibold flex items-center justify-center gap-2 px-4 cursor-pointer bg-white text-danger border-2 border-danger disabled:opacity-60';

export function EnTetePilotage({ titre, sousTitre = '' }: { titre: string; sousTitre?: string }) {
  useCouleurTheme('#0c4a6e');
  const { session } = useEspace();
  const nom = session?.nomGoogle || 'Joël SOATRA';
  return <EnTete variante="client" pilotage titre={titre} sousTitre={sousTitre} nom={nom} email={session?.email ?? ''} />;
}

export function ErreurReseau({ reessayer, texte }: { reessayer: () => void; texte?: string }) {
  return (
    <CarteMessage texte={texte ?? 'Le réseau ne répond pas. Vérifiez votre connexion, puis réessayez.'}>
      <button type="button" className={`${PRIMAIRE} self-stretch`} onClick={reessayer}>
        Réessayer
      </button>
    </CarteMessage>
  );
}

export function Pilule({ classe, children, ...reste }: { classe: string; children: ReactNode; [k: `data-${string}`]: string }) {
  return (
    <span className={`${PILULE} ${classe}`} {...reste}>
      {children}
    </span>
  );
}
