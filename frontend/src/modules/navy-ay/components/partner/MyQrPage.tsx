/**
 * "Mon QR" (phase 1A, approved grocer / driver): the personal QR code shown big, with
 * the NAVY ay logo, the name and — for a driver — the licence plate in big letters.
 * "Télécharger" saves this same card as a PNG ready to print. Works offline (the QR
 * is drawn on the phone).
 */
import { useEffect, useState } from 'react';
import { Download, QrCode } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import { useNavyRoles } from '../../context/useNavyRoles';
import { useNavyProfile } from '../../services/navyProfileStore';
import type { NavyPartnerRow } from '../../types/partner';
import { downloadCanvasPng, renderQrCard } from '../../utils/qrCard';
import { btnPrimary, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

function cardName(row: NavyPartnerRow): string {
  return (row.kind === 'epicier' ? row.shop_name || row.display_name : row.display_name) || 'Partenaire NAVY ay';
}

export default function MyQrPage() {
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const { activeRole } = useNavyRoles();
  const approved = profile.userId === userId ? profile.partners.filter((p) => p.status === 'approved') : [];
  // The QR of the active role; else the only approved profile.
  const row = approved.find((p) => p.kind === activeRole) ?? approved[0];
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const name = row ? cardName(row) : '';
  const plate = row?.kind === 'chauffeur' ? row.vehicle_plate : null;

  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    setFailed(false);
    renderQrCard({ partnerId: row.id, kind: row.kind, name, plate })
      .then((c) => {
        if (cancelled) return;
        setCanvas(c);
        setDataUrl(c.toDataURL('image/png'));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [row?.id, row?.kind, name, plate]);

  if (!row) return null; // guarded by NavyRoleRoute

  const fileName = `navy-ay-qr-${(plate || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'partenaire'}.png`;

  return (
    <NavyPage>
      <NavyPageTitle icon={QrCode} title="Mon QR code" subtitle="Collez-le sur votre boutique ou votre véhicule." />

      {failed ? (
        <NavyNotice tone="error">Le QR code n’a pas pu être dessiné. Rechargez la page.</NavyNotice>
      ) : !dataUrl ? (
        <NavyLoader label="Préparation du QR code" />
      ) : (
        <figure className="rounded-3xl border border-navyay-charcoal/10 bg-white p-2 shadow-sm">
          <img
            src={dataUrl}
            alt={`QR code NAVY ay de ${name}${plate ? `, immatriculation ${plate}` : ''}`}
            className="mx-auto w-full max-w-md h-auto"
          />
        </figure>
      )}

      <button
        type="button"
        disabled={!canvas}
        onClick={() => canvas && downloadCanvasPng(canvas, fileName)}
        className={`${btnPrimary} w-full`}
      >
        <Download className="w-5 h-5" aria-hidden="true" />
        Télécharger (image à imprimer)
      </button>

      <NavyHelp title="À quoi sert ce QR code ?">
        <p>Un client le scanne avec l’appareil photo de son téléphone : il voit que vous êtes un partenaire NAVY ay validé.</p>
        {row.kind === 'chauffeur' && <p>Il compare l’immatriculation affichée avec celle de votre véhicule : c’est une garantie pour lui.</p>}
        <p>Une personne qui rejoint NAVY ay grâce à votre QR code est enregistrée comme votre filleul.</p>
      </NavyHelp>
    </NavyPage>
  );
}
