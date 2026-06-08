/**
 * Saisie bassin /gestion-eau/saisie-bassin (releveur/admin) :
 *  (a) Entrée → volume m³ saisi (override manuel de l'apport)
 *  (b) Niveau → hauteur cm → volumeM3 = L × l × (hauteurCm/100) affiché avant validation.
 *      Bloqué si config bassin absente. Chaque relevé de niveau déclenche un bilan.
 *  (c) Test de débit (vanne fermée) → niveau début/fin + durée → Q_in (m³/h) déduit,
 *      historique des tests + débit courant mis en évidence + écart vs précédent.
 */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  ArrowDownToLine, Ruler, Gauge, Save, AlertTriangle, Settings, Waves, Activity, CalendarClock,
  ListChecks, Pencil, Trash2, RefreshCw,
} from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauEmptyState, EauListIcon } from './EauUi';
import EauAide from './EauAide';
import { AIDE } from './eauAideTextes';
import { useGestionEau } from '../context/GestionEauContext';
import { useAppStore } from '../../../stores/appStore';
import { showConfirm } from '../../../utils/dialogUtils';
import { getConfig, dimensionsFromConfig } from '../services/eauConfigService';
import {
  surfaceFromConfig,
  listDebitTests,
  addDebitTest,
} from '../services/eauBassinService';
import { getTendances, type SeriePoint } from '../services/eauTendanceService';
import { recomputeAllBilans } from '../services/eauBilanService';
import { hauteurCmToVolumeM3 } from '../utils/bassin';
import { computeDebit } from '../utils/debit';
import {
  addEntreeBassin,
  addReleveBassin,
  listRecentRelevesBassin,
  updateReleveBassin,
  deleteReleveBassin,
} from '../services/eauReleveService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { fmtM3, fmtDate } from '../utils/format';
import type { ConfigLocal, DebitTestLocal, ReleveBassinLocal } from '../types/gestionEau';
import type { BassinDimensions } from '../utils/bassin';

type Tab = 'entree' | 'niveau' | 'debit';

// Sous-onglet demandé via le deep-link `?bt=` (depuis les cartes bassin du tableau de bord).
// Toute valeur absente ou invalide retombe sur 'niveau' (comportement par défaut historique).
function parseBassinTab(bt: string | null): Tab {
  return bt === 'entree' || bt === 'niveau' || bt === 'debit' ? bt : 'niveau';
}

// Convertit la valeur d'un <input datetime-local> en ISO, ou undefined si vide.
function toIsoOrUndefined(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// true si la valeur saisie est dans le futur.
function isFuture(local: string): boolean {
  if (!local.trim()) return false;
  const t = new Date(local).getTime();
  return Number.isFinite(t) && t > Date.now();
}

// Convertit un horodatage ISO en valeur d'<input datetime-local> (heure locale, sans secondes).
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EauSaisieBassinPage() {
  const navigate = useNavigate();
  const { roles } = useGestionEau();
  const isOnline = useAppStore((s) => s.isOnline);
  const [searchParams] = useSearchParams();
  const btParam = searchParams.get('bt');
  // Démarre sur le sous-onglet demandé par le deep-link (?bt=), sinon Niveau.
  const [tab, setTab] = useState<Tab>(parseBassinTab(btParam));
  const [config, setConfig] = useState<ConfigLocal | null>(null);
  const [dim, setDim] = useState<BassinDimensions | null>(null);
  const [surface, setSurface] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Entrée
  const [entreeM3, setEntreeM3] = useState('');
  const [entreeNote, setEntreeNote] = useState('');
  const [entreeDateTime, setEntreeDateTime] = useState('');

  // Niveau
  const [hauteurCm, setHauteurCm] = useState('');
  const [niveauNote, setNiveauNote] = useState('');
  const [niveauDateTime, setNiveauDateTime] = useState('');

  // Test de débit
  const [debitDebutCm, setDebitDebutCm] = useState('');
  const [debitFinCm, setDebitFinCm] = useState('');
  const [debitDureeMin, setDebitDureeMin] = useState('');
  const [debitNote, setDebitNote] = useState('');
  const [tests, setTests] = useState<DebitTestLocal[]>([]);
  const [niveauSerie, setNiveauSerie] = useState<SeriePoint[]>([]);

  // Section admin « Relevés récents » (édition / suppression + recalcul des bilans).
  const [relevesList, setRelevesList] = useState<ReleveBassinLocal[]>([]);
  const [editing, setEditing] = useState<{ id: string; hauteur: string; datetime: string } | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  // Réagit à un nouveau deep-link (?bt=) sans remonter le composant : un clic sur une
  // autre carte bassin du tableau de bord bascule le sous-onglet. Un changement manuel
  // d'onglet (boutons) ne touche pas l'URL, donc n'est pas écrasé par cet effet.
  useEffect(() => {
    setTab(parseBassinTab(btParam));
  }, [btParam]);

  useEffect(() => {
    (async () => {
      const cfg = await getConfig();
      setConfig(cfg);
      setDim(dimensionsFromConfig(cfg));
      setSurface(surfaceFromConfig(cfg));
      setTests(await listDebitTests());
      const t = await getTendances({ fenetreJours: 30 });
      setNiveauSerie(t.niveauBassin);
      setLoading(false);
    })();
  }, []);

  // Charge la liste des relevés récents dès que le rôle admin est confirmé.
  useEffect(() => {
    if (!roles.admin) return;
    void listRecentRelevesBassin(30).then(setRelevesList);
  }, [roles.admin]);

  // Rafraîchit conjointement la liste admin et la courbe de niveau après une opération.
  const refreshAdminData = async () => {
    setRelevesList(await listRecentRelevesBassin(30));
    const t = await getTendances({ fenetreJours: 30 });
    setNiveauSerie(t.niveauBassin);
  };

  // Historique du débit (du plus ancien au plus récent) pour le graphe en barres.
  const debitChartData = useMemo(
    () =>
      [...tests]
        .reverse()
        .map((t) => ({ label: fmtDate(t.timestamp).slice(0, 5), debit: t.debit_m3h })),
    [tests]
  );

  // Hauteur du flotteur en cm (avertissement « au-dessus du flotteur »).
  const flotteurCm = useMemo(() => {
    const f = config?.bassin_hauteur_flotteur_m ?? config?.bassin_hauteur_max_m;
    return f != null && f > 0 ? f * 100 : null;
  }, [config]);

  const volumePreview = useMemo(() => {
    if (!dim) return null;
    const h = Number(hauteurCm);
    if (!Number.isFinite(h) || hauteurCm.trim() === '') return null;
    return hauteurCmToVolumeM3(h, dim);
  }, [hauteurCm, dim]);

  // Aperçu live du débit (Q_in) avant validation.
  const debitPreview = useMemo(() => {
    if (surface == null) return null;
    const d = Number(debitDebutCm);
    const f = Number(debitFinCm);
    const dur = Number(debitDureeMin);
    if ([debitDebutCm, debitFinCm, debitDureeMin].some((s) => s.trim() === '')) return null;
    if (![d, f, dur].every(Number.isFinite)) return null;
    return computeDebit({ niveauDebutCm: d, niveauFinCm: f, dureeMin: dur, surfaceM2: surface });
  }, [debitDebutCm, debitFinCm, debitDureeMin, surface]);

  const debitFinAuDessusFlotteur =
    flotteurCm != null && debitFinCm.trim() !== '' && Number(debitFinCm) > flotteurCm;

  const submitDebit = async () => {
    if (surface == null) {
      toast.error('Configurez les dimensions du bassin d\'abord');
      return;
    }
    const d = Number(debitDebutCm);
    const f = Number(debitFinCm);
    const dur = Number(debitDureeMin);
    setBusy(true);
    try {
      const res = await addDebitTest({
        niveau_debut_cm: d,
        niveau_fin_cm: f,
        duree_min: dur,
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
      setDebitDureeMin('');
      setDebitNote('');
      setTests(await listDebitTests());
    } catch (e: any) {
      toast.error(e?.message ?? 'Test de débit invalide');
    } finally {
      setBusy(false);
    }
  };

  const submitEntree = async () => {
    const v = Number(entreeM3);
    if (!Number.isFinite(v) || v <= 0) {
      toast.error('Volume invalide');
      return;
    }
    if (isFuture(entreeDateTime)) {
      toast.error('Date dans le futur impossible');
      return;
    }
    setBusy(true);
    try {
      await addEntreeBassin({
        volume_m3: v,
        note: entreeNote || null,
        agent_id: getCurrentUserIdSync(),
        timestamp: toIsoOrUndefined(entreeDateTime),
      });
      toast.success(`Entrée enregistrée : ${fmtM3(v)}`);
      setEntreeM3('');
      setEntreeNote('');
      setEntreeDateTime('');
    } finally {
      setBusy(false);
    }
  };

  const submitNiveau = async () => {
    if (!dim) {
      toast.error('Configurez le bassin d\'abord');
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
      const t = await getTendances({ fenetreJours: 30 });
      setNiveauSerie(t.niveauBassin);
      if (roles.admin) setRelevesList(await listRecentRelevesBassin(30));
    } finally {
      setBusy(false);
    }
  };

  // ── Actions admin sur un relevé ──
  const saveEdit = async () => {
    if (!editing) return;
    const h = Number(editing.hauteur);
    if (!Number.isFinite(h) || h < 0) {
      toast.error('Hauteur invalide');
      return;
    }
    if (!editing.datetime.trim() || isFuture(editing.datetime)) {
      toast.error('Date invalide (vide ou dans le futur)');
      return;
    }
    setBusy(true);
    try {
      await updateReleveBassin({
        id: editing.id,
        hauteur_cm: h,
        timestamp: new Date(editing.datetime).toISOString(),
      });
      setEditing(null);
      await refreshAdminData();
      toast.success('Relevé modifié — bilans recalculés');
    } catch (e: any) {
      toast.error(e?.message ?? 'Modification impossible');
    } finally {
      setBusy(false);
    }
  };

  const removeReleve = async (r: ReleveBassinLocal) => {
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
      await refreshAdminData();
      toast.success('Relevé supprimé — bilans recalculés');
    } catch (e: any) {
      toast.error(e?.message ?? 'Suppression impossible');
    } finally {
      setBusy(false);
    }
  };

  const recomputeAll = async () => {
    const ok = await showConfirm(
      'Recalculer TOUS les bilans depuis le début ? Utile pour générer les bilans des relevés importés. Les bilans déjà « traités » repasseront en « non traité ».',
      'Bilans',
      { confirmText: 'Recalculer' }
    );
    if (!ok) return;
    setRecomputing(true);
    try {
      await recomputeAllBilans();
      const t = await getTendances({ fenetreJours: 30 });
      setNiveauSerie(t.niveauBassin);
      toast.success('Bilans recalculés');
    } catch (e: any) {
      toast.error(e?.message ?? 'Recalcul impossible');
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <EauPageShell title="Saisie bassin" subtitle="Entrées d'eau et relevé de niveau">
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('entree')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium text-xs ${
                tab === 'entree' ? 'bg-ahuvi-forest text-white' : 'bg-white border border-ahuvi-200 text-ahuvi-forest'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" aria-hidden="true" /> Entrée
            </button>
            <button
              onClick={() => setTab('niveau')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium text-xs ${
                tab === 'niveau' ? 'bg-ahuvi-forest text-white' : 'bg-white border border-ahuvi-200 text-ahuvi-forest'
              }`}
            >
              <Ruler className="w-4 h-4" aria-hidden="true" /> Niveau
            </button>
            <button
              onClick={() => setTab('debit')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg font-medium text-xs ${
                tab === 'debit' ? 'bg-ahuvi-forest text-white' : 'bg-white border border-ahuvi-200 text-ahuvi-forest'
              }`}
            >
              <Gauge className="w-4 h-4" aria-hidden="true" /> Débit
            </button>
          </div>

          {/* Aide spécifique à l'onglet bassin actif (Entrée / Niveau / Débit). */}
          {tab === 'entree' && (
            <EauAide id={AIDE.bassinEntree.id} quoi={AIDE.bassinEntree.quoi} comment={AIDE.bassinEntree.comment} />
          )}
          {tab === 'niveau' && (
            <EauAide id={AIDE.bassinNiveau.id} quoi={AIDE.bassinNiveau.quoi} comment={AIDE.bassinNiveau.comment} />
          )}
          {tab === 'debit' && (
            <EauAide id={AIDE.bassinDebit.id} quoi={AIDE.bassinDebit.quoi} comment={AIDE.bassinDebit.comment} />
          )}

          {tab === 'entree' && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft space-y-3">
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Volume entré (m³)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={entreeM3}
                  onChange={(e) => setEntreeM3(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                  placeholder="ex : 50"
                />
              </label>
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                <input
                  type="text"
                  value={entreeNote}
                  onChange={(e) => setEntreeNote(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                />
              </label>
              <label className="text-sm block">
                <span className="flex items-center gap-1.5 text-gray-600 mb-1">
                  <CalendarClock className="w-4 h-4" aria-hidden="true" /> Date et heure de l'entrée (optionnel)
                </span>
                <input
                  type="datetime-local"
                  value={entreeDateTime}
                  onChange={(e) => setEntreeDateTime(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                />
                <span className="block text-xs text-gray-500 mt-1">
                  Laisser vide = date et heure d'aujourd'hui. Renseigner pour saisir une entrée passée.
                </span>
              </label>
              <button
                onClick={submitEntree}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
              >
                <Save className="w-4 h-4" aria-hidden="true" /> Enregistrer l'entrée
              </button>
            </div>
          )}

          {tab === 'niveau' && (
            <>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft space-y-3">
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
                  disabled={!dim}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                  placeholder="ex : 180"
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
                  disabled={!dim}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                />
              </label>
              <label className="text-sm block">
                <span className="flex items-center gap-1.5 text-gray-600 mb-1">
                  <CalendarClock className="w-4 h-4" aria-hidden="true" /> Date et heure du relevé (optionnel)
                </span>
                <input
                  type="datetime-local"
                  value={niveauDateTime}
                  onChange={(e) => setNiveauDateTime(e.target.value)}
                  disabled={!dim}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                />
                <span className="block text-xs text-gray-500 mt-1">
                  Laisser vide = date et heure d'aujourd'hui. Renseigner pour saisir un relevé passé.
                </span>
              </label>
              <button
                onClick={submitNiveau}
                disabled={busy || !dim}
                className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
              >
                <Save className="w-4 h-4" aria-hidden="true" /> Enregistrer le relevé (déclenche un bilan)
              </button>

              {/* Courbe du niveau du bassin (volume mesuré) sur la période. */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  <Waves className="w-4 h-4" aria-hidden="true" /> Niveau du bassin (30 j)
                </div>
                {niveauSerie.length === 0 ? (
                  <EauEmptyState icon={Waves} title="Pas encore de relevé de niveau" />
                ) : (
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={niveauSerie.map((p) => ({ ...p, x: p.label.slice(5) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={32} />
                      <Tooltip formatter={(v: number) => fmtM3(v)} />
                      <Line type="monotone" dataKey="value" name="Niveau" stroke="#10939F" dot={false} strokeWidth={2} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Section réservée à l'admin : édition / suppression d'un relevé + recalcul des bilans. */}
            {roles.admin && (
              <details className="rounded-xl border border-ahuvi-200 bg-white shadow-soft">
                <summary className="flex items-center gap-2 cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ahuvi-forest">
                  <ListChecks className="w-4 h-4" aria-hidden="true" /> Relevés récents (admin)
                </summary>
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-xs text-gray-500 leading-snug">
                    Un bilan compare deux relevés qui se suivent (niveau précédent → niveau actuel)
                    pour estimer la consommation et les pertes. Quand vous modifiez ou supprimez un
                    relevé, les bilans concernés — celui de ce relevé et celui du relevé suivant —
                    sont recalculés automatiquement. Le bouton « Recalculer tous les bilans » refait
                    toute la série depuis le début (utile une fois pour les relevés importés).
                  </p>

                  {!isOnline && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Connectez-vous pour corriger un relevé.
                    </div>
                  )}

                  {relevesList.length === 0 ? (
                    <EauEmptyState icon={Ruler} title="Aucun relevé de niveau pour l'instant" />
                  ) : (
                    <ul className="space-y-2">
                      {relevesList.map((r) => (
                        <li key={r.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                          {editing?.id === r.id ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <label className="block">
                                  <span className="block text-xs text-gray-600 mb-1">Hauteur (cm)</span>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    value={editing.hauteur}
                                    onChange={(e) => setEditing((prev) => (prev ? { ...prev, hauteur: e.target.value } : prev))}
                                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                                  />
                                </label>
                                <label className="block">
                                  <span className="block text-xs text-gray-600 mb-1">Date et heure</span>
                                  <input
                                    type="datetime-local"
                                    value={editing.datetime}
                                    onChange={(e) => setEditing((prev) => (prev ? { ...prev, datetime: e.target.value } : prev))}
                                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                                  />
                                </label>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={saveEdit}
                                  disabled={busy}
                                  className="inline-flex items-center gap-1.5 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                                >
                                  <Save className="w-3.5 h-3.5" aria-hidden="true" /> Enregistrer
                                </button>
                                <button
                                  onClick={() => setEditing(null)}
                                  disabled={busy}
                                  className="inline-flex items-center gap-1.5 bg-white border border-ahuvi-200 text-ahuvi-forest text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <EauListIcon icon={Ruler} tone="teal" />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-800">
                                  {r.hauteur_cm} cm · {fmtM3(r.volume_m3)}
                                </div>
                                <div className="text-xs text-gray-500">{fmtDate(r.timestamp)}</div>
                              </div>
                              <button
                                onClick={() => setEditing({ id: r.id, hauteur: String(r.hauteur_cm), datetime: isoToLocalInput(r.timestamp) })}
                                disabled={busy || !isOnline}
                                aria-label="Modifier le relevé"
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-ahuvi-forest hover:bg-ahuvi-50 disabled:opacity-40"
                              >
                                <Pencil className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => removeReleve(r)}
                                disabled={busy || !isOnline}
                                aria-label="Supprimer le relevé"
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    onClick={recomputeAll}
                    disabled={recomputing || busy || !isOnline}
                    className="w-full inline-flex items-center justify-center gap-2 bg-white border border-ahuvi-200 text-ahuvi-forest hover:bg-ahuvi-50 disabled:opacity-50 text-sm font-medium py-2.5 rounded-lg"
                  >
                    <RefreshCw className={`w-4 h-4 ${recomputing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {recomputing ? 'Recalcul…' : 'Recalculer tous les bilans'}
                  </button>
                </div>
              </details>
            )}
            </>
          )}

          {tab === 'debit' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft space-y-3">
                <div className="text-xs text-gray-500">
                  Test « vanne fermée » : fermez la sortie, relevez le niveau au début et à la fin,
                  notez la durée — le débit d'apport Q_in est déduit automatiquement.
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
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Début (cm)</span>
                    <input
                      type="number" inputMode="decimal" step="0.1"
                      value={debitDebutCm}
                      onChange={(e) => setDebitDebutCm(e.target.value)}
                      disabled={surface == null}
                      className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                      placeholder="ex : 150"
                    />
                  </label>
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Fin (cm)</span>
                    <input
                      type="number" inputMode="decimal" step="0.1"
                      value={debitFinCm}
                      onChange={(e) => setDebitFinCm(e.target.value)}
                      disabled={surface == null}
                      className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                      placeholder="ex : 160"
                    />
                  </label>
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Durée (min)</span>
                    <input
                      type="number" inputMode="decimal" step="1"
                      value={debitDureeMin}
                      onChange={(e) => setDebitDureeMin(e.target.value)}
                      disabled={surface == null}
                      className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                      placeholder="ex : 60"
                    />
                  </label>
                </div>

                {debitFinAuDessusFlotteur && (
                  <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    ⚠️ Le niveau final dépasse la hauteur du flotteur — test au-delà du plafond opérationnel.
                  </div>
                )}
                {debitPreview != null && (
                  debitPreview.valid ? (
                    <div className="text-sm text-ahuvi-teal bg-cyan-50 rounded-lg px-3 py-2">
                      Débit d'apport Q_in : <strong>{debitPreview.debitM3h.toFixed(1)} m³/h</strong>
                      <span className="text-ahuvi-teal/60"> ({fmtM3(debitPreview.volumeM3)} en {debitDureeMin} min)</span>
                    </div>
                  ) : (
                    <div className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{debitPreview.error}</div>
                  )
                )}
                <label className="text-sm block">
                  <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                  <input
                    type="text"
                    value={debitNote}
                    onChange={(e) => setDebitNote(e.target.value)}
                    disabled={surface == null}
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
                  />
                </label>
                <button
                  onClick={submitDebit}
                  disabled={busy || surface == null || !(debitPreview?.valid)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
                >
                  <Save className="w-4 h-4" aria-hidden="true" /> Enregistrer le test de débit
                </button>
              </div>

              {/* Historique des tests — débit courant (le plus récent) mis en évidence. */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
                <h3 className="flex items-center gap-1.5 font-semibold text-ahuvi-forest mb-2 text-sm">
                  <Gauge className="w-4 h-4" aria-hidden="true" /> Historique des tests
                </h3>
                {tests.length === 0 ? (
                  <EauEmptyState icon={Gauge} title="Aucun test de débit pour l'instant" />
                ) : (
                  <>
                    {/* Graphe en barres : débit (m³/h) des derniers tests, du plus ancien au plus récent. */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <Activity className="w-3.5 h-3.5" aria-hidden="true" /> Débit mesuré (m³/h)
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
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
                        <li
                          key={t.id}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${
                            i === 0 ? 'border-ahuvi-300 bg-ahuvi-50' : 'border-gray-100 bg-gray-50'
                          }`}
                        >
                          <EauListIcon icon={Gauge} tone={i === 0 ? 'teal' : 'neutral'} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-ahuvi-teal">
                                {t.debit_m3h.toFixed(1)} m³/h
                                {i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wide text-ahuvi-olive">débit courant</span>}
                              </span>
                              {t.ecart_pct != null && (
                                <span className="text-xs text-gray-500">écart {t.ecart_pct.toFixed(0)} %</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {fmtDate(t.timestamp)} · {t.niveau_debut_cm}→{t.niveau_fin_cm} cm en {t.duree_min} min
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </EauPageShell>
  );
}
