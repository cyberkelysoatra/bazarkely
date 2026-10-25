// Data of the synthesis (PDF and CSV), prepared from the aggregated results and the data file.
// Pure: no jsPDF here, so the content is unit tested and the PDF code only lays it out.
import type { PudiDonnees } from '../data/types';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { construireCsv, nettoyerTexteLibre } from './exports';
import { dateClotureLongue, dateCourte, dateJour, dateLongue } from './format';

/** Same shape as pudi_resultats() / pudi_admin_resultats_apercu() (subset used here). */
export interface ResultatsSynthese {
  /** PUDI-CC-19: false = reduced content (votes only, breakdowns already in %). */
  complet?: boolean;
  nb_votants?: number;
  cloture_at: string;
  calcule_at: string;
  priorites: {
    id: string;
    n?: number;
    pct?: number;
    voix?: number;
    votants?: number;
    pct_voix?: number;
    pct_votants?: number;
    concentration?: number;
    tranche_pudi?: number;
    /** PUDI-CC-18: in the top 15 by votes while the PUDi plans it after 2030. */
    ecart_pudi?: boolean;
  }[];
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
    n_priorite?: number;
    pct_priorite?: number;
    voix?: number;
    votants?: number;
    pct_voix?: number;
    pct_votants?: number;
    concentration?: number;
  }[];
  /** PUDI-CC-17: 12 votes per voter (see pudi_calculer_resultats). */
  voix_placees?: number;
  repartition?: Record<string, number>;
  concentration?: { votes: number; pct_votes: number; voix: number; pct_voix: number };
  nb_votes_convertis?: number;
  top_ecart?: number;
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
  voix: number;
  /** Voters: organisers only (null in the reduced content, PUDI-CC-19). */
  votants: number | null;
  pctVoix: string;
  pctVotants: string | null;
  concentration: number | null;
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
  /** PUDI-CC-18: « Avancé par les votants (PUDi : 2031-2035) », or empty. */
  ecart?: string;
  /** Ranking by votes (PUDI-CC-17): votes, distinct voters, shares, votes with 6 or more on it. */
  voix?: number;
  votants?: number;
  pctVoix?: string;
  pctVotants?: string;
  concentration?: number;
}

export interface LigneRepartition {
  libelle: string;
  /** Count (null in the reduced content: percentages only). */
  n: number | null;
  pct: string;
}

export interface Synthese {
  titre: string;
  provisoire: boolean;
  genereLe: string;
  pied: string;
  /** PUDI-CC-19: false = votes only (public without the switch): no voter count anywhere. */
  complet: boolean;
  nbVotants: number | null;
  ouverture: string;
  cloture: string;
  reseaux: { dans: number | null; hors: number | null; pctDans: string; pctHors: string };
  priorites: LigneClassement[];
  propositions: LigneProposition[];
  profils: LigneRepartition[];
  fokontany: LigneRepartition[];
  manquants: string[];
  methode: string[];
  /** PUDI-CC-20: null in the reduced content (the total bounds the number of voters). */
  voixPlacees: number | null;
  /** « 2 votes (8,3 %) ont placé 6 voix ou plus sur un seul programme. » */
  concentration: string;
  repartition: LigneRepartition[];
  nbVotesConvertis: number;
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

/** Verbatim sentence of PUDI-CC-18 on the rule change, followed by the converted votes kept as they are. */
export const CHANGEMENT_REGLE =
  "La règle a changé le 24/10/2026 à la demande des votants : 12 voix à répartir au lieu de 3 priorités, sans question séparée sur l'urgence. Les votes antérieurs ont été convertis en 4 voix sur chacun de leurs 3 programmes, sauf si leur auteur les a modifiés.";
export const texteVotesConvertis = (n: number) =>
  `Votes convertis en 4 voix sur chacun de leurs 3 programmes et gardés tels quels depuis : ${n}.`;

/** PUDI-CC-18: urgency is deduced from the votes (results page, CSV), stated in plain French. */
export const URGENCE_DEDUITE =
  "L'urgence n'est pas demandée à part : elle se déduit des voix. Plus un programme reçoit de voix, plus les votants le jugent prioritaire.";
/** PDF paragraph « Comment l'urgence est déterminée », placed before the ranking. */
export const TITRE_URGENCE = "Comment l'urgence est déterminée";
export const COMMENT_URGENCE =
  "Il n'y a pas de question séparée sur l'urgence. L'ordre du classement, établi par le nombre de voix reçues, indique les programmes que les votants veulent voir réalisés en premier. La colonne « Écart avec le PUDi » signale les programmes classés parmi les 15 premiers alors que le PUDi les prévoit en 2031-2035 ou 2036-2040 : les votants souhaitent les avancer.";
export const TITRE_CLASSEMENT = 'Classement des programmes par voix reçues (ordre de priorité)';
/** Flag of the « Écart avec le PUDi » column. */
export const texteEcart = (tranche: string) => `Avancé par les votants (PUDi : ${tranche})`;

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
  // PUDI-CC-19: reduced content (anyone but the organisers, unless the switch is on): votes only,
  // the breakdowns arrive as percentages and every voter count stays out of the synthesis.
  const complet = r.complet !== false;
  const ligne = (l: { id: string; n?: number; pct?: number; voix?: number; pct_voix?: number }, i: number): LigneClassement => ({
    rang: i + 1,
    id: l.id,
    nom: prog(l.id)?.nom ?? l.id,
    secteur: secteur(l.id),
    n: l.n ?? l.voix ?? 0,
    pct: pourcent(l.pct ?? l.pct_voix ?? 0)
  });
  const ligneVoix = (l: ResultatsSynthese['priorites'][number], i: number): LigneClassement => {
    const tranche = l.tranche_pudi ? TRANCHES[l.tranche_pudi - 1] : prog(l.id)?.trancheAffichee;
    return {
      ...ligne(l, i),
      tranche,
      ecart: l.ecart_pudi && tranche ? texteEcart(tranche) : '',
      voix: l.voix ?? l.n ?? 0,
      pctVoix: pourcent(l.pct_voix ?? l.pct ?? 0),
      ...(complet
        ? { votants: l.votants ?? l.n ?? 0, pctVotants: pourcent(l.pct_votants ?? l.pct ?? 0), concentration: l.concentration ?? 0 }
        : {})
    };
  };
  const conc = r.concentration ?? { votes: 0, pct_votes: 0, voix: 0, pct_voix: 0 };
  const nbConv = r.nb_votes_convertis ?? 0;
  const total = r.nb_votants ?? 0;
  const reseau = r.reseaux.dans_nos_reseaux + r.reseaux.hors_reseaux;
  /** Complete: count and share of the voters; reduced: the server already sends the share. */
  const repartie = (libelle: string, v: number): LigneRepartition =>
    complet ? { libelle, n: v, pct: part(v, total) } : { libelle, n: null, pct: pourcent(v) };
  const profils = Object.keys(fr.envoi.profils) as (keyof typeof fr.envoi.profils)[];
  const libelleFkt = (ceni: string) =>
    ceni === 'AUTRE' ? frPages.resultats.autreFokontany : d.fokontany.find((f) => f.ceni === ceni)?.affichage ?? ceni;
  return {
    titre: TITRE_SYNTHESE,
    provisoire: options.provisoire,
    genereLe: dateCourte((options.maintenant ?? new Date()).toISOString()),
    pied: fr.app.pied,
    complet,
    nbVotants: complet ? total : null,
    ouverture: texteOuverture(r.publie_at),
    cloture: dateClotureLongue(r.cloture_at),
    reseaux: complet
      ? {
          dans: r.reseaux.dans_nos_reseaux,
          hors: r.reseaux.hors_reseaux,
          pctDans: part(r.reseaux.dans_nos_reseaux, reseau),
          pctHors: part(r.reseaux.hors_reseaux, reseau)
        }
      : { dans: null, hors: null, pctDans: pourcent(r.reseaux.dans_nos_reseaux), pctHors: pourcent(r.reseaux.hors_reseaux) },
    priorites: r.priorites.map(ligneVoix),
    propositions: (r.propositions ?? []).map((q, i) => ({
      rang: i + 1,
      id: q.id,
      intitule: q.intitule,
      source: options.propositions?.find((x) => x.id === q.id)?.source ?? '',
      ajoutee: dateJour(q.ajoute_at),
      nPriorite: q.n_priorite ?? q.voix ?? 0,
      pctPriorite: pourcent(q.pct_priorite ?? q.pct_voix ?? 0),
      voix: q.voix ?? q.n_priorite ?? 0,
      votants: complet ? q.votants ?? q.n_priorite ?? 0 : null,
      pctVoix: pourcent(q.pct_voix ?? q.pct_priorite ?? 0),
      pctVotants: complet ? pourcent(q.pct_votants ?? q.pct_priorite ?? 0) : null,
      concentration: complet ? q.concentration ?? 0 : null,
      note: noteExposition(q.ajoute_at, r.publie_at, r.cloture_at)
    })),
    profils: profils.map((p) => repartie(fr.envoi.profils[p], r.par_profil[p] ?? 0)),
    fokontany: Object.entries(r.par_fokontany)
      .map(([k, n]) => [libelleFkt(k), n] as const)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
      .map(([libelle, n]) => repartie(libelle, n)),
    manquants: r.manquants.map((m) => nettoyerTexteLibre(m).replace(/\s+/g, ' ').trim()).filter(Boolean),
    methode: complet ? [...METHODE, CHANGEMENT_REGLE, texteVotesConvertis(nbConv)] : [...METHODE, CHANGEMENT_REGLE],
    voixPlacees: complet ? r.voix_placees ?? r.priorites.reduce((a, l) => a + (l.voix ?? l.n ?? 0), 0) : null,
    concentration: complet ? frPages.resultats.concentration(conc.votes, pourcent(conc.pct_votes)) : '',
    repartition: complet
      ? Array.from({ length: 12 }, (_, i) => repartie(frPages.resultats.repartitionLigne(i + 1), r.repartition?.[String(i + 1)] ?? 0))
      : [],
    nbVotesConvertis: complet ? nbConv : 0
  };
}

/** CSV of the synthesis: the ranking by votes, the proposals and the distributions (one section column). */
export function csvSynthese(s: Synthese): string {
  const lignes: (string | number | boolean | null)[][] = [];
  const vide = ['', '', '', '', ''];
  // PUDI-CC-18: first line under the header, in plain French: no separate urgency question.
  lignes.push(['note', '', '', URGENCE_DEDUITE, '', '', '', '', '', ...vide]);
  // PUDI-CC-17: ranking by votes; n / part = voters (as before), then votes, voters, shares, concentration.
  for (const l of s.priorites)
    lignes.push(['voix', l.rang, l.id, l.nom, l.secteur, l.n, l.pct, l.tranche ?? '', l.ecart ?? '', l.voix ?? l.n, l.votants ?? l.n, l.pctVoix ?? '', l.pctVotants ?? l.pct, l.concentration ?? 0]);
  for (const l of s.propositions)
    lignes.push(['proposition_hors_pic', l.rang, l.id, l.intitule, '', l.nPriorite, l.pctPriorite, '', '', l.voix, l.votants, l.pctVoix, l.pctVotants, l.concentration]);
  for (const l of s.repartition) lignes.push(['voix_utilisees', '', '', l.libelle, '', l.n, l.pct, '', '', ...vide]);
  lignes.push(['concentration', '', '', s.concentration, '', '', '', '', '', ...vide]);
  lignes.push(['votes_convertis_4_4_4', '', '', '', '', s.nbVotesConvertis, '', '', '', ...vide]);
  for (const l of s.profils) lignes.push(['profil', '', '', l.libelle, '', l.n, l.pct, '', '', ...vide]);
  for (const l of s.fokontany) lignes.push(['fokontany', '', '', l.libelle, '', l.n, l.pct, '', '', ...vide]);
  lignes.push(['reseaux', '', '', frPages.resultats.dansReseaux, '', s.reseaux.dans, s.reseaux.pctDans, '', '', ...vide]);
  lignes.push(['reseaux', '', '', frPages.resultats.horsReseaux, '', s.reseaux.hors, s.reseaux.pctHors, '', '', ...vide]);
  return construireCsv(
    ['section', 'rang', 'id', 'libelle', 'secteur', 'n', 'part', 'tranche_pudi', 'ecart_avec_le_pudi', 'voix', 'votants', 'pct_voix', 'pct_votants', 'concentration'],
    lignes
  );
}
