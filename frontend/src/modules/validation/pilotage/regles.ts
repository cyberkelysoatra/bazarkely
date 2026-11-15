// Pure rules of the pilotage screens (unit tested in regles.test.ts). Madagascar time.
import { dateHeure } from '../utils/regles';
import { etapeDuType, phraseEtape } from '../utils/etapes';
import type { Changement, EntreeJournal, QuestionnaireClient } from './api';

export const PHRASE_GENERALE = "Et si votre idée devenait l'application dont vous rêvez ?";

export function lienInvitation(jeton: string): string {
  return `https://1sakely.org/validation/i/${jeton}`;
}

/**
 * « 1 question au plus, environ 1 minute », « 4 questions au plus, environ 4 minutes » (VALIDCLIENT-CC-13).
 * Null when no questionnaire is published yet (0 questions): no count is shown then.
 */
export function questionsEtDuree(questions: number, minutes: number): string | null {
  const n = Math.max(0, Math.floor(questions));
  if (n < 1) return null;
  const m = Math.max(1, Math.floor(minutes));
  return `${n} question${n > 1 ? 's' : ''} au plus, environ ${m} minute${m > 1 ? 's' : ''}`;
}

/** Line under the WhatsApp preview of the fiche: count explained, or announced when nothing is published. */
export function ligneSousApercu(questions: number): string {
  return questions >= 1
    ? 'Le nombre de questions et la durée sont calculés à partir du questionnaire publié.'
    : "Le nombre de questions s'affichera dès qu'une consultation sera publiée.";
}

/**
 * WhatsApp message of VC-24 (bold title, dream in italics, link, signature). `type`: document type
 * of the questionnaire whose questions are counted; a step type names the step (VC-46).
 */
export function messageInvitation(p: {
  nomCourt: string;
  phraseReve: string | null | undefined;
  civilite: string;
  nom: string;
  questions: number;
  minutes: number;
  lien: string;
  type?: string | null;
}): string {
  const reve = (p.phraseReve ?? '').trim() || PHRASE_GENERALE;
  const etape = etapeDuType(p.type);
  const duree = questionsEtDuree(p.questions, p.minutes);
  const avis = duree
    ? `nous avons besoin de votre avis : ${duree}, depuis votre téléphone.`
    : 'nous avons besoin de votre avis, en quelques minutes, depuis votre téléphone.';
  return [
    `*VOTRE PROJET : ${p.nomCourt.trim().toLocaleUpperCase('fr')}*`,
    '',
    `_${reve}_`,
    '',
    `Bonjour ${p.civilite} ${p.nom.trim()},`,
    etape ? `Votre projet prend forme, étape par étape. Pour valider ${phraseEtape(etape)}, ${avis}` : `Votre projet prend forme. Avant de le construire, ${avis}`,
    p.lien,
    'Joël SOATRA, CyberKELY'
  ].join('\n');
}

/** wa.me address: number without « + » nor spaces, message encoded. */
export function adresseWhatsApp(numero: string, message: string): string {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

const FUSEAU = 'Indian/Antananarivo';

/** « 02/11/2026 », Madagascar date. */
export function dateCourte(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));
}

/** « il y a 10 min », « il y a 3 h », « il y a 2 j ». */
export function ilYa(iso: string, maintenant: number = Date.now()): string {
  const min = Math.max(0, Math.floor((maintenant - Date.parse(iso)) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

/** « À rendre dans 2 j 23 h » (null once the deadline is passed). */
export function aRendre(echeance: string, maintenant: number = Date.now()): string | null {
  const ms = Date.parse(echeance) - maintenant;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const heures = Math.floor(ms / 3600000);
  const j = Math.floor(heures / 24);
  const h = heures % 24;
  if (j > 0) return `À rendre dans ${j} j ${h} h`;
  return `À rendre dans ${h} h ${Math.floor((ms % 3600000) / 60000)} min`;
}

/** WhatsApp number typed in the client form → « +261340000000 », or null when not valid. */
export function numeroWhatsApp(v: string): string | null {
  const n = v.trim().replace(/[\s.\-()]/g, '');
  return /^\+[0-9]{8,15}$/.test(n) ? n : null;
}

export const LIEN_ESPACE = 'https://1sakely.org/validation/';
const SIGNATURE = 'Joël SOATRA, CyberKELY';

const titreProjet = (nomCourt: string) => `*VOTRE PROJET : ${nomCourt.trim().toLocaleUpperCase('fr')}*`;

/** « Le résumé de votre projet » → « le résumé de votre projet » (acronyms stay). */
function enLigne(t: string): string {
  const s = t.trim();
  return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(s) ? s.charAt(0).toLocaleLowerCase('fr') + s.slice(1) : s;
}

/** Reminder of VC-28 for an open, unconfirmed questionnaire (`type` names its step, VC-46). */
export function messageRelance(p: { nomCourt: string; civilite: string; nom: string; titreClient: string; restantes: number; type?: string | null }): string {
  const n = Math.max(0, p.restantes);
  const etape = etapeDuType(p.type);
  const reste = `il reste ${n} question${n > 1 ? 's' : ''}.`;
  return [
    titreProjet(p.nomCourt),
    '',
    etape
      ? `Bonjour ${p.civilite} ${p.nom.trim()}, votre avis nous attend pour valider ${phraseEtape(etape)} : ${reste}`
      : `Bonjour ${p.civilite} ${p.nom.trim()}, votre avis sur ${enLigne(p.titreClient)} nous attend : ${reste}`,
    LIEN_ESPACE,
    SIGNATURE
  ].join('\n');
}

const CORRIGE: Record<Changement['champ'], string> = {
  civilite: 'Civilité corrigée',
  nom: 'Nom corrigé',
  fonction: 'Fonction corrigée',
  whatsapp: 'Numéro corrigé'
};

const valeur = (v: string | null | undefined) => (v ?? '').trim() || '(vide)';

/** « Nom corrigé le 03/11/2026 à 20 h 45 par Joël SOATRA, avant : « Rakoto ». » (VC-44). */
export function ligneCorrection(c: Changement, at: string): string {
  return `${CORRIGE[c.champ] ?? 'Corrigé'} le ${dateHeure(at)} par Joël SOATRA, avant : « ${valeur(c.avant)} ».`;
}

/** Corrections of one person, newest first, as dated changes. */
export function corrections(journal: EntreeJournal[] | undefined, personne: string): { c: Changement; at: string }[] {
  return (journal ?? [])
    .filter((j) => j.action === 'personne_corrigee' && j.personne_id === personne)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .flatMap((j) => (j.details?.changements ?? []).map((c) => ({ c, at: j.at })));
}

/** Grey lines under a person: at most 3, then « et <n> autres corrections ». */
export function lignesCorrections(journal: EntreeJournal[] | undefined, personne: string): string[] {
  const l = corrections(journal, personne).map((x) => ligneCorrection(x.c, x.at));
  if (l.length <= 3) return l;
  const n = l.length - 3;
  return [...l.slice(0, 3), `et ${n} autre${n > 1 ? 's' : ''} correction${n > 1 ? 's' : ''}`];
}

/** Grey lines of the step gate of one questionnaire (journal « porte_franchie » / « porte_annulee »), newest first. */
export function lignesPorte(journal: EntreeJournal[] | undefined, questionnaire: string): string[] {
  return (journal ?? [])
    .filter((j) => (j.action === 'porte_franchie' || j.action === 'porte_annulee') && j.details?.questionnaire === questionnaire)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map((j) => `${j.action === 'porte_franchie' ? 'Étape marquée franchie' : 'Étape franchie annulée'} le ${dateHeure(j.at)} par Joël SOATRA.`);
}

/** Next version to publish after a confirmed one: newest draft of the same type, created later (VC-38). */
export function brouillonSuivant(qs: QuestionnaireClient[], confirme: QuestionnaireClient): QuestionnaireClient | null {
  const t = Date.parse(confirme.cree_at);
  return (
    qs
      .filter((x) => x.etat === 'brouillon' && x.type === confirme.type && x.id !== confirme.id && Date.parse(x.cree_at) > t)
      .sort((a, b) => Date.parse(b.cree_at) - Date.parse(a.cree_at))[0] ?? null
  );
}

/** Label of the invitation action of a person card: « Renvoyer » only once one was sent and not used (CC-13, gap 2). */
export function libelleInvitation(invitation: string | null | undefined): string {
  return invitation === 'envoyee' ? "Renvoyer l'invitation" : "Envoyer l'invitation";
}

/** Follow-up step shown for a questionnaire: only what the server says (never set by the screen, CC-13 gap 3). */
export function etapeSuivi(q: Pick<QuestionnaireClient, 'etape_suivi' | 'confirme_at'>): 'analyse' | 'preparation' | 'disponible' | null {
  return q.etape_suivi ?? (q.confirme_at ? 'analyse' : null);
}

/**
 * Buttons of the block « Suivi promis au client » (CC-13 gap 5): none before the client's confirmation;
 * once confirmed and not « Disponible »: « En préparation », plus publish (a next draft) or import.
 */
export function actionsSuivi(
  q: Pick<QuestionnaireClient, 'etape_suivi' | 'confirme_at'>,
  suivant: QuestionnaireClient | null
): { preparation: boolean; publier: boolean; importer: boolean } {
  const aucune = { preparation: false, publier: false, importer: false };
  if (!q.confirme_at || etapeSuivi(q) === 'disponible') return aucune;
  return { preparation: true, publier: !!suivant, importer: !suivant };
}

/**
 * Warning of « Marquer l'étape franchie » (CC-13, book Q2 and R2): when the validant refused or reserved
 * something, or the agreement is under 100 %. A warning only: the gesture stays possible.
 */
export function avertissementPorte(e: { refus: number; reserves: number; jauge: number } | null | undefined): string | null {
  if (!e) return null;
  const refus = Math.max(0, e.refus);
  const reserves = Math.max(0, e.reserves);
  if (refus === 0 && reserves === 0 && e.jauge >= 100) return null;
  return `Attention : cette version compte ${refus} refus et ${reserves} réserve${reserves > 1 ? 's' : ''}. La règle de la porte demande un accord complet avant de franchir l'étape.`;
}

/**
 * After a publication from the questionnaire page: the follow-up message is proposed when the client
 * already had a published consultation (the validant knows the space); a first one goes by invitation.
 */
export function suiteAProposer(qs: Pick<QuestionnaireClient, 'id' | 'etat'>[], publie: string): boolean {
  return qs.some((x) => x.id !== publie && x.etat !== 'brouillon');
}

/** « Publier la suite » of VC-38 (`type`: the newly published version, its step named, VC-46). */
export function messageSuite(p: { nomCourt: string; civilite: string; nom: string; type?: string | null }): string {
  const etape = etapeDuType(p.type);
  const bonjour = `Bonjour ${p.civilite} ${p.nom.trim()}, la suite de votre projet est prête : `;
  return [titreProjet(p.nomCourt), '', etape ? `${bonjour}${phraseEtape(etape)}, vous attend : ${LIEN_ESPACE}` : `${bonjour}${LIEN_ESPACE}`, SIGNATURE].join('\n');
}
