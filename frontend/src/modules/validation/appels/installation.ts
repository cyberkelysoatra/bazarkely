// « Installer l'application » (menu) and the receipt card « Gardez 1saKELY sur votre téléphone »
// (VC-42): the offer exists only after beforeinstallprompt fired (pattern of
// src/modules/pudi/appels/installation.ts); both disappear once the app is installed.
import { useSyncExternalStore } from 'react';

interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

let invitation: InvitationInstallation | null = null;
let installee = false;
const abonnes = new Set<() => void>();
const notifier = () => abonnes.forEach((f) => f());

function enModeApplication(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

export function ecouterInstallation(): void {
  installee = enModeApplication();
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invitation = e as InvitationInstallation;
    notifier();
  });
  window.addEventListener('appinstalled', () => {
    invitation = null;
    installee = true;
    notifier();
  });
}

function suivre(f: () => void) {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

export function useInstallationDisponible(): boolean {
  return useSyncExternalStore(
    suivre,
    () => invitation !== null && !installee,
    () => false
  );
}

/** Running as the installed app, or installed from this page. */
export function useInstallee(): boolean {
  return useSyncExternalStore(
    suivre,
    () => installee || enModeApplication(),
    () => false
  );
}

/** Opens the browser's installation dialog; resolves with the person's choice. */
export async function lancerInstallation(): Promise<'accepted' | 'dismissed' | 'indisponible'> {
  if (!invitation) return 'indisponible';
  const e = invitation;
  invitation = null;
  notifier();
  try {
    await e.prompt();
    const choix = await e.userChoice;
    return choix.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'dismissed';
  }
}
