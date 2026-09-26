/**
 * Driver — "Mes courses" (phase 2A): accepted parcels. Itinerary link to the depot then
 * to the arrival grocer, call the grocer, confirm the pick-up AFTER the grocer's
 * hand-over (double confirmation). Shows only what the driver earns.
 * Offline: the list stays readable; the pick-up confirmation is kept and sent later.
 * Phase 2B2, direct hand-over: go to the client (place on the map, landmark), call him,
 * look at the photo of the opened content, refuse the parcel with a reason, or confirm
 * "J'ai le colis" AFTER the client's gesture (or his scan of my QR). Refusing needs the
 * network.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Camera, CheckCircle2, Clock, Loader2, MapPin, Navigation, Phone, QrCode, Route, Smartphone, WifiOff } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { doGesture, refreshParcels, refuseHandover, signedPhotoUrl, useParcels } from '../../services/parcelService';
import type { NavyParcelLocal } from '../../db/navyDb';
import { CATEGORY_LABELS, formatKm, parcelErrorMessage } from '../../utils/parcelRules';
import { formatTime, ParcelCode, ParcelStatusBadge } from './ParcelUi';
import { btnAccent, btnSecondary, formatAr, inputCls, labelCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

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
        current.map((p) => <CourseCard key={p.id} p={p} userId={userId} isOnline={isOnline} queued={parcels.queue.some((q) => q.op.parcelId === p.id)} />)
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
        <p><strong>Remise par le client</strong> : allez au lieu indiqué et appelez le client en approchant. Regardez la photo du contenu. Si le colis ne correspond pas ou ne peut pas être transporté, refusez-le en donnant le motif. Sinon, le client confirme la remise (ou scanne votre QR), puis vous touchez « J’ai le colis ».</p>
      </NavyHelp>
    </NavyPage>
  );
}

function CourseCard({ p, userId, queued, isOnline }: { p: NavyParcelLocal; userId: string; queued: boolean; isOnline: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const toDepot = p.status === 'chauffeur_trouve';
  const remise = p.departure_mode === 'remise';
  const link = toDepot ? mapLink(p.depot_lat, p.depot_lng) : mapLink(p.arrival_lat, p.arrival_lng);
  // Direct hand-over: the driver calls the CLIENT (phone given at the order).
  const phone = toDepot ? (remise ? p.sender_phone : p.depot_phone) : p.arrival_phone;
  const firstHalfDone = remise ? !!p.client_handover_at : !!p.handover_grocer_at;

  const showPhoto = async () => {
    if (!p.photo_path) return;
    const url = await signedPhotoUrl(p.photo_path);
    if (url) setPhotoUrl(url);
    else setMsg({ tone: 'error', text: 'La photo n’a pas pu être ouverte. Réessayez avec le réseau.' });
  };

  const refuse = async () => {
    if (reason.trim().length < 3) return setMsg({ tone: 'error', text: 'Indiquez le motif du refus.' });
    setBusy(true);
    setMsg(null);
    try {
      await refuseHandover(p.id, reason.trim());
      setMsg({ tone: 'ok', text: 'Colis refusé. Le client est prévenu.' });
      void refreshParcels(userId);
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
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
          <p className="text-sm text-navyay-charcoal/75">{CATEGORY_LABELS[p.category]} · {formatKm(p.distance_km)} · acceptée à {formatTime(p.driver_found_at)}</p>
        </div>
        <ParcelStatusBadge status={p.status} />
      </div>
      <p className="text-lg">Vous gagnez <strong className="tabular-nums">{formatAr(p.driver_fare)}</strong></p>
      <div className="rounded-xl bg-navyay-charcoal/[0.05] px-3 py-3 space-y-1">
        <p className="flex items-center gap-2 text-sm text-navyay-charcoal/75">
          <MapPin className="w-4 h-4" aria-hidden="true" />
          {toDepot ? (remise ? 'Récupérer le colis auprès du client' : 'Aller chercher le colis chez') : 'Livrer chez'}
        </p>
        <p className="font-semibold">{toDepot ? (remise ? p.sender_name ?? 'Client' : p.depot_name) : p.arrival_name}</p>
        {toDepot && remise && p.handover_note && <p className="text-sm">Repère : {p.handover_note}</p>}
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
            {toDepot && remise ? 'Appeler le client' : 'Appeler l’épicier'}
          </a>
        ) : (
          <span />
        )}
      </div>
      {toDepot && remise && (
        <div className="space-y-2">
          {p.photo_path ? (
            photoUrl ? (
              <img src={photoUrl} alt="Photo du contenu prise par le client" className="w-full max-h-56 object-contain rounded-xl bg-navyay-charcoal/5" />
            ) : (
              <button type="button" className={`${btnSecondary} w-full`} disabled={!isOnline} onClick={() => void showPhoto()}>
                <Camera className="w-4 h-4" aria-hidden="true" />
                Voir la photo du contenu
              </button>
            )
          ) : (
            <p className="text-sm text-navyay-charcoal/75">Le client n’a pas encore pris la photo du contenu.</p>
          )}
          <Link to="/navy/qr" className={`${btnSecondary} w-full`}>
            <QrCode className="w-4 h-4" aria-hidden="true" />
            Montrer mon QR au client
          </Link>
        </div>
      )}
      {toDepot && remise && !p.handover_driver_at && (
        refusing ? (
          <div className="space-y-2 rounded-xl border border-navyay-charcoal/15 p-3">
            <label className={labelCls}>
              Motif du refus
              <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Ex. colis trop lourd pour la moto" />
            </label>
            {!isOnline && <NavyNotice icon={WifiOff}>Le refus demande le réseau.</NavyNotice>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={btnSecondary} disabled={busy} onClick={() => setRefusing(false)}>
                Retour
              </button>
              <button type="button" className={btnAccent} disabled={busy || !isOnline} onClick={() => void refuse()}>
                {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Ban className="w-5 h-5" aria-hidden="true" />}
                Confirmer le refus
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={`${btnSecondary} w-full`} onClick={() => setRefusing(true)}>
            <Ban className="w-4 h-4" aria-hidden="true" />
            Refuser ce colis
          </button>
        )
      )}
      {toDepot &&
        (queued ? (
          <NavyNotice icon={Smartphone}>Confirmation gardée sur ce téléphone, envoyée au retour du réseau.</NavyNotice>
        ) : firstHalfDone ? (
          <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={() => void confirm()}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
            J’ai le colis
          </button>
        ) : (
          <NavyNotice icon={Clock}>
            {remise
              ? 'Le client confirme d’abord la remise (ou scanne votre QR). Ensuite, touchez « J’ai le colis ».'
              : 'À l’épicerie, l’épicier confirme d’abord la remise. Ensuite, touchez « J’ai le colis ».'}
          </NavyNotice>
        ))}
      {!toDepot && <p className="text-sm">À l’arrivée, l’épicier saisit le code écrit sur le colis : la course est alors terminée.</p>}
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
    </NavyCard>
  );
}
