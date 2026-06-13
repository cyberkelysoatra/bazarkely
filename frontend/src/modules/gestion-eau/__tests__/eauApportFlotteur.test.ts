import { describe, it, expect } from 'vitest';
import {
  estimerApportFlotteur,
  isApportDebitMode,
  computeBilan,
  FRACTION_POMPE,
  type EstimerApportInput,
  type ReleveBassinLite,
} from '../utils/bilan';

// Bassin de référence du prompt : 14 × 7 = 98 m², flotteur 2,50 m → V_flotteur = 245 m³.
const SURFACE = 98;
const HF = 2.5;
const VFLOTTEUR = SURFACE * HF; // 245

const base = (over: Partial<EstimerApportInput>): EstimerApportInput => ({
  stockPrev: 200,
  stockMesure: 200,
  consoM3: 0,
  dtHours: 5,
  debitM3h: 10,
  entreesM3: 0,
  apportOverrideM3: null,
  surfaceM2: SURFACE,
  hauteurFlotteurM: HF,
  bandFlotteurM: 0.1,
  ...over,
});

describe('estimerApportFlotteur — modèle flotteur (Phase 3)', () => {
  it('(a) intervalle régulé flotteur → apport ≈ conso, stockAttendu ≤ V_flotteur', () => {
    // Niveau plat (régulé), conso métrée 10 → la pompe n'a fait que compenser.
    const r = estimerApportFlotteur(base({ stockPrev: 200, stockMesure: 200, consoM3: 10 }));
    expect(r.mode).toBe('mesure');
    expect(r.apportM3).toBeCloseTo(10, 6); // ≈ conso, PAS débit×Δt (=25)
    const stockAttendu = 200 + r.apportM3 - 10;
    expect(stockAttendu).toBeLessThanOrEqual(VFLOTTEUR);
  });

  it('(a-bis) montée près du flotteur → apport PLAFONNÉ à V_flotteur − stockPrev', () => {
    // massBalance = Δstock(4) + conso(8) = 12, mais on ne peut remplir que 5 jusqu'au flotteur.
    const r = estimerApportFlotteur(base({ stockPrev: 240, stockMesure: 244, consoM3: 8 }));
    expect(r.mode).toBe('mesure_plafonnee');
    expect(r.apportM3).toBeCloseTo(VFLOTTEUR - 240, 6); // 5
  });

  it('(b) pas de sur-estimation débit×Δt quand des compteurs ancrent l’apport', () => {
    // Débit énorme + longue durée : l'ancien modèle aurait donné 50×10×0,5 = 250.
    const r = estimerApportFlotteur(
      base({ stockPrev: 100, stockMesure: 105, consoM3: 3, debitM3h: 50, dtHours: 10 })
    );
    expect(r.mode).toBe('mesure');
    expect(r.apportM3).toBeCloseTo(8, 6); // Δstock 5 + conso 3
    expect(r.apportM3).toBeLessThan(50); // surtout : pas ≈ 250
  });

  it('(c) override prioritaire sur tout', () => {
    const r = estimerApportFlotteur(base({ apportOverrideM3: 12, entreesM3: 7, debitM3h: 50 }));
    expect(r.mode).toBe('override');
    expect(r.apportM3).toBe(12);
    expect(r.debitM3hUtilise).toBeNull();
  });

  it('(c) entrées manuelles prioritaires sur le débit', () => {
    const r = estimerApportFlotteur(base({ entreesM3: 7, debitM3h: 50 }));
    expect(r.mode).toBe('entrees');
    expect(r.apportM3).toBe(7);
    expect(r.debitM3hUtilise).toBeNull();
  });

  it('(d) repli débit PLAFONNÉ au remplissage flotteur (plat, sans compteur, dans la bande)', () => {
    // stockPrev 240 ≥ V_bas (98×2,4 = 235,2) → dans la bande ; débit×Δt = 25 mais cap = 5.
    const r = estimerApportFlotteur(base({ stockPrev: 240, stockMesure: 240, consoM3: 0, debitM3h: 10, dtHours: 5 }));
    expect(r.mode).toBe('debit_plafonne');
    expect(r.apportM3).toBeCloseTo(5, 6);
    expect(r.debitM3hUtilise).toBeCloseTo(10, 6);
  });

  it('(d) repli débit NON plafonné quand le flotteur est inconnu (config incomplète)', () => {
    const r = estimerApportFlotteur(
      base({ stockPrev: 200, stockMesure: 200, consoM3: 0, surfaceM2: null, hauteurFlotteurM: null, debitM3h: 10, dtHours: 5 })
    );
    expect(r.mode).toBe('debit');
    expect(r.apportM3).toBeCloseTo(10 * 5 * FRACTION_POMPE, 6); // 25
  });

  it('niveau qui baisse → pompe à l’arrêt, apport 0 (jamais de repli débit)', () => {
    const r = estimerApportFlotteur(base({ stockPrev: 200, stockMesure: 180, consoM3: 0, debitM3h: 10 }));
    expect(r.mode).toBe('aucun');
    expect(r.apportM3).toBe(0);
  });

  it('plat SOUS la bande de régulation → repli débit suspendu (apport 0)', () => {
    // stockPrev 100 < V_bas (235,2) : régime ambigu → on n'attribue pas d'apport par débit.
    const r = estimerApportFlotteur(base({ stockPrev: 100, stockMesure: 100, consoM3: 0, debitM3h: 10 }));
    expect(r.mode).toBe('aucun');
    expect(r.apportM3).toBe(0);
  });

  it('garde-fou : bande absente → repli sur 0,10 m, jamais de plantage', () => {
    // V_bas = 98×(2,5−0,10)=235,2 ; stockPrev 240 dans la bande → repli débit plafonné.
    const r = estimerApportFlotteur(base({ stockPrev: 240, stockMesure: 240, debitM3h: 10, dtHours: 5, bandFlotteurM: null }));
    expect(r.mode).toBe('debit_plafonne');
    expect(r.apportM3).toBeCloseTo(5, 6);
  });
});

describe('isApportDebitMode — dérivation du mode depuis un bilan stocké', () => {
  it('mode mesuré : apport ≈ bilan de matière → false', () => {
    // apport 8 = (105−100) + 3
    expect(isApportDebitMode({ apport_m3: 8, stock_mesure: 105, stock_prev: 100, conso_m3: 3 })).toBe(false);
  });
  it('mode débit : apport > bilan de matière (qui valait 0) → true', () => {
    expect(isApportDebitMode({ apport_m3: 10, stock_mesure: 100, stock_prev: 100, conso_m3: 0 })).toBe(true);
  });
  it('mode mesuré plafonné : apport < bilan de matière → false', () => {
    // massBalance = 12, apport plafonné à 5
    expect(isApportDebitMode({ apport_m3: 5, stock_mesure: 244, stock_prev: 240, conso_m3: 8 })).toBe(false);
  });
});

describe('computeBilan — branchement du modèle flotteur de bout en bout', () => {
  const t0 = 1_000_000;
  const t1 = t0 + 5 * 3_600_000; // +5 h
  const relevesBassin: ReleveBassinLite[] = [
    { volume_m3: 240, timestamp: t0 },
    { volume_m3: 240, timestamp: t1 },
  ];

  it('plat + flotteur connu + sans compteur → repli débit plafonné, stockAttendu = V_flotteur', () => {
    const r = computeBilan({
      currentTimestamp: t1,
      stockMesureM3: 240,
      relevesBassin,
      entrees: [],
      compteursActifs: [],
      relevesCompteur: [],
      seuilM3: 1000,
      seuilPct: 1000,
      debitM3h: 10,
      surfaceM2: SURFACE,
      hauteurFlotteurM: HF,
      bandFlotteurM: 0.1,
    })!;
    expect(r.apportMode).toBe('debit_plafonne');
    expect(r.apportM3).toBeCloseTo(5, 6); // V_flotteur − stockPrev = 245 − 240
    expect(r.stockAttendu).toBeCloseTo(VFLOTTEUR, 6); // 240 + 5 − 0
  });
});
