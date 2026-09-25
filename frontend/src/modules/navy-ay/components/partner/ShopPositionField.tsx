/**
 * "Position de la boutique" (phase 1B), used by the grocer request form and by
 * "Mon épicerie": "Utiliser ma position" (to do on site), then adjust the pin; the
 * zone computed from the point is shown ("Zone : Hell-Ville"). Read-only once the
 * position has been checked on site by an operator.
 */
import { useEffect, useMemo } from 'react';
import { BadgeCheck, MapPin } from 'lucide-react';
import { loadZones, useNavyZones, zoneName } from '../../services/zoneService';
import { formatLatLng, zoneForPoint } from '../../utils/geo';
import NavyMap from '../map/NavyMap';

interface Props {
  lat: number | null;
  lng: number | null;
  onChange?: (lat: number, lng: number) => void;
  /** Zone computed by the server (shown when the point is the saved one). */
  serverZoneId?: string | null;
  verifiedAt?: string | null;
}

export default function ShopPositionField({ lat, lng, onChange, serverZoneId, verifiedAt }: Props) {
  const { zones } = useNavyZones();
  useEffect(() => {
    void loadZones();
  }, []);
  const readOnly = !onChange || !!verifiedAt;
  const pin = lat != null && lng != null ? { lat, lng } : null;
  const zone = useMemo(() => (pin ? zoneForPoint(zones, pin.lat, pin.lng) : null), [zones, pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const zoneLabel = (readOnly ? zoneName(zones, serverZoneId) : null) ?? zone?.name ?? null;

  return (
    <div className="space-y-2">
      {!readOnly && (
        <p className="text-sm text-navyay-charcoal/80">
          À faire <strong>devant la boutique</strong> : touchez « Ma position », puis ajustez l’épingle sur la porte d’entrée.
        </p>
      )}
      <NavyMap
        ariaLabel="Carte : position de la boutique"
        zones={zones}
        pin={pin}
        onPinChange={readOnly ? undefined : onChange}
        locate={!readOnly}
        fit={pin ? 'pin' : 'island'}
        heightClass="h-72"
      />
      <p className="flex items-center gap-2" aria-live="polite">
        <MapPin className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        {pin ? (
          <span>
            Zone : <strong>{zoneLabel ?? 'hors zone'}</strong>
            <span className="sr-only"> ({formatLatLng(pin.lat, pin.lng)})</span>
          </span>
        ) : (
          <span className="text-navyay-charcoal/75">Position pas encore indiquée</span>
        )}
      </p>
      {verifiedAt && (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <BadgeCheck className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          Position vérifiée sur place le {new Date(verifiedAt).toLocaleDateString('fr-FR')}. Elle ne peut plus être changée ici.
        </p>
      )}
    </div>
  );
}
