/**
 * NAVY ay map, client overlays (phase 2C2), shared by the vector engine and the Leaflet
 * fallback: the person's dot ("Vous"), grocers as squares, drivers with their price tag.
 * Shapes and colours from the validated mock-up (MAQUETTE-CARTE-VIVANTE.html).
 *
 * Elements are built with the DOM: every text coming from the database (names, plates,
 * prices) is set through textContent / attributes, never as HTML. The SVG strings below
 * are constants.
 */
import type { NavyMapShop, NavyMapVehicle } from './navyMapTypes';

const Y = '#E9B824';
const C = '#2E2E2E';
/** Obstacles: the only warning colour of the NAVY maps. */
export const RED = '#B42318';

const svg = (inner: string, stroke = Y, size = 20, width = 2) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

/** Inner paths of the vehicle pictograms (24 x 24, lucide style). */
const VEHICLE_PATHS: Record<string, string> = {
  bajaj: '<path d="M4 16V9a4 4 0 0 1 4-4h6l4 5h1a1 1 0 0 1 1 1v5"/><path d="M4 12h14"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  moto: '<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M8.5 16.5h5l3-6h-4l-2-3H8"/><path d="M15 6h3"/>',
  velo: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>',
  voiture: '<path d="M3 15v-3l2-5h14l2 5v3"/><path d="M3 15h18v2H3z"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
  camion: '<path d="M2 6h11v10H2z"/><path d="M13 9h5l4 4v3h-9"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
};
/** Pictogram key of a vehicle type (taxi and others drawn as a car). */
export function vehicleKey(type: string | null | undefined): string {
  return VEHICLE_PATHS[type ?? ''] ? (type as string) : 'voiture';
}
export const VEHICLE_KEYS = Object.keys(VEHICLE_PATHS);

/** Vehicle pictograms (line icons in the lucide style, yellow on charcoal). */
export const VEHICLE_SVG: Record<string, string> = Object.fromEntries(Object.entries(VEHICLE_PATHS).map(([k, v]) => [k, svg(v)]));
VEHICLE_SVG.taxi = VEHICLE_SVG.voiture;
VEHICLE_SVG.autre = VEHICLE_SVG.voiture;

export function vehicleSvg(type: string | null | undefined): string {
  return VEHICLE_SVG[type ?? ''] ?? VEHICLE_SVG.voiture;
}

const SHOP_SVG = svg('<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>', C, 15, 2.4);

/** CSS of the overlays (scoped to the map containers of NAVY). */
export const OVERLAY_CSS = `
.navy-me{width:44px;height:44px;display:grid;place-items:center;background:none;border:0;padding:0;cursor:pointer}
.navy-me::after{content:'';width:22px;height:22px;border-radius:50%;background:${Y};border:3px solid ${C};box-shadow:0 0 0 0 rgba(233,184,36,.7);animation:navyMePing 2s infinite}
@keyframes navyMePing{70%{box-shadow:0 0 0 16px rgba(233,184,36,0)}100%{box-shadow:0 0 0 0 rgba(233,184,36,0)}}
.navy-shop{display:flex;align-items:center;gap:6px;min-height:44px;cursor:pointer;background:none;border:0;padding:0;font:inherit}
.navy-shop .sq{width:26px;height:26px;border-radius:8px;background:#fff;border:2px solid ${C};display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.navy-shop .nm{font-size:11px;font-weight:800;background:#fff;color:${C};padding:2px 6px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.2);white-space:nowrap;max-width:9.5rem;overflow:hidden;text-overflow:ellipsis}
.navy-shop.dest .sq{background:${Y};width:34px;height:34px;border-radius:10px}
.navy-shop.pick .sq{border-color:${Y};border-width:3px}
.navy-zlo:not(.navy-names) .navy-shop:not(.dest):not(.pick) .nm{display:none}
.navy-veh{position:relative;width:44px;height:44px;cursor:pointer;transition:opacity .4s;background:none;border:0;padding:0}
.navy-veh .disc{position:absolute;inset:6px;border-radius:50%;background:${C};display:grid;place-items:center;box-shadow:0 3px 10px rgba(0,0,0,.35);border:2px solid #fff}
.navy-veh .tagp{position:absolute;left:50%;bottom:39px;transform:translateX(-50%);background:${Y};color:${C};font-weight:800;font-size:12px;padding:2px 7px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25);font-variant-numeric:tabular-nums}
.navy-veh.dim{opacity:.32}
.navy-veh.stale .disc{background:#8A8A85}
.navy-veh.stale .disc svg{stroke:#F1F1EE}
.navy-veh.untracked .disc{background:#fff;border:2px dashed ${C}}
.navy-veh.untracked .disc svg{stroke:${C}}
.navy-obs{width:30px;height:30px;border-radius:50%;background:${RED};border:2px solid #fff;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.3)}
.navy-veh.sel .disc{border-color:${Y};box-shadow:0 0 0 5px rgba(233,184,36,.45),0 3px 10px rgba(0,0,0,.35)}
.navy-me:focus-visible,.navy-shop:focus-visible,.navy-veh:focus-visible{outline:3px solid ${Y};outline-offset:2px;border-radius:12px}
@media (prefers-reduced-motion: reduce){.navy-me::after{animation:none}.navy-veh{transition:none}}
`;

export function meElement(tappable = false): HTMLElement {
  const el = document.createElement(tappable ? 'button' : 'div');
  el.className = 'navy-me';
  el.setAttribute('aria-label', tappable ? 'Vous (touchez pour déplacer le départ)' : 'Vous');
  el.title = 'Vous';
  if (tappable) (el as HTMLButtonElement).type = 'button';
  return el;
}

export function shopElement(s: NavyMapShop): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `navy-shop${s.role === 'dest' ? ' dest' : s.role === 'pick' ? ' pick' : ''}`;
  el.setAttribute('aria-label', `Épicerie ${s.name}`);
  el.title = s.name;
  const sq = document.createElement('span');
  sq.className = 'sq';
  sq.innerHTML = SHOP_SVG;
  const nm = document.createElement('span');
  nm.className = 'nm';
  nm.textContent = s.name;
  el.append(sq, nm);
  return el;
}

export function vehicleElement(v: NavyMapVehicle): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `navy-veh${v.dim ? ' dim' : ''}${v.selected ? ' sel' : ''}${v.state && v.state !== 'live' ? ` ${v.state}` : ''}`;
  el.setAttribute('aria-label', vehicleAria(v));
  el.title = v.label;
  const disc = document.createElement('span');
  disc.className = 'disc';
  disc.innerHTML = vehicleSvg(v.type);
  el.append(disc);
  if (v.price) {
    const tag = document.createElement('span');
    tag.className = 'tagp';
    tag.textContent = v.price;
    el.append(tag);
  }
  return el;
}

/** Spoken name of a vehicle: name, state, price. */
export function vehicleAria(v: NavyMapVehicle): string {
  const state = v.state === 'untracked' ? ', position non suivie' : v.state === 'stale' ? ', position incertaine' : '';
  return `${v.label}${state}${v.price ? `, ${v.price}` : ''}`;
}

// ------------------------------------------------------------------ phase 2C3 images

/**
 * Vehicle drawn as an image of the vector map (88 px = 44 px at pixel ratio 2):
 * live = charcoal disc + yellow pictogram; untracked (NAVY ay not open on his phone,
 * shown at his destination) = white disc, dashed charcoal edge; stale (no position for
 * 2 minutes) = grey. `sel` adds the yellow ring of the selected vehicle.
 */
export function vehicleImageSvg(key: string, state: 'live' | 'untracked' | 'stale', sel: boolean): string {
  const disc = state === 'untracked' ? '#FFFFFF' : state === 'stale' ? '#8A8A85' : C;
  const edge = state === 'untracked' ? C : '#FFFFFF';
  const icon = state === 'untracked' ? C : state === 'stale' ? '#F1F1EE' : Y;
  const dash = state === 'untracked' && !sel ? ' stroke-dasharray="7 5"' : '';
  const ring = sel ? '<circle cx="44" cy="44" r="42" fill="rgba(233,184,36,.45)"/>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88">${ring}<circle cx="44" cy="46" r="31" fill="rgba(0,0,0,.22)"/><circle cx="44" cy="44" r="30" fill="${disc}" stroke="${sel ? Y : edge}" stroke-width="4"${dash}/><g transform="translate(24 24) scale(1.667)" fill="none" stroke="${icon}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${VEHICLE_PATHS[key] ?? VEHICLE_PATHS.voiture}</g></svg>`;
}

/** Yellow price tag, stretched around the text (icon-text-fit). 40 x 28 at ratio 2. */
export const TAG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="28" viewBox="0 0 40 28"><rect x="1" y="1" width="38" height="26" rx="9" fill="${Y}" stroke="rgba(46,46,46,.25)" stroke-width="1"/></svg>`;

/** Obstacle pictograms (lucide: construction, waves, ban, triangle-alert). */
export const OBSTACLE_PATHS: Record<string, string> = {
  travaux: '<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/>',
  inondation: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  ferme: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  autre: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
};

/** Obstacle disc for the vector map (64 px = 32 px at ratio 2); `proposed` = white, dashed. */
export function obstacleImageSvg(kind: string, proposed = false): string {
  const fill = proposed ? '#FFFFFF' : RED;
  const stroke = proposed ? RED : '#FFFFFF';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="33" r="28" fill="rgba(0,0,0,.2)"/><circle cx="32" cy="32" r="27" fill="${fill}" stroke="${proposed ? RED : '#FFFFFF'}" stroke-width="4"${proposed ? ' stroke-dasharray="6 4"' : ''}/><g transform="translate(16 16) scale(1.333)" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${OBSTACLE_PATHS[kind] ?? OBSTACLE_PATHS.autre}</g></svg>`;
}

/** Hatched line pattern (red / white stripes), 16 x 16 at ratio 2. */
export const HATCH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="#FFFFFF"/><path d="M-4 12 12 -4M0 16 16 0M4 20 20 4" stroke="${RED}" stroke-width="4.5"/></svg>`;

/** Leaflet fallback: the same obstacle disc as an element. */
export function obstacleElement(kind: string, label: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'navy-obs';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', label);
  el.title = label;
  el.innerHTML = svg(OBSTACLE_PATHS[kind] ?? OBSTACLE_PATHS.autre, '#fff', 17, 2.2);
  return el;
}

/** An SVG string as a decoded image (for map.addImage). */
export function svgImage(svgText: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('svg image'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  });
}

/** Stable key of a list of overlays (rebuild the markers only when something changed). */
export function overlayKey(items: unknown[] | undefined | null): string {
  return JSON.stringify(items ?? []);
}
