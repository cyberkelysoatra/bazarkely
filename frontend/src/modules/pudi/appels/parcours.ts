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

export function visiteur(): string {
  if (visiteurMemoire) return visiteurMemoire;
  try {
    let v = localStorage.getItem(CLE);
    if (!v) {
      v = nouvelId();
      localStorage.setItem(CLE, v);
    }
    visiteurMemoire = v;
    try {
      for (const e of JSON.parse(localStorage.getItem(CLE_ENVOYES) ?? '[]') as string[]) envoyes.add(e);
    } catch {
      /* list rebuilt */
    }
  } catch {
    // No storage: one id per page load.
    visiteurMemoire = nouvelId();
  }
  return visiteurMemoire;
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
  const id = visiteur();
  if (envoyes.has(etape) || enCours.has(etape)) return;
  enCours.add(etape);
  withTimeout(
    fetch(`${SUPABASE_URL}/rest/v1/rpc/pudi_noter_etape`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_visiteur: id, p_etape: etape, p_canal: lireCanal() }),
      keepalive: true
    })
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
