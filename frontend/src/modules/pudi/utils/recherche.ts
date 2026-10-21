// « Trouver un projet »: search on the device (works offline). Pure functions, unit tested in
// recherche.test.ts. The index is built only when the search page opens (lazy chunk).
//
// Rules: lower case, accents removed, apostrophes, hyphens and punctuation as spaces, spaces
// collapsed; several words = all must match (AND), each word may be a prefix of a word of the
// project. Synonyms (data file) put their targets first under « Correspondance directe ». A place
// that is a fokontany also matches the spellings of that place used in the PUDi.
import type { Fokontany, PudiDonnees } from '../data/types';

export type ChampCle =
  | 'nom'
  | 'intitule'
  | 'sites'
  | 'lieu'
  | 'code'
  | 'secteur'
  | 'resume'
  | 'libelleComplet'
  | 'precision'
  | 'source';

/** Weight of a match in each field (ranking). */
const POIDS: Record<ChampCle, number> = {
  nom: 10,
  intitule: 10,
  sites: 7,
  lieu: 7,
  code: 5,
  secteur: 4,
  resume: 3,
  libelleComplet: 2,
  precision: 2,
  source: 1
};

export const MAX_RESULTATS = 30;
const EXTRAIT = 90;

export interface PropositionIndexable {
  id: string;
  intitule: string;
  lieu: string | null;
  source: string;
  precision: string | null;
}

interface Mot {
  n: string;
  debut: number;
  fin: number;
}

interface Champ {
  cle: ChampCle;
  texte: string;
  mots: Mot[];
  compact: string;
}

export interface DocRecherche {
  type: 'programme' | 'proposition';
  id: string;
  nom: string;
  secteur?: string;
  ordre: number;
  champs: Champ[];
}

export interface IndexRecherche {
  docs: DocRecherche[];
  synonymes: { mots: string[]; cibles: string[] }[];
  lieux: { nom: string; formes: string[] }[];
}

export interface Explication {
  champ: ChampCle | 'synonyme';
  /** Text shown after the field label (site, code line, excerpt of the summary...). */
  texte: string;
  /** Ranges of `texte` to show in bold. */
  surlignes: [number, number][];
  /** Fokontany whose PUDi spelling matched (« Djabala Be » for Djabalabe). */
  fokontany?: string;
}

export interface ResultatRecherche {
  type: 'programme' | 'proposition';
  id: string;
  nom: string;
  secteur?: string;
  explication: Explication;
  score: number;
}

export interface ReponseRecherche {
  directs: ResultatRecherche[];
  autres: ResultatRecherche[];
  /** Number of projects found (directs + others), before the display limit. */
  total: number;
}

const OE = new RegExp(String.fromCharCode(0x153), 'g');
const OE_MAJ = new RegExp(String.fromCharCode(0x152), 'g');

/** "Djabala-Bé, l'Île" → "djabala be l ile". */
export function normaliser(s: string): string {
  return s
    .replace(OE, 'oe')
    .replace(OE_MAJ, 'Oe')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function motsDe(texte: string): Mot[] {
  const mots: Mot[] = [];
  for (const m of texte.matchAll(/[\p{L}\p{N}]+/gu)) {
    const n = normaliser(m[0]);
    if (n) mots.push({ n, debut: m.index ?? 0, fin: (m.index ?? 0) + m[0].length });
  }
  return mots;
}

function champ(cle: ChampCle, texte: string): Champ {
  return { cle, texte, mots: motsDe(texte), compact: normaliser(texte).replace(/ /g, '') };
}

export function construireIndex(d: PudiDonnees, propositions: readonly PropositionIndexable[] = []): IndexRecherche {
  const docs: DocRecherche[] = [];
  d.programmes.forEach((p, i) => {
    const secteur = d.secteurs.find((s) => s.id === p.secteur);
    const champs: Champ[] = [champ('nom', p.nom)];
    p.sites.forEach((s) => champs.push(champ('sites', s)));
    p.codes.forEach((c) => champs.push(champ('code', `${c.code} · ${c.libelle}`)));
    if (secteur) champs.push(champ('secteur', secteur.nom));
    champs.push(champ('resume', p.resume));
    p.codes.forEach((c) => c.libelleComplet && champs.push(champ('libelleComplet', `${c.code} · ${c.libelleComplet}`)));
    if (p.precision) champs.push(champ('precision', p.precision));
    docs.push({ type: 'programme', id: p.id, nom: p.nom, secteur: p.secteur, ordre: i, champs });
  });
  propositions.forEach((q, i) => {
    const champs: Champ[] = [champ('intitule', q.intitule)];
    if (q.lieu) champs.push(champ('lieu', q.lieu));
    if (q.precision) champs.push(champ('precision', q.precision));
    champs.push(champ('source', q.source));
    docs.push({ type: 'proposition', id: q.id, nom: q.intitule, ordre: 1000 + i, champs });
  });
  const lieux = d.fokontany
    .filter((f: Fokontany) => !f.champLibre && f.ceni)
    .map((f) => ({ nom: f.affichage, formes: [f.affichage, ...(f.variantesPUDi ?? [])] }));
  return { docs, synonymes: d.synonymes ?? [], lieux };
}

/** Excerpt of a long text around the first highlight, with the ranges moved accordingly. */
function extraire(texte: string, surlignes: [number, number][]): { texte: string; surlignes: [number, number][] } {
  if (texte.length <= EXTRAIT || !surlignes.length) return { texte, surlignes };
  let debut = Math.max(0, surlignes[0][0] - 30);
  if (debut > 0) {
    const espace = texte.lastIndexOf(' ', debut);
    debut = espace > 0 ? espace + 1 : debut;
  }
  let fin = Math.min(texte.length, debut + EXTRAIT);
  if (fin < texte.length) {
    const espace = texte.indexOf(' ', fin);
    fin = espace > 0 ? espace : texte.length;
  }
  const prefixe = debut > 0 ? '…' : '';
  const suffixe = fin < texte.length ? '…' : '';
  const decal = prefixe.length - debut;
  return {
    texte: prefixe + texte.slice(debut, fin) + suffixe,
    surlignes: surlignes.filter(([a, b]) => a >= debut && b <= fin).map(([a, b]) => [a + decal, b + decal])
  };
}

function surlignesDe(c: Champ, termes: string[]): [number, number][] {
  return c.mots.filter((m) => termes.some((t) => m.n.startsWith(t))).map((m) => [m.debut, m.fin]);
}

function evaluer(doc: DocRecherche, termes: string[], formesLieu: { forme: string; fokontany: string }[]): ResultatRecherche | null {
  // 1. Words: every term must be the prefix of a word of the project (any field).
  let score = 0;
  let toutes = termes.length > 0;
  for (const t of termes) {
    let meilleur = 0;
    for (const c of doc.champs) {
      const m = c.mots.find((w) => w.n.startsWith(t));
      if (m) meilleur = Math.max(meilleur, POIDS[c.cle] + (m.n === t ? 1 : 0));
    }
    if (!meilleur) {
      toutes = false;
      break;
    }
    score += meilleur;
  }
  if (toutes) {
    // The field that explains the match best: most terms, then heaviest field, then data order.
    let choix: Champ | null = null;
    let nbChoix = 0;
    for (const c of doc.champs) {
      const nb = termes.filter((t) => c.mots.some((w) => w.n.startsWith(t))).length;
      if (nb > nbChoix || (nb === nbChoix && choix && POIDS[c.cle] > POIDS[choix.cle])) {
        choix = c;
        nbChoix = nb;
      }
    }
    const c = choix as Champ;
    const ex = extraire(c.texte, surlignesDe(c, termes));
    return { type: doc.type, id: doc.id, nom: doc.nom, secteur: doc.secteur, score, explication: { champ: c.cle, ...ex } };
  }
  // 2. A fokontany named in the query: its PUDi spellings in the sites (or the place of a proposal).
  for (const { forme, fokontany } of formesLieu) {
    const c = doc.champs.find((x) => (x.cle === 'sites' || x.cle === 'lieu') && x.compact.includes(forme));
    if (c)
      return {
        type: doc.type,
        id: doc.id,
        nom: doc.nom,
        secteur: doc.secteur,
        score: POIDS[c.cle],
        explication: { champ: c.cle, texte: c.texte, surlignes: [[0, c.texte.length]], fokontany }
      };
  }
  return null;
}

export function rechercher(index: IndexRecherche, requete: string): ReponseRecherche {
  const q = normaliser(requete);
  if (!q) return { directs: [], autres: [], total: 0 };
  const termes = [...new Set(q.split(' '))];
  const compact = q.replace(/ /g, '');

  // Fokontany named (or begun, 4 letters or more) in the query.
  const formesLieu: { forme: string; fokontany: string }[] = [];
  for (const l of index.lieux) {
    const formes = l.formes.map((f) => normaliser(f).replace(/ /g, ''));
    if (formes.some((f) => f === compact || (compact.length >= 4 && f.startsWith(compact))))
      formes.forEach((forme) => formesLieu.push({ forme, fokontany: l.nom }));
  }

  const trouves = new Map<string, ResultatRecherche>();
  for (const doc of index.docs) {
    const r = evaluer(doc, termes, formesLieu);
    if (r) trouves.set(doc.id, r);
  }

  // Synonyms: whole word or phrase of the normalised query.
  const cibles: { id: string; mot: string }[] = [];
  const entoure = ` ${q} `;
  for (const s of index.synonymes) {
    const mot = s.mots.find((m) => {
      const n = normaliser(m);
      return n && entoure.includes(` ${n} `);
    });
    if (mot) s.cibles.forEach((id) => cibles.some((c) => c.id === id) || cibles.push({ id, mot }));
  }
  const directs: ResultatRecherche[] = [];
  for (const { id, mot } of cibles) {
    const doc = index.docs.find((x) => x.id === id);
    if (!doc) continue; // withdrawn proposal
    const r =
      trouves.get(id) ??
      ({
        type: doc.type,
        id: doc.id,
        nom: doc.nom,
        secteur: doc.secteur,
        score: 0,
        explication: { champ: 'synonyme', texte: mot, surlignes: [[0, mot.length]] }
      } satisfies ResultatRecherche);
    directs.push(r);
    trouves.delete(id);
  }

  const ordre = new Map(index.docs.map((x) => [x.id, x.ordre]));
  const autres = [...trouves.values()].sort((a, b) => b.score - a.score || (ordre.get(a.id) ?? 0) - (ordre.get(b.id) ?? 0));
  const total = directs.length + autres.length;
  return { directs, autres: autres.slice(0, Math.max(0, MAX_RESULTATS - directs.length)), total };
}

/** First results in display order (directs, then the others). */
export function premiers(r: ReponseRecherche, n = MAX_RESULTATS): string[] {
  return [...r.directs, ...r.autres].slice(0, n).map((x) => x.id);
}
