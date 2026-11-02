// Pure rules of the Validation client screens (unit tested in regles.test.ts).
import type { DocumentEspace, Espace } from './types';

/** Joël's WhatsApp: no number exists in the repository yet (phase 2 report), plain wa.me link. */
export const LIEN_WHATSAPP_JOEL = 'https://wa.me/';

/** Cycle name shown in small under the client title (RM17). */
export const NOM_CYCLE: Record<string, string> = {
  note_cadrage: 'Note de cadrage',
  cahier_charges: 'Cahier des charges',
  prd: 'PRD',
  maquette: 'Maquette',
  recette: 'Recette',
  avenant: 'Avenant',
  decouverte: 'Découverte'
};

export function nomCycle(type: string, version: string): string {
  return `${NOM_CYCLE[type] ?? 'Document'}, version ${version}`;
}

/** Initials of a name, two letters at most (« Joël SOATRA » → « JS »). */
export function initiales(nom: string | null | undefined): string {
  const mots = (nom ?? '').trim().split(/\s+/).filter(Boolean);
  if (!mots.length) return '?';
  const l = (m: string) => m.charAt(0).toLocaleUpperCase('fr');
  return mots.length === 1 ? l(mots[0]) : l(mots[0]) + l(mots[mots.length - 1]);
}

/** « Directrice » → « directrice » in the header line; acronyms (« PDG ») stay as typed. */
function fonctionEnLigne(f: string): string {
  return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(f) ? f.charAt(0).toLocaleLowerCase('fr') + f.slice(1) : f;
}

/** « pour <nom>, <fonction>, <entreprise> » (VC-17); missing parts are left out. */
export function lignePour(e: Pick<Espace, 'nom' | 'fonction' | 'entreprise'>): string {
  const parts = [e.nom, e.fonction ? fonctionEnLigne(e.fonction) : null, e.entreprise].map((x) => (x ?? '').trim()).filter(Boolean);
  return parts.length ? `pour ${parts.join(', ')}` : '';
}

/** The project shown on the home page: the first active entry, else the reason why there is none. */
export type Choix =
  | { type: 'projet'; espace: Espace }
  | { type: 'revoque' }
  | { type: 'archive' }
  | { type: 'aucun' };

export function choisirProjet(liste: Espace[] | null | undefined): Choix {
  const l = liste ?? [];
  const actif = l.find((e) => !e.revoque && !e.archive);
  if (actif) return { type: 'projet', espace: actif };
  if (l.some((e) => e.archive)) return { type: 'archive' };
  if (l.some((e) => e.revoque)) return { type: 'revoque' };
  return { type: 'aucun' };
}

/** State of a document card on the home page (VC-08). */
export type EtatCarte = 'a_commencer' | 'en_cours' | 'pret' | 'confirme' | 'clos' | 'remplace';

export function etatCarte(d: DocumentEspace): EtatCarte {
  if (d.etat === 'remplace') return 'remplace';
  if (d.confirme_at || d.etat === 'confirme') return 'confirme';
  if (d.etat === 'clos') return 'clos';
  const e = d.etat_personne;
  if (e?.pret) return 'pret';
  if (e && e.repondues > 0) return 'en_cours';
  return 'a_commencer';
}

/** Question to open from the home card (position on the path, 1-based). */
export function questionAOuvrir(d: DocumentEspace): number {
  const e = d.etat_personne;
  if (!e || e.pret) return 1;
  return Math.min(e.repondues + 1, Math.max(e.total, 1));
}

/** A newer version of the same document type was published: « Nouvelle version » on that card. */
export function estNouvelleVersion(d: DocumentEspace, tous: DocumentEspace[]): boolean {
  return d.etat !== 'remplace' && tous.some((x) => x !== d && x.type === d.type && x.etat === 'remplace');
}

/** Cards in display order: each replaced version right below the newer one of the same type. */
export function ordonnerDocuments(docs: DocumentEspace[]): DocumentEspace[] {
  const vivants = docs.filter((d) => d.etat !== 'remplace');
  const anciens = docs.filter((d) => d.etat === 'remplace');
  const out: DocumentEspace[] = [];
  for (const d of vivants) {
    out.push(d);
    for (const a of anciens) if (a.type === d.type && !out.includes(a)) out.push(a);
  }
  for (const a of anciens) if (!out.includes(a)) out.push(a);
  return out;
}

const FUSEAU = 'Indian/Antananarivo';

/** « 05/11/2026 à 21 h 32 », Madagascar time. */
export function dateHeure(iso: string): string {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${v('day')}/${v('month')}/${v('year')} à ${v('hour')} h ${v('minute')}`;
}

/** « dans 2 j 23 h » until the deadline; null once it is passed. */
export function delaiRestant(echeance: string, maintenant: number = Date.now()): string | null {
  const ms = Date.parse(echeance) - maintenant;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const heures = Math.floor(ms / 3600000);
  const j = Math.floor(heures / 24);
  const h = heures % 24;
  if (j > 0) return `dans ${j} j ${h} h`;
  if (h > 0) return `dans ${h} h`;
  return `dans ${Math.max(1, Math.floor(ms / 60000))} min`;
}

/** Counts of a confirmed card: « 6 validées, 1 réserve, 1 refus ». */
export function comptes(d: DocumentEspace): string {
  const e = d.etat_personne;
  if (!e) return '';
  const validees = Math.max(0, e.acceptees - e.reserves);
  const pl = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  return [pl(validees, 'validée', 'validées'), pl(e.reserves, 'réserve', 'réserves'), pl(e.refus, 'refus', 'refus')].join(', ');
}

// ---------------------------------------------------------------- registration form (VC-16)

export type Champ = 'entreprise' | 'fonction' | 'whatsapp' | 'emailPro';

export const ORDRE_CHAMPS: Champ[] = ['entreprise', 'fonction', 'whatsapp', 'emailPro'];

export const MESSAGES_CHAMP = {
  obligatoire: 'Ce champ est obligatoire.',
  numero: 'Écrivez le numéro au format international, par exemple +261 34 00 000 00.',
  email: "Cet e-mail n'est pas valide, par exemple direction@exemple.mg."
};

/** « +261 34 00 000 00 » → « +261340000000 » (spaces, dots and dashes removed). */
export function normaliserNumero(v: string): string {
  return v.trim().replace(/[\s.\-()]/g, '');
}

export interface Formulaire {
  civilite: string | null;
  entreprise: string;
  fonction: string;
  whatsapp: string;
  emailPro: string;
}

/** Same rules as vc_mes_infos, checked before sending: field → message. */
export function erreursFormulaire(f: Formulaire): Partial<Record<Champ, string>> {
  const e: Partial<Record<Champ, string>> = {};
  if (!f.entreprise.trim()) e.entreprise = MESSAGES_CHAMP.obligatoire;
  if (!f.fonction.trim()) e.fonction = MESSAGES_CHAMP.obligatoire;
  const n = normaliserNumero(f.whatsapp);
  if (!n) e.whatsapp = MESSAGES_CHAMP.obligatoire;
  else if (!/^\+[0-9]{8,15}$/.test(n)) e.whatsapp = MESSAGES_CHAMP.numero;
  const m = f.emailPro.trim();
  if (m && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)) e.emailPro = MESSAGES_CHAMP.email;
  return e;
}

/** Server code → faulty field (CHAMP_OBLIGATOIRE: the first empty required field). */
export function champDuCode(code: string | undefined, f: Formulaire): Partial<Record<Champ, string>> {
  if (code === 'NUMERO_INVALIDE') return { whatsapp: MESSAGES_CHAMP.numero };
  if (code === 'EMAIL_INVALIDE') return { emailPro: MESSAGES_CHAMP.email };
  if (code === 'CHAMP_OBLIGATOIRE') {
    const vide = (['entreprise', 'fonction', 'whatsapp'] as Champ[]).find((c) => !String(f[c]).trim()) ?? 'entreprise';
    return { [vide]: MESSAGES_CHAMP.obligatoire };
  }
  return {};
}

export function premierChampFautif(e: Partial<Record<Champ, string>>): Champ | null {
  return ORDRE_CHAMPS.find((c) => e[c]) ?? null;
}

// ---------------------------------------------------------------- WhatsApp built-in browser

/** True inside a messaging app's browser, where Google refuses the sign-in. */
export function estNavigateurInterne(ua: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|\bLine\/|MessengerForiOS/i.test(ua) || (/Android/i.test(ua) && /; wv\)/.test(ua));
}

/** Same address in Chrome: an Android intent address, the plain address elsewhere. */
export function adresseChrome(href: string, android: boolean): string {
  const u = new URL(href);
  u.hash = '';
  if (!android) return u.toString();
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
}

/** Return address after an e-mail sign-in: a module path only (never an outside address). */
export function retourSur(param: string | null): string {
  return param && /^\/(?!\/)[A-Za-z0-9/_\-]*$/.test(param) ? param : '/';
}
