/**
 * Enveloppe commune des écrans gestion-eau.
 *
 * NOTE (correctif UI v3.19.0) : l'identité du module (logo, « AHUVI Eau », slogan) est
 * désormais portée UNIQUEMENT par le header partagé, et la navigation principale par le
 * BottomNav + la nav desktop du header. Ce shell ne rend donc plus de seconde barre de
 * navigation (ex-EauNav) ni de gros en-tête : juste un titre de section discret + le contenu.
 */
import { ReactNode } from 'react';

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
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-ahuvi-forest font-ahuvi-body">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
