/**
 * NAVY ay — parcel tracking dressed like the client journey (phase 2C2): the map of the
 * island as background with the parcel's route (departure → arrival grocer, yellow edged
 * with charcoal; dashed straight line while the road is unknown), and the tracking panel
 * above it. The panel can be folded to look at the map.
 *
 * The hand-over place of a direct hand-over (often the sender's home) is drawn ONLY for
 * the sender and the driver of the course, as in the tracking text (2B2).
 *
 * Phase 2C3 (decisions 49, 50, 53, 17 (2)): once a driver has accepted, the sender (and
 * the two grocers, server rule) sees his EXACT position, read every 30 s while the map
 * is shown; between two positions the vehicle moves along the parcel's route during the
 * trip (utils/liveMotion.ts). The camera follows the approach (vehicle + departure) then
 * the trip (vehicle + arrival); a gesture pauses it, "Recentrer" appears, it comes back
 * 6 s after the last gesture. Direct hand-over: "Sortez maintenant" under 300 m.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BellRing, ChevronDown, ChevronUp } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { routePath } from '../../services/clientService';
import { liveDrivers } from '../../services/liveService';
import type { NavyParcelRow } from '../../types/parcel';
import type { LatLng } from '../../types/partner';
import { formatWalk } from '../../utils/clientRules';
import { LiveFleet, metresBetween } from '../../utils/liveMotion';
import NavyMap, { type NavyMapApi, type NavyMapShop, type NavyMapVehicle } from '../map/NavyMap';
import { LivePill } from './ClientUi';
import { MapButtons, MapSheet, MapStage, RecenterPill, useFollowCamera } from './MapStage';

/** Distance under which the sender of a direct hand-over is told to go out (decision 17 (2)). */
export const GO_OUT_M = 300;
const LIVE_POLL_MS = 30_000;

export default function ParcelMapFrame({ parcel, showStart, children }: { parcel: NavyParcelRow; showStart: boolean; children: ReactNode }) {
  const isOnline = useOnlineStatus();
  const apiRef = useRef<NavyMapApi | null>(null);
  const [sheetH, setSheetH] = useState(320);
  const inCourse = parcel.status === 'chauffeur_trouve' || parcel.status === 'pris_en_charge';
  const [folded, setFolded] = useState(inCourse);
  const [path, setPath] = useState<LatLng[] | null>(null);

  const remise = parcel.departure_mode === 'remise';
  const from = parcel.depot_lat != null && parcel.depot_lng != null && (!remise || showStart) ? ([parcel.depot_lat, parcel.depot_lng] as LatLng) : null;
  const to = parcel.arrival_lat != null && parcel.arrival_lng != null ? ([parcel.arrival_lat, parcel.arrival_lng] as LatLng) : null;

  useEffect(() => {
    setPath(null);
    if (!from || !to || !isOnline) return;
    let cancelled = false;
    let timer: number | undefined;
    const ask = (left: number) => {
      routePath(remise ? null : parcel.depot_partner_id, remise ? { lat: from[0], lng: from[1] } : null, parcel.arrival_partner_id)
        .then((r) => {
          if (cancelled) return;
          if (r.status === 'ok' && r.path && r.path.length > 1) setPath(r.path.map((p) => [p[1], p[0]] as LatLng));
          else if (r.status === 'pending' && left > 0) timer = window.setTimeout(() => ask(left - 1), 2500);
        })
        .catch(() => undefined);
    };
    ask(3);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [parcel.id, from?.[0], from?.[1], isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  const route = from && to ? (path ? { coords: path } : { coords: [from, to], dashed: true }) : null;
  const shops: NavyMapShop[] = [];
  if (to) shops.push({ id: 'arrival', lat: to[0], lng: to[1], name: parcel.arrival_name ?? 'Arrivée', role: 'dest' });
  if (from && !remise) shops.push({ id: 'depot', lat: from[0], lng: from[1], name: parcel.depot_name ?? 'Départ', role: 'pick' });

  // ---- live position of the course's driver (exact for the parties only: server rule)
  const fleetRef = useRef(new LiveFleet());
  const [hasLive, setHasLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const driverId = inCourse ? parcel.driver_partner_id : null;
  const trip = parcel.status === 'pris_en_charge';
  const simRoute = trip && path ? path : null;
  useEffect(() => {
    fleetRef.current.clear();
    setHasLive(false);
    if (!driverId || !isOnline) return;
    let alive = true;
    const read = () => {
      if (document.visibilityState !== 'visible') return;
      void liveDrivers().then(({ list, fromPhone, receivedAt }) => {
        if (!alive || fromPhone) return;
        // No position for 2 minutes: the server stops giving it, the icon turns grey (kept 5 min).
        const d = list.find((x) => x.partner_id === driverId && (!x.live || x.live.exact));
        fleetRef.current.update(d ? [{ id: driverId, live: d.live, route: simRoute }] : [], receivedAt);
        setHasLive(fleetRef.current.has(driverId));
      });
    };
    read();
    const t = window.setInterval(read, LIVE_POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && read();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [driverId, isOnline, !!simRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hasLive) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [hasLive]);

  const pos = hasLive && driverId ? fleetRef.current.position(driverId, now) : null;
  // Approach: towards the departure (grocer, or the hand-over place); trip: towards the arrival.
  const target: LatLng | null = trip ? to : remise ? (showStart ? from : null) : from;
  const left = pos && target ? metresBetween(pos, { lat: target[0], lng: target[1] }) : null;
  const goOut = remise && showStart && parcel.status === 'chauffeur_trouve' && left != null && left < GO_OUT_M;
  const firstName = (parcel.driver_name ?? 'Le chauffeur').split(' ')[0];

  const vehicles: NavyMapVehicle[] = useMemo(
    () =>
      hasLive && driverId
        ? [{ id: driverId, lat: target?.[0] ?? 0, lng: target?.[1] ?? 0, type: parcel.driver_vehicle, label: `${firstName}, votre chauffeur`, selected: true, state: 'live' }]
        : [],
    [hasLive, driverId, parcel.driver_vehicle, firstName, target?.[0], target?.[1]] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const vehiclePosition = useCallback((id: string, t: number) => fleetRef.current.position(id, t), []);

  // Vibrate once when "Sortez maintenant" appears (phones that allow it).
  const buzzed = useRef(false);
  useEffect(() => {
    if (goOut && !buzzed.current) {
      buzzed.current = true;
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* not allowed */
      }
    }
  }, [goOut]);

  const pad = useCallback(() => ({ top: 72, bottom: sheetH + 48, left: 52, right: 72 }), [sheetH]);
  const follow = useFollowCamera({
    active: hasLive && !!target,
    apiRef,
    points: () => {
      const p = driverId ? fleetRef.current.position(driverId, Date.now()) : null;
      return p && target ? [[p.lat, p.lng], target] : [];
    },
    padding: pad,
  });

  const frame = () => {
    if (hasLive) return follow.recenter();
    const pts: LatLng[] = [...(route?.coords ?? []), ...(to ? [to] : [])];
    if (pts.length) apiRef.current?.fitPoints(pts, { top: 40, bottom: sheetH + 40, left: 44, right: 64 }, 15);
  };
  useEffect(() => {
    if (!hasLive) frame();
  }, [path?.length, sheetH, folded, hasLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const pill = pos
    ? pos.stale
      ? `Position de ${firstName} incertaine`
      : trip
      ? `${firstName} transporte votre colis${left != null ? ` · ${formatWalk(left)} de l’arrivée` : ''}`
      : `${firstName} arrive${left != null ? ` · ${formatWalk(left)}` : ''}`
    : null;

  return (
    <MapStage
      onMapGesture={follow.gesture}
      map={
        <NavyMap
          ariaLabel="Carte : trajet du colis"
          frame="full"
          initialView={to ? { lat: to[0], lng: to[1], zoom: 13 } : undefined}
          shops={shops}
          me={remise && from ? { lat: from[0], lng: from[1] } : null}
          route={route}
          vehicles={vehicles}
          vehiclePosition={vehiclePosition}
          onReady={(api) => {
            apiRef.current = api;
            if (api) window.setTimeout(frame, 50);
          }}
        />
      }
    >
      {pill && <LivePill>{pill}</LivePill>}
      {goOut && (
        <div
          role="alert"
          className="absolute left-3 right-3 top-14 z-40 mx-auto flex max-w-[460px] items-center gap-2.5 rounded-2xl bg-navyay-yellow px-4 py-3 text-[15px] font-extrabold text-navyay-charcoal shadow-[0_10px_30px_rgba(46,46,46,0.25)]"
        >
          <BellRing className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          Sortez maintenant : {firstName} est à moins de 300 m.
        </div>
      )}
      {follow.paused && <RecenterPill onClick={follow.recenter} bottom={sheetH + 24} />}
      <MapButtons
        bottom={sheetH + 24}
        onZoom={(d) => {
          follow.gesture();
          apiRef.current?.zoomBy(d);
        }}
        onRecenter={frame}
        recenterLabel={hasLive ? 'Suivre le chauffeur' : 'Recadrer sur le trajet'}
      />
      <MapSheet panelKey="parcel" onHeight={setSheetH} tall={!folded} small={folded}>
        <button
          type="button"
          onClick={() => setFolded((f) => !f)}
          aria-expanded={!folded}
          className="-mt-2 mb-1 flex min-h-[44px] w-full items-center justify-center gap-1 rounded-xl text-sm font-bold text-navyay-charcoal/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
        >
          {folded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
          {folded ? 'Afficher le suivi' : 'Voir la carte'}
        </button>
        {inCourse && driverId && isOnline && !hasLive && (
          <p className="mb-2 text-xs text-navyay-charcoal/75">
            La position de {firstName} s’affichera ici dès que NAVY ay sera ouverte sur son téléphone.
          </p>
        )}
        {children}
      </MapSheet>
    </MapStage>
  );
}
