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
import EauWaterFill from './EauWaterFill';
import EauFlowFill from './EauFlowFill';

export type LucideIcon = React.ComponentType<{
  className?: string;
  size?: number | string;
  strokeWidth?: number | string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

/** Teintes AHUVI pour les conteneurs d'icônes. `amber`/`rose` réservés au SENS (alerte/perte). */
export type EauTone = 'forest' | 'olive' | 'gold' | 'teal' | 'neutral' | 'amber' | 'rose' | 'emerald';

export const TONE_CONTAINER: Record<EauTone, string> = {
  forest: 'bg-ahuvi-100 text-ahuvi-forest',
  olive: 'bg-ahuvi-100 text-ahuvi-olive',
  // gold/teal adossés aux tokens AHUVI (plus d'hex arbitraires) : or = accent marque,
  // teal = eau. Le conteneur reste clair (token /15 ou cyan-50) pour porter l'icône.
  gold: 'bg-ahuvi-gold/15 text-ahuvi-gold',
  teal: 'bg-cyan-50 text-ahuvi-teal',
  neutral: 'bg-gray-100 text-gray-500',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  emerald: 'bg-emerald-100 text-emerald-700',
};

export const TONE_VALUE: Record<EauTone, string> = {
  forest: 'text-ahuvi-forest',
  olive: 'text-ahuvi-olive',
  // VALEUR or = encre assombrie accessible (contraste ≥ 4,5:1 sur blanc). Les SURFACES et
  // ICÔNES or restent #9D9B4B (cf. TONE_CONTAINER.gold) — seul le texte passe à gold-700.
  gold: 'text-ahuvi-gold-700',
  teal: 'text-ahuvi-teal',
  neutral: 'text-gray-800',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
  emerald: 'text-emerald-700',
};

/**
 * Tokens de couleurs de GRAPHES (recharts) — SOURCE UNIQUE du module. Toute série
 * (Area/Line/Bar) doit puiser ici : vert/olive/or = marque, teal = eau, rose = perte/danger,
 * `elec` = accent or pour l'électricité (remplace l'ancien #B8860B), `grid` = quadrillage.
 */
export const EAU_CHART = {
  forest: '#364E30',
  olive: '#4C6D40',
  gold: '#9D9B4B',
  teal: '#10939F',
  // `eauFill` = « vert d'eau » (moins bleu que teal), dédié au calque d'eau animé des cartes
  // KPI (EauWaterFill). `teal` reste la couleur EAU des graphes (séries recharts).
  eauFill: '#149E8C',
  rose: '#b91c1c',
  elec: '#9D9B4B',
  grid: '#e6ebe1',
} as const;

/**
 * Style d'un onglet « segmenté » (contrôle à 2-3 options pleine largeur dans un formulaire,
 * charte AHUVI) : pilule active vert forêt, inactive blanche bordée. Brique PARTAGÉE pour
 * éviter de réimplémenter le markup d'onglet localement (cf. EauDemandesPage). Distinct de
 * `<EauTabs>` qui pilote la navigation INTER-vues d'une page-thème (pills `rounded-full`).
 */
export function eauSegmentTabClass(active: boolean): string {
  return cn(
    'flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border transition-colors',
    active ? 'bg-ahuvi-forest text-white border-ahuvi-forest' : 'bg-white text-ahuvi-forest border-ahuvi-200 hover:bg-ahuvi-50',
  );
}

/**
 * Carte KPI : icône (conteneur teinté AHUVI) + libellé + valeur.
 *
 * Comportement au clic (tout est OPTIONNEL et ADDITIF — sans ces props, rendu inchangé) :
 *   - `onClick`      : action au clic sur le CORPS de la carte (« voir »).
 *   - `onIconClick`  : action au clic sur l'ICÔNE (« saisir »). Quand fourni, le corps devient
 *                      un `div role="button"` (clavier Enter/Espace) et l'icône un vrai `<button>`
 *                      avec stopPropagation → on évite un <button> imbriqué dans un <button>.
 *   - `iconAriaLabel`: libellé accessible du bouton-icône.
 *   - `hideChevron`  : masque le ChevronRight même quand `onClick` est fourni.
 *   - `waterFraction`: si nombre, rend un fond d'eau animé AHUVI (EauWaterFill) DERRIÈRE le
 *                      contenu, à ce niveau (fraction de hauteur de carte, non plafonnée) ;
 *                      `null`/`undefined` → rendu strictement inchangé. Active aussi des encres
 *                      renforcées (contraste ≥ 4,5:1) pour rester lisible sur l'eau.
 *   - `flotteurFraction` / `tropPleinFraction` : repères dessinés par EauWaterFill (cf. ce composant).
 *   - `hideFlotteurLabel` : masque la pastille texte « 100 % » du flotteur (le trait pointillé reste) —
 *                      utile quand l'étiquette % flottante monte près du flotteur et la chevaucherait.
 *   - `flowFraction` : si nombre, rend un fond de CHUTE D'EAU descendante AHUVI (EauFlowFill)
 *                      DERRIÈRE le contenu, d'intensité ∝ à cette fraction [0..1] ; `null` →
 *                      rendu inchangé. Symétrique de `waterFraction` (réutilisable sur d'autres
 *                      cartes). Si les DEUX sont fournis, `waterFraction` est PRIORITAIRE (les
 *                      deux calques ne coexistent jamais sur une même carte).
 */
export function EauStatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'forest',
  onClick,
  onIconClick,
  iconAriaLabel,
  hideChevron,
  waterFraction,
  waterLabel,
  flotteurFraction,
  tropPleinFraction,
  hideFlotteurLabel,
  flowFraction,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: EauTone;
  onClick?: () => void;
  onIconClick?: () => void;
  iconAriaLabel?: string;
  hideChevron?: boolean;
  waterFraction?: number | null;
  waterLabel?: string | null;
  flotteurFraction?: number | null;
  tropPleinFraction?: number | null;
  hideFlotteurLabel?: boolean;
  flowFraction?: number | null;
  className?: string;
}) {
  const interactive = !!onClick;
  // Si l'icône a sa propre action, on ne peut pas imbriquer 2 <button> → corps = div role=button.
  const useDivRole = !!onIconClick;
  const showChevron = interactive && !hideChevron;
  // Un fond animé (eau qui monte OU chute d'eau) déclenche les encres renforcées.
  const hasWater = waterFraction != null;
  const hasFlow = !hasWater && flowFraction != null;
  const hasFill = hasWater || hasFlow;

  const baseClass = cn(
    'w-full text-left rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft',
    interactive && 'cursor-pointer hover:border-ahuvi-300 hover:shadow-md transition-colors',
    interactive && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300',
    hasFill && 'relative overflow-hidden',
    className,
  );

  const inner = (
    <>
      {hasWater && (
        <EauWaterFill
          waterFraction={waterFraction as number}
          waterLabel={waterLabel}
          flotteurFraction={flotteurFraction}
          tropPleinFraction={tropPleinFraction}
          hideFlotteurLabel={hideFlotteurLabel}
        />
      )}
      {hasFlow && <EauFlowFill flowFraction={flowFraction as number} />}
      <div className="relative z-10">
      <div className="flex items-start justify-between gap-2">
        <div className={cn('text-xs font-medium uppercase tracking-wide', hasFill ? 'text-gray-700' : 'text-gray-500')}>{label}</div>
        <div className="flex items-center gap-1">
          {onIconClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIconClick();
              }}
              aria-label={iconAriaLabel}
              className={cn(
                'w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                'cursor-pointer transition hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300',
                TONE_CONTAINER[tone],
              )}
            >
              <Icon className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
            </button>
          ) : (
            <span
              className={cn(
                'w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                TONE_CONTAINER[tone],
              )}
            >
              <Icon className="w-5 h-5 md:w-6 md:h-6" aria-hidden="true" />
            </span>
          )}
          {showChevron && <ChevronRight className="w-4 h-4 text-gray-300" aria-hidden="true" />}
        </div>
      </div>
        <div className={cn('mt-2 text-2xl font-bold', hasFill ? 'text-ahuvi-forest' : TONE_VALUE[tone])}>{value}</div>
        {hint && <div className={cn('text-sm mt-0.5', hasFill ? 'text-gray-700' : 'text-gray-500')}>{hint}</div>}
      </div>
    </>
  );

  if (useDivRole) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={baseClass}
      >
        {inner}
      </div>
    );
  }

  const Wrapper: any = interactive ? 'button' : 'div';
  return (
    <Wrapper onClick={onClick} type={interactive ? 'button' : undefined} className={baseClass}>
      {inner}
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

/**
 * Carte générique surélevée AHUVI (coque réutilisable). `interactive` (ou `onClick`)
 * active l'état survol ; quand `onClick` est fourni, la carte devient un `role="button"`
 * pilotable au clavier (Enter / Espace). `className` se compose via twMerge (un
 * `border-*`/`bg-*` passé en prop écrase la base — pratique pour un ton d'alerte).
 */
export function EauCard({
  interactive,
  onClick,
  className,
  children,
  ...rest
}: {
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'>) {
  const clickable = !!onClick;
  return (
    <div
      {...rest}
      onClick={onClick}
      role={clickable ? 'button' : rest.role}
      tabIndex={clickable ? 0 : rest.tabIndex}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : rest.onKeyDown
      }
      className={cn(
        'rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft',
        (interactive || clickable) && 'hover:border-ahuvi-300 hover:shadow-md transition',
        clickable && 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Carte de graphe : coque `EauCard` + rangée titre (AHUVI forêt) + `subtitle?` + slot
 * graphe (`children`). `empty` rend un `EauEmptyState` à la place du graphe (état vide).
 * `icon`/`action`/`onClick` sont additifs (icône de titre, lien d'action à droite, carte
 * cliquable) — pour reproduire les mini-graphes cliquables sans dupliquer de markup.
 */
export function EauChartCard({
  title,
  subtitle,
  icon: Icon,
  action,
  empty,
  emptyIcon,
  emptyTitle,
  emptyHint,
  interactive,
  onClick,
  className,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  empty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyHint?: React.ReactNode;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}) {
  const EmptyIcon = emptyIcon ?? Icon;
  return (
    <EauCard interactive={interactive} onClick={onClick} className={className}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-ahuvi-forest font-ahuvi-body">
            {Icon && <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
            <span className="truncate">{title}</span>
          </div>
          {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {empty && EmptyIcon ? (
        <EauEmptyState icon={EmptyIcon} title={emptyTitle ?? 'Aucune donnée'} hint={emptyHint} className="py-6" />
      ) : (
        children
      )}
    </EauCard>
  );
}

/** Titre de section : `<h3>` AHUVI (Playfair) avec icône optionnelle en pastille. */
export function EauSectionTitle({
  icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('flex items-center gap-2 text-base font-ahuvi-display text-ahuvi-forest', className)}>
      {icon && <EauListIcon icon={icon} tone="forest" />}
      <span className="min-w-0">{children}</span>
    </h3>
  );
}

/** Bouton-raccourci : pastille d'icône AHUVI + libellé court (rangée de raccourcis). */
export function EauShortcut({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-ahuvi-200 bg-white px-2 py-3 text-center transition-colors hover:bg-ahuvi-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="w-9 h-9 rounded-xl bg-ahuvi-100 text-ahuvi-forest flex items-center justify-center">
        <Icon className="w-4 h-4" aria-hidden="true" />
      </span>
      <span className="text-xs font-medium text-ahuvi-forest font-ahuvi-body leading-tight">{label}</span>
    </button>
  );
}
