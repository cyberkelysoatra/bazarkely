import { describe, it, expect } from 'vitest';
import { calculerConsoEstimee, consoBaseM3hOf, type ConsoEstimeeInput } from '../utils/consoEstimee';
import { PERTE_RESEAU_DEFAUT_PCT } from '../utils/bilan';
import { FRACTION_POMPE } from '../utils/projection';

const FLOTTEUR = 245; // V_flotteur (m³) ; τ=0,95 → seuil 232,75
const H = 3_600_000;
const base = (over: Partial<ConsoEstimeeInput>): ConsoEstimeeInput => ({
  relevesBassin: [],
  entrees: [],
  debitM3h: 5,
  volumeFlotteurM3: FLOTTEUR,
  consoMoyenneHeureM3: 0,
  pertePct: PERTE_RESEAU_DEFAUT_PCT, // 0,30
  ...over,
});
// Relevés à partir d'un t0 fixe (ms), +Nh.
const t0 = 1_700_000_000_000;
const rel = (h: number, v: number) => ({ timestamp: t0 + h * H, volume_m3: v });

describe('calculerConsoEstimee — plafond pompe intermittente', () => {
  it('intervalle FIABLE (fini sous le flotteur) garde sa conso brute, net de pertes', () => {
    const out = calculerConsoEstimee(base({ relevesBassin: [rel(0, 200), rel(10, 150)] }));
    expect(out).toHaveLength(1);
    // apport=5×10=50 ; consoBrut=max(0,50−(150−200))=100 ; net=100×0,70=70
    expect(out[0].plafonne).toBe(false);
    expect(out[0].consoNetteM3).toBeCloseTo(70, 6);
  });

  it('intervalle PLAFONNÉ (fini au flotteur) prend consoBase×Δt, pas débit×Δt', () => {
    const out = calculerConsoEstimee(
      base({ relevesBassin: [rel(0, 200), rel(10, 150), rel(20, 245)] })
    );
    expect(out).toHaveLength(2);
    // fiable r0→r1 : rate=10 m³/h → consoBase=10
    expect(out[0].plafonne).toBe(false);
    // plafonné r1→r2 : consoBrut serait max(0,50−95)=0 ; on retient consoBase×Δt=10×10=100 → net=70
    expect(out[1].plafonne).toBe(true);
    expect(out[1].consoNetteM3).toBeCloseTo(70, 6);
  });

  it('ancrage consoBase = moyenne des rates des intervalles FIABLES', () => {
    const input = base({ relevesBassin: [rel(0, 200), rel(10, 150), rel(20, 130), rel(25, 245)] });
    // fiables : r0→r1 rate 10 ; r1→r2 apport50−(130−150)=70 rate 7 → moyenne 8,5
    expect(consoBaseM3hOf(input)).toBeCloseTo(8.5, 6);
    const out = calculerConsoEstimee(input);
    const plaf = out.find((i) => i.plafonne)!;
    // r2→r3 Δt=5 plafonné → 8,5×5=42,5 net 42,5×0,70=29,75
    expect(plaf.consoNetteM3).toBeCloseTo(29.75, 6);
  });

  it('repli 1 : aucun fiable → consoMoyenneHeureM3', () => {
    const input = base({
      relevesBassin: [rel(0, 245), rel(10, 245)],
      consoMoyenneHeureM3: 2,
    });
    expect(consoBaseM3hOf(input)).toBeCloseTo(2, 6);
    const out = calculerConsoEstimee(input);
    expect(out[0].plafonne).toBe(true);
    expect(out[0].consoNetteM3).toBeCloseTo(2 * 10 * (1 - PERTE_RESEAU_DEFAUT_PCT), 6); // 14
  });

  it('repli 2 : aucun fiable, pas de moyenne → débit × FRACTION_POMPE', () => {
    const input = base({ relevesBassin: [rel(0, 245), rel(10, 245)], consoMoyenneHeureM3: 0, debitM3h: 5 });
    expect(consoBaseM3hOf(input)).toBeCloseTo(5 * FRACTION_POMPE, 6); // 2,5
  });

  it('repli 3 : aucun fiable, pas de moyenne, pas de débit → 0', () => {
    const input = base({ relevesBassin: [rel(0, 245), rel(10, 245)], consoMoyenneHeureM3: 0, debitM3h: null });
    expect(consoBaseM3hOf(input)).toBe(0);
  });

  it('net de pertes : pertePct=0 → consoNette = consoRetenue', () => {
    const out = calculerConsoEstimee(base({ relevesBassin: [rel(0, 200), rel(10, 150)], pertePct: 0 }));
    expect(out[0].consoNetteM3).toBeCloseTo(100, 6);
  });

  it('une entrée manuelle dans l\'intervalle ne plafonne JAMAIS (même fini au flotteur)', () => {
    const out = calculerConsoEstimee(
      base({
        relevesBassin: [rel(0, 200), rel(10, 245)],
        entrees: [{ timestamp: t0 + 5 * H, volume_m3: 60 }],
      })
    );
    // entreesInt=60 → apport=60 ; consoBrut=max(0,60−45)=15 ; fiable malgré niveau au flotteur
    expect(out[0].plafonne).toBe(false);
    expect(out[0].consoNetteM3).toBeCloseTo(15 * 0.7, 6); // 10,5
  });

  it('bassin non configuré (volumeFlotteurM3 null) → jamais plafonné', () => {
    const out = calculerConsoEstimee(
      base({ relevesBassin: [rel(0, 200), rel(10, 300)], volumeFlotteurM3: null })
    );
    expect(out[0].plafonne).toBe(false);
  });
});
