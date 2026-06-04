import { describe, it, expect } from 'vitest';
import {
  dernierIndexAvant,
  computeLigneFacture,
  formatNumeroFacture,
  filterByCompteurIds,
  isConfigComplete,
  configMissingFields,
  type ReleveLite,
} from '../utils/facture';
import { genCode, genCodeEnrolement, normalizeCode } from '../utils/codes';
import { escapeCsvCell, toCsv } from '../utils/csv';

// ────────────────────────── Facturation : conso & montant ──────────────────────────
describe('facturation — calcul de ligne (critère #2)', () => {
  // Relevés : 100 @1000, 130 @3000, 175 @6000
  const releves: ReleveLite[] = [
    { index: 100, timestamp: 1000 },
    { index: 130, timestamp: 3000 },
    { index: 175, timestamp: 6000 },
  ];

  it('dernierIndexAvant trouve le dernier index ≤ t', () => {
    expect(dernierIndexAvant(releves, 2000)).toBe(100);
    expect(dernierIndexAvant(releves, 3000)).toBe(130);
    expect(dernierIndexAvant(releves, 7000)).toBe(175);
    expect(dernierIndexAvant(releves, 500)).toBeNull();
  });

  it('conso = indexFin − indexDebut, montant = conso × tarif', () => {
    // période [2000, 6000] : debut=100 (≤2000), fin=175 (≤6000) → conso 75 × 50 = 3750
    const l = computeLigneFacture(releves, 2000, 6000, 50)!;
    expect(l.indexDebut).toBe(100);
    expect(l.indexFin).toBe(175);
    expect(l.conso).toBe(75);
    expect(l.montant).toBe(3750);
  });

  it('sans relevé avant le début → indexDebut = 0 (premier cycle)', () => {
    const l = computeLigneFacture(releves, 500, 3000, 10)!;
    expect(l.indexDebut).toBe(0);
    expect(l.indexFin).toBe(130);
    expect(l.conso).toBe(130);
    expect(l.montant).toBe(1300);
  });

  it('aucun relevé ≤ fin → null (pas de facture erronée)', () => {
    expect(computeLigneFacture(releves, 100, 500, 50)).toBeNull();
  });

  it('rupture d’index dans la période → null', () => {
    const avecRupture: ReleveLite[] = [
      ...releves,
      { index: 5, timestamp: 4000, rupture_index: true },
    ];
    expect(computeLigneFacture(avecRupture, 2000, 6000, 50)).toBeNull();
  });

  it('conso jamais négative (bornée à 0)', () => {
    const decroissant: ReleveLite[] = [
      { index: 200, timestamp: 1000 },
      { index: 150, timestamp: 5000 },
    ];
    // pas de rupture marquée mais index baisse → conso 0, pas de montant négatif
    const l = computeLigneFacture(decroissant, 2000, 6000, 50)!;
    expect(l.conso).toBe(0);
    expect(l.montant).toBe(0);
  });
});

// ────────────────────────── Numérotation séquentielle ──────────────────────────
describe('numérotation des factures (critère #2)', () => {
  it('format zéro-paddé sur 6 chiffres', () => {
    expect(formatNumeroFacture(1)).toBe('F-000001');
    expect(formatNumeroFacture(42)).toBe('F-000042');
    expect(formatNumeroFacture(123456)).toBe('F-123456');
  });

  it('séquence croissante stricte', () => {
    let seq = 0;
    const nums = [1, 2, 3].map(() => formatNumeroFacture(++seq));
    expect(nums).toEqual(['F-000001', 'F-000002', 'F-000003']);
    expect(new Set(nums).size).toBe(3); // tous distincts
  });
});

// ────────────────────────── Config obligatoire ──────────────────────────
describe('config obligatoire (décision JOEL)', () => {
  const full = {
    bassin_longueur_m: 10, bassin_largeur_m: 7, bassin_hauteur_max_m: 4,
    tarif_m3: 50, seuil_pct: 10, seuil_m3: 5, seuil_aberrant_facteur: 3,
    periode_facturation_jours: 30,
  };
  it('config complète → autorisée', () => {
    expect(isConfigComplete(full)).toBe(true);
    expect(configMissingFields(full)).toEqual([]);
  });
  it('tarif manquant → bloquée + champ listé', () => {
    const cfg = { ...full, tarif_m3: null };
    expect(isConfigComplete(cfg)).toBe(false);
    expect(configMissingFields(cfg)).toContain('Tarif / m³');
  });
  it('config absente → tous les champs manquants', () => {
    expect(isConfigComplete(null)).toBe(false);
    expect(configMissingFields(null).length).toBe(8);
  });
});

// ────────────────────────── Filtrage compteurs visibles (client) ──────────────────────────
describe('filtrage des compteurs visibles côté client (critère #4)', () => {
  const factures = [
    { compteur_id: 'c1' },
    { compteur_id: 'c2' },
    { compteur_id: 'c3' },
    { compteur_id: null },
  ];
  it('ne garde que les compteurs assignés', () => {
    const r = filterByCompteurIds(factures, ['c1', 'c3']);
    expect(r.map((f) => f.compteur_id)).toEqual(['c1', 'c3']);
  });
  it('aucun compteur assigné → liste vide', () => {
    expect(filterByCompteurIds(factures, [])).toEqual([]);
  });
});

// ────────────────────────── Codes d'enrôlement ──────────────────────────
describe('codes d’enrôlement (critères #3 / #4)', () => {
  it('génère la longueur demandée dans l’alphabet non ambigu', () => {
    const c = genCode(6);
    expect(c).toHaveLength(6);
    expect(c).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/);
  });
  it('code d’enrôlement = 6 caractères', () => {
    expect(genCodeEnrolement()).toHaveLength(6);
  });
  it('normalizeCode : majuscules, sans espaces/tirets', () => {
    expect(normalizeCode(' k7q m-4p ')).toBe('K7QM4P');
    expect(normalizeCode('')).toBe('');
  });
  it('quasi-unicité sur un échantillon', () => {
    const set = new Set(Array.from({ length: 200 }, () => genCodeEnrolement()));
    expect(set.size).toBeGreaterThan(190); // collisions extrêmement rares
  });
});

// ────────────────────────── Export CSV ──────────────────────────
describe('export CSV', () => {
  it('échappe les cellules avec séparateur/guillemets/retour ligne', () => {
    expect(escapeCsvCell('abc')).toBe('abc');
    expect(escapeCsvCell('a;b')).toBe('"a;b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell(null)).toBe('');
  });
  it('toCsv produit en-tête + lignes (séparateur ;)', () => {
    const csv = toCsv([{ a: 1, b: 'x' }, { a: 2, b: 'y;z' }], ['a', 'b']);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('a;b');
    expect(lines[1]).toBe('1;x');
    expect(lines[2]).toBe('2;"y;z"');
  });
});
