import { describe, it, expect } from 'vitest';
import { calculerConsoEstimee, consoBaseM3hOf, type ConsoEstimeeInput } from '../utils/consoEstimee';
import { PERTE_RESEAU_DEFAUT_PCT } from '../utils/bilan';
import { FRACTION_POMPE } from '../utils/projection';

const PERTE = PERTE_RESEAU_DEFAUT_PCT; // 0,30
const H = 3_600_000;
const t0 = 1_700_000_000_000;
const rel = (h: number, v: number) => ({ timestamp: t0 + h * H, volume_m3: v });
const base = (over: Partial<ConsoEstimeeInput>): ConsoEstimeeInput => ({
  relevesBassin: [],
  entrees: [],
  debitM3h: 5,
  consoMoyenneHeureM3: 0,
  pertePct: PERTE,
  ...over,
});

describe('calculerConsoEstimee — ancrage sur le vidage, plafond sur la montée', () => {
  it('VIDAGE (niveau baisse) : conso OBSERVÉE = −Δstock, net de pertes', () => {
    const out = calculerConsoEstimee(base({ relevesBassin: [rel(0, 200), rel(10, 150)] }));
    expect(out).toHaveLength(1);
    // dstock=−50 → conso observée 50 ; net 50×0,70=35 ; observée (non plafonné)
    expect(out[0].plafonne).toBe(false);
    expect(out[0].consoNetteM3).toBeCloseTo(35, 6);
  });

  it('MONTÉE (niveau monte) : conso ESTIMÉE = consoBase×Δt (PAS débit×Δt)', () => {
    // r0→r1 vidage (rate 5) ; r1→r2 montée → estimée
    const out = calculerConsoEstimee(base({ relevesBassin: [rel(0, 200), rel(10, 150), rel(20, 200)] }));
    expect(out).toHaveLength(2);
    expect(out[0].plafonne).toBe(false); // vidage observé
    expect(out[1].plafonne).toBe(true); // montée estimée
    // consoBase = 50/10 = 5 m³/h ; r1→r2 Δt=10 → 5×10=50 ; net 35
    expect(out[1].consoNetteM3).toBeCloseTo(35, 6);
  });

  it('ancrage consoBase = moyenne des rythmes de VIDAGE', () => {
    // vidages : 200→150 (rate 5) puis 150→120 (rate 3) → moyenne 4
    const input = base({ relevesBassin: [rel(0, 200), rel(10, 150), rel(20, 120), rel(25, 200)] });
    expect(consoBaseM3hOf(input)).toBeCloseTo(4, 6);
    const out = calculerConsoEstimee(input);
    const estime = out.find((i) => i.plafonne)!;
    // r2→r3 montée Δt=5 → 4×5=20 ; net 20×0,70=14
    expect(estime.consoNetteM3).toBeCloseTo(14, 6);
  });

  it('repli 1 : aucun vidage → consoMoyenneHeureM3', () => {
    const input = base({ relevesBassin: [rel(0, 100), rel(10, 200)], consoMoyenneHeureM3: 2 });
    expect(consoBaseM3hOf(input)).toBeCloseTo(2, 6);
    const out = calculerConsoEstimee(input); // montée seule → estimée
    expect(out[0].plafonne).toBe(true);
    expect(out[0].consoNetteM3).toBeCloseTo(2 * 10 * (1 - PERTE), 6); // 14
  });

  it('repli 2 : aucun vidage, pas de moyenne → débit × FRACTION_POMPE', () => {
    const input = base({ relevesBassin: [rel(0, 100), rel(10, 200)], consoMoyenneHeureM3: 0, debitM3h: 5 });
    expect(consoBaseM3hOf(input)).toBeCloseTo(5 * FRACTION_POMPE, 6); // 2,5
  });

  it('repli 3 : aucun vidage, pas de moyenne, pas de débit → 0', () => {
    const input = base({ relevesBassin: [rel(0, 100), rel(10, 200)], consoMoyenneHeureM3: 0, debitM3h: null });
    expect(consoBaseM3hOf(input)).toBe(0);
  });

  it('net de pertes : pertePct=0 → consoNette = conso observée', () => {
    const out = calculerConsoEstimee(base({ relevesBassin: [rel(0, 200), rel(10, 150)], pertePct: 0 }));
    expect(out[0].consoNetteM3).toBeCloseTo(50, 6);
  });

  it('entrée manuelle : bilan direct max(0, entrée − Δstock), jamais estimée', () => {
    const out = calculerConsoEstimee(
      base({
        relevesBassin: [rel(0, 200), rel(10, 245)], // monte (sinon serait estimée)
        entrees: [{ timestamp: t0 + 5 * H, volume_m3: 60 }],
      })
    );
    // entrée 60, Δstock +45 → conso 15 ; net 10,5 ; observée (manuel, non plafonné)
    expect(out[0].plafonne).toBe(false);
    expect(out[0].consoNetteM3).toBeCloseTo(15 * 0.7, 6);
  });

  it('correction d’ordre de grandeur : la montée n’explose plus (vs débit×Δt)', () => {
    // Vidage lent (rate 0,8 ≈ réel) puis longue montée vers le plein.
    const input = base({
      relevesBassin: [rel(0, 245), rel(10, 237), rel(40.17, 245)], // baisse 8 sur 10h → 0,8 m³/h
      debitM3h: 5.11,
    });
    expect(consoBaseM3hOf(input)).toBeCloseTo(0.8, 6);
    const out = calculerConsoEstimee(input);
    const montee = out.find((i) => i.plafonne)!;
    // 0,8 × 30,17 = 24,1 net 16,9 — ordre 15–35, PAS ≈95 (débit×Δt) ni ≈122
    expect(montee.consoNetteM3).toBeGreaterThan(10);
    expect(montee.consoNetteM3).toBeLessThan(35);
  });
});
