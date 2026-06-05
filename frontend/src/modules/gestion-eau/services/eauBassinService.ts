/**
 * Service CENTRAL du bassin — source unique de vérité des déductions géométriques
 * (surface, volume utile, volume sécurité, m³/cm), du modèle flotteur/trop-plein,
 * des tests de débit des pompes (vanne fermée) et de l'autonomie estimée.
 *
 * Offline-first : lecture/écriture Dexie d'abord, push best-effort (cf. eauSync).
 * Les calculs purs vivent dans utils/bassin.ts et utils/debit.ts (testables).
 */
import { eauDb } from '../db/gestionEauDb';
import { saveLocal, pullTable } from './eauSync';
import { newId, nowIso } from '../utils/id';
import {
  getConfig,
  debitEcartMaxPctFromConfig,
} from './eauConfigService';
import {
  isBassinModelComplete,
  bassinDeductions,
  surfaceM2 as surfaceOf,
  estimerAutonomie,
  type BassinModel,
  type BassinDeductions,
  type AutonomieEstimee,
} from '../utils/bassin';
import {
  computeDebit,
  ecartDebitPct,
  debitInstable,
  type ComputeDebitResult,
} from '../utils/debit';
import notificationService from '../../../services/notificationService';
import { getCurrentUserIdSync } from './eauAuth';
import type { ConfigLocal, DebitTestLocal, AlerteLocal } from '../types/gestionEau';

// Ré-export des déductions d'autonomie (logique pure définie dans utils/bassin.ts).
export { estimerAutonomie };
export type { AutonomieEstimee };

// ───────────────────────────── Modèle & déductions ─────────────────────────────

/**
 * Modèle physique du bassin extrait de la config (null si incomplet).
 * Le trop-plein retombe sur le flotteur quand il n'est pas saisi (≥ flotteur garanti).
 */
export function bassinModelFromConfig(config: ConfigLocal | null): BassinModel | null {
  if (!config) return null;
  const longueurM = config.bassin_longueur_m;
  const largeurM = config.bassin_largeur_m;
  const hauteurFlotteurM =
    config.bassin_hauteur_flotteur_m != null && config.bassin_hauteur_flotteur_m > 0
      ? config.bassin_hauteur_flotteur_m
      : config.bassin_hauteur_max_m; // héritage
  const hauteurTropPleinM =
    config.bassin_hauteur_trop_plein_m != null && config.bassin_hauteur_trop_plein_m > 0
      ? config.bassin_hauteur_trop_plein_m
      : hauteurFlotteurM; // repli : pas de marge de sécurité connue
  const model = { longueurM, largeurM, hauteurFlotteurM, hauteurTropPleinM };
  return isBassinModelComplete(model) ? model : null;
}

/** Déductions géométriques (surface, volume utile/sécurité, m³/cm) ou null. */
export function deductionsFromConfig(config: ConfigLocal | null): BassinDeductions | null {
  const model = bassinModelFromConfig(config);
  return model ? bassinDeductions(model) : null;
}

/** Surface au sol (m²) déduite de la config, ou null si dimensions incomplètes. */
export function surfaceFromConfig(config: ConfigLocal | null): number | null {
  if (!config) return null;
  const L = config.bassin_longueur_m;
  const l = config.bassin_largeur_m;
  if (L != null && L > 0 && l != null && l > 0) return surfaceOf({ longueurM: L, largeurM: l });
  return null;
}

// ───────────────────────────── Tests de débit ─────────────────────────────

/** Aperçu (sans enregistrer) d'un test de débit pour pré-validation UI. */
export async function evaluerDebitTest(input: {
  niveauDebutCm: number;
  niveauFinCm: number;
  dureeMin: number;
}): Promise<ComputeDebitResult & { surfaceM2: number | null }> {
  const config = await getConfig();
  const surface = surfaceFromConfig(config);
  const r = computeDebit({
    niveauDebutCm: input.niveauDebutCm,
    niveauFinCm: input.niveauFinCm,
    dureeMin: input.dureeMin,
    surfaceM2: surface ?? 0,
  });
  return { ...r, surfaceM2: surface };
}

/** Tous les tests de débit, plus récents d'abord. */
export async function listDebitTests(): Promise<DebitTestLocal[]> {
  const all = (await eauDb.eau_debit_tests.toArray()) as DebitTestLocal[];
  return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** Dernier test de débit (= débit courant supposé stable), ou null. */
export async function getDebitCourant(): Promise<DebitTestLocal | null> {
  const all = await listDebitTests();
  return all[0] ?? null;
}

/** Débit courant des pompes en m³/h (null si aucun test). */
export async function getDebitCourantM3h(): Promise<number | null> {
  const last = await getDebitCourant();
  return last ? last.debit_m3h : null;
}

export interface AddDebitTestResult {
  test: DebitTestLocal;
  /** Écart % vs le test précédent (null si premier test). */
  ecartPct: number | null;
  /** true si l'écart dépasse le seuil de stabilité (alerte émise). */
  instable: boolean;
  /** Alerte « débit instable » créée le cas échéant. */
  alerte: AlerteLocal | null;
}

/**
 * Enregistre un test de débit (vanne fermée). Calcule Q_in, l'écart vs le test
 * précédent et, si l'écart dépasse le seuil de stabilité, crée une alerte
 * « débit instable » (idempotente par test) + notification best-effort.
 * Jette si le test est invalide (durée ≤ 0, niveau fin ≤ début, config incomplète).
 */
export async function addDebitTest(input: {
  niveau_debut_cm: number;
  niveau_fin_cm: number;
  duree_min: number;
  agent_id?: string | null;
  note?: string | null;
  timestamp?: string;
}): Promise<AddDebitTestResult> {
  const config = await getConfig();
  const surface = surfaceFromConfig(config);
  const calc = computeDebit({
    niveauDebutCm: input.niveau_debut_cm,
    niveauFinCm: input.niveau_fin_cm,
    dureeMin: input.duree_min,
    surfaceM2: surface ?? 0,
  });
  if (!calc.valid) {
    throw new Error(calc.error ?? 'Test de débit invalide');
  }

  const precedent = await getDebitCourant();
  const ecart = ecartDebitPct(calc.debitM3h, precedent?.debit_m3h ?? null);
  const seuil = debitEcartMaxPctFromConfig(config);
  const instable = debitInstable(ecart, seuil);

  const test: DebitTestLocal = {
    id: newId(),
    niveau_debut_cm: input.niveau_debut_cm,
    niveau_fin_cm: input.niveau_fin_cm,
    duree_min: input.duree_min,
    debit_m3h: calc.debitM3h,
    ecart_pct: ecart,
    timestamp: input.timestamp ?? nowIso(),
    agent_id: input.agent_id ?? null,
    note: input.note ?? null,
    created_at: nowIso(),
  };
  const saved = await saveLocal('eau_debit_tests', test);

  let alerte: AlerteLocal | null = null;
  if (instable && ecart != null) {
    const record: AlerteLocal = {
      id: newId(),
      type: 'debit_instable',
      ref_id: `debit|${saved.id}`,
      message: `Débit instable : ${calc.debitM3h.toFixed(1)} m³/h (écart ${ecart.toFixed(0)} % vs précédent ${precedent?.debit_m3h.toFixed(1)} m³/h) — revoir les prévisions.`,
      niveau: 'warning',
      lu: false,
      traitee: false,
      created_at: nowIso(),
    };
    alerte = await saveLocal('eau_alertes', record);
    if (notificationService.isPermissionGranted()) {
      try {
        await notificationService.showNotification({
          type: 'eau_alert',
          title: '📉 Débit instable',
          body: record.message ?? 'Débit des pompes instable',
          priority: 'normal',
          userId: getCurrentUserIdSync() ?? '',
          tag: 'eau-debit_instable',
          clickAction: '/gestion-eau/alertes',
          data: { alerteId: record.id, type: 'debit_instable' },
        });
      } catch {
        /* best-effort */
      }
    }
  }

  return { test: saved, ecartPct: ecart, instable, alerte };
}

export async function refreshDebitTests(online: boolean): Promise<DebitTestLocal[]> {
  if (online) await pullTable('eau_debit_tests');
  return listDebitTests();
}
