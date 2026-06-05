/**
 * Anomalies /gestion-eau/anomalies (releveur/admin) : liste chronologique des
 * bilans, filtre « anomalies seulement », marquer « traitée » + commentaire.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import EauPageShell from './EauPageShell';
import { AIDE } from './eauAideTextes';
import { listBilans, markBilanTraitee, refreshBilans } from '../services/eauBilanService';
import { fmtM3, fmtPct, fmtDate } from '../utils/format';
import type { BilanLocal } from '../types/gestionEau';

export default function EauAnomaliesPage() {
  const [bilans, setBilans] = useState<BilanLocal[]>([]);
  const [anomaliesOnly, setAnomaliesOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setBilans(await listBilans({ anomaliesOnly }));
  };

  useEffect(() => {
    (async () => {
      await refreshBilans(navigator.onLine);
      await reload();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anomaliesOnly]);

  const traiter = async (b: BilanLocal) => {
    const commentaire = window.prompt('Commentaire de traitement (optionnel) :', b.commentaire ?? '') ?? '';
    await markBilanTraitee(b.id, commentaire);
    await reload();
    toast.success('Bilan marqué comme traité');
  };

  return (
    <EauPageShell title="Anomalies" subtitle="Historique des bilans" aide={AIDE.anomalies}>
      <label className="flex items-center gap-2 text-sm mb-3">
        <input
          type="checkbox"
          checked={anomaliesOnly}
          onChange={(e) => setAnomaliesOnly(e.target.checked)}
          className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="text-gray-700">Anomalies seulement</span>
      </label>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : bilans.length === 0 ? (
        <div className="text-gray-400 text-sm py-8 text-center">
          {anomaliesOnly ? 'Aucune anomalie.' : 'Aucun bilan pour l\'instant.'}
        </div>
      ) : (
        <div className="space-y-2">
          {bilans.map((b) => (
            <div
              key={b.id}
              className={`rounded-xl border p-3 shadow-soft ${
                b.anomalie ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{fmtDate(b.timestamp)}</span>
                <span className={`text-sm font-semibold ${b.anomalie ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {b.anomalie ? '⚠️ Anomalie' : '✅ OK'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm text-gray-700 mt-1">
                <span>Entrées : {fmtM3(b.entrees_m3)}</span>
                <span>Conso : {fmtM3(b.conso_m3)}</span>
                <span>Attendu : {fmtM3(b.stock_attendu)}</span>
                <span>Mesuré : {fmtM3(b.stock_mesure)}</span>
                <span className="col-span-2 font-medium">
                  Écart : {fmtM3(b.ecart_m3)} ({fmtPct(b.ecart_pct)})
                </span>
              </div>
              {b.commentaire && (
                <div className="text-xs text-gray-500 mt-1 italic">« {b.commentaire} »</div>
              )}
              <div className="mt-2 flex items-center justify-between">
                {b.traitee ? (
                  <span className="text-xs text-emerald-700 font-medium">✔ Traitée</span>
                ) : (
                  <span className="text-xs text-gray-400">Non traitée</span>
                )}
                {!b.traitee && (
                  <button onClick={() => traiter(b)} className="text-sm text-sky-600 hover:underline">
                    Marquer traitée
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </EauPageShell>
  );
}
