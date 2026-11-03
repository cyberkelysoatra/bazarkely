// Client notifications (VC-42, VC-37, RM8 client lines): Web Push subscription on the /validation/
// service worker registration, recorded by push_subscribe (copy of the single-flight logic of
// src/services/notificationService.ts, nothing imported from the host). Asked once per device from
// the receipt; renewed silently at each start when this device said yes and permission is granted.
// Never for Joël: the main app already subscribes him (a second subscription would double his
// notifications).
import { rpc } from './api';

// VAPID PUBLIC key (public by design), same key and fallback as the host.
const CLE_VAPID: string =
  import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BCueEt0Afrm5pqbfJdFl1P0X6gBu09qaevQeUCbl_d9RKHdMJi9dm2g371nToX58U441iLURDpfHPl5DC_7JwDk';

/** This device answered the question (« oui » / « non »): never asked twice. */
export const CLE_REPONSE = 'vc-notifications-reponse';

export function notificationsPossibles(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}

export function reponseNotifications(): string | null {
  try {
    return localStorage.getItem(CLE_REPONSE);
  } catch {
    return null;
  }
}

function noterReponse(r: 'oui' | 'non'): void {
  try {
    localStorage.setItem(CLE_REPONSE, r);
  } catch {
    // Private mode: the question may come back on this device, nothing else breaks.
  }
}

function octets(base64: string): Uint8Array {
  const bourrage = '='.repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + bourrage).replace(/-/g, '+').replace(/_/g, '/'));
  const o = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) o[i] = brut.charCodeAt(i);
  return o;
}

function memesOctets(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const v = new Uint8Array(a);
  return v.length === b.length && v.every((x, i) => x === b[i]);
}

function delai<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('delai')), ms))]);
}

/** Registration of the module's own service worker (scope /validation/), registered if missing. */
async function inscription(): Promise<ServiceWorkerRegistration> {
  let reg = await navigator.serviceWorker.getRegistration('/validation/');
  if (!reg || reg.scope !== `${location.origin}/validation/`) reg = await navigator.serviceWorker.register('/validation/sw.js', { scope: '/validation/' });
  if (reg.active) return reg;
  const enAttente = reg.installing ?? reg.waiting;
  if (enAttente) {
    await delai(
      new Promise<void>((ok) => {
        enAttente.addEventListener('statechange', () => enAttente.state === 'activated' && ok());
      }),
      10000
    );
  }
  return reg;
}

let enVol: Promise<boolean> | null = null;

/**
 * Subscribes this browser on the /validation/ scope and records it (upsert on endpoint). Never asks
 * the permission; without it, does nothing. Single flight: two concurrent calls would replace each
 * other's subscription and leave a dead endpoint (host, 26/09/2026).
 */
export function abonner(): Promise<boolean> {
  if (!enVol) enVol = faireAbonnement().finally(() => (enVol = null));
  return enVol;
}

async function faireAbonnement(): Promise<boolean> {
  try {
    if (!notificationsPossibles() || Notification.permission !== 'granted' || !navigator.onLine) return false;
    const reg = await inscription();
    const cle = octets(CLE_VAPID);
    let abo = await reg.pushManager.getSubscription();
    if (abo && !memesOctets(abo.options.applicationServerKey, cle)) {
      // Subscribed with another key: unusable by send-push.
      await abo.unsubscribe();
      abo = null;
    }
    if (!abo) abo = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cle });
    const j = abo.toJSON();
    await rpc<unknown>('push_subscribe', {
      p_endpoint: j.endpoint,
      p_p256dh: j.keys?.p256dh,
      p_auth: j.keys?.auth,
      p_user_agent: navigator.userAgent
    });
    return true;
  } catch {
    // Never blocks the page: the follow-up stays visible in the app.
    return false;
  }
}

/** « Oui, me prévenir »: the browser asks the permission, then the subscription. */
export async function accepterNotifications(): Promise<'accordee' | 'refusee'> {
  noterReponse('oui');
  let permission: NotificationPermission = Notification.permission;
  try {
    if (permission === 'default') permission = await Notification.requestPermission();
  } catch {
    permission = Notification.permission;
  }
  if (permission !== 'granted') {
    noterReponse('non');
    return 'refusee';
  }
  await abonner();
  return 'accordee';
}

export function refuserNotifications(): void {
  noterReponse('non');
}

/** At each start: renewed silently (key changed → new subscription) when this device said yes. */
export function renouvelerAbonnement(): void {
  if (reponseNotifications() !== 'oui' || !notificationsPossibles() || Notification.permission !== 'granted') return;
  void abonner();
}
