/**
 * NAVY ay — parcel tracking dressed like the client journey (phase 2C2): the map of the
 * island as background with the parcel's route (departure → arrival grocer, yellow edged
 * with charcoal; dashed straight line while the road is unknown), and the tracking panel
 * above it. The panel can be folded to look at the map.
 *
 * The hand-over place of a direct hand-over (often the sender's home) is drawn ONLY for
 * the sender and the driver of the course, as in the tracking text (2B2).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { routePath } from '../../services/clientService';
import type { NavyParcelRow } from '../../types/parcel';
import type { LatLng } from '../../types/partner';
import NavyMap, { type NavyMapApi, type NavyMapShop } from '../map/NavyMap';
import { MapButtons, MapSheet, MapStage } from './MapStage';

export default function ParcelMapFrame({ parcel, showStart, children }: { parcel: NavyParcelRow; showStart: boolean; children: ReactNode }) {
  const isOnline = useOnlineStatus();
  const apiRef = useRef<NavyMapApi | null>(null);
  const [sheetH, setSheetH] = useState(320);
  const [folded, setFolded] = useState(false);
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

  const frame = () => {
    const pts: LatLng[] = [...(route?.coords ?? []), ...(to ? [to] : [])];
    if (pts.length) apiRef.current?.fitPoints(pts, { top: 40, bottom: sheetH + 40, left: 44, right: 64 }, 15);
  };
  useEffect(frame, [path?.length, sheetH, folded]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapStage
      map={
        <NavyMap
          ariaLabel="Carte : trajet du colis"
          frame="full"
          initialView={to ? { lat: to[0], lng: to[1], zoom: 13 } : undefined}
          shops={shops}
          me={remise && from ? { lat: from[0], lng: from[1] } : null}
          route={route}
          onReady={(api) => {
            apiRef.current = api;
            if (api) window.setTimeout(frame, 50);
          }}
        />
      }
    >
      <MapButtons bottom={sheetH + 24} onZoom={(d) => apiRef.current?.zoomBy(d)} onRecenter={frame} recenterLabel="Recadrer sur le trajet" />
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
        {children}
      </MapSheet>
    </MapStage>
  );
}
