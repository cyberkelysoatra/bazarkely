/**
 * Operator — "Colis" (phase 2A): every parcel, filters by state, alerts on top (no
 * driver for 30 min, not collected for 3 days, return to organise, withdrawal code
 * blocked, client must choose). Actions: cancel (not picked up yet), relaunch the
 * offer, unblock the code, mark "retour à organiser" (after 7 days).
 * ONLINE for actions; the list read last stays visible offline.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Ban, ExternalLink, Loader2, Package, RefreshCw, RotateCcw, Unlock, WifiOff } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { cancelParcel, markReturn, pricesOf, refreshParcels, relaunchOffers, unblockWithdraw, useParcels } from '../../services/parcelService';
import type { NavyParcelLocal } from '../../db/navyDb';
import type { NavyParcelPrices, ParcelStatus } from '../../types/parcel';
import { parcelAlerts, parcelErrorMessage, PAYMENT_LABELS, STATUS_LABELS } from '../../utils/parcelRules';
import { formatTime, ParcelCode, ParcelStatusBadge } from '../parcel/ParcelUi';
import { btnSecondary, formatAr, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

type Filter = 'alertes' | 'en_cours' | ParcelStatus | 'tous';

const FILTERS: { v: Filter; label: string }[] = [
  { v: 'alertes', label: 'Alertes' },
  { v: 'en_cours', label: 'En cours' },
  { v: 'commande', label: STATUS_LABELS.commande },
  { v: 'depose', label: STATUS_LABELS.depose },
  { v: 'chauffeur_trouve', label: STATUS_LABELS.chauffeur_trouve },
  { v: 'pris_en_charge', label: STATUS_LABELS.pris_en_charge },
  { v: 'arrive', label: 'Arrivés' },
  { v: 'retire', label: STATUS_LABELS.retire },
  { v: 'annule', label: STATUS_LABELS.annule },
  { v: 'tous', label: 'Tous' },
];

export default function OperatorParcelsPage() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const parcels = useParcels();
  const [filter, setFilter] = useState<Filter>('alertes');
  const [prices, setPrices] = useState<Record<string, NavyParcelPrices>>({});

  useEffect(() => {
    if (!userId || !isOnline) return;
    void refreshParcels(userId);
    const t = window.setInterval(() => void refreshParcels(userId), 20000);
    return () => window.clearInterval(t);
  }, [userId, isOnline]);

  const rows = parcels.userId === userId ? parcels.rows : [];
  const withAlerts = useMemo(() => rows.filter((p) => parcelAlerts(p).length > 0), [rows]);
  const shown = useMemo(() => {
    if (filter === 'alertes') return withAlerts;
    if (filter === 'tous') return rows;
    if (filter === 'en_cours') return rows.filter((p) => !['retire', 'annule'].includes(p.status));
    return rows.filter((p) => p.status === filter);
  }, [filter, rows, withAlerts]);

  const ids = shown.slice(0, 60).map((p) => p.id).join(',');
  useEffect(() => {
    if (!isOnline || !ids) return;
    pricesOf(ids.split(','))
      .then((list) => setPrices(Object.fromEntries(list.map((x) => [x.parcel_id, x]))))
      .catch(() => {});
  }, [ids, isOnline]);

  if (!userId) return null;

  return (
    <NavyPage>
      <NavyPageTitle icon={Package} title="Colis" subtitle="Tous les colis, alertes en tête." />
      {!isOnline && <NavyNotice icon={WifiOff}>Hors ligne : liste gardée sur ce téléphone. Les actions demandent le réseau.</NavyNotice>}

      <div className="-mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 pb-1 w-max">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              type="button"
              aria-pressed={filter === f.v}
              onClick={() => setFilter(f.v)}
              className={`min-h-[44px] rounded-full px-4 text-sm font-semibold whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
                filter === f.v ? 'bg-navyay-charcoal text-white' : 'bg-white border border-navyay-charcoal/20'
              }`}
            >
              {f.label}
              {f.v === 'alertes' && withAlerts.length > 0 && <span className="ml-1.5 rounded-full bg-navyay-yellow px-1.5 text-navyay-charcoal tabular-nums">{withAlerts.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {parcels.userId !== userId || !parcels.loaded ? (
        <NavyLoader />
      ) : shown.length === 0 ? (
        <NavyCard className="p-6 text-center">
          <p className="font-semibold">{filter === 'alertes' ? 'Aucune alerte.' : 'Aucun colis dans cette liste.'}</p>
        </NavyCard>
      ) : (
        <ul className="space-y-2">
          {shown.map((p) => (
            <li key={p.id}>
              <OperatorParcelCard p={p} price={prices[p.id]} userId={userId} isOnline={isOnline} />
            </li>
          ))}
        </ul>
      )}

      <NavyHelp title="Que faire d’une alerte ?">
        <p><strong>Sans chauffeur depuis 30 min</strong> : relancez l’offre, ou appelez un chauffeur qui va dans la zone.</p>
        <p><strong>Code de retrait bloqué</strong> : appelez le destinataire pour vérifier son identité, puis débloquez.</p>
        <p><strong>Non retiré</strong> : un rappel part tout seul après 24 h ; après 7 jours, marquez « retour à organiser ».</p>
        <p>L’annulation est possible tant que le colis n’est pas pris en charge par un chauffeur. Un paiement déjà reçu devient un avoir du client.</p>
      </NavyHelp>
    </NavyPage>
  );
}

function OperatorParcelCard({ p, price, userId, isOnline }: { p: NavyParcelLocal; price?: NavyParcelPrices; userId: string; isOnline: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const alerts = parcelAlerts(p);
  const over7 = p.status === 'arrive' && p.arrived_at && Date.now() - new Date(p.arrived_at).getTime() > 7 * 864e5;

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: 'ok', text: ok });
      setConfirm(false);
      void refreshParcels(userId);
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <NavyCard className={`p-4 space-y-2 ${alerts.length ? 'border-navyay-yellow' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <ParcelCode code={p.code} />
          <p className="text-sm truncate">{p.sender_name ?? '—'} → {p.recipient_name}</p>
          <p className="text-xs text-navyay-charcoal/75 truncate">{p.depot_name} → {p.arrival_name} · {formatTime(p.ordered_at)}</p>
        </div>
        <ParcelStatusBadge status={p.status} />
      </div>
      {alerts.map((a) => (
        <p key={a} className="flex items-center gap-2 rounded-xl bg-navyay-yellow/30 px-3 py-1.5 text-sm font-semibold">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          {a}
        </p>
      ))}
      <p className="text-xs text-navyay-charcoal/80">
        {PAYMENT_LABELS[p.payment_status]}
        {price ? ` · total ${formatAr(price.total_price)} · part NAVY ${formatAr(price.navy_total)}` : ''}
        {price && price.credit_due > 0 ? ` · avoir ${formatAr(price.credit_due)}` : ''}
        {p.driver_name ? ` · chauffeur ${p.driver_name} (${formatAr(p.driver_fare)})` : ''}
      </p>
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
      <div className="flex flex-wrap gap-2">
        <Link to={`/navy/colis/${p.id}`} className={`${btnSecondary} min-h-[44px] py-2 text-sm`}>
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
          Détail
        </Link>
        {p.status === 'depose' && p.payment_status === 'paye' && (
          <button type="button" className={`${btnSecondary} min-h-[44px] py-2 text-sm`} disabled={!isOnline || !!busy} onClick={() => void run('relaunch', () => relaunchOffers(p.id), 'Offre relancée.')}>
            {busy === 'relaunch' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
            Relancer l’offre
          </button>
        )}
        {p.status === 'arrive' && p.withdraw_blocked_at && (
          <button type="button" className={`${btnSecondary} min-h-[44px] py-2 text-sm`} disabled={!isOnline || !!busy} onClick={() => void run('unblock', () => unblockWithdraw(p.id), 'Code de retrait débloqué.')}>
            {busy === 'unblock' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Unlock className="w-4 h-4" aria-hidden="true" />}
            Débloquer le code
          </button>
        )}
        {over7 && p.return_status !== 'a_organiser' && (
          <button type="button" className={`${btnSecondary} min-h-[44px] py-2 text-sm`} disabled={!isOnline || !!busy} onClick={() => void run('return', () => markReturn(p.id), 'Marqué « retour à organiser ».')}>
            {busy === 'return' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RotateCcw className="w-4 h-4" aria-hidden="true" />}
            Retour à organiser
          </button>
        )}
        {['commande', 'depose', 'chauffeur_trouve'].includes(p.status) && (
          <button
            type="button"
            className={`${btnSecondary} min-h-[44px] py-2 text-sm`}
            disabled={!isOnline || !!busy}
            onClick={() => (confirm ? void run('cancel', () => cancelParcel(p.id, 'Annulé par l’opératrice'), 'Colis annulé.') : setConfirm(true))}
          >
            {busy === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Ban className="w-4 h-4" aria-hidden="true" />}
            {confirm ? 'Confirmer l’annulation' : 'Annuler'}
          </button>
        )}
      </div>
    </NavyCard>
  );
}
