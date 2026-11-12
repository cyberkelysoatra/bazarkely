// planVide(): a plan with every field initialised (contract of types.ts), and the merge that keeps
// unknown fields of a stored plan (written by a later version) through a load and a save.
import type { Impact, Ligne, Mission, Pitch, Plan } from '../types';

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
      couts: [ligneVide()],
      prixVente: null,
      chargesFixes: { loyer: null, salaires: null, energie: null, transport: null, telephone: null, autres: null, lignes: [] },
      joursParMois: 25,
      investissements: [ligneVide()],
      stockDepart: null,
      fondsRoulementSaisi: null,
      ressources: { apport: null, subvention: null, pret: null, autre: null, autreLibelle: '' },
      annees: [0, 1, 2].map(() => ({ ventesParMois: null, chargesFixesMois: null })),
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
  const plan = fusionner(planVide(), stocke) as Plan;
  // `annees` always has 3 items.
  const annees = Array.isArray(plan.m5.annees) ? plan.m5.annees.slice(0, 3) : [];
  while (annees.length < 3) annees.push({ ventesParMois: null, chargesFixesMois: null });
  plan.m5.annees = annees;
  return plan;
}

/** Deep copy of plain JSON data (works on every Android browser). */
export function copier<T>(valeur: T): T {
  return JSON.parse(JSON.stringify(valeur)) as T;
}
