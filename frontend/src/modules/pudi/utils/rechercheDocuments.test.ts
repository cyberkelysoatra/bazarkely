// PUDI-CC-15: search in the text of the two PUDi documents, on the real index file.
import { describe, expect, it } from 'vitest';
import indexBrut from '../data/index-documents-pudi.json';
import type { DocumentPudi } from '../data/types';
import { urlPagePudi } from './documents';
import {
  MAX_LIENS_DOCUMENT,
  liensPagesDocument,
  pageImprimee,
  rechercherDocuments,
  termesDocuments,
  urlPageFichier,
  type IndexDocuments
} from './rechercheDocuments';

const INDEX = indexBrut as unknown as IndexDocuments;
const PUDI: DocumentPudi = { id: 'pudi', titre: 'PUDi', fichier: 'pudi-nosy-be-2025-2040-v2.pdf', taille: '14,6 Mo', octets: 1, pages: 167, decalagePage: 8 };
const REGLEMENTS: DocumentPudi = { id: 'reglements', titre: 'Règlements', fichier: 'reglements-urbanisme-pudi-nosy-be.pdf', taille: '1,2 Mo', octets: 1 };
const MANGROVE_PUDI = [9, 12, 25, 27, 54, 59, 60, 100, 130, 131, 161, 162];
const MANGROVE_REGLEMENTS = [2, 6, 86];

const pages = (q: string) => Object.fromEntries(rechercherDocuments(INDEX, q).map((d) => [d.id, d.pages]));

describe('rechercherDocuments', () => {
  it('« mangrove »: PUDi and rules file pages', () => {
    expect(pages('mangrove')).toEqual({ pudi: MANGROVE_PUDI, reglements: MANGROVE_REGLEMENTS });
  });

  it('« Mangrove », « mangrôve », « mangrov » give the same pages (case, accents, prefix)', () => {
    const attendu = { pudi: MANGROVE_PUDI, reglements: MANGROVE_REGLEMENTS };
    expect(pages('Mangrove')).toEqual(attendu);
    expect(pages('  mangrôve ')).toEqual(attendu);
    expect(pages('mangrov')).toEqual(attendu);
  });

  it('« mangrove eau »: only pages having both words (subset)', () => {
    const r = pages('mangrove eau');
    expect(r.pudi?.length).toBeGreaterThan(0);
    expect(r.pudi!.every((p) => MANGROVE_PUDI.includes(p))).toBe(true);
    for (const p of r.pudi!) expect(Object.keys(INDEX.mots).some((m) => m.startsWith('eau') && INDEX.mots[m].pudi?.includes(p))).toBe(true);
    (r.reglements ?? []).forEach((p) => expect(MANGROVE_REGLEMENTS).toContain(p));
  });

  it('unknown word → nothing', () => {
    expect(rechercherDocuments(INDEX, 'xyzzy')).toEqual([]);
    expect(rechercherDocuments(INDEX, 'mangrove xyzzy')).toEqual([]);
  });

  it('terms shorter than 3 letters are ignored; none left → nothing', () => {
    expect(rechercherDocuments(INDEX, 'ea')).toEqual([]);
    expect(rechercherDocuments(INDEX, '  ')).toEqual([]);
    expect(termesDocuments('la mangrove de Nosy Be')).toEqual(['mangrove', 'nosy']);
    expect(pages('la mangrove')).toEqual(pages('mangrove'));
  });
});

describe('page links of the documents', () => {
  it('PUDi: printed page = file page − 8, file pages ≤ 8 have no printed number', () => {
    expect(pageImprimee(PUDI, 9)).toBe(1);
    expect(pageImprimee(PUDI, 12)).toBe(4);
    expect(pageImprimee(PUDI, 8)).toBeNull();
    expect(pageImprimee(PUDI, 1)).toBeNull();
    expect(pageImprimee(REGLEMENTS, 2)).toBe(2);
  });

  it('the link opens the file page, consistent with urlPagePudi (printed pages)', () => {
    expect(urlPageFichier(PUDI, 12)).toBe('/pudi/documents/pudi-nosy-be-2025-2040-v2.pdf#page=12');
    expect(urlPageFichier(PUDI, 12)).toBe(urlPagePudi(PUDI, 4));
    expect(urlPageFichier(REGLEMENTS, 86)).toBe('/pudi/documents/reglements-urbanisme-pudi-nosy-be.pdf#page=86');
  });

  it('at most 12 links, the rest counted; pages before page 1 become one « sommaire » link', () => {
    const r = liensPagesDocument(PUDI, MANGROVE_PUDI);
    expect(MAX_LIENS_DOCUMENT).toBe(12);
    expect(r.liens.map((l) => l.pageImprimee)).toEqual([1, 4, 17, 19, 46, 51, 52, 92, 122, 123, 153, 154]);
    expect(r.reste).toBe(0);
    const long = liensPagesDocument(PUDI, [2, 5, 8, ...Array.from({ length: 20 }, (_, i) => 20 + i)]);
    expect(long.liens[0]).toEqual({ pageFichier: 2, pageImprimee: null, url: urlPageFichier(PUDI, 2) });
    expect(long.liens).toHaveLength(12);
    expect(long.reste).toBe(21 - 12);
    expect(liensPagesDocument(REGLEMENTS, MANGROVE_REGLEMENTS).liens.map((l) => l.pageImprimee)).toEqual([2, 6, 86]);
  });
});
