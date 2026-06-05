/**
 * Configuration du module (eau_config — singleton). Offline-first.
 */
import { eauDb } from '../db/gestionEauDb';
import { pullTable, saveLocal } from './eauSync';
import { CONFIG_SINGLETON_ID } from '../types/gestionEau';
import type { ConfigLocal } from '../types/gestionEau';
import type { BassinDimensions } from '../utils/bassin';
import { isConfigComplete as isComplete, configMissingFields as missingFields } from '../utils/facture';

/** Valeurs par défaut d'une config vierge (devise MGA). */
function emptyConfig(): ConfigLocal {
  return {
    id: CONFIG_SINGLETON_ID,
    bassin_longueur_m: null,
    bassin_largeur_m: null,
    bassin_hauteur_max_m: null,
    bassin_hauteur_flotteur_m: null,
    bassin_hauteur_trop_plein_m: null,
    debit_ecart_max_pct: null,
    tarif_m3: null,
    devise: 'MGA',
    seuil_pct: null,
    seuil_m3: null,
    periode_facturation_jours: null,
    seuil_aberrant_facteur: null,
    jours_sans_releve_alerte: null,
    bassin_seuil_critique_pct: null,
    numero_facture_seq: 0,
    copro_nom: null,
    copro_contact: null,
    logo_url: null,
    langue: 'fr',
    map_centre_lat: null,
    map_centre_lng: null,
    map_rayon_km: null,
    map_zoom_min: null,
    map_zoom_max: null,
  };
}

/** Lecture de la config locale (null si non encore configurée). */
export async function getConfig(): Promise<ConfigLocal | null> {
  const row = (await eauDb.eau_config.get(CONFIG_SINGLETON_ID)) as ConfigLocal | undefined;
  return row ?? null;
}

/** Tire la config depuis Supabase (au montage / online) puis renvoie l'état local. */
export async function refreshConfig(online: boolean): Promise<ConfigLocal | null> {
  if (online) await pullTable('eau_config');
  return getConfig();
}

/** Met à jour la config (merge partiel sur le singleton, upsert idempotent). */
export async function saveConfig(patch: Partial<ConfigLocal>): Promise<ConfigLocal> {
  const current = (await getConfig()) ?? emptyConfig();
  const merged: ConfigLocal = { ...current, ...patch, id: CONFIG_SINGLETON_ID };
  const saved = await saveLocal('eau_config', merged);
  // Journal d'audit (best-effort, import paresseux pour éviter tout cycle).
  void import('./eauAuditService')
    .then((m) => m.logAudit({ action: 'config_modifiee', entite: 'eau_config', entiteId: CONFIG_SINGLETON_ID, details: Object.keys(patch) }))
    .catch(() => {});
  return saved;
}

/**
 * Dimensions du bassin extraites de la config (ou null si incomplètes).
 * `hauteurMaxM` = hauteur du flotteur (plafond opérationnel, réf. % remplissage),
 * avec repli sur l'ancienne `bassin_hauteur_max_m` tant que le flotteur n'est pas saisi.
 */
export function dimensionsFromConfig(config: ConfigLocal | null): BassinDimensions | null {
  if (!config) return null;
  const { bassin_longueur_m, bassin_largeur_m, bassin_hauteur_flotteur_m, bassin_hauteur_max_m } = config;
  const hauteurRef =
    bassin_hauteur_flotteur_m != null && bassin_hauteur_flotteur_m > 0
      ? bassin_hauteur_flotteur_m
      : bassin_hauteur_max_m;
  if (
    bassin_longueur_m != null && bassin_longueur_m > 0 &&
    bassin_largeur_m != null && bassin_largeur_m > 0 &&
    hauteurRef != null && hauteurRef > 0
  ) {
    return { longueurM: bassin_longueur_m, largeurM: bassin_largeur_m, hauteurMaxM: hauteurRef };
  }
  return null;
}

/** Seuil d'écart de débit (%) au-delà duquel un test est jugé instable (déf. 15). */
export function debitEcartMaxPctFromConfig(config: ConfigLocal | null): number {
  const v = config?.debit_ecart_max_pct;
  return v != null && v > 0 ? v : 15;
}

/**
 * Seuils d'anomalie. Décision JOEL (Phase 2) : PAS de valeur par défaut.
 * Tant que la config est incomplète, on renvoie des seuils « infinis » → aucune
 * anomalie n'est jamais levée (le calcul d'anomalies est de fait bloqué).
 */
export function seuilsFromConfig(config: ConfigLocal | null): { seuilM3: number; seuilPct: number } {
  return {
    seuilM3: config?.seuil_m3 != null && config.seuil_m3 > 0 ? config.seuil_m3 : Number.POSITIVE_INFINITY,
    seuilPct: config?.seuil_pct != null && config.seuil_pct > 0 ? config.seuil_pct : Number.POSITIVE_INFINITY,
  };
}

/**
 * Facteur de détection aberrant. PAS de repli (décision JOEL) : si non configuré
 * (≤ 1), renvoie 0 → `detectAberrant` (qui exige facteur > 1) ne lève jamais d'aberrant.
 */
export function facteurAberrantFromConfig(config: ConfigLocal | null): number {
  const f = config?.seuil_aberrant_facteur;
  return f != null && f > 1 ? f : 0;
}

/** true si la config autorise facturation + calcul d'anomalies (tous champs requis renseignés). */
export function isConfigComplete(config: ConfigLocal | null): boolean {
  return isComplete(config);
}

/** Liste lisible des champs de config encore manquants (vide = complète). */
export function configMissingFields(config: ConfigLocal | null): string[] {
  return missingFields(config);
}
