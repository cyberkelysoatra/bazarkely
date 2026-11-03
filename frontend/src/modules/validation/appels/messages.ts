// Queue of the thread messages written on this phone (VC-39): same storage and same idea as the
// queue of answers (file.ts). A message is kept on the device first (shown at once with a small
// clock), then sent with vc_message_envoyer and its phone id; without network it waits and leaves
// in order when the network comes back. A server refusal stays on its bubble: never lost silently.
import { useSyncExternalStore } from 'react';
import { envoyerMessage } from './api';
import { ecrireLocal, lireLocal } from './local';
import { traiterFile, type MessageEnAttente } from '../utils/discussion';

const CLE = 'messages';

let file: MessageEnAttente[] = [];
const abonnes = new Set<() => void>();
/** Called after a run that recorded at least one message (the thread re-reads the server). */
const apresEnvoi = new Set<() => void>();

function changer(f: MessageEnAttente[]): void {
  file = f;
  abonnes.forEach((x) => x());
}

export function useFileMessages(): MessageEnAttente[] {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => file
  );
}

export function surEnvoi(f: () => void): () => void {
  apresEnvoi.add(f);
  return () => apresEnvoi.delete(f);
}

let lue: Promise<void> | null = null;

function lire(): Promise<void> {
  if (!lue) {
    lue = lireLocal<MessageEnAttente[]>(CLE).then((l) => {
      if (Array.isArray(l) && l.length) changer([...l, ...file.filter((x) => !l.some((y) => y.id === x.id))]);
    });
  }
  return lue;
}

async function poser(f: MessageEnAttente[]): Promise<void> {
  changer(f);
  await ecrireLocal(CLE, f);
}

let vidage: Promise<void> | null = null;

/** Sends the waiting messages in order (one run at a time). Never throws. */
export function viderMessages(): Promise<void> {
  if (vidage) return vidage;
  vidage = (async () => {
    await lire();
    for (;;) {
      if (!file.some((m) => !m.refus)) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const avant = file;
      const r = await traiterFile(avant, (m) => envoyerMessage({ id: m.id, client: m.client, texte: m.texte, question: m.question }));
      // Messages added during the run stay after the ones of the run, and leave in the next round.
      const ajoutes = file.filter((x) => !avant.some((y) => y.id === x.id));
      await poser([...r.file, ...ajoutes]);
      if (r.envoyes.length) apresEnvoi.forEach((f) => f());
      if (r.reseau || !ajoutes.length) return;
    }
  })().finally(() => {
    vidage = null;
  });
  return vidage;
}

/** Keeps the message on the phone, then tries to send it. */
export async function ajouterMessage(m: MessageEnAttente): Promise<void> {
  await lire();
  if (file.some((x) => x.id === m.id)) return;
  await poser([...file, m]);
  await viderMessages();
}

/** « Effacer » on a refused bubble: the phone forgets it (the server never had it). */
export async function oublierMessage(id: string): Promise<void> {
  await lire();
  await poser(file.filter((x) => x.id !== id));
}

export function chargerMessages(): Promise<void> {
  return lire();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void viderMessages());
  if (navigator.onLine) window.setTimeout(() => void viderMessages(), 1500);
}
