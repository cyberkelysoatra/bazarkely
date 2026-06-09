/** Facturation /gestion-eau/facturation (admin) : période → factures numérotées,
 *  statut payé/impayé, relances, export PDF par compteur + CSV global. */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  Receipt, FileBarChart, Eye, FileDown, Bell, Download, BadgeCheck, CircleAlert, Settings,
} from 'lucide-react';
import EauPageShell from './EauPageShell';
import EauAide from './EauAide';
import { EauIconButton, EauEmptyState } from './EauUi';
import { EauReadOnlyBadge } from './EauReadOnly';
import { AIDE } from './eauAideTextes';
import EauTabs from './EauTabs';
import { useGestionEau } from '../context';
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
import { listCouts } from '../services/eauElecCoutService';
import { listCompteurs } from '../services/eauCompteurService';
import { downloadFactureCombineePdf } from '../utils/pdf';
import { downloadCsv } from '../utils/csv';
import { fmtMontant, fmtM3, fmtKwh, fmtDate } from '../utils/format';
import type { ConfigLocal, FactureLocal, CompteurLocal, ElecCoutLocal } from '../types/gestionEau';

function toIsoStartOfDay(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}
function toIsoEndOfDay(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59`).toISOString();
}
function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Libellé lisible d'un mois `YYYY-MM` (ex. « juin 2025 »). */
function moisLabel(mois: string): string {
  const [y, m] = mois.split('-').map(Number);
  if (!y || !m) return mois;
  return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function EauFacturationPage() {
  const navigate = useNavigate();
  const { isReadOnly } = useGestionEau();
  const [config, setConfig] = useState<ConfigLocal | null>(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [previews, setPreviews] = useState<FacturePreview[] | null>(null);
  const [factures, setFactures] = useState<FactureLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [couts, setCouts] = useState<ElecCoutLocal[]>([]);
  const [coutMois, setCoutMois] = useState('');
  const [busy, setBusy] = useState(false);
  // Onglets internes du thème : Factures (génération + liste) · Rapports (exports).
  const [view, setView] = useState<'factures' | 'rapports'>('factures');

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
      const coutsList = await listCouts();
      setCouts(coutsList);
      // Par défaut : le mois de coûts le plus récent (liste déjà triée décroissant).
      if (coutsList.length > 0) setCoutMois(coutsList[0].mois);
      await reloadFactures();
      setLoading(false);
    })();
  }, [reloadFactures]);

  const complete = isConfigComplete(config);
  const compteurNom = (id: string | null) =>
    (id && compteurs.find((c) => c.id === id)?.nom) || id || '—';

  // Agrégat pour les graphiques : conso (m³) et montant facturé par période (mois de début).
  const parPeriode = useMemo(() => {
    const map = new Map<string, { label: string; ms: number; conso: number; montant: number }>();
    for (const f of factures) {
      const d = new Date(f.periode_start);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const cur = map.get(key);
      if (cur) {
        cur.conso += f.conso_m3 ?? 0;
        cur.montant += f.montant ?? 0;
      } else {
        map.set(key, { label, ms: new Date(`${key}-01`).getTime(), conso: f.conso_m3 ?? 0, montant: f.montant ?? 0 });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.ms - b.ms);
  }, [factures]);

  const runPreview = async () => {
    if (!start || !end) {
      toast.error('Choisissez une période');
      return;
    }
    setBusy(true);
    try {
      const p = await previewFactures(toIsoStartOfDay(start), toIsoEndOfDay(end), coutMois || null);
      setPreviews(p);
    } finally {
      setBusy(false);
    }
  };

  const runGenerate = async () => {
    if (isReadOnly) return;
    setBusy(true);
    try {
      const created = await genererFactures(toIsoStartOfDay(start), toIsoEndOfDay(end), {
        coutMois: coutMois || null,
      });
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
    if (isReadOnly) return;
    await setStatutFacture(f.id, f.statut === 'paye' ? 'impaye' : 'paye');
    await reloadFactures();
  };

  const relancer = async (f: FactureLocal) => {
    if (isReadOnly) return;
    await relancerFacture(f.id);
    await reloadFactures();
    toast.success('Relance enregistrée');
  };

  const exportPdf = async (f: FactureLocal) => {
    try {
      await downloadFactureCombineePdf({
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
    <div>
      {/* Onglets internes du thème Facturation : Factures (génération + liste) · Rapports (exports). */}
      <EauTabs
        active={view}
        onChange={(k) => setView(k as 'factures' | 'rapports')}
        tabs={[
          { key: 'factures', label: 'Factures', icon: Receipt },
          { key: 'rapports', label: 'Rapports', icon: FileBarChart },
        ]}
      />
      <EauPageShell
        title="Facturation"
        subtitle={view === 'rapports' ? 'Exports (admin)' : 'Génération des factures par période (admin)'}
        aide={AIDE.facturation}
        actions={isReadOnly ? <EauReadOnlyBadge /> : undefined}
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
          <button
            type="button"
            onClick={() => navigate('/gestion-eau/config')}
            className="inline-flex items-center gap-1 mt-2 text-ahuvi-forest font-medium underline"
          >
            <Settings className="w-4 h-4" aria-hidden="true" /> Aller à la configuration
          </button>
        </div>
      ) : view === 'factures' ? (
        <div className="space-y-4">
          <EauAide
            id={AIDE.factureCombinee.id}
            quoi={AIDE.factureCombinee.quoi}
            comment={AIDE.factureCombinee.comment}
          />

          {/* Garde-fou : pas de mois de coûts élec → l'électricité ne peut pas être facturée. */}
          {couts.length === 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
              <div className="font-semibold text-amber-800 mb-1">Aucun mois de coûts électricité</div>
              <p className="text-amber-700">
                Créez d’abord les coûts du mois (facture JIRAMA + gasoil + kWh produits) pour pouvoir
                facturer l’électricité. Sans cela, seules les lignes d’eau seront facturées.
              </p>
              <button
                type="button"
                onClick={() => navigate('/gestion-eau/elec-couts')}
                className="inline-flex items-center gap-1 mt-2 text-ahuvi-forest font-medium underline"
              >
                <Settings className="w-4 h-4" aria-hidden="true" /> Aller aux Coûts électricité
              </button>
            </div>
          )}

          {/* Période */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
            <h2 className="font-semibold text-ahuvi-forest mb-3">Période</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Début</span>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Fin</span>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                />
              </label>
            </div>
            {couts.length > 0 && (
              <label className="text-sm block mt-3">
                <span className="block text-gray-600 mb-1">Mois de coûts électricité (prix du kWh)</span>
                <select
                  value={coutMois}
                  onChange={(e) => setCoutMois(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                >
                  {couts.map((c) => (
                    <option key={c.id} value={c.mois}>
                      {moisLabel(c.mois)} — {fmtMontant(c.prix_kwh, config?.devise)} / kWh
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex gap-2 mt-3">
              <EauIconButton icon={Eye} variant="secondary" onClick={runPreview} disabled={busy} className="flex-1 py-2.5">
                Aperçu
              </EauIconButton>
              {!isReadOnly && (
                <EauIconButton icon={Receipt} variant="primary" onClick={runGenerate} disabled={busy} className="flex-1 py-2.5">
                  Générer les factures
                </EauIconButton>
              )}
            </div>
          </div>

          {/* Aperçu */}
          {previews && (
            <div className="rounded-xl border border-ahuvi-200 bg-ahuvi-50/50 p-4 shadow-soft">
              <h2 className="font-semibold text-ahuvi-forest mb-2">Aperçu</h2>
              <div className="space-y-1">
                {previews.map((p) => (
                  <div key={p.compteur.id} className="text-sm py-1.5 border-b border-ahuvi-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-800 font-medium">{p.compteur.nom}</span>
                      {p.skipRaison ? (
                        <span className="text-gray-400 italic">{p.skipRaison}</span>
                      ) : (
                        <strong className="text-ahuvi-forest">{fmtMontant(p.montantTotal, config?.devise)}</strong>
                      )}
                    </div>
                    {!p.skipRaison && (
                      <div className="flex flex-wrap gap-x-4 text-xs text-gray-500 mt-0.5">
                        <span>Eau : {p.conso != null ? `${fmtM3(p.conso)} · ${fmtMontant(p.montant, config?.devise)}` : '—'}</span>
                        <span>Élec : {p.consoKwh != null ? `${fmtKwh(p.consoKwh)} · ${fmtMontant(p.montantElec, config?.devise)}` : '—'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liste des factures */}
          <div>
            <h2 className="font-semibold text-ahuvi-forest mb-2">Factures émises ({factures.length})</h2>
            {factures.length === 0 ? (
              <EauEmptyState icon={Receipt} title="Aucune facture pour l’instant" hint="Choisissez une période puis générez les factures." />
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
                          <strong>{fmtMontant(f.montant_total ?? f.montant, f.devise)}</strong>
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                          {f.conso_m3 != null && <span>Eau : {fmtM3(f.conso_m3)} · {fmtMontant(f.montant, f.devise)}</span>}
                          {f.conso_kwh != null && <span>Élec : {fmtKwh(f.conso_kwh)} · {fmtMontant(f.montant_elec, f.devise)}</span>}
                        </div>
                        {f.relance_count > 0 && (
                          <div className="text-xs text-rose-600 mt-0.5">Relances : {f.relance_count}</div>
                        )}
                      </div>
                      {isReadOnly ? (
                        <span
                          className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                            f.statut === 'paye'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {f.statut === 'paye'
                            ? <><BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Payée</>
                            : <><CircleAlert className="w-3.5 h-3.5" aria-hidden="true" /> Impayée</>}
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleStatut(f)}
                          className={`flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                            f.statut === 'paye'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                          title="Basculer le statut"
                        >
                          {f.statut === 'paye'
                            ? <><BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Payée</>
                            : <><CircleAlert className="w-3.5 h-3.5" aria-hidden="true" /> Impayée</>}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-3 mt-2 text-sm">
                      <button onClick={() => exportPdf(f)} className="inline-flex items-center gap-1 text-ahuvi-olive hover:underline">
                        <FileDown className="w-4 h-4" aria-hidden="true" /> PDF
                      </button>
                      {!isReadOnly && f.statut === 'impaye' && (
                        <button onClick={() => relancer(f)} className="inline-flex items-center gap-1 text-amber-600 hover:underline">
                          <Bell className="w-4 h-4" aria-hidden="true" /> Relancer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Onglet Rapports : graphiques + exports globaux + rappel des PDF par facture. */
        <div className="space-y-4">
          {/* Graphiques : conso (m³) et montant facturé par période. */}
          <div className="rounded-xl border border-ahuvi-100 bg-white p-3 shadow-soft">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ahuvi-forest mb-2">
              <FileBarChart className="w-4 h-4" aria-hidden="true" /> Montant facturé par période
            </h3>
            {parPeriode.length === 0 ? (
              <EauEmptyState icon={Receipt} title="Aucune facture à représenter" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={parPeriode}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={40} />
                  <Tooltip formatter={(v: number) => fmtMontant(v, config?.devise)} />
                  <Bar dataKey="montant" name="Montant" fill="#9D9B4B" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-ahuvi-100 bg-white p-3 shadow-soft">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ahuvi-forest mb-2">
              <FileBarChart className="w-4 h-4" aria-hidden="true" /> Consommation facturée par période
            </h3>
            {parPeriode.length === 0 ? (
              <EauEmptyState icon={Receipt} title="Aucune facture à représenter" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={parPeriode}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={32} />
                  <Tooltip formatter={(v: number) => fmtM3(v)} />
                  <Bar dataKey="conso" name="Conso" fill="#4C6D40" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
            <h2 className="font-semibold text-ahuvi-forest mb-1">Export CSV global</h2>
            <p className="text-sm text-gray-600 mb-3">
              Relevés, bilans et factures de la copropriété, dans un seul fichier .csv.
            </p>
            <EauIconButton icon={Download} variant="primary" onClick={exportCsv}>
              Télécharger le CSV global
            </EauIconButton>
          </div>
          <div className="rounded-xl border border-ahuvi-100 bg-ahuvi-50/60 p-4 text-sm text-ahuvi-800">
            Les <strong>PDF par facture</strong> se téléchargent depuis l'onglet « Factures »
            (bouton 📄 PDF sur chaque facture émise).
          </div>
        </div>
      )}
      </EauPageShell>
    </div>
  );
}
