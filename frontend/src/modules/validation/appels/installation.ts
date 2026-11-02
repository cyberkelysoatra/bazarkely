// « Installer l'application »: the menu line exists only after beforeinstallprompt fired
// (pattern of src/modules/pudi/appels/installation.ts).
import { useSyncExternalStore } from 'react';

interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

let invitation: InvitationInstallation | null = null;
const abonnes = new Set<() => void>();
const notifier = () => abonnes.forEach((f) => f());

export function ecouterInstallation(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invitation = e as InvitationInstallation;
    notifier();
  });
  window.addEventListener('appinstalled', () => {
    invitation = null;
    notifier();
  });
}

export function useInstallationDisponible(): boolean {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => invitation !== null,
    () => false
  );
}

export async function lancerInstallation(): Promise<void> {
  if (!invitation) return;
  const e = invitation;
  invitation = null;
  notifier();
  await e.prompt();
}
