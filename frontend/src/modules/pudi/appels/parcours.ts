// PUDI-CC-11: anonymous visit funnel. A random id per browser (localStorage pudi_visiteur, no
// account, no number), each step sent once, fire-and-forget: never awaited by the screens, errors
// ignored, nothing queued offline. Off before publication (test votes) and during JOEL's preview.
import { SUPABASE_ANON_KEY, SUPABASE_URL, withTimeout } from './supabaseClient';
import { lireCanal } from './provenance';
import { ETAPES_PARCOURS, type EtapeParcours } from '../utils/apercu';

const CLE = 'pudi_visiteur';
const CLE_ENVOYES = 'pudi_parcours_envoyes';
let visiteurMemoire: string | null = null;
/** null while the state of the consultation is unknown: steps wait in memory (never stored). */
let actif: boolean | null = null;
const enAttente: EtapeParcours[] = [];
const envoyes = new Set<string>();
const enCours = new Set<string>();

function nouvelId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${h().slice(1)}-${h()}${h()}${h()}`;
}

// PUDI-CC-16.2: the id is the device identity of the anonymous measures. Kept in localStorage and,
// as fallbacks, in a first-party cookie (pudi_v, 400 days, path /pudi) and IndexedDB: whichever
// survives restores the others. Random only: never derived from the device, never linked to an
// account, a number or an e-mail on the device.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const valide = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

function lireCookie(): string | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)pudi_v=([^;]+)/);
    return m && valide(m[1]) ? m[1] : null;
  } catch {
    return null;
  }
}

function ecrireCookie(v: string): void {
  try {
    const sur = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `pudi_v=${v}; Max-Age=${400 * 86400}; Path=/pudi; SameSite=Lax${sur}`;
  } catch {
    /* cookies off */
  }
}

function base(): Promise<IDBDatabase | null> {
  return new Promise((ok) => {
    try {
      const o = indexedDB.open('pudi_appareil', 1);
      o.onupgradeneeded = () => o.result.createObjectStore('v');
      o.onsuccess = () => ok(o.result);
      o.onerror = () => ok(null);
    } catch {
      ok(null);
    }
  });
}

/** Reads the id kept in IndexedDB, or writes `v` there. */
async function idb(v?: string): Promise<string | null> {
  const db = await base();
  if (!db) return null;
  return new Promise((ok) => {
    try {
      const t = db.transaction('v', v ? 'readwrite' : 'readonly');
      const q = v ? t.objectStore('v').put(v, 'id') : t.objectStore('v').get('id');
      q.onsuccess = () => ok(v ?? (valide(q.result) ? q.result : null));
      q.onerror = () => ok(null);
      t.oncomplete = () => db.close();
    } catch {
      ok(null);
    }
  });
}

function retenir(v: string): void {
  visiteurMemoire = v;
  try {
    localStorage.setItem(CLE, v);
  } catch {
    /* memory only */
  }
  ecrireCookie(v);
}

/** Id known synchronously (localStorage, then the cookie); a new one only when both are empty. */
let tire = false;
export function visiteur(): string {
  if (visiteurMemoire) return visiteurMemoire;
  let v: string | null = null;
  try {
    v = localStorage.getItem(CLE);
    for (const e of JSON.parse(localStorage.getItem(CLE_ENVOYES) ?? '[]') as string[]) envoyes.add(e);
  } catch {
    /* no storage or list rebuilt */
  }
  if (!valide(v)) v = lireCookie();
  if (!valide(v)) {
    v = nouvelId();
    tire = true;
  }
  retenir(v);
  return v;
}

/** Same id once IndexedDB was read: an id kept there wins over a freshly drawn one. */
let pret: Promise<string> | null = null;
export function visiteurPret(): Promise<string> {
  if (!pret) {
    const v = visiteur();
    pret = (typeof indexedDB === 'undefined' ? Promise.resolve(null) : idb())
      .then(async (garde) => {
        if (garde && garde !== v && tire) {
          retenir(garde);
          return garde;
        }
        if (garde !== v) await idb(v);
        return v;
      })
      .catch(() => v);
  }
  return pret;
}

/** Set by the shared state: true only when the consultation is published and no preview is on. */
export function activerParcours(ok: boolean | null): void {
  actif = ok;
  if (ok === null) return;
  const attente = enAttente.splice(0).sort((a, b) => ETAPES_PARCOURS.indexOf(a) - ETAPES_PARCOURS.indexOf(b));
  if (ok) attente.forEach(noterEtape);
}

export function parcoursActif(): boolean {
  return actif === true;
}

export function noterEtape(etape: EtapeParcours): void {
  if (actif === null) {
    if (!enAttente.includes(etape)) enAttente.push(etape);
    return;
  }
  if (!actif) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  visiteur();
  if (envoyes.has(etape) || enCours.has(etape)) return;
  enCours.add(etape);
  visiteurPret()
    .then((id) =>
      withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/rpc/pudi_noter_etape`, {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_visiteur: id, p_etape: etape, p_canal: lireCanal() }),
          keepalive: true
        })
      )
    )
    .then((r) => {
      if (!r.ok) return;
      envoyes.add(etape);
      try {
        localStorage.setItem(CLE_ENVOYES, JSON.stringify([...envoyes]));
      } catch {
        /* memory only */
      }
    })
    .catch(() => {
      /* ignored: the measure never disturbs the visitor */
    })
    .finally(() => enCours.delete(etape));
}
