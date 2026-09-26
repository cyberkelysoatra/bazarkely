/**
 * Parcel tracking (phase 2A): milestones Accepté / En route / Livré, journal, codes,
 * payment, price, driver call button, choice of another driver when asked, cancel.
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
  Check,
  Copy,
  Loader2,
  PenLine,
  Phone,
  RefreshCw,
  Smartphone,
  Sparkles,
  Truck,
  WifiOff,
} from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import {
  cancelParcel,
  chooseDriver,
  doGesture,
  getParcelDetail,
  parcelDrivers,
  refreshParcels,
  useParcels,
  type ParcelDetail,
} from '../../services/parcelService';
import { useNavyZones, zoneName } from '../../services/zoneService';
import type { NavyQuoteDriver } from '../../types/parcel';
import type { VehicleType } from '../../types/partner';
import { VEHICLE_LABELS } from '../../utils/partnerRules';
import { CATEGORY_LABELS, MAX_DECLARED_VALUE, PAYMENT_LABELS, parcelErrorMessage } from '../../utils/parcelRules';
import { NavyNotifyPrompt, ParcelCode, ParcelMilestones, ParcelStatusBadge, ParcelTimeline } from './ParcelUi';
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
        <ParcelStatusBadge status={parcel.status} />
      </header>

      {!isOnline && <NavyNotice icon={WifiOff}>Hors ligne : état gardé sur ce téléphone{detail ? '' : ' lors de la dernière connexion'}.</NavyNotice>}
      {queuedHere.length > 0 && <NavyNotice icon={Smartphone}>Un envoi pour ce colis attend le réseau. Il partira tout seul.</NavyNotice>}
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}

      {isSender && (params.get('nouveau') || parcel.status === 'commande') && parcel.status !== 'annule' && (
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

      {showDriver && (
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
        <Row label="Départ" value={`${parcel.depot_name ?? '—'} (${zoneName(zones, parcel.depot_zone_id) ?? 'hors zone'})`} />
        <Row label="Arrivée" value={`${parcel.arrival_name ?? '—'} (${zoneName(zones, parcel.arrival_zone_id) ?? 'hors zone'})`} />
        <Row label="Destinataire" value={`${parcel.recipient_name} · ${parcel.recipient_phone}`} />
        <Row label="Contenu" value={`${CATEGORY_LABELS[parcel.category]} · valeur ${formatAr(parcel.declared_value)}`} />
        <Row label="Distance estimée" value={`${parcel.distance_km} km`} />
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
            {parcel.payment_method === 'especes' ? 'Espèces' : 'Orange Money'} · <strong>{PAYMENT_LABELS[parcel.payment_status]}</strong>
          </p>
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
              {prices.credit_due > 0 && (
                <NavyNotice tone="ok">Avoir en votre faveur : {formatAr(prices.credit_due)} ({prices.credit_reason ?? 'différence de prix'}). Il sera utilisable sur un prochain envoi.</NavyNotice>
              )}
            </>
          )}
          {parcel.payment_method === 'orange_money' && ['attente_reference', 'refuse'].includes(parcel.payment_status) && parcel.status !== 'annule' && (
            <form onSubmit={sendReference} className="space-y-2" noValidate>
              {prices && <p className="text-sm">Envoyez <strong className="tabular-nums">{formatAr(prices.total_price)}</strong> par Orange Money, puis saisissez la référence reçue par SMS.</p>}
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

      {isSender && parcel.status === 'commande' && (
        <button type="button" className={`${btnSecondary} w-full`} disabled={busy || !isOnline} onClick={() => void doCancel()}>
          <Ban className="w-4 h-4" aria-hidden="true" />
          {confirmCancel ? 'Touchez encore pour confirmer l’annulation' : 'Annuler la commande'}
        </button>
      )}

      {isSender && <NavyNotifyPrompt why="Activez les notifications pour savoir quand votre colis est pris en charge, arrivé et livré." />}

      <NavyHelp title="Comprendre le suivi">
        <p>Accepté : un chauffeur a pris la course. En route : il a le colis en main. Livré : le destinataire l’a retiré.</p>
        <p>Le code colis (4 chiffres) est écrit sur le colis. Le code de retrait est secret : seuls vous et le destinataire le voyez.</p>
        <p>Vous pouvez annuler tant que le colis n’est pas déposé à l’épicerie.</p>
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
