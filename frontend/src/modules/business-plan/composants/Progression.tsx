// Progress bar with its percent (turquoise of the charter).
export function Progression({ pct, label, compact = false }: { pct: number; label?: string; compact?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex-1 rounded-full bg-turquoiseClair overflow-hidden ${compact ? 'h-2' : 'h-2.5'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={v}
        aria-label={label ?? 'Avancement'}
      >
        <div className="h-full rounded-full bg-turquoise transition-[width] duration-300" style={{ width: `${v}%` }} />
      </div>
      <span className="text-[14px] font-bold text-turquoiseTexte tabular-nums w-11 text-right">{v}&nbsp;%</span>
    </div>
  );
}
