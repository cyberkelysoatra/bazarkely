// Data model of "Mon business plan" (NEC 2026). CONTRACT shared by every later phase
// (NEC-CC-02 to NEC-CC-05): never change a field after NEC-CC-01, only add.
export type Montant = number | null; // integer ariary
export interface Ligne { id: string; libelle: string; montant: Montant }
export interface Plan {
  id: string; creeLe: string; modifieLe: string; rev: number; exemple?: boolean;
  uniteVente: string; // shared by 3a and 5a
  identite: { nomPrenom: string; nomProjet: string; telephone: string; email: string; secteur: string; secteurAutre: string; lieu: string; unePhrase: string; avancement: '' | 'idee' | 'essais' | 'clients' | 'activite'; porteurs: string; attentes: string };
  m1: { consequences: string; probleme: string; causes: string; client: { qui: string; ou: string; combien: string; aujourdhui: string; prixAujourdhui: string; decideur: string }; pv: { pour: string; qui: string; propose: string; quiBenefice: string; contrairement: string }; pourquoiMoi: string };
  m2: { segments: string; proposition: string; canaux: string; relation: string; revenus: string; ressources: string; activites: string; partenaires: string; couts: string; versionDu: string };
  m3: { nbClients: Montant; nbClientsSource: string; qteParAchat: Montant; qteSource: string; achatsParMois: Montant; achatsSource: string; prixPrevu: Montant; partVisee: Montant; concurrents: { id: string; nom: string; type: '' | 'direct' | 'indirect'; prix: string; forts: string; faibles: string; mieux: string }[]; swot: { forces: string; faiblesses: string; opportunites: string; menaces: string } };
  m4: { produit: string; prix: string; place: string; promotion: string; etapes: string; equipe: { id: string; personne: string; role: string; competences: string; temps: '' | 'plein' | 'partiel' | 'benevole' }[]; fournisseurs: string; calendrier: { periode: 't1' | 't2' | 't3' | 't4'; objectif: string; responsable: string }[]; forme: string; formePourquoi: string; demarches: { id: 'statuts' | 'nif' | 'stat' | 'rcs' | 'carteFiscale' | 'compte' | 'cnaps'; fait: boolean; datePrevue: string }[] };
  m5: { couts: Ligne[]; prixVente: Montant; chargesFixes: { loyer: Montant; salaires: Montant; energie: Montant; transport: Montant; telephone: Montant; autres: Montant; lignes: Ligne[] }; joursParMois: number; investissements: Ligne[]; stockDepart: Montant; fondsRoulementSaisi: Montant; ressources: { apport: Montant; subvention: Montant; pret: Montant; autre: Montant; autreLibelle: string }; annees: { ventesParMois: Montant; chargesFixesMois: Montant }[]; tauxImpot: Montant; hypotheses: string; risques: { id: string; risque: string; reponse: string }[] };
  synthese: { probleme: string; solution: string; marche: string; organisation: string; chiffres: string; equipeDemande: string };
  relecture: { points: Record<string, '' | 'oui' | 'revoir'>; questionBinome: string };
  actions: { id: string; action: string; quand: string }[];
  prix: { id: string; element: string; unite: string; prix: Montant; ou: string }[];
  notes: string;
}
export interface AtelierProps { plan: Plan; modifier: (recette: (p: Plan) => void) => void; lectureSeule: boolean }
