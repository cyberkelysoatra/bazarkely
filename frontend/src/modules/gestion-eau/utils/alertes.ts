/**
 * Logique PURE de génération d'alertes (aucun accès Dexie/réseau/notif) → testable.
 * Le service eauAlerteService orchestre le chargement Dexie + persistance + notifs.
 */
import type { AlerteType } from '../types/gestionEau';

/** Seuil heuristique de NRW (%) au-delà duquel une fuite est suspectée. */
export const FUITE_NRW_PCT = 25;

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
export function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

export interface AlerteCandidate {
  type: AlerteType;
  ref_id: string;
  message: string;
  niveau: 'info' | 'warning' | 'critique';
}

export interface AlerteSnapshot {
  now: number;
  joursSansReleveAlerte: number | null;
  bassinSeuilCritiquePct: number | null;
  tauxRemplissagePct: number | null; // [0,100] ou null
  compteursActifs: { id: string; nom: string }[];
  dernierReleveParCompteur: Record<string, number | undefined>; // compteur_id → ms
  bilansAnomalieNonTraitee: { id: string; ecart_pct: number | null }[];
  nrwPct: number | null;
  pertesM3: number | null;
  // ── Évolution « bassin/débit » (optionnels → rétrocompatibles) ──
  /** Dernière hauteur mesurée du bassin (cm), ou null. */
  hauteurDerniereCm?: number | null;
  /** Hauteur du flotteur (cm) = plafond opérationnel, ou null si non configuré. */
  hauteurFlotteurCm?: number | null;
}

/** Construit la liste des alertes CANDIDATES à partir d'un instantané des données. */
export function computeAlerteCandidates(input: AlerteSnapshot): AlerteCandidate[] {
  const out: AlerteCandidate[] = [];

  // 1) Anomalies de bilan non traitées
  for (const b of input.bilansAnomalieNonTraitee) {
    out.push({
      type: 'anomalie',
      ref_id: b.id,
      message: `Bilan en anomalie (écart ${b.ecart_pct != null ? b.ecart_pct.toFixed(1) : '?'} %).`,
      niveau: 'warning',
    });
  }

  // 2) Compteurs non relevés depuis trop longtemps
  const seuilJours = input.joursSansReleveAlerte;
  if (seuilJours != null && seuilJours > 0) {
    for (const c of input.compteursActifs) {
      const last = input.dernierReleveParCompteur[c.id];
      const jours = last == null ? Infinity : Math.floor((input.now - last) / MS_PER_DAY);
      if (jours >= seuilJours) {
        out.push({
          type: 'compteur_non_releve',
          ref_id: `${c.id}|${dayKey(new Date(input.now))}`,
          message:
            last == null
              ? `Compteur « ${c.nom} » jamais relevé.`
              : `Compteur « ${c.nom} » non relevé depuis ${jours} j.`,
          niveau: 'warning',
        });
      }
    }
  }

  // 3) Bassin critique
  const seuilCritique = input.bassinSeuilCritiquePct;
  if (seuilCritique != null && seuilCritique > 0 && input.tauxRemplissagePct != null) {
    if (input.tauxRemplissagePct < seuilCritique) {
      out.push({
        type: 'bassin_critique',
        ref_id: `bassin|${dayKey(new Date(input.now))}`,
        message: `Niveau du bassin critique : ${input.tauxRemplissagePct.toFixed(0)} % (< ${seuilCritique} %).`,
        niveau: 'critique',
      });
    }
  }

  // 3bis) Flotteur défaillant : niveau mesuré au-dessus du flotteur (risque débordement).
  if (
    input.hauteurFlotteurCm != null && input.hauteurFlotteurCm > 0 &&
    input.hauteurDerniereCm != null &&
    input.hauteurDerniereCm > input.hauteurFlotteurCm
  ) {
    out.push({
      type: 'flotteur_defaillant',
      ref_id: `flotteur|${dayKey(new Date(input.now))}`,
      message: `Niveau ${input.hauteurDerniereCm.toFixed(0)} cm au-dessus du flotteur (${input.hauteurFlotteurCm.toFixed(0)} cm) — flotteur défaillant / risque de débordement.`,
      niveau: 'critique',
    });
  }

  // 4) Fuite suspectée (NRW élevé sur la période)
  if (
    input.nrwPct != null &&
    input.pertesM3 != null &&
    input.nrwPct >= FUITE_NRW_PCT &&
    input.pertesM3 > 0
  ) {
    out.push({
      type: 'fuite',
      ref_id: `fuite|${monthKey(new Date(input.now))}`,
      message: `Fuite suspectée : NRW ${input.nrwPct.toFixed(0)} % (pertes ${input.pertesM3.toFixed(1)} m³).`,
      niveau: 'critique',
    });
  }

  return out;
}
