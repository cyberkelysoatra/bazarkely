// Online presence of a person attached to a project (VC-32, RM11), pattern of
// src/modules/pudi/appels/presence.ts (copied, not imported): the client screen reports its page
// with vc_noter_presence at each screen change, then every 60 s while the page is visible and
// online. Nothing when the tab is hidden or offline; never on the pilotage screens (they do not
// call this hook). Fire-and-forget: a failure is ignored and simply waits for the next tick
// (never an error shown, never a retry storm). The server marks the person « en ligne » for 2 min.
import { useEffect } from 'react';
import { noterPresence } from './api';
import { libellePresence, type PagePresence } from '../utils/regles';

export const INTERVALLE_PRESENCE_MS = 60000;

let client: string | null = null;
let page: string | null = null;
let dernier = 0;
let dernierEnvoye = '';
let enCours = false;

function noter(force = false): void {
  if (!client || !page) return;
  if (document.visibilityState !== 'visible' || navigator.onLine === false) return;
  const cle = `${client}|${page}`;
  if (!force && cle === dernierEnvoye && Date.now() - dernier < INTERVALLE_PRESENCE_MS - 1000) return;
  if (enCours) return;
  enCours = true;
  dernier = Date.now();
  dernierEnvoye = cle;
  void noterPresence(client, page)
    .catch(() => undefined)
    .finally(() => {
      enCours = false;
    });
}

let installe = false;

function installer(): void {
  if (installe || typeof window === 'undefined') return;
  installe = true;
  window.setInterval(() => noter(), INTERVALLE_PRESENCE_MS);
  document.addEventListener('visibilitychange', () => noter());
  window.addEventListener('online', () => noter());
}

/**
 * Reports `ou` for the project `clientId` while the screen is mounted. `null` (still loading, no
 * project): nothing is sent.
 */
export function usePresence(clientId: string | null | undefined, ou: PagePresence | null): void {
  const libelle = ou ? libellePresence(ou) : null;
  useEffect(() => {
    if (!clientId || !libelle) return;
    installer();
    const change = clientId !== client || libelle !== page;
    client = clientId;
    page = libelle;
    if (change) noter(true);
    return () => {
      // Leaving the screen: stop reporting it until the next screen sets its own page.
      if (client === clientId && page === libelle) page = null;
    };
  }, [clientId, libelle]);
}
