/** Enveloppe commune des écrans gestion-eau : en-tête titre + navigation interne. */
import { ReactNode } from 'react';
import EauNav from './EauNav';

export default function EauPageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto px-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span aria-hidden>💧</span> {title}
          </h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <EauNav />
      <div className="mt-3">{children}</div>
    </div>
  );
}
