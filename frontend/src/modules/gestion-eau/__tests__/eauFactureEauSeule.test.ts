/**
 * ELEC-CC-01 : la facture d'eau ne contient plus l'électricité (génération, aperçu, PDF),
 * et une facture combinée émise avant ce chantier reste lisible (PDF archivé).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CompteurLocal, ConfigLocal, FactureLocal } from '../types/gestionEau';

const saved: FactureLocal[] = [];
const COMPTEUR = { id: 'c1', nom: 'V04', type: 'villa', actif: true } as unknown as CompteurLocal;
const CONFIG = { id: 'singleton', tarif_m3: 5000, devise: 'MGA', numero_facture_seq: 0 } as unknown as ConfigLocal;

vi.mock('../db/gestionEauDb', () => {
  const table = (rows: () => unknown[]) => ({
    where: () => ({ equals: () => ({ toArray: async () => rows() }) }),
  });
  return {
    eauDb: {
      eau_releves_compteur: table(() => [
        { compteur_id: 'c1', index: 100, timestamp: '2026-10-01T00:00:00.000Z', rupture_index: false },
        { compteur_id: 'c1', index: 130, timestamp: '2026-10-20T00:00:00.000Z', rupture_index: false },
      ]),
      eau_elec_releves_compteur: table(() => [
        { compteur_id: 'c1', index: 10, timestamp: '2026-10-01T00:00:00.000Z', rupture_index: false },
        { compteur_id: 'c1', index: 60, timestamp: '2026-10-20T00:00:00.000Z', rupture_index: false },
      ]),
      eau_factures: table(() => saved),
    },
  };
});
vi.mock('../services/eauSync', () => ({
  pullTable: vi.fn(),
  deleteLocal: vi.fn(),
  saveLocal: vi.fn(async (_t: string, rec: FactureLocal) => {
    saved.push(rec);
    return rec;
  }),
}));
vi.mock('../services/eauConfigService', () => ({
  getConfig: vi.fn(async () => CONFIG),
  saveConfig: vi.fn(async () => CONFIG),
}));
vi.mock('../services/eauCompteurService', () => ({
  listCompteursActifs: vi.fn(async () => [COMPTEUR]),
  listCompteurs: vi.fn(async () => [COMPTEUR]),
}));
vi.mock('../services/eauElecCoutService', () => ({
  getCoutByMois: vi.fn(async () => ({ mois: '2026-10', total_jirama: 1000000, total_gasoil: 500000, total_kwh: 3000, prix_kwh: 500 })),
}));
vi.mock('../services/eauAuditService', () => ({ logAudit: vi.fn() }));

const START = '2026-10-01T00:00:00.000Z';
const END = '2026-10-31T23:59:59.000Z';

/** Texte brut du PDF (jsPDF non compressé : les chaînes affichées sont lisibles). */
async function pdfText(facture: FactureLocal): Promise<string> {
  const { buildFactureCombineePdf } = await import('../utils/pdf');
  const doc = await buildFactureCombineePdf({ facture, config: CONFIG, compteur: COMPTEUR });
  return doc.output();
}

describe('Facture d’eau seule (ELEC-CC-01)', () => {
  beforeEach(() => {
    saved.length = 0;
    // Logo absent → repli texte (aucun réseau en test).
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
  });

  it('aperçu : seulement l’eau, même si des relevés électriques existent', async () => {
    const { previewFactures } = await import('../services/eauFactureService');
    const [p] = await previewFactures(START, END);
    expect(p.conso).toBe(30);
    expect(p.montant).toBe(150000);
    expect(p.montantTotal).toBe(150000);
    expect(Object.keys(p).some((k) => /elec|kwh/i.test(k))).toBe(false);
  });

  it('génération : aucun volet électrique, total = eau', async () => {
    const { genererFactures } = await import('../services/eauFactureService');
    const [f] = await genererFactures(START, END);
    expect(f.conso_m3).toBe(30);
    expect(f.montant_total).toBe(150000);
    expect([f.conso_kwh, f.montant_elec, f.prix_kwh, f.cout_mois, f.index_debut_elec, f.index_fin_elec]).toEqual([
      null, null, null, null, null, null,
    ]);
  });

  it('PDF d’une facture d’eau : aucune mention d’électricité ni de kWh', async () => {
    const { genererFactures } = await import('../services/eauFactureService');
    const [f] = await genererFactures(START, END);
    const txt = await pdfText(f);
    expect(txt).toContain('FACTURE');
    expect(txt).toMatch(/m³|m3|30/);
    expect(txt).not.toMatch(/kWh/);
    expect(txt).not.toMatch(/LECTRICIT|lectricit/);
    expect(txt).not.toMatch(/JIRAMA|Gasoil/);
  });

  it('une facture combinée émise avant ce chantier reste lisible avec son volet électrique', async () => {
    const ancienne = {
      id: 'old', numero: 'F-000001', compteur_id: 'c1', periode_start: START, periode_end: END,
      index_debut: 100, index_fin: 130, conso_m3: 30, tarif: 5000, montant: 150000, devise: 'MGA',
      statut: 'impaye', date_echeance: END, paye_at: null, relance_count: 0, generated_at: END,
      index_debut_elec: 10, index_fin_elec: 60, conso_kwh: 50, prix_kwh: 500, montant_elec: 25000,
      cout_mois: '2026-10', montant_total: 175000,
    } as unknown as FactureLocal;
    const txt = await pdfText(ancienne);
    expect(txt).toContain('FACTURE');
    expect(txt).toMatch(/kWh/);
    expect(txt).toMatch(/JIRAMA/);
  });
});
