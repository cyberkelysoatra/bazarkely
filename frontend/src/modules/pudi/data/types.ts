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
}

export interface Fokontany {
  n: number;
  ceni: string | null;
  affichage: string;
  champLibre?: boolean;
}

export interface PudiDonnees {
  meta: {
    titre: string;
    tranches: Tranche[];
    coutTotalA?: { montantAr: number; projets: number };
  };
  secteurs: Secteur[];
  programmes: Programme[];
  fokontany: Fokontany[];
  profils: string[];
  notes: string[];
}
