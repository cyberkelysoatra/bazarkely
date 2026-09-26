/**
 * Parcel tracking (phase 2A, 2B1): milestones Accepté / En route / Livré, journal, codes,
 * payment, price, driver call button, choice of another driver when asked, cancel.
 * Phase 2B1: counter-proposal (up to 3 drivers at another price) and its supplement,
 * NAVY credit used. Choosing / refusing a counter-proposal needs the network.
 * Phase 2B2: direct hand-over (place, photo of the opened content, driver identity with
 * his vehicle photo and plate, "remis au chauffeur" or his QR scanned, choice after a
 * driver's refusal) and the prepaid return (choice of the return grocer when the
 * original was a direct hand-over, price frozen, payment, new withdrawal code).
 * Confirmations and payments need the network; the photo is kept on the phone offline.
 *
 * What each person sees is decided by the SERVER (RLS): the price for the sender and
 * operators, the withdrawal code for the sender and the linked recipient only.
 * Offline: the copy kept on the phone (status, codes of own orders) stays readable.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  BadgePercent,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MapPin,
  Navigation,
  PenLine,
  Phone,
  RefreshCw,
  ScanLine,
  Smartphone,
  Sparkles,
  Truck,
  Undo2,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import {
  afterRefusal,
  cancelParcel,
  chooseCounter,
  chooseDriver,
  clientHandover,
  confirmReturn,
  counterOptions,
  doGesture,
  driverCard,
  getParcelDetail,
  loadOpenGrocers,
  parcelDrivers,
  refreshParcels,
  refuseCounter,
  returnQuote,
  signedPhotoUrl,
  useParcels,
  type ParcelDetail,
} from '../../services/parcelService';
import { loadZones, useNavyZones, zoneName } from '../../services/zoneService';
import type { NavyCounterOption, NavyDriverCard, NavyOpenGrocer, NavyQuoteDriver, NavyReturnQuote } from '../../types/parcel';
import type { VehicleType } from '../../types/partner';
import { VEHICLE_LABELS } from '../../utils/partnerRules';
import { CATEGORY_LABELS, formatKm, MAX_DECLARED_VALUE, PAYMENT_LABELS, parcelErrorMessage, SUPPLEMENT_LABELS } from '../../utils/parcelRules';
import { NavyNotifyPrompt, NavyQrScanner, ParcelCode, ParcelMilestones, ParcelStatusBadge, ParcelTimeline, partnerIdFromQr } from './ParcelUi';
import GrocerPicker from './GrocerPicker';
import PhotoField from '../ui/PhotoField';
import { btnAccent, btnPrimary, btnSecondary, formatAr, inputCls, labelCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage } from '../ui/NavyUi';

export default function ParcelDetailPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const parcels = useParcels();
  const { zones } = useNavyZones();
  const [detail, setDetail] = useState<ParcelDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [drivers, setDrivers] = useState<NavyQuoteDriver[] | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [counter, setCounter] = useState<NavyCounterOption[] | null>(null);
  // Phase 2B2
  const [card, setCard] = useState<NavyDriverCard | null>(null);
  const [vehicleUrl, setVehicleUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<Blob | undefined>(undefined);
  const [scan, setScan] = useState(false);
  const [retGrocers, setRetGrocers] = useState<NavyOpenGrocer[] | null>(null);
  const [retChoice, setRetChoice] = useState<string | null>(null);
  const [retQuote, setRetQuote] = useState<NavyReturnQuote | null>(null);

  const load = useCallback(async () => {
    if (!isOnline) return;
    try {
      const d = await getParcelDetail(id);
      setLoadError(null);
      if (!d) setNotFound(true);
      else setDetail(d);
    } catch (err) {
      setLoadError(parcelErrorMessage(err));
    }
  }, [id, isOnline]);

  // Zone names of the departure / arrival (phone copy first, then the server).
  useEffect(() => {
    void loadZones();
  }, []);

  useEffect(() => {
    void load();
    if (!isOnline) return;
    const t = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(t);
  }, [load, isOnline]);

  const local = parcels.userId === userId ? parcels.rows.find((p) => p.id === id) : undefined;
  const parcel = detail?.parcel ?? local ?? null;
  const codes = parcels.codes[id];
  const withdrawCode = detail?.withdrawCode ?? codes?.withdrawCode ?? null;
  const isSender = !!parcel && parcel.sender_id === userId;
  const isRecipient = !!parcel && parcel.recipient_user_id === userId;
  const queuedHere = parcels.queue.filter((q) => q.op.parcelId === id);

  // "Je choisis": the next drivers are more expensive → the client decides.
  const needChoice = isSender && parcel?.search_state === 'attente_client' && parcel.status === 'depose';
  useEffect(() => {
    if (!needChoice || !isOnline) return;
    parcelDrivers(id).then(setDrivers).catch(() => setDrivers([]));
  }, [needChoice, isOnline, id]);

  // Phase 2B1: price too low for the drivers → up to 3 drivers at another price.
  const needCounter = isSender && parcel?.counter_state === 'propose' && ['commande', 'depose'].includes(parcel.status);
  useEffect(() => {
    if (!needCounter || !isOnline) return;
    counterOptions(id).then(setCounter).catch(() => setCounter([]));
  }, [needCounter, isOnline, id]);

  // Phase 2B2 — direct hand-over: who is coming (name, vehicle photo, plate), the photo.
  const remise = parcel?.departure_mode === 'remise';
  const driverKey = remise && isSender && parcel?.status === 'chauffeur_trouve' ? parcel.driver_partner_id : null;
  useEffect(() => {
    setCard(null);
    setVehicleUrl(null);
    if (!driverKey || !isOnline) return;
    let cancelled = false;
    driverCard(id)
      .then(async (c) => {
        if (cancelled) return;
        setCard(c);
        if (c?.vehicle_photo_path) {
          const url = await signedPhotoUrl(c.vehicle_photo_path);
          if (!cancelled) setVehicleUrl(url);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [driverKey, isOnline, id]);
  const photoKey = remise && parcel?.photo_path ? `${parcel.photo_path}@${parcel.photo_at}` : null;
  useEffect(() => {
    setPhotoUrl(null);
    if (!photoKey || !isOnline || !parcel?.photo_path) return;
    let cancelled = false;
    void signedPhotoUrl(parcel.photo_path).then((u) => !cancelled && setPhotoUrl(u));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoKey, isOnline]);

  // Phase 2B2 — return of a direct hand-over: the sender chooses the return grocer.
  const needReturnChoice = isSender && !!parcel?.return_of && !parcel.return_confirmed_at && parcel.status === 'commande';
  useEffect(() => {
    if (!needReturnChoice || !isOnline) return;
    loadOpenGrocers()
      .then(({ list }) => setRetGrocers(list))
      .catch(() => setRetGrocers([]));
  }, [needReturnChoice, isOnline]);
  const retSelected = retChoice ?? parcel?.arrival_partner_id ?? null;
  useEffect(() => {
    setRetQuote(null);
    if (!needReturnChoice || !isOnline || !retSelected) return;
    let cancelled = false;
    returnQuote(id, retSelected)
      .then((q) => !cancelled && setRetQuote(q))
      .catch((err) => !cancelled && setMsg({ tone: 'error', text: parcelErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [needReturnChoice, isOnline, retSelected, id]);

  if (!userId) return null;
  if (notFound && !parcel) {
    return (
      <NavyPage>
        <NavyNotice tone="error">Ce colis n’existe pas ou ne vous concerne pas.</NavyNotice>
        <Link to="/navy/colis" className={btnSecondary}>Mes colis</Link>
      </NavyPage>
    );
  }
  if (!parcel) {
    return (
      <NavyPage>
        {loadError ? <NavyNotice tone="error">{loadError}</NavyNotice> : !isOnline ? <NavyNotice icon={WifiOff}>Ce colis n’est pas encore sur ce téléphone. Reconnectez-vous pour l’ouvrir.</NavyNotice> : <NavyLoader />}
      </NavyPage>
    );
  }

  const copy = async () => {
    if (!withdrawCode) return;
    try {
      await navigator.clipboard.writeText(withdrawCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const sendReference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reference.trim().length < 4) {
      setMsg({ tone: 'error', text: 'Référence incomplète (4 caractères au moins).' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await doGesture(userId, { kind: 'payment_ref', paymentId: crypto.randomUUID(), parcelId: id, reference: reference.trim() });
      if (res.status === 'error') setMsg({ tone: 'error', text: parcelErrorMessage(res.error) });
      else {
        setReference('');
        setMsg(res.status === 'queued' ? { tone: 'info', text: 'Référence gardée sur ce téléphone, envoyée au retour du réseau.' } : { tone: 'ok', text: 'Référence envoyée. Une opératrice la vérifie.' });
        void load();
      }
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setBusy(true);
    try {
      await cancelParcel(id, null);
      setMsg({ tone: 'ok', text: 'Commande annulée.' });
      setConfirmCancel(false);
      void load();
      void refreshParcels(userId);
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const pickCounter = async (driverId: string | null) => {
    setBusy(true);
    setMsg(null);
    try {
      if (driverId) {
        const p = await chooseCounter(id, driverId);
        setMsg({
          tone: 'ok',
          text:
            p.supplement_status === 'paye'
              ? 'Chauffeur choisi. Le supplément est payé par votre avoir : la course lui est proposée.'
              : p.supplement_status === 'a_payer_depot'
              ? 'Chauffeur choisi. Payez le supplément en espèces à l’épicier au moment du dépôt.'
              : 'Chauffeur choisi. Payez le supplément par Orange Money puis envoyez la référence ci-dessous.',
        });
      } else {
        await refuseCounter(id);
        setMsg({ tone: 'info', text: 'Proposition refusée. NAVY ay continue de chercher un chauffeur à votre prix.' });
      }
      void load();
      void refreshParcels(userId);
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const pick = async (driverId: string | null) => {
    setBusy(true);
    try {
      await chooseDriver(id, driverId);
      setMsg({ tone: 'ok', text: driverId ? 'Course proposée au chauffeur choisi.' : 'Mode automatique : NAVY ay cherche le moins cher.' });
      void load();
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const showDriver = ['chauffeur_trouve', 'pris_en_charge', 'arrive', 'retire'].includes(parcel.status) && parcel.driver_name;
  const prices = detail?.prices ?? null;

  // Phase 2B2 gestures (network required, except the photo which is kept on the phone).
  const sendPhoto = async () => {
    if (!newPhoto) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await doGesture(userId, { kind: 'photo', parcelId: id, blob: newPhoto });
      if (res.status === 'error') setMsg({ tone: 'error', text: parcelErrorMessage(res.error) });
      else {
        setNewPhoto(undefined);
        setMsg(res.status === 'queued' ? { tone: 'info', text: 'Photo gardée sur ce téléphone, envoyée au retour du réseau.' } : { tone: 'ok', text: 'Photo enregistrée.' });
        void load();
      }
    } finally {
      setBusy(false);
    }
  };
  const handOver = async (scannedDriver: string | null) => {
    setBusy(true);
    setMsg(null);
    try {
      await clientHandover(id, scannedDriver);
      setMsg({ tone: 'ok', text: 'Remise confirmée. Le chauffeur confirme à son tour « j’ai le colis ».' });
      void load();
      void refreshParcels(userId);
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  const decideAfterRefusal = async (choice: 'rechercher' | 'annuler') => {
    setBusy(true);
    setMsg(null);
    try {
      await afterRefusal(id, choice);
      setMsg(
        choice === 'rechercher'
          ? { tone: 'ok', text: 'NAVY ay cherche un autre chauffeur.' }
          : { tone: 'ok', text: 'Colis annulé. Ce que vous avez payé devient un avoir NAVY.' }
      );
      void load();
      void refreshParcels(userId);
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  const confirmReturnGrocer = async () => {
    if (!retSelected) return;
    setBusy(true);
    setMsg(null);
    try {
      const p = await confirmReturn(id, retSelected);
      setMsg(
        p.payment_status === 'paye'
          ? { tone: 'ok', text: 'Retour confirmé et payé par votre avoir. NAVY ay cherche un chauffeur.' }
          : { tone: 'ok', text: 'Retour confirmé. Payez-le par Orange Money ci-dessous.' }
      );
      void load();
      void refreshParcels(userId);
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };
  const original = parcel.return_of ? parcels.rows.find((r) => r.id === parcel.return_of) : undefined;
  const returnParcel = parcel.return_parcel_id ? parcels.rows.find((r) => r.id === parcel.return_parcel_id) : undefined;
  const canCancel =
    isSender &&
    !parcel.return_of &&
    (parcel.status === 'commande' || (remise && parcel.status === 'depose' && !parcel.driver_partner_id && parcel.search_state !== 'choix_apres_refus'));
  const photoEditable = remise && isSender && ['commande', 'depose', 'chauffeur_trouve'].includes(parcel.status) && !parcel.client_handover_at;
  const photoQueued = parcels.queue.some((q) => q.op.kind === 'photo' && q.op.parcelId === id);

  return (
    <NavyPage>
      <div className="flex items-center justify-between gap-3 pt-2">
        <Link to={isSender ? '/navy/colis' : isRecipient ? '/navy/recevoir' : '/navy'} className="inline-flex items-center gap-1 text-sm font-medium hover:underline">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour
        </Link>
        {isOnline && (
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-navyay-yellow/20" aria-label="Actualiser">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Actualiser
          </button>
        )}
      </div>

      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-navyay-charcoal/75">Colis</p>
          <ParcelCode code={parcel.code} />
        </div>
        <ParcelStatusBadge status={parcel.status} parcel={parcel} />
      </header>

      {!isOnline && <NavyNotice icon={WifiOff}>Hors ligne : état gardé sur ce téléphone{detail ? '' : ' lors de la dernière connexion'}.</NavyNotice>}
      {queuedHere.length > 0 && <NavyNotice icon={Smartphone}>Un envoi pour ce colis attend le réseau. Il partira tout seul.</NavyNotice>}
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}

      {parcel.return_of && isSender && (
        <NavyCard className="p-4 space-y-2 border-navyay-yellow">
          <p className="flex items-start gap-2 font-semibold">
            <Undo2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            Retour de votre colis {original ? original.code : ''} : il n’a pas été retiré.
          </p>
          <p className="text-sm">
            Il vous revient chez <strong>{parcel.arrival_name}</strong>. Le retour se paie d’avance (votre avoir NAVY d’abord, puis Orange Money). Tant qu’il n’est pas payé, le colis reste chez {parcel.depot_name}.
          </p>
          {original && (
            <Link to={`/navy/colis/${original.id}`} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold underline">
              Voir le colis d’origine
            </Link>
          )}
          {withdrawCode && parcel.return_confirmed_at && !['retire', 'annule'].includes(parcel.status) && (
            <div className="rounded-xl bg-navyay-yellow px-3 py-2 text-center">
              <p className="text-sm font-semibold">Votre code de retrait, à donner à l’épicier pour reprendre le colis</p>
              <p className="font-mono text-3xl font-bold tracking-[0.25em] tabular-nums">{withdrawCode}</p>
            </div>
          )}
        </NavyCard>
      )}

      {needReturnChoice && (
        <NavyCard className="p-4 space-y-3">
          <h3 className="font-semibold">Où voulez-vous reprendre votre colis ?</h3>
          <p className="text-sm text-navyay-charcoal/80">Nous proposons l’épicerie la plus proche de l’endroit où vous aviez remis le colis. Vous pouvez en choisir une autre.</p>
          {!isOnline ? (
            <NavyNotice icon={WifiOff}>Ce choix demande une connexion.</NavyNotice>
          ) : retGrocers === null ? (
            <NavyLoader />
          ) : (
            <GrocerPicker grocers={retGrocers} zones={zones} selectedId={retSelected} excludeId={parcel.depot_partner_id} onSelect={setRetChoice} mode="arrival" />
          )}
          {retQuote && (
            <div className="space-y-1 rounded-xl bg-navyay-charcoal/[0.04] p-3 text-sm">
              <p className="flex justify-between gap-3"><span>Prix du retour ({formatKm(retQuote.distance_km)})</span><strong className="tabular-nums">{formatAr(retQuote.breakdown.total)}</strong></p>
              {retQuote.credit_balance > 0 && (
                <p className="flex justify-between gap-3"><span>Avoir NAVY utilisé</span><span className="tabular-nums">−{formatAr(Math.min(retQuote.credit_balance, retQuote.breakdown.total))}</span></p>
              )}
              <p className="text-xs text-navyay-charcoal/75">Prix aux tarifs actuels, fixé dès que vous confirmez.</p>
            </div>
          )}
          <button type="button" className={`${btnAccent} w-full`} disabled={busy || !isOnline || !retSelected || !retQuote} onClick={() => void confirmReturnGrocer()}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
            Confirmer le retour ici
          </button>
        </NavyCard>
      )}

      {returnParcel && (
        <NavyNotice tone="warn">
          Colis non retiré : un retour vers vous est organisé (colis {returnParcel.code}).{' '}
          <Link to={`/navy/colis/${returnParcel.id}`} className="font-semibold underline">Voir le retour</Link>
        </NavyNotice>
      )}

      {isSender && !parcel.return_of && (params.get('nouveau') || parcel.status === 'commande') && parcel.status !== 'annule' && (
        <NavyCard className="p-4 space-y-4 border-navyay-yellow">
          <div className="text-center space-y-1">
            <p className="flex items-center justify-center gap-2 font-semibold">
              <PenLine className="w-5 h-5" aria-hidden="true" />
              À écrire au marqueur sur le colis
            </p>
            <div className="rounded-2xl bg-navyay-yellow py-4">
              <ParcelCode code={parcel.code} size="xl" />
            </div>
          </div>
          {withdrawCode && (
            <div className="space-y-2 text-center">
              <p className="font-semibold">Code de retrait, à donner au destinataire par téléphone</p>
              <p className="font-mono text-4xl font-bold tracking-[0.25em] tabular-nums">{withdrawCode}</p>
              <button type="button" className={`${btnSecondary} w-full`} onClick={() => void copy()}>
                {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                {copied ? 'Copié' : 'Copier le code de retrait'}
              </button>
              <p className="text-xs text-navyay-charcoal/75">Ne l’écrivez pas sur le colis. L’épicier d’arrivée le demandera au destinataire.</p>
            </div>
          )}
        </NavyCard>
      )}

      <ParcelMilestones parcel={parcel} />

      {needChoice && (
        <NavyCard className="p-4 space-y-3 border-navyay-yellow">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            Votre chauffeur n’a pas répondu. Les suivants sont un peu plus chers : choisissez.
          </p>
          {drivers === null ? (
            <NavyLoader />
          ) : (
            <ul className="space-y-1.5">
              {drivers.map((d) => (
                <li key={d.partner_id}>
                  <button type="button" disabled={busy} onClick={() => void pick(d.partner_id)} className="w-full flex items-center gap-3 rounded-xl border border-navyay-charcoal/15 bg-white px-3 py-3 text-left hover:bg-navyay-yellow/10">
                    <Truck className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0 truncate font-medium">{d.name ?? 'Chauffeur'}</span>
                    <span className="font-semibold tabular-nums">{formatAr(d.fare)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={() => void pick(null)}>
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            Automatique, le moins cher
          </button>
          <p className="text-xs text-navyay-charcoal/75">Le prix que vous avez payé ne change pas. Si le chauffeur est moins cher, la différence vous est gardée en avoir.</p>
        </NavyCard>
      )}

      {needCounter && (
        <NavyCard className="p-4 space-y-3 border-navyay-yellow">
          <p className="flex items-start gap-2 font-semibold">
            <BadgePercent className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            Aucun chauffeur n’a pris la course à votre prix. Ces chauffeurs peuvent la faire à un autre prix :
          </p>
          {!isOnline ? (
            <NavyNotice icon={WifiOff}>Choisir ou refuser demande une connexion.</NavyNotice>
          ) : counter === null ? (
            <NavyLoader />
          ) : counter.length === 0 ? (
            <NavyNotice>Ces chauffeurs ne sont plus disponibles. Actualisez dans un instant.</NavyNotice>
          ) : (
            <ul className="space-y-1.5" aria-label="Chauffeurs proposés">
              {counter.map((c) => (
                <li key={c.driver_partner_id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void pickCounter(c.driver_partner_id)}
                    className="w-full flex items-center gap-3 rounded-xl border border-navyay-charcoal/15 bg-white px-3 py-3 text-left hover:bg-navyay-yellow/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-60"
                  >
                    <Truck className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium truncate">{c.driver_name ?? 'Chauffeur'}</span>
                      <span className="block text-xs text-navyay-charcoal/75">
                        {c.vehicle_type ? VEHICLE_LABELS[c.vehicle_type as VehicleType] ?? c.vehicle_type : 'Véhicule'}
                        {c.near_km != null ? ` · à ${String(c.near_km).replace('.', ',')} km` : ''}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-semibold tabular-nums">{formatAr(c.new_total)}</span>
                      <span className="block text-xs tabular-nums text-navyay-charcoal/75">+{formatAr(c.supplement)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={`${btnSecondary} w-full`} disabled={busy || !isOnline} onClick={() => void pickCounter(null)}>
            Non merci, continuer à chercher à mon prix
          </button>
          <p className="text-xs text-navyay-charcoal/75">
            Le montant affiché est le nouveau prix total. Le supplément se paie d’abord avec votre avoir NAVY, puis en espèces à l’épicier si le colis n’est pas encore déposé, sinon par Orange Money. La course n’est proposée au chauffeur qu’une fois le supplément payé.
          </p>
        </NavyCard>
      )}

      {remise && isSender && parcel.search_state === 'choix_apres_refus' && parcel.status === 'depose' && (
        <NavyCard className="p-4 space-y-3 border-navyay-yellow">
          <p className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            Le chauffeur a refusé le colis{parcel.refusal_reason ? ` : « ${parcel.refusal_reason} »` : '.'}
          </p>
          <p className="text-sm">Que voulez-vous faire ? Ce chauffeur ne recevra plus ce colis.</p>
          {!isOnline && <NavyNotice icon={WifiOff}>Ce choix demande une connexion.</NavyNotice>}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className={btnAccent} disabled={busy || !isOnline} onClick={() => void decideAfterRefusal('rechercher')}>
              <RefreshCw className="w-5 h-5" aria-hidden="true" />
              Chercher un autre chauffeur
            </button>
            <button type="button" className={btnSecondary} disabled={busy || !isOnline} onClick={() => void decideAfterRefusal('annuler')}>
              <Ban className="w-5 h-5" aria-hidden="true" />
              Annuler (avoir NAVY)
            </button>
          </div>
        </NavyCard>
      )}

      {remise && isSender && parcel.status === 'chauffeur_trouve' && (
        <NavyCard className="p-4 space-y-3 border-navyay-yellow">
          <h3 className="font-semibold">Votre chauffeur arrive</h3>
          <div className="flex items-center gap-3">
            {vehicleUrl ? (
              <img src={vehicleUrl} alt={`Véhicule de ${parcel.driver_name ?? 'votre chauffeur'}`} className="w-20 h-20 flex-shrink-0 rounded-xl object-cover bg-navyay-charcoal/5" />
            ) : (
              <span className="w-20 h-20 flex-shrink-0 rounded-xl bg-navyay-charcoal/5 flex items-center justify-center" aria-hidden="true">
                <Truck className="w-8 h-8" />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{card?.name ?? parcel.driver_name}</p>
              <p className="text-sm">
                {(card?.vehicle_type ?? parcel.driver_vehicle) ? VEHICLE_LABELS[(card?.vehicle_type ?? parcel.driver_vehicle) as VehicleType] ?? card?.vehicle_type ?? parcel.driver_vehicle : 'Véhicule'}
              </p>
              <p className="text-sm">Plaque <strong className="font-mono tracking-wide">{card?.plate ?? parcel.driver_plate ?? '—'}</strong></p>
            </div>
          </div>
          {parcel.driver_phone && (
            <a href={`tel:${parcel.driver_phone.replace(/\s/g, '')}`} className={`${btnPrimary} w-full`}>
              <Phone className="w-4 h-4" aria-hidden="true" />
              Appeler le chauffeur
            </a>
          )}
          {parcel.client_handover_at ? (
            <NavyNotice icon={CheckCircle2}>Vous avez confirmé la remise. En attente de la confirmation du chauffeur.</NavyNotice>
          ) : !parcel.photo_path ? (
            <NavyNotice tone="warn" icon={Camera}>Prenez d’abord la photo du contenu ouvert (plus bas), puis confirmez la remise.</NavyNotice>
          ) : !isOnline ? (
            <NavyNotice icon={WifiOff}>La confirmation de remise demande le réseau.</NavyNotice>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" className={btnAccent} disabled={busy} onClick={() => void handOver(null)}>
                {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
                Remis au chauffeur
              </button>
              <button type="button" className={btnSecondary} disabled={busy} onClick={() => setScan(true)}>
                <ScanLine className="w-5 h-5" aria-hidden="true" />
                Scanner son QR
              </button>
            </div>
          )}
          <p className="text-xs text-navyay-charcoal/75">Vérifiez le nom et la plaque avant de remettre le colis. Il faut votre geste puis celui du chauffeur.</p>
        </NavyCard>
      )}

      {scan && (
        <NavyQrScanner
          hint="Visez le QR NAVY du chauffeur (sur son téléphone ou son véhicule)."
          fallback="Touchez « Remis au chauffeur » après avoir vérifié la plaque."
          onClose={() => setScan(false)}
          onResult={(text) => {
            setScan(false);
            const qr = partnerIdFromQr(text);
            if (!qr) return setMsg({ tone: 'error', text: 'Ce QR n’est pas un QR de chauffeur NAVY.' });
            if (qr !== parcel.driver_partner_id) return setMsg({ tone: 'error', text: 'Ce n’est pas le chauffeur attendu pour ce colis.' });
            void handOver(qr);
          }}
        />
      )}

      {remise && isSender && (photoEditable || parcel.photo_path) && (
        <NavyCard className="p-4 space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Camera className="w-5 h-5" aria-hidden="true" />
            Photo du contenu ouvert
          </h3>
          {photoUrl && !newPhoto && <img src={photoUrl} alt="Photo du contenu du colis" className="w-full max-h-56 object-contain rounded-xl bg-navyay-charcoal/5" />}
          {photoEditable ? (
            <>
              <PhotoField
                label={parcel.photo_path ? 'Reprendre la photo' : 'Prendre la photo avant de refermer le colis'}
                hint="Seuls vous, le chauffeur de la course et l’opératrice peuvent la voir. Supprimée 30 jours après la livraison."
                blob={newPhoto}
                hasExisting={!!parcel.photo_path && !newPhoto}
                onChange={setNewPhoto}
              />
              {photoQueued && <NavyNotice icon={Smartphone}>Photo gardée sur ce téléphone, envoyée au retour du réseau.</NavyNotice>}
              {newPhoto && (
                <button type="button" className={`${btnPrimary} w-full`} disabled={busy} onClick={() => void sendPhoto()}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
                  Enregistrer la photo
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-navyay-charcoal/75">Photo enregistrée{parcel.photo_at ? ` le ${new Date(parcel.photo_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : ''}. Elle ne peut plus être changée après la remise.</p>
          )}
        </NavyCard>
      )}

      {showDriver && !(remise && isSender && parcel.status === 'chauffeur_trouve') && (
        <NavyCard className="p-4 flex items-center gap-3">
          <Truck className="w-6 h-6 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{parcel.driver_name}</p>
            <p className="text-sm text-navyay-charcoal/75 truncate">
              {parcel.driver_vehicle ? VEHICLE_LABELS[parcel.driver_vehicle as VehicleType] ?? parcel.driver_vehicle : ''} {parcel.driver_plate ?? ''}
            </p>
          </div>
          {parcel.driver_phone && (isSender || isRecipient) && ['chauffeur_trouve', 'pris_en_charge'].includes(parcel.status) && (
            <a href={`tel:${parcel.driver_phone.replace(/\s/g, '')}`} className={btnPrimary}>
              <Phone className="w-4 h-4" aria-hidden="true" />
              Appeler
            </a>
          )}
        </NavyCard>
      )}

      <NavyCard className="p-4 space-y-2 text-sm">
        <Row label="Départ" value={`${parcel.depot_name ?? '—'}${zoneName(zones, parcel.depot_zone_id) ? ` (${zoneName(zones, parcel.depot_zone_id)})` : ''}`} />
        {remise && (isSender || parcel.driver_user_id === userId) && parcel.depot_lat != null && parcel.depot_lng != null && (
          <p className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-1 text-navyay-charcoal/75">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              Lieu de remise
            </span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${parcel.depot_lat},${parcel.depot_lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1 text-right font-medium underline"
            >
              <Navigation className="w-4 h-4" aria-hidden="true" />
              {parcel.handover_note || 'Voir sur la carte'}
            </a>
          </p>
        )}
        <Row label="Arrivée" value={`${parcel.arrival_name ?? '—'}${zoneName(zones, parcel.arrival_zone_id) ? ` (${zoneName(zones, parcel.arrival_zone_id)})` : ''}`} />
        <Row label="Destinataire" value={`${parcel.recipient_name} · ${parcel.recipient_phone}`} />
        <Row label="Contenu" value={`${CATEGORY_LABELS[parcel.category]} · valeur ${formatAr(parcel.declared_value)}`} />
        <Row label={parcel.distance_source === 'route' ? 'Distance par la route' : 'Distance estimée'} value={formatKm(parcel.distance_km)} />
        {(isSender || isRecipient) && withdrawCode && !params.get('nouveau') && parcel.status !== 'commande' && !['retire', 'annule'].includes(parcel.status) && (
          <Row label="Code de retrait" value={withdrawCode} mono />
        )}
        {parcel.status === 'arrive' && isRecipient && (
          <p className="rounded-xl bg-navyay-yellow px-3 py-2 font-semibold">Votre colis vous attend chez {parcel.arrival_name}. Donnez le code de retrait à l’épicier.</p>
        )}
        {parcel.return_status === 'a_organiser' && <NavyNotice tone="warn">Colis non retiré depuis plus de 7 jours : NAVY ay organise son retour.</NavyNotice>}
      </NavyCard>

      {isSender && (
        <NavyCard className="p-4 space-y-3">
          <h3 className="font-semibold">Paiement</h3>
          <p className="text-sm">
            {prices && (prices.amount_due ?? 1) === 0 ? 'Avoir NAVY' : parcel.payment_method === 'especes' ? 'Espèces' : 'Orange Money'} ·{' '}
            <strong>{PAYMENT_LABELS[parcel.payment_status]}</strong>
          </p>
          {parcel.supplement_status && (
            <p className="text-sm">
              <strong>{SUPPLEMENT_LABELS[parcel.supplement_status]}</strong>
              {prices && parcel.supplement_status !== 'paye' && (prices.supplement_due ?? 0) > 0 && (
                <> : <span className="tabular-nums">{formatAr(prices.supplement_due)}</span></>
              )}
            </p>
          )}
          {parcel.payment_status === 'refuse' && parcel.payment_refusal_reason && (
            <NavyNotice tone="error">Motif : {parcel.payment_refusal_reason}. Vérifiez la référence puis renvoyez-la.</NavyNotice>
          )}
          {prices && (
            <>
              <ul className="space-y-1">
                {detail!.lines.map((l) => (
                  <li key={l.seq} className="flex justify-between gap-3 text-sm">
                    <span className="truncate">{l.kind === 'transport' ? parcel.driver_name ? `Transport (${parcel.driver_name})` : 'Transport' : l.label}</span>
                    <span className="tabular-nums">{formatAr(l.shown_amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between border-t border-navyay-charcoal/15 pt-2 font-semibold">
                <span>Total</span>
                <span className="text-xl tabular-nums">{formatAr(prices.total_price)}</span>
              </p>
              {(prices.supplement ?? 0) > 0 && (
                <p className="flex justify-between gap-3 text-sm">
                  <span>dont supplément (autre chauffeur)</span>
                  <span className="tabular-nums">+{formatAr(prices.supplement)}</span>
                </p>
              )}
              {(prices.credit_used ?? 0) + (prices.supplement_credit_used ?? 0) > 0 && (
                <p className="flex justify-between gap-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" aria-hidden="true" />
                    Avoir utilisé
                  </span>
                  <span className="tabular-nums">−{formatAr((prices.credit_used ?? 0) + (prices.supplement_credit_used ?? 0))}</span>
                </p>
              )}
              {prices.credit_due > 0 && (
                <NavyNotice tone="ok">Avoir en votre faveur : {formatAr(prices.credit_due)} ({prices.credit_reason ?? 'différence de prix'}). Il sera utilisable sur un prochain envoi.</NavyNotice>
              )}
            </>
          )}
          {((parcel.payment_method === 'orange_money' && ['attente_reference', 'refuse'].includes(parcel.payment_status)) ||
            ['attente_reference', 'refuse'].includes(parcel.supplement_status ?? '')) &&
            parcel.status !== 'annule' && (
            <form onSubmit={sendReference} className="space-y-2" noValidate>
              {prices && (
                <p className="text-sm">
                  Envoyez{' '}
                  <strong className="tabular-nums">
                    {formatAr(
                      parcel.payment_method === 'orange_money' && ['attente_reference', 'refuse'].includes(parcel.payment_status)
                        ? prices.amount_due ?? prices.total_price
                        : prices.supplement_due ?? 0
                    )}
                  </strong>{' '}
                  par Orange Money, puis saisissez la référence reçue par SMS.
                </p>
              )}
              <label className={labelCls}>
                Référence Orange Money
                <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} autoComplete="off" />
              </label>
              <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
                {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Envoyer la référence
              </button>
            </form>
          )}
          <p className="text-xs text-navyay-charcoal/75">Indemnisation maximale en cas de perte : {formatAr(Math.min(parcel.declared_value, MAX_DECLARED_VALUE))}.</p>
        </NavyCard>
      )}

      <NavyCard className="p-4 space-y-3">
        <h3 className="font-semibold">Étapes</h3>
        {detail ? <ParcelTimeline events={detail.events} /> : <p className="text-sm text-navyay-charcoal/75">Le détail des étapes s’affiche avec une connexion.</p>}
      </NavyCard>

      {canCancel && (
        <button type="button" className={`${btnSecondary} w-full`} disabled={busy || !isOnline} onClick={() => void doCancel()}>
          <Ban className="w-4 h-4" aria-hidden="true" />
          {confirmCancel ? 'Touchez encore pour confirmer l’annulation' : 'Annuler la commande'}
        </button>
      )}

      {isSender && <NavyNotifyPrompt why="Activez les notifications pour savoir quand votre colis est pris en charge, arrivé et livré." />}

      <NavyHelp title="Comprendre le suivi">
        <p>Accepté : un chauffeur a pris la course. En route : il a le colis en main. Livré : le destinataire l’a retiré.</p>
        <p>Le code colis (4 chiffres) est écrit sur le colis. Le code de retrait est secret : seuls vous et le destinataire le voyez.</p>
        <p>Vous pouvez annuler tant que le colis n’est pas déposé à l’épicerie. Ce qui a déjà été payé devient un avoir NAVY, utilisé tout seul sur votre prochain envoi.</p>
        <p>Si aucun chauffeur n’accepte votre prix, NAVY ay peut vous proposer des chauffeurs à un autre prix : vous choisissez ou vous refusez.</p>
        <p>Remise au chauffeur : prenez la photo du contenu ouvert, vérifiez le nom et la plaque, puis confirmez « remis au chauffeur ». Le chauffeur peut refuser un colis : vous choisissez alors de chercher un autre chauffeur ou d’annuler (avoir).</p>
        <p>Colis non retiré après 7 jours : il vous revient. Le retour se paie d’avance au prix d’un envoi en sens inverse, et vous reprenez le colis avec un nouveau code de retrait.</p>
      </NavyHelp>
    </NavyPage>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <p className="flex justify-between gap-3">
      <span className="text-navyay-charcoal/75">{label}</span>
      <span className={`text-right font-medium ${mono ? 'font-mono tracking-widest tabular-nums' : ''}`}>{value}</span>
    </p>
  );
}
