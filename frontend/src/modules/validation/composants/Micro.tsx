// Dictation microphone of the text fields (VC-13): press and hold to dictate, slide up to lock
// (« Mains libres »), a simple tap shows « Maintenez pour parler ». Engine: the browser's
// SpeechRecognition (fr-FR), interim results written live; the text is APPENDED after what is
// already written and the field stays editable. Offline, blocked or missing engine: grey button and
// the matching message. No sound is ever kept or sent. Rules: utils/dictee.ts.
import { useEffect, useRef, useState, type PointerEvent as EvPointeur, type ReactNode } from 'react';
import { BoutonChrome } from './BoutonChrome';
import {
  DUREE_INDICE_MS,
  SEUIL_MAINTIEN_MS,
  TEXTES_DICTEE,
  ajouterDictee,
  doitVerrouiller,
  messageBloque,
  messageSansMoteur,
  navigateurDe,
  texteEntendu,
  type MessageMicro
} from '../utils/dictee';

interface Reconnaissance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function moteur(): (new () => Reconnaissance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconnaissance; webkitSpeechRecognition?: new () => Reconnaissance };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function useEnLigne(): boolean {
  const [enLigne, setEnLigne] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine);
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => {
      window.removeEventListener('online', maj);
      window.removeEventListener('offline', maj);
    };
  }, []);
  return enLigne;
}

type Etat = 'repos' | 'appui' | 'ecoute' | 'verrou';

const MICRO = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

/**
 * Microphone of one field: `bouton` goes in the field (or the slot of the discussion bar),
 * `message` under it. `valeur` / `changer` are the field's own state; `max` its limit.
 */
export function useMicro({ valeur, changer, max }: { valeur: string; changer: (v: string) => void; max: number }): { bouton: ReactNode; message: ReactNode; actif: boolean } {
  const enLigne = useEnLigne();
  const [etat, setEtat] = useState<Etat>('repos');
  const [avis, setAvis] = useState<MessageMicro | null>(null);
  const reco = useRef<Reconnaissance | null>(null);
  const debut = useRef({ t: 0, y: 0 });
  const etatRef = useRef<Etat>('repos');
  const minuterie = useRef<number | null>(null);
  const indice = useRef<number | null>(null);
  const valeurRef = useRef(valeur);
  const changerRef = useRef(changer);
  valeurRef.current = valeur;
  changerRef.current = changer;

  const poser = (e: Etat) => {
    etatRef.current = e;
    setEtat(e);
  };

  const arreter = () => {
    if (minuterie.current !== null) window.clearTimeout(minuterie.current);
    minuterie.current = null;
    const r = reco.current;
    reco.current = null;
    if (r) {
      r.onresult = null;
      try {
        r.stop();
      } catch {
        // Already stopped by the browser.
      }
    }
    poser('repos');
  };

  // Leaving the page while dictating: the engine is stopped, nothing is kept.
  useEffect(
    () => () => {
      if (minuterie.current !== null) window.clearTimeout(minuterie.current);
      if (indice.current !== null) window.clearTimeout(indice.current);
      const r = reco.current;
      reco.current = null;
      if (r) {
        r.onresult = null;
        r.onend = null;
        r.onerror = null;
        try {
          r.abort();
        } catch {
          // Nothing to stop.
        }
      }
    },
    []
  );
  // Network lost while dictating: stop (the engine needs the network).
  useEffect(() => {
    if (!enLigne && etatRef.current !== 'repos') arreter();
    if (enLigne && avis?.type === 'hors_ligne') setAvis(null);
  }, [enLigne]); // eslint-disable-line react-hooks/exhaustive-deps

  const demarrer = () => {
    const M = moteur();
    if (!M) {
      setAvis(messageSansMoteur());
      poser('repos');
      return;
    }
    const r = new M();
    r.lang = 'fr-FR';
    r.continuous = true;
    r.interimResults = true;
    const avant = valeurRef.current;
    r.onresult = (e) => changerRef.current(ajouterDictee(avant, texteEntendu(e.results), max));
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setAvis(messageBloque(navigateurDe(navigator.userAgent)));
      else if (e.error === 'network') setAvis({ type: 'hors_ligne', texte: TEXTES_DICTEE.horsLigne, chrome: false });
    };
    r.onend = () => {
      if (reco.current === r) {
        reco.current = null;
        poser('repos');
      }
    };
    reco.current = r;
    setAvis(null);
    poser(etatRef.current === 'verrou' ? 'verrou' : 'ecoute');
    try {
      r.start();
    } catch {
      reco.current = null;
      poser('repos');
    }
  };

  const montrerIndice = () => {
    setAvis({ type: 'indice', texte: TEXTES_DICTEE.indice, chrome: false });
    if (indice.current !== null) window.clearTimeout(indice.current);
    indice.current = window.setTimeout(() => {
      indice.current = null;
      setAvis((a) => (a?.type === 'indice' ? null : a));
    }, DUREE_INDICE_MS);
  };

  const surAppui = (e: EvPointeur<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    // Locked: a tap stops.
    if (etatRef.current === 'verrou') {
      arreter();
      return;
    }
    if (!enLigne) {
      setAvis({ type: 'hors_ligne', texte: TEXTES_DICTEE.horsLigne, chrome: false });
      return;
    }
    if (!moteur()) {
      setAvis(messageSansMoteur());
      return;
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture refused: the gestures still work on the button itself.
    }
    debut.current = { t: Date.now(), y: e.clientY };
    poser('appui');
    minuterie.current = window.setTimeout(() => {
      minuterie.current = null;
      if (etatRef.current === 'appui') demarrer();
    }, SEUIL_MAINTIEN_MS);
  };

  const surDeplacement = (e: EvPointeur<HTMLButtonElement>) => {
    const s = etatRef.current;
    if (s !== 'appui' && s !== 'ecoute') return;
    if (doitVerrouiller(debut.current.y - e.clientY)) {
      if (s === 'appui') {
        // Slid up before the hold threshold: lock and start at once.
        if (minuterie.current !== null) window.clearTimeout(minuterie.current);
        minuterie.current = null;
        poser('verrou');
        demarrer();
      } else poser('verrou');
    }
  };

  const surRelachement = () => {
    const s = etatRef.current;
    if (s === 'appui') {
      // Released before the hold threshold: a simple tap.
      if (minuterie.current !== null) window.clearTimeout(minuterie.current);
      minuterie.current = null;
      poser('repos');
      montrerIndice();
    } else if (s === 'ecoute') arreter();
  };

  const ecoute = etat === 'ecoute' || etat === 'verrou';
  const gris = !enLigne;
  const libelle = gris ? 'Dictée indisponible sans réseau' : etat === 'verrou' ? 'Arrêter la dictée' : 'Maintenir pour dicter';
  const bouton = (
    <button
      type="button"
      aria-label={libelle}
      aria-pressed={ecoute}
      aria-disabled={gris || undefined}
      title={libelle}
      onPointerDown={surAppui}
      onPointerMove={surDeplacement}
      onPointerUp={surRelachement}
      onPointerCancel={surRelachement}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        // Keyboard: Enter or Space toggles the locked dictation.
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        if (etatRef.current === 'verrou' || etatRef.current === 'ecoute') arreter();
        else if (!enLigne) setAvis({ type: 'hors_ligne', texte: TEXTES_DICTEE.horsLigne, chrome: false });
        else {
          poser('verrou');
          demarrer();
        }
      }}
      className={`vc-micro w-11 h-11 flex-none rounded-full flex items-center justify-center ${gris ? 'bg-[#cbd5e1] text-[#64748b]' : ecoute ? 'vc-micro-actif bg-[#dc2626] text-white' : 'bg-ciel text-white'}`}
      data-micro={gris ? 'hors_ligne' : etat}
    >
      {MICRO}
    </button>
  );
  const texte = ecoute ? (etat === 'verrou' ? TEXTES_DICTEE.mainsLibres : TEXTES_DICTEE.enCours) : avis?.texte;
  const message = texte ? (
    <div className="flex flex-col gap-2" data-micro-message={ecoute ? etat : avis?.type}>
      <p
        className={`text-[13px] m-0 leading-[1.45] ${ecoute ? 'text-danger font-semibold' : avis?.type === 'hors_ligne' ? 'text-[#64748b]' : avis?.type === 'indice' ? 'text-nuit font-semibold' : 'text-[#78350f] font-semibold'}`}
        role="status"
        aria-live="polite"
      >
        {texte}
      </p>
      {!ecoute && avis?.chrome && <BoutonChrome />}
    </div>
  ) : null;
  return { bouton, message, actif: ecoute };
}
