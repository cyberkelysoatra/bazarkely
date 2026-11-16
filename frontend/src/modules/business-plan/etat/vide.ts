// planVide(): a plan with every field initialised (contract of types.ts), and the merge that keeps
// unknown fields of a stored plan (written by a later version) through a load and a save.
import type { Composant, Impact, Investissement, Ligne, Mission, Pitch, Plan, Produit, Ressource } from '../types';
import { migrerM5 } from './migrerM5';

export function nouvelId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

export function ligneVide(): Ligne {
  return { id: nouvelId(), libelle: '', montant: null };
}

/** NEC-CC-38: empty component (one global cost by default: lot 1 piece, 1 piece used). */
export function composantVide(): Composant {
  return { id: nouvelId(), designation: '', prixLot: null, quantiteLot: 1, uniteLot: 'piece', quantiteUtilisee: 1, uniteUtilisee: 'piece' };
}

export function produitVide(unite = ''): Produit {
  return { id: nouvelId(), nom: '', unite, prix: null, ventesParMois: null, composants: [composantVide()] };
}

export function investissementVide(): Investissement {
  return { id: nouvelId(), designation: '', quantite: 1, prixUnitaire: null };
}

export function ressourceVide(nature: Ressource['nature'] = 'argent'): Ressource {
  return { id: nouvelId(), nature, designation: '', valeur: null };
}

export function impactVide(): Impact {
  return { boucle: { statut: '', explications: 0 }, prerempli: false, emplois: [], femmes: null, jeunes: null, clientsMois: null, partenaires: [], autreEffet: '', envTrace: '', envReduction: '', phrase: '' };
}

export function missionVide(): Mission {
  return {
    boucle: { statut: '', explications: 0 },
    prerempli: false,
    questions: '',
    clientsAInterroger: '',
    prixARelever: '',
    elementsUnite: '',
    chargesADemander: '',
    presentation: '',
    camarade: '',
    debut: null,
    entretiens: [],
    appris: { aujourdhui: '', paie: '', embete: '', surprise: '' },
    decision: '',
    reports: {}
  };
}

/** The impact page of a plan, with safe defaults for a plan saved before NEC-CC-12 (and NEC-CC-17). */
export function impactDe(plan: Plan): Impact {
  const impact = plan.impact;
  if (!impact) return impactVide();
  if (typeof impact.envTrace === 'string' && typeof impact.envReduction === 'string') return impact;
  // Read only copy: the stored plan is never changed here.
  return { ...impact, envTrace: impact.envTrace ?? '', envReduction: impact.envReduction ?? '' };
}

export function missionDe(plan: Plan): Mission {
  return plan.mission ?? missionVide();
}

export function pitchVide(): Pitch {
  return { motsCles: {}, essais: [], reponses: {} };
}

/** The pitch of a plan, with safe defaults for a plan saved before NEC-CC-14. */
export function pitchDe(plan: Plan): Pitch {
  return plan.pitch ?? pitchVide();
}

export function planVide(): Plan {
  const maintenant = new Date().toISOString();
  return {
    id: nouvelId(),
    creeLe: maintenant,
    modifieLe: maintenant,
    rev: 0,
    uniteVente: '',
    identite: { nomPrenom: '', nomProjet: '', telephone: '', email: '', secteur: '', secteurAutre: '', lieu: '', unePhrase: '', avancement: '', porteurs: '', attentes: '' },
    m1: {
      consequences: '',
      probleme: '',
      causes: '',
      client: { qui: '', ou: '', combien: '', aujourdhui: '', prixAujourdhui: '', decideur: '' },
      pv: { pour: '', qui: '', propose: '', quiBenefice: '', contrairement: '' },
      pourquoiMoi: ''
    },
    m2: { segments: '', proposition: '', canaux: '', relation: '', revenus: '', ressources: '', activites: '', partenaires: '', couts: '', versionDu: '' },
    m3: {
      nbClients: null,
      nbClientsSource: '',
      qteParAchat: null,
      qteSource: '',
      achatsParMois: null,
      achatsSource: '',
      prixPrevu: null,
      partVisee: null,
      concurrents: [],
      swot: { forces: '', faiblesses: '', opportunites: '', menaces: '' }
    },
    m4: {
      produit: '',
      prix: '',
      place: '',
      promotion: '',
      etapes: '',
      equipe: [],
      fournisseurs: '',
      calendrier: (['t1', 't2', 't3', 't4'] as const).map((periode) => ({ periode, objectif: '', responsable: '' })),
      forme: '',
      formePourquoi: '',
      demarches: (['statuts', 'nif', 'stat', 'rcs', 'carteFiscale', 'compte', 'cnaps'] as const).map((id) => ({ id, fait: false, datePrevue: '' }))
    },
    m5: {
      modele: 2,
      produits: [produitVide()],
      chargesFixes: { loyer: null, salaires: null, energie: null, transport: null, telephone: null, autres: null, lignes: [] },
      joursParMois: 25,
      investissements: [investissementVide()],
      stockDepart: null,
      fondsRoulementSaisi: null,
      ressources: [ressourceVide()],
      hausses: [null, null],
      annees: [0, 1, 2].map(() => ({ chargesFixesMois: null })),
      tauxImpot: null,
      hypotheses: '',
      risques: [0, 1, 2].map(() => ({ id: nouvelId(), risque: '', reponse: '' }))
    },
    synthese: { probleme: '', solution: '', marche: '', organisation: '', chiffres: '', equipeDemande: '' },
    relecture: { points: {}, questionBinome: '' },
    actions: [],
    prix: [],
    notes: '',
    impact: impactVide(),
    mission: missionVide(),
    pitch: pitchVide()
  };
}

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Stored values win; missing keys come from the base; unknown keys are kept; arrays are taken as stored. */
function fusionner(base: unknown, stocke: unknown): unknown {
  if (!estObjet(base) || !estObjet(stocke)) return stocke === undefined ? base : stocke;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(stocke)) out[k] = k in base ? fusionner(base[k], v) : v;
  return out;
}

/** A stored plan completed with every field of the current model (unknown future fields survive). */
export function completerPlan(stocke: Partial<Plan> & { id: string }): Plan {
  // NEC-CC-38: an old module 5 (single product) is moved into the lists BEFORE the merge, otherwise
  // the merge would add the empty product of planVide() to the old plan.
  const brut = stocke as Record<string, unknown>;
  const entree = brut.m5 !== undefined && brut.m5 !== null ? { ...stocke, m5: migrerM5(brut.m5, typeof brut.uniteVente === 'string' ? brut.uniteVente : '') } : stocke;
  const plan = fusionner(planVide(), entree) as Plan;
  const m5 = plan.m5;
  if (!Array.isArray(m5.produits) || !m5.produits.length) m5.produits = [produitVide(plan.uniteVente)];
  for (const p of m5.produits) if (!Array.isArray(p.composants)) p.composants = [];
  if (!Array.isArray(m5.investissements)) m5.investissements = [];
  if (!Array.isArray(m5.ressources)) m5.ressources = [];
  const h = Array.isArray(m5.hausses) ? m5.hausses : [];
  m5.hausses = [typeof h[0] === 'number' ? h[0] : null, typeof h[1] === 'number' ? h[1] : null];
  // `annees` always has 3 items.
  const annees = Array.isArray(m5.annees) ? m5.annees.slice(0, 3) : [];
  while (annees.length < 3) annees.push({ chargesFixesMois: null });
  m5.annees = annees;
  return plan;
}

/** Deep copy of plain JSON data (works on every Android browser). */
export function copier<T>(valeur: T): T {
  return JSON.parse(JSON.stringify(valeur)) as T;
}
