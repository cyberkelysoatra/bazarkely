// PUDI-CC-16.2 e: inside WhatsApp / Facebook / Instagram / Messenger, Google refuses the sign-in.
// Shown on « Envoyer » before the Google button: open the same page in Chrome (intent address on
// Android, copy the link elsewhere), with the channel and the draft carried in the address.
import { useState } from 'react';
import { frPages } from '../i18n/frPages';
import { usePudi } from '../PudiContexte';
import { lireCanal } from '../appels/provenance';
import { pontNavy } from '../appels/pontNavy';
import { adresseChrome, estNavigateurInterne } from '../utils/navigateurInterne';
import { Icone } from './Icones';

export default function OuvrirDansChrome() {
  const { brouillon } = usePudi();
  const [copie, setCopie] = useState(false);
  if (typeof navigator === 'undefined' || pontNavy() || !estNavigateurInterne(navigator.userAgent)) return null;
  const t = frPages.navigateurInterne;
  const android = /Android/i.test(navigator.userAgent);
  const adresse = adresseChrome(window.location.href, brouillon, lireCanal(), android);
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(adresseChrome(window.location.href, brouillon, lireCanal(), false));
      setCopie(true);
    } catch {
      setCopie(false);
      window.prompt(t.copierManuel, adresseChrome(window.location.href, brouillon, lireCanal(), false));
    }
  };
  return (
    <div className="bg-[#FFF6E0] border border-[#E9D29A] rounded-xl p-3 space-y-2" role="note" data-navigateur-interne="">
      <p className="font-bold text-[0.9375rem] flex gap-2 items-start">
        <Icone nom="alerte" className="w-5 h-5 mt-0.5 shrink-0 text-[#9C3F21]" />
        {t.titre}
      </p>
      <p className="text-[0.875rem]">{t.explication}</p>
      {android ? (
        <a href={adresse} className="w-full min-h-[48px] rounded-xl bg-marine text-white font-bold text-[1rem] inline-flex items-center justify-center gap-2" data-ouvrir-chrome="">
          <Icone nom="droite" />
          {t.ouvrir}
        </a>
      ) : (
        <button type="button" onClick={() => void copier()} className="w-full min-h-[48px] rounded-xl bg-marine text-white font-bold text-[1rem] inline-flex items-center justify-center gap-2" data-copier-lien="">
          <Icone nom="copier" />
          {copie ? t.copie : t.copier}
        </button>
      )}
      <p className="text-[0.8125rem] text-gris">{t.garde}</p>
    </div>
  );
}
