/** Détection d'environnement PWA (installation / plateforme). Logique légère. */

/** true si l'app tourne déjà en mode installé (standalone). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  // iOS Safari expose navigator.standalone
  const iosStandalone = (window.navigator as any).standalone === true;
  return Boolean(mql || iosStandalone);
}

/** true si plateforme iOS (iPhone/iPad/iPod) — installation manuelle « Ajouter à l'écran d'accueil ». */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se présente comme Mac avec écran tactile
  const iPadOS = ua.includes('Macintosh') && 'ontouchend' in document;
  return iOSDevice || iPadOS;
}

/** Événement beforeinstallprompt (typage minimal, non standard dans lib.dom). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
