/**
 * Driver home — "Direction du moment" (phase 1B). A big Available / Not available
 * switch. Becoming available = touching on the map the place the driver is heading to
 * (last destination proposed by default); the arrival zone is shown in plain words.
 * Only that destination is recorded, never a live position. Availability ends by
 * itself 3 h after the last update, with a "Toujours disponible ?" reminder.
 * Offline: the choice is kept on the phone and sent when the network comes back.
 */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Loader2, MapPin, Navigation, PauseCircle, PlayCircle, Smartphone } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { useNavyProfile } from '../../services/navyProfileStore';
import { loadDriverStatus, setDriverAvailability, useDriverState } from '../../services/driverService';
import { loadZones, useNavyZones, zoneName } from '../../services/zoneService';
import { DRIVER_REMINDER_MS, formatRemaining, isLocalAvailable, localAvailableUntil, zoneForPoint } from '../../utils/geo';
import NavyMap from '../map/NavyMap';
import { NavyNotifyPrompt } from '../parcel/ParcelUi';
import { btnAccent, btnPrimary, btnSecondary, NavyCard, NavyHelp, NavyNotice, NavyOfflineNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

export default function DriverDirectionPage() {
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const isOnline = useOnlineStatus();
  const driver = useDriverState();
  const { zones } = useNavyZones();
  const row = profile.partners.find((p) => p.kind === 'chauffeur' && p.status === 'approved');
  const [choosing, setChoosing] = useState(false);
  const [dest, setDest] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!userId || !row) return;
    void loadZones();
    void loadDriverStatus(userId, row.id);
  }, [userId, row?.id, isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const status = driver.userId === userId ? driver.status : null;
  const available = isLocalAvailable(status, now);
  const until = localAvailableUntil(status);
  const expired = !!status?.available && !available;
  const remaining = until ? until - now : 0;
  const currentDest = status && status.destLat != null && status.destLng != null ? { lat: status.destLat, lng: status.destLng } : null;

  const previewZone = useMemo(() => zoneForPoint(zones, dest?.lat, dest?.lng), [zones, dest]);
  // Server zone once known, else the same computation made on the phone.
  const currentZone =
    zoneName(zones, status?.destZoneId) ?? (currentDest ? zoneForPoint(zones, currentDest.lat, currentDest.lng)?.name ?? null : null);

  if (!row || !userId) return null; // guarded by NavyRoleRoute

  const startChoosing = () => {
    setError(null);
    setDest(currentDest ?? driver.lastDest ?? null);
    setChoosing(true);
  };

  const confirm = async () => {
    if (!dest) {
      setError('Touchez sur la carte l’endroit où vous allez.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await setDriverAvailability(userId, row.id, true, dest);
      if (res === 'error') setError('Votre disponibilité n’a pas été acceptée. Rechargez l’application puis réessayez.');
      else setChoosing(false);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    setError(null);
    try {
      await setDriverAvailability(userId, row.id, false, null);
      setChoosing(false);
    } finally {
      setBusy(false);
    }
  };

  const stillAvailable = async () => {
    if (!currentDest) return startChoosing();
    setBusy(true);
    try {
      await setDriverAvailability(userId, row.id, true, currentDest);
    } finally {
      setBusy(false);
    }
  };

  return (
    <NavyPage>
      <NavyPageTitle icon={Navigation} title="Ma direction" subtitle={row.display_name ?? undefined} />
      {!isOnline && <NavyOfflineNotice>Hors ligne : votre choix est gardé sur ce téléphone et partira au retour du réseau.</NavyOfflineNotice>}
      <NavyNotifyPrompt why="Activez les notifications : une course ne vous attend que 30 secondes. Sans notification, vous la manquerez." />

      <button
        type="button"
        onClick={() => (available ? void stop() : choosing ? setChoosing(false) : startChoosing())}
        disabled={busy}
        aria-pressed={available}
        className={`w-full flex items-center gap-4 rounded-2xl px-5 py-5 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navyay-charcoal transition-colors disabled:opacity-70 ${
          available ? 'bg-navyay-yellow text-navyay-charcoal' : 'bg-navyay-charcoal text-white'
        }`}
      >
        {available ? (
          <PlayCircle className="w-9 h-9 flex-shrink-0" aria-hidden="true" />
        ) : (
          <PauseCircle className="w-9 h-9 flex-shrink-0 text-navyay-yellow" aria-hidden="true" />
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-2xl font-bold">{available ? 'Disponible' : 'Pas disponible'}</span>
          <span className={`block text-sm ${available ? 'text-navyay-charcoal/80' : 'text-white/80'}`}>
            {available
              ? 'Vous pouvez emporter un colis sur votre trajet. Touchez pour arrêter.'
              : choosing
              ? 'Choisissez votre destination ci-dessous, ou touchez pour annuler.'
              : 'Touchez pour dire où vous allez.'}
          </span>
        </span>
      </button>

      {status?.pending && (
        <NavyNotice icon={Smartphone}>Gardé sur ce téléphone, en attente d’envoi. Il part tout seul dès que le réseau revient.</NavyNotice>
      )}
      {error && <NavyNotice tone="error">{error}</NavyNotice>}

      {available && !choosing && remaining <= DRIVER_REMINDER_MS && (
        <NavyCard className="p-4 space-y-3 border-navyay-yellow">
          <p className="flex items-center gap-2 font-semibold">
            <Clock className="w-5 h-5" aria-hidden="true" />
            Toujours disponible ?
          </p>
          <p className="text-sm text-navyay-charcoal/80">Votre disponibilité s’arrête dans {formatRemaining(remaining)}.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btnAccent} disabled={busy} onClick={() => void stillAvailable()}>
              Oui, je continue
            </button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => void stop()}>
              Non, j’arrête
            </button>
          </div>
        </NavyCard>
      )}

      {expired && !choosing && (
        <NavyNotice tone="warn" icon={Clock}>
          Votre disponibilité s’est arrêtée toute seule (3 heures sans mise à jour). Touchez « Pas disponible » pour repartir.
        </NavyNotice>
      )}

      {choosing ? (
        <NavyCard className="p-4 space-y-3">
          <h3 className="font-semibold">Où allez-vous ?</h3>
          <p className="text-sm text-navyay-charcoal/80">Touchez la carte à l’endroit de votre arrivée, ou faites glisser l’épingle.</p>
          <NavyMap
            ariaLabel="Carte : choisissez votre destination"
            zones={zones}
            pin={dest}
            onPinChange={(lat, lng) => setDest({ lat, lng })}
            fit={dest ? 'pin' : 'island'}
          />
          <p className="flex items-center gap-2 text-base" aria-live="polite">
            <MapPin className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            {dest ? (
              <span>
                Zone d’arrivée : <strong>{previewZone?.name ?? 'hors zone'}</strong>
              </span>
            ) : (
              <span className="text-navyay-charcoal/75">Aucune destination choisie</span>
            )}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className={btnAccent} disabled={busy || !dest} onClick={() => void confirm()}>
              {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
              Je suis disponible
            </button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => setChoosing(false)}>
              Annuler
            </button>
          </div>
        </NavyCard>
      ) : (
        available &&
        currentDest && (
          <NavyCard className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-6 h-6 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-navyay-charcoal/75">Vous allez vers</p>
                <p className="text-xl font-bold">{currentZone ?? 'hors zone'}</p>
                <p className="text-sm text-navyay-charcoal/75">Encore {formatRemaining(remaining)} de disponibilité</p>
              </div>
            </div>
            <NavyMap ariaLabel="Carte : votre destination" zones={zones} pin={currentDest} fit="pin" heightClass="h-56" />
            <button type="button" className={`${btnPrimary} w-full`} disabled={busy} onClick={startChoosing}>
              <Navigation className="w-4 h-4" aria-hidden="true" />
              Changer de destination
            </button>
          </NavyCard>
        )
      )}

      <NavyHelp title="À quoi sert la direction ?">
        <p>Vous faites déjà des trajets : en indiquant où vous allez, NAVY ay peut vous confier un colis pour cette zone.</p>
        <p>Seule votre destination est enregistrée. Votre position n’est jamais suivie.</p>
        <p>La disponibilité s’arrête toute seule 3 heures après votre dernier choix. Un rappel « Toujours disponible ? » s’affiche avant.</p>
        <p>Sans réseau, votre choix est gardé sur le téléphone et part tout seul au retour du réseau.</p>
      </NavyHelp>
    </NavyPage>
  );
}
