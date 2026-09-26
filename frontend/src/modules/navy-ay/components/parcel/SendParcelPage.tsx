/**
 * Client — "Envoyer un colis" (phase 2A, 2B1). Short steps: recipient → depot grocer →
 * arrival grocer → content and value → driver choice → price and payment.
 *
 * The price is computed by the SERVER (navy_quote, then frozen by navy_create_parcel):
 * the phone never sends an amount, except the total the client proposes himself in
 * "Je propose mon prix" (checked again by the server: minimum, multiple of 100 Ar).
 * The NAVY credit is deducted by the server. Offline, an estimate is shown (same rules,
 * cached settings, road distance kept on the phone) and the order is kept on the phone,
 * sent at the return of the network with the same id (no duplicate). "Je choisis mon
 * chauffeur" needs the network.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  HandCoins,
  Loader2,
  Route,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Truck,
  UserRound,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { useScrollToError } from '../../../../hooks/useScrollToError';
import { useNavyProfile } from '../../services/navyProfileStore';
import { doGesture, getQuote, loadGrocerDistances, loadOpenGrocers, myCredit, placeOrder } from '../../services/parcelService';
import { loadZones, useNavyZones, zoneName } from '../../services/zoneService';
import type { DriverMode, NavyGrocerDistance, NavyOpenGrocer, NavyQuote, ParcelCategory, PaymentMethod } from '../../types/parcel';
import { computeFare, VEHICLE_LABELS } from '../../utils/partnerRules';
import {
  CATEGORY_LABELS,
  creditSplit,
  formatKm,
  isValidRecipientPhone,
  MAX_DECLARED_VALUE,
  minProposedTotal,
  ORS_ATTRIBUTION,
  pairKm,
  parcelErrorMessage,
  priceBreakdown,
  proposedDriverGain,
  proposedTotalProblem,
} from '../../utils/parcelRules';
import { NavyNotifyPrompt } from './ParcelUi';
import GrocerPicker from './GrocerPicker';
import { btnAccent, btnPrimary, btnSecondary, formatAr, inputCls, labelCls, NavyCard, NavyHelp, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';
import type { VehicleType } from '../../types/partner';

const STEPS = ['Destinataire', 'Départ', 'Arrivée', 'Contenu', 'Chauffeur', 'Prix et paiement'] as const;

export default function SendParcelPage() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const profile = useNavyProfile();
  const { zones } = useNavyZones();
  const { error, setError, errorRef, errorFlash } = useScrollToError();

  const [step, setStep] = useState(0);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [grocers, setGrocers] = useState<NavyOpenGrocer[] | null>(null);
  const [grocersFromPhone, setGrocersFromPhone] = useState(false);
  const [depotId, setDepotId] = useState<string | null>(null);
  const [arrivalId, setArrivalId] = useState<string | null>(null);
  const [category, setCategory] = useState<ParcelCategory | null>(null);
  const [value, setValue] = useState('');
  const [driverMode, setDriverMode] = useState<DriverMode>('auto');
  const [chosenDriver, setChosenDriver] = useState<string | null>(null);
  const [proposed, setProposed] = useState('');
  const [distances, setDistances] = useState<NavyGrocerDistance[]>([]);
  const [phoneCredit, setPhoneCredit] = useState<number | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>('especes');
  const [reference, setReference] = useState('');
  const [quote, setQuote] = useState<NavyQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void loadZones();
    loadOpenGrocers()
      .then(({ list, fromPhone }) => {
        setGrocers(list);
        setGrocersFromPhone(fromPhone);
      })
      .catch((err) => {
        setGrocers([]);
        setError(parcelErrorMessage(err));
      });
    // Road distances and credit kept on the phone: the offline estimate uses them too.
    loadGrocerDistances().then(setDistances).catch(() => undefined);
    if (userId) myCredit(userId).then(({ credit }) => setPhoneCredit(credit?.balance ?? null)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Server quote as soon as both grocers are known (online).
  useEffect(() => {
    setQuote(null);
    if (!depotId || !arrivalId || !isOnline) return;
    let cancelled = false;
    setQuoteLoading(true);
    getQuote(depotId, arrivalId)
      .then((q) => !cancelled && setQuote(q))
      .catch((err) => !cancelled && setError(parcelErrorMessage(err)))
      .finally(() => !cancelled && setQuoteLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depotId, arrivalId, isOnline]);

  const depot = grocers?.find((g) => g.id === depotId) ?? null;
  const arrival = grocers?.find((g) => g.id === arrivalId) ?? null;

  // Offline estimate: same rules as the server, with the settings and the road
  // distances kept on the phone (straight line + 30 % when the pair is unknown).
  const estimate = useMemo(() => {
    if (quote || !depot || !arrival) return null;
    const s = profile.settings as any;
    const d = pairKm(distances, depot, arrival);
    const ceiling = computeFare(d.km, s?.suggested_min_fare ?? 1000, s?.suggested_fare_per_5km ?? 1000);
    const b = priceBreakdown(depot.depot_fee, ceiling, arrival.pickup_fee, s?.cyberkely_share ?? 300);
    return { km: d.km, source: d.source, total: b.total, lines: b.lines.map((l) => ({ kind: l.kind, shown: l.shown })) };
  }, [quote, depot, arrival, profile.settings, distances]);

  const declared = Number(value.replace(/\s/g, ''));
  const share = quote?.share ?? (profile.settings as any)?.cyberkely_share ?? 300;
  const depotFee = quote?.depot_fee ?? depot?.depot_fee ?? 0;
  const pickupFee = quote?.pickup_fee ?? arrival?.pickup_fee ?? 0;
  // "Je propose mon prix": minimum accepted and what the driver would earn.
  const minTotal = quote?.min_total ?? minProposedTotal(depotFee, pickupFee, share);
  const proposedTotal = Number(proposed.replace(/[\s.]/g, ''));
  const proposedOk = driverMode === 'prix' && proposedTotalProblem(proposedTotal, minTotal) === null;
  const proposedGain = proposedOk ? proposedDriverGain(proposedTotal, depotFee, pickupFee, share) : null;
  const proposedLines = proposedOk
    ? priceBreakdown(depotFee, proposedGain ?? 0, pickupFee, share).lines.map((l) => ({ kind: l.kind, shown: l.shown }))
    : null;

  const lines = proposedLines ?? (quote ? quote.breakdown.lines.map((l) => ({ kind: l.kind, shown: l.shown })) : estimate?.lines ?? []);
  const total = driverMode === 'prix' ? (proposedOk ? proposedTotal : null) : quote?.breakdown.total ?? estimate?.total ?? null;
  const km = quote?.distance_km ?? estimate?.km ?? null;
  const kmSource = quote?.distance_source ?? estimate?.source ?? 'estimation';
  // NAVY credit: deducted automatically by the server, shown here in advance.
  const creditBalance = quote?.credit_balance ?? phoneCredit ?? 0;
  const credit = total !== null ? creditSplit(creditBalance, total) : null;
  const toPay = credit ? credit.due : total;
  const omNumber = quote?.orange_money_number?.trim() || null;
  const lineLabel = (kind: string) =>
    kind === 'depot' ? depot?.shop_name ?? 'Épicerie de départ' : kind === 'pickup' ? arrival?.shop_name ?? 'Épicerie d’arrivée' : 'Transport';

  const check = (s: number): string | null => {
    if (s === 0) {
      if (!recipientName.trim()) return 'Indiquez le nom du destinataire.';
      if (!isValidRecipientPhone(recipientPhone)) return 'Numéro du destinataire incomplet (10 chiffres, ex. 034 12 345 67).';
    }
    if (s === 1 && !depotId) return 'Choisissez l’épicerie où vous déposez le colis.';
    if (s === 2) {
      if (!arrivalId) return 'Choisissez l’épicerie où le destinataire viendra le chercher.';
      if (arrival && !arrival.zone_id) return 'Cette épicerie est hors des zones desservies. Choisissez-en une autre.';
    }
    if (s === 3) {
      if (!category) return 'Choisissez le type de contenu.';
      if (value.trim() === '' || !Number.isFinite(declared) || declared < 0) return 'Indiquez la valeur du contenu en ariary (0 si sans valeur).';
      if (declared > MAX_DECLARED_VALUE) return `La valeur déclarée est limitée à ${formatAr(MAX_DECLARED_VALUE)}.`;
    }
    if (s === 4 && driverMode === 'choix') {
      if (!isOnline) return 'Choisir son chauffeur demande une connexion. Prenez « Automatique » ou attendez le réseau.';
      if (!chosenDriver) return 'Choisissez un chauffeur dans la liste.';
    }
    if (s === 4 && driverMode === 'prix') {
      const problem = proposedTotalProblem(proposedTotal, minTotal);
      if (problem) return problem;
    }
    if (s === 5) {
      if (payment === 'orange_money' && !omNumber && toPay !== 0) return 'Le paiement Orange Money n’est pas encore ouvert. Choisissez les espèces.';
      if (payment === 'orange_money' && reference.trim() && reference.trim().length < 4) return 'Référence Orange Money incomplète.';
    }
    return null;
  };

  const next = () => {
    const problem = check(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const submit = async () => {
    for (let s = 0; s <= 5; s++) {
      const problem = check(s);
      if (problem) {
        setStep(s);
        setError(problem);
        return;
      }
    }
    if (!userId || !depotId || !arrivalId || !category) return;
    setSending(true);
    setError(null);
    try {
      const { parcelId, result } = await placeOrder(userId, {
        depotId,
        arrivalId,
        recipientName: recipientName.trim(),
        recipientPhone: recipientPhone.trim(),
        category,
        declaredValue: Math.round(declared),
        driverMode,
        chosenDriverId: driverMode === 'choix' ? chosenDriver : null,
        paymentMethod: toPay === 0 ? 'especes' : payment,
        proposedTotal: driverMode === 'prix' ? proposedTotal : null,
      });
      if (result.status === 'error') {
        setError(parcelErrorMessage(result.error));
        return;
      }
      if (payment === 'orange_money' && toPay !== 0 && reference.trim()) {
        await doGesture(userId, { kind: 'payment_ref', paymentId: crypto.randomUUID(), parcelId, reference: reference.trim() });
      }
      navigate(result.status === 'sent' ? `/navy/colis/${parcelId}?nouveau=1` : '/navy/colis?garde=1', { replace: true });
    } finally {
      setSending(false);
    }
  };

  const drivers = quote?.drivers ?? [];

  return (
    <NavyPage>
      <NavyPageTitle icon={Send} title="Envoyer un colis" subtitle={`Étape ${step + 1} sur ${STEPS.length} : ${STEPS[step]}`} />
      <div className="flex gap-1" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-navyay-charcoal' : 'bg-navyay-charcoal/15'}`} />
        ))}
      </div>
      {!isOnline && (
        <NavyNotice icon={WifiOff}>
          Hors ligne : vous pouvez préparer la commande. Elle partira toute seule au retour du réseau ; le prix sera confirmé à ce moment-là.
        </NavyNotice>
      )}
      {grocersFromPhone && isOnline === false && grocers && grocers.length > 0 && (
        <NavyNotice>Liste des épiceries gardée sur ce téléphone lors de votre dernière connexion.</NavyNotice>
      )}
      {error && (
        <div ref={errorRef} className={errorFlash ? 'animate-pulse' : ''}>
          <NavyNotice tone="error">{error}</NavyNotice>
        </div>
      )}

      {step === 0 && (
        <NavyCard className="p-4 space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <UserRound className="w-5 h-5" aria-hidden="true" />
            À qui envoyez-vous ?
          </h3>
          <label className={labelCls}>
            Nom du destinataire
            <input className={inputCls} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} autoComplete="off" maxLength={80} />
          </label>
          <label className={labelCls}>
            Son téléphone
            <input
              className={inputCls}
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              inputMode="tel"
              autoComplete="off"
              placeholder="034 12 345 67"
            />
          </label>
          <p className="text-sm text-navyay-charcoal/75">
            S’il a un compte NAVY ay avec ce numéro, il suivra le colis dans « À recevoir ». Sinon, il lui suffira du code de retrait que vous lui donnerez.
          </p>
        </NavyCard>
      )}

      {step === 1 && (
        <NavyCard className="p-4 space-y-3">
          <h3 className="font-semibold">Où déposez-vous le colis ?</h3>
          {grocers === null ? (
            <p className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Chargement des épiceries…</p>
          ) : (
            <GrocerPicker grocers={grocers} zones={zones} selectedId={depotId} excludeId={arrivalId} onSelect={setDepotId} mode="depot" />
          )}
        </NavyCard>
      )}

      {step === 2 && (
        <NavyCard className="p-4 space-y-3">
          <h3 className="font-semibold">Où le destinataire viendra-t-il le chercher ?</h3>
          <p className="text-sm text-navyay-charcoal/80">Appelez d’abord le destinataire pour choisir ensemble l’épicerie la plus pratique pour lui.</p>
          {grocers && <GrocerPicker grocers={grocers} zones={zones} selectedId={arrivalId} excludeId={depotId} onSelect={setArrivalId} mode="arrival" />}
        </NavyCard>
      )}

      {step === 3 && (
        <NavyCard className="p-4 space-y-4">
          <fieldset>
            <legend className="font-semibold">Qu’y a-t-il dans le colis ?</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(CATEGORY_LABELS) as ParcelCategory[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
                    category === c ? 'border-navyay-charcoal bg-navyay-yellow' : 'border-navyay-charcoal/20 bg-white hover:bg-navyay-yellow/15'
                  }`}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className={labelCls}>
            Valeur du contenu
            <div className="relative">
              <input className={`${inputCls} pr-10`} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-sm text-navyay-charcoal/70" aria-hidden="true">Ar</span>
            </div>
          </label>
          <NavyNotice icon={ShieldCheck}>
            En cas de perte, NAVY ay rembourse la valeur déclarée, <strong>au plus {formatAr(MAX_DECLARED_VALUE)}</strong>. N’envoyez pas d’objet plus cher.
          </NavyNotice>
        </NavyCard>
      )}

      {step === 4 && (
        <NavyCard className="p-4 space-y-3">
          <h3 className="flex items-center gap-2 font-semibold">
            <Truck className="w-5 h-5" aria-hidden="true" />
            Quel chauffeur ?
          </h3>
          <div className="grid gap-2">
            {(
              [
                { v: 'auto', title: 'Automatique, le moins cher', text: 'NAVY ay propose la course au chauffeur le moins cher qui va dans la bonne direction.', icon: Sparkles },
                { v: 'choix', title: 'Je choisis mon chauffeur', text: 'Vous voyez les chauffeurs disponibles et vous en choisissez un.', icon: UserRound },
                { v: 'prix', title: 'Je propose mon prix', text: 'Vous fixez le prix total. La course est proposée à tous les chauffeurs : le premier qui accepte l’emporte.', icon: HandCoins },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                aria-pressed={driverMode === o.v}
                onClick={() => setDriverMode(o.v)}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
                  driverMode === o.v ? 'border-navyay-charcoal bg-navyay-yellow/25' : 'border-navyay-charcoal/20 bg-white hover:bg-navyay-yellow/10'
                }`}
              >
                <o.icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{o.title}</span>
                  <span className="block text-sm text-navyay-charcoal/80">{o.text}</span>
                </span>
              </button>
            ))}
          </div>
          {driverMode === 'prix' && (
            <div className="space-y-2 rounded-xl bg-navyay-charcoal/[0.04] p-3">
              <label className={labelCls}>
                Prix total que vous proposez
                <div className="relative">
                  <input
                    className={`${inputCls} pr-10 text-lg font-semibold`}
                    inputMode="numeric"
                    value={proposed}
                    onChange={(e) => setProposed(e.target.value)}
                    placeholder={String(Math.max(minTotal, 100))}
                    aria-describedby="navy-proposed-help"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-sm text-navyay-charcoal/70" aria-hidden="true">Ar</span>
                </div>
              </label>
              <p id="navy-proposed-help" className="text-sm">
                Minimum accepté : <strong className="tabular-nums">{formatAr(minTotal)}</strong> (tarifs des deux épiciers + part NAVY ay). Par tranches de 100 Ar.
              </p>
              {proposedGain !== null && (
                <p className="text-sm" aria-live="polite">
                  Le chauffeur gagnera <strong className="tabular-nums">{formatAr(proposedGain)}</strong>.
                  {quote && proposedGain < quote.transport_ceiling && ' C’est moins que le prix habituel : la course peut mettre plus de temps à trouver preneur.'}
                </p>
              )}
              <NavyHelp title="Comment marche « Je propose mon prix » ?">
                <p>Vous fixez le prix total du colis. Après le dépôt, la course est proposée en même temps à tous les chauffeurs qui vont dans la bonne direction.</p>
                <p>Le premier chauffeur qui accepte l’emporte. Il ne voit que ce qu’il gagne, jamais le prix total.</p>
                <p>Si aucun chauffeur n’accepte à ce prix, NAVY ay vous propose jusqu’à 3 chauffeurs à un autre prix : vous choisissez ou vous refusez.</p>
              </NavyHelp>
            </div>
          )}
          {driverMode === 'choix' &&
            (!isOnline ? (
              <NavyNotice icon={WifiOff}>Choisir son chauffeur demande une connexion.</NavyNotice>
            ) : quoteLoading ? (
              <p className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Recherche des chauffeurs…</p>
            ) : drivers.length === 0 ? (
              <NavyNotice tone="warn">Aucun chauffeur ne va vers {zoneName(zones, arrival?.zone_id) ?? 'cette zone'} pour l’instant. Prenez « Automatique » : NAVY ay cherchera dès le dépôt.</NavyNotice>
            ) : (
              <ul className="space-y-1.5" aria-label="Chauffeurs disponibles">
                {drivers.map((d) => (
                  <li key={d.partner_id}>
                    <button
                      type="button"
                      aria-pressed={chosenDriver === d.partner_id}
                      onClick={() => setChosenDriver(d.partner_id)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
                        chosenDriver === d.partner_id ? 'border-navyay-charcoal bg-navyay-yellow/25' : 'border-navyay-charcoal/15 bg-white'
                      }`}
                    >
                      <Truck className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium truncate">{d.name ?? 'Chauffeur'}</span>
                        <span className="block text-xs text-navyay-charcoal/75">
                          {d.vehicle_type ? VEHICLE_LABELS[d.vehicle_type as VehicleType] ?? d.vehicle_type : 'Véhicule'} · vers {zoneName(zones, d.dest_zone_id) ?? 'zone d’arrivée'}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">{formatAr(d.fare)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </NavyCard>
      )}

      {step === 5 && (
        <>
          <NavyCard className="p-4 space-y-3">
            <h3 className="font-semibold">Prix</h3>
            {quoteLoading && <p className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Calcul du prix…</p>}
            {total !== null && (
              <>
                <ul className="space-y-1.5">
                  {lines.map((l) => (
                    <li key={l.kind} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">{lineLabel(l.kind)}</span>
                      <span className="tabular-nums">{formatAr(l.shown)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-baseline justify-between gap-3 border-t border-navyay-charcoal/15 pt-3">
                  <span className="font-semibold">{credit && credit.used > 0 ? 'Total' : 'Total à payer'}</span>
                  <span className={`${credit && credit.used > 0 ? 'text-xl' : 'text-3xl'} font-bold tabular-nums`}>{formatAr(total)}</span>
                </div>
                {credit && credit.used > 0 && (
                  <>
                    <p className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex items-center gap-1.5">
                        <Wallet className="w-4 h-4" aria-hidden="true" />
                        Avoir utilisé
                      </span>
                      <span className="tabular-nums font-medium">−{formatAr(credit.used)}</span>
                    </p>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">Reste à payer</span>
                      <span className="text-3xl font-bold tabular-nums">{formatAr(credit.due)}</span>
                    </div>
                    {credit.left > 0 && <p className="text-xs text-navyay-charcoal/75">Il vous restera {formatAr(credit.left)} d’avoir pour un prochain envoi.</p>}
                  </>
                )}
                <p className="flex items-start gap-1.5 text-xs text-navyay-charcoal/75">
                  <Route className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>
                    {kmSource === 'route' ? `Distance par la route : ${formatKm(km)}.` : `Distance estimée : ${formatKm(km)} (à vol d’oiseau + 30 %).`} La part NAVY ay est comprise dans chaque ligne.
                    {!quote && ' Estimation faite sur ce téléphone : le prix exact sera confirmé à l’envoi.'}
                  </span>
                </p>
                {kmSource === 'route' && <p className="text-xs text-navyay-charcoal/75">{ORS_ATTRIBUTION}</p>}
              </>
            )}
            <NavyNotice icon={ShieldCheck}>Indemnisation maximale en cas de perte : {formatAr(Math.min(Number.isFinite(declared) ? declared : 0, MAX_DECLARED_VALUE))}.</NavyNotice>
          </NavyCard>

          <NavyCard className="p-4 space-y-3">
            <h3 className="font-semibold">Paiement</h3>
            {toPay === 0 ? (
              <NavyNotice tone="ok" icon={Wallet}>Votre avoir NAVY couvre tout le prix : rien à payer, le paiement est acquis dès la commande.</NavyNotice>
            ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={payment === 'especes'}
                onClick={() => setPayment('especes')}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
                  payment === 'especes' ? 'border-navyay-charcoal bg-navyay-yellow/25' : 'border-navyay-charcoal/20 bg-white'
                }`}
              >
                <Banknote className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">Espèces</span>
                  <span className="block text-sm text-navyay-charcoal/80">À l’épicier, au moment du dépôt.</span>
                </span>
              </button>
              <button
                type="button"
                aria-pressed={payment === 'orange_money'}
                onClick={() => setPayment('orange_money')}
                disabled={!!quote && !omNumber}
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-60 ${
                  payment === 'orange_money' ? 'border-navyay-charcoal bg-navyay-yellow/25' : 'border-navyay-charcoal/20 bg-white'
                }`}
              >
                <Smartphone className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">Orange Money</span>
                  <span className="block text-sm text-navyay-charcoal/80">{quote && !omNumber ? 'Pas encore disponible.' : 'Vous envoyez le montant, puis la référence.'}</span>
                </span>
              </button>
            </div>
            )}
            {toPay !== 0 && payment === 'orange_money' && omNumber && toPay !== null && (
              <div className="space-y-2 rounded-xl bg-navyay-charcoal/[0.04] p-3 text-sm">
                <p>
                  Envoyez <strong className="tabular-nums">{formatAr(toPay)}</strong> au numéro Orange Money de CyberKELY :{' '}
                  <strong className="tabular-nums">{omNumber}</strong>
                </p>
                <label className={labelCls}>
                  Référence reçue par SMS (vous pourrez aussi la saisir plus tard)
                  <input className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} autoComplete="off" placeholder="Ex. PP260926.1234.A12345" />
                </label>
                <p className="text-navyay-charcoal/75">Une opératrice vérifie le paiement. Aucun chauffeur n’est appelé avant.</p>
              </div>
            )}
          </NavyCard>

          <NavyNotifyPrompt why="Recevez une notification à chaque étape de votre colis (déposé, en route, arrivé)." />
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        {step > 0 ? (
          <button type="button" className={btnSecondary} onClick={() => { setError(null); setStep((s) => s - 1); }}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Retour
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className={btnPrimary} onClick={next}>
            Continuer
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : (
          <button type="button" className={btnAccent} onClick={() => void submit()} disabled={sending || (isOnline && !quote)}>
            {sending ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
            Commander
          </button>
        )}
      </div>

      <NavyHelp title="Comment se passe l’envoi ?">
        <p>1. Vous déposez le colis à l’épicerie de départ. L’épicier le referme devant vous.</p>
        <p>2. Un chauffeur qui va dans la bonne direction l’emporte jusqu’à l’épicerie d’arrivée.</p>
        <p>3. Le destinataire vient le chercher et donne le code de retrait que vous lui aurez transmis.</p>
        <p>Le prix est fixé au moment de la commande : il ne change plus ensuite, sauf si vous acceptez vous-même un chauffeur plus cher.</p>
        <p>Si vous avez un avoir NAVY, il est déduit tout seul du prix.</p>
      </NavyHelp>
    </NavyPage>
  );
}
