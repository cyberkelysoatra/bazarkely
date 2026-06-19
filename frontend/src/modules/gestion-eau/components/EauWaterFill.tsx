/**
 * EauWaterFill — calque d'eau animé (SVG pur, AHUVI teal) pour le fond d'une carte KPI.
 *
 * Décoratif (`aria-hidden`, `pointer-events-none`) : ne capte aucun clic, ne change pas le
 * flux. Le NIVEAU de l'eau est piloté EXCLUSIVEMENT par `ratio` (0..1) ; les vagues ne font
 * qu'onduler la surface (amplitude faible), jamais monter le niveau. À l'apparition, l'eau
 * monte de 0 jusqu'à `ratio` (ease-out ≈ 1,2 s) sans jamais le dépasser ; un changement de
 * `ratio` re-tween en douceur. `prefers-reduced-motion: reduce` → niveau posé, statique.
 *
 * Couleur : `currentColor` (le conteneur porte `text-ahuvi-teal`) — aucun hex arbitraire,
 * la profondeur vient des opacités de remplissage superposées. Aucune dépendance nouvelle.
 */
import { useEffect, useRef } from 'react';
import { cn } from '../../../utils/cn';

// Repère interne du SVG (étiré via preserveAspectRatio="none" pour épouser la carte).
const VB_W = 100;
const VB_H = 100;
const STEP = 4; // pas d'échantillonnage horizontal des vagues (en unités viewBox)

// Constante de temps du tween de niveau : ~4·TAU ≈ 1,2 s pour s'établir (ease-out exponentiel,
// sans dépassement — l'eau approche le niveau réel par valeurs inférieures).
const LEVEL_TAU = 0.3;

type WaveSpec = { amp: number; cycles: number; speed: number; opacity: number };

// Deux vagues de surface superposées (phases/vitesses/amplitudes distinctes = effet de profondeur).
const WAVES: WaveSpec[] = [
  { amp: 4, cycles: 1.3, speed: 0.45, opacity: 0.28 },
  { amp: 5.5, cycles: 1.8, speed: -0.7, opacity: 0.4 },
];

/** Path SVG d'une vague : ligne sinusoïdale en surface puis remplissage jusqu'au bas. */
function wavePath(level: number, spec: WaveSpec, phase: number): string {
  const surfaceY = (1 - level) * VB_H;
  const k = (spec.cycles * 2 * Math.PI) / VB_W;
  let d = '';
  for (let x = 0; x <= VB_W; x += STEP) {
    const y = surfaceY + spec.amp * Math.sin(k * x + phase);
    d += x === 0 ? `M ${x},${y.toFixed(2)}` : ` L ${x},${y.toFixed(2)}`;
  }
  d += ` L ${VB_W},${VB_H} L 0,${VB_H} Z`;
  return d;
}

export default function EauWaterFill({ ratio, className }: { ratio: number; className?: string }) {
  const target = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));

  const bodyRef = useRef<SVGRectElement>(null);
  const waveRefs = useRef<Array<SVGPathElement | null>>([]);
  const levelRef = useRef(0); // niveau animé courant (0..1), monte de 0 au montage
  const targetRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  // Tenir la cible à jour sans relancer la boucle (le tween la suit en douceur).
  targetRef.current = target;

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Pose le corps + les vagues à un niveau donné (vagues à plat = phase fixe).
    const paint = (level: number, phase: number) => {
      const surfaceY = (1 - level) * VB_H;
      bodyRef.current?.setAttribute('y', String(surfaceY));
      bodyRef.current?.setAttribute('height', String(VB_H - surfaceY));
      WAVES.forEach((spec, i) => {
        waveRefs.current[i]?.setAttribute('d', wavePath(level, spec, reduce ? 0 : phase * spec.speed));
      });
    };

    if (reduce) {
      // Mouvement réduit : niveau posé directement, surface plate, aucune boucle.
      levelRef.current = targetRef.current;
      paint(targetRef.current, 0);
      return;
    }

    let last: number | null = null;
    let phase = 0;

    const tick = (now: number) => {
      if (last == null) last = now;
      const dt = Math.min(0.05, (now - last) / 1000); // borne anti-saut (onglet en arrière-plan)
      last = now;

      // Tween exponentiel ease-out vers la cible : approche par valeurs inférieures, sans dépassement.
      const f = 1 - Math.exp(-dt / LEVEL_TAU);
      levelRef.current += (targetRef.current - levelRef.current) * f;

      phase += dt * 2 * Math.PI; // défilement continu des vagues
      paint(levelRef.current, phase);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  return (
    <div
      aria-hidden
      className={cn('absolute inset-0 pointer-events-none overflow-hidden text-ahuvi-teal', className)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="block"
      >
        {/* Corps translucide (lisibilité du texte préservée). */}
        <rect ref={bodyRef} x={0} y={VB_H} width={VB_W} height={0} fill="currentColor" fillOpacity={0.2} />
        {WAVES.map((spec, i) => (
          <path
            key={i}
            ref={(el) => {
              waveRefs.current[i] = el;
            }}
            d=""
            fill="currentColor"
            fillOpacity={spec.opacity}
          />
        ))}
      </svg>
    </div>
  );
}
