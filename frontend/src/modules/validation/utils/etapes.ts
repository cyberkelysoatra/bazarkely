// Steps of a project (VC-46, RM2): five fixed steps, shared by the client screens and the pilotage.
// A step is « franchie » only when Joël marked it (porte_franchie_at), never by itself.

export interface Etape {
  n: number;
  type: string;
  /** Simple name, in a sentence: « le résumé de votre projet ». */
  nom: string;
  /** Trade term: « note de cadrage ». */
  terme: string;
  /** Article of the term at the start of a sentence: « La », « Le », « Les ». */
  article: string;
  definition: string;
}

export const ETAPES: Etape[] = [
  {
    n: 1,
    type: 'note_cadrage',
    nom: 'le résumé de votre projet',
    terme: 'note de cadrage',
    article: 'La',
    definition: 'le document qui fixe le projet avant de le construire : le besoin, l’objectif, le budget et les délais'
  },
  {
    n: 2,
    type: 'cahier_charges',
    nom: 'le détail de votre application',
    terme: 'cahier des charges',
    article: 'Le',
    definition: 'la liste de tout ce que l’application doit faire, que nous nous engageons à livrer'
  },
  {
    n: 3,
    type: 'prd',
    nom: 'le fonctionnement écran par écran',
    terme: 'spécifications fonctionnelles',
    article: 'Les',
    definition: 'la description de chaque écran et de chaque règle, pour que rien ne soit laissé au hasard'
  },
  {
    n: 4,
    type: 'maquette',
    nom: 'l’aperçu à essayer sur votre téléphone',
    terme: 'maquette',
    article: 'La',
    definition: 'une version d’essai, à toucher sur votre téléphone avant la construction'
  },
  {
    n: 5,
    type: 'recette',
    nom: 'le contrôle avant la mise en ligne',
    terme: 'recette',
    article: 'La',
    definition: 'le contrôle final, fait ensemble, pour vérifier que tout marche avant l’ouverture'
  }
];

/** Step of a document type; null for an avenant, a découverte or an unknown type. */
export function etapeDuType(type: string | null | undefined): Etape | null {
  return ETAPES.find((e) => e.type === type) ?? null;
}

/** « 1re », « 2e », « 3e »... */
export function ordinal(n: number): string {
  return n === 1 ? '1re' : `${n}e`;
}

/** First letter capitalised, when the name starts a line. */
export function majuscule(t: string): string {
  return t ? t.charAt(0).toLocaleUpperCase('fr') + t.slice(1) : t;
}

/** « La note de cadrage, c’est le document qui fixe ... délais. » */
export function phraseDefinition(e: Etape): string {
  return `${e.article} ${e.terme}, c’est ${e.definition}.`;
}

/** « la 1re étape, le résumé de votre projet (note de cadrage) » (WhatsApp messages). */
export function phraseEtape(e: Etape): string {
  return `la ${ordinal(e.n)} étape, ${e.nom} (${e.terme})`;
}

/** « Étape 1 sur 5 : Le résumé de votre projet (note de cadrage) » (compact line). */
export function ligneEtape(e: Etape): string {
  return `Étape ${e.n} sur ${ETAPES.length} : ${majuscule(e.nom)} (${e.terme})`;
}

export type EtatEtape = 'franchie' | 'en_cours' | 'verification' | 'a_venir';

/** What the steps need of a questionnaire (client document or pilotage questionnaire). */
export interface DocEtape {
  type: string;
  etat: string;
  publie_at?: string | null;
  porte_franchie_at?: string | null;
}

/**
 * State of each of the five steps, from the published questionnaires (any state but a draft);
 * null when none of the five types is published (no steps shown at all). The step « en cours »
 * is the one of the latest publication; without a date (copy kept from an older version), the
 * list order of vc_mon_espace (latest publication first) decides.
 */
export function etatsEtapes(docs: DocEtape[] | null | undefined): { etape: Etape; etat: EtatEtape }[] | null {
  const publies = (docs ?? []).filter((d) => d.etat !== 'brouillon' && etapeDuType(d.type));
  if (!publies.length) return null;
  let dernier = publies[0];
  let t = dernier.publie_at ? Date.parse(dernier.publie_at) : Number.NEGATIVE_INFINITY;
  for (const d of publies.slice(1)) {
    const x = d.publie_at ? Date.parse(d.publie_at) : Number.NaN;
    if (Number.isFinite(x) && x > t) {
      dernier = d;
      t = x;
    }
  }
  const courante = etapeDuType(dernier.type)!.n;
  return ETAPES.map((etape) => {
    const siens = publies.filter((d) => d.type === etape.type);
    let etat: EtatEtape = 'a_venir';
    if (siens.some((d) => d.porte_franchie_at)) etat = 'franchie';
    else if (etape.n === courante) etat = 'en_cours';
    else if (etape.n < courante && siens.length) etat = 'verification';
    return { etape, etat };
  });
}
