/**
 * Small building blocks of the panels shown above the client map (phase 2C2), after the
 * validated mock-up: big yellow button with its charcoal step, folded ⓘ help, header of
 * a panel with its "Retour", short message at the top of the map.
 * Charter NAVY ay: yellow #E9B824 + charcoal #2E2E2E, text on yellow always charcoal;
 * every touch target is at least 44 px.
 */
import { useEffect, useId, useState, type ReactNode } from 'react';
import { ChevronLeft, Info } from 'lucide-react';

/** Main action (mock-up .cta): yellow, charcoal text, a 4 px darker step. */
export const ctaCls =
  'inline-flex w-full min-h-[54px] items-center justify-center gap-2.5 rounded-2xl bg-navyay-yellow px-4 py-3.5 text-[17px] font-extrabold text-navyay-charcoal shadow-[0_4px_0_#C99A10] active:translate-y-0.5 active:shadow-[0_2px_0_#C99A10] focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-charcoal focus-visible:ring-offset-2 disabled:opacity-45 disabled:shadow-none disabled:cursor-not-allowed transition';
/** Very big home button (mock-up .big-cta). */
export const bigCtaCls = `${ctaCls} min-h-[62px] rounded-[18px] text-[19px]`;
/** Outlined secondary action. */
export const ghostCls =
  'inline-flex w-full min-h-[46px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-navyay-charcoal/15 bg-transparent px-3.5 py-3 font-bold text-navyay-charcoal hover:bg-navyay-yellow/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-50';
/** Underlined text link (44 px high). */
export const linkCls =
  'inline-flex min-h-[44px] items-center gap-1 px-1 font-bold text-navyay-charcoal/75 underline underline-offset-[3px] hover:text-navyay-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow rounded-lg';
/** Choice card (departure, payment, modes): pressed = yellow edge + pale yellow. */
export const choiceCls = (pressed: boolean) =>
  `rounded-[14px] border-[1.5px] p-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-50 disabled:cursor-not-allowed ${
    pressed ? 'border-navyay-yellow bg-navyay-yellow/[0.16]' : 'border-navyay-charcoal/15 bg-white hover:bg-navyay-yellow/10'
  }`;
export const fieldCls =
  'mt-1 block w-full min-w-0 rounded-xl border-[1.5px] border-navyay-charcoal/15 bg-white px-3 py-2.5 text-base text-navyay-charcoal placeholder:text-navyay-charcoal/75 focus:outline-none focus:border-navyay-charcoal focus:ring-2 focus:ring-navyay-yellow';

/** Title of a panel, with "Retour" on the right and an optional folded ⓘ help below. */
export function PanelHead({
  title,
  sub,
  onBack,
  backLabel = 'Retour',
  help,
}: {
  title: ReactNode;
  sub?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  help?: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 pt-2 text-[19px] font-extrabold leading-tight text-balance">{title}</h2>
        <div className="flex flex-shrink-0 items-center">
          {help && <HelpToggle>{help}</HelpToggle>}
          {onBack && (
            <button type="button" className={linkCls} onClick={onBack}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {backLabel}
            </button>
          )}
        </div>
      </div>
      {sub && <p className="text-sm text-navyay-charcoal/75">{sub}</p>}
    </div>
  );
}

/** ⓘ button that unfolds a few lines of plain French help (folded by default). */
export function HelpToggle({ children, label = 'Aide' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        title={label}
        className="flex h-11 w-11 items-center justify-center rounded-full text-navyay-charcoal/75 hover:bg-navyay-yellow/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
      >
        <Info className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={id}
          role="note"
          className="absolute left-3 right-3 top-3 z-40 space-y-2 rounded-2xl border border-navyay-charcoal/10 bg-white p-4 text-sm leading-relaxed text-navyay-charcoal/85 shadow-[0_10px_30px_rgba(46,46,46,0.18)]"
        >
          {children}
          <button type="button" className={`${linkCls} -ml-1`} onClick={() => setOpen(false)}>
            Fermer l’aide
          </button>
        </div>
      )}
    </>
  );
}

/** Short message at the top of the map (mock-up toast), disappears by itself. */
export function MapToast({ text, onDone, ms = 3200 }: { text: string | null; onDone: () => void; ms?: number }) {
  useEffect(() => {
    if (!text) return;
    const t = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(t);
  }, [text, onDone, ms]);
  if (!text) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute left-1/2 top-14 z-40 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-xl bg-navyay-charcoal px-3.5 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(46,46,46,0.25)]"
    >
      {text}
    </div>
  );
}

/** Pill at the top of the map: "3 chauffeurs disponibles sur l'île". */
export function LivePill({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-120px)] -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-[13px] font-bold shadow-[0_10px_30px_rgba(46,46,46,0.18)] backdrop-blur-md">
      <span className="navy-pulse h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#2F7A4E]" aria-hidden="true" />
      <span className="truncate" aria-live="polite">
        {children}
      </span>
    </div>
  );
}

/** Round avatar with the initial (recipient). */
export function Avatar({ name, on }: { name: string; on?: boolean }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-base font-extrabold ${
        on ? 'bg-[#F6E3A6] text-navyay-charcoal' : 'bg-navyay-charcoal/[0.06] text-navyay-charcoal/75'
      }`}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

/** Number plate (mock-up .plate). */
export function Plate({ plate }: { plate: string | null | undefined }) {
  if (!plate) return null;
  return (
    <span className="mt-1 inline-block rounded-md border-2 border-navyay-charcoal bg-white px-1.5 text-[13px] font-extrabold tracking-[0.06em] text-navyay-charcoal">
      {plate}
    </span>
  );
}
