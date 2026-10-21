// Pieces shared by the administration screens: help ⓘ, confirmation dialog, loading hook,
// French messages of the server errors, number tiles.
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icone, type NomIcone } from '../../composants/Icones';
import { boutonPrincipal, boutonSecondaire } from '../../composants/Mise';
import { extraireCode } from '../../utils/erreurs';

const MESSAGES: Record<string, string> = {
  ADMIN_REQUIS: 'Espace réservé aux organisateurs.',
  JOEL_REQUIS: 'Seul Joël SOATRA peut faire cette action.',
  MOTIF_REQUIS: 'Indiquez un motif (3 caractères au moins).',
  VOTE_INCONNU: "Ce vote n'existe plus.",
  CODE_CANAL: 'Code invalide : lettres minuscules sans accent, chiffres et tirets, 24 caractères au plus.',
  NOM_CANAL: 'Indiquez le nom du canal.',
  CANAL_INCONNU: "Ce canal n'existe pas.",
  SOURCE_REQUISE: 'Indiquez la source de la liste.',
  LISTE_TROP_LONGUE: '20 000 numéros au plus par envoi : découpez le fichier.',
  LISTE_INCONNUE: "Cette liste n'existe plus.",
  DATE: 'Indiquez une date et une heure.',
  INTITULE: 'Indiquez un titre (3 caractères au moins).',
  PROPOSITION_INCONNUE: "Cette proposition n'existe plus.",
  CLOS: 'La consultation est close : plus aucun ajout possible.',
  RESEAU: 'Le réseau ne répond pas. Réessayez.'
};

export function messageAdmin(e: unknown): string {
  const code = extraireCode(e);
  return (code && MESSAGES[code]) || 'Une erreur est survenue. Réessayez.';
}

/** Loads data once, then on demand. Keeps the previous data while reloading. */
export function useAppel<T>(fn: () => Promise<T>) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [charge, setCharge] = useState(true);
  const [le, setLe] = useState<Date | null>(null);
  const ref = useRef(fn);
  ref.current = fn;
  const recharger = useCallback(async () => {
    setCharge(true);
    try {
      setDonnees(await ref.current());
      setErreur(null);
      setLe(new Date());
    } catch (e) {
      setErreur(messageAdmin(e));
    } finally {
      setCharge(false);
    }
  }, []);
  useEffect(() => {
    void recharger();
  }, [recharger]);
  return { donnees, erreur, charge, recharger, le };
}

/** Expandable help in plain French. */
export function Aide({ children, titre = 'Aide' }: { children: ReactNode; titre?: string }) {
  return (
    <details className="bg-white border border-filet rounded-xl group mb-4">
      <summary className="min-h-[44px] px-3 flex items-center gap-2 cursor-pointer font-bold text-marine list-none text-[15px]">
        <Icone nom="info" />
        {titre}
        <Icone nom="bas" className="w-5 h-5 ml-auto transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-3 space-y-2 text-[14px] leading-relaxed">{children}</div>
    </details>
  );
}

export function Chiffre({ valeur, libelle, icone, ton }: { valeur: ReactNode; libelle: string; icone?: NomIcone; ton?: 'test' | 'alerte' }) {
  const fond = ton === 'test' ? 'bg-[#FFF6E0] border-[#E9D29A]' : ton === 'alerte' ? 'bg-[#FDF1EC] border-[#F0CDBF]' : 'bg-white border-filet';
  return (
    <div className={`border rounded-xl p-3 ${fond}`}>
      <div className="flex items-center gap-1.5 text-[13px] text-gris">
        {icone && <Icone nom={icone} className="w-4 h-4" />}
        {libelle}
      </div>
      <div className="font-titre text-[28px] leading-tight text-marine mt-0.5">{valeur}</div>
    </div>
  );
}

export function Erreur({ texte, reessayer }: { texte: string; reessayer?: () => void }) {
  return (
    <div role="alert" className="my-3 border-l-4 border-[#B85317] bg-white rounded-r-lg px-3 py-2.5 flex flex-wrap items-center gap-2 justify-between">
      <p className="text-[15px] font-bold text-[#9C3F21]">{texte}</p>
      {reessayer && (
        <button type="button" onClick={reessayer} className="min-h-[44px] inline-flex items-center gap-1 text-marine font-bold text-[14px]">
          <Icone nom="actualiser" className="w-4 h-4" />
          Réessayer
        </button>
      )}
    </div>
  );
}

export function Titre2({ children, aide }: { children: ReactNode; aide?: ReactNode }) {
  return (
    <div className="mt-6 mb-2">
      <h2 className="font-bold text-[17px] text-marine">{children}</h2>
      {aide && <p className="text-[13px] text-gris">{aide}</p>}
    </div>
  );
}

export interface DemandeConfirmation {
  titre: string;
  texte?: ReactNode;
  /** Asks for a reason of 3 characters or more. */
  motif?: boolean;
  libelleOk: string;
  danger?: boolean;
  action: (motif: string) => Promise<unknown>;
}

/** Modal confirmation, with an optional required reason. Closes on success only. */
export function Dialogue({ demande, fermer }: { demande: DemandeConfirmation | null; fermer: () => void }) {
  const [motif, setMotif] = useState('');
  const [cours, setCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const id = useId();
  const champ = useRef<HTMLTextAreaElement>(null);
  const ok = useRef<HTMLButtonElement>(null);
  // Focus goes into the dialog, then back to the button that opened it.
  const origine = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setMotif('');
    setErreur(null);
    setCours(false);
    if (!demande) return;
    origine.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => (demande.motif ? champ.current : ok.current)?.focus(), 30);
    return () => {
      const el = origine.current;
      if (el && document.contains(el)) window.setTimeout(() => el.focus(), 0);
    };
  }, [demande]);
  useEffect(() => {
    if (!demande) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !cours) fermer();
    };
    document.addEventListener('keydown', touche);
    return () => document.removeEventListener('keydown', touche);
  }, [demande, cours, fermer]);
  if (!demande) return null;
  const valider = async () => {
    if (demande.motif && motif.trim().length < 3) {
      setErreur(MESSAGES.MOTIF_REQUIS);
      return;
    }
    setCours(true);
    setErreur(null);
    try {
      await demande.action(motif.trim());
      fermer();
    } catch (e) {
      setErreur(messageAdmin(e));
      setCours(false);
    }
  };
  return createPortal(
    <div className="pudi-page fixed inset-0 z-[80] bg-[#0B2A8C]/40 flex items-end sm:items-center justify-center p-3 font-corps text-texte" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-4 space-y-3">
        <h2 id={`${id}-t`} className="font-bold text-[18px] text-marine">
          {demande.titre}
        </h2>
        {demande.texte && <div className="text-[15px] leading-relaxed space-y-2">{demande.texte}</div>}
        {demande.motif && (
          <div>
            <label htmlFor={`${id}-m`} className="block font-bold text-[14px] mb-1">
              Motif (obligatoire)
            </label>
            <textarea
              id={`${id}-m`}
              ref={champ}
              rows={3}
              maxLength={300}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full rounded-xl border border-filet px-3 py-2 text-[16px]"
            />
          </div>
        )}
        {erreur && (
          <p role="alert" className="text-[14px] font-bold text-[#9C3F21]">
            {erreur}
          </p>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" className={boutonSecondaire} onClick={fermer} disabled={cours}>
            Annuler
          </button>
          <button
            ref={ok}
            type="button"
            className={`${boutonPrincipal} ${demande.danger ? '!bg-[#B42318]' : ''}`}
            onClick={() => void valider()}
            disabled={cours}
          >
            {cours ? 'Envoi…' : demande.libelleOk}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const champ = 'w-full min-h-[44px] rounded-xl border border-filet bg-white px-3 text-[16px]';
export const petitBouton =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl border border-filet bg-white text-marine font-bold text-[14px] active:bg-vide disabled:opacity-50';
