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

// Deux fines colonnes d'eau qui s'écoulent dans la GOUTTIÈRE gauche de la carte (les 16 px de
// `p-4` avant le texte) → aucun chevauchement du contenu ni de l'icône, contraste des textes intact.
// `cx`/`w` en px (positions fixes, hors viewBox SVG étiré). `period` = pas du motif de gouttes ;
// l'écoulement = translation de la couche de reflets d'exactement `period` px (boucle sans couture).
// Chaque colonne est COUPÉE à la ligne d'eau vivante : son conteneur a `top:0` et une `height`
// remise à jour à chaque frame = `surfaceY %` (hauteur sèche au-dessus de la surface). Sous les
// vagues, plus de colonne → l'eau « se déverse » dans le bassin (la chute visible raccourcit
// quand le niveau monte). `overflow-hidden` rogne déjà les reflets en bas de la zone sèche.
type StreamSpec = { cx: number; w: number; period: number; duration: number };
const STREAMS: StreamSpec[] = [
  { cx: 5, w: 3, period: 24, duration: 2100 },
  { cx: 11, w: 3, period: 20, duration: 2500 },
];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Dégradé répété de gouttes claires (reflets) le long d'une colonne — visible sur blanc ET sur teal.
 *  Goutte nettement marquée (pic ~0,9, flancs dégradés) pour que la chute se PERÇOIVE clairement
 *  sans clignoter (un seul segment clair par période, le reste transparent). */
function streamHighlight(period: number): string {
  return (
    `repeating-linear-gradient(180deg,` +
    ` rgba(255,255,255,0) 0px,` +
    ` rgba(255,255,255,0) ${period - 16}px,` +
    ` rgba(255,255,255,0.55) ${period - 12}px,` +
    ` rgba(255,255,255,0.9) ${period - 9}px,` +
    ` rgba(255,255,255,0.55) ${period - 6}px,` +
    ` rgba(255,255,255,0) ${period - 2}px,` +
    ` rgba(255,255,255,0) ${period}px)`
  );
}

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
  waterLabel,
  flotteurFraction,
  tropPleinFraction,
  className,
}: {
  waterFraction: number;
  waterLabel?: string | null;
  flotteurFraction?: number | null;
  tropPleinFraction?: number | null;
  className?: string;
}) {
  // Niveau dessiné borné à 1 (l'eau ne sort pas de la carte) ; le pilotage reste `waterFraction`.
  const target = clamp01(Number.isFinite(waterFraction) ? waterFraction : 0);

  const bodyRef = useRef<SVGRectElement>(null);
  const waveRefs = useRef<Array<SVGPathElement | null>>([]);
  const streamRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Conteneurs des colonnes : leur hauteur est recoupée à la surface de l'eau à chaque frame.
  const streamBoxRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Étiquette « % flottante » : son `top` est recalé sur la surface vivante à chaque frame.
  const waterLabelRef = useRef<HTMLDivElement>(null);
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
      // Couper chaque colonne à la ligne d'eau : zone sèche = `surfaceY %` de la hauteur de carte
      // (VB_H = 100 → surfaceY est directement un pourcentage). Sous la surface, height→0 : la
      // colonne disparaît dans le bassin. Quand le niveau monte, surfaceY baisse → chute raccourcie.
      const dryPct = `${surfaceY.toFixed(2)}%`;
      streamBoxRefs.current.forEach((el) => {
        if (el) el.style.height = dryPct;
      });
      // L'étiquette % « flotte » sur la ligne d'eau : son centre suit la surface vivante.
      if (waterLabelRef.current) waterLabelRef.current.style.top = dryPct;
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

  // Écoulement vertical continu des 2 colonnes (Web Animations API, auto-contenu, nettoyé au démontage).
  // `prefers-reduced-motion: reduce` → gouttes posées statiques (aucune animation déclenchée).
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const anims = STREAMS.map((s, i) => {
      const el = streamRefs.current[i];
      if (!el || typeof el.animate !== 'function') return null;
      return el.animate(
        [{ transform: 'translateY(0px)' }, { transform: `translateY(${s.period}px)` }],
        { duration: s.duration, iterations: Infinity, easing: 'linear' },
      );
    });

    return () => {
      anims.forEach((a) => a?.cancel());
    };
  }, []);

  // Traits de repère (overlay HTML non déformé) : tracés seulement si fournis ET strictement < 1
  // (à 1, le repère = haut de carte → inutile de le tracer).
  const showFlotteur = flotteurFraction != null && flotteurFraction > 0 && flotteurFraction < 1;
  const showTropPlein = tropPleinFraction != null && tropPleinFraction > 0 && tropPleinFraction < 1;
  const showWaterLabel = waterLabel != null && waterLabel !== '';

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

      {/* Deux colonnes d'eau qui coulent dans la gouttière gauche (entre le bord et le texte `p-4`). */}
      {STREAMS.map((s, i) => (
        <div
          key={`stream-${i}`}
          ref={(el) => {
            streamBoxRefs.current[i] = el;
          }}
          className="absolute top-0 overflow-hidden"
          style={{ left: `${s.cx - s.w / 2}px`, width: `${s.w}px`, height: '0%', borderRadius: '9999px' }}
        >
          {/* Corps « plus marqué » (opacité soutenue) — vert d'eau AHUVI, jamais de bleu. */}
          <div className="absolute inset-0" style={{ backgroundColor: EAU_CHART.eauFill, opacity: 0.58 }} />
          {/* Reflets clairs qui descendent (lisibles sur blanc comme sur teal). */}
          <div
            ref={(el) => {
              streamRefs.current[i] = el;
            }}
            className="absolute left-0 right-0"
            style={{
              top: `-${s.period}px`,
              height: `calc(100% + ${s.period * 2}px)`,
              background: streamHighlight(s.period),
            }}
          />
        </div>
      ))}

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
          {/* Étiquette posée JUSTE sous le trait (top 2px, sans le chevaucher) et rapprochée de
              l'icône. L'icône est un bouton `md:w-12` (48 px) + `p-4` (16 px) → occupe 64 px depuis
              le bord droit au breakpoint md. `right: 4.25rem` (68 px) place le bord droit de la
              pastille à 4 px à gauche de l'icône au PLUS étroit (md, 48 px) → jamais de chevauchement
              à aucune largeur, jeu de sécurité conservé (vérifié en navigateur). */}
          <span
            className="absolute rounded bg-white/70 px-1 font-medium leading-none text-ahuvi-forest"
            style={{ fontSize: '10px', right: '4.25rem', top: '2px' }}
          >
            100%
          </span>
        </div>
      )}

      {/* Étiquette % « flottant sur l'eau » : suit la ligne de flotaison vivante (top recalé à
          chaque frame dans paint()), centrée sur la surface (translateY -50 %). Mêmes alignement
          (right: 4.25rem), taille (10px) et style de pastille que le repère « 100 % » au-dessus. */}
      {showWaterLabel && (
        <div ref={waterLabelRef} className="absolute left-0 right-0" style={{ top: '100%' }}>
          <span
            className="absolute rounded bg-white/70 px-1 font-medium leading-none text-ahuvi-forest"
            style={{ fontSize: '10px', right: '4.25rem', top: 0, transform: 'translateY(-50%)' }}
          >
            {waterLabel}
          </span>
        </div>
      )}
    </div>
  );
}
