/**
 * Bandeau d'onglets INTERNES à une page-thème du module Gestion Eau (AHUVI).
 * Sert à regrouper les sous-vues d'un thème (ex. Relevés = Bassin / Compteur / Tournée).
 * Les onglets désactivés (Phase 3-4) matérialisent la cible produit sans casser la nav.
 */
import type { ComponentType } from 'react';

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
  return (
    <div className="max-w-3xl mx-auto px-3">
      <nav className="flex gap-2 overflow-x-auto pb-2 mb-3" aria-label="Onglets de la section">
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
  );
}
