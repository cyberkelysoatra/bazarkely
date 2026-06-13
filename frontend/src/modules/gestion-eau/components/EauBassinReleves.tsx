/**
 * Onglet « Bassin » de la page Relevés v2 (façon Transactions).
 *
 * Métaphore comptable : le niveau du bassin = stock d'eau (eau restante).
 *  - Carte « Stock d'eau du bassin » : niveau réel mesuré (+ % remplissage réf. flotteur),
 *    solde attendu (dernier bilan) et écart mesuré − attendu (ton d'alerte si anomalie).
 *  - Carte « Bassin » : dernier niveau (cm → m³) + date, tiroir « Saisir hauteur »
 *    (conversion live cm → m³, Enregistrer → addReleveBassin qui déclenche un bilan)
 *    + tiroir « Historique » (6 derniers niveaux + mini-courbe).
 *  - Section repliable « Tests de débit » : débit courant mis en avant + liste + nouveau test.
 *  - Section repliable admin/releveur « Relevés récents » : édition/suppression + recalcul
 *    des bilans (feature v3.41.0 conservée — additif, ne pas régresser).
 *
 * Transpose EauSaisieBassinPage SANS toucher au calcul des bilans (utils/bilan.ts, Phase 3).
 * Offline-first ; deep-link `?bt=niveau|debit` piloté par le parent (openIntent).
 */
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  Waves, Ruler, Gauge, Save, AlertTriangle, Settings, Pencil, History, Activity,
  ListChecks, Trash2, RefreshCw, ChevronDown, TrendingUp, TrendingDown,
} from 'lucide-react';
import { EauStatCard, EauEmptyState, EauListIcon } from './EauUi';
import EauAide from './EauAide';
import { AIDE } from './eauAideTextes';
import { useGestionEau } from '../context';
import { useAppStore } from '../../../stores/appStore';
import { showConfirm } from '../../../utils/dialogUtils';
import { getConfig, dimensionsFromConfig } from '../services/eauConfigService';
import { surfaceFromConfig, listDebitTests, addDebitTest } from '../services/eauBassinService';
import { getDashboardData, recomputeAllBilans, type DashboardData } from '../services/eauBilanService';
import {
  addReleveBassin,
  listRecentRelevesBassin,
  updateReleveBassin,
  deleteReleveBassin,
} from '../services/eauReleveService';
import { hauteurCmToVolumeM3 } from '../utils/bassin';
import { computeDebit } from '../utils/debit';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { fmtM3, fmtPct, fmtDate } from '../utils/format';
import type { ConfigLocal, DebitTestLocal, ReleveBassinLocal } from '../types/gestionEau';
import type { BassinDimensions } from '../utils/bassin';

// Fenêtre glissante (ms) — un releveur pur ne corrige/supprime que les relevés < 48 h
// (borne alignée sur la RLS). Un admin (même cumulé releveur) n'est pas borné.
const WINDOW_48H_MS = 48 * 60 * 60 * 1000;

function toIsoOrUndefined(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}
function isFuture(local: string): boolean {
  if (!local.trim()) return false;
  const t = new Date(local).getTime();
  return Number.isFinite(t) && t > Date.now();
}
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Minutes depuis minuit d'une saisie `<input type="time">` (HH:MM), ou null si vide/invalide. */
function timeToMinutes(hhmm: string): number | null {
  if (!hhmm.trim()) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Durée (min) entre une heure de début et de fin (`HH:MM`). Gère le passage de minuit
 * (test de nuit) : si la fin est « avant » le début, on suppose le lendemain (+24 h).
 * Retourne null si l'une des heures est absente/invalide ou si la durée est nulle.
 */
function dureeMinFromHeures(debut: string, fin: string): number | null {
  const a = timeToMinutes(debut);
  const b = timeToMinutes(fin);
  if (a == null || b == null) return null;
  let diff = b - a;
  if (diff < 0) diff += 24 * 60; // passage de minuit
  return diff > 0 ? diff : null;
}

export default function EauBassinReleves({
  openIntent,
  onConsumeIntent,
}: {
  /** Deep-link / raccourci : 'niveau' ouvre le tiroir Saisir hauteur, 'debit' ouvre la section Tests. */
  openIntent: 'niveau' | 'debit' | null;
  onConsumeIntent: () => void;
}) {
  const navigate = useNavigate();
  const { roles, isReadOnly } = useGestionEau();
  const isOnline = useAppStore((s) => s.isOnline);

  const [config, setConfig] = useState<ConfigLocal | null>(null);
  const [dim, setDim] = useState<BassinDimensions | null>(null);
  const [surface, setSurface] = useState<number | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [relevesList, setRelevesList] = useState<ReleveBassinLocal[]>([]);
  const [tests, setTests] = useState<DebitTestLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Accordéon de la carte Bassin (un seul tiroir à la fois) + sections repliables.
  const [openDrawer, setOpenDrawer] = useState<'saisir' | 'histo' | null>(null);
  const [debitOpen, setDebitOpen] = useState(false);

  // Saisie niveau
  const [hauteurCm, setHauteurCm] = useState('');
  const [niveauNote, setNiveauNote] = useState('');
  const [niveauDateTime, setNiveauDateTime] = useState('');

  // Test de débit : hauteur début/fin (cm) + heure début/fin (durée dérivée).
  const [debitDebutCm, setDebitDebutCm] = useState('');
  const [debitFinCm, setDebitFinCm] = useState('');
  const [debitHeureDebut, setDebitHeureDebut] = useState('');
  const [debitHeureFin, setDebitHeureFin] = useState('');
  const [debitNote, setDebitNote] = useState('');

  // Édition admin/releveur
  const [editing, setEditing] = useState<{ id: string; hauteur: string; datetime: string } | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  const bassinCardRef = useRef<HTMLDivElement | null>(null);
  const debitRef = useRef<HTMLDivElement | null>(null);

  const isReleveurOnly = roles.releveur && !roles.admin;
  const visibleReleves = isReleveurOnly
    ? relevesList.filter((r) => Date.now() - new Date(r.timestamp).getTime() <= WINDOW_48H_MS)
    : relevesList;

  const loadCore = async () => {
    const cfg = await getConfig();
    setConfig(cfg);
    setDim(dimensionsFromConfig(cfg));
    setSurface(surfaceFromConfig(cfg));
    setDash(await getDashboardData());
    setTests(await listDebitTests());
    if (roles.admin || roles.releveur) setRelevesList(await listRecentRelevesBassin(30));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadCore();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles.admin, roles.releveur]);

  // Deep-link / raccourci : ouvre le bon tiroir/section et défile jusqu'à lui.
  useEffect(() => {
    if (!openIntent || loading) return;
    if (openIntent === 'niveau') {
      setOpenDrawer('saisir');
      requestAnimationFrame(() => bassinCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    } else if (openIntent === 'debit') {
      setDebitOpen(true);
      requestAnimationFrame(() => debitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
    onConsumeIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIntent, loading]);

  // Aperçu live volume (cm → m³) avant validation.
  const volumePreview = useMemo(() => {
    if (!dim) return null;
    const h = Number(hauteurCm);
    if (!Number.isFinite(h) || hauteurCm.trim() === '') return null;
    return hauteurCmToVolumeM3(h, dim);
  }, [hauteurCm, dim]);

  // Durée dérivée des heures de début/fin (min), null tant que la saisie est incomplète.
  const debitDureeMin = useMemo(
    () => dureeMinFromHeures(debitHeureDebut, debitHeureFin),
    [debitHeureDebut, debitHeureFin]
  );

  // Aperçu live du débit (Q_in) — durée dérivée des heures.
  const debitPreview = useMemo(() => {
    if (surface == null) return null;
    if (debitDebutCm.trim() === '' || debitFinCm.trim() === '' || debitDureeMin == null) return null;
    const d = Number(debitDebutCm);
    const f = Number(debitFinCm);
    if (![d, f].every(Number.isFinite)) return null;
    return computeDebit({ niveauDebutCm: d, niveauFinCm: f, dureeMin: debitDureeMin, surfaceM2: surface });
  }, [debitDebutCm, debitFinCm, debitDureeMin, surface]);

  const flotteurCm = useMemo(() => {
    const f = config?.bassin_hauteur_flotteur_m ?? config?.bassin_hauteur_max_m;
    return f != null && f > 0 ? f * 100 : null;
  }, [config]);
  const debitFinAuDessusFlotteur =
    flotteurCm != null && debitFinCm.trim() !== '' && Number(debitFinCm) > flotteurCm;

  // Historique des tests (du plus ancien au plus récent) pour le graphe en barres.
  const debitChartData = useMemo(
    () => [...tests].reverse().map((t) => ({ label: fmtDate(t.timestamp).slice(0, 5), debit: t.debit_m3h })),
    [tests]
  );

  // Mini-courbe de niveau (6 derniers relevés, du plus ancien au plus récent).
  const niveauChart = useMemo(
    () =>
      relevesList
        .slice(0, 6)
        .slice()
        .reverse()
        .map((r) => ({ x: fmtDate(r.timestamp).slice(0, 5), value: r.volume_m3 })),
    [relevesList]
  );

  const dernierReleve = relevesList[0] ?? null;

  const submitNiveau = async () => {
    if (isReadOnly) return;
    if (!dim) {
      toast.error("Configurez le bassin d'abord");
      return;
    }
    const h = Number(hauteurCm);
    if (!Number.isFinite(h) || h < 0) {
      toast.error('Hauteur invalide');
      return;
    }
    if (isFuture(niveauDateTime)) {
      toast.error('Date dans le futur impossible');
      return;
    }
    const volume = hauteurCmToVolumeM3(h, dim);
    setBusy(true);
    try {
      const { bilan } = await addReleveBassin({
        hauteur_cm: h,
        volume_m3: volume,
        note: niveauNote || null,
        agent_id: getCurrentUserIdSync(),
        timestamp: toIsoOrUndefined(niveauDateTime),
      });
      if (bilan) {
        toast.success(
          bilan.anomalie
            ? `Relevé enregistré — ⚠️ anomalie détectée (écart ${fmtM3(bilan.ecart_m3)})`
            : `Relevé enregistré — bilan OK (écart ${fmtM3(bilan.ecart_m3)})`
        );
      } else {
        toast.success('Relevé enregistré (référence initiale — pas de bilan)');
      }
      setHauteurCm('');
      setNiveauNote('');
      setNiveauDateTime('');
      setOpenDrawer(null);
      await loadCore();
    } finally {
      setBusy(false);
    }
  };

  const submitDebit = async () => {
    if (isReadOnly) return;
    if (surface == null) {
      toast.error("Configurez les dimensions du bassin d'abord");
      return;
    }
    if (debitDureeMin == null) {
      toast.error("Renseignez l'heure de début et de fin (fin après début)");
      return;
    }
    setBusy(true);
    try {
      const res = await addDebitTest({
        niveau_debut_cm: Number(debitDebutCm),
        niveau_fin_cm: Number(debitFinCm),
        duree_min: debitDureeMin,
        note: debitNote || null,
        agent_id: getCurrentUserIdSync(),
      });
      toast.success(
        res.instable
          ? `Test enregistré : ${res.test.debit_m3h.toFixed(1)} m³/h — ⚠️ débit instable (écart ${res.ecartPct?.toFixed(0)} %)`
          : `Test enregistré : débit courant ${res.test.debit_m3h.toFixed(1)} m³/h`
      );
      setDebitDebutCm('');
      setDebitFinCm('');
      setDebitHeureDebut('');
      setDebitHeureFin('');
      setDebitNote('');
      setTests(await listDebitTests());
      setDash(await getDashboardData());
    } catch (e: any) {
      toast.error(e?.message ?? 'Test de débit invalide');
    } finally {
      setBusy(false);
    }
  };

  // ── Actions admin/releveur sur un relevé ──
  const saveEdit = async () => {
    if (isReadOnly || !editing) return;
    const h = Number(editing.hauteur);
    if (!Number.isFinite(h) || h < 0) {
      toast.error('Hauteur invalide');
      return;
    }
    if (!editing.datetime.trim() || isFuture(editing.datetime)) {
      toast.error('Date invalide (vide ou dans le futur)');
      return;
    }
    if (isReleveurOnly && Date.now() - new Date(editing.datetime).getTime() > WINDOW_48H_MS) {
      toast.error('Un releveur ne peut dater un relevé que dans les dernières 48 h');
      return;
    }
    setBusy(true);
    try {
      await updateReleveBassin({ id: editing.id, hauteur_cm: h, timestamp: new Date(editing.datetime).toISOString() });
      setEditing(null);
      await loadCore();
      toast.success('Relevé modifié — bilans recalculés');
    } catch (e: any) {
      toast.error(e?.message ?? 'Modification impossible');
    } finally {
      setBusy(false);
    }
  };

  const removeReleve = async (r: ReleveBassinLocal) => {
    if (isReadOnly) return;
    const ok = await showConfirm(
      `Supprimer ce relevé du ${fmtDate(r.timestamp)} (${r.hauteur_cm} cm) ? Les bilans seront recalculés.`,
      'Relevés',
      { variant: 'danger', confirmText: 'Supprimer' }
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteReleveBassin(r.id);
      if (editing?.id === r.id) setEditing(null);
      await loadCore();
      toast.success('Relevé supprimé — bilans recalculés');
    } catch (e: any) {
      toast.error(e?.message ?? 'Suppression impossible');
    } finally {
      setBusy(false);
    }
  };

  const recomputeAll = async () => {
    if (isReadOnly) return;
    const ok = await showConfirm(
      'Recalculer TOUS les bilans depuis le début ? Utile pour générer les bilans des relevés importés. Les bilans déjà « traités » repasseront en « non traité ».',
      'Bilans',
      { confirmText: 'Recalculer' }
    );
    if (!ok) return;
    setRecomputing(true);
    try {
      await recomputeAllBilans();
      await loadCore();
      toast.success('Bilans recalculés');
    } catch (e: any) {
      toast.error(e?.message ?? 'Recalcul impossible');
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) {
    return <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>;
  }

  const bilan = dash?.dernierBilan ?? null;
  const anomalie = !!bilan?.anomalie;

  return (
    <div className="space-y-4">
      <EauAide id={AIDE.bassinNiveau.id} quoi={AIDE.bassinNiveau.quoi} comment={AIDE.bassinNiveau.comment} />

      {/* Carte « Stock d'eau du bassin » (métaphore compte : eau restante = stock d'eau). */}
      <div
        className={`rounded-xl border bg-white p-4 shadow-soft ${anomalie ? 'border-amber-300' : 'border-ahuvi-100'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stock d'eau du bassin</div>
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${anomalie ? 'bg-amber-100 text-amber-700' : 'bg-cyan-50 text-ahuvi-teal'}`}>
            <Waves className="w-5 h-5" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-2 text-2xl font-bold text-ahuvi-teal">{fmtM3(dash?.stockActuelM3 ?? null)}</div>
        <div className="text-sm text-gray-500 mt-0.5">
          Remplissage : {dash?.tauxRemplissage != null ? fmtPct(dash.tauxRemplissage, { isRatio: true }) : '—'}
          {dash?.volumeMaxM3 != null && <span className="text-gray-400"> / {fmtM3(dash.volumeMaxM3)}</span>}
        </div>

        {bilan ? (
          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Attendu (dernier bilan)</div>
              <div className="font-semibold text-gray-800">{fmtM3(bilan.stock_attendu)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Écart mesuré − attendu</div>
              <div className={`font-semibold inline-flex items-center gap-1 ${anomalie ? 'text-amber-700' : 'text-emerald-700'}`}>
                {(bilan.ecart_m3 ?? 0) < 0 ? (
                  <TrendingDown className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <TrendingUp className="w-4 h-4" aria-hidden="true" />
                )}
                {fmtM3(bilan.ecart_m3)} ({fmtPct(bilan.ecart_pct)})
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Stock de référence — le bilan (écart mesuré vs attendu) sera calculé au prochain relevé de niveau.
          </div>
        )}
      </div>

      {/* Carte « Bassin » : dernier niveau + tiroirs Saisir / Historique. */}
      <div ref={bassinCardRef} className="rounded-xl border border-ahuvi-100 bg-white shadow-soft overflow-hidden">
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <EauListIcon icon={Ruler} tone="teal" />
              <div className="min-w-0">
                <div className="font-semibold text-gray-900">Bassin</div>
                <div className="text-sm text-gray-500">
                  {dernierReleve ? (
                    <>
                      {dernierReleve.hauteur_cm} cm · {fmtM3(dernierReleve.volume_m3)} · {fmtDate(dernierReleve.timestamp)}
                    </>
                  ) : (
                    'Aucun relevé de niveau'
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => setOpenDrawer((k) => (k === 'saisir' ? null : 'saisir'))}
              disabled={isReadOnly || !dim}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                openDrawer === 'saisir'
                  ? 'bg-ahuvi-forest text-white'
                  : 'bg-ahuvi-50 text-ahuvi-forest hover:bg-ahuvi-100 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <Pencil className="w-4 h-4" aria-hidden="true" /> Saisir hauteur
            </button>
            <button
              type="button"
              onClick={() => setOpenDrawer((k) => (k === 'histo' ? null : 'histo'))}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                openDrawer === 'histo'
                  ? 'bg-ahuvi-forest text-white'
                  : 'bg-white border border-ahuvi-200 text-ahuvi-forest hover:bg-ahuvi-50'
              }`}
            >
              <History className="w-4 h-4" aria-hidden="true" /> Historique
            </button>
          </div>
        </div>

        {openDrawer === 'saisir' && (
          <Drawer>
            <div className="px-3 pb-3 border-t border-ahuvi-100 space-y-3 pt-3">
              {!dim && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>
                    Configurez le bassin d'abord (dimensions L × l × hauteur).{' '}
                    <button className="inline-flex items-center gap-1 underline font-medium" onClick={() => navigate('/gestion-eau/config')}>
                      <Settings className="w-3.5 h-3.5" aria-hidden="true" /> Configurer
                    </button>
                  </span>
                </div>
              )}
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Hauteur mesurée (cm)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={hauteurCm}
                  onChange={(e) => setHauteurCm(e.target.value)}
                  disabled={!dim || isReadOnly}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                  placeholder="ex : 180"
                  autoFocus
                />
              </label>
              {volumePreview != null && (
                <div className="text-sm text-ahuvi-teal bg-cyan-50 rounded-lg px-3 py-2">
                  Volume correspondant : <strong>{fmtM3(volumePreview)}</strong>
                </div>
              )}
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                <input
                  type="text"
                  value={niveauNote}
                  onChange={(e) => setNiveauNote(e.target.value)}
                  disabled={!dim || isReadOnly}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                />
              </label>
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Date et heure du relevé (optionnel)</span>
                <input
                  type="datetime-local"
                  value={niveauDateTime}
                  onChange={(e) => setNiveauDateTime(e.target.value)}
                  disabled={!dim || isReadOnly}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                />
                <span className="block text-xs text-gray-500 mt-1">
                  Laisser vide = maintenant. Renseigner pour saisir un relevé passé.
                </span>
              </label>
              <button
                onClick={submitNiveau}
                disabled={busy || !dim || hauteurCm.trim() === '' || isReadOnly}
                className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl"
              >
                <Save className="w-4 h-4" aria-hidden="true" /> Enregistrer le relevé (déclenche un bilan)
              </button>
            </div>
          </Drawer>
        )}

        {openDrawer === 'histo' && (
          <Drawer>
            <div className="px-3 pb-3 border-t border-ahuvi-100 pt-3 space-y-2">
              {niveauChart.length > 0 && (
                <div className="rounded-lg border border-ahuvi-100 bg-ahuvi-50/40 p-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Waves className="w-3.5 h-3.5" aria-hidden="true" /> Niveau mesuré (m³)
                  </div>
                  <ResponsiveContainer width="100%" height={90}>
                    <LineChart data={niveauChart}>
                      <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => fmtM3(v)} labelFormatter={() => ''} />
                      <Line type="monotone" dataKey="value" stroke="#10939F" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {relevesList.length === 0 ? (
                <div className="pt-1 text-sm text-gray-400 text-center">Aucun relevé de niveau.</div>
              ) : (
                <div className="max-h-[8.5rem] overflow-y-auto pr-1">
                  <div className="space-y-1">
                    {relevesList.slice(0, 6).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm"
                      >
                        <span className="text-sm text-gray-600">{fmtDate(r.timestamp)}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">{r.hauteur_cm} cm</span>
                          <span className="text-xs text-gray-500 w-20 text-right">{fmtM3(r.volume_m3)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Drawer>
        )}
      </div>

      {/* Section repliable « Tests de débit ». */}
      <div ref={debitRef} className="rounded-xl border border-ahuvi-100 bg-white shadow-soft overflow-hidden">
        <button
          type="button"
          onClick={() => setDebitOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-ahuvi-forest"
        >
          <span className="inline-flex items-center gap-2">
            <Gauge className="w-4 h-4" aria-hidden="true" /> Tests de débit
            {dash?.debitCourantM3h != null && (
              <span className="text-xs font-medium text-ahuvi-olive bg-ahuvi-50 rounded-full px-2 py-0.5">
                courant {dash.debitCourantM3h.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m³/h
              </span>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${debitOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {debitOpen && (
          <Drawer>
            <div className="px-4 pb-4 border-t border-ahuvi-100 pt-3 space-y-4">
              <div className="space-y-3">
                <div className="text-xs text-gray-500">
                  Test « vanne fermée » : fermez la sortie, relevez le niveau au début et à la fin, notez la durée —
                  le débit d'apport Q_in est déduit automatiquement.
                </div>
                {surface == null && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span>
                      Configurez les dimensions du bassin (L × l) d'abord.{' '}
                      <button className="inline-flex items-center gap-1 underline font-medium" onClick={() => navigate('/gestion-eau/config')}>
                        <Settings className="w-3.5 h-3.5" aria-hidden="true" /> Configurer
                      </button>
                    </span>
                  </div>
                )}
                {/* Saisie par hauteur + heure (début / fin) — la durée est dérivée automatiquement. */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-sm block">
                      <span className="block text-gray-600 mb-1">Hauteur début (cm)</span>
                      <input type="number" inputMode="decimal" step="0.1" value={debitDebutCm}
                        onChange={(e) => setDebitDebutCm(e.target.value)} disabled={surface == null || isReadOnly}
                        className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" placeholder="ex : 150" />
                    </label>
                    <label className="text-sm block">
                      <span className="block text-gray-600 mb-1">Heure début</span>
                      <input type="time" value={debitHeureDebut}
                        onChange={(e) => setDebitHeureDebut(e.target.value)} disabled={surface == null || isReadOnly}
                        className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" />
                    </label>
                    <label className="text-sm block">
                      <span className="block text-gray-600 mb-1">Hauteur fin (cm)</span>
                      <input type="number" inputMode="decimal" step="0.1" value={debitFinCm}
                        onChange={(e) => setDebitFinCm(e.target.value)} disabled={surface == null || isReadOnly}
                        className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" placeholder="ex : 160" />
                    </label>
                    <label className="text-sm block">
                      <span className="block text-gray-600 mb-1">Heure fin</span>
                      <input type="time" value={debitHeureFin}
                        onChange={(e) => setDebitHeureFin(e.target.value)} disabled={surface == null || isReadOnly}
                        className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" />
                    </label>
                  </div>
                  {debitDureeMin != null ? (
                    <div className="text-xs text-gray-500">Durée déduite : <strong>{debitDureeMin} min</strong></div>
                  ) : (
                    (debitHeureDebut.trim() !== '' || debitHeureFin.trim() !== '') && (
                      <div className="text-xs text-amber-700">Renseignez les deux heures (fin après début).</div>
                    )
                  )}
                </div>
                {debitFinAuDessusFlotteur && (
                  <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    ⚠️ Le niveau final dépasse la hauteur du flotteur — test au-delà du plafond opérationnel.
                  </div>
                )}
                {debitPreview != null &&
                  (debitPreview.valid ? (
                    <div className="text-sm text-ahuvi-teal bg-cyan-50 rounded-lg px-3 py-2">
                      Débit d'apport Q_in : <strong>{debitPreview.debitM3h.toFixed(1)} m³/h</strong>
                      <span className="text-ahuvi-teal/60"> ({fmtM3(debitPreview.volumeM3)} en {debitDureeMin} min)</span>
                    </div>
                  ) : (
                    <div className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{debitPreview.error}</div>
                  ))}
                <label className="text-sm block">
                  <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                  <input type="text" value={debitNote} onChange={(e) => setDebitNote(e.target.value)} disabled={surface == null || isReadOnly}
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" />
                </label>
                {!isReadOnly && (
                  <button onClick={submitDebit} disabled={busy || surface == null || !debitPreview?.valid}
                    className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
                    <Save className="w-4 h-4" aria-hidden="true" /> Nouveau test de débit
                  </button>
                )}
              </div>

              {/* Historique des tests + débit courant mis en avant. */}
              {tests.length === 0 ? (
                <EauEmptyState icon={Gauge} title="Aucun test de débit pour l'instant" />
              ) : (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    <Activity className="w-3.5 h-3.5" aria-hidden="true" /> Débit mesuré (m³/h)
                  </div>
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={debitChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={32} />
                      <Tooltip formatter={(v: number) => `${v.toFixed(1)} m³/h`} />
                      <Bar dataKey="debit" name="Débit" fill="#10939F" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                  <ul className="space-y-2 mt-3">
                    {tests.map((t, i) => (
                      <li key={t.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${i === 0 ? 'border-ahuvi-300 bg-ahuvi-50' : 'border-gray-100 bg-gray-50'}`}>
                        <EauListIcon icon={Gauge} tone={i === 0 ? 'teal' : 'neutral'} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-ahuvi-teal">
                              {t.debit_m3h.toFixed(1)} m³/h
                              {i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wide text-ahuvi-olive">débit courant</span>}
                            </span>
                            {t.ecart_pct != null && <span className="text-xs text-gray-500">écart {t.ecart_pct.toFixed(0)} %</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {fmtDate(t.timestamp)} · {t.niveau_debut_cm}→{t.niveau_fin_cm} cm en {t.duree_min} min
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Drawer>
        )}
      </div>

      {/* Section admin/releveur : édition / suppression d'un relevé + recalcul des bilans. */}
      {(roles.admin || roles.releveur) && (
        <details className="rounded-xl border border-ahuvi-200 bg-white shadow-soft">
          <summary className="flex items-center gap-2 cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ahuvi-forest">
            <ListChecks className="w-4 h-4" aria-hidden="true" />{' '}
            {isReleveurOnly ? 'Relevés récents — modifiables 48 h' : 'Relevés récents (admin)'}
          </summary>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-gray-500 leading-snug">
              Un bilan compare deux relevés qui se suivent (niveau précédent → niveau actuel) pour estimer la
              consommation et les pertes. Quand vous modifiez ou supprimez un relevé, les bilans concernés sont
              recalculés automatiquement. Le bouton « Recalculer tous les bilans » refait toute la série depuis
              le début (utile une fois pour les relevés importés).
              {isReleveurOnly && (
                <> En tant que releveur, vous ne pouvez corriger ou supprimer que les relevés des dernières 48 heures.</>
              )}
            </p>

            {!isOnline && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Connectez-vous pour corriger un relevé.
              </div>
            )}

            {visibleReleves.length === 0 ? (
              <EauEmptyState icon={Ruler} title="Aucun relevé de niveau pour l'instant" />
            ) : (
              <ul className="space-y-2">
                {visibleReleves.map((r) => (
                  <li key={r.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                    {editing?.id === r.id ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <label className="block">
                            <span className="block text-xs text-gray-600 mb-1">Hauteur (cm)</span>
                            <input type="number" inputMode="decimal" step="0.1" value={editing.hauteur}
                              onChange={(e) => setEditing((prev) => (prev ? { ...prev, hauteur: e.target.value } : prev))}
                              className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
                          </label>
                          <label className="block">
                            <span className="block text-xs text-gray-600 mb-1">Date et heure</span>
                            <input type="datetime-local" value={editing.datetime}
                              onChange={(e) => setEditing((prev) => (prev ? { ...prev, datetime: e.target.value } : prev))}
                              min={isReleveurOnly ? isoToLocalInput(new Date(Date.now() - WINDOW_48H_MS).toISOString()) : undefined}
                              max={isReleveurOnly ? isoToLocalInput(new Date().toISOString()) : undefined}
                              className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEdit} disabled={busy}
                            className="inline-flex items-center gap-1.5 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg">
                            <Save className="w-3.5 h-3.5" aria-hidden="true" /> Enregistrer
                          </button>
                          <button onClick={() => setEditing(null)} disabled={busy}
                            className="inline-flex items-center gap-1.5 bg-white border border-ahuvi-200 text-ahuvi-forest text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <EauListIcon icon={Ruler} tone="teal" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-800">{r.hauteur_cm} cm · {fmtM3(r.volume_m3)}</div>
                          <div className="text-xs text-gray-500">{fmtDate(r.timestamp)}</div>
                        </div>
                        <button onClick={() => setEditing({ id: r.id, hauteur: String(r.hauteur_cm), datetime: isoToLocalInput(r.timestamp) })}
                          disabled={busy || !isOnline || isReadOnly} aria-label="Modifier le relevé"
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-ahuvi-forest hover:bg-ahuvi-50 disabled:opacity-40">
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button onClick={() => removeReleve(r)} disabled={busy || !isOnline || isReadOnly} aria-label="Supprimer le relevé"
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40">
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {roles.admin && (
              <button onClick={recomputeAll} disabled={recomputing || busy || !isOnline || isReadOnly}
                className="w-full inline-flex items-center justify-center gap-2 bg-white border border-ahuvi-200 text-ahuvi-forest hover:bg-ahuvi-50 disabled:opacity-50 text-sm font-medium py-2.5 rounded-lg">
                <RefreshCw className={`w-4 h-4 ${recomputing ? 'animate-spin' : ''}`} aria-hidden="true" />
                {recomputing ? 'Recalcul…' : 'Recalculer tous les bilans'}
              </button>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

/** Conteneur accordéon : anime l'ouverture (0fr → 1fr) à l'aide d'une grille CSS. */
function Drawer({ children }: { children: ReactNode }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
        grown ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}
