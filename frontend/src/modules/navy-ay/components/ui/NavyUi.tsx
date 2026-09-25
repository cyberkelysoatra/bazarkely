/**
 * Small shared building blocks of the NAVY ay screens (phase 1A).
 * Charter: yellow #E9B824 + charcoal #2E2E2E, text on yellow always charcoal,
 * never navy blue. Every icon is from lucide.
 */
import { useId, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Clock, Info, PauseCircle, WifiOff, XCircle } from 'lucide-react';
import type { PartnerStatus } from '../../types/partner';

/** Page wrapper: same width and rhythm as the NAVY home page. */
export function NavyPage({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-4 pb-6 space-y-4 text-navyay-charcoal selection:bg-navyay-yellow selection:text-navyay-charcoal">
      {children}
    </div>
  );
}

export function NavyPageTitle({ icon: Icon, title, subtitle }: { icon: typeof Info; title: string; subtitle?: string }) {
  return (
    <header className="flex items-start gap-3 pt-2">
      <span className="flex-shrink-0 w-11 h-11 rounded-xl bg-navyay-charcoal text-navyay-yellow flex items-center justify-center">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 className="text-xl font-bold leading-tight text-balance">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-navyay-charcoal/75 leading-relaxed text-pretty">{subtitle}</p>}
      </div>
    </header>
  );
}

export function NavyCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white border border-navyay-charcoal/10 ${className}`}>{children}</section>;
}

/** Collapsible ⓘ help, folded by default. */
export function NavyHelp({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className="rounded-2xl bg-white border border-navyay-charcoal/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-2xl hover:bg-navyay-yellow/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
      >
        <Info className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <span className="flex-1 min-w-0 font-medium">{title}</span>
        <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} className="px-4 pb-4 space-y-2 text-sm text-navyay-charcoal/80 leading-relaxed">
          {children}
        </div>
      )}
    </section>
  );
}

export function NavyNotice({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'warn' | 'error' | 'ok';
  icon?: typeof Info;
  children: ReactNode;
}) {
  const styles = {
    info: 'border-navyay-charcoal/15 bg-white',
    warn: 'border-navyay-yellow bg-navyay-yellow/15',
    error: 'border-red-300 bg-red-50 text-red-900',
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  }[tone];
  const Icon = icon ?? (tone === 'error' ? AlertTriangle : tone === 'ok' ? CheckCircle2 : Info);
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${styles}`} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  );
}

export function NavyOfflineNotice({ children }: { children?: ReactNode }) {
  return (
    <NavyNotice icon={WifiOff}>
      {children ?? 'Vous êtes hors ligne. Les informations affichées sont celles gardées sur votre téléphone.'}
    </NavyNotice>
  );
}

const STATUS_META: Record<PartnerStatus, { label: string; icon: typeof Info; cls: string }> = {
  pending: { label: 'En attente', icon: Clock, cls: 'bg-navyay-yellow text-navyay-charcoal' },
  approved: { label: 'Validée', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-900' },
  rejected: { label: 'Refusée', icon: XCircle, cls: 'bg-red-100 text-red-900' },
  suspended: { label: 'Suspendue', icon: PauseCircle, cls: 'bg-navyay-charcoal text-white' },
};

export function StatusBadge({ status }: { status: PartnerStatus }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${m.cls}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {m.label}
    </span>
  );
}

export const statusLabel = (s: PartnerStatus) => STATUS_META[s].label;

/** Primary action: charcoal button, yellow focus ring. */
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-navyay-charcoal px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-navyay-charcoal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navyay-yellow disabled:opacity-60 disabled:cursor-not-allowed transition-colors';
/** Secondary action: outlined. */
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-navyay-charcoal/25 bg-white px-4 py-3 text-base font-semibold text-navyay-charcoal hover:bg-navyay-yellow/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-60 disabled:cursor-not-allowed transition-colors';
/** Accent action: yellow with charcoal text. */
export const btnAccent =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-navyay-yellow px-4 py-3 text-base font-semibold text-navyay-charcoal shadow-sm hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navyay-charcoal disabled:opacity-60 disabled:cursor-not-allowed transition'
;
export const inputCls =
  'mt-1 block w-full min-w-0 rounded-xl border border-navyay-charcoal/25 bg-white px-3 py-2.5 text-base text-navyay-charcoal placeholder:text-navyay-charcoal/70 focus:outline-none focus:border-navyay-charcoal focus:ring-2 focus:ring-navyay-yellow';
export const labelCls = 'block text-sm font-medium text-navyay-charcoal';

export function NavyLoader({ label = 'Chargement' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[240px]" role="status" aria-label={label}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navyay-charcoal" />
    </div>
  );
}

/** Amount in ariary, French spacing: 3 000 Ar. */
export function formatAr(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${Math.round(n).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} Ar`;
}
