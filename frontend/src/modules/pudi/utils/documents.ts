// Links to the two public PUDi documents (served as static files under /pudi/documents/).
// Pure: unit tested. The page numbers of the data file are the PRINTED numbers; the PDF file
// page is printed page + decalagePage (8 for the full PUDi).
import type { DocumentPudi, PudiDonnees } from '../data/types';

export const DOSSIER_DOCUMENTS = '/pudi/documents/';
export const ID_PUDI = 'pudi';
const PUDI_PAR_DEFAUT: DocumentPudi = {
  id: ID_PUDI,
  titre: "Plan d'Urbanisme Directeur de Nosy Be 2025-2040, version 2.0",
  fichier: 'pudi-nosy-be-2025-2040-v2.pdf',
  taille: '14,6 Mo',
  octets: 14638893,
  pages: 167,
  decalagePage: 8
};

export function documentsPudi(d: PudiDonnees | null): DocumentPudi[] {
  return d?.meta.documents?.length ? d.meta.documents : [PUDI_PAR_DEFAUT];
}

export function documentPudi(d: PudiDonnees | null): DocumentPudi {
  return documentsPudi(d).find((x) => x.id === ID_PUDI) ?? PUDI_PAR_DEFAUT;
}

export function urlDocument(doc: DocumentPudi): string {
  return DOSSIER_DOCUMENTS + doc.fichier;
}

/** Link that opens the PDF at a printed page: `#page=<printed + offset>`. */
export function urlPagePudi(doc: DocumentPudi, pageImprimee: number): string {
  return `${urlDocument(doc)}#page=${pageImprimee + (doc.decalagePage ?? 0)}`;
}

/** « PUDi p. 66, 67, 68 » (the label of a group of page links). */
export function libellePages(pages: number[]): string {
  return `PUDi p. ${pages.join(', ')}`;
}
