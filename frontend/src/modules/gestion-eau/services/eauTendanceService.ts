/**
 * Agrégats de TENDANCES pour les graphiques (conso, niveau bassin, NRW, top
 * consommateurs, conso par zone) — offline-first, lecture Dexie directe.
 *
 * Le calcul des séries est délégué à des fonctions PURES (testables) ; ce service
 * ne fait que charger l'instantané Dexie et appeler ces fonctions.
 */
import { eauDb } from '../db/gestionEauDb';
import { getConfig, seuilsFromConfig } from './eauConfigService';
import { getDebitCourantM3h } from './eauBassinService';
import {
  consoCompteurSurIntervalle,
  computeNRW,
  computeBilan,
  type ReleveBassinLite,
  type EntreeLite,
  type ReleveCompteurLite,
  type CompteurLite,
} from '../utils/bilan';
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

  // ── Conso ESTIMÉE par jour (modèle bassin/débit, à la volée) ──
  // On réutilise computeBilan (formule unique) sur chaque relevé de niveau de la
  // fenêtre ayant un relevé précédent. consoReseauM3 = apport − Δstock, borné ≥ 0.
  const { seuilM3, seuilPct } = seuilsFromConfig(config);
  const compteursActifs = compteurs.filter((c) => c.actif);
  const aDesCompteurs = relevesCompteur.length > 0;
  const debitDisponible = debitM3h != null && debitM3h > 0;
  // Non calculable sans débit ET sans aucune entrée manuelle → série vide.
  const estimable = debitDisponible || entrees.length > 0;
  const consoEstimeePoints: { ms: number; value: number }[] = [];
  if (estimable) {
    for (const r of relevesBassin) {
      const ms = new Date(r.timestamp).getTime();
      if (ms < startMs || ms > endMs) continue;
      const result = computeBilan({
        currentTimestamp: r.timestamp,
        stockMesureM3: r.volume_m3,
        relevesBassin: relevesBassin as ReleveBassinLite[],
        entrees: entrees as EntreeLite[],
        compteursActifs: compteursActifs as CompteurLite[],
        relevesCompteur: relevesCompteur as ReleveCompteurLite[],
        seuilM3,
        seuilPct,
        debitM3h,
      });
      if (!result) continue; // pas de relevé précédent → pas d'intervalle
      consoEstimeePoints.push({ ms, value: Math.max(0, result.consoReseauM3) });
    }
  }
  const consoEstimeeParJour = bucketByDay(consoEstimeePoints);

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
