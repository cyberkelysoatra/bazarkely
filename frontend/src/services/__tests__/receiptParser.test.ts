import { describe, it, expect } from 'vitest';
import {
  parseReceipt,
  parseAmount,
  computeReceiptTotal,
  signedReceiptAmount,
  buildReceiptMarkdown,
} from '../receiptParser';

describe('parseAmount — normalisation des montants OCRisés', () => {
  it('espaces de milliers (MGA)', () => {
    expect(parseAmount('1 500')).toBe(1500);
    expect(parseAmount('12 000')).toBe(12000);
  });
  it('point comme séparateur de milliers (3 chiffres)', () => {
    expect(parseAmount('12.000')).toBe(12000);
  });
  it('virgule décimale (EUR)', () => {
    expect(parseAmount('3,50')).toBe(3.5);
  });
  it('mélange point/virgule : 12.000,50', () => {
    expect(parseAmount('12.000,50')).toBe(12000.5);
  });
  it('devise et symboles ignorés', () => {
    expect(parseAmount('1 500 Ar')).toBe(1500);
    expect(parseAmount('2 400 MGA')).toBe(2400);
  });
  it('renvoie null si non numérique', () => {
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('')).toBeNull();
  });
});

describe('parseReceipt — extraction fournisseur / lignes / total', () => {
  it('cas nominal : fournisseur, 2 lignes, total lu cohérent', () => {
    const text = [
      'SHOPRITE ANTANANARIVO',
      '12/05/2025 14:30',
      'Riz 5kg          15 000',
      'Huile 1L          8 000',
      'TOTAL            23 000',
      'Especes          25 000',
      'Rendu             2 000',
    ].join('\n');

    const r = parseReceipt(text, 0.9);
    expect(r.supplier).toMatch(/SHOPRITE/i);
    expect(r.items).toHaveLength(2);
    expect(r.items[0].label).toMatch(/Riz/i);
    expect(r.items[0].lineTotal).toBe(15000);
    expect(r.items[1].lineTotal).toBe(8000);
    expect(r.total).toBe(23000);
    // Lignes "Especes" et "Rendu" exclues
    expect(r.items.find((i) => /esp[eè]ce/i.test(i.label))).toBeUndefined();
    expect(r.items.find((i) => /rendu/i.test(i.label))).toBeUndefined();
    expect(r.confidence).toBeGreaterThan(0.7);
  });

  it('prix avec espaces de milliers + quantité « 2 x 1500 »', () => {
    const text = ['Epicerie du coin', 'Pain  2 x 1 500   3 000', 'Lait   1 200', 'TOTAL  4 200'].join('\n');
    const r = parseReceipt(text, 0.8);
    const pain = r.items.find((i) => /pain/i.test(i.label));
    expect(pain).toBeDefined();
    expect(pain!.quantity).toBe(2);
    expect(pain!.unitPrice).toBe(1500);
    expect(pain!.lineTotal).toBe(3000);
    expect(r.total).toBe(4200);
  });

  it('ligne TVA ignorée', () => {
    const text = ['Magasin', 'Article A   10 000', 'TVA 20%      2 000', 'TOTAL TTC   12 000'].join('\n');
    const r = parseReceipt(text, 0.85);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].label).toMatch(/Article A/i);
    expect(r.total).toBe(12000);
  });

  it('total absent → somme des lignes', () => {
    const text = ['Tana Market', 'Tomate   2 000', 'Oignon   3 000', 'Carotte  1 000'].join('\n');
    const r = parseReceipt(text, 0.7);
    expect(r.items).toHaveLength(3);
    expect(r.total).toBe(6000); // Σ déduite
  });

  it('dates et heures ne sont pas prises pour des articles', () => {
    const text = ['Boutique', '12/05/2025', '14:30', 'Stylo   500', 'TOTAL  500'].join('\n');
    const r = parseReceipt(text, 0.8);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].label).toMatch(/Stylo/i);
  });

  it('aucun article → confiance 0', () => {
    const r = parseReceipt('Bonjour\nMerci de votre visite', 0.9);
    expect(r.items).toHaveLength(0);
    expect(r.confidence).toBe(0);
  });

  it('incohérence Σ lignes vs total lu → confiance abaissée', () => {
    const incoherent = parseReceipt(['Magasin', 'Pomme  1 000', 'Poire  1 000', 'TOTAL  9 999'].join('\n'), 0.9);
    const coherent = parseReceipt(['Magasin', 'Pomme  1 000', 'Poire  1 000', 'TOTAL  2 000'].join('\n'), 0.9);
    expect(incoherent.items.length).toBe(2);
    expect(incoherent.confidence).toBeLessThan(coherent.confidence);
  });
});

describe('computeReceiptTotal / signedReceiptAmount — recalcul du total', () => {
  const items = [
    { label: 'A', quantity: 1, lineTotal: 15000 },
    { label: 'B', quantity: 2, lineTotal: 8000 },
    { label: 'C', quantity: 1, lineTotal: 2000 },
  ];

  it('total = Σ des montants de ligne', () => {
    expect(computeReceiptTotal(items)).toBe(25000);
  });

  it('le total se met à jour quand une ligne change', () => {
    const updated = items.map((it) => (it.label === 'B' ? { ...it, lineTotal: 10000 } : it));
    expect(computeReceiptTotal(updated)).toBe(27000);
  });

  it('le total se met à jour quand une ligne est supprimée', () => {
    const removed = items.filter((it) => it.label !== 'C');
    expect(computeReceiptTotal(removed)).toBe(23000);
  });

  it('montant signé : dépense négative, revenu positif', () => {
    expect(signedReceiptAmount('expense', 25000)).toBe(-25000);
    expect(signedReceiptAmount('income', 25000)).toBe(25000);
    expect(signedReceiptAmount('expense', -25000)).toBe(-25000); // robuste au signe d'entrée
  });
});

describe('buildReceiptMarkdown — trace conservée (aucune image)', () => {
  it('produit un titre, un tableau et un total', () => {
    const md = buildReceiptMarkdown(
      'SHOPRITE',
      [{ label: 'Riz', quantity: 1, unitPrice: 15000, lineTotal: 15000 }],
      15000,
      '12/05/2025'
    );
    expect(md).toContain('# SHOPRITE');
    expect(md).toContain('| Article | Qté | Prix |');
    expect(md).toContain('Riz');
    expect(md).toMatch(/Total/);
  });
});
