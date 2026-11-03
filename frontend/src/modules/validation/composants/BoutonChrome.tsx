// « Ouvrir dans Chrome » (dictation and installation inside a messaging app's browser): the Android
// intent address of the current page; elsewhere, the link is copied (« Lien copié : collez-le dans
// Chrome »).
import { useState } from 'react';
import { adresseChrome } from '../utils/regles';
import { TEXTES_DICTEE } from '../utils/dictee';
import { Icone } from './Icones';
import { SECONDAIRE } from './Mise';

export function BoutonChrome({ className = '' }: { className?: string }) {
  const [copie, setCopie] = useState<string | null>(null);
  const android = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  if (android) {
    return (
      <a href={adresseChrome(window.location.href, true)} className={`${SECONDAIRE} !min-h-11 !text-[15px] ${className}`} data-ouvrir-chrome="">
        <Icone nom="chrome" />
        Ouvrir dans Chrome
      </a>
    );
  }
  return (
    <>
      <button
        type="button"
        className={`${SECONDAIRE} !min-h-11 !text-[15px] ${className}`}
        onClick={async () => {
          const lien = adresseChrome(window.location.href, false);
          try {
            await navigator.clipboard.writeText(lien);
            setCopie(`${TEXTES_DICTEE.lienCopie}.`);
          } catch {
            setCopie(`Copiez ce lien et ouvrez-le dans Chrome : ${lien}`);
          }
        }}
        data-ouvrir-chrome=""
      >
        <Icone nom="chrome" />
        Ouvrir dans Chrome
      </button>
      {copie && (
        <p className="text-[13px] text-doux m-0 break-words" role="status" data-lien-copie="">
          {copie}
        </p>
      )}
    </>
  );
}
