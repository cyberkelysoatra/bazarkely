/**
 * Aide contextuelle dépliable du module Gestion Eau (AHUVI).
 *
 * Objectif : sur CHAQUE écran/onglet, un bouton ⓘ « Aide » discret (et le sous-titre cliquable)
 * déplie/replie un panneau qui explique « À quoi ça sert » + « Comment s'en servir », pour des
 * utilisateurs non techniques.
 *
 * État mémorisé par écran en localStorage (`eau_aide_<id>`) :
 *  - 1ʳᵉ visite (clé absente) → déplié, puis on mémorise « replié » pour les visites suivantes ;
 *  - ensuite → suit le dernier choix de l'utilisateur (déplié/replié).
 *
 * Deux usages :
 *  - `<EauPageShell aide={…}>` intègre le bouton près du titre + sous-titre cliquable (voir EauPageShell) ;
 *  - `<EauAide … />` autonome, pour les emplacements hors shell (bandeau Relevés, onglet Scan, onglets bassin).
 */
import { ReactNode, useCallback, useState } from 'react';
import { Info } from 'lucide-react';

export interface AideContenu {
  /** Identifiant stable de l'écran/onglet (clé localStorage `eau_aide_<id>`). */
  id: string;
  /** « À quoi ça sert ». */
  quoi: ReactNode;
  /** « Comment s'en servir ». */
  comment: ReactNode;
}

/** Hook d'état déplié/replié mémorisé par écran (cf. règle 1ʳᵉ visite = déplié). */
export function useAideState(id: string) {
  const key = `eau_aide_${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    if (!id) return false; // pas d'aide sur cet écran : état neutre, sans toucher localStorage
    try {
      const v = localStorage.getItem(key);
      if (v === '1') return true;
      if (v === '0') return false;
      // Première visite : déplié, mais on mémorise « replié » pour les prochaines fois.
      localStorage.setItem(key, '0');
      return true;
    } catch {
      return true;
    }
  });
  const toggle = useCallback(() => {
    setOpen((o) => {
      const next = !o;
      try {
        if (id) localStorage.setItem(key, next ? '1' : '0');
      } catch {
        /* localStorage indisponible : on garde l'état en mémoire seulement. */
      }
      return next;
    });
  }, [key]);
  return { open, toggle };
}

/** Petit bouton ⓘ « Aide » discret (charte AHUVI). */
export function AideToggleButton({
  open,
  onClick,
  controls,
}: {
  open: boolean;
  onClick: () => void;
  controls: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      aria-label="Aide"
      title="Aide"
      className={`flex-shrink-0 inline-flex items-center justify-center rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-ahuvi-300 transition-colors ${
        open ? 'text-ahuvi-olive' : 'text-ahuvi-olive/50 hover:text-ahuvi-olive'
      }`}
    >
      <Info className="w-3.5 h-3.5" aria-hidden />
    </button>
  );
}

/** Panneau « À quoi ça sert / Comment s'en servir » (replié si !open). */
export function AidePanel({
  id,
  quoi,
  comment,
  open,
}: AideContenu & { open: boolean }) {
  const panelId = `eau-aide-panel-${id}`;
  if (!open) return null;
  return (
    <div
      id={panelId}
      role="region"
      aria-label="Aide de l'écran"
      className="mb-3 rounded-xl border border-ahuvi-200 bg-ahuvi-50/70 p-3 text-sm text-ahuvi-800 space-y-2.5"
    >
      <div>
        <p className="font-semibold text-ahuvi-forest font-ahuvi-body mb-0.5">À quoi ça sert</p>
        <p className="text-gray-700 leading-snug">{quoi}</p>
      </div>
      <div>
        <p className="font-semibold text-ahuvi-forest font-ahuvi-body mb-0.5">Comment s'en servir</p>
        <p className="text-gray-700 leading-snug">{comment}</p>
      </div>
    </div>
  );
}

/**
 * Aide autonome (bouton + panneau) pour les emplacements hors EauPageShell.
 * `label` permet de personnaliser l'intitulé au-dessus du bouton (ex. « Aide — Saisie bassin »).
 */
export default function EauAide({
  id,
  quoi,
  comment,
  className,
}: AideContenu & { className?: string }) {
  const { open, toggle } = useAideState(id);
  const panelId = `eau-aide-panel-${id}`;
  return (
    <div className={className}>
      <div className="flex justify-end mb-2">
        <AideToggleButton open={open} onClick={toggle} controls={panelId} />
      </div>
      <AidePanel id={id} quoi={quoi} comment={comment} open={open} />
    </div>
  );
}
