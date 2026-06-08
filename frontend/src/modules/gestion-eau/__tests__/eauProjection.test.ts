import { describe, it, expect } from 'vitest';
import { projeterConsoJour, FRACTION_POMPE } from '../utils/projection';
import { PERTE_RESEAU_DEFAUT_PCT } from '../utils/bilan';

const PERTE = PERTE_RESEAU_DEFAUT_PCT; // 0.30

// Série utilitaire (jours croissants, valeurs m³/jour).
function serie(values: number[]): { ms: number; value: number }[] {
  const day = 24 * 60 * 60 * 1000;
  return values.map((value, i) => ({ ms: i * day, value }));
}

describe('projeterConsoJour — repli en cascade (anti-zéro)', () => {
  it('1) tendance3 : moyenne des 3 derniers jours estimés', () => {
    const r = projeterConsoJour({
      consoEstimeeParJour: serie([8, 10, 12, 14, 16]),
      consoMoyenneJourM3: 99, // ignoré : tendance prioritaire
      debitM3h: 5.1,
      pertePct: PERTE,
    });
    expect(r.source).toBe('tendance3');
    expect(r.tauxJourM3).toBeCloseTo((12 + 14 + 16) / 3, 6); // = 14
  });

  it('1bis) tendance3 : < 3 jours → moyenne de tous les jours présents', () => {
    const r = projeterConsoJour({
      consoEstimeeParJour: serie([10, 14]),
      consoMoyenneJourM3: 0,
      debitM3h: null,
      pertePct: PERTE,
    });
    expect(r.source).toBe('tendance3');
    expect(r.tauxJourM3).toBeCloseTo(12, 6);
  });

  it('1ter) tendance3 robuste : 3 derniers jours nuls → moyenne des jours positifs', () => {
    const r = projeterConsoJour({
      consoEstimeeParJour: serie([12, 0, 0, 0]), // last3 = [0,0,0] mais un jour > 0 existe
      consoMoyenneJourM3: 0,
      debitM3h: null,
      pertePct: PERTE,
    });
    expect(r.source).toBe('tendance3');
    expect(r.tauxJourM3).toBeCloseTo(12, 6); // ne re-projette pas 0 par erreur
  });

  it('2) moyenne : série estimée vide → conso moyenne/jour de la période', () => {
    const r = projeterConsoJour({
      consoEstimeeParJour: [],
      consoMoyenneJourM3: 11.9,
      debitM3h: 5.1,
      pertePct: PERTE,
    });
    expect(r.source).toBe('moyenne');
    expect(r.tauxJourM3).toBeCloseTo(11.9, 6);
  });

  it('3) debit : ni tendance ni moyenne → débit borné (× 24 × fraction × (1−pertes))', () => {
    const r = projeterConsoJour({
      consoEstimeeParJour: [],
      consoMoyenneJourM3: 0,
      debitM3h: 5.1,
      pertePct: PERTE,
    });
    expect(r.source).toBe('debit');
    // 5.1 × 24 × 0.5 × 0.7 = 42.84 — borné, et JAMAIS 5.1×24 = 122.4
    expect(r.tauxJourM3).toBeCloseTo(5.1 * 24 * FRACTION_POMPE * (1 - PERTE), 6);
    expect(r.tauxJourM3).toBeLessThan(5.1 * 24); // garde-fou anti-surestimation
  });

  it('4) aucune : rien de calculable → 0', () => {
    const r = projeterConsoJour({
      consoEstimeeParJour: [],
      consoMoyenneJourM3: 0,
      debitM3h: null,
      pertePct: PERTE,
    });
    expect(r.source).toBe('aucune');
    expect(r.tauxJourM3).toBe(0);
  });

  it('priorité : tendance > moyenne > débit (toutes les sources fournies)', () => {
    const r = projeterConsoJour({
      consoEstimeeParJour: serie([12, 12, 12]),
      consoMoyenneJourM3: 50,
      debitM3h: 20,
      pertePct: PERTE,
    });
    expect(r.source).toBe('tendance3');
    expect(r.tauxJourM3).toBeCloseTo(12, 6);
  });
});
