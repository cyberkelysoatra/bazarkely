/**
 * Tiroir « Saisir » d'un relevé de compteur (page Relevés v2, façon Transactions).
 *
 * Condense la logique de saisie de EauSaisieCompteurPage (eau, m³) et EauSaisieElecPage
 * (élec, kWh) dans un tiroir accordéon, SANS dupliquer la logique métier : réutilise
 * `evaluerReleveCompteur`/`addReleveCompteur` (eau) et `evaluerReleveElec`/`addReleveElec`
 * (élec). Un même compteur physique (eau_compteurs.id) porte les deux index ; un petit
 * sélecteur Eau/Élec choisit la nature du relevé à enregistrer.
 *
 * Offline-first : l'écriture passe par les services (Dexie d'abord, upsert idempotent par
 * id client) — un envoi expiré n'est pas un échec. Désactivé en lecture seule.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Save, AlertTriangle, Flag, Trash2, Droplet, Zap } from 'lucide-react';
import { useGestionEau } from '../context';
import {
  evaluerReleveCompteur,
  addReleveCompteur,
  getDernierReleveCompteur,
} from '../services/eauReleveService';
import {
  evaluerReleveElec,
  addReleveElec,
  getDernierReleveElec,
} from '../services/eauElecReleveService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { showConfirm } from '../../../utils/dialogUtils';
import { fmtM3, fmtKwh, fmtDate } from '../utils/format';
import { compressImageFile, dataUrlSizeKo } from '../utils/photo';
import type { CompteurLocal } from '../types/gestionEau';
import type { AberrantResult } from '../utils/bilan';

export type ReleveFacet = 'eau' | 'elec';

interface Evaluation {
  dernierIndex: number | null;
  dernierDate: string | null;
  ruptureIndex: boolean;
  conso: number;
  aberrant: AberrantResult;
}

export default function EauTiroirSaisie({
  compteur,
  defaultFacet,
  onSaved,
}: {
  compteur: CompteurLocal;
  defaultFacet: ReleveFacet;
  /** Appelé après un enregistrement réussi (le parent rafraîchit la liste + KPI). */
  onSaved: () => void;
}) {
  const { isReadOnly } = useGestionEau();
  const [facet, setFacet] = useState<ReleveFacet>(defaultFacet);
  const [indexStr, setIndexStr] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [evalState, setEvalState] = useState<Evaluation | null>(null);
  const [dernier, setDernier] = useState<{ index: number; date: string } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const unit = facet === 'eau' ? 'm³' : 'kWh';
  const fmt = facet === 'eau' ? fmtM3 : fmtKwh;

  // Réinitialise la saisie + charge le dernier index quand on change de nature de relevé.
  useEffect(() => {
    let alive = true;
    setIndexStr('');
    setNote('');
    setPhoto(null);
    setEvalState(null);
    setDernier(undefined);
    (async () => {
      const d =
        facet === 'eau'
          ? await getDernierReleveCompteur(compteur.id)
          : await getDernierReleveElec(compteur.id);
      if (alive) setDernier(d ? { index: d.index, date: d.timestamp } : null);
    })();
    return () => {
      alive = false;
    };
  }, [facet, compteur.id]);

  // Recalcule l'évaluation (conso prévue, rupture, aberrant) à chaque changement d'index.
  useEffect(() => {
    const n = Number(indexStr);
    if (indexStr.trim() === '' || !Number.isFinite(n)) {
      setEvalState(null);
      return;
    }
    let alive = true;
    (async () => {
      const ev =
        facet === 'eau'
          ? await evaluerReleveCompteur(compteur.id, n)
          : await evaluerReleveElec(compteur.id, n);
      if (alive) {
        setEvalState({
          dernierIndex: ev.dernier?.index ?? null,
          dernierDate: ev.dernier?.timestamp ?? null,
          ruptureIndex: ev.ruptureIndex,
          conso: ev.conso,
          aberrant: ev.aberrant,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [indexStr, facet, compteur.id]);

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
      e.target.value = '';
    }
  };

  const submit = async () => {
    if (isReadOnly || busy) return;
    const n = Number(indexStr);
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Index invalide');
      return;
    }
    const evRaw =
      facet === 'eau'
        ? await evaluerReleveCompteur(compteur.id, n)
        : await evaluerReleveElec(compteur.id, n);

    if (evRaw.ruptureIndex) {
      const ok = await showConfirm(
        `L'index saisi (${n}) est INFÉRIEUR au dernier index (${evRaw.dernier?.index}). ` +
          `Cela indique un compteur remis à zéro / remplacé (rupture). La conso de l'intervalle sera 0. Confirmer ?`,
        "Rupture d'index",
        { variant: 'warning', confirmText: 'Confirmer' }
      );
      if (!ok) return;
    }
    if (!evRaw.ruptureIndex && evRaw.aberrant.aberrant) {
      const sens = evRaw.aberrant.type === 'haut' ? 'anormalement ÉLEVÉE' : 'anormalement BASSE';
      const ok = await showConfirm(
        `La consommation calculée (${evRaw.conso} ${unit}) est ${sens} par rapport à l'historique. Confirmer quand même ?`,
        'Relevé aberrant',
        { variant: 'warning', confirmText: 'Confirmer' }
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      const payload = {
        compteur_id: compteur.id,
        index: n,
        rupture_index: evRaw.ruptureIndex,
        aberrant_confirme: !evRaw.ruptureIndex && evRaw.aberrant.aberrant,
        note: note || null,
        photo_url: photo,
        agent_id: getCurrentUserIdSync(),
      };
      if (facet === 'eau') await addReleveCompteur(payload);
      else await addReleveElec(payload);
      toast.success(
        evRaw.ruptureIndex
          ? "Relevé enregistré (rupture d'index)"
          : `Relevé enregistré — conso ${fmt(evRaw.conso)}`
      );
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Sélecteur de nature du relevé (eau / élec) — même compteur physique. */}
      <div className="inline-flex rounded-lg border border-ahuvi-200 bg-white p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setFacet('eau')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
            facet === 'eau' ? 'bg-ahuvi-teal text-white' : 'text-ahuvi-forest hover:bg-ahuvi-50'
          }`}
        >
          <Droplet className="w-4 h-4" aria-hidden="true" /> Eau (m³)
        </button>
        <button
          type="button"
          onClick={() => setFacet('elec')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
            facet === 'elec' ? 'bg-ahuvi-gold text-white' : 'text-ahuvi-forest hover:bg-ahuvi-50'
          }`}
        >
          <Zap className="w-4 h-4" aria-hidden="true" /> Élec (kWh)
        </button>
      </div>

      <div className="text-sm bg-gray-50 rounded-lg px-3 py-2 text-gray-700">
        {dernier === undefined ? (
          <span className="text-gray-400">Chargement du dernier index…</span>
        ) : dernier === null ? (
          <span className="text-gray-500">Aucun relevé précédent — premier index pour ce compteur.</span>
        ) : (
          <span>
            Dernier index : <strong>{dernier.index}</strong> {unit} le {fmtDate(dernier.date)}
          </span>
        )}
      </div>

      <label className="text-sm block">
        <span className="block text-gray-600 mb-1">Nouvel index ({unit})</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.001"
          value={indexStr}
          onChange={(e) => setIndexStr(e.target.value)}
          disabled={isReadOnly}
          className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          placeholder={`Index relevé (${unit})`}
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
            <div
              className={`text-sm rounded-lg px-3 py-2 ${
                facet === 'eau' ? 'text-ahuvi-teal bg-cyan-50' : 'text-ahuvi-olive bg-amber-50/60'
              }`}
            >
              Consommation : <strong>{fmt(evalState.conso)}</strong>
            </div>
          )}
          {!evalState.ruptureIndex && evalState.aberrant.aberrant && (
            <div className="flex items-start gap-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              <Flag className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <span>
                Relevé aberrant ({evalState.aberrant.type === 'haut' ? 'trop élevé' : 'trop bas'}) — confirmation
                requise
              </span>
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

      <div className="text-sm">
        <span className="block text-gray-600 mb-1">Photo du compteur (optionnel)</span>
        {photo ? (
          <div className="flex items-center gap-3">
            <img src={photo} alt="Relevé" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
            <div className="text-xs text-gray-500">
              <div>≈ {dataUrlSizeKo(photo)} Ko</div>
              <button
                onClick={() => setPhoto(null)}
                disabled={isReadOnly}
                className="inline-flex items-center gap-1 text-rose-600 hover:underline mt-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Retirer
              </button>
            </div>
          </div>
        ) : (
          <label
            className={`flex items-center justify-center gap-2 w-full border border-dashed border-gray-300 rounded-lg py-3 text-gray-500 ${
              isReadOnly ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'
            }`}
          >
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
  );
}
