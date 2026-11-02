// Pure rules of the pilotage screens (unit tested in regles.test.ts). Madagascar time.

export const PHRASE_GENERALE = "Et si votre idée devenait l'application dont vous rêvez ?";

export function lienInvitation(jeton: string): string {
  return `https://1sakely.org/validation/i/${jeton}`;
}

/** WhatsApp message of VC-24 (bold title, dream in italics, link, signature). */
export function messageInvitation(p: {
  nomCourt: string;
  phraseReve: string | null | undefined;
  civilite: string;
  nom: string;
  questions: number;
  minutes: number;
  lien: string;
}): string {
  const reve = (p.phraseReve ?? '').trim() || PHRASE_GENERALE;
  return [
    `*VOTRE PROJET : ${p.nomCourt.trim().toLocaleUpperCase('fr')}*`,
    '',
    `_${reve}_`,
    '',
    `Bonjour ${p.civilite} ${p.nom.trim()},`,
    `Votre projet prend forme. Avant de le construire, nous avons besoin de votre avis : ${p.questions} questions au plus, environ ${p.minutes} minutes, depuis votre téléphone.`,
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

/** Reminder of VC-28 for an open, unconfirmed questionnaire. */
export function messageRelance(p: { nomCourt: string; civilite: string; nom: string; titreClient: string; restantes: number }): string {
  const n = Math.max(0, p.restantes);
  return [
    titreProjet(p.nomCourt),
    '',
    `Bonjour ${p.civilite} ${p.nom.trim()}, votre avis sur ${enLigne(p.titreClient)} nous attend : il reste ${n} question${n > 1 ? 's' : ''}.`,
    LIEN_ESPACE,
    SIGNATURE
  ].join('\n');
}

/** « Publier la suite » of VC-38. */
export function messageSuite(p: { nomCourt: string; civilite: string; nom: string }): string {
  return [titreProjet(p.nomCourt), '', `Bonjour ${p.civilite} ${p.nom.trim()}, la suite de votre projet est prête : ${LIEN_ESPACE}`, SIGNATURE].join('\n');
}
