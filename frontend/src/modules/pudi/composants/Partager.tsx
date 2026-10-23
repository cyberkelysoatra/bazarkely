// « Partager à mes contacts » (ergonomics approved by JOEL on 23/10/2026): WhatsApp with a short
// prefilled invitation and the link carrying the visitor's channel, plus the phone's own share
// sheet when the browser offers one. No personal data in the text.
import { fr } from '../i18n/fr';
import { lireCanal } from '../appels/provenance';
import { Icone } from './Icones';
import { boutonSecondaire } from './Mise';

/** Link to the consultation with the channel the visitor came from (none: plain /pudi/). */
export function lienPartage(origine: string, canal: string | null): string {
  return `${origine}/pudi/${canal ? `?c=${encodeURIComponent(canal)}` : ''}`;
}

export function lienWhatsApp(origine: string, canal: string | null): string {
  return `https://wa.me/?text=${encodeURIComponent(`${fr.vote.partageTexte} ${lienPartage(origine, canal)}`)}`;
}

export function BoutonsPartage() {
  const origine = window.location.origin;
  const canal = lireCanal();
  const natif = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  return (
    <div className="flex flex-col gap-2" data-partage="">
      <a href={lienWhatsApp(origine, canal)} target="_blank" rel="noopener noreferrer" className={`${boutonSecondaire} w-full`} data-partage-whatsapp="">
        <Icone nom="discussion" />
        {fr.vote.partager}
      </a>
      {natif && (
        <button
          type="button"
          className="self-center min-h-[44px] px-3 text-marine font-bold text-[0.875rem] underline underline-offset-2"
          onClick={() => void navigator.share({ title: fr.app.titreCourt, text: fr.vote.partageTexte, url: lienPartage(origine, canal) }).catch(() => undefined)}
          data-partage-natif=""
        >
          {fr.vote.partagerAutre}
        </button>
      )}
    </div>
  );
}
