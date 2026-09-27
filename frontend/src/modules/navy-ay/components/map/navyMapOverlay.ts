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

const svg = (inner: string, stroke = Y, size = 20, width = 2) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

/** Vehicle pictograms (line icons in the lucide style, yellow on charcoal). */
export const VEHICLE_SVG: Record<string, string> = {
  bajaj: svg('<path d="M4 16V9a4 4 0 0 1 4-4h6l4 5h1a1 1 0 0 1 1 1v5"/><path d="M4 12h14"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>'),
  moto: svg('<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M8.5 16.5h5l3-6h-4l-2-3H8"/><path d="M15 6h3"/>'),
  velo: svg('<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>'),
  voiture: svg('<path d="M3 15v-3l2-5h14l2 5v3"/><path d="M3 15h18v2H3z"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>'),
  camion: svg('<path d="M2 6h11v10H2z"/><path d="M13 9h5l4 4v3h-9"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
};
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
  el.className = `navy-veh${v.dim ? ' dim' : ''}${v.selected ? ' sel' : ''}`;
  el.setAttribute('aria-label', v.price ? `${v.label}, ${v.price}` : v.label);
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

/** Stable key of a list of overlays (rebuild the markers only when something changed). */
export function overlayKey(items: unknown[] | undefined | null): string {
  return JSON.stringify(items ?? []);
}
