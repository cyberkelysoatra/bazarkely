// PUDI-CC-09: notice shown to the person whose vote was masked automatically. Not dismissible
// while the masking is active (it can be collapsed). Two buttons side by side: e-mail to the
// GIHTNB (always) and WhatsApp to the manager (only when the server gives his number, and only
// until the lists are frozen).
import { useEffect, useRef, useState } from 'react';
import { fr } from '../i18n/fr';
import { usePudi } from '../PudiContexte';
import { marquerMasquagesVus } from '../appels/masquages';
import { useSessionLocale } from '../appels/session';
import { dateGel, lienCourrielMasquage, lienWhatsAppMasquage, reclamationsOuvertes } from '../utils/masquage';
import { Icone } from './Icones';

const T = fr.masquage;
const bouton =
  'pudi-focus flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 min-h-[48px] px-2.5 py-2 rounded-xl font-bold text-[14px] leading-tight text-center';

let vusCetteSession = false;

export function BandeauMasquage({ toujoursOuvert = false }: { toujoursOuvert?: boolean }) {
  const { masquages, decalage } = usePudi();
  const email = useSessionLocale()?.email ?? '';
  const [replie, setReplie] = useState(false);
  const marque = useRef(false);
  const m = masquages[0];

  useEffect(() => {
    if (!m || marque.current || vusCetteSession) return;
    marque.current = true;
    vusCetteSession = true;
    marquerMasquagesVus().catch(() => {
      vusCetteSession = false;
    });
  }, [m]);

  if (!m) return null;
  const ouvertes = reclamationsOuvertes(m.gel_listes_at, Date.now() + decalage);
  const ouvert = toujoursOuvert || !replie;
  return (
    <div role="alert" className="border-l-4 border-[#B85317] bg-white rounded-r-lg shadow-sm" data-masquage={m.id}>
      <div className="flex items-start gap-2.5 px-3 pt-2.5">
        <Icone nom="alerte" className="w-5 h-5 mt-0.5 text-[#B85317] shrink-0" />
        <p className="flex-1 min-w-0 font-bold text-[15px]">{T.titre}</p>
        {!toujoursOuvert && (
          <button
            type="button"
            onClick={() => setReplie((r) => !r)}
            aria-expanded={ouvert}
            className="pudi-focus -my-2 min-h-[44px] px-2 text-marine font-bold text-[14px] flex items-center gap-1"
          >
            {ouvert ? T.replier : T.deplier}
            <Icone nom="bas" className={`w-4 h-4 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {ouvert && (
        <div className="px-3 pb-3 pt-1 space-y-2.5">
          <p className="text-[15px] leading-snug" data-masquage-texte="">
            {ouvertes ? T.texte(dateGel(m.gel_listes_at)) : T.fige(dateGel(m.gel_listes_at))}
          </p>
          <p className="text-[13px] text-gris">{T.reference(m.id)}</p>
          <div className="flex gap-2" data-masquage-boutons="">
            <a href={lienCourrielMasquage(m.id, email)} className={`${bouton} bg-marine text-white`} data-lien="courriel">
              <Icone nom="message" className="w-4 h-4 shrink-0" />
              {T.courriel}
            </a>
            {ouvertes && m.whatsapp && (
              <a
                href={lienWhatsAppMasquage(m.whatsapp, m.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${bouton} bg-white text-marine border-2 border-marine`}
                data-lien="whatsapp"
              >
                <Icone nom="personnes" className="w-4 h-4 shrink-0" />
                {T.whatsapp}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
