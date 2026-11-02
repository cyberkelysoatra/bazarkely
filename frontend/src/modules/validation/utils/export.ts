// Results of a consultation for the project assistant (VC-34, screen 14). Pure functions: the
// figures, the rows of the table, the « Points à reprendre » and the « Texte pour l'assistant »,
// written in the import format (utils/import.ts, without the DOCUMENT block) and enriched with
// RÉPONSE, ÉQUIPE, HISTORIQUE lines. Madagascar time.
import { NOM_CYCLE, cycleEnLigne } from './regles';

export interface ChoixResultat {
  id: string;
  lettre: string;
  nature: 'validation' | 'reserve' | 'refus' | 'choix';
  libelle: string;
  ligne: string;
  avantages: string | null;
  faiblesses: string | null;
  conseille: boolean;
  suivante: string | null;
}

export interface ReponseResultat {
  /** « Monsieur Joël SOATRA » (civility and name, as vc_admin_questionnaire gives it). */
  personne: string;
  fonction: string | null;
  role: string;
  choix_id: string;
  commentaire: string | null;
  version: string;
  repondu_at: string;
}

export interface QuestionResultat {
  id: string;
  numero: string;
  ordre: number;
  type: 'validation' | 'choix';
  sujet_client: string;
  critere: string | null;
  texte: string;
  extrait: string | null;
  essentielle: boolean;
  choix: ChoixResultat[];
  reponses: ReponseResultat[];
}

export interface MessageResultat {
  auteur: string;
  texte: string | null;
  retire?: boolean;
  cree_at: string;
  question_id: string | null;
}

export interface DonneesResultats {
  type: string;
  version: string;
  titre_client: string;
  entreprise: string;
  /** Current validant: « Monsieur Joël SOATRA » and function; null when the project has none. */
  validant: { personne: string; fonction: string | null } | null;
  confirme_at: string | null;
  /** Question numbers on the validant's path, in order (vc_chemin). */
  chemin: string[];
  questions: QuestionResultat[];
  messages: MessageResultat[];
}

export interface ReponseLue {
  choix: ChoixResultat | null;
  commentaire: string | null;
  repondu_at: string;
  version: string;
}

export interface AvisEquipe extends ReponseLue {
  personne: string;
  fonction: string | null;
}

export interface LigneResultat {
  q: QuestionResultat;
  surChemin: boolean;
  /** Latest answer of the validant (null: none). */
  reponse: ReponseLue | null;
  /** Older answers of the validant, oldest first (replaced, kept). */
  historique: ReponseLue[];
  /** Latest opinion of each other person, in answer order. */
  equipe: AvisEquipe[];
}

export interface Chiffres {
  total: number;
  repondues: number;
  validees: number;
  reserves: number;
  refus: number;
  jauge: number;
}

export interface Synthese {
  lignes: LigneResultat[];
  /** Rows of the table: the validant's path, plus out-of-path questions with a team opinion. */
  tableau: LigneResultat[];
  chiffres: Chiffres;
  /** Questions to take up again (refusals and reservations of the validant, on the path). */
  points: { numero: string; nature: 'refus' | 'reserve' }[];
  horsChemin: number;
}

const FUSEAU = 'Indian/Antananarivo';

function morceaux(iso: string): Record<string, string> {
  const p = new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(iso));
  return Object.fromEntries(p.map((x) => [x.type, x.value]));
}

/** « 03/11/2026 01:10:41 », Madagascar time, to the second. */
export function dateHeureSeconde(iso: string): string {
  const v = morceaux(iso);
  return `${v.day}/${v.month}/${v.year} ${v.hour}:${v.minute}:${v.second}`;
}

/** « 03/11/2026 01:10 », Madagascar time. */
export function dateHeureMinute(iso: string): string {
  const v = morceaux(iso);
  return `${v.day}/${v.month}/${v.year} ${v.hour}:${v.minute}`;
}

/** « 0.1 » → « 0.2 », « 1.2 » → « 1.3 », « 2 » → « 3 ». */
export function versionSuivante(version: string): string {
  const m = /^(.*?)(\d+)$/.exec(version.trim());
  if (!m) return `${version} suivante`;
  return `${m[1]}${parseInt(m[2], 10) + 1}`;
}

/** « Monsieur Joël SOATRA » → « Joël SOATRA ». */
export function nomSeul(personne: string): string {
  return personne.replace(/^(Madame|Monsieur)\s+/, '').trim();
}

const uneLigne = (s: string | null | undefined) => (s ?? '').replace(/\s*\n\s*/g, ' ').trim();

function lue(q: QuestionResultat, r: ReponseResultat): ReponseLue {
  return { choix: q.choix.find((c) => c.id === r.choix_id) ?? null, commentaire: r.commentaire, repondu_at: r.repondu_at, version: r.version };
}

/** The validant's answers are matched on the name; the role recorded with the answer is a fallback. */
function estDuValidant(r: ReponseResultat, d: DonneesResultats): boolean {
  if (d.validant) return r.personne === d.validant.personne;
  return r.role === 'validant';
}

export function synthese(d: DonneesResultats): Synthese {
  const ordonnees = [...d.questions].sort((a, b) => a.ordre - b.ordre);
  const lignes: LigneResultat[] = ordonnees.map((q) => {
    const rs = [...q.reponses].sort((a, b) => Date.parse(a.repondu_at) - Date.parse(b.repondu_at));
    const duValidant = rs.filter((r) => estDuValidant(r, d)).map((r) => lue(q, r));
    const parPersonne = new Map<string, AvisEquipe>();
    for (const r of rs.filter((x) => !estDuValidant(x, d))) {
      parPersonne.delete(r.personne);
      parPersonne.set(r.personne, { ...lue(q, r), personne: r.personne, fonction: r.fonction });
    }
    return {
      q,
      surChemin: d.chemin.includes(q.numero),
      reponse: duValidant.length ? duValidant[duValidant.length - 1] : null,
      historique: duValidant.slice(0, -1),
      equipe: [...parPersonne.values()]
    };
  });
  const surChemin = d.chemin.map((n) => lignes.find((l) => l.q.numero === n)).filter((l): l is LigneResultat => !!l);
  const repondues = surChemin.filter((l) => l.reponse?.choix);
  const nature = (l: LigneResultat) => l.reponse?.choix?.nature;
  const refus = repondues.filter((l) => nature(l) === 'refus').length;
  const reserves = repondues.filter((l) => nature(l) === 'reserve').length;
  const acceptees = repondues.length - refus;
  const total = surChemin.length;
  const points = lignes
    .filter((l) => l.surChemin && (nature(l) === 'refus' || nature(l) === 'reserve'))
    .map((l) => ({ numero: l.q.numero, nature: nature(l) as 'refus' | 'reserve' }));
  return {
    lignes,
    tableau: lignes.filter((l) => l.surChemin || l.equipe.length > 0),
    chiffres: {
      total,
      repondues: repondues.length,
      validees: acceptees - reserves,
      reserves,
      refus,
      jauge: total ? Math.round((100 * acceptees) / total) : 0
    },
    points,
    horsChemin: lignes.filter((l) => !l.surChemin).length
  };
}

const pl = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** « 1 validée, 1 réserve, 1 refus ». */
export function texteChiffres(c: Chiffres): string {
  return [pl(c.validees, 'validée', 'validées'), pl(c.reserves, 'réserve', 'réserves'), pl(c.refus, 'refus', 'refus')].join(', ');
}

/** « Q1 (réserve), Q3 (refus) » or « aucun ». */
export function textePoints(points: Synthese['points']): string {
  return points.length ? points.map((p) => `Q${p.numero} (${p.nature === 'refus' ? 'refus' : 'réserve'})`).join(', ') : 'aucun';
}

/** « Prochaine étape conseillée : note de cadrage v0.2, puis une consultation de confirmation sur ces points. » */
export function prochaineEtape(type: string, version: string): string {
  return `Prochaine étape conseillée : ${cycleEnLigne(type)} v${versionSuivante(version)}, puis une consultation de confirmation sur ces points.`;
}

/** « confirmée le 03/11/2026 à 01:12 » or the provisional line. */
export function texteEtat(confirmeAt: string | null): string {
  if (!confirmeAt) return 'Pas encore confirmée : résultats provisoires';
  const v = morceaux(confirmeAt);
  return `confirmée le ${v.day}/${v.month}/${v.year} à ${v.hour}:${v.minute}`;
}

const TAG_NATURE: Record<string, string> = { validation: '[validation] ', reserve: '[réserve] ', refus: '[refus] ', choix: '' };

function ligneChoix(c: ChoixResultat): string {
  const parts = [uneLigne(c.libelle), uneLigne(c.ligne)];
  if (c.avantages) parts.push(`Avantages : ${uneLigne(c.avantages)}`);
  if (c.faiblesses) parts.push(`Faiblesses : ${uneLigne(c.faiblesses)}`);
  if (c.suivante) parts.push(`-> ${c.suivante}`);
  return `CHOIX ${c.lettre} ${TAG_NATURE[c.nature] ?? ''}${c.conseille ? '[conseillé] ' : ''}${parts.join(' | ')}`;
}

const choisi = (r: ReponseLue) => (r.choix ? `${r.choix.lettre} ${uneLigne(r.choix.libelle)}` : 'choix inconnu');
const commentaire = (r: ReponseLue) => (r.commentaire && r.commentaire.trim() ? ` | « ${uneLigne(r.commentaire)} »` : '');

/** The whole « Texte pour l'assistant ». */
export function texteAssistant(d: DonneesResultats): string {
  const s = synthese(d);
  const v = d.validant;
  const out: string[] = [];
  out.push(`RÉSULTATS : ${d.type} v${d.version}`);
  out.push(`DOCUMENT POUR LE CLIENT : ${uneLigne(d.titre_client)} (${NOM_CYCLE[d.type] ?? 'Document'})`);
  out.push(`CLIENT : ${uneLigne(d.entreprise)} ; validant : ${v ? [nomSeul(v.personne), v.fonction].filter(Boolean).join(', ') : 'aucun'}`);
  const etat = d.confirme_at ? `${texteEtat(d.confirme_at)} (heure de Madagascar)` : texteEtat(null);
  out.push(
    `ÉTAT : ${etat} ; ${pl(s.chiffres.total, 'question', 'questions')} sur le chemin, ${s.horsChemin} hors chemin ; jauge ${s.chiffres.jauge} % ; ${texteChiffres(s.chiffres)}`
  );
  out.push(`POINTS À REPRENDRE : ${textePoints(s.points)}`);
  if (s.points.length) out.push(prochaineEtape(d.type, d.version).replace(/^Prochaine étape conseillée : /, 'PROCHAINE ÉTAPE CONSEILLÉE : '));

  for (const l of s.lignes) {
    const q = l.q;
    out.push('');
    out.push(`QUESTION ${q.numero} ${q.essentielle ? '[essentielle] ' : ''}${uneLigne(q.sujet_client)}`);
    if (q.critere) out.push(`CRITÈRE : ${uneLigne(q.critere)}`);
    if (q.extrait) out.push(`EXTRAIT : ${uneLigne(q.extrait)}`);
    out.push(uneLigne(q.texte));
    for (const c of [...q.choix].sort((a, b) => a.lettre.localeCompare(b.lettre))) out.push(ligneChoix(c));
    if (!l.surChemin) out.push('RÉPONSE : hors chemin');
    else if (l.reponse) out.push(`RÉPONSE : ${choisi(l.reponse)} | ${dateHeureSeconde(l.reponse.repondu_at)}${commentaire(l.reponse)}`);
    else out.push('RÉPONSE : sans réponse');
    for (const h of l.historique) out.push(`HISTORIQUE : ${choisi(h)} le ${dateHeureSeconde(h.repondu_at)}, remplacée${commentaire(h)}`);
    if (!l.surChemin && l.reponse) out.push(`HISTORIQUE : ${choisi(l.reponse)} le ${dateHeureSeconde(l.reponse.repondu_at)}, avant un changement de chemin${commentaire(l.reponse)}`);
    for (const e of l.equipe) out.push(`ÉQUIPE : ${[nomSeul(e.personne), e.fonction].filter(Boolean).join(', ')} : ${choisi(e)}${commentaire(e)}`);
  }

  out.push('');
  const numeroDe = (id: string | null) => d.questions.find((q) => q.id === id)?.numero;
  const messages = [...d.messages].sort((a, b) => Date.parse(a.cree_at) - Date.parse(b.cree_at));
  if (!messages.length) out.push('DISCUSSION : aucun message');
  for (const m of messages) {
    const n = numeroDe(m.question_id);
    const texte = m.retire || m.texte === null ? 'message retiré' : `« ${uneLigne(m.texte)} »`;
    out.push(`DISCUSSION : ${dateHeureMinute(m.cree_at)} | ${nomSeul(m.auteur)}${n ? ` | question ${n}` : ''} | ${texte}`);
  }
  return out.join('\n') + '\n';
}

/** Question part of the text, ready for lireImport once a CONSULTATION line and a DOCUMENT block are added. */
export function partieQuestions(texte: string): string {
  const lignes = texte.split('\n');
  const debut = lignes.findIndex((l) => /^QUESTION /.test(l));
  if (debut < 0) return '';
  return lignes
    .slice(debut)
    .filter((l) => !/^(RÉPONSE|HISTORIQUE|ÉQUIPE|DISCUSSION) :/.test(l))
    .join('\n')
    .trim();
}
