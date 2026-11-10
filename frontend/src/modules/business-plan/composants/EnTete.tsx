// Violet header of every screen (charter of the NEC 2026 workbook): a top band with the NEC logo on the
// left and the B-lossom Center logo (white) on the right, a thin separator, then overline, title and
// subtitle (decision of 10/11/2026, MODÈLE A). The logos are precached: they show in airplane mode; a
// missing file is hidden without moving anything.
import type { ReactNode, SyntheticEvent } from 'react';

const cacher = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = 'hidden';
};

export function EnTete({ titre, sousTitre, droite, surTitre = 'Mon business plan' }: { titre: ReactNode; sousTitre?: ReactNode; droite?: ReactNode; surTitre?: string | null }) {
  return (
    <header className="bp-entete bg-violet text-white px-4 pb-4">
      <div className="bp-logos flex items-center justify-between h-[34px]">
        <img src="/plan/logos/nec-logo-v1.png" alt="Nosy Be Entrepreneurship Camp 2026" width={49} height={30} className="h-[30px] w-auto" onError={cacher} />
        <img src="/plan/logos/blossom-blanc-v1.png" alt="B-lossom Center, organisateur" width={35} height={34} className="h-[34px] w-auto" onError={cacher} />
      </div>
      <div className="h-px bg-[#8A3A84] mt-[5px] mb-[5px]" aria-hidden="true" />
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
