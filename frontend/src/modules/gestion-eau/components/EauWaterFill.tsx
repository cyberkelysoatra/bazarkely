/**
 * EauWaterFill — calque d'eau animé (SVG pur, charte AHUVI) pour le fond de la carte KPI
 * « Stock actuel ». La carte est une COUPE VERTICALE du bassin : le haut = sommet physique,
 * l'eau monte selon le stock réel.
 *
 * Décoratif (`aria-hidden`, `pointer-events-none`) : ne capte aucun clic. Le NIVEAU est piloté
 * EXCLUSIVEMENT par `waterFraction` (fraction de hauteur de carte, NON plafonnée — un niveau
 * > flotteur fait monter l'eau au-dessus du trait 100 % ; seul le DESSIN est borné à 1). Les
 * vagues ne font qu'onduler la surface (amplitude faible). À l'apparition, l'eau monte de 0
 * jusqu'au niveau (ease-out ≈ 1,2 s) sans jamais le dépasser ; un changement re-tween en
 * douceur. `prefers-reduced-motion: reduce` → niveau + traits posés, statiques.
 *
 * Couleur : `EAU_CHART.eauFill` (vert d'eau AHUVI) — jamais d'hex en dur ici. Traits flotteur
 * (« 100 % ») et trop-plein rendus en overlay HTML pour rester nets (le SVG est étiré).
 */
import { useEffect, useRef } from 'react';
import { cn } from '../../../utils/cn';
import { EAU_CHART } from './EauUi';

const VB_W = 100;
const VB_H = 100;
const STEP = 4;

// Constante de temps du tween de niveau : ~4·TAU ≈ 1,2 s (ease-out exponentiel, sans dépassement).
const LEVEL_TAU = 0.3;
// Ralentissement des vagues (×1,5 = mouvement plus doux).
const WAVE_SLOWDOWN = 1.5;

type WaveSpec = { amp: number; cycles: number; speed: number; opacity: number };

// Deux vagues de surface superposées (phases/vitesses/amplitudes distinctes = effet de profondeur).
// Opacités calibrées pour garder le texte lisible (contraste WCAG ≥ 4,5:1) là où corps + 2 vagues
// se cumulent sous la surface : encres AHUVI ≥ 4,88:1 sur le fond résultant.
const WAVES: WaveSpec[] = [
  { amp: 1.33, cycles: 1.3, speed: 0.45, opacity: 0.22 },
  { amp: 1.83, cycles: 1.8, speed: -0.7, opacity: 0.3 },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

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

export default function EauWaterFill({
  waterFraction,
  flotteurFraction,
  tropPleinFraction,
  className,
}: {
  waterFraction: number;
  flotteurFraction?: number | null;
  tropPleinFraction?: number | null;
  className?: string;
}) {
  // Niveau dessiné borné à 1 (l'eau ne sort pas de la carte) ; le pilotage reste `waterFraction`.
  const target = clamp01(Number.isFinite(waterFraction) ? waterFraction : 0);

  const bodyRef = useRef<SVGRectElement>(null);
  const waveRefs = useRef<Array<SVGPathElement | null>>([]);
  const levelRef = useRef(0);
  const targetRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  targetRef.current = target;

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const paint = (level: number, phase: number) => {
      const surfaceY = (1 - level) * VB_H;
      bodyRef.current?.setAttribute('y', String(surfaceY));
      bodyRef.current?.setAttribute('height', String(VB_H - surfaceY));
      WAVES.forEach((spec, i) => {
        waveRefs.current[i]?.setAttribute('d', wavePath(level, spec, reduce ? 0 : phase * spec.speed));
      });
    };

    if (reduce) {
      levelRef.current = targetRef.current;
      paint(targetRef.current, 0);
      return;
    }

    let last: number | null = null;
    let phase = 0;

    const tick = (now: number) => {
      if (last == null) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const f = 1 - Math.exp(-dt / LEVEL_TAU);
      levelRef.current += (targetRef.current - levelRef.current) * f;

      phase += (dt * 2 * Math.PI) / WAVE_SLOWDOWN; // défilement ralenti
      paint(levelRef.current, phase);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  // Traits de repère (overlay HTML non déformé) : tracés seulement si fournis ET strictement < 1
  // (à 1, le repère = haut de carte → inutile de le tracer).
  const showFlotteur = flotteurFraction != null && flotteurFraction > 0 && flotteurFraction < 1;
  const showTropPlein = tropPleinFraction != null && tropPleinFraction > 0 && tropPleinFraction < 1;

  return (
    <div aria-hidden className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" className="block">
        {/* Corps translucide (lisibilité du texte préservée). */}
        <rect ref={bodyRef} x={0} y={VB_H} width={VB_W} height={0} fill={EAU_CHART.eauFill} fillOpacity={0.16} />
        {WAVES.map((spec, i) => (
          <path
            key={i}
            ref={(el) => {
              waveRefs.current[i] = el;
            }}
            d=""
            fill={EAU_CHART.eauFill}
            fillOpacity={spec.opacity}
          />
        ))}
      </svg>

      {/* Trait trop-plein (discret) — sous le flotteur dans le DOM pour passer dessous visuellement. */}
      {showTropPlein && (
        <div
          className="absolute left-0 right-0"
          style={{
            top: `${(1 - (tropPleinFraction as number)) * 100}%`,
            borderTop: `1px dashed ${EAU_CHART.eauFill}`,
            opacity: 0.4,
          }}
        />
      )}

      {/* Trait flotteur (100 %) + micro-étiquette. */}
      {showFlotteur && (
        <div
          className="absolute left-0 right-0"
          style={{ top: `${(1 - (flotteurFraction as number)) * 100}%` }}
        >
          <div style={{ borderTop: `1px dashed ${EAU_CHART.eauFill}`, opacity: 0.7 }} />
          <span
            className="absolute right-1 -top-2 rounded bg-white/70 px-1 font-medium leading-none text-ahuvi-forest"
            style={{ fontSize: '10px' }}
          >
            100%
          </span>
        </div>
      )}
    </div>
  );
}
