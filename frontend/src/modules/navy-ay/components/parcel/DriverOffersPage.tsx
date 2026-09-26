/**
 * Driver — "Offres" (phase 2A). A live offer fills the screen with a 30-second
 * countdown: departure, arrival, estimated distance, category and WHAT HE EARNS (never
 * the total paid by the client). The deadline is the SERVER's (expires_at); accepting
 * requires the network and is refused by the server once the deadline has passed.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, CheckCircle2, Loader2, MapPin, Package, Route, WifiOff, XCircle } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { useAppStore } from '../../../../stores/appStore';
import { acceptOffer, myOffers, refreshParcels, refuseOffer } from '../../services/parcelService';
import type { NavyParcelOffer } from '../../types/parcel';
import { CATEGORY_LABELS, OFFER_SECONDS, offerSecondsLeft, parcelErrorMessage } from '../../utils/parcelRules';
import { NavyNotifyPrompt } from './ParcelUi';
import { btnAccent, btnSecondary, formatAr, NavyCard, NavyHelp, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

const POLL_MS = 4000;

export default function DriverOffersPage() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<NavyParcelOffer[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setOffers(await myOffers());
    } catch {
      /* next poll */
    }
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(t);
  }, [isOnline, load]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  const live = (offers ?? []).filter((o) => offerSecondsLeft(o, now) > 0);
  const offer = live[0] ?? null;

  const accept = async (o: NavyParcelOffer) => {
    setBusy(true);
    setMsg(null);
    try {
      await acceptOffer(o.id);
      if (userId) await refreshParcels(userId);
      navigate('/navy/courses', { replace: true });
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
      void load();
    } finally {
      setBusy(false);
    }
  };

  const refuse = async (o: NavyParcelOffer) => {
    setBusy(true);
    setMsg(null);
    try {
      await refuseOffer(o.id);
      void load();
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (!isOnline) {
    return (
      <NavyPage>
        <NavyPageTitle icon={BellRing} title="Offres" />
        <NavyNotice icon={WifiOff}>Sans réseau, vous ne pouvez ni recevoir ni accepter de course. Les offres reviennent dès que le réseau revient.</NavyNotice>
      </NavyPage>
    );
  }

  if (offer) {
    const left = offerSecondsLeft(offer, now);
    const pct = Math.max(0, Math.min(100, (left / OFFER_SECONDS) * 100));
    return (
      <div className="fixed inset-0 z-[70] flex flex-col bg-navyay-yellow text-navyay-charcoal" role="dialog" aria-modal="true" aria-label="Nouvelle course">
        <div className="h-2 bg-navyay-charcoal/15" aria-hidden="true">
          <div className="h-full bg-navyay-charcoal transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6 max-w-lg w-full mx-auto flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-lg font-bold">
              <BellRing className="w-6 h-6" aria-hidden="true" />
              Nouvelle course
            </p>
            <p className="text-5xl font-bold tabular-nums" aria-live="polite" aria-label={`${left} secondes restantes`}>
              {left}
              <span className="text-xl"> s</span>
            </p>
          </div>
          <div className="rounded-3xl bg-white/90 p-5 space-y-4">
            <p className="text-sm">Vous gagnez</p>
            <p className="text-5xl font-bold tabular-nums leading-none">{formatAr(offer.fare)}</p>
            <div className="space-y-3 pt-2">
              <p className="flex items-start gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span><span className="block text-sm text-navyay-charcoal/75">Prendre chez</span><strong>{offer.depot_name}</strong></span>
              </p>
              <p className="flex items-start gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5 fill-navyay-yellow" aria-hidden="true" />
                <span><span className="block text-sm text-navyay-charcoal/75">Livrer chez</span><strong>{offer.arrival_name}</strong></span>
              </p>
              <p className="flex items-center gap-3">
                <Route className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                Distance estimée : <strong>{offer.distance_km} km</strong>
              </p>
              <p className="flex items-center gap-3">
                <Package className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {CATEGORY_LABELS[offer.category]}
              </p>
            </div>
          </div>
          {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
          <div className="mt-auto grid grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)]">
            <button type="button" className={`${btnSecondary} py-4 text-lg`} disabled={busy} onClick={() => void refuse(offer)}>
              <XCircle className="w-6 h-6" aria-hidden="true" />
              Refuser
            </button>
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl bg-navyay-charcoal px-4 py-4 text-lg font-bold text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60" disabled={busy} onClick={() => void accept(offer)}>
              {busy ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-6 h-6 text-navyay-yellow" aria-hidden="true" />}
              Accepter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <NavyPage>
      <NavyPageTitle icon={BellRing} title="Offres" subtitle="Les courses proposées apparaissent ici en plein écran." />
      <NavyNotifyPrompt why="Sans notifications, vous ne verrez pas les courses à temps : vous n’avez que 30 secondes pour accepter." />
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
      <NavyCard className="p-6 text-center space-y-2">
        <BellRing className="w-10 h-10 mx-auto" aria-hidden="true" />
        <p className="font-semibold">Aucune course pour l’instant.</p>
        <p className="text-sm text-navyay-charcoal/75">Restez « Disponible » dans Direction : NAVY ay vous propose les colis qui vont dans votre sens.</p>
        <button type="button" className={btnAccent} onClick={() => navigate('/navy/direction')}>Ma direction</button>
      </NavyCard>
      <NavyHelp title="Comment marchent les offres ?">
        <p>Une course vous est proposée quand un colis va vers votre zone d’arrivée et que votre prix est dans le budget du client.</p>
        <p>Vous avez 30 secondes pour accepter. Passé ce délai, la course est proposée à un autre chauffeur.</p>
        <p>Le montant affiché est ce que vous gagnez sur ce colis.</p>
      </NavyHelp>
    </NavyPage>
  );
}
