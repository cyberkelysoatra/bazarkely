/**
 * <EauSplitFlap> — affichage « tableau de gare » (split-flap).
 *
 * Rend une chaîne caractère par caractère ; à chaque changement de `text`, chaque
 * position se comporte comme un volet de panneau d'affichage : elle FAIT DÉFILER les
 * caractères intermédiaires (dans l'ordre canonique, toujours VERS L'AVANT, en boucle
 * circulaire) du caractère courant jusqu'au caractère cible. Un léger décalage (stagger)
 * entre positions donne l'effet de « vague ».
 *
 * - Aucune dépendance externe : CSS/JS pur (un seul `setInterval` actif PENDANT la
 *   transition, arrêté dès qu'elle est finie → zéro re-render au repos).
 * - Largeur stable : chaque cellule réserve la largeur du glyphe CIBLE (spacer invisible) ;
 *   le glyphe qui défile est posé en absolu, centré → aucun tremblement horizontal.
 * - `prefers-reduced-motion` → changement direct sans animation.
 * - `alphabet` (optionnel) borne les volets aux caractères réellement utilisés (union des
 *   deux faces) → rouleaux courts et lisibles, façon vrai panneau de gare.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

/** Ordre canonique des volets : espace → chiffres → ponctuation → minuscules (+ accents) → MAJUSCULES (+ accents). */
const CANON = (() => {
  const p: string[] = [' '];
  for (let c = 48; c <= 57; c++) p.push(String.fromCharCode(c)); // 0-9
  p.push('.', ',', '%', '³', '/', '·', '(', ')', '-', '—', '+', ':');
  for (let c = 97; c <= 122; c++) p.push(String.fromCharCode(c)); // a-z
  p.push(...'éèêëàâäîïôöûùüçñ'.split(''));
  for (let c = 65; c <= 90; c++) p.push(String.fromCharCode(c)); // A-Z
  p.push(...'ÉÈÊËÀÂÄÎÏÔÖÛÙÜÇÑ'.split(''));
  return p;
})();
const CANON_RANK = new Map(CANON.map((c, i) => [c, i] as const));
/** Rang canonique d'un caractère (les inconnus se rangent après l'alphabet, plutôt que d'être sautés). */
const rankOf = (ch: string) => CANON_RANK.get(ch) ?? CANON.length + ch.charCodeAt(0);

/** Construit l'alphabet (volets) trié dans l'ordre canonique à partir des caractères présents. */
function buildAlphabet(chars: string): string[] {
  const set = new Set<string>([' ']);
  for (const ch of chars) set.add(ch);
  return Array.from(set).sort((a, b) => rankOf(a) - rankOf(b));
}

const TICK_MS = 34; // durée d'un cran (passage d'un volet au suivant)
const STAGGER_TICKS = 1; // décalage « vague » entre deux positions voisines

/** Espace insécable pour que les cellules-espace réservent bien une largeur. */
const vis = (c: string) => (c === ' ' || c === '') ? ' ' : c;

/** Hook `prefers-reduced-motion` (réutilisable par les cartes qui animent). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

export default function EauSplitFlap({
  text,
  alphabet,
  className,
  ariaLabel,
}: {
  text: string;
  /** Caractères autorisés (sinon dérivés du texte courant). Passer l'union des deux faces. */
  alphabet?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const reduced = usePrefersReducedMotion();

  // Alphabet stable (volets) : prop explicite > caractères du texte courant.
  const flaps = useMemo(() => buildAlphabet(alphabet ?? text), [alphabet, text]);
  const rank = useMemo(() => new Map(flaps.map((c, i) => [c, i] as const)), [flaps]);
  const idxOf = (ch: string) => rank.get(ch) ?? 0; // 0 === ' '

  const [glyphs, setGlyphs] = useState<string[]>(() => text.split(''));
  const dispRef = useRef<number[]>(text.split('').map(idxOf));
  const targRef = useRef<number[]>(dispRef.current.slice());
  const tickRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const lastTextRef = useRef(text);

  const stop = () => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  // Nettoyage au démontage (pas de fuite de timer).
  useEffect(() => stop, []);

  useEffect(() => {
    // Pas de relance si le texte n'a pas changé et qu'aucune anim n'est en cours.
    if (text === lastTextRef.current && timerRef.current == null) return;
    lastTextRef.current = text;

    const target = text.split('').map(idxOf);

    if (reduced) {
      stop();
      dispRef.current = target.slice();
      targRef.current = target.slice();
      setGlyphs(text.split(''));
      return;
    }

    // Aligner les longueurs en complétant par des espaces (le volet vide aligne les positions).
    const len = Math.max(dispRef.current.length, target.length);
    const disp = dispRef.current.slice();
    while (disp.length < len) disp.push(0);
    while (target.length < len) target.push(0);
    dispRef.current = disp;
    targRef.current = target;
    tickRef.current = 0;

    if (timerRef.current == null) {
      timerRef.current = window.setInterval(() => {
        tickRef.current += 1;
        const t = tickRef.current;
        const cur = dispRef.current;
        const tg = targRef.current;
        const n = flaps.length;
        let done = true;
        for (let i = 0; i < cur.length; i++) {
          if (cur[i] === tg[i]) continue; // volet déjà arrivé → immobile
          if (t < i * STAGGER_TICKS) {
            done = false; // attend son tour (vague)
            continue;
          }
          cur[i] = (cur[i] + 1) % n; // avance d'un cran vers l'avant
          if (cur[i] !== tg[i]) done = false;
        }
        setGlyphs(cur.map((k) => flaps[k]));
        if (done) {
          stop();
          dispRef.current = tg.slice();
          setGlyphs(tg.map((k) => flaps[k]));
        }
      }, TICK_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reduced, flaps]);

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span className="sr-only">{ariaLabel ?? text}</span>
      <span aria-hidden="true" style={{ whiteSpace: 'pre' }}>
        {glyphs.map((g, i) => {
          const spacer = flaps[targRef.current[i]] ?? g;
          return (
            <span key={i} style={{ position: 'relative', display: 'inline-block', textAlign: 'center' }}>
              <span style={{ visibility: 'hidden' }}>{vis(spacer)}</span>
              <span style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center' }}>{vis(g)}</span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
