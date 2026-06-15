import { describe, it, expect } from 'vitest';
import {
  isBassinModelComplete,
  surfaceM2,
  bassinDeductions,
  stockFromNiveauCm,
  tauxRemplissageFlotteur,
  estimerAutonomie,
  type BassinModel,
} from '../utils/bassin';
import { computeDebit, ecartDebitPct, debitInstable } from '../utils/debit';
import { computeBilan, FRACTION_POMPE, type ReleveBassinLite, type EntreeLite } from '../utils/bilan';
import { computeAlerteCandidates } from '../utils/alertes';

// Modèle de référence du prompt : 14 × 7 × flotteur 2,50 / trop-plein 2,90.
const MODEL: BassinModel = { longueurM: 14, largeurM: 7, hauteurFlotteurM: 2.5, hauteurTropPleinM: 2.9 };

describe('déductions bassin (flotteur / trop-plein) — critère #2', () => {
  it('surface 98 m², volume utile 245 m³, m³/cm 0,98, volume sécurité 284,2 m³', () => {
    expect(surfaceM2(MODEL)).toBeCloseTo(98, 6);
    const d = bassinDeductions(MODEL);
    expect(d.surfaceM2).toBeCloseTo(98, 6);
    expect(d.volumeUtileM3).toBeCloseTo(245, 6);
    expect(d.m3ParCm).toBeCloseTo(0.98, 6);
    expect(d.volumeSecuriteM3).toBeCloseTo(284.2, 6);
  });

  it('stock(niveau) et % remplissage référencé au flotteur', () => {
    expect(stockFromNiveauCm(125, MODEL)).toBeCloseTo(122.5, 6); // 98 × 1.25
    expect(tauxRemplissageFlotteur(122.5, MODEL)).toBeCloseTo(0.5, 6); // 122.5 / 245
    expect(tauxRemplissageFlotteur(245, MODEL)).toBe(1);
    expect(tauxRemplissageFlotteur(-5, MODEL)).toBe(0);
  });

  it('isBassinModelComplete rejette les valeurs absentes/nulles', () => {
    expect(isBassinModelComplete(MODEL)).toBe(true);
    expect(isBassinModelComplete({ ...MODEL, hauteurFlotteurM: 0 })).toBe(false);
    expect(isBassinModelComplete(null)).toBe(false);
  });
});

describe('test de débit (Q_in) — critère #3', () => {
  it('+10 cm en 60 min sur 98 m² → 9,8 m³/h', () => {
    const r = computeDebit({ niveauDebutCm: 150, niveauFinCm: 160, dureeMin: 60, surfaceM2: 98 });
    expect(r.valid).toBe(true);
    expect(r.volumeM3).toBeCloseTo(9.8, 6);
    expect(r.debitM3h).toBeCloseTo(9.8, 6);
  });

  it('durée nulle/négative → refus', () => {
    expect(computeDebit({ niveauDebutCm: 150, niveauFinCm: 160, dureeMin: 0, surfaceM2: 98 }).valid).toBe(false);
    expect(computeDebit({ niveauDebutCm: 150, niveauFinCm: 160, dureeMin: -5, surfaceM2: 98 }).valid).toBe(false);
  });

  it('niveau fin ≤ début → invalide (débit ≤ 0)', () => {
    const r = computeDebit({ niveauDebutCm: 160, niveauFinCm: 150, dureeMin: 60, surfaceM2: 98 });
    expect(r.valid).toBe(false);
    expect(r.debitM3h).toBeLessThanOrEqual(0);
  });

  it('surface inconnue → refus', () => {
    expect(computeDebit({ niveauDebutCm: 150, niveauFinCm: 160, dureeMin: 60, surfaceM2: 0 }).valid).toBe(false);
  });

  it('écart % et détection d’instabilité', () => {
    expect(ecartDebitPct(11, 10)).toBeCloseTo(10, 6);
    expect(ecartDebitPct(10, null)).toBeNull(); // premier test
    expect(debitInstable(10, 15)).toBe(false);
    expect(debitInstable(20, 15)).toBe(true);
    expect(debitInstable(null, 15)).toBe(false);
  });
});

describe('conso réseau / pertes / NRW réseau — modèle flotteur (Phase 3)', () => {
  // tPrev = t0, t = t0 + 2h. stockPrev 100, stockMesure 105 → Δstock +5.
  const t0 = 1_000_000;
  const t1 = t0 + 7_200_000; // +2 h
  const relevesBassin: ReleveBassinLite[] = [
    { volume_m3: 100, timestamp: t0 },
    { volume_m3: 105, timestamp: t1 },
  ];
  const entrees: EntreeLite[] = []; // aucun apport manuel

  it('niveaux + conso métrée → apport = bilan de matière (Δstock + conso), pertes = 0', () => {
    // Modèle flotteur : la pompe ne fait que compenser → apport = Δstock(5) + conso(3) = 8,
    // et NON débit×Δt (qui surestimerait). consoReseau = apport − Δstock = conso → pertes 0.
    const r = computeBilan({
      currentTimestamp: t1,
      stockMesureM3: 105,
      relevesBassin,
      entrees,
      compteursActifs: [{ id: 'c1', actif: true }],
      relevesCompteur: [
        { compteur_id: 'c1', index: 0, rupture_index: false, timestamp: t0 - 1000 },
        { compteur_id: 'c1', index: 3, rupture_index: false, timestamp: t1 - 1000 },
      ],
      seuilM3: 100,
      seuilPct: 100,
      debitM3h: 9.8,
    })!;
    expect(r).not.toBeNull();
    expect(r.apportMode).toBe('mesure');
    expect(r.apportM3).toBeCloseTo(8, 6); // 5 + 3 (pas 9,8 = débit×Δt×0,5)
    expect(r.consoM3).toBe(3);
    // Sortie réseau = modèle « débit × temps de marche » (Phase 2), DÉCOUPLÉE du bilan de
    // matière : apport réseau = débit 9,8 × Δt 2 h = 19,6 (aucun arrêt) ; sortie = 19,6 −
    // Δstock 5 = 14,6 ; eau non comptée = 14,6 − conso métrée 3 = 11,6 (≠ 0 : conso non comptée).
    expect(r.consoReseauM3).toBeCloseTo(14.6, 6);
    expect(r.pertesM3).toBeCloseTo(11.6, 6);
    expect(r.stockAttendu).toBeCloseTo(105, 6); // bilan de matière bouclé → écart 0 (inchangé)
    expect(r.ecartM3).toBeCloseTo(0, 6);
  });

  it('anomalie réseau via repli débit (niveau plat, aucun compteur, pertes réelles)', () => {
    // Plat (Δstock 0) + aucun compteur → repli débit : apport = 9,8×2×0,5 = 9,8 ;
    // consoReseau 9,8 ; pertes 9,8 > seuil 1 → anomalie réseau.
    const r = computeBilan({
      currentTimestamp: t1,
      stockMesureM3: 100, // plat
      relevesBassin,
      entrees,
      compteursActifs: [],
      relevesCompteur: [],
      seuilM3: 1,
      seuilPct: 1000,
      debitM3h: 9.8,
    })!;
    expect(r.apportMode).toBe('debit');
    expect(r.pertesM3).toBeGreaterThan(1);
    expect(r.anomalieReseau).toBe(true);
  });

  it('rétrocompatibilité : entrées manuelles prioritaires sur le débit (critère c)', () => {
    const r = computeBilan({
      currentTimestamp: t1,
      stockMesureM3: 105,
      relevesBassin,
      entrees: [{ volume_m3: 20, timestamp: t0 + 1000 }],
      compteursActifs: [],
      relevesCompteur: [],
      seuilM3: 100,
      seuilPct: 100,
      debitM3h: 9.8, // ignoré : les entrées priment
    })!;
    expect(r.apportMode).toBe('entrees');
    expect(r.apportM3).toBe(20);
    expect(r.debitM3hUtilise).toBeNull();
    expect(r.entreesM3).toBe(20);
  });

  it('repli débit PONDÉRÉ par FRACTION_POMPE quand le niveau est plat sans compteur', () => {
    const r = computeBilan({
      currentTimestamp: t1,
      stockMesureM3: 100, // Δstock 0 (plat) → repli débit
      relevesBassin,
      entrees,
      compteursActifs: [],
      relevesCompteur: [],
      seuilM3: 1000,
      seuilPct: 1000,
      debitM3h: 10,
    })!;
    expect(r.apportMode).toBe('debit');
    expect(r.apportM3).toBeCloseTo(10 * 2 * FRACTION_POMPE, 6); // 10 (apport mass-balance, FRACTION_POMPE)
    // Sortie réseau = débit 10 × temps de marche 2 h − Δstock 0 = 20 (sans FRACTION_POMPE :
    // modèle « débit × temps de marche » réel, pas le repli pondéré du bilan de matière).
    expect(r.consoReseauM3).toBeCloseTo(20, 6);
  });

  it('niveau qui BAISSE sans compteur → pompe à l’arrêt, apport 0 (pas de repli débit)', () => {
    const r = computeBilan({
      currentTimestamp: t1,
      stockMesureM3: 90, // baisse de 10 → vidage, pompe off
      relevesBassin,
      entrees,
      compteursActifs: [],
      relevesCompteur: [],
      seuilM3: 1000,
      seuilPct: 1000,
      debitM3h: 10, // présent mais NON utilisé (le niveau a baissé)
    })!;
    expect(r.apportMode).toBe('aucun');
    expect(r.apportM3).toBe(0);
  });

  it('arrêts de pompe déduits du temps de marche (Phase 2)', () => {
    // Plat (Δstock 0), débit 10 m³/h, Δt 2 h, mais un arrêt d'1 h dans l'intervalle →
    // temps de marche = 1 h → apport réseau = 10 × 1 = 10 → sortie = 10 − 0 = 10
    // (sans arrêt ce serait 20 : cf. test précédent).
    const r = computeBilan({
      currentTimestamp: t1,
      stockMesureM3: 100,
      relevesBassin,
      entrees,
      compteursActifs: [],
      relevesCompteur: [],
      seuilM3: 1000,
      seuilPct: 1000,
      debitM3h: 10,
      arrets: [{ timestamp_debut: t0 + 1_800_000, timestamp_fin: t0 + 5_400_000 }], // 1 h
    })!;
    expect(r.consoReseauM3).toBeCloseTo(10, 6);
  });

  it('arrêt couvrant tout l’intervalle → temps de marche 0 → sortie inconnue (null)', () => {
    const r = computeBilan({
      currentTimestamp: t1,
      stockMesureM3: 100, // plat
      relevesBassin,
      entrees,
      compteursActifs: [],
      relevesCompteur: [],
      seuilM3: 1000,
      seuilPct: 1000,
      debitM3h: 10,
      arrets: [{ timestamp_debut: t0 - 1000, timestamp_fin: t1 + 1000 }], // couvre ]t0,t1]
    })!;
    expect(r.consoReseauM3).toBeNull(); // apport réseau 0 → sortie 0 → null
    expect(r.pertesM3).toBeNull();
  });

  it('aucun débit connu → sortie réseau inconnue (null), pas de NRW aberrant', () => {
    const r = computeBilan({
      currentTimestamp: t1,
      stockMesureM3: 105,
      relevesBassin,
      entrees, // aucun apport manuel
      compteursActifs: [{ id: 'c1', actif: true }],
      relevesCompteur: [
        { compteur_id: 'c1', index: 0, rupture_index: false, timestamp: t0 - 1000 },
        { compteur_id: 'c1', index: 3, rupture_index: false, timestamp: t1 - 1000 },
      ],
      seuilM3: 100,
      seuilPct: 100,
      // debitM3h omis → aucun apport mesuré indépendant → sortie réseau inconnue
    })!;
    expect(r.consoReseauM3).toBeNull();
    expect(r.pertesM3).toBeNull();
    expect(r.nrwReseauPct).toBeNull();
    expect(r.anomalieReseau).toBe(false);
  });
});

describe('autonomie estimée — critère #6', () => {
  it('stock 240 m³ ÷ conso horaire moyenne → heures + date de vidage', () => {
    const now = 10_000_000_000;
    const jour = 24 * 60 * 60 * 1000;
    // 2 bilans de conso réseau 120 m³ chacun sur une fenêtre de 30 j → 240/30 = 8 m³/j.
    const r = estimerAutonomie({
      stockActuelM3: 240,
      bilans: [
        { timestamp: new Date(now - jour).toISOString(), conso_reseau_m3: 120 },
        { timestamp: new Date(now - 2 * jour).toISOString(), conso_reseau_m3: 120 },
      ],
      fenetreJours: 30,
      nowMs: now,
    });
    expect(r.consoMoyenneJourM3).toBeCloseTo(8, 6);
    expect(r.consoMoyenneHeureM3).toBeCloseTo(8 / 24, 6);
    expect(r.autonomieHeures).toBeCloseTo(240 / (8 / 24), 4); // 720 h
    expect(r.vidagePrevuMs).toBeCloseTo(now + 720 * 3_600_000, 0);
  });

  it('conso nulle → autonomie indéfinie', () => {
    const r = estimerAutonomie({ stockActuelM3: 100, bilans: [], fenetreJours: 30, nowMs: 1 });
    expect(r.autonomieHeures).toBeNull();
    expect(r.vidagePrevuMs).toBeNull();
  });
});

describe('alerte flotteur défaillant — critère #5', () => {
  const base = {
    now: Date.parse('2026-06-15T10:00:00Z'),
    joursSansReleveAlerte: null as number | null,
    bassinSeuilCritiquePct: null as number | null,
    tauxRemplissagePct: null as number | null,
    compteursActifs: [] as { id: string; nom: string }[],
    dernierReleveParCompteur: {} as Record<string, number | undefined>,
    bilansAnomalieNonTraitee: [] as { id: string; ecart_pct: number | null }[],
    nrwPct: null as number | null,
    pertesM3: null as number | null,
  };

  it('lève flotteur_defaillant si niveau > hauteur flotteur', () => {
    const out = computeAlerteCandidates({ ...base, hauteurDerniereCm: 255, hauteurFlotteurCm: 250 });
    expect(out.some((a) => a.type === 'flotteur_defaillant')).toBe(true);
  });

  it('ne lève PAS flotteur_defaillant si niveau ≤ flotteur', () => {
    const out = computeAlerteCandidates({ ...base, hauteurDerniereCm: 240, hauteurFlotteurCm: 250 });
    expect(out.some((a) => a.type === 'flotteur_defaillant')).toBe(false);
  });
});
