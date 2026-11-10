// Inline SVG icons of the module (no icon library: nothing is imported from the host).
import type { ReactNode } from 'react';

export type NomIcone =
  | 'retour'
  | 'plus'
  | 'poubelle'
  | 'info'
  | 'alerte'
  | 'coche'
  | 'projets'
  | 'sommaire'
  | 'chiffres'
  | 'partager'
  | 'installer'
  | 'qr'
  | 'copier'
  | 'whatsapp'
  | 'chevron'
  | 'avion'
  | 'livre';

const TRACES: Record<NomIcone, ReactNode> = {
  retour: <path d="M15 5l-7 7 7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  poubelle: (
    <>
      <path d="M4 7h16M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5h.01" />
    </>
  ),
  alerte: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18h.01" />
    </>
  ),
  coche: <path d="M5 12l4 4 10-10" />,
  projets: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
    </>
  ),
  sommaire: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  chiffres: <path d="M5 20v-6M12 20V8M19 20V4M3 20h18" />,
  partager: (
    <>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" />
    </>
  ),
  installer: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </>
  ),
  copier: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a3.5 3.5 0 0 1-1.8-1.8l.8-1-1-2z" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  avion: <path d="M10.5 21l1.5-1 1.5 1v-2.5L12 17.5V13l8 2.5V13l-8-5V4.5a1.5 1.5 0 0 0-3 0V8l-8 5v2.5l8-2.5v4.5l-1.5 1z" />,
  livre: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 21V5M8 7h7" />
    </>
  )
};

export function Icone({ nom, className = 'w-5 h-5', titre }: { nom: NomIcone; className?: string; titre?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titre ? undefined : true}
      role={titre ? 'img' : undefined}
    >
      {titre ? <title>{titre}</title> : null}
      {TRACES[nom]}
    </svg>
  );
}
