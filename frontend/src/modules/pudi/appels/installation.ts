// "Installer l'application": the button exists only after beforeinstallprompt fired (Android).
interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

let invitation: InvitationInstallation | null = null;
const abonnes = new Set<() => void>();

export function ecouterInstallation(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invitation = e as InvitationInstallation;
    abonnes.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    invitation = null;
    abonnes.forEach((f) => f());
  });
}

export function installationDisponible(): boolean {
  return invitation !== null;
}

export function abonnerInstallation(f: () => void): () => void {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}

export async function lancerInstallation(): Promise<void> {
  if (!invitation) return;
  const e = invitation;
  invitation = null;
  await e.prompt();
  abonnes.forEach((f) => f());
}
