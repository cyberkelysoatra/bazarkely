/** Facturation /gestion-eau/facturation (admin) : période → factures numérotées,
 *  statut payé/impayé, relances, export PDF par compteur + CSV global. */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import EauPageShell from './EauPageShell';
import { getConfig } from '../services/eauConfigService';
import { isConfigComplete, configMissingFields } from '../utils/facture';
import {
  previewFactures,
  genererFactures,
  listFactures,
  setStatutFacture,
  relancerFacture,
  buildExportCsv,
  type FacturePreview,
} from '../services/eauFactureService';
import { listCompteurs } from '../services/eauCompteurService';
import { downloadFacturePdf } from '../utils/pdf';
import { downloadCsv } from '../utils/csv';
import { fmtMontant, fmtM3, fmtDate } from '../utils/format';
import type { ConfigLocal, FactureLocal, CompteurLocal } from '../types/gestionEau';

function toIsoStartOfDay(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}
function toIsoEndOfDay(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59`).toISOString();
}
function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function EauFacturationPage() {
  const [config, setConfig] = useState<ConfigLocal | null>(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [previews, setPreviews] = useState<FacturePreview[] | null>(null);
  const [factures, setFactures] = useState<FactureLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [busy, setBusy] = useState(false);

  const reloadFactures = useCallback(async () => {
    setFactures(await listFactures());
  }, []);

  useEffect(() => {
    (async () => {
      const cfg = await getConfig();
      setConfig(cfg);
      const periode = cfg?.periode_facturation_jours ?? 30;
      const now = new Date();
      const startD = new Date(now.getTime() - periode * 24 * 3600 * 1000);
      setEnd(toDateInput(now));
      setStart(toDateInput(startD));
      setCompteurs(await listCompteurs());
      await reloadFactures();
      setLoading(false);
    })();
  }, [reloadFactures]);

  const complete = isConfigComplete(config);
  const compteurNom = (id: string | null) =>
    (id && compteurs.find((c) => c.id === id)?.nom) || id || '—';

  const runPreview = async () => {
    if (!start || !end) {
      toast.error('Choisissez une période');
      return;
    }
    setBusy(true);
    try {
      const p = await previewFactures(toIsoStartOfDay(start), toIsoEndOfDay(end));
      setPreviews(p);
    } finally {
      setBusy(false);
    }
  };

  const runGenerate = async () => {
    setBusy(true);
    try {
      const created = await genererFactures(toIsoStartOfDay(start), toIsoEndOfDay(end));
      if (created.length === 0) {
        toast('Aucune facture générée (déjà facturé ou aucun relevé exploitable).', { icon: 'ℹ️' });
      } else {
        toast.success(`${created.length} facture(s) générée(s)`);
      }
      setPreviews(null);
      await reloadFactures();
    } finally {
      setBusy(false);
    }
  };

  const toggleStatut = async (f: FactureLocal) => {
    await setStatutFacture(f.id, f.statut === 'paye' ? 'impaye' : 'paye');
    await reloadFactures();
  };

  const relancer = async (f: FactureLocal) => {
    await relancerFacture(f.id);
    await reloadFactures();
    toast.success('Relance enregistrée');
  };

  const exportPdf = async (f: FactureLocal) => {
    try {
      await downloadFacturePdf({
        facture: f,
        config,
        compteur: compteurs.find((c) => c.id === f.compteur_id) ?? null,
      });
    } catch {
      toast.error('Échec de la génération PDF');
    }
  };

  const exportCsv = async () => {
    try {
      const csv = await buildExportCsv();
      downloadCsv(`gestion-eau-export-${toDateInput(new Date())}`, csv);
    } catch {
      toast.error('Échec de l’export CSV');
    }
  };

  return (
    <EauPageShell
      title="Facturation"
      subtitle="Génération des factures par période (admin)"
      actions={
        <button
          onClick={exportCsv}
          className="bg-white border border-sky-200 text-sky-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-sky-50"
        >
          ⬇️ CSV global
        </button>
      }
    >
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : !complete ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <div className="font-semibold text-amber-800 mb-1">Configurer d’abord</div>
          <p className="text-amber-700">
            La facturation est bloquée tant que la configuration n’est pas complète. Champs manquants :
          </p>
          <ul className="list-disc list-inside text-amber-700 mt-1">
            {configMissingFields(config).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <a href="/gestion-eau/config" className="inline-block mt-2 text-sky-700 font-medium underline">
            Aller à la configuration →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Période */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
            <h2 className="font-semibold text-gray-800 mb-3">Période</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Début</span>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Fin</span>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                />
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={runPreview}
                disabled={busy}
                className="flex-1 bg-white border border-sky-300 text-sky-700 font-medium py-2.5 rounded-lg hover:bg-sky-50 disabled:opacity-50"
              >
                Aperçu
              </button>
              <button
                onClick={runGenerate}
                disabled={busy}
                className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg"
              >
                Générer les factures
              </button>
            </div>
          </div>

          {/* Aperçu */}
          {previews && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-soft">
              <h2 className="font-semibold text-gray-800 mb-2">Aperçu</h2>
              <div className="space-y-1">
                {previews.map((p) => (
                  <div key={p.compteur.id} className="flex items-center justify-between text-sm py-1 border-b border-sky-100 last:border-0">
                    <span className="text-gray-800">{p.compteur.nom}</span>
                    {p.skipRaison ? (
                      <span className="text-gray-400 italic">{p.skipRaison}</span>
                    ) : (
                      <span className="text-gray-700">
                        {fmtM3(p.conso)} → <strong>{fmtMontant(p.montant, config?.devise)}</strong>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste des factures */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Factures émises ({factures.length})</h2>
            {factures.length === 0 ? (
              <div className="text-gray-400 text-sm py-6 text-center">Aucune facture pour l’instant.</div>
            ) : (
              <div className="space-y-2">
                {factures.map((f) => (
                  <div key={f.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-soft">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-gray-900">{f.numero}</div>
                        <div className="text-xs text-gray-500">
                          {compteurNom(f.compteur_id)} · {fmtDate(f.periode_start)} → {fmtDate(f.periode_end)}
                        </div>
                        <div className="text-sm text-gray-700 mt-0.5">
                          {fmtM3(f.conso_m3)} · <strong>{fmtMontant(f.montant, f.devise)}</strong>
                        </div>
                        {f.relance_count > 0 && (
                          <div className="text-xs text-rose-600 mt-0.5">Relances : {f.relance_count}</div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleStatut(f)}
                        className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
                          f.statut === 'paye'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                        title="Basculer le statut"
                      >
                        {f.statut === 'paye' ? '✓ Payée' : '✗ Impayée'}
                      </button>
                    </div>
                    <div className="flex gap-3 mt-2 text-sm">
                      <button onClick={() => exportPdf(f)} className="text-sky-600 hover:underline">
                        📄 PDF
                      </button>
                      {f.statut === 'impaye' && (
                        <button onClick={() => relancer(f)} className="text-amber-600 hover:underline">
                          🔔 Relancer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </EauPageShell>
  );
}
