// PUDI-CC-16.2 e: built-in browsers of WhatsApp / Facebook / Instagram / Messenger / Line, where
// Google refuses the sign-in (disallowed_useragent) and the storage is not Chrome's. The draft
// travels in the address (?b=, ids only) so the person does not check again in Chrome.
// Pure functions, unit tested.
import type { Brouillon } from './regles';

/** True inside a messaging app's browser (never for the NAVY ay app, which signs in itself). */
export function estNavigateurInterne(ua: string): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|WhatsApp|\bLine\/|MessengerForiOS/i.test(ua) || (/Android/i.test(ua) && /; wv\)/.test(ua));
}

const ID = /^[A-Za-z0-9]{1,8}$/;

/** "T3.T3.A4.P1-N3.W1": votes (one id per vote), then urgents (ids only, the missing project text never travels). */
export function encoderBrouillon(b: Brouillon): string {
  const p = b.priorites.filter((x) => ID.test(x)).join('.');
  const u = b.urgents.filter((x) => ID.test(x)).join('.');
  return u ? `${p}-${u}` : p;
}

/** Draft read from ?b= (unknown shapes ignored, same limits as the draft). */
export function decoderBrouillon(code: string | null): Brouillon | null {
  if (!code || code.length > 200) return null;
  const [p = '', u = ''] = code.split('-');
  const ids = (s: string) => s.split('.').filter((x) => ID.test(x));
  // PUDI-CC-17: votes may repeat an id (stacked votes), urgents never do.
  const priorites = ids(p).slice(0, 12);
  const urgents = [...new Set(ids(u))].slice(0, 10);
  if (!priorites.length && !urgents.length) return null;
  return { priorites, urgents, manquant: '' };
}

/**
 * Same page in Chrome: an intent address on Android (opens Chrome even from WhatsApp), the plain
 * address elsewhere (to copy). The channel ?c= is kept, the draft added as ?b=.
 */
export function adresseChrome(href: string, b: Brouillon, canal: string | null, android: boolean): string {
  const u = new URL(href);
  u.search = '';
  u.hash = '';
  if (canal) u.searchParams.set('c', canal);
  const code = encoderBrouillon(b);
  if (code) u.searchParams.set('b', code);
  if (!android) return u.toString();
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`;
}
