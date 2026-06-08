/**
 * Saisie compteur /gestion-eau/saisie-compteur (releveur/admin).
 * Recherche → liste groupée par zone → sélection → dernier index + date →
 * saisie nouvel index → conso instantanée. Gère rupture (index <) + aberrant.
 */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import {
  ChevronLeft, ChevronRight, ScanLine, Camera, Save, Gauge, AlertTriangle, Flag, Trash2, BarChart3,
} from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauEmptyState, EauListIcon } from './EauUi';
import { EauReadOnlyBadge } from './EauReadOnly';
import { AIDE } from './eauAideTextes';
import { useGestionEau } from '../context';
import { listCompteursActifs } from '../services/eauCompteurService';
import {
  evaluerReleveCompteur,
  addReleveCompteur,
  historiqueConsoCompteur,
} from '../services/eauReleveService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { showConfirm } from '../../../utils/dialogUtils';
import { fmtM3, fmtDate } from '../utils/format';
import { compressImageFile, dataUrlSizeKo } from '../utils/photo';
import type { CompteurLocal, ReleveCompteurLocal } from '../types/gestionEau';
import type { AberrantResult } from '../utils/bilan';

interface Evaluation {
  dernier: ReleveCompteurLocal | null;
  ruptureIndex: boolean;
  conso: number;
  aberrant: AberrantResult;
}

export default function EauSaisieCompteurPage({
  preselectCompteurId,
  onScanRequest,
}: {
  /** Compteur à préselectionner (deep-link depuis un scan ou la tournée). */
  preselectCompteurId?: string | null;
  /** Callback pour ouvrir le scanner caméra (fourni par la page-thème Relevés). */
  onScanRequest?: () => void;
} = {}) {
  const { isReadOnly } = useGestionEau();
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CompteurLocal | null>(null);
  const [indexStr, setIndexStr] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [evalState, setEvalState] = useState<Evaluation | null>(null);
  const [histo, setHisto] = useState<{ i: number; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const list = await listCompteursActifs();
    setCompteurs(list);
  };

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, []);

  // Préselection directe (scan d'un QR compteur ou choix depuis la tournée) :
  // dès que la liste est chargée, sélectionne le compteur ciblé sans action manuelle.
  useEffect(() => {
    if (!preselectCompteurId || compteurs.length === 0) return;
    if (selected?.id === preselectCompteurId) return;
    const target = compteurs.find((c) => c.id === preselectCompteurId);
    if (target) selectCompteur(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectCompteurId, compteurs]);

  // Filtrage + regroupement par zone
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? compteurs.filter(
          (c) =>
            c.nom.toLowerCase().includes(q) ||
            (c.proprietaire ?? '').toLowerCase().includes(q) ||
            (c.zone ?? '').toLowerCase().includes(q)
        )
      : compteurs;
    const map = new Map<string, CompteurLocal[]>();
    for (const c of filtered) {
      const z = c.zone ?? 'Sans zone';
      if (!map.has(z)) map.set(z, []);
      map.get(z)!.push(c);
    }
    return Array.from(map.entries());
  }, [compteurs, query]);

  const selectCompteur = async (c: CompteurLocal) => {
    setSelected(c);
    setIndexStr('');
    setNote('');
    setPhoto(null);
    setEvalState(null);
    setHisto([]);
    try {
      const hist = await historiqueConsoCompteur(c.id);
      setHisto(hist.slice(-12).map((value, i) => ({ i: i + 1, value })));
    } catch {
      setHisto([]);
    }
  };

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await compressImageFile(file);
      setPhoto(dataUrl);
    } catch {
      toast.error('Photo illisible');
    } finally {
      setPhotoBusy(false);
      e.target.value = ''; // permet de reprendre la même photo
    }
  };

  // Recalcule l'évaluation à chaque changement d'index
  useEffect(() => {
    if (!selected) return;
    const n = Number(indexStr);
    if (indexStr.trim() === '' || !Number.isFinite(n)) {
      setEvalState(null);
      return;
    }
    let alive = true;
    (async () => {
      const ev = await evaluerReleveCompteur(selected.id, n);
      if (alive) setEvalState(ev);
    })();
    return () => {
      alive = false;
    };
  }, [indexStr, selected]);

  const submit = async () => {
    if (isReadOnly) return;
    if (!selected) return;
    const n = Number(indexStr);
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Index invalide');
      return;
    }
    const ev = evalState ?? (await evaluerReleveCompteur(selected.id, n));

    // Confirmation rupture
    if (ev.ruptureIndex) {
      const ok = await showConfirm(
        `L'index saisi (${n}) est INFÉRIEUR au dernier index (${ev.dernier?.index}). ` +
          `Cela indique un compteur remis à zéro / remplacé (rupture). La conso de l'intervalle sera 0. Confirmer ?`,
        'Rupture d\'index',
        { variant: 'warning', confirmText: 'Confirmer' }
      );
      if (!ok) return;
    }

    // Confirmation aberrant
    if (!ev.ruptureIndex && ev.aberrant.aberrant) {
      const sens = ev.aberrant.type === 'haut' ? 'anormalement ÉLEVÉE' : 'anormalement BASSE';
      const ok = await showConfirm(
        `La consommation calculée (${ev.conso} m³) est ${sens} par rapport à l'historique. Confirmer quand même ?`,
        'Relevé aberrant',
        { variant: 'warning', confirmText: 'Confirmer' }
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      await addReleveCompteur({
        compteur_id: selected.id,
        index: n,
        rupture_index: ev.ruptureIndex,
        aberrant_confirme: !ev.ruptureIndex && ev.aberrant.aberrant,
        note: note || null,
        photo_url: photo,
        agent_id: getCurrentUserIdSync(),
      });
      toast.success(
        ev.ruptureIndex
          ? 'Relevé enregistré (rupture d\'index)'
          : `Relevé enregistré — conso ${fmtM3(ev.conso)}`
      );
      setSelected(null);
      setIndexStr('');
      setNote('');
      setPhoto(null);
      setEvalState(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <EauPageShell title="Saisie compteur" subtitle="Relevé d'index des compteurs" aide={AIDE.saisieCompteur}>
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : selected ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button className="inline-flex items-center gap-1 text-sm text-ahuvi-olive hover:underline" onClick={() => setSelected(null)}>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Retour à la liste
            </button>
            {isReadOnly && <EauReadOnlyBadge />}
          </div>
          <div className="flex items-center gap-2">
            <EauListIcon icon={Gauge} tone="teal" />
            <div>
              <div className="font-semibold text-gray-900">{selected.nom}</div>
              <div className="text-sm text-gray-500">
                {selected.zone ?? 'Sans zone'} · {selected.type}
                {selected.proprietaire ? ` · ${selected.proprietaire}` : ''}
              </div>
            </div>
          </div>

          {/* Histogramme de consommation par période (12 derniers relevés) du compteur sélectionné. */}
          {histo.length > 0 && (
            <div className="rounded-lg border border-ahuvi-100 bg-ahuvi-50/40 p-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" /> Consommation par période
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={histo}>
                  <XAxis dataKey="i" hide />
                  <Tooltip formatter={(val: number) => fmtM3(val)} labelFormatter={() => ''} />
                  <Bar dataKey="value" fill="#4C6D40" radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="text-sm bg-gray-50 rounded-lg px-3 py-2">
            {evalState?.dernier || selected ? (
              <DernierIndex compteurId={selected.id} ev={evalState} />
            ) : null}
          </div>

          <label className="text-sm block">
            <span className="block text-gray-600 mb-1">Nouvel index</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              value={indexStr}
              onChange={(e) => setIndexStr(e.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              placeholder="Index relevé"
              autoFocus
            />
          </label>

          {evalState && (
            <div className="space-y-1">
              {evalState.ruptureIndex ? (
                <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Index inférieur au précédent → rupture (conso intervalle = 0)</span>
                </div>
              ) : (
                <div className="text-sm text-ahuvi-teal bg-cyan-50 rounded-lg px-3 py-2">
                  Consommation : <strong>{fmtM3(evalState.conso)}</strong>
                </div>
              )}
              {!evalState.ruptureIndex && evalState.aberrant.aberrant && (
                <div className="flex items-start gap-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  <Flag className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>Relevé aberrant ({evalState.aberrant.type === 'haut' ? 'trop élevé' : 'trop bas'}) — confirmation requise</span>
                </div>
              )}
            </div>
          )}

          <label className="text-sm block">
            <span className="block text-gray-600 mb-1">Note (optionnel)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
            />
          </label>

          {/* Photo de relevé (optionnelle) — capture caméra + compression locale. */}
          <div className="text-sm">
            <span className="block text-gray-600 mb-1">Photo du compteur (optionnel)</span>
            {photo ? (
              <div className="flex items-center gap-3">
                <img src={photo} alt="Relevé" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                <div className="text-xs text-gray-500">
                  <div>≈ {dataUrlSizeKo(photo)} Ko</div>
                  <button onClick={() => setPhoto(null)} disabled={isReadOnly} className="inline-flex items-center gap-1 text-rose-600 hover:underline mt-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline">
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Retirer
                  </button>
                </div>
              </div>
            ) : (
              <label className={`flex items-center justify-center gap-2 w-full border border-dashed border-gray-300 rounded-lg py-3 text-gray-500 ${isReadOnly ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
                <Camera className="w-4 h-4" aria-hidden="true" />
                {photoBusy ? 'Traitement…' : 'Prendre / choisir une photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPhotoChange}
                  className="hidden"
                  disabled={photoBusy || isReadOnly}
                />
              </label>
            )}
          </div>

          <button
            onClick={submit}
            disabled={busy || indexStr.trim() === '' || isReadOnly}
            className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl"
          >
            <Save className="w-4 h-4" aria-hidden="true" /> Enregistrer le relevé
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {isReadOnly && (
            <div className="flex justify-end">
              <EauReadOnlyBadge />
            </div>
          )}
          {onScanRequest && (
            <button
              onClick={onScanRequest}
              disabled={isReadOnly}
              className="w-full flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              <ScanLine className="w-4 h-4" aria-hidden="true" /> Scanner un QR
            </button>
          )}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom, villa, zone)…"
            className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
          />
          {grouped.length === 0 ? (
            <EauEmptyState icon={Gauge} title="Aucun compteur actif" hint="Aucun compteur ne correspond à votre recherche." />
          ) : (
            grouped.map(([zone, list]) => (
              <div key={zone}>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 px-1">{zone}</div>
                <div className="space-y-1">
                  {list.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCompteur(c)}
                      className="w-full text-left bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-ahuvi-50 flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <EauListIcon icon={Gauge} tone="neutral" />
                        <span className="min-w-0">
                          <span className="font-medium text-gray-900">{c.nom}</span>
                          {c.proprietaire && <span className="text-gray-400 text-sm"> · {c.proprietaire}</span>}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-xs text-gray-400">{c.type}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300" aria-hidden="true" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </EauPageShell>
  );
}

/** Affiche le dernier index + date du compteur sélectionné. */
function DernierIndex({ compteurId, ev }: { compteurId: string; ev: Evaluation | null }) {
  const [dernier, setDernier] = useState<ReleveCompteurLocal | null | undefined>(ev?.dernier ?? undefined);

  useEffect(() => {
    if (ev) {
      setDernier(ev.dernier);
      return;
    }
    let alive = true;
    (async () => {
      const { getDernierReleveCompteur } = await import('../services/eauReleveService');
      const d = await getDernierReleveCompteur(compteurId);
      if (alive) setDernier(d);
    })();
    return () => {
      alive = false;
    };
  }, [compteurId, ev]);

  if (dernier === undefined) return <span className="text-gray-400">Chargement du dernier index…</span>;
  if (dernier === null)
    return <span className="text-gray-500">Aucun relevé précédent — premier index pour ce compteur.</span>;
  return (
    <span className="text-gray-700">
      Dernier index : <strong>{dernier.index}</strong> le {fmtDate(dernier.timestamp)}
    </span>
  );
}
