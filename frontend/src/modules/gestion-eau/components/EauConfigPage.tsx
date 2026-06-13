/** Configuration /gestion-eau/config (admin) : bassin, tarif, seuils, copropriété. */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Gauge, Building2, Map, Trash2, Save } from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauIconButton } from './EauUi';
import { EauReadOnlyBadge } from './EauReadOnly';
import { AIDE } from './eauAideTextes';
import { getConfig, refreshConfig, saveConfig } from '../services/eauConfigService';
import { bassinDeductions, isBassinModelComplete } from '../utils/bassin';
import { fmtM3 } from '../utils/format';
import { countTiles, clearTiles } from '../db/eauTiles';
import { useGestionEau } from '../context';
import { supabase, withTimeout } from '../../../lib/supabase';
import type { ConfigLocal } from '../types/gestionEau';

type FormState = Record<string, string>;

/**
 * Clés des 6 SEUILS D'ALERTE réglables par le promoteur (via la RPC SECURITY DEFINER
 * `eau_set_alert_thresholds`). Les autres champs de config lui restent en lecture seule.
 */
const THRESHOLD_KEYS = [
  'seuil_pct',
  'seuil_m3',
  'seuil_aberrant_facteur',
  'jours_sans_releve_alerte',
  'bassin_seuil_critique_pct',
  'debit_ecart_max_pct',
] as const;
const isThresholdKey = (k: string): boolean => (THRESHOLD_KEYS as readonly string[]).includes(k);

const NUM_FIELDS: { key: keyof ConfigLocal; label: string; step?: string; hint?: string }[] = [
  { key: 'bassin_longueur_m', label: 'Longueur bassin (m)', step: '0.01' },
  { key: 'bassin_largeur_m', label: 'Largeur bassin (m)', step: '0.01' },
  { key: 'bassin_hauteur_flotteur_m', label: 'Hauteur flotteur (m)', step: '0.01', hint: 'Arrêt pompes — plafond opérationnel' },
  { key: 'bassin_hauteur_trop_plein_m', label: 'Hauteur trop-plein (m)', step: '0.01', hint: 'Sécurité (≥ flotteur)' },
  { key: 'bassin_band_flotteur_cm', label: 'Bande flotteur (cm)', step: '1', hint: 'Redémarrage pompe sous le flotteur (déf. 10)' },
  { key: 'debit_ecart_max_pct', label: 'Écart débit max (%)', step: '1', hint: 'Alerte si test instable (déf. 15)' },
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
  const { isReadOnly } = useGestionEau();
  const [form, setForm] = useState<FormState>({});
  const [devise, setDevise] = useState('MGA');
  const [coproNom, setCoproNom] = useState('');
  const [coproContact, setCoproContact] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tileCount, setTileCount] = useState<number | null>(null);
  const [purging, setPurging] = useState(false);

  /** Recopie une config (locale ou serveur) dans l'état du formulaire. */
  const applyConfig = (cfg: ConfigLocal | null) => {
    const f: FormState = {};
    for (const { key } of [...NUM_FIELDS, ...MAP_FIELDS]) {
      const v = cfg?.[key];
      f[key as string] = v == null ? '' : String(v);
    }
    setForm(f);
    setDevise(cfg?.devise ?? 'MGA');
    setCoproNom(cfg?.copro_nom ?? '');
    setCoproContact(cfg?.copro_contact ?? '');
  };

  useEffect(() => {
    (async () => {
      const online = navigator.onLine;
      const cfg = (await refreshConfig(online)) ?? (await getConfig());
      applyConfig(cfg);
      setTileCount(await countTiles());
      setLoading(false);
    })();
  }, []);

  const purgerCacheCarte = async () => {
    if (isReadOnly) return; // garde lecture seule (promoteur)
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

  // Déductions géométriques en lecture seule (surface, volume utile/sécurité, m³/cm).
  const deductions = (() => {
    const longueurM = parsedNum('bassin_longueur_m');
    const largeurM = parsedNum('bassin_largeur_m');
    const hauteurFlotteurM = parsedNum('bassin_hauteur_flotteur_m');
    const tpRaw = parsedNum('bassin_hauteur_trop_plein_m');
    // Trop-plein optionnel : repli sur le flotteur (pas de marge de sécurité connue).
    const hauteurTropPleinM = tpRaw && tpRaw > 0 ? tpRaw : hauteurFlotteurM;
    const model = {
      longueurM: longueurM ?? undefined,
      largeurM: largeurM ?? undefined,
      hauteurFlotteurM: hauteurFlotteurM ?? undefined,
      hauteurTropPleinM: hauteurTropPleinM ?? undefined,
    };
    return isBassinModelComplete(model) ? bassinDeductions(model) : null;
  })();

  // Promoteur : enregistre UNIQUEMENT les 6 seuils d'alerte via la RPC SECURITY DEFINER
  // (la RLS refuse un saveConfig direct). null = « ne pas changer » (coalesce côté SQL).
  const saveThresholdsAsPromoteur = async () => {
    const { error } = (await withTimeout(
      (supabase.rpc as any)('eau_set_alert_thresholds', {
        p_seuil_pct: parsedNum('seuil_pct'),
        p_seuil_m3: parsedNum('seuil_m3'),
        p_seuil_aberrant_facteur: parsedNum('seuil_aberrant_facteur'),
        p_jours_sans_releve_alerte: parsedNum('jours_sans_releve_alerte'),
        p_bassin_seuil_critique_pct: parsedNum('bassin_seuil_critique_pct'),
        p_debit_ecart_max_pct: parsedNum('debit_ecart_max_pct'),
      }),
      8000,
      'eau:setAlertThresholds'
    )) as any;
    if (error) throw error;
    // Re-tirer la config serveur pour rafraîchir l'affichage (source de vérité).
    applyConfig(await refreshConfig(navigator.onLine));
  };

  const onSave = async () => {
    setSaving(true);
    try {
      if (isReadOnly) {
        await saveThresholdsAsPromoteur();
        toast.success('Seuils d’alerte enregistrés');
        return;
      }
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
    <EauPageShell
      title="Configuration"
      subtitle="Paramètres du bassin et seuils (admin)"
      aide={AIDE.config}
      actions={isReadOnly ? <EauReadOnlyBadge /> : undefined}
    >
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
              <Gauge className="w-5 h-5 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
              Dimensions & tarif
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {NUM_FIELDS.map(({ key, label, step, hint }) => {
                // Promoteur : seuls les 6 champs de seuils d'alerte restent éditables.
                const disabled = isReadOnly && !isThresholdKey(key as string);
                return (
                  <label key={key as string} className="text-sm">
                    <span className="block text-gray-600 mb-1">{label}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={step}
                      value={form[key as string] ?? ''}
                      disabled={disabled}
                      onChange={(e) => set(key as string, e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    />
                    {hint && <span className="block text-xs text-gray-400 mt-0.5">{hint}</span>}
                  </label>
                );
              })}
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Devise</span>
                <input
                  type="text"
                  value={devise}
                  disabled={isReadOnly}
                  onChange={(e) => setDevise(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </label>
            </div>
            {deductions != null && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-ahuvi-800 bg-ahuvi-50 rounded-lg px-3 py-2">
                <div>Surface : <strong>{deductions.surfaceM2.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} m²</strong></div>
                <div>Volume utile : <strong>{fmtM3(deductions.volumeUtileM3)}</strong></div>
                <div>m³ / cm : <strong>{deductions.m3ParCm.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}</strong></div>
                <div>Volume sécurité : <strong>{fmtM3(deductions.volumeSecuriteM3)}</strong></div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
              <Building2 className="w-5 h-5 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
              Copropriété
            </h2>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Nom</span>
                <input
                  type="text"
                  value={coproNom}
                  disabled={isReadOnly}
                  onChange={(e) => setCoproNom(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600 mb-1">Contact</span>
                <input
                  type="text"
                  value={coproContact}
                  disabled={isReadOnly}
                  onChange={(e) => setCoproContact(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
            <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-1.5">
              <Map className="w-5 h-5 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
              Zone carte (hors-ligne)
            </h2>
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
                    disabled={isReadOnly}
                    onChange={(e) => set(key as string, e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
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
              <EauIconButton
                icon={Trash2}
                variant="danger"
                onClick={purgerCacheCarte}
                disabled={purging || !tileCount || isReadOnly}
                className="text-xs px-3 py-1.5 disabled:cursor-not-allowed"
              >
                {purging ? 'Purge…' : 'Purger le cache carte'}
              </EauIconButton>
            </div>
          </div>

          {isReadOnly && (
            <p className="text-xs text-ahuvi-olive flex items-center gap-1.5 -mb-1">
              Mode promoteur : seuls les seuils d’alerte (Seuil anomalie %, m³, facteur aberrant,
              jours sans relevé, bassin critique %, écart débit max %) sont modifiables.
            </p>
          )}
          <EauIconButton
            icon={Save}
            variant="primary"
            onClick={onSave}
            disabled={saving}
            className="w-full py-3 rounded-xl"
          >
            {saving
              ? 'Enregistrement…'
              : isReadOnly
              ? 'Enregistrer les seuils d’alerte'
              : 'Enregistrer la configuration'}
          </EauIconButton>
        </div>
      )}
    </EauPageShell>
  );
}
