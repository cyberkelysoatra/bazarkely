import { useEffect, useState } from 'react';

export interface LoanDueCountdownProps {
  /** Date de départ du prêt (ISO) — sert de base à la jauge de progression. */
  createdAt: string;
  /** Date d'échéance ('YYYY-MM-DD' ou ISO). */
  dueDate: string;
}

/**
 * Jauge fine + compte à rebours "en direct" du temps restant avant l'échéance.
 * Format : "12J, 3h22mn12s". La barre se remplit à mesure qu'on approche de
 * l'échéance et change de couleur selon l'urgence (vert → ambre → rouge).
 */
const LoanDueCountdown = ({ createdAt, dueDate }: LoanDueCountdownProps) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const start = new Date(createdAt).getTime();
  const end = new Date(dueDate).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;

  const total = end - start;
  const remainingMs = end - now;
  const elapsed = Math.min(Math.max(now - start, 0), total);
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));

  let label: string;
  if (remainingMs <= 0) {
    label = 'Échéance dépassée';
  } else {
    const totalSec = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    label = `${days}J, ${hours}h${String(mins).padStart(2, '0')}mn${String(secs).padStart(2, '0')}s`;
  }

  const fillColor =
    remainingMs <= 0 ? 'bg-red-600' : pct >= 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-400' : 'bg-emerald-400';

  return (
    <div className="flex-1 min-w-0 px-2">
      <p
        className={`text-[10px] text-center leading-none mb-1 tabular-nums ${
          remainingMs <= 0 ? 'text-red-600 font-semibold' : 'text-gray-500'
        }`}
      >
        {label}
      </p>
      <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
        <div
          className={`h-1 rounded-full transition-all duration-1000 ease-linear ${fillColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default LoanDueCountdown;
