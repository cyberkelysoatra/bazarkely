// Inline SVG icons of the module (no icon library: nothing is imported from the host).
import type { ReactNode } from 'react';

type Nom = 'horloge' | 'whatsapp' | 'alerte' | 'retour' | 'personne' | 'installer' | 'sortir' | 'coche' | 'chrome';

const TRACES: Record<Nom, ReactNode> = {
  horloge: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  whatsapp: <path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z" />,
  alerte: (
    <>
      <path d="M12 7v6M12 17h.01" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  retour: <path d="M15 5l-7 7 7 7" />,
  personne: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  installer: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  sortir: (
    <>
      <path d="M15 4h4v16h-4" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </>
  ),
  coche: <path d="M5 12l4 4 10-10" />,
  chrome: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 8.5h8.5M8.97 13.75L4.7 6.4M15.03 13.75l-4.27 7.2" />
    </>
  )
};

export function Icone({ nom, className = 'w-5 h-5', epaisseur = 2 }: { nom: Nom; className?: string; epaisseur?: number }) {
  return (
    <svg className={`${className} flex-none`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={epaisseur} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRACES[nom]}
    </svg>
  );
}

/** Google « G » in its four colours (button « Continuer avec Google »). */
export function LogoGoogle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}
