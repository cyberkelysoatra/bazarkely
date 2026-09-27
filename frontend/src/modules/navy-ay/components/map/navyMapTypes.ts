/**
 * NAVY ay map interface, shared by the vector engine (phase 2C1) and the Leaflet fallback.
 * Every screen talks to NavyMap through these props only.
 */
import type { LatLng, NavyZone } from '../../types/partner';

export interface NavyMapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: 'shop' | 'dest';
}

export interface NavyMapProps {
  ariaLabel: string;
  zones?: NavyZone[];
  /** Zone drawn with a stronger outline. */
  highlightZoneId?: string | null;
  /** Zones hidden (e.g. the one being edited, drawn as a draft instead). */
  hiddenZoneId?: string | null;
  markers?: NavyMapMarker[];
  pin?: { lat: number; lng: number } | null;
  /** Makes the pin placeable (tap) and draggable. */
  onPinChange?: (lat: number, lng: number) => void;
  draft?: LatLng[];
  draftColor?: string;
  onDraftChange?: (points: LatLng[]) => void;
  onMapTap?: (lat: number, lng: number) => void;
  onZoneTap?: (zoneId: string) => void;
  /** Phase 2A: a marker touched (e.g. choosing a grocer on the map). */
  onMarkerTap?: (markerId: string) => void;
  /** Show the "Ma position" button. */
  locate?: boolean;
  /** Initial framing: 'pin' (zoom on the pin), 'content' (zones + markers), default Nosy Be. */
  fit?: 'pin' | 'content' | 'island';
  heightClass?: string;

  // ---- Phase 2C2 (client map), all optional: the screens of 1B-2C1 do not use them.
  /** 'full': map as the permanent background (no frame, no in-map controls: the page draws its own). */
  frame?: 'card' | 'full';
  /** First view (vector zoom; the Leaflet fallback adds one level). */
  initialView?: { lat: number; lng: number; zoom: number };
  /** Parcel route: yellow edged with charcoal; `dashed` = straight line while the road is unknown. */
  route?: { coords: LatLng[]; dashed?: boolean } | null;
  /** Dotted charcoal line (a driver's way to his destination). */
  trail?: LatLng[] | null;
  /** Short dotted line (walk to the depot grocer). */
  walk?: LatLng[] | null;
  /** The person ("Vous"): pulsing yellow dot. */
  me?: { lat: number; lng: number } | null;
  onMeTap?: () => void;
  /** Grocers as squares (names shown when zoomed in). */
  shops?: NavyMapShop[];
  onShopTap?: (id: string) => void;
  /** 'always': grocer names shown at every zoom (choosing a grocer). Default: when zoomed in. */
  shopNames?: 'zoom' | 'always';
  /** Drivers (icon, price tag above, dimmed when not concerned). */
  vehicles?: NavyMapVehicle[];
  onVehicleTap?: (id: string) => void;
  /** Camera handle for the page (buttons drawn outside the map, framing above the panels). */
  onReady?: (api: NavyMapApi | null) => void;
}

export interface NavyMapShop {
  id: string;
  lat: number;
  lng: number;
  name: string;
  /** dest: arrival (big yellow square); pick: depot proposed (yellow edge). */
  role?: 'normal' | 'dest' | 'pick';
}

export interface NavyMapVehicle {
  id: string;
  lat: number;
  lng: number;
  /** VehicleType (bajaj, moto, voiture, camion, velo, taxi, autre). */
  type: string | null;
  label: string;
  /** Price tag above the icon ("1 700 Ar"), or nothing. */
  price?: string | null;
  dim?: boolean;
  selected?: boolean;
}

export interface NavyMapPadding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface NavyMapApi {
  /** Frame points ([lat, lng]) inside the visible part (padding in px around it). */
  fitPoints: (points: LatLng[], padding: NavyMapPadding, maxZoom?: number) => void;
  /** Move to a point (vector zoom). */
  easeTo: (lat: number, lng: number, zoom?: number) => void;
  zoomBy: (delta: number) => void;
}
