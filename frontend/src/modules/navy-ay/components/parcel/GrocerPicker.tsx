/**
 * Choose a grocer on the map or in a list sorted by distance (phase 2A).
 * Only validated, open, positioned grocers (navy_open_grocers). The reference point
 * of the sort is the person's position (depot) or a point touched on the map, e.g.
 * "near the recipient" (arrival).
 */
import { useMemo, useState } from 'react';
import { Check, Crosshair, Loader2, MapPin, Store } from 'lucide-react';
import type { NavyOpenGrocer } from '../../types/parcel';
import type { NavyZone } from '../../types/partner';
import { estimatedKm } from '../../utils/parcelRules';
import { zoneName } from '../../services/zoneService';
import NavyMap from '../map/NavyMap';
import { btnSecondary, formatAr } from '../ui/NavyUi';

export default function GrocerPicker({
  grocers,
  zones,
  selectedId,
  excludeId,
  onSelect,
  mode,
}: {
  grocers: NavyOpenGrocer[];
  zones: NavyZone[];
  selectedId: string | null;
  excludeId?: string | null;
  onSelect: (id: string) => void;
  /** depot: sorted from my position; arrival: sorted from a point touched on the map. */
  mode: 'depot' | 'arrival';
}) {
  const [ref, setRef] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateMsg, setLocateMsg] = useState<string | null>(null);

  const list = useMemo(() => {
    const items = grocers
      .filter((g) => g.id !== excludeId)
      .map((g) => ({ g, km: ref ? estimatedKm(ref.lat, ref.lng, g.lat, g.lng) / 1.3 : null }));
    items.sort((a, b) => (a.km ?? 0) - (b.km ?? 0) || a.g.shop_name.localeCompare(b.g.shop_name));
    return items;
  }, [grocers, excludeId, ref]);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setLocateMsg('Localisation indisponible sur ce téléphone.');
      return;
    }
    setLocating(true);
    setLocateMsg(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setRef({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocateMsg('Position refusée ou introuvable. Touchez la carte près de chez vous.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const markers = useMemo(
    () => list.map(({ g }) => ({ id: g.id, lat: g.lat, lng: g.lng, label: g.shop_name, kind: 'shop' as const })),
    [list]
  );
  const selected = grocers.find((g) => g.id === selectedId) ?? null;

  if (!grocers.length) {
    return <p className="text-sm text-navyay-charcoal/80">Aucune épicerie partenaire ouverte pour l’instant.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-navyay-charcoal/80">
        {mode === 'depot'
          ? 'Touchez une épicerie sur la carte ou choisissez-la dans la liste (la plus proche en premier).'
          : 'Touchez la carte près de chez le destinataire : la liste se trie par distance. Touchez une épicerie pour la choisir.'}
      </p>
      {mode === 'depot' && (
        <button type="button" className={`${btnSecondary} w-full`} onClick={locate} disabled={locating}>
          {locating ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Crosshair className="w-4 h-4" aria-hidden="true" />}
          Trier depuis ma position
        </button>
      )}
      {locateMsg && <p className="text-sm text-navyay-charcoal/80">{locateMsg}</p>}
      <NavyMap
        ariaLabel={mode === 'depot' ? 'Carte : épiceries de départ' : 'Carte : épiceries d’arrivée'}
        zones={zones}
        markers={markers}
        pin={ref}
        onPinChange={(lat, lng) => setRef({ lat, lng })}
        onMarkerTap={onSelect}
        fit="content"
        heightClass="h-64"
      />
      {selected && (
        <p className="flex items-center gap-2 rounded-xl bg-navyay-yellow px-3 py-2 font-semibold" aria-live="polite">
          <Check className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          {selected.shop_name}
        </p>
      )}
      <ul className="space-y-1.5" aria-label="Épiceries ouvertes">
        {list.map(({ g, km }) => {
          const active = g.id === selectedId;
          return (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onSelect(g.id)}
                aria-pressed={active}
                className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
                  active ? 'border-navyay-charcoal bg-navyay-yellow/25' : 'border-navyay-charcoal/15 bg-white hover:bg-navyay-yellow/10'
                }`}
              >
                <Store className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block font-medium truncate">{g.shop_name}</span>
                  <span className="block text-xs text-navyay-charcoal/75">
                    {zoneName(zones, g.zone_id) ?? 'Hors zone'} ·{' '}
                    {mode === 'depot' ? `dépôt ${formatAr(g.depot_fee)}` : `retrait ${formatAr(g.pickup_fee)}`}
                  </span>
                </span>
                {km !== null && (
                  <span className="flex items-center gap-1 text-xs tabular-nums text-navyay-charcoal/80">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    {km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}
                  </span>
                )}
                {active && <Check className="w-5 h-5 flex-shrink-0" aria-hidden="true" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
