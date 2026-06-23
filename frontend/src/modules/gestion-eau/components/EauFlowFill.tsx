/**
 * EauFlowFill — calque de CHUTE D'EAU descendante (canvas, charte AHUVI) pour le fond d'une
 * carte KPI. SYMÉTRIQUE d'EauWaterFill : au lieu d'une eau qui monte selon un stock, l'eau
 * pompée se DÉVERSE du haut vers le bas (fins filets verticaux recyclés en boucle) et s'accumule
 * en une lame translucide en BAS de la carte.
 *
 * L'INTENSITÉ (densité + vitesse des filets + hauteur de la lame) suit `flowFraction` ∈ [0..1]
 * (déjà borné par l'appelant) : plus il croît, plus il y a de filets, plus ils sont rapides, plus
 * la lame est haute. À débit nul (`flowFraction <= 0`) : tout est figé (pompes arrêtées) — aucun
 * filet, aucun mouvement, au plus une lame résiduelle nulle.
 *
 * Décoratif (`aria-hidden`, `pointer-events-none`) : ne capte aucun clic. Couleur EXCLUSIVEMENT
 * `EAU_CHART.eauFill` (jamais de bleu ni d'hex en dur). Opacités faibles (filets ≈ 0,14–0,18 ;
 * lame ≈ 0,12) → le texte de la carte reste parfaitement lisible (encres AHUVI ≥ 4,5:1, même
 * exigence qu'EauWaterFill). Une seule boucle `requestAnimationFrame`, nettoyée au démontage ;
 * nombre de filets plafonné (perf mobile). Re-tween en douceur quand `flowFraction` change.
 * `prefers-reduced-motion: reduce` → état statique (lame + quelques filets figés, aucun mouvement).
 */
import { useEffect, useRef } from 'react';
import { cn } from '../../../utils/cn';
import { EAU_CHART } from './EauUi';

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Constante de temps du tween d'intensité (~4·TAU ≈ 1,2 s, ease-out exponentiel sans dépassement),
// alignée sur le tween de niveau d'EauWaterFill → famille visuelle cohérente entre les 2 cartes.
const FLOW_TAU = 0.3;

// Plafond de filets (perf mobile) ; le nombre RÉELLEMENT dessiné = round(flow · MAX_FILETS).
const MAX_FILETS = 14;
// Hauteur max de la lame d'eau accumulée en bas, en fraction de la hauteur de carte (bornée à 1).
const LAME_MAX_FRAC = 0.28;
// Vitesse de chute de base (px/s) à plein régime, modulée par l'intensité.
const FALL_SPEED = 120;

// Spécif. d'un filet, DÉTERMINISTE par index (fractions du nombre d'or) → positions stables entre
// rendus, sans Math.random (pas de scintillement au remount).
type Filet = { xFrac: number; w: number; lenFrac: number; speed: number; offset: number; opacity: number };

function makeFilets(): Filet[] {
  const out: Filet[] = [];
  for (let i = 0; i < MAX_FILETS; i++) {
    const a = (i * 0.61803398875) % 1; // abscisse
    const b = (i * 0.7548776662) % 1; // largeur / longueur
    const c = (i * 0.38196601125) % 1; // phase initiale
    out.push({
      xFrac: 0.06 + a * 0.88, // évite les bords (gouttière + icône)
      w: 1.6 + b * 1.6, // 1,6–3,2 px
      lenFrac: 0.16 + b * 0.2, // 16–36 % de la hauteur de carte
      speed: 0.8 + ((i * 0.5) % 1) * 0.6, // 0,8–1,4 ×
      offset: c, // décalage de phase (0..1 période)
      opacity: 0.14 + (1 - b) * 0.04, // 0,14–0,18
    });
  }
  return out;
}

const FILETS = makeFilets();

/** #RRGGBB → "r,g,b" (DÉRIVÉ du token EAU_CHART, jamais un hex écrit en dur ici). */
function rgbOf(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
}

const EAU_RGB = rgbOf(EAU_CHART.eauFill);

export default function EauFlowFill({
  flowFraction,
  className,
}: {
  flowFraction: number;
  className?: string;
}) {
  // Intensité bornée à 1 (l'eau ne déborde pas de la carte) ; le pilotage reste `flowFraction`.
  const target = clamp01(Number.isFinite(flowFraction) ? flowFraction : 0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef(0);
  const targetRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  targetRef.current = target;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;

    // Dessine une image : lame d'eau en bas (surface ondulée) + filets descendants. `flow` = intensité
    // dessinée, `elapsed` = temps écoulé (s). En `reduce`, surface plate + filets figés (offset).
    const paint = (flow: number, elapsed: number) => {
      ctx.clearRect(0, 0, W, H);
      if (flow <= 0.001) return; // pompes à l'arrêt → rien dessiné

      // Lame d'eau accumulée en bas (hauteur ∝ intensité), surface légèrement ondulée.
      const lameH = flow * LAME_MAX_FRAC * H;
      if (lameH > 0.5) {
        const surfaceY = H - lameH;
        const amp = reduce ? 0 : Math.min(2.2, 1 + flow);
        const k = (2 * Math.PI) / W;
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, surfaceY);
        for (let x = 0; x <= W; x += 4) {
          ctx.lineTo(x, surfaceY + amp * Math.sin(k * 1.5 * x + elapsed * 1.6));
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fillStyle = `rgba(${EAU_RGB},0.12)`;
        ctx.fill();
      }

      // Filets descendants : nombre ∝ intensité, vitesse modulée par l'intensité.
      const count = Math.max(1, Math.round(flow * MAX_FILETS));
      const speedScale = 0.4 + 0.6 * flow;
      ctx.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        const f = FILETS[i];
        const len = f.lenFrac * H;
        const period = H + len;
        const v = FALL_SPEED * f.speed * speedScale;
        const travel = reduce ? f.offset * period : (elapsed * v + f.offset * period) % period;
        const yTop = -len + travel;
        const x = f.xFrac * W;
        // Dégradé le long du filet : transparent aux extrémités, marqué au centre → effet de streak
        // qui « tombe » (sans clignotement). Couleur unique = vert d'eau AHUVI.
        const grad = ctx.createLinearGradient(x, yTop, x, yTop + len);
        grad.addColorStop(0, `rgba(${EAU_RGB},0)`);
        grad.addColorStop(0.5, `rgba(${EAU_RGB},${f.opacity})`);
        grad.addColorStop(1, `rgba(${EAU_RGB},0)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = f.w;
        ctx.beginPath();
        ctx.moveTo(x, yTop);
        ctx.lineTo(x, yTop + len);
        ctx.stroke();
      }
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) paint(targetRef.current, 0); // statique : re-peindre à chaque resize
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap);

    if (reduce) {
      flowRef.current = targetRef.current;
      // Déjà peint en statique par resize() ; aucune boucle d'animation.
      return () => {
        ro?.disconnect();
      };
    }

    let last: number | null = null;
    let elapsed = 0;

    const tick = (now: number) => {
      if (last == null) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;

      const f = 1 - Math.exp(-dt / FLOW_TAU);
      flowRef.current += (targetRef.current - flowRef.current) * f;

      paint(flowRef.current, elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      ro?.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
