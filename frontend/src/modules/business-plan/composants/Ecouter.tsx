// NEC-CC-23 (NEC-173): "Écouter" reads the explanations aloud with the phone's own French voice.
// Nothing recorded, nothing sent, no audio file: only window.speechSynthesis. No French voice = no button.
// One reading at a time in the whole module (module-level singleton).
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Icone } from './Icones';

type Synth = Pick<SpeechSynthesis, 'speak' | 'cancel' | 'getVoices'> & Partial<Pick<SpeechSynthesis, 'addEventListener' | 'removeEventListener' | 'speaking'>>;

const ATTENTE_VOIX_MS = 3000;
const LONGUEUR_MAX = 220;

/** Removes "(?)", emojis and pictograms, the button labels, and collapses whitespace (line breaks kept as one "\n"). */
export function nettoyerTexte(texte: string): string {
  return texte
    .replace(/\(\s*\?\s*\)/g, ' ')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}\u{2190}-\u{21FF}\u{2460}-\u{24FF}\u{2500}-\u{25FF}\u{2700}-\u{27BF}]/gu, ' ')
    .replace(/[ \t\f\v  ]+/g, ' ')
    .replace(/ *\n[\s]*/g, '\n')
    .trim();
}

/** Sentences to queue (Chrome Android cuts long utterances): split on . ! ? : and line breaks, long ones on , ; */
export function decouperPhrases(texte: string): string[] {
  const phrases = nettoyerTexte(texte)
    .split(/\n+|(?<=[.!?:…])\s+/)
    .map((p) => p.trim())
    .filter((p) => /[\p{L}\p{N}]/u.test(p));
  return phrases.flatMap((p) => (p.length > LONGUEUR_MAX ? p.split(/(?<=[,;])\s+/).filter(Boolean) : [p]));
}

/** Visible text of a block, without the parts marked data-ne-pas-lire (the button itself). */
export function texteALire(el: HTMLElement): string {
  const exclus = Array.from(el.querySelectorAll<HTMLElement>('[data-ne-pas-lire]'));
  if (typeof el.innerText === 'string') {
    // Hidden for the synchronous read only (no paint in between): innerText then follows the layout.
    const avant = exclus.map((x) => x.style.display);
    exclus.forEach((x) => (x.style.display = 'none'));
    const t = el.innerText;
    exclus.forEach((x, i) => (x.style.display = avant[i]));
    return nettoyerTexte(t);
  }
  const copie = el.cloneNode(true) as HTMLElement;
  copie.querySelectorAll('[data-ne-pas-lire]').forEach((x) => x.remove());
  return nettoyerTexte(copie.textContent ?? '');
}

/** French voice: lang fr*, an installed one first (works offline), then fr-FR. */
export function choisirVoix(voix: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const fr = voix.filter((v) => (v.lang || '').toLowerCase().replace('_', '-').startsWith('fr'));
  if (!fr.length) return null;
  const note = (v: SpeechSynthesisVoice) => (v.localService ? 2 : 0) + (v.lang.replace('_', '-').toLowerCase() === 'fr-fr' ? 1 : 0);
  return [...fr].sort((a, b) => note(b) - note(a))[0];
}

function synthese(): Synth | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') return null;
  return window.speechSynthesis;
}

/** Waits up to 3 s for a French voice (voices load asynchronously). null = not available: no button. */
export function trouverVoix(synth: Synth | null = synthese(), delai = ATTENTE_VOIX_MS): Promise<SpeechSynthesisVoice | null> {
  if (!synth) return Promise.resolve(null);
  const tout = () => {
    try {
      return choisirVoix(synth.getVoices() ?? []);
    } catch {
      return null;
    }
  };
  const tout1 = tout();
  if (tout1) return Promise.resolve(tout1);
  return new Promise((resolve) => {
    let fini = false;
    const finir = (v: SpeechSynthesisVoice | null) => {
      if (fini) return;
      fini = true;
      clearInterval(sonde);
      clearTimeout(limite);
      synth.removeEventListener?.('voiceschanged', essai);
      resolve(v);
    };
    const essai = () => {
      const v = tout();
      if (v) finir(v);
    };
    synth.addEventListener?.('voiceschanged', essai);
    const sonde = setInterval(essai, 250);
    const limite = setTimeout(() => finir(tout()), delai);
  });
}

// ---- Singleton: one reading at a time in the whole module ----
interface Lecture {
  jeton: number;
  surArret: () => void;
  surveillance: ReturnType<typeof setInterval> | null;
}
let courante: Lecture | null = null;
let compteur = 0;
let ecouteVisibilite = false;

/** Stops any reading (the other button goes back to "Écouter"). Always cancels the speech. */
export function arreterLecture(synth: Synth | null = synthese()) {
  const c = courante;
  courante = null;
  if (c) {
    if (c.surveillance) clearInterval(c.surveillance);
    c.surArret();
  }
  try {
    synth?.cancel();
  } catch {
    /* nothing to stop */
  }
}

/** Reads the sentences; any other reading is stopped first. Returns the token of this reading. */
export function demarrerLecture(
  phrases: string[],
  surArret: () => void,
  { synth = synthese(), voix = null }: { synth?: Synth | null; voix?: SpeechSynthesisVoice | null } = {}
): number | null {
  arreterLecture(synth);
  if (!synth || !phrases.length) {
    surArret();
    return null;
  }
  if (!ecouteVisibilite && typeof document !== 'undefined') {
    ecouteVisibilite = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) arreterLecture();
    });
  }
  const jeton = ++compteur;
  const chemin = typeof location !== 'undefined' ? location.pathname : '';
  const lecture: Lecture = { jeton, surArret, surveillance: null };
  courante = lecture;
  // Route change (any router, popstate or pushState): stop.
  if (typeof location !== 'undefined') {
    lecture.surveillance = setInterval(() => {
      if (location.pathname !== chemin && courante?.jeton === jeton) arreterLecture(synth);
    }, 300);
  }
  phrases.forEach((texte, i) => {
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    if (voix) u.voice = voix;
    if (i === phrases.length - 1) {
      u.onend = () => {
        if (courante?.jeton === jeton) arreterLecture(null);
      };
    }
    u.onerror = () => {
      if (courante?.jeton === jeton) arreterLecture(synth);
    };
    synth.speak(u);
  });
  return jeton;
}

export function lectureEnCours(jeton: number | null): boolean {
  return jeton !== null && courante?.jeton === jeton;
}

/** French voice of this device (null while searching, and when there is none). */
export function useVoixFrancaise(): SpeechSynthesisVoice | null {
  const [voix, setVoix] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    let vivant = true;
    void trouverVoix().then((v) => {
      if (vivant) setVoix(v);
    });
    return () => {
      vivant = false;
    };
  }, []);
  return voix;
}

/** Small secondary button "Écouter" / "Arrêter" reading the visible text of `cible`. Not rendered without a French voice. */
export function BoutonEcouter({ cible, className = '' }: { cible: RefObject<HTMLElement | null>; className?: string }) {
  const voix = useVoixFrancaise();
  const [jeton, setJeton] = useState<number | null>(null);
  const lit = jeton !== null;
  const jetonRef = useRef<number | null>(null);
  jetonRef.current = jeton;

  // Unmount (screen left, Aide closed): stop this reading only.
  useEffect(
    () => () => {
      if (lectureEnCours(jetonRef.current)) arreterLecture();
    },
    []
  );

  if (!voix) return null;

  const toucher = () => {
    if (lit && lectureEnCours(jeton)) {
      arreterLecture();
      return;
    }
    const el = cible.current;
    if (!el) return;
    let j: number | null = null;
    j = demarrerLecture(decouperPhrases(texteALire(el)), () => setJeton((x) => (x === j ? null : x)), { voix });
    setJeton(j);
  };

  return (
    <button
      type="button"
      data-ne-pas-lire=""
      aria-pressed={lit}
      onClick={toucher}
      className={`bp-ecouter inline-flex shrink-0 items-center gap-1.5 min-h-[44px] px-3 rounded-full border text-[14px] font-bold leading-none ${
        lit ? 'border-violet bg-violet text-white' : 'border-violet/30 bg-white/80 text-violet active:bg-violetClair'
      } ${className}`}
    >
      <Icone nom={lit ? 'arret' : 'hautParleur'} className="w-[18px] h-[18px]" />
      {lit ? 'Arrêter' : 'Écouter'}
    </button>
  );
}
