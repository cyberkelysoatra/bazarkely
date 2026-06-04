/**
 * Rapport mensuel (synthèse de pilotage) — offline-first, lecture Dexie directe.
 *
 * Agrège, pour un mois donné : entrées d'eau, consommation métrée, pertes/NRW,
 * anomalies de bilan, factures émises (nombre + montant). Sert à la fois l'aperçu
 * écran et la génération PDF (utils/rapportPdf.ts).
 *
 * Proposition automatique « en fin de période » : `shouldProposeRapport()` renvoie
 * vrai dans les derniers jours du mois (ou les tout premiers du suivant) tant que le
 * rapport du mois concerné n'a pas déjà été généré/écarté (mémorisé en localStorage).
 */
import { eauDb } from '../db/gestionEauDb';
import { getConfig } from './eauConfigService';
import { computeNRW } from '../utils/bilan';
import type {
  BilanLocal,
  EntreeBassinLocal,
  FactureLocal,
  ConfigLocal,
} from '../types/gestionEau';

export interface RapportMensuel {
  year: number;
  /** 0-11 (Date.getMonth). */
  month: number;
  periodeLabel: string; // ex. « juin 2026 »
  startMs: number;
  endMs: number;
  entreesM3: number;
  consoM3: number;
  pertesM3: number;
  nrwPct: number;
  nbBilans: number;
  anomalies: BilanLocal[];
  nbAnomalies: number;
  factures: FactureLocal[];
  nbFactures: number;
  montantFactureTotal: number;
  montantImpaye: number;
  config: ConfigLocal | null;
}

const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function monthBounds(year: number, month: number): { startMs: number; endMs: number } {
  const start = new Date(year, month, 1, 0, 0, 0, 0).getTime();
  const end = new Date(year, month + 1, 1, 0, 0, 0, 0).getTime() - 1;
  return { startMs: start, endMs: end };
}

/** Construit la synthèse d'un mois (year, month 0-11). */
export async function getRapportMensuel(year: number, month: number): Promise<RapportMensuel> {
  const { startMs, endMs } = monthBounds(year, month);
  const [config, entrees, bilans, factures] = await Promise.all([
    getConfig(),
    eauDb.eau_entrees_bassin.toArray() as Promise<EntreeBassinLocal[]>,
    eauDb.eau_bilans.toArray() as Promise<BilanLocal[]>,
    eauDb.eau_factures.toArray() as Promise<FactureLocal[]>,
  ]);

  const inWindow = (iso: string | null | undefined): boolean => {
    if (!iso) return false;
    const ms = new Date(iso).getTime();
    return ms >= startMs && ms <= endMs;
  };

  const entreesM3 = entrees.filter((e) => inWindow(e.timestamp)).reduce((a, e) => a + e.volume_m3, 0);
  const bilansMois = bilans.filter((b) => inWindow(b.timestamp));
  const consoM3 = bilansMois.reduce((a, b) => a + (b.conso_m3 ?? 0), 0);
  const { pertesM3, nrwPct } = computeNRW(entreesM3, consoM3);
  const anomalies = bilansMois.filter((b) => b.anomalie);

  // Factures dont la période chevauche le mois (sur generated_at).
  const facturesMois = factures.filter((f) => inWindow(f.generated_at) || inWindow(f.periode_end));
  const montantFactureTotal = facturesMois.reduce((a, f) => a + (f.montant ?? 0), 0);
  const montantImpaye = facturesMois
    .filter((f) => f.statut === 'impaye')
    .reduce((a, f) => a + (f.montant ?? 0), 0);

  return {
    year,
    month,
    periodeLabel: `${MOIS_FR[month]} ${year}`,
    startMs,
    endMs,
    entreesM3,
    consoM3,
    pertesM3,
    nrwPct,
    nbBilans: bilansMois.length,
    anomalies,
    nbAnomalies: anomalies.length,
    factures: facturesMois,
    nbFactures: facturesMois.length,
    montantFactureTotal,
    montantImpaye,
    config,
  };
}

const DISMISS_KEY = 'eau_rapport_propose_dismiss';

/** Clé mois ciblé par la proposition de fin de période (le mois qui se termine). */
export function targetReportKey(now = new Date()): { year: number; month: number; key: string } {
  // Dans les 4 derniers jours du mois → le mois courant ; dans les 4 premiers → le mois précédent.
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (day >= daysInMonth - 3) {
    return { year: now.getFullYear(), month: now.getMonth(), key: `${now.getFullYear()}-${now.getMonth()}` };
  }
  // début de mois → mois précédent
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { year: prev.getFullYear(), month: prev.getMonth(), key: `${prev.getFullYear()}-${prev.getMonth()}` };
}

/** Faut-il proposer le rapport mensuel maintenant ? (fin/début de période, non écarté). */
export function shouldProposeRapport(now = new Date()): boolean {
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const inWindow = day >= daysInMonth - 3 || day <= 4;
  if (!inWindow) return false;
  const { key } = targetReportKey(now);
  try {
    return localStorage.getItem(`${DISMISS_KEY}:${key}`) == null;
  } catch {
    return true;
  }
}

/** Mémorise que la proposition du mois ciblé a été traitée/écartée. */
export function dismissRapportPropose(now = new Date()): void {
  const { key } = targetReportKey(now);
  try {
    localStorage.setItem(`${DISMISS_KEY}:${key}`, new Date().toISOString());
  } catch {
    /* ignore */
  }
}
