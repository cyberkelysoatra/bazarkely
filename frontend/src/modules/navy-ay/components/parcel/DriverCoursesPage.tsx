/**
 * Driver — "Mes courses" (phase 2A): accepted parcels. Itinerary link to the depot then
 * to the arrival grocer, call the grocer, confirm the pick-up AFTER the grocer's
 * hand-over (double confirmation). Shows only what the driver earns.
 * Offline: the list stays readable; the pick-up confirmation is kept and sent later.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, MapPin, Navigation, Phone, Route, Smartphone, WifiOff } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { doGesture, refreshParcels, useParcels } from '../../services/parcelService';
import type { NavyParcelLocal } from '../../db/navyDb';
import { CATEGORY_LABELS, parcelErrorMessage } from '../../utils/parcelRules';
import { formatTime, ParcelCode, ParcelStatusBadge } from './ParcelUi';
import { btnAccent, btnSecondary, formatAr, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

/** Itinerary in the phone's map app (no live tracking by NAVY ay). */
function mapLink(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export default function DriverCoursesPage() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const parcels = useParcels();

  useEffect(() => {
    if (!userId || !isOnline) return;
    void refreshParcels(userId);
    const t = window.setInterval(() => void refreshParcels(userId), 10000);
    return () => window.clearInterval(t);
  }, [userId, isOnline]);

  if (!userId) return null;
  const rows = parcels.userId === userId ? parcels.rows.filter((p) => p.driver_user_id === userId) : [];
  const current = rows.filter((p) => p.status === 'chauffeur_trouve' || p.status === 'pris_en_charge');
  const past = rows.filter((p) => !(p.status === 'chauffeur_trouve' || p.status === 'pris_en_charge')).slice(0, 20);

  return (
    <NavyPage>
      <NavyPageTitle icon={Route} title="Mes courses" subtitle="Les colis que vous avez acceptés." />
      {!isOnline && <NavyNotice icon={WifiOff}>Hors ligne : la liste est celle gardée sur ce téléphone. Votre confirmation de prise en charge partira au retour du réseau.</NavyNotice>}
      {parcels.userId !== userId || !parcels.loaded ? (
        <NavyLoader />
      ) : current.length === 0 ? (
        <NavyCard className="p-6 text-center">
          <p className="font-semibold">Aucune course en cours.</p>
          <p className="text-sm text-navyay-charcoal/75">Acceptez une offre pour qu’elle apparaisse ici.</p>
        </NavyCard>
      ) : (
        current.map((p) => <CourseCard key={p.id} p={p} userId={userId} queued={parcels.queue.some((q) => q.op.parcelId === p.id)} />)
      )}

      {past.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-navyay-charcoal/75">Terminées</h3>
          <ul className="space-y-1.5">
            {past.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-navyay-charcoal/10 bg-white px-4 py-3">
                <ParcelCode code={p.code} />
                <span className="flex-1 min-w-0 text-sm truncate">{p.depot_name} → {p.arrival_name}</span>
                <span className="text-sm font-semibold tabular-nums">{formatAr(p.driver_fare)}</span>
                <ParcelStatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <NavyHelp title="Déroulement d’une course">
        <p>1. Allez à l’épicerie de départ (bouton Itinéraire). L’épicier vérifie que c’est vous et vous remet le colis.</p>
        <p>2. Confirmez ensuite « J’ai le colis » : sans ce double geste, le colis n’est pas considéré comme pris en charge.</p>
        <p>3. Apportez-le à l’épicerie d’arrivée : l’épicier saisit le code écrit sur le colis.</p>
      </NavyHelp>
    </NavyPage>
  );
}

function CourseCard({ p, userId, queued }: { p: NavyParcelLocal; userId: string; queued: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const toDepot = p.status === 'chauffeur_trouve';
  const link = toDepot ? mapLink(p.depot_lat, p.depot_lng) : mapLink(p.arrival_lat, p.arrival_lng);
  const phone = toDepot ? p.depot_phone : p.arrival_phone;
  // A message about the previous step (e.g. "kept on this phone") is stale once the
  // parcel has moved on.
  useEffect(() => setMsg(null), [p.status]);

  const confirm = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await doGesture(userId, { kind: 'handover_driver', parcelId: p.id });
      if (res.status === 'error') setMsg({ tone: 'error', text: parcelErrorMessage(res.error) });
      else if (res.status === 'queued') setMsg({ tone: 'info', text: 'Gardé sur ce téléphone, envoyé au retour du réseau.' });
      else {
        setMsg({ tone: 'ok', text: 'Prise en charge confirmée. Bonne route !' });
        void refreshParcels(userId);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <NavyCard className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <ParcelCode code={p.code} />
          <p className="text-sm text-navyay-charcoal/75">{CATEGORY_LABELS[p.category]} · {p.distance_km} km · acceptée à {formatTime(p.driver_found_at)}</p>
        </div>
        <ParcelStatusBadge status={p.status} />
      </div>
      <p className="text-lg">Vous gagnez <strong className="tabular-nums">{formatAr(p.driver_fare)}</strong></p>
      <div className="rounded-xl bg-navyay-charcoal/[0.05] px-3 py-3 space-y-1">
        <p className="flex items-center gap-2 text-sm text-navyay-charcoal/75">
          <MapPin className="w-4 h-4" aria-hidden="true" />
          {toDepot ? 'Aller chercher le colis chez' : 'Livrer chez'}
        </p>
        <p className="font-semibold">{toDepot ? p.depot_name : p.arrival_name}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
            <Navigation className="w-4 h-4" aria-hidden="true" />
            Itinéraire
          </a>
        ) : (
          <span />
        )}
        {phone ? (
          <a href={`tel:${phone.replace(/\s/g, '')}`} className={btnSecondary}>
            <Phone className="w-4 h-4" aria-hidden="true" />
            Appeler l’épicier
          </a>
        ) : (
          <span />
        )}
      </div>
      {toDepot &&
        (queued ? (
          <NavyNotice icon={Smartphone}>Confirmation gardée sur ce téléphone, envoyée au retour du réseau.</NavyNotice>
        ) : p.handover_grocer_at ? (
          <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={() => void confirm()}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
            J’ai le colis
          </button>
        ) : (
          <NavyNotice icon={Clock}>À l’épicerie, l’épicier confirme d’abord la remise. Ensuite, touchez « J’ai le colis ».</NavyNotice>
        ))}
      {!toDepot && <p className="text-sm">À l’arrivée, l’épicier saisit le code écrit sur le colis : la course est alors terminée.</p>}
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
    </NavyCard>
  );
}
