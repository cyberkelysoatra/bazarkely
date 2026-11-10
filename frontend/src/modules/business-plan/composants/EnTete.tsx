// Violet header of every screen (charter of the NEC workbook).
import type { ReactNode } from 'react';

export function EnTete({ titre, sousTitre, droite, surTitre = 'Mon business plan' }: { titre: ReactNode; sousTitre?: ReactNode; droite?: ReactNode; surTitre?: string | null }) {
  return (
    <header className="bp-entete bg-violet text-white px-4 pb-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {surTitre ? <p className="text-[13px] font-bold tracking-wide uppercase opacity-80">{surTitre}</p> : null}
          <h1 className="text-[22px] font-bold leading-tight mt-0.5 break-words">{titre}</h1>
          {sousTitre ? <p className="text-[15px] opacity-90 mt-1 leading-snug">{sousTitre}</p> : null}
        </div>
        {droite}
      </div>
    </header>
  );
}
