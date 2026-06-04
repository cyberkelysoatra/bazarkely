/**
 * Panneau de gestion des QR d'un compteur (admin) — ouvert depuis la liste des compteurs.
 * Plusieurs QR par compteur (un par emplacement), chacun : aperçu, export JPEG, suppression.
 * Page d'étiquettes imprimable pour tous les QR du compteur. Journal des scans du compteur.
 */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  listQrForCompteur,
  createQrCompteur,
  deleteQrCompteur,
} from '../services/eauQrService';
import { listScansForCompteur } from '../services/eauScanService';
import { buildScanUrl } from '../utils/scanUrl';
import { qrToJpegDataUrl, downloadQrJpeg, printQrLabels, safeFileName } from '../utils/qrImage';
import { fmtDate } from '../utils/format';
import { showConfirm } from '../../../utils/dialogUtils';
import type { CompteurLocal, QrCompteurLocal, ScanLocal } from '../types/gestionEau';

export default function EauQrCompteurManager({
  compteur,
  onClose,
}: {
  compteur: CompteurLocal;
  onClose: () => void;
}) {
  const [qrs, setQrs] = useState<QrCompteurLocal[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [scans, setScans] = useState<ScanLocal[]>([]);
  const [emplacement, setEmplacement] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const list = await listQrForCompteur(compteur.id);
    setQrs(list);
    setScans(await listScansForCompteur(compteur.id));
    // Aperçus JPEG (data URLs) en parallèle.
    const entries = await Promise.all(
      list.map(async (q) => [q.id, await qrToJpegDataUrl(buildScanUrl('compteur', q.code), 256)] as const)
    );
    setPreviews(Object.fromEntries(entries));
  }, [compteur.id]);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  const addQr = async () => {
    setBusy(true);
    try {
      await createQrCompteur(compteur.id, emplacement || null);
      setEmplacement('');
      await reload();
      toast.success('QR généré');
    } finally {
      setBusy(false);
    }
  };

  const removeQr = async (q: QrCompteurLocal) => {
    if (!(await showConfirm(`Supprimer ce QR (${q.emplacement ?? q.code}) ?`, 'Suppression QR', { variant: 'danger', confirmText: 'Supprimer' }))) return;
    await deleteQrCompteur(q.id);
    await reload();
    toast.success('QR supprimé');
  };

  const exportJpeg = async (q: QrCompteurLocal) => {
    try {
      await downloadQrJpeg(
        buildScanUrl('compteur', q.code),
        `QR_${safeFileName(compteur.nom)}_${safeFileName(q.emplacement ?? q.code)}`
      );
    } catch {
      toast.error('Échec de l’export JPEG');
    }
  };

  const printLabels = async () => {
    try {
      await printQrLabels(
        qrs.map((q) => ({
          text: buildScanUrl('compteur', q.code),
          titre: compteur.nom,
          sousTitre: q.emplacement ?? q.code,
        })),
        `Étiquettes QR — ${compteur.nom}`
      );
    } catch (e: any) {
      toast.error(e?.message ?? 'Échec de l’impression');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-ahuvi-forest">QR — {compteur.nom}</h3>
            <p className="text-xs text-gray-500">{compteur.zone ?? 'Sans zone'} · {compteur.type}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Ajout d'un QR */}
          <div className="rounded-xl border border-ahuvi-200 bg-ahuvi-50/40 p-3 space-y-2">
            <label className="text-sm block">
              <span className="block text-gray-600 mb-1">Emplacement (libellé)</span>
              <input
                value={emplacement}
                onChange={(e) => setEmplacement(e.target.value)}
                placeholder="ex. Entrée villa, Regard, Local technique…"
                className="w-full rounded-lg border-gray-300 focus:border-ahuvi-forest focus:ring-ahuvi-forest text-sm"
              />
            </label>
            <button
              onClick={addQr}
              disabled={busy}
              className="w-full bg-ahuvi-forest hover:bg-ahuvi-olive disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              + Générer un QR
            </button>
          </div>

          {/* Liste des QR */}
          {loading ? (
            <div className="text-gray-400 text-sm py-6 text-center">Chargement…</div>
          ) : qrs.length === 0 ? (
            <div className="text-gray-400 text-sm py-6 text-center">
              Aucun QR pour ce compteur. Générez-en un ci-dessus.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">{qrs.length} QR</h4>
                <button onClick={printLabels} className="text-sm text-ahuvi-forest hover:underline">
                  🖨️ Imprimer les étiquettes
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {qrs.map((q) => (
                  <div key={q.id} className="flex items-center gap-3 border border-gray-200 rounded-lg p-2">
                    {previews[q.id] ? (
                      <img src={previews[q.id]} alt={`QR ${q.code}`} className="w-20 h-20 flex-shrink-0 rounded" />
                    ) : (
                      <div className="w-20 h-20 flex-shrink-0 rounded bg-gray-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{q.emplacement ?? 'Sans emplacement'}</div>
                      <div className="text-xs text-gray-400 font-mono">{q.code}</div>
                      <div className="flex gap-3 mt-1 text-sm">
                        <button onClick={() => exportJpeg(q)} className="text-ahuvi-forest hover:underline">
                          ⬇️ JPEG
                        </button>
                        <button onClick={() => removeQr(q)} className="text-rose-600 hover:underline">
                          Suppr.
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Journal des scans du compteur */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Journal des scans</h4>
            {scans.length === 0 ? (
              <div className="text-gray-400 text-xs py-3 text-center">Aucun scan enregistré pour ce compteur.</div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {scans.map((s) => (
                  <div key={s.id} className="text-xs border border-gray-100 rounded px-2 py-1.5 flex items-center justify-between gap-2">
                    <span className="truncate">
                      <span className="font-medium text-gray-700">{s.emplacement ?? '—'}</span>
                      <span className="text-gray-400"> · {s.role ?? '?'}</span>
                    </span>
                    <span className="text-gray-400 flex-shrink-0">{fmtDate(s.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
