// Data of the synthesis (PDF and CSV), prepared from the aggregated results and the data file.
// Pure: no jsPDF here, so the content is unit tested and the PDF code only lays it out.
import type { PudiDonnees } from '../data/types';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { construireCsv, nettoyerTexteLibre } from './exports';
import { dateClotureLongue, dateCourte, dateJour, dateLongue } from './format';

/** Same shape as pudi_resultats() / pudi_admin_resultats_apercu() (subset used here). */
export interface ResultatsSynthese {
  nb_votants: number;
  cloture_at: string;
  calcule_at: string;
  priorites: { id: string; n: number; pct: number }[];
  urgents: { id: string; n: number; pct: number; tranche_pudi?: number; ecart?: boolean }[];
  par_profil: Record<string, number>;
  par_fokontany: Record<string, number>;
  reseaux: { dans_nos_reseaux: number; hors_reseaux: number };
  manquants: string[];
  /** Time of the first publication (null while not published). */
  publie_at?: string | null;
  /** Proposals outside the PUDi list, counted apart. */
  propositions?: {
    id: string;
    intitule: string;
    ajoute_at: string;
    n_priorite: number;
    pct_priorite: number;
    n_urgent: number;
    pct_urgent: number;
  }[];
}

/** Public data of a proposal used by the synthesis (source). */
export interface PropositionSynthese {
  id: string;
  source: string;
}

export interface LigneProposition {
  rang: number;
  id: string;
  intitule: string;
  source: string;
  ajoutee: string;
  nPriorite: number;
  pctPriorite: string;
  nUrgent: number;
  pctUrgent: string;
  /** « Ajoutée le 24 octobre 2026 : exposée 2 jours sur 4 » for a late proposal. */
  note?: string;
}

export interface LigneClassement {
  rang: number;
  id: string;
  nom: string;
  secteur: string;
  n: number;
  pct: string;
  tranche?: string;
  ecart?: boolean;
}

export interface LigneRepartition {
  libelle: string;
  n: number;
  pct: string;
}

export interface Synthese {
  titre: string;
  provisoire: boolean;
  genereLe: string;
  pied: string;
  nbVotants: number;
  ouverture: string;
  cloture: string;
  reseaux: { dans: number; hors: number; pctDans: string; pctHors: string };
  priorites: LigneClassement[];
  urgents: LigneClassement[];
  propositions: LigneProposition[];
  profils: LigneRepartition[];
  fokontany: LigneRepartition[];
  manquants: string[];
  methode: string[];
}

export const TITRE_SYNTHESE = 'Priorisation du PUDi de Nosy Be 2026-2040, synthèse de la consultation';
export const MENTION_PROVISOIRE = 'PROVISOIRE, consultation en cours';
export const NON_PUBLIEE = 'Consultation non encore publiée';
const JOUR_MS = 86400000;
const TRANCHES = ['2026-2030', '2031-2035', '2036-2040'];

export const METHODE = [
  'Consultation indicative des parties prenantes du PIC3 : elle éclaire la priorisation du PUDi sans la remplacer.',
  "Un vote par compte Google : ce n'est pas la garantie d'un vote par personne.",
  'La résidence à Nosy Be est déclarée par la personne qui vote, sans vérification.',
  'Le numéro de téléphone est comparé, sous forme codée, aux listes de contacts fournies par les partenaires ; il n’est jamais publié ni enregistré en clair.',
  'Les votes masqués par les organisateurs sont exclus des résultats ; chaque masquage et son motif figurent dans le journal des actions.',
  "Les résultats ne sont pas représentatifs de l'ensemble de la population de Nosy Be.",
  'Les propositions sont des demandes des parties prenantes absentes de la liste retenue dans le PUDi ; elles sont comptées à part et certaines ont été exposées moins longtemps que les programmes.'
];

/** Opening of the consultation from publie_at: « jeudi 22 octobre 2026 à 9 h 14 », or not published yet. */
export function texteOuverture(publieAt: string | null | undefined): string {
  return publieAt ? dateLongue(publieAt) : NON_PUBLIEE;
}

/**
 * Note of a proposal added more than 24 h after the publication: « Ajoutée le <date> : exposée
 * <x> jours sur <y> » (x = days from its addition to the closing, y = days from the publication
 * to the closing, rounded). Undefined otherwise (or before the publication).
 */
export function noteExposition(ajouteAt: string, publieAt: string | null | undefined, clotureAt: string): string | undefined {
  if (!publieAt) return undefined;
  const ajout = Date.parse(ajouteAt);
  const pub = Date.parse(publieAt);
  const fin = Date.parse(clotureAt);
  if (!(ajout - pub > JOUR_MS)) return undefined;
  const x = Math.max(0, Math.round((fin - ajout) / JOUR_MS));
  const y = Math.max(0, Math.round((fin - pub) / JOUR_MS));
  return `Ajoutée le ${dateJour(ajouteAt)} : exposée ${x} jour${x > 1 ? 's' : ''} sur ${y}`;
}

/** 12.5 → "12,5 %" */
export function pourcent(v: number): string {
  return `${String(Math.round(v * 10) / 10).replace('.', ',')} %`;
}

const part = (n: number, total: number) => pourcent(total ? (100 * n) / total : 0);

export function preparerSynthese(
  r: ResultatsSynthese,
  d: PudiDonnees,
  options: { provisoire: boolean; maintenant?: Date; propositions?: readonly PropositionSynthese[] }
): Synthese {
  const prog = (id: string) => d.programmes.find((p) => p.id === id);
  const secteur = (id: string) => d.secteurs.find((s) => s.id === prog(id)?.secteur)?.nom ?? '';
  const ligne = (l: { id: string; n: number; pct: number }, i: number): LigneClassement => ({
    rang: i + 1,
    id: l.id,
    nom: prog(l.id)?.nom ?? l.id,
    secteur: secteur(l.id),
    n: l.n,
    pct: pourcent(l.pct)
  });
  const total = r.nb_votants;
  const reseau = r.reseaux.dans_nos_reseaux + r.reseaux.hors_reseaux;
  const profils = Object.keys(fr.envoi.profils) as (keyof typeof fr.envoi.profils)[];
  const libelleFkt = (ceni: string) =>
    ceni === 'AUTRE' ? frPages.resultats.autreFokontany : d.fokontany.find((f) => f.ceni === ceni)?.affichage ?? ceni;
  return {
    titre: TITRE_SYNTHESE,
    provisoire: options.provisoire,
    genereLe: dateCourte((options.maintenant ?? new Date()).toISOString()),
    pied: fr.app.pied,
    nbVotants: total,
    ouverture: texteOuverture(r.publie_at),
    cloture: dateClotureLongue(r.cloture_at),
    reseaux: {
      dans: r.reseaux.dans_nos_reseaux,
      hors: r.reseaux.hors_reseaux,
      pctDans: part(r.reseaux.dans_nos_reseaux, reseau),
      pctHors: part(r.reseaux.hors_reseaux, reseau)
    },
    priorites: r.priorites.map(ligne),
    urgents: r.urgents.map((l, i) => ({
      ...ligne(l, i),
      tranche: l.tranche_pudi ? TRANCHES[l.tranche_pudi - 1] : prog(l.id)?.trancheAffichee,
      ecart: !!l.ecart
    })),
    propositions: (r.propositions ?? []).map((q, i) => ({
      rang: i + 1,
      id: q.id,
      intitule: q.intitule,
      source: options.propositions?.find((x) => x.id === q.id)?.source ?? '',
      ajoutee: dateJour(q.ajoute_at),
      nPriorite: q.n_priorite,
      pctPriorite: pourcent(q.pct_priorite),
      nUrgent: q.n_urgent,
      pctUrgent: pourcent(q.pct_urgent),
      note: noteExposition(q.ajoute_at, r.publie_at, r.cloture_at)
    })),
    profils: profils.map((p) => ({ libelle: fr.envoi.profils[p], n: r.par_profil[p] ?? 0, pct: part(r.par_profil[p] ?? 0, total) })),
    fokontany: Object.entries(r.par_fokontany)
      .map(([k, n]) => ({ libelle: libelleFkt(k), n, pct: part(n, total) }))
      .sort((a, b) => b.n - a.n || a.libelle.localeCompare(b.libelle, 'fr')),
    manquants: r.manquants.map((m) => nettoyerTexteLibre(m).replace(/\s+/g, ' ').trim()).filter(Boolean),
    methode: METHODE
  };
}

/** CSV of the synthesis: the two rankings and the distributions (one section column). */
export function csvSynthese(s: Synthese): string {
  const lignes: (string | number | boolean | null)[][] = [];
  for (const l of s.priorites) lignes.push(['priorite_absolue', l.rang, l.id, l.nom, l.secteur, l.n, l.pct, '', '']);
  for (const l of s.urgents) lignes.push(['urgent_2026_2030', l.rang, l.id, l.nom, l.secteur, l.n, l.pct, l.tranche ?? '', !!l.ecart]);
  for (const l of s.propositions)
    lignes.push(['proposition_hors_pic', l.rang, l.id, l.intitule, '', l.nPriorite, l.pctPriorite, '', '']);
  for (const l of s.profils) lignes.push(['profil', '', '', l.libelle, '', l.n, l.pct, '', '']);
  for (const l of s.fokontany) lignes.push(['fokontany', '', '', l.libelle, '', l.n, l.pct, '', '']);
  lignes.push(['reseaux', '', '', frPages.resultats.dansReseaux, '', s.reseaux.dans, s.reseaux.pctDans, '', '']);
  lignes.push(['reseaux', '', '', frPages.resultats.horsReseaux, '', s.reseaux.hors, s.reseaux.pctHors, '', '']);
  return construireCsv(['section', 'rang', 'id', 'libelle', 'secteur', 'n', 'part', 'tranche_pudi', 'ecart_avec_le_pudi'], lignes);
}
