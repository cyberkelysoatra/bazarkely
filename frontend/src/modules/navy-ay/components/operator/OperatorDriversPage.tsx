/**
 * Operator — "Chauffeurs disponibles" (phase 1B): drivers available right now, with
 * the DESTINATION they chose and its zone (list + map). No current position is ever
 * recorded or shown. A choice older than 3 h no longer counts (nothing is written at
 * expiry: the list compares with the current time). ONLINE ONLY.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigation, RefreshCw, Truck, WifiOff } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { listDriverStatuses, operatorErrorMessage, type DriverWithPartner } from '../../services/operatorService';
import { loadZones, useNavyZones, zoneName } from '../../services/zoneService';
import { formatRemaining, isServerAvailable } from '../../utils/geo';
import { VEHICLE_LABELS } from '../../utils/partnerRules';
import NavyMap, { type NavyMapMarker } from '../map/NavyMap';
import { btnSecondary, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

const REFRESH_MS = 60000;

export default function OperatorDriversPage() {
  const isOnline = useOnlineStatus();
  const { zones } = useNavyZones();
  const [rows, setRows] = useState<DriverWithPartner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setError(null);
    try {
      void loadZones();
      setRows(await listDriverStatuses());
      setNow(Date.now());
    } catch (err) {
      setError(operatorErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    void load();
    const t = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [isOnline, load]);

  const available = useMemo(
    () => (rows ?? []).filter((r) => r.partner?.status === 'approved' && isServerAvailable(r, now)),
    [rows, now]
  );
  const markers: NavyMapMarker[] = useMemo(
    () =>
      available
        .filter((r) => r.dest_lat != null && r.dest_lng != null)
        .map((r) => ({
          id: r.partner_id,
          lat: r.dest_lat as number,
          lng: r.dest_lng as number,
          kind: 'dest' as const,
          label: `${r.partner?.display_name ?? 'Chauffeur'} → ${zoneName(zones, r.dest_zone_id) ?? 'hors zone'}`,
        })),
    [available, zones]
  );

  return (
    <NavyPage>
      <NavyPageTitle icon={Navigation} title="Chauffeurs disponibles" subtitle="Où vont les chauffeurs en ce moment." />

      {!isOnline ? (
        <NavyNotice icon={WifiOff}>Cet écran demande une connexion. La liste s’affichera au retour du réseau.</NavyNotice>
      ) : error ? (
        <>
          <NavyNotice tone="error">{error}</NavyNotice>
          <button type="button" className={btnSecondary} onClick={() => void load()}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Réessayer
          </button>
        </>
      ) : rows === null ? (
        <NavyLoader />
      ) : (
        <>
          <NavyMap ariaLabel="Carte des destinations des chauffeurs disponibles" zones={zones} markers={markers} fit="content" />
          {available.length === 0 ? (
            <NavyCard className="px-5 py-8 text-center">
              <Truck className="mx-auto w-10 h-10 text-navyay-charcoal/60" aria-hidden="true" />
              <p className="mt-3 font-semibold">Aucun chauffeur disponible</p>
              <p className="mt-1 text-sm text-navyay-charcoal/75">Un chauffeur apparaît ici dès qu’il se déclare disponible.</p>
            </NavyCard>
          ) : (
            <ul className="space-y-2" aria-label="Chauffeurs disponibles">
              {available.map((r) => (
                <li key={r.partner_id} className="flex items-center gap-3 rounded-2xl border border-navyay-charcoal/10 bg-white px-4 py-3">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-navyay-yellow text-navyay-charcoal flex items-center justify-center">
                    <Navigation className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold truncate">{r.partner?.display_name || 'Chauffeur'}</span>
                    <span className="block text-sm text-navyay-charcoal/75 truncate">
                      Va vers <strong>{zoneName(zones, r.dest_zone_id) ?? 'hors zone'}</strong>
                      {r.partner?.vehicle_type ? ` · ${VEHICLE_LABELS[r.partner.vehicle_type]}` : ''}
                      {r.partner?.vehicle_plate ? ` ${r.partner.vehicle_plate}` : ''}
                    </span>
                  </span>
                  <span className="flex-shrink-0 text-xs font-semibold tabular-nums text-navyay-charcoal/75">
                    encore {formatRemaining(new Date(r.available_until as string).getTime() - now)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={btnSecondary} onClick={() => void load()}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Actualiser
          </button>
        </>
      )}

      <NavyHelp title="À quoi sert cet écran ?">
        <p>Chaque chauffeur disponible indique l’endroit où il se rend. Vous voyez ainsi qui peut emporter un colis vers une zone.</p>
        <p>Seule la destination est connue, jamais la position actuelle du chauffeur.</p>
        <p>Une disponibilité s’arrête toute seule 3 heures après le dernier choix du chauffeur. La liste se met à jour chaque minute.</p>
      </NavyHelp>
    </NavyPage>
  );
}
