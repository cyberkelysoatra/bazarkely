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
}
