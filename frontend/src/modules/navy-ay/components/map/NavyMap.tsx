/**
 * NAVY ay map, shared by every NAVY screen (same props since phase 1B, navyMapTypes.ts).
 *
 * Phase 2C1: the vector map of Nosy Be (NavyMapVector, MapLibre + island file kept for
 * offline use), loaded lazily so the other modules do not carry it. When the phone cannot
 * draw it (no WebGL, old phone, engine failing at start), NavyMap switches by itself to
 * the previous Leaflet map (NavyMapLeaflet, unchanged).
 */
import { Component, lazy, Suspense, useState, type ReactNode } from 'react';
import type { NavyMapProps } from './navyMapTypes';

export type { NavyMapApi, NavyMapMarker, NavyMapPadding, NavyMapProps, NavyMapShop, NavyMapVehicle } from './navyMapTypes';

const NavyMapVector = lazy(() => import('./NavyMapVector'));
const NavyMapLeaflet = lazy(() => import('./NavyMapLeaflet'));

/** Test switch (DevTools): sessionStorage.navy_map_force_leaflet = '1' shows the fallback. */
export const FORCE_LEAFLET_KEY = 'navy_map_force_leaflet';

/** True when this phone can draw the vector map (WebGL available, fallback not forced). */
export function canUseVectorMap(doc: Pick<Document, 'createElement'> = document, storage?: Pick<Storage, 'getItem'> | null): boolean {
  try {
    const s = storage === undefined ? window.sessionStorage : storage;
    if (s?.getItem(FORCE_LEAFLET_KEY) === '1') return false;
  } catch {
    /* storage blocked: ignore the switch */
  }
  try {
    const canvas = doc.createElement('canvas') as HTMLCanvasElement;
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Any error thrown by the vector engine (chunk not loaded, render crash) → Leaflet. */
class VectorBoundary extends Component<{ onFail: (reason: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onFail(error instanceof Error ? error.message : String(error));
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Last resort (both engines unavailable, e.g. code not on the phone yet): never break the page. */
class MapUnavailableBoundary extends Component<{ heightClass?: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[NavyMap] no map engine available:', error instanceof Error ? error.message : String(error));
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="status"
        className={`w-full ${this.props.heightClass ?? 'h-[55vh] min-h-[280px] max-h-[520px]'} rounded-2xl border border-navyay-charcoal/15 flex items-center justify-center p-4 text-center text-sm text-navyay-charcoal/80`}
        style={{ background: '#EFEDE6' }}
      >
        Carte indisponible pour l’instant. Reconnectez-vous puis rouvrez cet écran.
      </div>
    );
  }
}

export default function NavyMap(props: NavyMapProps) {
  const [engine, setEngine] = useState<'vector' | 'leaflet'>(() => (canUseVectorMap() ? 'vector' : 'leaflet'));
  const fail = (reason: string) => {
    console.warn('[NavyMap] vector map unavailable, Leaflet fallback:', reason);
    setEngine('leaflet');
  };
  const placeholder = (
    <div
      className={props.frame === 'full' ? 'w-full h-full' : `w-full ${props.heightClass ?? 'h-[55vh] min-h-[280px] max-h-[520px]'} rounded-2xl border border-navyay-charcoal/15`}
      style={{ background: '#EFEDE6' }}
      aria-hidden="true"
    />
  );
  return (
    <MapUnavailableBoundary heightClass={props.frame === 'full' ? 'h-full' : props.heightClass}>
      <Suspense fallback={placeholder}>
        {engine === 'vector' ? (
          <VectorBoundary onFail={fail}>
            <NavyMapVector {...props} onEngineFail={fail} />
          </VectorBoundary>
        ) : (
          <NavyMapLeaflet {...props} />
        )}
      </Suspense>
    </MapUnavailableBoundary>
  );
}
