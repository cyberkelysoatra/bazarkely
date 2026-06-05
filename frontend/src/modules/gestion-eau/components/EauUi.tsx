/**
 * Briques d'UI mutualisées du module Gestion Eau (AHUVI).
 *
 * Iconographie systématique façon BazarKELY MAIS en charte AHUVI (vert forêt / olive +
 * accent or ; jamais le violet/bleu de BazarKELY). On garde rouge/ambre pour le SENS
 * (alerte / perte). Composants :
 *   - <EauStatCard>     : carte KPI = icône en conteneur arrondi teinté + libellé + valeur.
 *   - <EauIconButton>   : bouton d'action avec icône en tête (variantes AHUVI).
 *   - <EauEmptyState>   : état vide = grande icône muette + message.
 *   - <EauListIcon>     : pastille d'icône de tête de ligne de liste.
 * Toutes les icônes décoratives sont marquées aria-hidden via la prop Lucide.
 */
import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../../utils/cn';

export type LucideIcon = React.ComponentType<{
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

/** Teintes AHUVI pour les conteneurs d'icônes. `amber`/`rose` réservés au SENS (alerte/perte). */
export type EauTone = 'forest' | 'olive' | 'gold' | 'teal' | 'neutral' | 'amber' | 'rose' | 'emerald';

const TONE_CONTAINER: Record<EauTone, string> = {
  forest: 'bg-ahuvi-100 text-ahuvi-forest',
  olive: 'bg-ahuvi-100 text-ahuvi-olive',
  gold: 'bg-[#f4f2dd] text-[#8a8836]',
  teal: 'bg-cyan-50 text-ahuvi-teal',
  neutral: 'bg-gray-100 text-gray-500',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  emerald: 'bg-emerald-100 text-emerald-700',
};

const TONE_VALUE: Record<EauTone, string> = {
  forest: 'text-ahuvi-forest',
  olive: 'text-ahuvi-olive',
  gold: 'text-[#8a8836]',
  teal: 'text-ahuvi-teal',
  neutral: 'text-gray-800',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
  emerald: 'text-emerald-700',
};

/** Carte KPI : icône (conteneur teinté AHUVI) + libellé + valeur. ChevronRight si cliquable. */
export function EauStatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'forest',
  onClick,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: EauTone;
  onClick?: () => void;
  className?: string;
}) {
  const Wrapper: any = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={cn(
        'w-full text-left rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft',
        onClick && 'hover:border-ahuvi-300 hover:shadow-md transition-colors',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="flex items-center gap-1">
          <span
            className={cn(
              'w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0',
              TONE_CONTAINER[tone],
            )}
          >
            <Icon className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
          </span>
          {onClick && <ChevronRight className="w-4 h-4 text-gray-300" aria-hidden="true" />}
        </div>
      </div>
      <div className={cn('mt-2 text-2xl font-bold', TONE_VALUE[tone])}>{value}</div>
      {hint && <div className="text-sm text-gray-500 mt-0.5">{hint}</div>}
    </Wrapper>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-ahuvi-forest hover:bg-ahuvi-800 text-white shadow-soft',
  gold: 'bg-ahuvi-gold hover:brightness-95 text-white shadow-soft',
  secondary: 'bg-white border border-ahuvi-200 text-ahuvi-forest hover:bg-ahuvi-50',
  danger: 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50',
  ghost: 'text-ahuvi-forest hover:bg-ahuvi-50',
};

/** Bouton d'action : icône en tête (w-4 h-4) + libellé. Couleurs AHUVI. */
export function EauIconButton({
  icon: Icon,
  children,
  variant = 'primary',
  className,
  ...rest
}: {
  icon: LucideIcon;
  variant?: BtnVariant;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium font-ahuvi-body transition-colors disabled:opacity-50',
        BTN_VARIANT[variant],
        className,
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      {children}
    </button>
  );
}

/** État vide : grande icône muette centrée + message (+ action optionnelle). */
export function EauEmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-4', className)}>
      <Icon className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mb-3" aria-hidden="true" />
      <div className="text-sm font-medium text-gray-500">{title}</div>
      {hint && <div className="text-xs text-gray-400 mt-1 max-w-xs">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Pastille d'icône de tête de ligne de liste (petit conteneur teinté AHUVI). */
export function EauListIcon({ icon: Icon, tone = 'neutral' }: { icon: LucideIcon; tone?: EauTone }) {
  return (
    <span
      className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        TONE_CONTAINER[tone],
      )}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </span>
  );
}
