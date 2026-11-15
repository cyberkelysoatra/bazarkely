// Shared pieces of the pilotage screens: dark header (#0c4a6e), pills, error card.
import { useEffect, useRef, type ReactNode } from 'react';
import { useEspace } from '../EspaceContexte';
import EnTete from '../composants/EnTete';
import { CARTE, CarteMessage, PRIMAIRE, SECONDAIRE, useCouleurTheme } from '../composants/Mise';

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

/**
 * Confirmation shown right under the button that asked for it (VALIDCLIENT-CC-13, gap 4): scrolled into
 * view and focused when it appears, never at the bottom or top of the page.
 */
export function ConfirmationEnLigne({
  texte,
  avertissement,
  bouton,
  danger,
  envoi,
  annuler,
  confirmer,
  type
}: {
  texte: string;
  avertissement?: string | null;
  bouton: string;
  danger: boolean;
  envoi: boolean;
  annuler: () => void;
  confirmer: () => void;
  type: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollIntoView?.({ block: 'nearest', behavior: 'instant' as ScrollBehavior });
    el.focus({ preventScroll: true });
  }, []);
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={`${CARTE} !border-2 ${danger ? '!border-danger' : '!border-ciel'} outline-none focus-visible:ring-2 focus-visible:ring-ciel scroll-mt-[110px] scroll-mb-4`}
      role="alertdialog"
      aria-label="Confirmation"
      aria-describedby={`texte-confirmation-${type}`}
      data-confirmation={type}
    >
      <p id={`texte-confirmation-${type}`} className="text-[15px] font-semibold m-0">
        {texte}
      </p>
      {avertissement && (
        <p className="text-[14px] text-[#92400e] bg-[#fffbeb] border border-[#fcd34d] rounded-[10px] px-3 py-2 m-0 leading-[1.45]" data-avertissement-porte="">
          {avertissement}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className={`${SECONDAIRE} !text-[15px]`} onClick={annuler} disabled={envoi} data-annuler-confirmation="">
          Annuler
        </button>
        <button type="button" className={danger ? `${DANGER} !text-[15px]` : `${PRIMAIRE} !text-[15px]`} onClick={confirmer} disabled={envoi} data-confirmer="">
          {bouton}
        </button>
      </div>
    </div>
  );
}

/** Follow-up message to copy when the validant has no WhatsApp number (CC-13 gap 4). */
export function MessageACopier({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-1.5" data-message-a-copier="">
      <p className="text-[13px] text-doux m-0">Numéro WhatsApp du validant manquant : copiez ce message et envoyez-le vous-même.</p>
      <pre className="whitespace-pre-wrap break-words text-[13px] bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] p-3 m-0 font-[inherit]">{message}</pre>
      <button
        type="button"
        className="text-[14px] font-semibold text-ciel min-h-11 flex items-center self-start bg-transparent border-0 p-0 cursor-pointer"
        onClick={() => void navigator.clipboard?.writeText(message).catch(() => undefined)}
        data-copier-message=""
      >
        Copier le message
      </button>
    </div>
  );
}

export function Pilule({ classe, children, ...reste }: { classe: string; children: ReactNode; [k: `data-${string}`]: string }) {
  return (
    <span className={`${PILULE} ${classe}`} {...reste}>
      {children}
    </span>
  );
}
