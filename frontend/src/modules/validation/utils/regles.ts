// Pure rules of the Validation client screens (unit tested in regles.test.ts).
import type { AvisEquipe, DocumentEspace, Espace } from './types';

/** Joël's WhatsApp number (given by Joël on 03/11/2026), digits only for wa.me. */
export const JOEL_WHATSAPP = '261321106618';
export const LIEN_WHATSAPP_JOEL = `https://wa.me/${JOEL_WHATSAPP}`;

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
export function fonctionEnLigne(f: string): string {
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

/**
 * « dans 2 j 23 h » until the deadline; null once it is passed. Rounded up to the minute, so the
 * instant of the confirmation reads « dans 3 j 0 h » (VC-37).
 */
export function delaiRestant(echeance: string, maintenant: number = Date.now()): string | null {
  const ms = Date.parse(echeance) - maintenant;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.ceil(ms / 60000);
  const heures = Math.floor(minutes / 60);
  const j = Math.floor(heures / 24);
  const h = heures % 24;
  if (j > 0) return `dans ${j} j ${h} h`;
  if (h > 0) return `dans ${h} h`;
  return `dans ${Math.max(1, minutes)} min`;
}

/** « 05/11/2026 », Madagascar time. */
export function dateSeule(iso: string): string {
  return dateHeure(iso).split(' à ')[0];
}

/** Cycle name in running text: « note de cadrage » (« PRD » stays). */
export function cycleEnLigne(type: string): string {
  const n = NOM_CYCLE[type] ?? 'document';
  return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(n) ? n.charAt(0).toLocaleLowerCase('fr') + n.slice(1) : n;
}

/** « Le résumé de votre projet » → « du résumé de votre projet » (warning of screen 7). */
export function duTitre(titre: string): string {
  const t = titre.trim();
  const m = /^(?:(les|le|la)\s+|(l['\u2019]))(.*)$/i.exec(t);
  if (!m) return `de ${t}`;
  if (m[2]) return `de l${m[2].slice(1)}${m[3]}`;
  const art = m[1].toLowerCase();
  return `${art === 'le' ? 'du' : art === 'la' ? 'de la' : 'des'} ${m[3]}`;
}

/** « Monsieur Joël SOATRA » → « Joël SOATRA » (receipt line « Confirmé par »). */
export function sansCivilite(nom: string | null | undefined): string {
  return (nom ?? '').replace(/^(Madame|Monsieur)\s+/, '').trim();
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

// ---------------------------------------------------------------- team (VC-14, VC-18, RM12)

/** Link of an invitation (same address as the pilotage invitations). */
export function lienEquipe(jeton: string): string {
  return `https://1sakely.org/validation/i/${jeton}`;
}

/** WhatsApp message sent by the validant from his own phone to invite a colleague (VC-18). */
export function messageEquipe(p: {
  nomCourt: string;
  entreprise: string;
  civilite: string | null;
  nom: string;
  civiliteValidant: string | null;
  nomValidant: string;
  lien: string;
}): string {
  const qui = (civ: string | null, nom: string) => [civ, nom.trim()].filter(Boolean).join(' ');
  return [
    `*VOTRE PROJET : ${p.nomCourt.trim().toLocaleUpperCase('fr')}*`,
    '',
    `Bonjour ${qui(p.civilite, p.nom)},`,
    `${qui(p.civiliteValidant, p.nomValidant)} vous invite à donner votre avis sur le projet ${p.nomCourt.trim()} de ${p.entreprise.trim()}.`,
    p.lien,
    p.nomValidant.trim()
  ].join('\n');
}

/** Server code of vc_equipe_inviter (or its refusal) → client text. */
export const TEXTES_EQUIPE: Record<string, string> = {
  NUMERO_INVALIDE: MESSAGES_CHAMP.numero,
  CHAMP_OBLIGATOIRE: 'Écrivez le nom de la personne.',
  EQUIPE_COMPLETE: 'Votre équipe compte déjà 20 personnes : pour en ajouter une, écrivez à Joël.',
  VC_ACCES_REFUSE: 'Seule la personne qui décide pour l’équipe peut inviter. Pour toute question, écrivez à Joël.'
};

/** « Hery a choisi », « Hery et Lova ont choisi », « Hery, Lova et Fara ont choisi ». */
export function aChoisi(noms: string[]): string {
  const n = noms.filter(Boolean);
  if (!n.length) return '';
  if (n.length === 1) return `${n[0]} a choisi`;
  return `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]} ont choisi`;
}

/** « 02/11 à 21 h 15 », Madagascar time. */
export function jourHeure(iso: string): string {
  const [jour, heure] = dateHeure(iso).split(' à ');
  return `${jour.slice(0, 5)} à ${heure}`;
}

/** « Monsieur Joël SOATRA » → civility, full name without it, first name, pronoun. */
export function personneValidant(v: string | null | undefined): { civilite: string | null; nom: string; prenom: string; pronom: string } {
  const brut = (v ?? '').trim();
  const m = /^(Madame|Monsieur)\s+(.*)$/.exec(brut);
  const civilite = m ? m[1] : null;
  const nom = (m ? m[2] : brut).trim();
  return { civilite, nom, prenom: nom.split(/\s+/)[0] ?? '', pronom: civilite === 'Madame' ? 'elle' : civilite === 'Monsieur' ? 'il' : 'elle ou il' };
}

/** First word of a name (« Hery Rakoto » → « Hery »). */
export function prenomDe(nom: string | null | undefined): string {
  return (nom ?? '').trim().split(/\s+/)[0] ?? '';
}

/** « Votre équipe » sentence of a question (null when nobody gave an opinion on it). */
export function phraseEquipe(avis: AvisEquipe[], libelles: Record<string, string>, trancher = true): string | null {
  const l = [...avis].sort((a, b) => Date.parse(a.repondu_at) - Date.parse(b.repondu_at));
  if (!l.length) return null;
  const morceaux = l.map((a) => {
    // Non-breaking spaces inside the date: « 01 h 16 » never splits across two lines.
    const base = `${a.nom} a choisi « ${libelles[a.choix_id] ?? '?'} » (${jourHeure(a.repondu_at).replace(/ /g, '\u00a0')})`;
    const c = (a.commentaire ?? '').trim();
    return c ? `${base} et commente : « ${c} »` : base;
  });
  const fin = morceaux.join(' ; ');
  return `${fin}${/[.!?»]$/.test(fin) ? '' : '.'}${trancher ? ' C’est à vous de trancher.' : ''}`;
}

/** Choice id → first names of the colleagues who chose it, in the order they answered. */
export function votantsParChoix(avis: AvisEquipe[]): Record<string, string[]> {
  const r: Record<string, string[]> = {};
  for (const a of [...avis].sort((x, y) => Date.parse(x.repondu_at) - Date.parse(y.repondu_at))) (r[a.choix_id] ??= []).push(a.nom);
  return r;
}

// ---------------------------------------------------------------- presence (VC-32, RM11)

export type PagePresence =
  | { type: 'accueil' }
  | { type: 'question'; titre: string; n: number; total: number }
  | { type: 'relecture' }
  | { type: 'mes_reponses' }
  | { type: 'fin_avis'; titre: string }
  | { type: 'recu' }
  | { type: 'document'; titre: string }
  | { type: 'equipe' }
  | { type: 'infos' }
  | { type: 'inscription' }
  | { type: 'discussion' };

/** Label of the page shown to Joël (« en ligne : <page> »), in client words, 80 characters at most. */
export function libellePresence(p: PagePresence): string {
  const t = (() => {
    switch (p.type) {
      case 'accueil':
        return 'Accueil';
      case 'question':
        return `${p.titre.trim()}, question ${p.n} sur ${p.total}`;
      case 'relecture':
        return 'Relecture avant confirmation';
      case 'mes_reponses':
        return 'Mes réponses (lecture seule)';
      case 'fin_avis':
        return `${p.titre.trim()}, avis terminé`;
      case 'recu':
        return 'Reçu';
      case 'document':
        return `Document : ${p.titre.trim()}`;
      case 'equipe':
        return 'Mon équipe';
      case 'infos':
        return 'Mes informations';
      case 'inscription':
        return 'Inscription';
      case 'discussion':
        return 'Discussion du projet';
    }
  })();
  return t.length > 80 ? `${t.slice(0, 79)}\u2026` : t;
}
