// Shapes of pudi-donnees.json (workshop data file, single source of truth).

export interface Tranche {
  id: number;
  libelle: string;
  couleur: string;
}

export interface Forfait {
  numero: number;
  intitule: string;
  montantAr: number;
  detail: string;
  programmes: string[];
}

export interface Secteur {
  id: string;
  nom: string;
  couleur: string;
  couleurFoncee: string;
  images: string[];
  forfait?: Forfait;
}

export interface CoutA {
  numero: number;
  intitule: string;
  description?: string;
  montantAr: number;
  detail?: string;
  correspondanceIncertaine?: boolean;
}

export interface CodePudi {
  code: string;
  libelle: string;
  tranches: string[];
  secteurOrigine?: string;
  coutA?: CoutA;
  /** Official full label of the PUDi (data v3). */
  libelleComplet?: string;
  /** Printed page numbers of the PUDi document. */
  pagesPudi?: number[];
}

export interface Programme {
  id: string;
  secteur: string;
  nom: string;
  resume: string;
  sites: string[];
  trancheAffichee: string;
  codes: CodePudi[];
  cout: { montantAr: number | null; auMoins?: boolean; mention: string };
  incluAussi: string[];
  /** Printed page numbers of the PUDi document (« Pour en savoir plus »). */
  pagesPudi?: number[];
  /** Clarification shown in a « Précision » box (5 programmes). */
  precision?: string;
}

/** Public PUDi documents (meta.documents). File page = printed page + decalagePage. */
export interface DocumentPudi {
  id: string;
  titre: string;
  fichier: string;
  taille: string;
  octets: number;
  pages?: number;
  decalagePage?: number;
}

/** Search synonyms: a query containing one of `mots` shows `cibles` first. */
export interface Synonyme {
  mots: string[];
  cibles: string[];
}

export interface Fokontany {
  n: number;
  ceni: string | null;
  affichage: string;
  champLibre?: boolean;
  /** Registered voters 2023 (CENI), for the representativeness of the administration. */
  electeurs2023?: number | null;
  /** Spellings of the same place used in the PUDi (e.g. « Djabala Be » for Djabalabe). */
  variantesPUDi?: string[];
}

export interface PudiDonnees {
  meta: {
    titre: string;
    tranches: Tranche[];
    coutTotalA?: { montantAr: number; projets: number };
    documents?: DocumentPudi[];
    notePages?: string;
  };
  secteurs: Secteur[];
  programmes: Programme[];
  fokontany: Fokontany[];
  profils: string[];
  notes: string[];
  synonymes?: Synonyme[];
}
