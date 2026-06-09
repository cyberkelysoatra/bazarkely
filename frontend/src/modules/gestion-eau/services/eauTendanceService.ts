/**
 * Agrégats de TENDANCES pour les graphiques (conso, niveau bassin, NRW, top
 * consommateurs, conso par zone) — offline-first, lecture Dexie directe.
 *
 * Le calcul des séries est délégué à des fonctions PURES (testables) ; ce service
 * ne fait que charger l'instantané Dexie et appeler ces fonctions.
 */
import { eauDb } from '../db/gestionEauDb';
import { getConfig, dimensionsFromConfig } from './eauConfigService';
import { getDebitCourantM3h, estimerAutonomie } from './eauBassinService';
import {
  consoCompteurSurIntervalle,
  computeNRW,
  PERTE_RESEAU_DEFAUT_PCT,
} from '../utils/bilan';
import { projeterConsoJour, type ProjectionResult } from '../utils/projection';
import { calculerConsoEstimee } from '../utils/consoEstimee';
import { volumeMaxM3 } from '../utils/bassin';
import type {
  BilanLocal,
  ReleveBassinLocal,
  EntreeBassinLocal,
  ReleveCompteurLocal,
  CompteurLocal,
} from '../types/gestionEau';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface SeriePoint {
  /** Étiquette d'axe (jour ISO court ou libellé de bucket). */
  label: string;
  /** Horodatage ms du début du bucket (tri). */
  ms: number;
  value: number;
}

export interface NrwPoint {
  label: string;
  ms: number;
  entrees: number;
  conso: number;
  pertes: number;
  nrwPct: number;
}

export interface NamedValue {
  id: string;
  nom: string;
  value: number;
}

export interface TendancesData {
  /** Conso métrée par jour (Σ conso_m3 des bilans du jour). */
  consoParJour: SeriePoint[];
  /**
   * Conso ESTIMÉE par jour, calculée à la volée via le modèle « bassin/débit »
   * (apport = débit × Δt − variation du bassin), en attendant les compteurs.
   * Vide si aucun débit ni entrée manuelle (non calculable).
   */
  consoEstimeeParJour: SeriePoint[];
  /**
   * Conso PROJETÉE par jour (m³/jour) comblant le trou entre le dernier jour estimé
   * et aujourd'hui quand les relevés tardent et qu'il n'y a pas de compteurs. Le jour
   * courant est proratisé sur la fraction écoulée. Vide si projection impossible ou
   * si des compteurs existent (bascule sur le métré).
   */
  consoProjeteeParJour: SeriePoint[];
  /** Origine de la projection retenue (cf. projeterConsoJour). */
  projectionSource: ProjectionResult['source'];
  /** true si une projection a été produite (au moins le jour courant). */
  aProjection: boolean;
  /** true s'il existe au moins un relevé de compteur (→ basculer sur le métré). */
  aDesCompteurs: boolean;
  /** true si un débit courant > 0 est disponible (estimation activable). */
  debitDisponible: boolean;
  /** Niveau du bassin (volume m³) à chaque relevé de niveau. */
  niveauBassin: SeriePoint[];
  /** NRW par bucket (semaine) sur la fenêtre. */
  nrwParBucket: NrwPoint[];
  /** Top consommateurs sur la fenêtre (conso par compteur, décroissant). */
  topConsommateurs: NamedValue[];
  /** Conso par zone sur la fenêtre. */
  consoParZone: NamedValue[];
  /** Bornes de la fenêtre analysée. */
  startMs: number;
  endMs: number;
}

// ─────────────────────────── Fonctions pures ───────────────────────────

/** Étiquette de jour LOCAL 'YYYY-MM-DD' (pour la projection, alignée sur le jour
 *  perçu par l'utilisateur ; cf. tableau de bord qui borne le jour en local). */
export function localDayLabel(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Regroupe une liste {ms,value} par jour LOCAL (somme), trié croissant. Utilisé pour
 * la conso estimée + projection (cohérent avec le tableau de bord qui borne le jour en
 * local ; évite la divergence UTC↔local des 3 premières heures à Madagascar UTC+3).
 */
export function bucketByLocalDay(points: { ms: number; value: number }[]): SeriePoint[] {
  const map = new Map<string, { ms: number; value: number }>();
  for (const p of points) {
    const label = localDayLabel(new Date(p.ms));
    const dayMs = new Date(`${label}T00:00:00`).getTime(); // minuit LOCAL
    const cur = map.get(label);
    if (cur) cur.value += p.value;
    else map.set(label, { ms: dayMs, value: p.value });
  }
  return Array.from(map.entries())
    .map(([label, v]) => ({ label, ms: v.ms, value: v.value }))
    .sort((a, b) => a.ms - b.ms);
}

/** Regroupe une liste {ms,value} par jour (somme), trié croissant. */
export function bucketByDay(points: { ms: number; value: number }[]): SeriePoint[] {
  const map = new Map<string, { ms: number; value: number }>();
  for (const p of points) {
    const d = new Date(p.ms);
    const key = d.toISOString().slice(0, 10);
    const dayMs = new Date(key).getTime();
    const cur = map.get(key);
    if (cur) cur.value += p.value;
    else map.set(key, { ms: dayMs, value: p.value });
  }
  return Array.from(map.entries())
    .map(([label, v]) => ({ label, ms: v.ms, value: v.value }))
    .sort((a, b) => a.ms - b.ms);
}

/**
 * Conso d'un compteur sur [startMs, endMs] = (index au plus tard ≤ end) − (index ≤ start),
 * en neutralisant les ruptures via `consoCompteurSurIntervalle`.
 */
export function consoCompteurPeriode(
  relevesDuCompteur: ReleveCompteurLocal[],
  startMs: number,
  endMs: number
): number {
  return consoCompteurSurIntervalle(
    relevesDuCompteur.map((r) => ({
      compteur_id: r.compteur_id,
      index: r.index,
      rupture_index: r.rupture_index,
      timestamp: r.timestamp,
    })),
    startMs,
    endMs
  );
}

// ─────────────────────────── Chargement + calcul ───────────────────────────

export async function getTendances(opts?: { fenetreJours?: number }): Promise<TendancesData> {
  const config = await getConfig();
  const fenetreJours = opts?.fenetreJours ?? (config?.periode_facturation_jours ?? 30) * 3;

  const [bilans, relevesBassin, entrees, relevesCompteur, compteurs, debitM3h] = await Promise.all([
    eauDb.eau_bilans.toArray() as Promise<BilanLocal[]>,
    eauDb.eau_releves_bassin.toArray() as Promise<ReleveBassinLocal[]>,
    eauDb.eau_entrees_bassin.toArray() as Promise<EntreeBassinLocal[]>,
    eauDb.eau_releves_compteur.toArray() as Promise<ReleveCompteurLocal[]>,
    eauDb.eau_compteurs.toArray() as Promise<CompteurLocal[]>,
    getDebitCourantM3h(),
  ]);

  const endMs = Date.now();
  const startMs = endMs - fenetreJours * MS_PER_DAY;

  // Conso par jour (bilans dans la fenêtre)
  const consoParJour = bucketByDay(
    bilans
      .filter((b) => {
        const ms = new Date(b.timestamp).getTime();
        return ms >= startMs && ms <= endMs;
      })
      .map((b) => ({ ms: new Date(b.timestamp).getTime(), value: b.conso_m3 ?? 0 }))
  );

  // ── Conso ESTIMÉE par jour (estimateur corrigé « pompe intermittente ») ──
  // Source unique : calculerConsoEstimee plafonne les intervalles « parqués au flotteur »
  // (où débit×Δt surestime) sur un taux de base réaliste ancré sur les intervalles fiables.
  const aDesCompteurs = relevesCompteur.length > 0;
  const debitDisponible = debitM3h != null && debitM3h > 0;
  // Non calculable sans débit ET sans aucune entrée manuelle → série vide.
  const estimable = debitDisponible || entrees.length > 0;
  const dim = dimensionsFromConfig(config);
  const volumeFlotteurM3 = dim ? volumeMaxM3(dim) : null;
  const periodeJoursAuto = config?.periode_facturation_jours ?? 30;
  const { consoMoyenneHeureM3 } = estimerAutonomie({
    stockActuelM3: null,
    bilans: bilans.map((b) => ({
      timestamp: b.timestamp,
      conso_reseau_m3: b.conso_reseau_m3 ?? null,
      conso_m3: b.conso_m3,
    })),
    fenetreJours: periodeJoursAuto,
    nowMs: endMs,
  });
  const consoEstimeePoints: { ms: number; value: number }[] = estimable
    ? calculerConsoEstimee({
        relevesBassin,
        entrees,
        debitM3h,
        volumeFlotteurM3,
        consoMoyenneHeureM3,
        pertePct: PERTE_RESEAU_DEFAUT_PCT,
      })
        .filter((iv) => iv.ms >= startMs && iv.ms <= endMs)
        .map((iv) => ({ ms: iv.ms, value: iv.consoNetteM3 }))
    : [];
  const consoEstimeeParJour = bucketByLocalDay(consoEstimeePoints);

  // ── Projection « anti-zéro » : prolonge la courbe jusqu'à aujourd'hui ──
  // Tant qu'il n'y a pas de compteurs, on comble les jours sans relevé (entre le
  // dernier jour estimé et aujourd'hui inclus) par le taux de référence projeté, en
  // proratisant le jour courant sur la fraction écoulée. Une absence de relevé n'est
  // PAS une consommation nulle.
  let consoProjeteeParJour: SeriePoint[] = [];
  let projectionSource: ProjectionResult['source'] = 'aucune';
  let aProjection = false;
  if (!aDesCompteurs) {
    const periodeJours = config?.periode_facturation_jours ?? 30;
    const { consoMoyenneJourM3 } = estimerAutonomie({
      stockActuelM3: null,
      bilans: bilans.map((b) => ({
        timestamp: b.timestamp,
        conso_reseau_m3: b.conso_reseau_m3 ?? null,
        conso_m3: b.conso_m3,
      })),
      fenetreJours: periodeJours,
      nowMs: endMs,
    });
    const proj = projeterConsoJour({
      consoEstimeeParJour,
      consoMoyenneJourM3,
      debitM3h,
      pertePct: PERTE_RESEAU_DEFAUT_PCT,
    });
    projectionSource = proj.source;
    if (proj.tauxJourM3 > 0) {
      // « Aujourd'hui » au sens LOCAL (cohérent avec le tableau de bord et la
      // perception de l'utilisateur), même quand UTC n'a pas encore basculé : sinon,
      // dans les premières heures locales, le dernier jour estimé EST « aujourd'hui »
      // en UTC et aucune projection n'apparaîtrait.
      const now = new Date(endMs);
      const todayStartLocalMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayLabel = localDayLabel(now);
      const fractionJour = Math.min(1, Math.max(0, (endMs - todayStartLocalMs) / MS_PER_DAY));
      const lastEstLabel =
        consoEstimeeParJour.length > 0 ? consoEstimeeParJour[consoEstimeeParJour.length - 1].label : null;
      // On comble du dernier jour estimé (exclu) jusqu'à aujourd'hui (inclus). On
      // remonte jour par jour depuis aujourd'hui tant que le jour reste après le
      // dernier jour estimé ; série estimée vide → on projette au moins aujourd'hui.
      const points: SeriePoint[] = [];
      for (let dMs = todayStartLocalMs, guard = 0; guard < 400; dMs -= MS_PER_DAY, guard++) {
        const label = localDayLabel(new Date(dMs));
        if (lastEstLabel != null && label <= lastEstLabel) break;
        points.push({ label, ms: dMs, value: label === todayLabel ? proj.tauxJourM3 * fractionJour : proj.tauxJourM3 });
        if (lastEstLabel == null) break; // série vide → uniquement aujourd'hui
      }
      consoProjeteeParJour = points.sort((a, b) => a.ms - b.ms);
      aProjection = points.length > 0;
    }
  }

  // Niveau bassin (chaque relevé dans la fenêtre)
  const niveauBassin: SeriePoint[] = relevesBassin
    .filter((r) => {
      const ms = new Date(r.timestamp).getTime();
      return ms >= startMs && ms <= endMs;
    })
    .map((r) => ({
      label: new Date(r.timestamp).toISOString().slice(0, 10),
      ms: new Date(r.timestamp).getTime(),
      value: r.volume_m3,
    }))
    .sort((a, b) => a.ms - b.ms);

  // NRW par bucket hebdomadaire
  const nrwParBucket: NrwPoint[] = [];
  const bucketDays = 7;
  for (let bStart = startMs; bStart < endMs; bStart += bucketDays * MS_PER_DAY) {
    const bEnd = Math.min(bStart + bucketDays * MS_PER_DAY, endMs);
    const entreesB = entrees.reduce((acc, e) => {
      const ms = new Date(e.timestamp).getTime();
      return ms >= bStart && ms < bEnd ? acc + e.volume_m3 : acc;
    }, 0);
    const consoB = bilans.reduce((acc, b) => {
      const ms = new Date(b.timestamp).getTime();
      return ms >= bStart && ms < bEnd ? acc + (b.conso_m3 ?? 0) : acc;
    }, 0);
    if (entreesB === 0 && consoB === 0) continue;
    const { pertesM3, nrwPct } = computeNRW(entreesB, consoB);
    nrwParBucket.push({
      label: new Date(bStart).toISOString().slice(0, 10),
      ms: bStart,
      entrees: entreesB,
      conso: consoB,
      pertes: pertesM3,
      nrwPct,
    });
  }

  // Conso par compteur (top) + par zone sur la fenêtre
  const parCompteurId = new Map<string, ReleveCompteurLocal[]>();
  for (const r of relevesCompteur) {
    if (!parCompteurId.has(r.compteur_id)) parCompteurId.set(r.compteur_id, []);
    parCompteurId.get(r.compteur_id)!.push(r);
  }

  const topConsommateurs: NamedValue[] = [];
  const zoneAgg = new Map<string, number>();
  for (const c of compteurs) {
    if (!c.actif) continue;
    const releves = parCompteurId.get(c.id) ?? [];
    const conso = consoCompteurPeriode(releves, startMs, endMs);
    if (conso > 0) {
      topConsommateurs.push({ id: c.id, nom: c.nom, value: conso });
      const z = c.zone ?? 'Sans zone';
      zoneAgg.set(z, (zoneAgg.get(z) ?? 0) + conso);
    }
  }
  topConsommateurs.sort((a, b) => b.value - a.value);

  const consoParZone: NamedValue[] = Array.from(zoneAgg.entries())
    .map(([zone, value]) => ({ id: zone, nom: zone, value }))
    .sort((a, b) => b.value - a.value);

  return {
    consoParJour,
    consoEstimeeParJour,
    consoProjeteeParJour,
    projectionSource,
    aProjection,
    aDesCompteurs,
    debitDisponible,
    niveauBassin,
    nrwParBucket,
    topConsommateurs: topConsommateurs.slice(0, 10),
    consoParZone,
    startMs,
    endMs,
  };
}
