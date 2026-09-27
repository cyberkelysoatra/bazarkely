/**
 * NAVY ay map, vector engine (phase 2C1): MapLibre drawing the island file of Nosy Be
 * (navyMapFile.ts) with the NAVY colours (navyMapStyle.ts). Same props as before
 * (navyMapTypes.ts), so the screens do not change.
 *
 * - zones: pale polygons with their name (symbol layer, hosted glyphs);
 * - markers: grocers / destinations, HTML markers identical to the Leaflet ones;
 * - pin + onPinChange: placed by a tap, draggable;
 * - draft + onDraftChange: polygon being drawn, each point draggable;
 * - "Ma position": ONE GPS reading per press, never a continuous tracking.
 * North always up (no rotation, no tilt); two fingers zoom, one finger moves the map,
 * never the page (touch-action: none on the container).
 * Offline: the island file kept on the phone; a clear message when it is not there yet.
 * Loaded lazily by NavyMap.tsx, which falls back to Leaflet if this engine fails.
 */
import { useEffect, useRef, useState } from 'react';
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  addProtocol,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Protocol, type PMTiles } from 'pmtiles';
import { Crosshair, Loader2, WifiOff } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import type { LatLng } from '../../types/partner';
import { NOSY_BE_CENTER } from '../../utils/geo';
import type { NavyMapMarker, NavyMapProps } from './navyMapTypes';
import { GLYPH_FONTS, loadGlyph, openMapFile, type MapFileState } from './navyMapFile';
import { MAP_COLORS, navyMapStyle } from './navyMapStyle';
import { boundsOf, draftGeoJSON, toLngLat, zonesGeoJSON } from './navyMapGeo';

const CHARCOAL = MAP_COLORS.charcoal;
const YELLOW = MAP_COLORS.yellow;
/** MapLibre zooms are one level below Leaflet's for the same scale (512 px tiles). */
const ISLAND_ZOOM = 11;
const PIN_ZOOM = 15;
const LOCATE_ZOOM = 16;
const MAX_FIT_ZOOM = 15;
const BOUNDS: [[number, number], [number, number]] = [
  [47.85, -13.75],
  [48.7, -12.95],
];

let protocol: Protocol | null = null;

/** Worker, pmtiles:// and navyglyphs:// registered once for the whole app. */
function ensureProtocols(): Protocol {
  if (protocol) return protocol;
  setWorkerUrl(workerUrl);
  protocol = new Protocol();
  addProtocol('pmtiles', protocol.tilev4 as unknown as Parameters<typeof addProtocol>[1]);
  addProtocol('navyglyphs', async (params, ctrl) => {
    const m = /^navyglyphs:\/\/(.+)\/(\d+-\d+)$/.exec(params.url);
    if (!m) throw new Error(`bad glyph url ${params.url}`);
    const asked = decodeURIComponent(m[1]).split(',')[0].trim();
    // Only Regular and Medium are hosted: any other stack falls back on them.
    const font = GLYPH_FONTS.includes(asked) ? asked : /Medium|Bold/i.test(asked) ? 'Noto Sans Medium' : 'Noto Sans Regular';
    return { data: await loadGlyph(font, m[2], ctrl.signal) };
  });
  return protocol;
}

/** Background download finished: later tiles are read from the phone copy. */
function swapToLocal(local: PMTiles) {
  ensureProtocols().add(local);
}

function el(html: string, label?: string): HTMLDivElement {
  const d = document.createElement('div');
  d.innerHTML = html;
  if (label) {
    d.title = label;
    d.setAttribute('aria-label', label);
  }
  return d;
}

function pinElement(): HTMLDivElement {
  return el(
    `<div style="position:relative;width:36px;height:44px;cursor:grab">
      <svg viewBox="0 0 36 44" width="36" height="44" aria-hidden="true" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
        <path d="M18 43C18 43 33 27 33 16A15 15 0 0 0 3 16C3 27 18 43 18 43Z" fill="${CHARCOAL}" stroke="#fff" stroke-width="2"/>
        <circle cx="18" cy="16" r="6.5" fill="${YELLOW}"/>
      </svg></div>`,
    'Position choisie'
  );
}

function markerElement(kind: NavyMapMarker['kind'], label: string): HTMLDivElement {
  const shop = kind === 'shop';
  return el(
    `<div style="width:26px;height:26px;border-radius:${shop ? '8px' : '9999px'};background:${shop ? CHARCOAL : YELLOW};border:2px solid ${shop ? YELLOW : CHARCOAL};box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;cursor:pointer">
      <div style="width:8px;height:8px;border-radius:9999px;background:${shop ? YELLOW : CHARCOAL}"></div></div>`,
    label
  );
}

function vertexElement(first: boolean, i: number): HTMLDivElement {
  return el(
    `<div style="width:22px;height:22px;border-radius:9999px;background:${first ? YELLOW : '#fff'};border:3px solid ${CHARCOAL};box-shadow:0 1px 3px rgba(0,0,0,.35);cursor:grab"></div>`,
    `Point ${i + 1}`
  );
}

/** A tap on a marker must not also count as a tap on the map. */
function stopMapClick(node: HTMLElement) {
  node.addEventListener('click', (e) => e.stopPropagation());
}

function setData(map: MapLibreMap, id: string, data: GeoJSON.GeoJSON) {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
}

interface Props extends NavyMapProps {
  /** Called when this engine cannot run on the phone (NavyMap then shows Leaflet). */
  onEngineFail?: (reason: string) => void;
}

export default function NavyMapVector({
  ariaLabel,
  zones = [],
  highlightZoneId,
  hiddenZoneId,
  markers = [],
  pin,
  onPinChange,
  draft,
  draftColor = YELLOW,
  onDraftChange,
  onMapTap,
  onZoneTap,
  onMarkerTap,
  locate = false,
  fit = 'island',
  heightClass = 'h-[55vh] min-h-[280px] max-h-[520px]',
  onEngineFail,
}: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const verticesRef = useRef<Marker[]>([]);
  const pinRef = useRef<Marker | null>(null);
  const fittedRef = useRef(false);
  const isOnline = useOnlineStatus();
  const [ready, setReady] = useState(false);
  const [fileState, setFileState] = useState<MapFileState | 'loading'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState<string | null>(null);

  // Latest callbacks, read by handlers bound once.
  const cb = useRef({ onPinChange, onMapTap, onZoneTap, onDraftChange, draft, onMarkerTap, onEngineFail });
  cb.current = { onPinChange, onMapTap, onZoneTap, onDraftChange, draft, onMarkerTap, onEngineFail };

  // Map created once per attempt (a new attempt when the network comes back without the file).
  useEffect(() => {
    const container = elRef.current;
    if (!container) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    let ro: ResizeObserver | null = null;
    setReady(false);
    fittedRef.current = false;

    void (async () => {
      let proto: Protocol;
      try {
        proto = ensureProtocols();
      } catch (e) {
        cb.current.onEngineFail?.(String(e));
        return;
      }
      const file = await openMapFile(swapToLocal);
      if (cancelled) return;
      if (file.archive) proto.add(file.archive);
      setFileState(file.state);
      try {
        map = new MapLibreMap({
          container,
          style: navyMapStyle(file.key),
          center: toLngLat(NOSY_BE_CENTER),
          zoom: ISLAND_ZOOM,
          minZoom: 9,
          maxZoom: 18.5,
          maxBounds: BOUNDS,
          maxPitch: 0,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: false,
          fadeDuration: 0,
        });
      } catch (e) {
        // No WebGL context (old phone, disabled GPU): hand over to Leaflet.
        cb.current.onEngineFail?.(e instanceof Error ? e.message : String(e));
        return;
      }
      mapRef.current = map;
      // Debug handle for DevTools checks (zoom, loaded tiles), never read by the app.
      Object.defineProperty(container, '__navyMap', { value: map, configurable: true });
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      map.addControl(new NavigationControl({ showCompass: false, visualizePitch: false }), 'top-left');
      map.addControl(new AttributionControl({ compact: false }), 'bottom-right');

      map.on('error', (ev) => console.warn('[NavyMap] map error', ev.error?.message ?? ev));
      map.on('webglcontextlost', () => console.warn('[NavyMap] WebGL context lost'));

      map.on('load', () => {
        const m = map as MapLibreMap;
        const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
        m.addSource('navy-zones', { type: 'geojson', data: empty });
        m.addSource('navy-zone-labels', { type: 'geojson', data: empty });
        m.addSource('navy-draft', { type: 'geojson', data: empty });
        m.addLayer({
          id: 'navy-zones-fill',
          type: 'fill',
          source: 'navy-zones',
          paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'strong'], 0.45, 0.3] },
        });
        m.addLayer({
          id: 'navy-zones-line',
          type: 'line',
          source: 'navy-zones',
          layout: { 'line-join': 'round' },
          paint: {
            'line-color': CHARCOAL,
            'line-opacity': ['case', ['get', 'strong'], 0.9, 0.45],
            'line-width': ['case', ['get', 'strong'], 3, 1.5],
          },
        });
        m.addLayer({
          id: 'navy-draft-fill',
          type: 'fill',
          source: 'navy-draft',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: { 'fill-color': YELLOW, 'fill-opacity': 0.35 },
        });
        m.addLayer({
          id: 'navy-draft-line',
          type: 'line',
          source: 'navy-draft',
          layout: { 'line-join': 'round' },
          paint: { 'line-color': CHARCOAL, 'line-width': 2.5, 'line-dasharray': [2.4, 2.4] },
        });
        m.addLayer({
          id: 'navy-zones-label',
          type: 'symbol',
          source: 'navy-zone-labels',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Medium'],
            'text-size': 12.5,
            'text-max-width': 9,
            'text-allow-overlap': false,
          },
          paint: { 'text-color': CHARCOAL, 'text-halo-color': 'rgba(255,255,255,0.92)', 'text-halo-width': 2 },
        });
        setReady(true);
      });

      map.on('click', (e) => {
        const m = map as MapLibreMap;
        if (cb.current.onZoneTap && m.getLayer('navy-zones-fill')) {
          const hit = m.queryRenderedFeatures(e.point, { layers: ['navy-zones-fill'] });
          const id = hit[0]?.properties?.id;
          if (typeof id === 'string') {
            cb.current.onZoneTap(id);
            return;
          }
        }
        const { lat, lng } = e.lngLat;
        cb.current.onPinChange?.(lat, lng);
        cb.current.onMapTap?.(lat, lng);
      });

      ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map?.resize()) : null;
      ro?.observe(container);
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      markersRef.current = [];
      verticesRef.current = [];
      pinRef.current = null;
      mapRef.current = null;
      map?.remove();
    };
  }, [attempt]);

  // Network back while the island file was missing: open the map again (reads it online).
  useEffect(() => {
    if (fileState !== 'missing') return;
    if (isOnline && navigator.onLine) {
      setAttempt((a) => a + 1);
      return;
    }
    // The browser's own event too: the app status can lag behind (server ping, hidden tab).
    const reopen = () => setAttempt((a) => a + 1);
    window.addEventListener('online', reopen, { once: true });
    return () => window.removeEventListener('online', reopen);
  }, [isOnline, fileState]);

  // Zones.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const { shapes, labels } = zonesGeoJSON(zones, highlightZoneId, hiddenZoneId);
    setData(map, 'navy-zones', shapes);
    setData(map, 'navy-zone-labels', labels);
  }, [zones, highlightZoneId, hiddenZoneId, ready]);

  // Read-only markers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = markers.map((mk) => {
      const node = markerElement(mk.kind, mk.label);
      const popup = new Popup({ offset: 16, closeButton: false, maxWidth: '240px' }).setText(mk.label);
      const marker = new Marker({ element: node }).setLngLat([mk.lng, mk.lat]).setPopup(popup).addTo(map);
      stopMapClick(node);
      node.addEventListener('click', () => {
        // The map never sees this click (stopMapClick), so the popup is opened here.
        if (!popup.isOpen()) marker.togglePopup();
        cb.current.onMarkerTap?.(mk.id);
      });
      return marker;
    });
  }, [markers, ready]);

  // Pin (placeable / draggable when onPinChange is given).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!pin) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }
    if (!pinRef.current) {
      const node = pinElement();
      stopMapClick(node);
      const m = new Marker({ element: node, anchor: 'bottom', draggable: !!onPinChange }).setLngLat([pin.lng, pin.lat]).addTo(map);
      m.on('dragend', () => {
        const p = m.getLngLat();
        cb.current.onPinChange?.(p.lat, p.lng);
      });
      pinRef.current = m;
    } else {
      pinRef.current.setLngLat([pin.lng, pin.lat]);
      pinRef.current.setDraggable(!!onPinChange);
    }
  }, [pin?.lat, pin?.lng, !!onPinChange, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polygon being drawn.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    verticesRef.current.forEach((v) => v.remove());
    verticesRef.current = [];
    setData(map, 'navy-draft', draftGeoJSON(draft));
    if (map.getLayer('navy-draft-fill')) map.setPaintProperty('navy-draft-fill', 'fill-color', draftColor);
    if (!draft?.length) return;
    verticesRef.current = draft.map((pt, i) => {
      const node = vertexElement(i === 0, i);
      stopMapClick(node);
      const v = new Marker({ element: node, draggable: !!onDraftChange }).setLngLat(toLngLat(pt)).addTo(map);
      const moved = (): LatLng[] => {
        const ll = v.getLngLat();
        const pts = [...(cb.current.draft ?? [])];
        pts[i] = [ll.lat, ll.lng];
        return pts;
      };
      v.on('drag', () => setData(map, 'navy-draft', draftGeoJSON(moved())));
      v.on('dragend', () => cb.current.onDraftChange?.(moved()));
      return v;
    });
  }, [draft, draftColor, !!onDraftChange, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial framing, once there is something to frame.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || fittedRef.current) return;
    if (fit === 'pin' && pin) {
      map.jumpTo({ center: [pin.lng, pin.lat], zoom: PIN_ZOOM });
      fittedRef.current = true;
    } else if (fit === 'content') {
      const b = boundsOf([
        ...zones.flatMap((z) => z.polygon),
        ...markers.map((m) => [m.lat, m.lng] as LatLng),
        ...(pin ? [[pin.lat, pin.lng] as LatLng] : []),
      ]);
      if (b) {
        map.fitBounds(new LngLatBounds([b[0], b[1]], [b[2], b[3]]), { padding: 24, maxZoom: MAX_FIT_ZOOM, duration: 0 });
        fittedRef.current = true;
      }
    }
  }, [fit, pin, zones, markers, ready]);

  const doLocate = () => {
    if (!('geolocation' in navigator)) {
      setLocateMsg('Ce téléphone ne donne pas sa position.');
      return;
    }
    setLocating(true);
    setLocateMsg(null);
    // One reading per press (decision 46 (3)): never watchPosition.
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const map = mapRef.current;
        map?.easeTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), LOCATE_ZOOM), duration: 600 });
        cb.current.onPinChange?.(latitude, longitude);
        if (accuracy > 60) setLocateMsg(`Position approximative (à ${Math.round(accuracy)} m près) : ajustez l’épingle.`);
      },
      (err) => {
        setLocating(false);
        setLocateMsg(
          err.code === err.PERMISSION_DENIED
            ? 'Position refusée. Autorisez la localisation pour ce site, ou touchez la carte.'
            : 'Position introuvable pour l’instant. Réessayez dehors, ou touchez la carte.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  return (
    <div className="space-y-2">
      <style>{`.navy-vmap .maplibregl-ctrl-attrib{font-size:10px;background:rgba(255,255,255,.8)}.navy-vmap .maplibregl-ctrl-attrib a{color:${CHARCOAL}}.navy-vmap .maplibregl-ctrl-group{border-radius:12px;box-shadow:0 1px 4px rgba(46,46,46,.25)}.navy-vmap .maplibregl-ctrl-group button{width:44px;height:44px}.navy-vmap .maplibregl-marker:focus-visible{outline:3px solid ${YELLOW};outline-offset:2px;border-radius:9999px}.navy-vmap .maplibregl-popup-content{border-radius:10px;padding:6px 10px;font-weight:600;color:${CHARCOAL}}`}</style>
      {fileState === 'missing' && (!isOnline || !navigator.onLine) && (
        <div className="flex items-start gap-2 rounded-xl border border-navyay-yellow bg-navyay-yellow/15 px-3 py-2 text-sm" role="status">
          <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>Hors ligne : la carte de l’île n’est pas encore sur ce téléphone. Les zones et les points restent affichés ; elle s’enregistrera à la prochaine connexion.</span>
        </div>
      )}
      <div className="relative">
        <div
          ref={elRef}
          role="application"
          aria-label={ariaLabel}
          data-navy-map="vector"
          data-navy-map-file={fileState}
          className={`navy-vmap w-full ${heightClass} rounded-2xl overflow-hidden border border-navyay-charcoal/15`}
          style={{ touchAction: 'none', background: '#EFEDE6' }}
        />
        {locate && (
          <button
            type="button"
            onClick={doLocate}
            disabled={locating}
            className="absolute right-2.5 bottom-7 z-[5] inline-flex items-center gap-1.5 rounded-xl bg-navyay-charcoal px-3 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-navyay-charcoal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-70"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Crosshair className="w-4 h-4 text-navyay-yellow" aria-hidden="true" />}
            Ma position
          </button>
        )}
      </div>
      {locateMsg && (
        <p className="text-sm text-navyay-charcoal/80" role="status">
          {locateMsg}
        </p>
      )}
    </div>
  );
}
