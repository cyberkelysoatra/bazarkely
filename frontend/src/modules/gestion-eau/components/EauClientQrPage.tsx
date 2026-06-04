/**
 * Onglet « Mon QR » de l'espace client. Affiche le QR personnel du client (encode
 * `…/gestion-eau/scan?t=cl&k=<code_qr>`), téléchargeable en JPEG. Un releveur/admin qui
 * scanne ce QR ouvre la fiche conso du client ; un autre client obtient un refus.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getCompteClientForUser } from '../services/eauCompteClientService';
import { buildScanUrl } from '../utils/scanUrl';
import { qrToJpegDataUrl, downloadQrJpeg, safeFileName } from '../utils/qrImage';
import type { CompteClientLocal } from '../types/gestionEau';

export default function EauClientQrPage({ userId }: { userId: string | null }) {
  const [compte, setCompte] = useState<CompteClientLocal | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      const c = await getCompteClientForUser(userId);
      setCompte(c);
      if (c?.code_qr) {
        setDataUrl(await qrToJpegDataUrl(buildScanUrl('client', c.code_qr), 320));
      }
      setLoading(false);
    })();
  }, [userId]);

  const download = async () => {
    if (!compte?.code_qr) return;
    try {
      await downloadQrJpeg(buildScanUrl('client', compte.code_qr), `MonQR_${safeFileName(compte.nom)}`);
    } catch {
      toast.error('Échec de l’export JPEG');
    }
  };

  if (loading) {
    return <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>;
  }
  if (!compte) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
        Aucun compte client associé. Contactez l’administrateur.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-3 py-2">
      <p className="text-sm text-gray-600">
        Présentez ce QR au releveur. Il ouvre votre fiche de consommation et vos factures.
      </p>
      {dataUrl ? (
        <img src={dataUrl} alt="Mon QR client" className="w-56 h-56 rounded-xl border border-gray-200 shadow-soft" />
      ) : (
        <div className="w-56 h-56 rounded-xl bg-gray-100" />
      )}
      <div className="text-xs text-gray-400 font-mono">{compte.code_qr}</div>
      <button
        onClick={download}
        className="bg-ahuvi-forest hover:bg-ahuvi-olive text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
      >
        ⬇️ Télécharger en JPEG
      </button>
    </div>
  );
}
