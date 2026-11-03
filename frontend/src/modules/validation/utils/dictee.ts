// Dictation in the text fields (VC-13): pure rules of the microphone, unit tested in dictee.test.ts.
// The engine is the browser's SpeechRecognition; no sound is ever kept or sent, only the text.
import { adresseChrome, estNavigateurInterne } from './regles';

/** A press longer than this starts the dictation; a shorter one is a simple tap. */
export const SEUIL_MAINTIEN_MS = 300;
/** Sliding the finger up by more than this while holding locks the microphone (« Mains libres »). */
export const SEUIL_VERROU_PX = 40;
/** Duration of the « Maintenez pour parler » hint. */
export const DUREE_INDICE_MS = 2000;

/**
 * Text of the field during and after a dictation: the dictated text is APPENDED after what was
 * already written (one space between), never in its place; the field limit applies.
 */
export function ajouterDictee(avant: string, dicte: string, max: number): string {
  const d = dicte.replace(/\s+/g, ' ').trim();
  if (!d) return avant.slice(0, max);
  const lien = avant && !/\s$/.test(avant) ? ' ' : '';
  return (avant + lien + d).slice(0, max);
}

/** Whole text heard so far (final and interim results, in order). */
export function texteEntendu(resultats: ArrayLike<ArrayLike<{ transcript: string }>>): string {
  let t = '';
  for (let i = 0; i < resultats.length; i++) {
    const r = resultats[i];
    if (r && r.length) t += (t && !/\s$/.test(t) ? ' ' : '') + r[0].transcript.trim();
  }
  return t.trim();
}

export type Geste = 'toucher' | 'maintien' | 'verrou';

/**
 * What the press was, at release: a slide up of more than 40 px locks (whatever the duration),
 * a press held at least 300 ms is a hold, anything shorter is a simple tap.
 */
export function gesteAuRelachement(dureeMs: number, monteePx: number): Geste {
  if (monteePx > SEUIL_VERROU_PX) return 'verrou';
  return dureeMs >= SEUIL_MAINTIEN_MS ? 'maintien' : 'toucher';
}

/** True as soon as the finger slid up far enough to lock, while still pressing. */
export function doitVerrouiller(monteePx: number): boolean {
  return monteePx > SEUIL_VERROU_PX;
}

export type Navigateur = 'chrome_android' | 'interne' | 'bureau' | 'autre';

/** Chrome on Android, a messaging app's built-in browser (WhatsApp...), a computer, or other. */
export function navigateurDe(ua: string): Navigateur {
  if (estNavigateurInterne(ua)) return 'interne';
  const android = /Android/i.test(ua);
  if (android && /Chrome\/\d/.test(ua) && !/SamsungBrowser|EdgA|OPR\/|Firefox|YaBrowser|UCBrowser|MiuiBrowser/i.test(ua)) return 'chrome_android';
  if (!android && !/iPhone|iPad|iPod|Mobile/i.test(ua)) return 'bureau';
  return 'autre';
}

/** Same page in Chrome: the Android intent address (fallback elsewhere: the plain address). */
export function adresseIntent(href: string): string {
  return adresseChrome(href, true);
}

export const TEXTES_DICTEE = {
  indice: 'Maintenez pour parler',
  enCours: 'Dictée en cours. Glissez le doigt vers le haut pour parler sans tenir.',
  mainsLibres: 'Mains libres, touchez pour arrêter',
  horsLigne: 'Dictée indisponible sans réseau : vous pouvez écrire au clavier.',
  bloque: 'Le micro est bloqué.',
  cheminChrome: "Pour l'autoriser : touchez le cadenas à gauche de l'adresse, puis Autorisations, Micro.",
  cheminBureau: "Pour l'autoriser : cliquez sur le cadenas à gauche de l'adresse, puis Autorisations, Micro.",
  ouvrirChrome: 'Ouvrez 1saKELY dans Chrome',
  sansMoteur: 'La dictée ne marche pas dans ce navigateur. Ouvrez 1saKELY dans Chrome',
  lienCopie: 'Lien copié : collez-le dans Chrome'
};

export type MessageMicro = { type: 'indice' | 'hors_ligne' | 'bloque' | 'sans_moteur'; texte: string; chrome: boolean };

/** Message of a blocked microphone, adapted to the browser (VC-13). */
export function messageBloque(nav: Navigateur): MessageMicro {
  if (nav === 'interne') return { type: 'bloque', texte: `${TEXTES_DICTEE.bloque} ${TEXTES_DICTEE.ouvrirChrome}.`, chrome: true };
  return { type: 'bloque', texte: `${TEXTES_DICTEE.bloque} ${nav === 'bureau' ? TEXTES_DICTEE.cheminBureau : TEXTES_DICTEE.cheminChrome}`, chrome: false };
}

/** Browser without SpeechRecognition (often WhatsApp's built-in browser). */
export function messageSansMoteur(): MessageMicro {
  return { type: 'sans_moteur', texte: `${TEXTES_DICTEE.sansMoteur}.`, chrome: true };
}
