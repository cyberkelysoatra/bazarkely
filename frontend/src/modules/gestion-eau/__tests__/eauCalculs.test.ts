import { describe, it, expect } from 'vitest';
import {
  isBassinConfigured,
  volumeMaxM3,
  hauteurCmToVolumeM3,
  tauxRemplissage,
} from '../utils/bassin';
import {
  consoCompteurSurIntervalle,
  computeBilan,
  computeNRW,
  detectAberrant,
  moyenne,
  type ReleveCompteurLite,
  type ReleveBassinLite,
  type EntreeLite,
  type CompteurLite,
} from '../utils/bilan';

// L=10, l=7, h=4 → 280 m³ (critère #5)
const DIM = { longueurM: 10, largeurM: 7, hauteurMaxM: 4 };

describe('bassin — conversions', () => {
  it('volumeMax L×l×h = 280 m³', () => {
    expect(volumeMaxM3(DIM)).toBe(280);
  });

  it('hauteur 400 cm → 280 m³ ; 200 cm → 140 m³', () => {
    expect(hauteurCmToVolumeM3(400, DIM)).toBeCloseTo(280, 6);
    expect(hauteurCmToVolumeM3(200, DIM)).toBeCloseTo(140, 6);
  });

  it('taux de remplissage borné [0,1]', () => {
    expect(tauxRemplissage(140, DIM)).toBeCloseTo(0.5, 6);
    expect(tauxRemplissage(0, DIM)).toBe(0);
    expect(tauxRemplissage(999, DIM)).toBe(1);
  });

  it('isBassinConfigured rejette dimensions absentes/nulles', () => {
    expect(isBassinConfigured(DIM)).toBe(true);
    expect(isBassinConfigured({ longueurM: 10, largeurM: 0, hauteurMaxM: 4 })).toBe(false);
    expect(isBassinConfigured(null)).toBe(false);
  });
});

describe('conso compteur sur intervalle', () => {
  const releves: ReleveCompteurLite[] = [
    { compteur_id: 'c1', index: 100, rupture_index: false, timestamp: 900 },
    { compteur_id: 'c1', index: 110, rupture_index: false, timestamp: 4000 },
  ];

  it('conso = index(≤t) − index(≤tPrev) = 10', () => {
    expect(consoCompteurSurIntervalle(releves, 1000, 5000)).toBe(10);
  });

  it('pas de baseline (aucun relevé ≤ tPrev) → 0', () => {
    expect(consoCompteurSurIntervalle(releves, 800, 5000)).toBe(0);
  });

  it('rupture dans l’intervalle → 0', () => {
    const avecRupture: ReleveCompteurLite[] = [
      ...releves,
      { compteur_id: 'c1', index: 5, rupture_index: true, timestamp: 4500 },
    ];
    expect(consoCompteurSurIntervalle(avecRupture, 1000, 5000)).toBe(0);
  });
});

describe('computeBilan — jeu fabriqué (critère #7)', () => {
  // 2 relevés de niveau : tPrev=1000 (stock 200), t=5000 (mesuré 230)
  const relevesBassin: ReleveBassinLite[] = [
    { volume_m3: 200, timestamp: 1000 },
    { volume_m3: 230, timestamp: 5000 },
  ];
  const entrees: EntreeLite[] = [
    { volume_m3: 50, timestamp: 2000 }, // dans ]1000,5000]
    { volume_m3: 999, timestamp: 500 }, // avant tPrev → exclu
  ];
  const compteursActifs: CompteurLite[] = [
    { id: 'c1', actif: true },
    { id: 'c2', actif: true },
  ];
  const relevesCompteur: ReleveCompteurLite[] = [
    { compteur_id: 'c1', index: 100, rupture_index: false, timestamp: 900 },
    { compteur_id: 'c1', index: 110, rupture_index: false, timestamp: 4000 }, // conso 10
    { compteur_id: 'c2', index: 50, rupture_index: false, timestamp: 950 },
    { compteur_id: 'c2', index: 65, rupture_index: false, timestamp: 4500 }, // conso 15
  ];

  const base = {
    currentTimestamp: 5000,
    stockMesureM3: 230,
    relevesBassin,
    entrees,
    compteursActifs,
    relevesCompteur,
  };

  it('valeurs recalculées : entrées 50, conso 25, attendu 225, écart 5, écart% 10', () => {
    const r = computeBilan({ ...base, seuilM3: 10, seuilPct: 20 })!;
    expect(r).not.toBeNull();
    expect(r.entreesM3).toBe(50);
    expect(r.consoM3).toBe(25);
    expect(r.stockPrev).toBe(200);
    expect(r.stockAttendu).toBe(225);
    expect(r.ecartM3).toBe(5);
    expect(r.ecartPct).toBeCloseTo(10, 6); // 5 / max(50,25,1) * 100
    expect(r.anomalie).toBe(false); // 5>10 faux ET 10>20 faux
  });

  it('anomalie via seuil m³ (5 > 4)', () => {
    const r = computeBilan({ ...base, seuilM3: 4, seuilPct: 20 })!;
    expect(r.anomalie).toBe(true);
  });

  it('anomalie via seuil % (10 > 8) indépendamment du seuil m³', () => {
    const r = computeBilan({ ...base, seuilM3: 100, seuilPct: 8 })!;
    expect(r.anomalie).toBe(true);
  });

  it('pas de relevé de niveau précédent → null', () => {
    const r = computeBilan({
      ...base,
      currentTimestamp: 1000,
      relevesBassin: [{ volume_m3: 200, timestamp: 1000 }],
    });
    expect(r).toBeNull();
  });
});

describe('NRW', () => {
  it('entrées 100, conso 70 → pertes 30, NRW 30%', () => {
    const r = computeNRW(100, 70);
    expect(r.pertesM3).toBe(30);
    expect(r.nrwPct).toBeCloseTo(30, 6);
  });

  it('aucune entrée → 0% (pas de division par zéro)', () => {
    expect(computeNRW(0, 0).nrwPct).toBe(0);
  });
});

describe('détection aberrant', () => {
  it('moyenne arithmétique', () => {
    expect(moyenne([10, 20, 30])).toBe(20);
    expect(moyenne([])).toBe(0);
  });

  it('haut / bas / normal selon facteur', () => {
    expect(detectAberrant(40, 10, 3)).toEqual({ aberrant: true, type: 'haut' }); // 40 > 30
    expect(detectAberrant(2, 10, 3)).toEqual({ aberrant: true, type: 'bas' }); // 2 < 3.33
    expect(detectAberrant(20, 10, 3)).toEqual({ aberrant: false, type: null });
  });

  it('pas d’historique (moyenne 0) → jamais aberrant', () => {
    expect(detectAberrant(1000, 0, 3)).toEqual({ aberrant: false, type: null });
  });
});
