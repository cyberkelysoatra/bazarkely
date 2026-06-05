/**
 * Enveloppe commune des écrans gestion-eau.
 *
 * NOTE (correctif UI v3.19.0) : l'identité du module (logo, « AHUVI Eau », slogan) est
 * désormais portée UNIQUEMENT par le header partagé, et la navigation principale par le
 * BottomNav + la nav desktop du header. Ce shell ne rend donc plus de seconde barre de
 * navigation (ex-EauNav) ni de gros en-tête : juste un titre de section discret + le contenu.
 *
 * Aide contextuelle (v3.23.0) : si `aide` est fourni, un bouton ⓘ « Aide » apparaît près du
 * titre et le sous-titre devient cliquable ; tous deux déplient/replient le panneau d'aide
 * (« À quoi ça sert » / « Comment s'en servir »), mémorisé par écran.
 */
import { ReactNode } from 'react';
import { AideToggleButton, AidePanel, useAideState, type AideContenu } from './EauAide';

export default function EauPageShell({
  title,
  subtitle,
  actions,
  aide,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  aide?: AideContenu;
  children: ReactNode;
}) {
  // Un SEUL état d'aide partagé entre le bouton ⓘ, le sous-titre cliquable et le panneau.
  const aideState = useAideState(aide?.id ?? '');
  const panelId = aide ? `eau-aide-panel-${aide.id}` : undefined;

  return (
    <div className="max-w-3xl mx-auto px-3">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold text-ahuvi-forest font-ahuvi-body">{title}</h2>
            {aide && (
              <AideToggleButton open={aideState.open} onClick={aideState.toggle} controls={panelId!} />
            )}
            {subtitle && aide && (
              <button
                type="button"
                onClick={aideState.toggle}
                aria-expanded={aideState.open}
                aria-controls={panelId}
                className="basis-full text-left text-sm text-gray-500 mt-0.5 hover:text-ahuvi-olive focus:outline-none focus:text-ahuvi-olive"
              >
                {subtitle}
              </button>
            )}
          </div>
          {subtitle && !aide && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      {aide && <AidePanel id={aide.id} quoi={aide.quoi} comment={aide.comment} open={aideState.open} />}
      <div>{children}</div>
    </div>
  );
}
