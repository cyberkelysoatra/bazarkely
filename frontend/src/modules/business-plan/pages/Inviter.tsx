// /plan/inviter: QR code of the invitation link, the link in clear, copy, WhatsApp. Works offline once loaded.
import { useEffect, useState } from 'react';
import { Mise } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { copierTexte, lienWhatsApp } from '../utils/partage';

export const LIEN_INVITATION = 'https://1sakely.org/plan/?code=NEC2026';

export default function Inviter() {
  const [svg, setSvg] = useState('');
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    let fin = false;
    // qrcode is loaded on demand only (kept in the offline cache with the rest of the build).
    import('qrcode')
      .then((QR) => QR.toString(LIEN_INVITATION, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#333333', light: '#FFFFFF' } }))
      .then((s) => {
        if (!fin) setSvg(s);
      })
      .catch(() => undefined);
    return () => {
      fin = true;
    };
  }, []);

  const copier = async () => {
    setCopie(await copierTexte(LIEN_INVITATION));
    window.setTimeout(() => setCopie(false), 3000);
  };

  const message = `Remplissez votre business plan NEC 2026 sur votre téléphone, même sans connexion : ${LIEN_INVITATION}`;

  return (
    <Mise titre="Inviter un participant" sousTitre="Faites scanner ce code avec l'appareil photo" retour={{ vers: '/', texte: 'Mes projets' }}>
      <div className="rounded-2xl border border-filet bg-white p-4">
        <div
          className="bp-qr mx-auto w-full max-w-[300px] aspect-square [&_svg]:w-full [&_svg]:h-full"
          role="img"
          aria-label={`QR code du lien ${LIEN_INVITATION}`}
          data-contenu={LIEN_INVITATION}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="bp-lien mt-3 text-center text-[16px] font-bold text-violet break-all">{LIEN_INVITATION}</p>
      </div>
      <div className="grid gap-2.5 mt-4">
        <button type="button" onClick={copier} className="min-h-[52px] rounded-xl bg-violet text-white text-[17px] font-bold flex items-center justify-center gap-2">
          <Icone nom={copie ? 'coche' : 'copier'} /> {copie ? 'Lien copié' : 'Copier le lien'}
        </button>
        <a
          href={lienWhatsApp(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[52px] rounded-xl bg-[#1A7F47] text-white text-[17px] font-bold flex items-center justify-center gap-2"
        >
          <Icone nom="whatsapp" /> Envoyer par WhatsApp
        </a>
      </div>
    </Mise>
  );
}
