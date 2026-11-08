import { describe, it, expect } from 'vitest';
import {
  parseReceipt,
  parseAmount,
  computeReceiptTotal,
  signedReceiptAmount,
  buildReceiptMarkdown,
  fromStructured,
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

const LEADER_PRICE_TICKET = [
  'LEADER PRICE',
  'PATISSERIE',
  'NOSY BE',
  'PORT : 034 47 015 78',
  'PORT : 034 47 015 73',
  'PORT : 038 73 141 50',
  '08/11/2026 09:27:41',
  'Ticket en : Ariary',
  '--------------------',
  '2  FLAN NATURE',
  'Prix: 7300 => 14600',
  '--------------------',
  'TOTAL : 14600',
  '--------------------',
  'ESPECES : 15600 RENDU : 1000',
  'Table:TABLE3 - Serveur:MURIELLA',
  '08/11/2026',
  "TPV '1'  Tick. 80  LAURENCE",
  'Le guide de Madagascar sur',
  'http://www.ebookfute.com',
  'Code partage:leaderprice',
  'Page FB: leaderpricemadagascar',
  'Web : http://www.leaderprice.mg',
  'Merci de votre visite',
  'A TRES BIENTOT',
].join('\n');

describe('parseReceipt — ticket réel Leader Price (téléphones + article sur deux lignes)', () => {
  it('C1 : 1 article FLAN NATURE ×2, total 14600, aucune ligne PORT', () => {
    const r = parseReceipt(LEADER_PRICE_TICKET, 0.8);
    expect(r.items).toEqual([{ label: 'FLAN NATURE', quantity: 2, unitPrice: 7300, lineTotal: 14600 }]);
    expect(r.total).toBe(14600);
    expect(r.totalRead).toBe(true);
    expect(r.supplier).toBe('LEADER PRICE');
    expect(r.items.find((i) => /port/i.test(i.label))).toBeUndefined();
  });

  it('C2 : sans TOTAL et total de ligne abîmé → quantité × prix unitaire, total non lu', () => {
    const damaged = LEADER_PRICE_TICKET.replace('TOTAL : 14600\n', '').replace('=> 14600', '=> 2');
    const r = parseReceipt(damaged, 0.95);
    expect(r.items).toEqual([{ label: 'FLAN NATURE', quantity: 2, unitPrice: 7300, lineTotal: 14600 }]);
    expect(r.totalRead).toBe(false);
    expect(r.total).toBe(14600);
  });

  it('total non lu → cohérence 0,5', () => {
    const r = parseReceipt('Boutique\nStylo   500', 1);
    expect(r.confidence).toBeCloseTo(0.75);
    expect(r.totalRead).toBe(false);
  });

  it.each([
    'MOB 032 12 345 67',
    'Cel: 033.12.345.67',
    '034 12 345 67',
    'Contact +261 34 12 345 67',
    'WhatsApp 0341234567',
    'Fax 020 22 123 45',
  ])('ligne de contact jamais prise pour un article : %s', (line) => {
    const r = parseReceipt(['Magasin', line, 'Riz   1 000', 'TOTAL   1 000'].join('\n'), 0.9);
    expect(r.items.map((i) => i.label)).toEqual(['Riz']);
  });

  it('une ligne « Prix » seule n’est jamais un article', () => {
    const r = parseReceipt(['Magasin', 'Riz   1 000', 'Prix unitaire 500', 'TOTAL   1 000'].join('\n'), 0.9);
    expect(r.items.map((i) => i.label)).toEqual(['Riz']);
  });

  it.each([
    ['PU 7 300  14 600', 7300, 14600],
    ['2 x 7300', 7300, 14600],
    ['x 7300 => 14600', 7300, 14600],
    ['2 x 7300 = 14600', 7300, 14600],
  ])('fusion des deux lignes : %s', (priceLine, unitPrice, lineTotal) => {
    const r = parseReceipt(['Magasin', '2  FLAN NATURE', priceLine, 'TOTAL 14600'].join('\n'), 0.9);
    expect(r.items).toEqual([{ label: 'FLAN NATURE', quantity: 2, unitPrice, lineTotal }]);
  });
});

describe('fromStructured — lecture Gemini', () => {
  const NOW = new Date(2026, 10, 8, 12, 0, 0);
  const GEMINI_TICKET = {
    supplier: 'LEADER PRICE',
    date: '2026-11-08',
    currency: 'MGA',
    items: [{ label: 'FLAN NATURE', quantity: 2, unitPrice: 7300, lineTotal: 14600 }],
    total: 14600,
  };

  it('C4 : ticket Gemini → 1 article, total 14600, confiance maximale', () => {
    const r = fromStructured(GEMINI_TICKET, NOW);
    expect(r).not.toBeNull();
    expect(r!.items).toEqual([{ label: 'FLAN NATURE', quantity: 2, unitPrice: 7300, lineTotal: 14600 }]);
    expect(r!.total).toBe(14600);
    expect(r!.totalRead).toBe(true);
    expect(r!.confidence).toBe(1);
    expect(r!.date).toBe('2026-11-08');
  });

  it('C4 : lignes à 0 et libellés vides écartés', () => {
    const r = fromStructured(
      {
        ...GEMINI_TICKET,
        items: [
          ...GEMINI_TICKET.items,
          { label: 'OFFERT', quantity: 1, unitPrice: 0, lineTotal: 0 },
          { label: '   ', quantity: 1, unitPrice: 500, lineTotal: 500 },
        ],
      },
      NOW
    );
    expect(r!.items).toHaveLength(1);
    expect(r!.items[0].label).toBe('FLAN NATURE');
  });

  it.each([
    ['null', null],
    ['texte', 'pas un ticket'],
    ['items absent', { total: 100 }],
    ['items non tableau', { items: 'x', total: 100 }],
    ['total en texte', { items: [], total: '100' }],
    ['total négatif', { items: [], total: -1 }],
    ['ligne non objet', { items: ['x'], total: 100 }],
    ['montant en texte', { items: [{ label: 'A', quantity: 1, unitPrice: null, lineTotal: '5' }], total: 5 }],
    ['montant infini', { items: [{ label: 'A', quantity: 1, unitPrice: null, lineTotal: Infinity }], total: 5 }],
  ])('C4 : JSON invalide rejeté (%s)', (_name, input) => {
    expect(fromStructured(input, NOW)).toBeNull();
  });

  it('total absent → confiance 0,5, total déduit mais non lu', () => {
    const r = fromStructured({ ...GEMINI_TICKET, total: null }, NOW);
    expect(r!.confidence).toBe(0.5);
    expect(r!.totalRead).toBe(false);
    expect(r!.total).toBe(14600);
  });

  it('écart Σ lignes / total → mêmes paliers que parseReceipt', () => {
    expect(fromStructured({ ...GEMINI_TICKET, total: 14800 }, NOW)!.confidence).toBe(0.9);
    expect(fromStructured({ ...GEMINI_TICKET, total: 16000 }, NOW)!.confidence).toBe(0.5);
    expect(fromStructured({ ...GEMINI_TICKET, total: 30000 }, NOW)!.confidence).toBe(0.3);
  });

  it('prix unitaire absent → déduit de la quantité', () => {
    const r = fromStructured(
      { ...GEMINI_TICKET, items: [{ label: 'FLAN', quantity: 2, unitPrice: null, lineTotal: 14600 }] },
      NOW
    );
    expect(r!.items[0].unitPrice).toBe(7300);
  });

  it.each([
    ['du jour', '2026-11-08', '2026-11-08'],
    ['il y a 60 jours', '2026-09-09', '2026-09-09'],
    ['il y a 61 jours', '2026-09-08', undefined],
    ['future', '2026-11-09', undefined],
    ['impossible', '2026-02-31', undefined],
    ['mal formée', '08/11/2026', undefined],
    ['absente', null, undefined],
  ])('date %s', (_name, date, expected) => {
    expect(fromStructured({ ...GEMINI_TICKET, date }, NOW)!.date).toBe(expected);
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
