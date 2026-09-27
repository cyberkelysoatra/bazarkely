/**
 * NAVY ay vector map style (phase 2C1), taken from the validated mock-up
 * (MAQUETTE-CARTE-VIVANTE.html): pale sage sea (never navy blue), light land, white roads
 * edged with sand, small streets from zoom 11.5, tracks as thin dashes, village names in
 * spaced capitals, Hell-Ville bigger. Yellow and charcoal are kept for what belongs to
 * NAVY (zones, pins, grocers, routes), drawn above this base.
 *
 * Built from the ready-made Protomaps layers (@protomaps/basemaps), recoloured, with the
 * layers that need an icon sprite removed (the app ships no sprite).
 */
import { layers, namedFlavor, type Flavor } from '@protomaps/basemaps';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';

export const MAP_COLORS = {
  sea: '#C7D9D2',
  land: '#F1EEE6',
  road: '#FFFFFF',
  roadCase: '#CFC7B2',
  green: '#E2E6D3',
  sand: '#F4EEDC',
  building: '#E6E0D3',
  ink: '#2E2E2E',
  ink2: '#615C52',
  halo: '#F1EEE6',
  yellow: '#E9B824',
  charcoal: '#2E2E2E',
} as const;

export const SOURCE_ID = 'protomaps';
export const GLYPHS_URL = 'navyglyphs://{fontstack}/{range}';
export const MAP_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a> · <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>';

/** Layers that need an icon sprite, or that make no sense on a small island. */
const DROPPED = new Set([
  'pois',
  'roads_shields',
  'roads_oneway',
  'address_label',
  'boundaries',
  'boundaries_country',
  'places_country',
  'places_region',
]);

function navyFlavor(): Flavor {
  const c = MAP_COLORS;
  const base = namedFlavor('light');
  const road = { minor_a: c.road, minor_b: c.road, minor_service: c.road, link: c.road, major: c.road, highway: c.road };
  const cases = {
    minor_casing: c.roadCase,
    minor_service_casing: c.roadCase,
    link_casing: c.roadCase,
    major_casing_early: c.roadCase,
    major_casing_late: c.roadCase,
    highway_casing_early: c.roadCase,
    highway_casing_late: c.roadCase,
  };
  return {
    ...base,
    ...road,
    ...cases,
    background: c.sea,
    water: c.sea,
    earth: c.land,
    park_a: c.green,
    park_b: c.green,
    wood_a: c.green,
    wood_b: c.green,
    scrub_a: c.green,
    scrub_b: c.green,
    sand: c.sand,
    beach: c.sand,
    zoo: c.green,
    hospital: '#EDE7DB',
    school: '#EDE7DB',
    industrial: '#E9E5DA',
    military: '#E9E5DA',
    pedestrian: '#ECE7DB',
    aerodrome: '#E9E5DA',
    runway: c.road,
    pier: c.roadCase,
    buildings: c.building,
    other: c.roadCase,
    railway: c.ink2,
    bridges_other_casing: c.roadCase,
    bridges_minor_casing: c.roadCase,
    bridges_link_casing: c.roadCase,
    bridges_major_casing: c.roadCase,
    bridges_highway_casing: c.roadCase,
    bridges_other: c.roadCase,
    bridges_minor: c.road,
    bridges_link: c.road,
    bridges_major: c.road,
    bridges_highway: c.road,
    roads_label_minor: c.ink2,
    roads_label_minor_halo: c.road,
    roads_label_major: c.ink2,
    roads_label_major_halo: c.road,
    ocean_label: '#3F5A50',
    subplace_label: c.ink2,
    subplace_label_halo: c.halo,
    city_label: c.ink2,
    city_label_halo: c.halo,
    state_label: c.ink2,
    state_label_halo: c.halo,
    country_label: c.ink2,
    address_label: c.ink2,
    address_label_halo: c.road,
    landcover: {
      grassland: c.green,
      barren: c.land,
      urban_area: c.land,
      farmland: c.green,
      glacier: c.land,
      scrub: c.green,
      forest: c.green,
    },
  };
}

type Interp = ['interpolate', ['linear'], ['zoom'], ...number[]];
const zoomLine = (...stops: number[]): Interp => ['interpolate', ['linear'], ['zoom'], ...stops];

/** Place name: French name first, else the local one. */
const PLACE_NAME = ['coalesce', ['get', 'name:fr'], ['get', 'name']];
const IS_TOWN = ['in', ['get', 'kind_detail'], ['literal', ['city', 'town']]];

/** Road widths of the mock-up (px, by zoom). */
const WIDTHS: Record<string, Interp> = {
  roads_major_casing_early: zoomLine(11, 2.2, 14, 6, 17, 16),
  roads_major_casing_late: zoomLine(11, 2.2, 14, 6, 17, 16),
  roads_highway_casing_early: zoomLine(11, 2.2, 14, 6, 17, 16),
  roads_highway_casing_late: zoomLine(11, 2.2, 14, 6, 17, 16),
  roads_major: zoomLine(11, 1, 14, 4, 17, 12),
  roads_highway: zoomLine(11, 1, 14, 4, 17, 12),
  roads_link_casing: zoomLine(12.5, 1, 15, 4, 17, 10),
  roads_link: zoomLine(12.5, 0.4, 15, 2.4, 17, 7.5),
  roads_minor_casing: zoomLine(11.5, 1, 15, 4, 17, 10),
  roads_minor: zoomLine(11.5, 0.4, 15, 2.4, 17, 7.5),
  roads_minor_service_casing: zoomLine(13, 0.8, 15, 3, 17, 7),
  roads_minor_service: zoomLine(13, 0.3, 15, 1.6, 17, 5),
};

function restyle(layer: LayerSpecification): LayerSpecification {
  const l = JSON.parse(JSON.stringify(layer).replace(/Noto Sans Italic/g, 'Noto Sans Regular')) as LayerSpecification;
  const width = WIDTHS[l.id];
  if (width && l.type === 'line') {
    const casing = l.id.includes('casing');
    const paint: Record<string, unknown> = {
      'line-color': casing ? MAP_COLORS.roadCase : MAP_COLORS.road,
      'line-width': width,
    };
    const minzoom = l.id.startsWith('roads_minor_service') ? 13 : l.id.startsWith('roads_minor') ? 11.5 : l.minzoom;
    return {
      ...l,
      ...(minzoom !== undefined ? { minzoom } : {}),
      maxzoom: undefined,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint,
    } as unknown as LayerSpecification;
  }
  if (l.id === 'roads_other' && l.type === 'line') {
    // Tracks and footpaths: thin dashes.
    return {
      ...l,
      minzoom: 12.5,
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#B9AF97',
        'line-width': zoomLine(12.5, 0.7, 15, 1.3, 17, 3),
        'line-dasharray': [2, 1.5],
      },
    } as unknown as LayerSpecification;
  }
  if (l.id === 'places_locality' && l.type === 'symbol') {
    return {
      ...l,
      layout: {
        'symbol-sort-key': ['case', IS_TOWN, 0, 1],
        'text-field': PLACE_NAME,
        'text-font': ['Noto Sans Medium'],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.08,
        'text-size': ['interpolate', ['linear'], ['zoom'], 10, ['case', IS_TOWN, 12, 9.5], 15, ['case', IS_TOWN, 16, 12]],
        'text-max-width': 8,
        'text-padding': 4,
      },
      paint: {
        'text-color': ['case', IS_TOWN, MAP_COLORS.ink, MAP_COLORS.ink2],
        'text-halo-color': MAP_COLORS.halo,
        'text-halo-width': 1.6,
        'text-halo-blur': 0.5,
      },
    } as unknown as LayerSpecification;
  }
  if (l.id === 'places_subplace' && l.type === 'symbol') {
    return {
      ...l,
      layout: {
        ...l.layout,
        'text-field': PLACE_NAME,
        'text-font': ['Noto Sans Regular'],
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.06,
        'text-size': zoomLine(12, 9, 16, 11),
      },
    } as unknown as LayerSpecification;
  }
  return l;
}

export function navyMapStyle(pmtilesKey: string | null): StyleSpecification {
  const base = pmtilesKey ? layers(SOURCE_ID, navyFlavor(), { lang: 'fr' }) : [];
  const style: StyleSpecification = {
    version: 8,
    glyphs: GLYPHS_URL,
    sources: pmtilesKey
      ? { [SOURCE_ID]: { type: 'vector', url: `pmtiles://${pmtilesKey}`, attribution: MAP_ATTRIBUTION } }
      : {},
    layers: [
      // Without the island file (offline, never kept): a neutral paper instead of a sea.
      { id: 'background', type: 'background', paint: { 'background-color': pmtilesKey ? MAP_COLORS.sea : '#EFEDE6' } },
      ...base.filter((l) => l.id !== 'background' && !DROPPED.has(l.id)).map(restyle),
    ],
  };
  return style;
}
