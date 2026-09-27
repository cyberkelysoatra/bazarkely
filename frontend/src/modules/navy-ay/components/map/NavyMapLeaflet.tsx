/**
 * NAVY ay map, Leaflet engine (phase 1B). Since phase 2C1 it is the FALLBACK of NavyMap,
 * used only when the phone cannot draw the vector map (no WebGL, old phone).
 *
 * Leaflet + OpenStreetMap, centred on
 * Nosy Be, made for the finger (drag, pinch zoom, "Ma position" button, draggable pin).
 *
 * - zones: soft coloured polygons with their name;
 * - markers: shops / destinations (read-only);
 * - pin + onPinChange: a place chosen by the person (tap the map or drag the pin);
 * - draft + onDraftChange: a polygon being drawn (tap adds a point via onMapTap,
 *   each point can be dragged).
 * Offline: a clear message; tiles already seen on this phone are still shown.
 * The map container blocks page scrolling while a finger is on it (touch-action: none),
 * so moving the map never scrolls the page by mistake.
 * Phase 2C2 (client map): the same overlays as the vector map in a simple form (route
 * line, dotted lines, "Vous", grocers, drivers with their price), full frame possible.
 * Phase 2C3: vehicles moved in place (setLatLng) from `vehiclePosition`, never rebuilt at
 * each position; obstacles of the private NAVY layer as a red dashed line + pictogram.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2, WifiOff } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import type { NavyMapApi, NavyMapMarker, NavyMapProps } from './navyMapTypes';
import { meElement, obstacleElement, OVERLAY_CSS, overlayKey, RED, shopElement, vehicleElement } from './navyMapOverlay';
import { useMapObstacles } from '../../services/liveService';
import { formatUntil, isObstacleActive, obstacleAnchor, OBSTACLE_LABELS, obstaclePoints } from '../../utils/obstacleRules';
import { NOSY_BE_CENTER, NOSY_BE_ZOOM, sortZones } from '../../utils/geo';
import { countCachedTiles, navyTileLayer, type NavyTileLayer } from './navyTiles';

const CHARCOAL = '#2E2E2E';
const YELLOW = '#E9B824';

function pinIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:36px;height:44px">
      <svg viewBox="0 0 36 44" width="36" height="44" aria-hidden="true" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
        <path d="M18 43C18 43 33 27 33 16A15 15 0 0 0 3 16C3 27 18 43 18 43Z" fill="${CHARCOAL}" stroke="#fff" stroke-width="2"/>
        <circle cx="18" cy="16" r="6.5" fill="${YELLOW}"/>
      </svg></div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 43],
  });
}

function markerIcon(kind: NavyMapMarker['kind']): L.DivIcon {
  const shop = kind === 'shop';
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:${shop ? '8px' : '9999px'};background:${shop ? CHARCOAL : YELLOW};border:2px solid ${shop ? YELLOW : CHARCOAL};box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center">
      <div style="width:8px;height:8px;border-radius:9999px;background:${shop ? YELLOW : CHARCOAL}"></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function vertexIcon(first: boolean): L.DivIcon {
  const size = 22;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${first ? YELLOW : '#fff'};border:3px solid ${CHARCOAL};box-shadow:0 1px 3px rgba(0,0,0,.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export default function NavyMapLeaflet({
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
  frame = 'card',
  initialView,
  route,
  trail,
  walk,
  me,
  onMeTap,
  shops,
  onShopTap,
  shopNames = 'zoom',
  vehicles,
  onVehicleTap,
  onReady,
  vehiclePosition,
  obstacles,
  draftShape = 'polygon',
}: NavyMapProps) {
  const full = frame === 'full';
  const overlayLayer = useRef<L.LayerGroup | null>(null);
  const linesLayer = useRef<L.LayerGroup | null>(null);
  const obstaclesLayer = useRef<L.LayerGroup | null>(null);
  const vehicleMarkers = useRef<Map<string, L.Marker>>(new Map());
  const livePos = useRef(vehiclePosition);
  livePos.current = vehiclePosition;
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<NavyTileLayer | null>(null);
  const zonesLayer = useRef<L.LayerGroup | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const draftLayer = useRef<L.LayerGroup | null>(null);
  const pinRef = useRef<L.Marker | null>(null);
  const fittedRef = useRef(false);
  const isOnline = useOnlineStatus();
  const [missing, setMissing] = useState(0);
  const [cachedTiles, setCachedTiles] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState<string | null>(null);

  // Latest callbacks, read by Leaflet handlers bound once.
  const cb = useRef({ onPinChange, onMapTap, onZoneTap, onDraftChange, draft, onMarkerTap, onMeTap, onShopTap, onVehicleTap, onReady });
  cb.current = { onPinChange, onMapTap, onZoneTap, onDraftChange, draft, onMarkerTap, onMeTap, onShopTap, onVehicleTap, onReady };

  // Map created once.
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: !full,
      attributionControl: true,
      tap: true,
      // Two fingers zoom; one finger pans the map (never the page).
      touchZoom: true,
      bounceAtZoomLimits: false,
    } as L.MapOptions).setView(
      initialView ? [initialView.lat, initialView.lng] : NOSY_BE_CENTER,
      // Leaflet zooms are one level above MapLibre's for the same scale.
      initialView ? Math.round(initialView.zoom + 1) : NOSY_BE_ZOOM
    );
    map.attributionControl.setPrefix(false);
    mapRef.current = map;
    const tiles = navyTileLayer();
    tiles.on('navymissing', () => setMissing(tiles.missing));
    tiles.addTo(map);
    tileRef.current = tiles;
    zonesLayer.current = L.layerGroup().addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    draftLayer.current = L.layerGroup().addTo(map);
    obstaclesLayer.current = L.layerGroup().addTo(map);
    linesLayer.current = L.layerGroup().addTo(map);
    overlayLayer.current = L.layerGroup().addTo(map);
    const zoomClass = () => elRef.current?.classList.toggle('navy-zlo', map.getZoom() < 15);
    map.on('zoomend', zoomClass);
    zoomClass();
    const api: NavyMapApi = {
      fitPoints: (points, padding, maxZoom = 15.5, durationMs) => {
        if (!points.length) return;
        map.fitBounds(L.latLngBounds(points as L.LatLngExpression[]), {
          paddingTopLeft: [padding.left, padding.top],
          paddingBottomRight: [padding.right, padding.bottom],
          maxZoom: Math.round(maxZoom + 1),
          ...(durationMs != null ? { animate: durationMs > 0, duration: durationMs / 1000 } : {}),
        });
      },
      easeTo: (lat, lng, zoom) => map.setView([lat, lng], zoom == null ? map.getZoom() : Math.round(zoom + 1)),
      zoomBy: (delta) => map.setZoom(map.getZoom() + Math.sign(delta)),
    };
    cb.current.onReady?.(api);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (cb.current.onPinChange) cb.current.onPinChange(lat, lng);
      cb.current.onMapTap?.(lat, lng);
    });

    // The container may be laid out after mount (tabs, lazy pages).
    const t = window.setTimeout(() => map.invalidateSize(), 150);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.invalidateSize()) : null;
    ro?.observe(elRef.current);
    return () => {
      window.clearTimeout(t);
      ro?.disconnect();
      cb.current.onReady?.(null);
      map.remove();
      mapRef.current = null;
      pinRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isOnline) void countCachedTiles().then(setCachedTiles);
  }, [isOnline]);

  // Zones.
  useEffect(() => {
    const layer = zonesLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const z of sortZones(zones)) {
      if (z.id === hiddenZoneId || z.polygon.length < 3) continue;
      const strong = z.id === highlightZoneId;
      const poly = L.polygon(z.polygon as L.LatLngExpression[], {
        color: CHARCOAL,
        opacity: strong ? 0.9 : 0.45,
        weight: strong ? 3 : 1.5,
        fillColor: z.color,
        fillOpacity: strong ? 0.45 : 0.3,
        bubblingMouseEvents: !cb.current.onZoneTap,
      });
      poly.bindTooltip(escapeHtml(z.name), { permanent: true, direction: 'center', className: 'navy-zone-label' });
      if (cb.current.onZoneTap) poly.on('click', () => cb.current.onZoneTap?.(z.id));
      poly.addTo(layer);
    }
  }, [zones, highlightZoneId, hiddenZoneId, onZoneTap]);

  // Read-only markers.
  useEffect(() => {
    const layer = markersLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const m of markers) {
      L.marker([m.lat, m.lng], { icon: markerIcon(m.kind), keyboard: false, title: m.label, alt: m.label })
        .bindPopup(escapeHtml(m.label))
        .on('click', () => cb.current.onMarkerTap?.(m.id))
        .addTo(layer);
    }
  }, [markers]);

  // Pin (placeable / draggable when onPinChange is given).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pin) {
      pinRef.current?.remove();
      pinRef.current = null;
      return;
    }
    if (!pinRef.current) {
      const m = L.marker([pin.lat, pin.lng], {
        icon: pinIcon(),
        draggable: !!onPinChange,
        autoPan: true,
        keyboard: false,
        title: 'Position choisie',
        alt: 'Position choisie',
        zIndexOffset: 1000,
      });
      m.on('dragend', () => {
        const p = m.getLatLng();
        cb.current.onPinChange?.(p.lat, p.lng);
      });
      m.addTo(map);
      pinRef.current = m;
    } else {
      pinRef.current.setLatLng([pin.lat, pin.lng]);
      if (onPinChange) pinRef.current.dragging?.enable();
      else pinRef.current.dragging?.disable();
    }
  }, [pin?.lat, pin?.lng, !!onPinChange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polygon being drawn.
  useEffect(() => {
    const layer = draftLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (!draft || draft.length === 0) return;
    const shape =
      draft.length >= 3 && draftShape !== 'line'
        ? L.polygon(draft as L.LatLngExpression[], { color: CHARCOAL, weight: 2.5, dashArray: '6 6', fillColor: draftColor, fillOpacity: 0.35 })
        : L.polyline(draft as L.LatLngExpression[], { color: CHARCOAL, weight: 2.5, dashArray: '6 6' });
    shape.addTo(layer);
    draft.forEach((pt, i) => {
      const v = L.marker(pt as L.LatLngExpression, {
        icon: vertexIcon(i === 0),
        draggable: !!onDraftChange,
        keyboard: false,
        title: `Point ${i + 1}`,
        alt: `Point ${i + 1}`,
      });
      v.on('drag', () => {
        const ll = v.getLatLng();
        const pts = [...(cb.current.draft ?? [])];
        pts[i] = [ll.lat, ll.lng];
        if (shape instanceof L.Polygon || shape instanceof L.Polyline) shape.setLatLngs(pts as L.LatLngExpression[]);
      });
      v.on('dragend', () => {
        const ll = v.getLatLng();
        const pts = [...(cb.current.draft ?? [])];
        pts[i] = [ll.lat, ll.lng];
        cb.current.onDraftChange?.(pts);
      });
      v.addTo(layer);
    });
  }, [draft, draftColor, draftShape, !!onDraftChange]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Phase 2C2 overlays (simple rendering on the fallback) ---------------------------
  useEffect(() => {
    elRef.current?.classList.toggle('navy-names', shopNames === 'always');
  }, [shopNames]);

  const linesKey = overlayKey([route ?? null, trail ?? null, walk ?? null]);
  useEffect(() => {
    const layer = linesLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (walk && walk.length > 1) L.polyline(walk as L.LatLngExpression[], { color: CHARCOAL, weight: 3, dashArray: '1 8', lineCap: 'round', interactive: false }).addTo(layer);
    if (trail && trail.length > 1) L.polyline(trail as L.LatLngExpression[], { color: CHARCOAL, weight: 3, opacity: 0.75, dashArray: '6 6', interactive: false }).addTo(layer);
    if (route && route.coords.length > 1) {
      const dash = route.dashed ? '12 8' : undefined;
      L.polyline(route.coords as L.LatLngExpression[], { color: CHARCOAL, weight: 10, dashArray: dash, interactive: false }).addTo(layer);
      L.polyline(route.coords as L.LatLngExpression[], { color: YELLOW, weight: 6, dashArray: dash, interactive: false }).addTo(layer);
    }
  }, [linesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pointsKey = overlayKey([me ?? null, shops ?? null, vehicles ?? null]);
  const hasLive = !!vehiclePosition;
  useEffect(() => {
    const layer = overlayLayer.current;
    if (!layer) return;
    layer.clearLayers();
    const add = (lat: number, lng: number, node: HTMLElement, onTap: (() => void) | undefined, anchor: [number, number], size: [number, number]) => {
      L.marker([lat, lng], { icon: L.divIcon({ className: '', html: node, iconSize: size, iconAnchor: anchor }), keyboard: false, interactive: !!onTap })
        .on('click', () => onTap?.())
        .addTo(layer);
    };
    for (const s of shops ?? []) add(s.lat, s.lng, shopElement(s), () => cb.current.onShopTap?.(s.id), [s.role === 'dest' ? 17 : 13, s.role === 'dest' ? 17 : 13], [160, 34]);
    vehicleMarkers.current.clear();
    for (const v of vehicles ?? []) {
      const p = livePos.current?.(v.id, Date.now());
      const el = vehicleElement(p ? { ...v, state: p.stale ? 'stale' : 'live' } : v);
      const mk = L.marker([p?.lat ?? v.lat, p?.lng ?? v.lng], { icon: L.divIcon({ className: '', html: el, iconSize: [44, 44], iconAnchor: [22, 22] }), keyboard: false })
        .on('click', () => cb.current.onVehicleTap?.(v.id))
        .addTo(layer);
      vehicleMarkers.current.set(v.id, mk);
    }
    if (me) add(me.lat, me.lng, meElement(!!cb.current.onMeTap), () => cb.current.onMeTap?.(), [22, 22], [44, 44]);
  }, [pointsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 2C3: live vehicles moved in place (10 times a second, once with reduced motion).
  useEffect(() => {
    if (!hasLive) return;
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = window.setInterval(() => {
      const now = Date.now();
      vehicleMarkers.current.forEach((mk, id) => {
        const p = livePos.current?.(id, now);
        if (!p) return;
        mk.setLatLng([p.lat, p.lng]);
        const el = (mk.getElement()?.querySelector('.navy-veh') as HTMLElement | null) ?? null;
        el?.classList.toggle('stale', !!p.stale);
      });
    }, reduce ? 1000 : 100);
    return () => window.clearInterval(t);
  }, [hasLive, pointsKey]);

  // Phase 2C3: obstacles (validated ones in progress by default).
  const storeObstacles = useMapObstacles(obstacles === undefined);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const shownObstacles = useMemo(
    () => (obstacles === 'none' ? [] : Array.isArray(obstacles) ? obstacles : storeObstacles.filter((o) => isObstacleActive(o, clock))),
    [obstacles, storeObstacles, clock]
  );
  const obstaclesKey = overlayKey(shownObstacles.map((o) => [o.id, o.status, o.kind, o.ends_at, o.geom]));
  useEffect(() => {
    const layer = obstaclesLayer.current;
    if (!layer) return;
    layer.clearLayers();
    const now = Date.now();
    for (const o of shownObstacles) {
      const proposed = o.status !== 'valide';
      const label = `${OBSTACLE_LABELS[o.kind] ?? 'Obstacle'}${proposed ? ' (signalé, à valider)' : ''}, ${formatUntil(o.ends_at, now)}${o.note ? ` : ${o.note}` : ''}`;
      if (o.geom.type === 'LineString') {
        L.polyline(obstaclePoints(o.geom) as L.LatLngExpression[], { color: RED, weight: 7, opacity: proposed ? 0.5 : 0.95, dashArray: '8 6', interactive: false }).addTo(layer);
      }
      const el = obstacleElement(o.kind, label);
      if (proposed) el.style.opacity = '0.6';
      L.marker(obstacleAnchor(o.geom) as L.LatLngExpression, { icon: L.divIcon({ className: '', html: el, iconSize: [30, 30], iconAnchor: [15, 15] }), keyboard: false })
        .bindPopup(escapeHtml(label))
        .addTo(layer);
    }
  }, [obstaclesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial framing, once there is something to frame.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current) return;
    if (fit === 'pin' && pin) {
      map.setView([pin.lat, pin.lng], 16);
      fittedRef.current = true;
    } else if (fit === 'content') {
      const pts: L.LatLngExpression[] = [
        ...zones.flatMap((z) => z.polygon as L.LatLngExpression[]),
        ...markers.map((m) => [m.lat, m.lng] as L.LatLngExpression),
        ...(pin ? [[pin.lat, pin.lng] as L.LatLngExpression] : []),
      ];
      if (pts.length) {
        map.fitBounds(L.latLngBounds(pts), { padding: [24, 24], maxZoom: 16 });
        fittedRef.current = true;
      }
    }
  }, [fit, pin, zones, markers]);

  const doLocate = () => {
    if (!('geolocation' in navigator)) {
      setLocateMsg('Ce téléphone ne donne pas sa position.');
      return;
    }
    setLocating(true);
    setLocateMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        mapRef.current?.setView([latitude, longitude], Math.max(mapRef.current.getZoom(), 17));
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
    <div className={full ? 'relative w-full h-full' : 'space-y-2'}>
      <style>{`${OVERLAY_CSS}.navy-zone-label{background:rgba(255,255,255,.88);border:0;box-shadow:none;color:${CHARCOAL};font-weight:600;font-size:12px;padding:1px 6px;border-radius:6px}.navy-zone-label:before{display:none}.navy-map .leaflet-control-attribution{font-size:10px}`}</style>
      {!isOnline && (
        <div className={`${full ? 'absolute left-3 right-3 top-12 z-[600] ' : ''}flex items-start gap-2 rounded-xl border border-navyay-yellow bg-navyay-yellow/15 px-3 py-2 text-sm`} role="status">
          <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {cachedTiles === 0
              ? 'Hors ligne : aucun morceau de carte n’est encore gardé sur ce téléphone. Les zones et les points restent affichés.'
              : 'Hors ligne : seuls les morceaux de carte déjà vus sur ce téléphone s’affichent.'}
            {missing > 0 && cachedTiles !== 0 ? ' Certaines parties restent grises.' : ''}
          </span>
        </div>
      )}
      <div className={full ? 'relative w-full h-full' : 'relative'}>
        <div
          ref={elRef}
          role="application"
          aria-label={ariaLabel}
          className={full ? 'navy-map w-full h-full overflow-hidden bg-navyay-charcoal/5' : `navy-map w-full ${heightClass} rounded-2xl overflow-hidden border border-navyay-charcoal/15 bg-navyay-charcoal/5`}
          style={{ touchAction: 'none' }}
        />
        {locate && !full && (
          <button
            type="button"
            onClick={doLocate}
            disabled={locating}
            className="absolute right-2.5 bottom-7 z-[500] inline-flex items-center gap-1.5 rounded-xl bg-navyay-charcoal px-3 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-navyay-charcoal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-70"
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
