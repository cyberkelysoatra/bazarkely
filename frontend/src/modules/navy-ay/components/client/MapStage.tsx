/**
 * NAVY ay client screens on the map (phase 2C2): the map covers the space between the
 * shared header (unchanged) and the bottom bar; panels appear above it in a fade with a
 * slight slide, then fade out to let the map come back (prefers-reduced-motion: no
 * movement). Zoom / recentre buttons are drawn OUTSIDE the map, above the panel.
 *
 * The stage is `position: fixed` between the measured bottom of the <header> and the top
 * of the bottom bar: nothing scrolls, the page never scrolls sideways.
 *
 * Phase 2C3 (decision 53): useFollowCamera frames continuously the person (or the
 * departure) and the vehicle, zooming in as it comes closer; a gesture of the person on
 * the map (move, pinch, wheel, zoom buttons) pauses it, a "Recentrer" button appears and
 * the framing comes back by itself 6 seconds after the last gesture.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Crosshair, LocateFixed, Minus, Plus } from 'lucide-react';
import type { NavyMapApi, NavyMapPadding } from '../map/NavyMap';
import type { LatLng } from '../../types/partner';

/** Top (header bottom) and bottom (bottom bar height) of the free space, in px. */
export function useMapFrame(): { top: number; bottom: number } {
  const [frame, setFrame] = useState({ top: 89, bottom: 64 });
  useLayoutEffect(() => {
    const measure = () => {
      const header = document.querySelector('header');
      const top = header ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
      // Bottom bar: the fixed element glued to the bottom of the screen (mobile only).
      let bottom = 0;
      document.querySelectorAll<HTMLElement>('.fixed.bottom-0').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.height < 200 && r.width > window.innerWidth * 0.8 && Math.abs(r.bottom - window.innerHeight) < 2) {
          bottom = Math.max(bottom, Math.round(window.innerHeight - r.top));
        }
      });
      setFrame((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    const header = document.querySelector('header');
    if (header) ro?.observe(header);
    window.addEventListener('resize', measure);
    const t = window.setInterval(measure, 1500);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      window.clearInterval(t);
    };
  }, []);
  return frame;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Panel above the map. A new `panelKey` fades the previous panel out (200 ms) then the
 * new one in (fade + 14 px slide). `onHeight` reports the visible height (for framing).
 */
export function MapSheet({
  panelKey,
  children,
  onHeight,
  tall = false,
  small = false,
}: {
  panelKey: string;
  children: ReactNode;
  onHeight?: (h: number) => void;
  tall?: boolean;
  /** Folded panel (the map takes most of the screen). */
  small?: boolean;
}) {
  const [shownKey, setShownKey] = useState(panelKey);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const lastRef = useRef<ReactNode>(children);
  const boxRef = useRef<HTMLElement | null>(null);

  if (shownKey === panelKey && phase === 'in') lastRef.current = children;

  useEffect(() => {
    if (panelKey === shownKey) return;
    if (prefersReducedMotion()) {
      setShownKey(panelKey);
      return;
    }
    setPhase('out');
    const t = window.setTimeout(() => {
      setShownKey(panelKey);
      setPhase('in');
      if (boxRef.current) boxRef.current.scrollTop = 0;
    }, 200);
    return () => window.clearTimeout(t);
  }, [panelKey, shownKey]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || !onHeight) return;
    const report = () => onHeight(Math.round(el.getBoundingClientRect().height));
    report();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [onHeight]);

  const content = shownKey === panelKey && phase === 'in' ? children : lastRef.current;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-end px-3 pb-3 pt-14">
      <section
        ref={boxRef}
        aria-live="polite"
        className={`navy-sheet relative pointer-events-auto w-full max-w-[460px] overflow-y-auto overscroll-contain rounded-[22px] bg-white/95 p-4 text-navyay-charcoal shadow-[0_10px_30px_rgba(46,46,46,0.18)] backdrop-blur-md ${
          small ? 'max-h-[34%]' : tall ? 'max-h-[82%]' : 'max-h-[66%]'
        } ${phase === 'out' ? 'navy-sheet-out' : 'navy-sheet-in'}`}
      >
        {content}
      </section>
    </div>
  );
}

/** Round buttons above the panel, right side: zoom in / out, recentre on "Vous". */
export function MapButtons({
  bottom,
  onZoom,
  onRecenter,
  recenterLabel = 'Recentrer sur ma position',
}: {
  bottom: number;
  onZoom: (delta: number) => void;
  onRecenter?: () => void;
  recenterLabel?: string;
}) {
  const base =
    'pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full shadow-[0_4px_14px_rgba(46,46,46,0.22)] focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow';
  const cls = `${base} bg-white/95 text-navyay-charcoal backdrop-blur-md hover:bg-white`;
  return (
    <div className="pointer-events-none absolute right-3 z-20 flex flex-col gap-2 transition-[bottom] duration-200" style={{ bottom }}>
      {onRecenter && (
        <button type="button" className={`${base} bg-navyay-charcoal text-navyay-yellow hover:bg-navyay-charcoal/90`} onClick={onRecenter} aria-label={recenterLabel} title={recenterLabel}>
          <Crosshair className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      <button type="button" className={cls} onClick={() => onZoom(1)} aria-label="Zoomer" title="Zoomer">
        <Plus className="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="button" className={cls} onClick={() => onZoom(-1)} aria-label="Dézoomer" title="Dézoomer">
        <Minus className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** CSS of the panels (fade + slight slide, none with reduced motion). */
export const STAGE_CSS = `
.navy-sheet-in{animation:navySheetIn .28s ease both}
.navy-sheet-out{opacity:0;transform:translateY(14px);transition:opacity .2s ease,transform .2s ease}
@keyframes navySheetIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.navy-pulse{animation:navyPulse 1.8s infinite}
@keyframes navyPulse{70%{box-shadow:0 0 0 8px rgba(47,122,78,0)}100%{box-shadow:0 0 0 0 rgba(47,122,78,0)}}
@media (prefers-reduced-motion: reduce){.navy-sheet-in{animation:none}.navy-sheet-out{transition:none}.navy-pulse{animation:none}}
`;

/** The stage: fixed map background + overlays (children). `onMapGesture`: the person moved or zoomed the map. */
export function MapStage({ map, children, onMapGesture }: { map: ReactNode; children: ReactNode; onMapGesture?: () => void }) {
  const { top, bottom } = useMapFrame();
  const down = useRef<{ x: number; y: number } | null>(null);
  const pointers = useRef(0);
  const gesture = onMapGesture
    ? {
        onPointerDownCapture: (e: ReactPointerEvent) => {
          pointers.current += 1;
          down.current = { x: e.clientX, y: e.clientY };
          if (pointers.current > 1) onMapGesture(); // pinch
        },
        onPointerMoveCapture: (e: ReactPointerEvent) => {
          // A tap is not a gesture; a finger that moves the map is.
          if (down.current && Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y) > 8) onMapGesture();
        },
        onPointerUpCapture: () => {
          pointers.current = Math.max(0, pointers.current - 1);
          if (!pointers.current) down.current = null;
        },
        onPointerCancelCapture: () => {
          pointers.current = 0;
          down.current = null;
        },
        onWheelCapture: () => onMapGesture(),
        onDoubleClickCapture: () => onMapGesture(),
      }
    : {};
  return (
    <div className="fixed inset-x-0 z-0 overflow-hidden text-navyay-charcoal" style={{ top, bottom, background: '#EFEDE6' }} data-navy-stage="">
      <style>{STAGE_CSS}</style>
      <div className="absolute inset-0 isolate z-0" {...gesture}>
        {map}
      </div>
      {children}
    </div>
  );
}

/** Seconds of calm after the person's last gesture before the camera follows again. */
export const FOLLOW_RESUME_MS = 6000;
const FOLLOW_EVERY_MS = 1200;
/** Closest reasonable zoom while following (vector zoom). */
export const FOLLOW_MAX_ZOOM = 17;

/**
 * Camera that follows (decision 53). `points()` gives what must stay in view (vehicle +
 * person or departure); `padding()` the free space (panel below). Framing every 1.2 s
 * with a soft 1.1 s move.
 */
export function useFollowCamera({
  active,
  apiRef,
  points,
  padding,
}: {
  active: boolean;
  apiRef: MutableRefObject<NavyMapApi | null>;
  points: () => LatLng[];
  padding: () => NavyMapPadding;
}): { paused: boolean; gesture: () => void; recenter: () => void } {
  const [paused, setPaused] = useState(false);
  const lastGesture = useRef(0);
  const latest = useRef({ points, padding });
  latest.current = { points, padding };

  const frame = useCallback(() => {
    const pts = latest.current.points();
    if (pts.length) apiRef.current?.fitPoints(pts, latest.current.padding(), FOLLOW_MAX_ZOOM, 1100);
  }, [apiRef]);

  useEffect(() => {
    if (!active) {
      setPaused(false);
      return;
    }
    frame();
    const t = window.setInterval(() => {
      if (lastGesture.current && Date.now() - lastGesture.current < FOLLOW_RESUME_MS) return;
      if (lastGesture.current) {
        lastGesture.current = 0;
        setPaused(false);
      }
      frame();
    }, FOLLOW_EVERY_MS);
    return () => window.clearInterval(t);
  }, [active, frame]);

  const gesture = useCallback(() => {
    if (!active) return;
    lastGesture.current = Date.now();
    setPaused(true);
  }, [active]);

  const recenter = useCallback(() => {
    lastGesture.current = 0;
    setPaused(false);
    frame();
  }, [frame]);

  return { paused, gesture, recenter };
}

/** "Recentrer" (mock-up .recenter): shown while the follow is paused by a gesture. */
export function RecenterPill({ onClick, bottom }: { onClick: () => void; bottom: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ bottom }}
      className="absolute left-1/2 z-20 inline-flex min-h-[44px] -translate-x-1/2 items-center gap-2 rounded-full bg-navyay-charcoal px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_30px_rgba(46,46,46,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
    >
      <LocateFixed className="h-4 w-4 text-navyay-yellow" aria-hidden="true" />
      Recentrer
    </button>
  );
}
