// Installed-app side of the page: own service worker (/plan/sw.js), "ready for airplane mode"
// status, "new version" banner, install offer, persistent storage. Production build only for the worker.
import { useEffect, useState, useSyncExternalStore } from 'react';

interface InvitationInstallation extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

let invitation: InvitationInstallation | null = null;
let attente: ServiceWorker | null = null;
const abonnes = new Set<() => void>();
const notifier = () => abonnes.forEach((f) => f());
const suivre = (f: () => void) => {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
};

/** Name of the entry file of this build: a new deploy gives a new name, so a new worker. */
function versionDuCode(): string {
  try {
    return new URL(import.meta.url).pathname.split('/').pop() || 'local';
  } catch {
    return 'local';
  }
}

function surveiller(reg: ServiceWorkerRegistration) {
  const verifier = () => {
    if (reg.waiting && navigator.serviceWorker.controller) {
      attente = reg.waiting;
      notifier();
    }
  };
  verifier();
  reg.addEventListener('updatefound', () => {
    const nouveau = reg.installing;
    nouveau?.addEventListener('statechange', () => {
      if (nouveau.state === 'installed') verifier();
      if (nouveau.state === 'activated') notifier();
    });
  });
}

export function demarrerPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    invitation = e as InvitationInstallation;
    notifier();
  });
  window.addEventListener('appinstalled', () => {
    invitation = null;
    notifier();
  });
  // Ask the browser to keep the data even when the phone is short of space.
  try {
    void navigator.storage?.persist?.();
  } catch {
    // Not available: the data stays, only without the guarantee.
  }
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    let rechargement = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (rechargement) return;
      if (sessionStorage.getItem('nec.maj') === '1') {
        rechargement = true;
        sessionStorage.removeItem('nec.maj');
        window.location.reload();
      }
      notifier();
    });
    const enregistrer = () => {
      navigator.serviceWorker
        .register('/plan/sw.js?v=' + encodeURIComponent(versionDuCode()), { scope: '/plan/' })
        .then(surveiller)
        .catch(() => undefined);
    };
    if (document.readyState === 'complete') enregistrer();
    else window.addEventListener('load', enregistrer);
  }
}

export function useMiseAJourDisponible(): boolean {
  return useSyncExternalStore(suivre, () => attente !== null, () => false);
}

/** "Nouvelle version : toucher pour mettre à jour": the waiting worker takes over, then the page reloads. */
export function appliquerMiseAJour(): void {
  const w = attente;
  if (!w) return;
  sessionStorage.setItem('nec.maj', '1');
  w.postMessage({ type: 'SKIP_WAITING' });
  // Safety net if controllerchange never comes.
  window.setTimeout(() => window.location.reload(), 4000);
}

export function useInstallationDisponible(): boolean {
  return useSyncExternalStore(suivre, () => invitation !== null, () => false);
}

export async function lancerInstallation(): Promise<void> {
  const e = invitation;
  if (!e) return;
  invitation = null;
  notifier();
  try {
    await e.prompt();
    await e.userChoice;
  } catch {
    // Dismissed.
  }
}

/** True once every file listed by the worker (precache.json) is in the cache. */
async function toutEstEnCache(): Promise<boolean> {
  if (!('caches' in window)) return false;
  const liste = await caches.match('/plan/precache.json');
  if (!liste) return false;
  const { files } = (await liste.json()) as { files: string[] };
  for (const f of files) if (!(await caches.match(f))) return false;
  return true;
}

export function usePretModeAvion(): boolean {
  const [pret, setPret] = useState(false);
  useEffect(() => {
    let fin = false;
    let minuterie = 0;
    const essayer = async () => {
      const ok = await toutEstEnCache().catch(() => false);
      if (fin) return;
      if (ok) setPret(true);
      else minuterie = window.setTimeout(essayer, 2000);
    };
    void essayer();
    return () => {
      fin = true;
      window.clearTimeout(minuterie);
    };
  }, []);
  return pret;
}
