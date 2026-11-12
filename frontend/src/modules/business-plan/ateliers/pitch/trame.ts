// Frame of the two-minute pitch (step 9c, slide 38): 5 parts built from the participant's summary as
// keywords (12 words at most per part). A part the participant edited keeps his own keywords. Pure
// functions, no React here.
import type { Plan, Pitch, TempsPitch } from '../../types';
import { pitchDe } from '../../etat/vide';
import { calculer } from '../../utils/chiffres';
import { ESPACE, grouper, pluriel } from '../../utils/format';
import { brouillon, chiffresCles, nettoyer, type CleCarte } from '../synthese/brouillons';
import { PREMIERE_ANNEE, totaux } from '../impact/regles';
import { calculerMarche } from '../m3/calculs';

export const MAX_MOTS = 12;
/** Total length of the pitch and the 1 min 45 signal, in seconds. */
export const DUREE_TOTALE = 120;
export const SIGNAL = 105;
export const MARGE = 10;

export const TEMPS: { cle: TempsPitch; n: number; titre: string; duree: number }[] = [
  { cle: 'probleme', n: 1, titre: 'Le problème et pour qui', duree: 20 },
  { cle: 'solution', n: 2, titre: 'Ma solution et pourquoi elle est meilleure', duree: 25 },
  { cle: 'marche', n: 3, titre: 'Mon marché et mes concurrents', duree: 20 },
  { cle: 'chiffres', n: 4, titre: 'Mes chiffres', duree: 25 },
  { cle: 'demande', n: 5, titre: 'Ma demande et ma prochaine étape', duree: 20 }
];

/** Words of a keyword line: a number ("45 000", "7,8") counts as one word, ";" as none.
 *  (\s also matches the no-break and narrow no-break spaces of the amounts.) */
export function compterMots(t: string): number {
  return t
    .replace(/(\d)[,.](?=\d)/g, '$1')
    .replace(/(\d)\s(?=\d{3}(?!\d))/g, '$1')
    .split(/[\s;,:.!?]+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** First `max` words of a keyword line, separators kept. */
export function couperMots(t: string, max = MAX_MOTS): string {
  const morceaux = t.split(/( +|\t|\r?\n)/);
  let n = 0;
  let out = '';
  for (const m of morceaux) {
    if (/^( +|\t|\r?\n)$/.test(m)) {
      out += m;
      continue;
    }
    const mots = compterMots(m);
    if (n + mots > max) break;
    n += mots;
    out += m;
  }
  return out.trim().replace(/[\s;,:]+$/, '');
}

// Small words left out of keywords (negations and "par" are kept: "n'ont pas", "par mois").
const VIDES = new Set(
  'le la les un une des de du et à au aux en pour avec dans sur qui que est sont ce cet cette ces son sa ses leur leurs mon ma mes notre nos votre vos il elle ils elles on y très aussi soit donc car'.split(' ')
);

/** Digit groups glued with narrow no-break spaces: "45 000 Ar" stays one keyword. */
function collerNombres(t: string): string {
  return t.replace(/(\d)\s(?=\d{3}(?!\d))/g, `$1${ESPACE}`).replace(/(\d)\s(?=(Ar|%)(?![\p{L}]))/gu, `$1${ESPACE}`);
}

/** A clause shortened to keywords: elisions, small words and `retirer` removed, at most `max` words. */
export function motsCles(clause: string, max = 7, retirer: string[] = []): string {
  let t = collerNombres(nettoyer(clause)).replace(/(^|[\s(])(l|d|qu|j|s|c)['’]/gi, '$1');
  for (const r of retirer) if (r.trim()) t = t.split(r.trim()).join(' ');
  const mots = t.split(/ +/).filter((w) => w && !VIDES.has(w.toLowerCase()) && !/^[,;:]+$/.test(w));
  let k = mots.slice(0, max).join(' ');
  // A cut inside brackets: keep what comes before the bracket.
  if ((k.match(/\(/g) ?? []).length > (k.match(/\)/g) ?? []).length) k = k.slice(0, k.lastIndexOf('('));
  return k.replace(/^[,;:\s]+|[,;:\s]+$/g, '');
}

/** Clauses of a summary card: sentences, then commas; the label before " : " is dropped when short. */
function clauses(texte: string): string[] {
  return collerNombres(texte)
    .replace(/[\u2014\u2013\u00b7]/g, ',')
    .split(/[.;!?]+(?:\s|$)|,\s+/)
    .map((c) => {
      const i = c.indexOf(' : ');
      return i >= 0 && compterMots(c.slice(0, i)) <= 5 ? c.slice(i + 3) : c;
    })
    .map((c) => c.trim())
    .filter(Boolean);
}

/** Keywords of several clauses joined with " ; " (priority clauses first), 12 words at most.
 *  A clause is only started when at least 4 words are left: no stray fragment at the end. */
function assembler(liste: string[], priorites: RegExp[] = [], parClause = 7, retirer: string[] = []): string {
  const rang = (c: string) => {
    const i = priorites.findIndex((p) => p.test(c));
    return i < 0 ? priorites.length : i;
  };
  const triees = liste.map((c, i) => ({ c, i })).sort((a, b) => rang(a.c) - rang(b.c) || a.i - b.i);
  const parts: string[] = [];
  let n = 0;
  for (const { c } of triees) {
    const reste = MAX_MOTS - n;
    if (reste < 4) break;
    const k = motsCles(c, Math.min(parClause, reste), retirer);
    if (!k || parts.includes(k)) continue;
    parts.push(k);
    n += compterMots(k);
  }
  return couperMots(parts.join(' ; '));
}

/** Items with a long and a short wording: shortened from the last one, then dropped, until 12 words. */
function ajuster(items: string[][]): string {
  const choix = items.filter((v) => v.length).map((v) => ({ v, i: 0 }));
  const texte = () => choix.map((c) => c.v[c.i]).join(' ; ');
  for (let k = choix.length - 1; k >= 0 && compterMots(texte()) > MAX_MOTS; k--) choix[k].i = choix[k].v.length - 1;
  while (choix.length > 1 && compterMots(texte()) > MAX_MOTS) choix.pop();
  return couperMots(texte());
}

/** Text of a summary card: what the participant wrote, else the draft built from his modules. */
function carte(plan: Plan, cle: CleCarte): string {
  return plan.synthese[cle].trim() || brouillon(plan, cle);
}

/** 7 830 000 -> "7,8 millions"; 450 000 -> "450 000 Ar". */
export function court(n: number): string {
  if (Math.abs(n) >= 1_000_000) {
    const m = Math.round(n / 100_000) / 10;
    return `${String(m).replace('.', ',')} million${Math.abs(m) >= 2 ? 's' : ''}`;
  }
  return `${grouper(n)}${ESPACE}Ar`;
}

const DEMARCHES: Record<string, string> = { statuts: 'statuts', nif: 'NIF', stat: 'STAT', rcs: 'registre du commerce', carteFiscale: 'carte fiscale', compte: 'compte pro', cnaps: 'CNaPS' };
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function moisAnnee(iso: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  return m ? `${MOIS[Number(m[2]) - 1] ?? ''} ${m[1]}`.trim() : '';
}

/** "bouteille de 50 cl" -> "bouteilles" (first word of the plural only). */
const uniteCourte = (plan: Plan) => pluriel(plan.uniteVente, 2).split(' ')[0].replace(/[(),;:]+$/, '');

function marche(plan: Plan): string {
  const r = calculerMarche(plan.m3);
  const u = uniteCourte(plan);
  const noms = plan.m3.concurrents.map((c) => nettoyer(c.nom)).filter(Boolean);
  const items = [
    r.potentielMois !== null ? [`${grouper(r.potentielMois)} ${u} par mois`, `marché ${grouper(r.potentielMois)} ${u}`] : [],
    r.ventesMois !== null ? [`je vise ${grouper(r.ventesMois)}`] : [],
    noms.length ? [noms.join(', '), noms.slice(0, 2).join(', '), noms[0]] : []
  ];
  if (!items.some((v) => v.length)) return assembler(clauses(carte(plan, 'marche')), [/potentiel/i, /part visée|soit/i, /concurrent/i], 5);
  return ajuster(items);
}

function chiffres(plan: Plan): string {
  const k = chiffresCles(plan);
  const c = calculer(plan);
  const a1 = c.annees[0];
  const u = uniteCourte(plan);
  const items = [
    k.besoinTotal !== null ? [`${court(k.besoinTotal)} pour démarrer`, court(k.besoinTotal)] : [],
    k.seuilMois !== null ? [`seuil ${grouper(k.seuilMois)} ${u} par mois`, `seuil ${grouper(k.seuilMois)} ${u}`] : [],
    a1 && c.prix !== null ? [`résultat année 1 : ${court(a1.resultat)}`] : []
  ];
  if (!items.some((v) => v.length)) return assembler(clauses(carte(plan, 'chiffres')));
  return ajuster(items);
}

function demande(plan: Plan): string {
  const k = chiffresCles(plan);
  const autre = nettoyer(plan.m5.ressources.autreLibelle) || 'autre ressource';
  const emplois = plan.impact ? totaux(plan.impact) : null;
  const etape = plan.m4.demarches.find((d) => !d.fait && d.datePrevue);
  const objectif = plan.m4.calendrier.map((x) => x.objectif.trim()).find(Boolean);
  const nb = (n: number) => `${n} emploi${n > 1 ? 's' : ''}`;
  const items = [
    k.subvention ? [`${court(k.subvention)} de subvention`, `subvention ${court(k.subvention)}`] : [],
    k.pret ? [`${court(k.pret)} de prêt`, `prêt ${court(k.pret)}`] : [],
    k.autre ? [`${court(k.autre)} ${autre}`] : [],
    emplois && emplois[0] > 0 ? [`${nb(emplois[0])}${emplois[2] > emplois[0] ? `, ${emplois[2]} en ${PREMIERE_ANNEE + 2}` : ''}`, nb(emplois[0])] : [],
    etape ? [`${DEMARCHES[etape.id] ?? etape.id} en ${moisAnnee(etape.datePrevue)}`.trim()] : objectif ? [motsCles(objectif, 4)] : []
  ];
  if (!items.some((v) => v.length)) return assembler(clauses(carte(plan, 'equipeDemande')), [/demande/i]);
  return ajuster(items);
}

/** Keywords built from the summary for one part (never what the participant typed). */
export function motsProposes(plan: Plan, cle: TempsPitch): string {
  let t = '';
  if (cle === 'probleme') {
    // Card 1 typed by the participant, else its two main answers: the problem, then for whom.
    const m1 = plan.m1;
    const liste = plan.synthese.probleme.trim() ? clauses(plan.synthese.probleme) : [m1.probleme, m1.client.qui].map(nettoyer).filter(Boolean);
    t = assembler(liste.length ? liste : clauses(carte(plan, 'probleme')));
  } else if (cle === 'solution') {
    const nom = nettoyer(plan.identite.nomProjet);
    t = assembler(clauses(carte(plan, 'solution')), [/propose/i, /contrairement|alors que|mieux que/i], 7, nom ? [nom, ' propose '] : [' propose ']);
  } else if (cle === 'marche') t = marche(plan);
  else if (cle === 'chiffres') t = chiffres(plan);
  else t = demande(plan);
  return t.replace(/[\u2014\u2013\u00b7]/g, ',');
}

/** The keywords shown for a part: typed by the participant, else proposed from his summary. */
export function motsDuTemps(plan: Plan, cle: TempsPitch, pitch: Pitch = pitchDe(plan)): string {
  const saisi = pitch.motsCles[cle];
  return typeof saisi === 'string' ? saisi : motsProposes(plan, cle);
}

/** The 5 parts with their keywords. */
export function trame(plan: Plan): { cle: TempsPitch; n: number; titre: string; duree: number; mots: string; modifie: boolean }[] {
  const p = pitchDe(plan);
  return TEMPS.map((t) => ({ ...t, mots: motsDuTemps(plan, t.cle, p), modifie: typeof p.motsCles[t.cle] === 'string' }));
}

/** Parts of a rehearsal: the whole pitch, or the short pieces of the "Bases" level (10.3). */
export const MODES = {
  complet: { titre: 'Le tout', parties: [0, 1, 2, 3, 4], duree: DUREE_TOTALE },
  morceau1: { titre: 'Morceau 1 : le problème seul', parties: [0], duree: 20 },
  morceau2: { titre: 'Morceau 2 : le problème et la solution', parties: [0, 1], duree: 50 }
} as const;

/** "2 min 10 s", "45 s". */
export function duree(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m ? `${m} min${r ? ` ${r} s` : ''}` : `${r} s`;
}

/** "1:45" for the running clock. */
export function horloge(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Index (in the attempt) of the part where the most time was spent. */
export function partieLaPlusLongue(partiesMs: number[]): number {
  let i = 0;
  partiesMs.forEach((v, k) => {
    if (v > partiesMs[i]) i = k;
  });
  return i;
}
