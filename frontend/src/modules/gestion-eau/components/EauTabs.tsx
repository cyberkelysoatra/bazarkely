/**
 * Bandeau d'onglets INTERNES à une page-thème du module Gestion Eau (AHUVI).
 * Sert à regrouper les sous-vues d'un thème (ex. Relevés = Bassin / Compteur / Tournée).
 * Les onglets désactivés (Phase 3-4) matérialisent la cible produit sans casser la nav.
 *
 * Calage collant (sticky) : le bandeau se fixe juste SOUS le Header partagé (sticky top-0,
 * z-50) et y reste pendant le défilement, le contenu passant DESSOUS. Le `top` suit la
 * hauteur réelle du Header (variable : un bandeau d'annonce peut s'ajouter) via un
 * ResizeObserver ; repli propre ~80 px si le Header est introuvable. z-40 < z-50 du Header
 * → les onglets passent sous le Header, jamais par-dessus.
 *
 * Glassmorphisme (v3.64.0) : le FOND de la barre est en verre dépoli ~50 % (`bg-white/50
 * backdrop-blur-md`) → le contenu de la page se voit défiler, flouté, derrière la barre.
 * Seules les PILULES restent pleines/nettes (actif vert forêt, inactif blanc bordé).
 *
 * `data-eau-sticky-tabs` : repère stable pour les aides de calage (scrollUnderHeader /
 * EauBassinReleves) qui visent le BAS de cette barre collante (= Header + onglets) plutôt
 * que le bas du Header seul — sinon les cartes se calent derrière les onglets.
 */
import { useLayoutEffect, useState, type ComponentType } from 'react';

/** Repli de hauteur du Header (px) si la mesure échoue — ordre de grandeur observé. */
const HEADER_FALLBACK_PX = 80;

type TabIcon = ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;

export interface EauTabDef {
  key: string;
  label: string;
  disabled?: boolean;
  /** Pastille (ex. « bientôt ») pour les sous-vues non encore livrées. */
  badge?: string;
  /** Icône lucide optionnelle, affichée avant le libellé. */
  icon?: TabIcon;
}

export default function EauTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: EauTabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  // Hauteur réelle du Header partagé (sticky top-0) → `top` du bandeau collant. Suivie en
  // continu (ResizeObserver) car un bandeau d'annonce peut faire varier la hauteur. On
  // arrondit vers le bas : le bandeau se cale un cheveu HAUT (tuilé sous le Header z-50)
  // plutôt que de laisser un filet transparent entre les deux.
  const [headerH, setHeaderH] = useState(HEADER_FALLBACK_PX);
  useLayoutEffect(() => {
    const header = document.querySelector('header');
    if (!header) return;
    const update = () => setHeaderH(Math.floor(header.getBoundingClientRect().height));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      data-eau-sticky-tabs
      className="sticky z-40 mb-3 border-b border-white/40 bg-white/50 backdrop-blur-md"
      style={{ top: headerH }}
    >
      <div className="max-w-3xl mx-auto px-3">
        <nav className="flex gap-2 overflow-x-auto py-2" aria-label="Onglets de la section">
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              disabled={t.disabled}
              onClick={() => !t.disabled && onChange(t.key)}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium font-ahuvi-body transition-colors ${
                isActive
                  ? 'bg-ahuvi-forest text-white shadow-soft'
                  : t.disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-ahuvi-forest border border-ahuvi-200 hover:bg-ahuvi-50'
              }`}
            >
              {t.icon && <t.icon className="w-4 h-4" aria-hidden="true" />}
              <span>{t.label}</span>
              {t.badge && (
                <span className="text-[10px] uppercase tracking-wide bg-gray-200 text-gray-500 rounded px-1.5 py-0.5">
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
        </nav>
      </div>
    </div>
  );
}
