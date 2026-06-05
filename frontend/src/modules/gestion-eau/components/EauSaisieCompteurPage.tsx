/**
 * Saisie compteur /gestion-eau/saisie-compteur (releveur/admin).
 * Recherche → liste groupée par zone → sélection → dernier index + date →
 * saisie nouvel index → conso instantanée. Gère rupture (index <) + aberrant.
 */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import EauPageShell from './EauPageShell';
import { AIDE } from './eauAideTextes';
import { listCompteursActifs } from '../services/eauCompteurService';
import {
  evaluerReleveCompteur,
  addReleveCompteur,
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
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CompteurLocal | null>(null);
  const [indexStr, setIndexStr] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [evalState, setEvalState] = useState<Evaluation | null>(null);
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
  };

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          <button className="text-sm text-sky-600 underline" onClick={() => setSelected(null)}>
            ← Retour à la liste
          </button>
          <div>
            <div className="font-semibold text-gray-900">{selected.nom}</div>
            <div className="text-sm text-gray-500">
              {selected.zone ?? 'Sans zone'} · {selected.type}
              {selected.proprietaire ? ` · ${selected.proprietaire}` : ''}
            </div>
          </div>

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
              className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
              placeholder="Index relevé"
              autoFocus
            />
          </label>

          {evalState && (
            <div className="space-y-1">
              {evalState.ruptureIndex ? (
                <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Index inférieur au précédent → rupture (conso intervalle = 0)
                </div>
              ) : (
                <div className="text-sm text-sky-700 bg-sky-50 rounded-lg px-3 py-2">
                  Consommation : <strong>{fmtM3(evalState.conso)}</strong>
                </div>
              )}
              {!evalState.ruptureIndex && evalState.aberrant.aberrant && (
                <div className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  🚩 Relevé aberrant ({evalState.aberrant.type === 'haut' ? 'trop élevé' : 'trop bas'}) — confirmation requise
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
              className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
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
                  <button onClick={() => setPhoto(null)} className="text-rose-600 hover:underline mt-1">
                    Retirer
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full border border-dashed border-gray-300 rounded-lg py-3 text-gray-500 cursor-pointer hover:bg-gray-50">
                {photoBusy ? 'Traitement…' : '📷 Prendre / choisir une photo'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPhotoChange}
                  className="hidden"
                  disabled={photoBusy}
                />
              </label>
            )}
          </div>

          <button
            onClick={submit}
            disabled={busy || indexStr.trim() === ''}
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
          >
            Enregistrer le relevé
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {onScanRequest && (
            <button
              onClick={onScanRequest}
              className="w-full flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-olive text-white text-sm font-semibold py-2.5 rounded-lg"
            >
              📷 Scanner un QR
            </button>
          )}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom, villa, zone)…"
            className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
          />
          {grouped.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-8">Aucun compteur actif.</div>
          ) : (
            grouped.map(([zone, list]) => (
              <div key={zone}>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 px-1">{zone}</div>
                <div className="space-y-1">
                  {list.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCompteur(c)}
                      className="w-full text-left bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-sky-50 flex items-center justify-between"
                    >
                      <span>
                        <span className="font-medium text-gray-900">{c.nom}</span>
                        {c.proprietaire && <span className="text-gray-400 text-sm"> · {c.proprietaire}</span>}
                      </span>
                      <span className="text-xs text-gray-400">{c.type}</span>
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
