/** Configuration /gestion-eau/config (admin) : bassin, tarif, seuils, copropriété. */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import EauPageShell from './EauPageShell';
import { getConfig, refreshConfig, saveConfig } from '../services/eauConfigService';
import { volumeMaxM3 } from '../utils/bassin';
import { fmtM3 } from '../utils/format';
import { countTiles, clearTiles } from '../db/eauTiles';
import type { ConfigLocal } from '../types/gestionEau';

type FormState = Record<string, string>;

const NUM_FIELDS: { key: keyof ConfigLocal; label: string; step?: string; hint?: string }[] = [
  { key: 'bassin_longueur_m', label: 'Longueur bassin (m)', step: '0.01' },
  { key: 'bassin_largeur_m', label: 'Largeur bassin (m)', step: '0.01' },
  { key: 'bassin_hauteur_max_m', label: 'Hauteur max (m)', step: '0.01' },
  { key: 'tarif_m3', label: 'Tarif / m³', step: '1' },
  { key: 'seuil_pct', label: 'Seuil anomalie (%)', step: '0.1', hint: 'Écart toléré en %' },
  { key: 'seuil_m3', label: 'Seuil anomalie (m³)', step: '0.1', hint: 'Écart toléré en m³' },
  { key: 'seuil_aberrant_facteur', label: 'Facteur relevé aberrant', step: '0.1', hint: '> 1 (ex : 3)' },
  { key: 'jours_sans_releve_alerte', label: 'Jours sans relevé → alerte', step: '1' },
  { key: 'bassin_seuil_critique_pct', label: 'Bassin seuil critique (%)', step: '1' },
  { key: 'periode_facturation_jours', label: 'Période facturation (jours)', step: '1' },
];

// Zone carte (Phase 3) : pré-téléchargement hors-ligne des tuiles OSM autour du centre.
const MAP_FIELDS: { key: keyof ConfigLocal; label: string; step?: string; hint?: string }[] = [
  { key: 'map_centre_lat', label: 'Centre — latitude', step: '0.000001', hint: 'ex. -13.41 (Nosy Be)' },
  { key: 'map_centre_lng', label: 'Centre — longitude', step: '0.000001', hint: 'ex. 48.27' },
  { key: 'map_rayon_km', label: 'Rayon (km)', step: '0.5', hint: 'zone à mettre en cache' },
  { key: 'map_zoom_min', label: 'Zoom min', step: '1', hint: 'ex. 13' },
  { key: 'map_zoom_max', label: 'Zoom max', step: '1', hint: 'ex. 17 (plus = plus de tuiles)' },
];

export default function EauConfigPage() {
  const [form, setForm] = useState<FormState>({});
  const [devise, setDevise] = useState('MGA');
  const [coproNom, setCoproNom] = useState('');
  const [coproContact, setCoproContact] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tileCount, setTileCount] = useState<number | null>(null);
  const [purging, setPurging] = useState(false);

  useEffect(() => {
    (async () => {
      const online = navigator.onLine;
      const cfg = (await refreshConfig(online)) ?? (await getConfig());
      const f: FormState = {};
      for (const { key } of [...NUM_FIELDS, ...MAP_FIELDS]) {
        const v = cfg?.[key];
        f[key as string] = v == null ? '' : String(v);
      }
      setForm(f);
      setDevise(cfg?.devise ?? 'MGA');
      setCoproNom(cfg?.copro_nom ?? '');
      setCoproContact(cfg?.copro_contact ?? '');
      setTileCount(await countTiles());
      setLoading(false);
    })();
  }, []);

  const purgerCacheCarte = async () => {
    setPurging(true);
    try {
      await clearTiles();
      setTileCount(0);
      toast.success('Cache carte purgé');
    } catch {
      toast.error('Échec de la purge');
    } finally {
      setPurging(false);
    }
  };

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const parsedNum = (k: string): number | null => {
    const raw = form[k];
    if (raw == null || raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const previewVolume = (() => {
    const L = parsedNum('bassin_longueur_m');
    const l = parsedNum('bassin_largeur_m');
    const h = parsedNum('bassin_hauteur_max_m');
    if (L && l && h && L > 0 && l > 0 && h > 0) return volumeMaxM3({ longueurM: L, largeurM: l, hauteurMaxM: h });
    return null;
  })();

  const onSave = async () => {
    setSaving(true);
    try {
      const patch: Partial<ConfigLocal> = {
        devise: devise || 'MGA',
        copro_nom: coproNom || null,
        copro_contact: coproContact || null,
      };
      for (const { key } of [...NUM_FIELDS, ...MAP_FIELDS]) {
        (patch as any)[key] = parsedNum(key as string);
      }
      await saveConfig(patch);
      toast.success('Configuration enregistrée');
    } catch (e: any) {
      toast.error('Échec de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <EauPageShell title="Configuration" subtitle="Paramètres du bassin et seuils (admin)">
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
            <h2 className="font-semibold text-gray-800 mb-3">Dimensions & tarif</h2>
            <div className="grid grid-cols-2 gap-3">
              {NUM_FIELDS.map(({ key, label, step, hint }) => (
                <label key={key as string} className="text-sm">
                  <span className="block text-gray-600 mb-1">{label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={step}
                    value={form[key as string] ?? ''}
                    onChange={(e) => set(key as string, e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  />
                  {hint && <span className="block text-xs text-gray-400 mt-0.5">{hint}</span>}
                </label>
              ))}
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Devise</span>
                <input
                  type="text"
                  value={devise}
                  onChange={(e) => setDevise(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                />
              </label>
            </div>
            {previewVolume != null && (
              <div className="mt-3 text-sm text-sky-700 bg-sky-50 rounded-lg px-3 py-2">
                Volume max calculé : <strong>{fmtM3(previewVolume)}</strong>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
            <h2 className="font-semibold text-gray-800 mb-3">Copropriété</h2>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Nom</span>
                <input
                  type="text"
                  value={coproNom}
                  onChange={(e) => setCoproNom(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Contact</span>
                <input
                  type="text"
                  value={coproContact}
                  onChange={(e) => setCoproContact(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
            <h2 className="font-semibold text-gray-800 mb-1">Zone carte (hors-ligne)</h2>
            <p className="text-xs text-gray-400 mb-3">
              Définit la zone pré-téléchargée pour la carte des compteurs utilisable sans connexion.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {MAP_FIELDS.map(({ key, label, step, hint }) => (
                <label key={key as string} className="text-sm">
                  <span className="block text-gray-600 mb-1">{label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={step}
                    value={form[key as string] ?? ''}
                    onChange={(e) => set(key as string, e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  />
                  {hint && <span className="block text-xs text-gray-400 mt-0.5">{hint}</span>}
                </label>
              ))}
            </div>
            {/* Purge du cache de tuiles cartographiques (hors-ligne). */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500">
                {tileCount == null ? 'Cache carte…' : `${tileCount} tuile(s) en cache`}
              </span>
              <button
                onClick={purgerCacheCarte}
                disabled={purging || !tileCount}
                className="text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg"
              >
                {purging ? 'Purge…' : '🗑️ Purger le cache carte'}
              </button>
            </div>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-soft"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
          </button>
        </div>
      )}
    </EauPageShell>
  );
}
