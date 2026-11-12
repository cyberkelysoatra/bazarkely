// "Ma mission de terrain" (fiche ETAPE-07): comprehension loop M1, the mission sheet built from the plan,
// the 40 min countdown, the suggestion of 7b, the updates of 7c and the rule checks V1 to V7. No React here.
import type { Mission, Plan } from '../../types';
import { missionDe } from '../../etat/vide';
import type { DonneesBoucle } from '../../composants/BoucleComprehension';
import { aujourdhuiMadagascar, jourFr } from '../m2/blocs';
import { grouper } from '../../utils/format';

type Entretien = Mission['entretiens'][number];

export const DUREE_MISSION_MS = 40 * 60 * 1000;
export const RAPPEL_MS = 10 * 60 * 1000;
export const MIN_ENTRETIENS = 3;

export const BOUCLE_M1: DonneesBoucle = {
  questions: [
    {
      enonce: 'Coche toutes les bonnes questions à poser à un client.',
      cases: [
        { texte: "Comment fais-tu aujourd'hui pour avoir des jus à servir ?", juste: true, code: 'Q' },
        { texte: 'Combien as-tu payé la dernière fois ?', juste: true, code: 'Q' },
        { texte: 'Est-ce que tu achèterais mon jus ?', juste: false, code: 'H' },
        { texte: 'Mon jus est délicieux, non ?', juste: false, code: 'O' },
        { texte: 'Tu paierais 3 000 Ar la bouteille ?', juste: false, code: 'H' }
      ]
    }
  ],
  ordre: ['H', 'O', 'Q'],
  explications: {
    H: 'Sur l\'avenir, les gens répondent "oui" pour te faire plaisir, puis n\'achètent pas. Demande ce qu\'ils font déjà et ce qu\'ils ont déjà payé : ça, c\'est vrai.',
    O: "Si ta question contient la réponse que tu espères, tu n'apprends rien. Ne parle pas de ton produit : fais parler le client de son problème.",
    Q: 'Tu as écarté une bonne question. Celles qui marchent parlent du passé et de ce qui se passe aujourd\'hui.'
  }
};

/** V4: a phone number (9 digits or more, or "+261") in an entry about the person interviewed. */
export function contientNumero(texte: string): boolean {
  return /\+\s*261|(?:\d[\s.\-/]?){9,}/.test(texte);
}

export const MESSAGE_NUMERO = 'Pas de numéro de la personne interrogée.';

const lignes = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/^[-\d.)\s]+/, '').trim())
    .filter(Boolean);

/** First name: the words that are not the family name written in capitals ("RAKOTO Jean" -> "Jean"). */
function prenom(nomPrenom: string): string {
  const mots = nomPrenom.trim().split(/\s+/).filter(Boolean);
  const autres = mots.filter((m) => m !== m.toUpperCase() || !/[A-Z]/i.test(m));
  return (autres.length && autres.length < mots.length ? autres.join(' ') : mots[0]) || '[prénom]';
}

/** Items cleaned, capitalised, each one once (case ignored). */
function sansDoublon(items: string[]): string[] {
  const vus = new Map<string, string>();
  for (const brut of items) {
    const x = brut.replace(/^[-\d.)\s]+/, '').replace(/[.!]+$/, '').trim();
    if (x && !vus.has(x.toLowerCase())) vus.set(x.toLowerCase(), x[0].toUpperCase() + x.slice(1));
  }
  return [...vus.values()];
}

const minuscule =(s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

/** The mission sheet built by the app from modules 1 to 5 (each part stays editable). */
export function feuilleProposee(plan: Plan): Pick<Mission, 'questions' | 'clientsAInterroger' | 'prixARelever' | 'elementsUnite' | 'chargesADemander' | 'presentation'> {
  const besoin = minuscule(plan.m1.pv.qui.trim() || plan.m1.probleme.trim().replace(/[.!]+$/, '')) || '[ton besoin]';
  const c = plan.m1.client;
  const projet = minuscule(plan.identite.unePhrase.trim().replace(/[.!]+$/, '')) || plan.identite.nomProjet.trim() || '[projet en quelques mots]';
  return {
    questions: [
      `1. Comment fais-tu aujourd'hui pour ce besoin ? (ton besoin : ${besoin})`,
      '2. Combien ça te coûte, par semaine ou par mois ?',
      "3. Qu'est-ce qui t'embête le plus dans cette façon de faire ?",
      "4. La dernière fois que c'est arrivé, qu'as-tu fait ?"
    ].join('\n'),
    clientsAInterroger: [c.qui.trim(), c.ou.trim() ? `Où : ${c.ou.trim()}` : ''].filter(Boolean).join('\n'),
    prixARelever: plan.m3.concurrents
      .filter((x) => x.nom.trim() && !x.prix.trim())
      .map((x) => x.nom.trim())
      .join('\n'),
    elementsUnite: plan.m5.couts
      .map((l) => l.libelle.trim())
      .filter(Boolean)
      .join('\n'),
    chargesADemander: sansDoublon(['Loyer', 'Électricité', 'Téléphone', ...plan.m2.couts.split(/[\n,;]+/)]).join('\n'),
    presentation: `Bonjour, je suis ${prenom(plan.identite.nomPrenom)}, je prépare un projet de ${projet}. Est-ce que je peux vous poser 3 questions, ça prend 3 minutes ?`
  };
}

/** Remaining time of the countdown in ms (null = not started). Computed from the stored start time. */
export function restant(debut: string | null, maintenant = Date.now()): number | null {
  if (!debut) return null;
  const t = Date.parse(debut);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, DUREE_MISSION_MS - (maintenant - t));
}

export function minutesSecondes(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const entretienFait = (e: Entretien) => [e.typeClient, e.aujourdhui, e.embete, e.phrase].some((x) => x.trim()) || e.paie !== null;

export function nbEntretiens(plan: Plan): number {
  return missionDe(plan).entretiens.filter(entretienFait).length;
}

export function nbPrix(plan: Plan): number {
  return plan.prix.filter((l) => l.element.trim() && l.prix !== null).length;
}

/** Prices to note: competitors without a price and the elements of one sale unit. */
export function nbPrixVises(plan: Plan): number {
  const m = missionDe(plan);
  return Math.max(1, lignes(m.prixARelever).length + lignes(m.elementsUnite).length);
}

/** Elements of one sale unit without a price in "Mes prix relevés" (V5). */
export function elementsSansPrix(plan: Plan): string[] {
  const connus = plan.prix.filter((l) => l.prix !== null).map((l) => l.element.trim().toLowerCase()).filter(Boolean);
  return lignes(missionDe(plan).elementsUnite).filter((el) => {
    const e = el.toLowerCase();
    return !connus.some((c) => c.includes(e) || e.includes(c));
  });
}

const prixPrevu = (plan: Plan) => plan.m3.prixPrevu ?? plan.m5.prixVente;

/** 7b: the box suggested by the rules of the fiche (null = no suggestion yet). */
export function suggestion(plan: Plan): Mission['decision'] | null {
  const es = missionDe(plan).entretiens.filter(entretienFait);
  const n = es.length;
  if (n < 1) return null;
  const seuil = Math.ceil((2 * n) / 3);
  if (es.filter((e) => e.probleme === 'non').length >= seuil) return 'changer';
  const payes = es.map((e) => e.paie).filter((x): x is number => typeof x === 'number' && x > 0);
  const prix = prixPrevu(plan);
  const mieuxVide = plan.m3.concurrents.every((c) => !c.mieux.trim());
  if (payes.length && typeof prix === 'number' && prix > 0 && Math.max(...payes) < prix / 2 && mieuxVide) return 'ajuster';
  if (es.filter((e) => e.probleme === 'oui' && typeof e.paie === 'number' && e.paie > 0).length >= seuil) return 'continuer';
  return null;
}

export const DECISIONS: { v: Exclude<Mission['decision'], ''>; t: string; detail: string }[] = [
  { v: 'continuer', t: 'Je continue', detail: 'Le problème et le prix sont confirmés.' },
  { v: 'ajuster', t: "J'ajuste", detail: "Même projet, mais je change le client, le prix ou l'offre." },
  { v: 'changer', t: "Je change d'angle", detail: "Le problème n'existe pas pour ces clients, ou ils ne paient rien aujourd'hui." }
];

/** Pages to revisit after the decision, the first one first. */
export function pagesARevoir(decision: Mission['decision']): { chemin: string; titre: string; pourquoi: string }[] {
  if (decision === 'ajuster')
    return [
      { chemin: 'm1', titre: 'Module 1', pourquoi: 'Mon client cible et ma proposition de valeur' },
      { chemin: 'm3', titre: 'Module 3', pourquoi: 'Mon prix et mes concurrents' },
      { chemin: 'm4', titre: 'Module 4', pourquoi: 'Mes 4 P : produit, prix, place, promotion' },
      { chemin: 'm2', titre: 'Module 2', pourquoi: 'Mon canvas : clients, canaux, revenus' }
    ];
  if (decision === 'changer')
    return [
      { chemin: 'm1', titre: 'Module 1', pourquoi: 'Le problème, le client, la proposition de valeur' },
      { chemin: 'm2', titre: 'Module 2', pourquoi: 'Mon canvas' },
      { chemin: 'm3', titre: 'Module 3', pourquoi: 'Mon marché et mes concurrents' },
      { chemin: 'm4', titre: 'Module 4', pourquoi: 'Ma stratégie commerciale et mon équipe' }
    ];
  return [];
}

/** Mean of the prices paid today, in ariary (null = none noted). */
export function paieMoyen(plan: Plan): number | null {
  const p = missionDe(plan)
    .entretiens.map((e) => e.paie)
    .filter((x): x is number => typeof x === 'number');
  return p.length ? Math.round(p.reduce((a, b) => a + b, 0) / p.length) : null;
}

/** First number of a text ("De 60 000 à 120 000 Ar" -> 60000). */
export function premierNombre(texte: string): number | null {
  const m = /\d[\d\s.]*/.exec(texte);
  if (!m) return null;
  const n = Number(m[0].replace(/[\s.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export interface Report {
  cle: string;
  titre: string;
  texte: string;
  /** Applies the update (mutable recipe); absent = the person does it on the page given by `chemin`. */
  appliquer?: (p: Plan) => void;
  chemin?: string;
}

const ajouterLigne = (avant: string, ligne: string) => (avant.trim() ? `${avant.trimEnd()}\n${ligne}` : ligne);

/** 7c: one proposed update per thing brought back from the mission. */
export function reports(plan: Plan): Report[] {
  const m = missionDe(plan);
  const es = m.entretiens.filter(entretienFait);
  const iso = aujourdhuiMadagascar();
  const jour = jourFr(iso) || iso;
  const out: Report[] = [];
  const payes = es.map((e) => e.paie).filter((x): x is number => typeof x === 'number');
  const fourchette = payes.length
    ? Math.min(...payes) === Math.max(...payes)
      ? `${grouper(payes[0])} Ar`
      : `de ${grouper(Math.min(...payes))} à ${grouper(Math.max(...payes))} Ar`
    : '';
  if (payes.length) {
    const texte = `Mission du ${jour} : ${es.length} clients interrogés, ils paient ${fourchette} (je l'ai demandé).`;
    out.push({ cle: 'paie', titre: 'Ce que paie le client, combien ils sont (module 1, 1b)', texte, appliquer: (p) => void (p.m1.client.prixAujourdhui = ajouterLigne(p.m1.client.prixAujourdhui, texte)) });
  }
  const faits = es.map((e) => e.aujourdhui.trim()).filter(Boolean);
  if (faits.length) {
    const texte = `Mission du ${jour} (je l'ai demandé) : ${faits.join(' ; ')}.`;
    out.push({ cle: 'aujourdhui', titre: "Ce que le client fait aujourd'hui (module 1, 1b)", texte, appliquer: (p) => void (p.m1.client.aujourdhui = ajouterLigne(p.m1.client.aujourdhui, texte)) });
  }
  const types = [...new Set(es.map((e) => e.typeClient.trim()).filter(Boolean))];
  if (types.length || payes.length) {
    const t1 = types.length ? `Clients interrogés le ${jour} : ${types.join(', ')}.` : '';
    const t5 = payes.length ? `Prix payé aujourd'hui, relevé le ${jour} : ${fourchette}.` : '';
    out.push({
      cle: 'canvas',
      titre: 'Mon canvas, version 2 (blocs 1 et 5, daté)',
      texte: [t1, t5].filter(Boolean).join(' '),
      appliquer: (p) => {
        if (t1) p.m2.segments = ajouterLigne(p.m2.segments, t1);
        if (t5) p.m2.revenus = ajouterLigne(p.m2.revenus, t5);
        p.m2.versionDu = iso;
      }
    });
  }
  const releves = plan.prix.filter((l) => l.element.trim() && l.prix !== null);
  const trouves = plan.m3.concurrents
    .filter((c) => c.nom.trim() && !c.prix.trim())
    .map((c) => ({ c, l: releves.find((l) => l.element.toLowerCase().includes(c.nom.trim().toLowerCase()) || c.nom.toLowerCase().includes(l.element.trim().toLowerCase())) }))
    .filter((x) => x.l);
  if (trouves.length) {
    out.push({
      cle: 'concurrents',
      titre: 'Prix des concurrents (module 3)',
      texte: trouves.map(({ c, l }) => `${c.nom.trim()} : ${grouper(l!.prix as number)} Ar ${l!.unite.trim()}`.trim()).join(' ; '),
      appliquer: (p) => {
        for (const { c, l } of trouves) {
          const cible = p.m3.concurrents.find((x) => x.id === c.id);
          if (cible && !cible.prix.trim()) cible.prix = [`${grouper(l!.prix as number)} Ar`, l!.unite.trim(), `(relevé le ${jour})`].filter(Boolean).join(' ');
        }
      }
    });
  }
  if (lignes(m.elementsUnite).length)
    out.push({ cle: 'unite', titre: "Prix de chaque élément d'une unité", texte: 'Dans « Mes prix relevés », touche « Envoyer vers mon prix de revient » pour chaque élément.', chemin: 'prix' });
  if (lignes(m.chargesADemander).length)
    out.push({ cle: 'charges', titre: 'Charges du mois obtenues', texte: 'Reporte-les dans les charges fixes du module 5.', chemin: 'm5' });
  return out;
}

export interface Regle {
  cle: string;
  texte: string;
}

export function regles(plan: Plan): Regle[] {
  const m = missionDe(plan);
  const es = m.entretiens.filter(entretienFait);
  const out: Regle[] = [];
  if (es.length < MIN_ENTRETIENS) out.push({ cle: 'V1', texte: 'Le jury veut au moins 3 clients interrogés. Tu peux en faire d\'autres ce soir : la page reste à compléter.' });
  if (es.some((e) => e.paie === null)) out.push({ cle: 'V2', texte: "Combien paie-t-il aujourd'hui ? C'est le chiffre que le jury cherche." });
  if (es.some((e) => !e.phrase.trim())) out.push({ cle: 'V3', texte: "Note une phrase qu'il a dite, avec ses mots." });
  if (elementsSansPrix(plan).length) out.push({ cle: 'V5', texte: 'Appelle ton fournisseur ce soir : sans ce prix, ton prix de revient sera faux.' });
  if (!m.decision) out.push({ cle: 'V6', texte: 'Continue, ajuste ou change d\'angle : choisis avant de passer aux chiffres.' });
  if (reports(plan).some((r) => !m.reports[r.cle])) out.push({ cle: 'V7', texte: 'Il reste des mises à jour à reporter ou à refuser (7c).' });
  return out;
}

/** Step done (fiche, section 5): 3 interviews, a decision, and each update validated or refused. */
export function missionTerminee(plan: Plan): boolean {
  const m = missionDe(plan);
  return nbEntretiens(plan) >= MIN_ENTRETIENS && m.decision !== '' && reports(plan).every((r) => !!m.reports[r.cle]);
}
