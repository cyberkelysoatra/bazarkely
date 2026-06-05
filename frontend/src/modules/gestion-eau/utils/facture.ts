/**
 * Logique PURE de facturation (aucun accès Dexie/réseau) → unitairement testable.
 * Le service eauFactureService charge Dexie, génère les numéros et persiste.
 *
 * Règle de calcul (cf. prompt Phase 2) :
 *   indexDebut = index du dernier relevé ≤ début de période
 *   indexFin   = index du dernier relevé ≤ fin de période
 *   conso      = indexFin − indexDebut (≥ 0)
 *   montant    = conso × tarif_m3
 */
import { toMs, type TS } from './bilan';

export interface ReleveLite {
  index: number;
  timestamp: TS;
  /** Une rupture d'index (compteur remis à zéro / remplacé) casse la continuité. */
  rupture_index?: boolean;
}

/** Index du dernier relevé dont le timestamp est ≤ tMs, ou null si aucun. */
export function dernierIndexAvant(releves: ReleveLite[], tMs: number): number | null {
  let best: ReleveLite | null = null;
  for (const r of releves) {
    const ms = toMs(r.timestamp);
    if (ms <= tMs) {
      if (!best || ms > toMs(best.timestamp)) best = r;
    }
  }
  return best ? best.index : null;
}

export interface LigneFacture {
  indexDebut: number;
  indexFin: number;
  conso: number;
  montant: number;
}

/**
 * Calcule la ligne de facturation d'un compteur sur la période [startMs, endMs].
 * Retourne `null` (→ pas de facture) si :
 *   - aucun relevé ≤ fin (rien à facturer), OU
 *   - une rupture d'index existe dans la période (conso non fiable).
 * indexDebut vaut 0 quand aucun relevé n'existe avant le début (premier cycle).
 */
export function computeLigneFacture(
  releves: ReleveLite[],
  startMs: number,
  endMs: number,
  tarifM3: number
): LigneFacture | null {
  const indexFin = dernierIndexAvant(releves, endMs);
  if (indexFin == null) return null; // aucun relevé dans/avant la période → pas de facture

  // Rupture d'index dans la période → conso non fiable, on ne facture pas automatiquement.
  const ruptureDansPeriode = releves.some((r) => {
    const ms = toMs(r.timestamp);
    return ms > startMs && ms <= endMs && r.rupture_index === true;
  });
  if (ruptureDansPeriode) return null;

  const indexDebutBrut = dernierIndexAvant(releves, startMs);
  const indexDebut = indexDebutBrut == null ? 0 : indexDebutBrut;
  const conso = Math.max(0, indexFin - indexDebut);
  const montant = conso * (tarifM3 > 0 ? tarifM3 : 0);
  return { indexDebut, indexFin, conso, montant };
}

/** Numéro de facture séquentiel zéro-paddé : 1 → "F-000001". */
export function formatNumeroFacture(seq: number): string {
  return `F-${String(Math.max(0, Math.floor(seq))).padStart(6, '0')}`;
}

/** Filtre des éléments porteurs d'un `compteur_id` selon une liste autorisée (espace client). */
export function filterByCompteurIds<T extends { compteur_id: string | null }>(
  items: T[],
  compteurIds: string[]
): T[] {
  if (compteurIds.length === 0) return [];
  const set = new Set(compteurIds);
  return items.filter((it) => it.compteur_id != null && set.has(it.compteur_id));
}

/** Champs de config requis pour autoriser facturation ET calcul d'anomalies. */
export interface ConfigCompletude {
  bassin_longueur_m: number | null;
  bassin_largeur_m: number | null;
  bassin_hauteur_max_m: number | null;
  /** Évolution « bassin/débit » : hauteur du flotteur (remplace la hauteur max). */
  bassin_hauteur_flotteur_m?: number | null;
  tarif_m3: number | null;
  seuil_pct: number | null;
  seuil_m3: number | null;
  seuil_aberrant_facteur: number | null;
  periode_facturation_jours: number | null;
}

/** Champs simples requis (la hauteur du bassin est traitée à part — flotteur OU max). */
const COMPLETUDE_FIELDS: (keyof ConfigCompletude)[] = [
  'bassin_longueur_m',
  'bassin_largeur_m',
  'tarif_m3',
  'seuil_pct',
  'seuil_m3',
  'seuil_aberrant_facteur',
  'periode_facturation_jours',
];

const COMPLETUDE_LABELS: Record<string, string> = {
  bassin_longueur_m: 'Longueur bassin',
  bassin_largeur_m: 'Largeur bassin',
  bassin_hauteur: 'Hauteur bassin (flotteur)',
  tarif_m3: 'Tarif / m³',
  seuil_pct: 'Seuil anomalie (%)',
  seuil_m3: 'Seuil anomalie (m³)',
  seuil_aberrant_facteur: 'Facteur relevé aberrant',
  periode_facturation_jours: 'Période de facturation (jours)',
};

function positif(v: number | null | undefined): boolean {
  return v != null && typeof v === 'number' && v > 0;
}

/** Liste des champs de config encore manquants (vide = config complète). */
export function configMissingFields(config: ConfigCompletude | null | undefined): string[] {
  if (!config) {
    return [...COMPLETUDE_FIELDS.map((f) => COMPLETUDE_LABELS[f]), COMPLETUDE_LABELS.bassin_hauteur];
  }
  const missing = COMPLETUDE_FIELDS.filter((f) => !positif(config[f] as number | null)).map(
    (f) => COMPLETUDE_LABELS[f]
  );
  // Hauteur du bassin : flotteur (nouveau) OU hauteur max (héritage) suffit.
  if (!positif(config.bassin_hauteur_flotteur_m) && !positif(config.bassin_hauteur_max_m)) {
    missing.push(COMPLETUDE_LABELS.bassin_hauteur);
  }
  return missing;
}

/** true si la configuration permet facturation + anomalies. */
export function isConfigComplete(config: ConfigCompletude | null | undefined): boolean {
  return configMissingFields(config).length === 0;
}
