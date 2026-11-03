// Cards of the receipt (VC-42, decision of Joël of 03/11/2026): « Gardez 1saKELY sur votre
// téléphone » and the notifications question. Pure, unit tested in telephone.test.ts.

/** « Plus tard » hides the installation card for 30 days on this device. */
export const PLUS_TARD_MS = 30 * 24 * 3600 * 1000;
/** On Android, no beforeinstallprompt within 3 s: the browser cannot install (WhatsApp...). */
export const ATTENTE_INVITATION_MS = 3000;

export function plusTardActif(at: number | null, maintenant: number = Date.now()): boolean {
  return at !== null && Number.isFinite(at) && maintenant - at >= 0 && maintenant - at < PLUS_TARD_MS;
}

export interface EtatTelephone {
  /** display-mode standalone, or appinstalled seen. */
  installee: boolean;
  /** Messaging app's built-in browser (user agent). */
  interne: boolean;
  android: boolean;
  /** Plain Chrome on Android (a missing prompt then means: already installed or not offered). */
  chromeAndroid: boolean;
  /** beforeinstallprompt kept and still usable. */
  invitation: boolean;
  /** 3 s passed since the page opened without any prompt. */
  attenteFinie: boolean;
  /** Time of the last « Plus tard », null if never. */
  plusTardAt: number | null;
  /** « Installer 1saKELY » finished or « Plus tard » tapped on this page. */
  installationRepondue: boolean;
  /** Notification and PushManager exist. */
  notificationsPossibles: boolean;
  permission: 'default' | 'granted' | 'denied';
  /** The question was already answered on this device. */
  notificationsRepondues: boolean;
  /** vc_admin_* answered: 'non' only lets the question show (never Joël, never an unknown answer). */
  pilote: 'oui' | 'non' | 'erreur' | null;
}

export interface CartesRecu {
  installation: 'installer' | 'chrome' | null;
  notifications: boolean;
}

export function cartesRecu(e: EtatTelephone, maintenant: number = Date.now()): CartesRecu {
  let installation: CartesRecu['installation'] = null;
  if (!e.installee && !e.installationRepondue && !plusTardActif(e.plusTardAt, maintenant)) {
    if (e.interne) installation = 'chrome';
    else if (e.invitation) installation = 'installer';
    // Android browser that never offered to install (not Chrome itself): it cannot install.
    else if (e.android && !e.chromeAndroid && e.attenteFinie) installation = 'chrome';
  }
  // Waiting for a possible prompt: the question waits too (never two cards flickering).
  const enAttente = !e.installee && !e.installationRepondue && !plusTardActif(e.plusTardAt, maintenant) && !e.interne && !e.invitation && !e.attenteFinie;
  const notifications =
    installation === null &&
    !enAttente &&
    !e.interne &&
    e.notificationsPossibles &&
    e.permission !== 'denied' &&
    !e.notificationsRepondues &&
    e.pilote === 'non';
  return { installation, notifications };
}
