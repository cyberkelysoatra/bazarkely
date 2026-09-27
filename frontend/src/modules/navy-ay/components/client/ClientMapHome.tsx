/**
 * NAVY ay — client home on the map and the sending journey (phase 2C2, decisions 48, 51,
 * 52 (3)(4), 54 (1)). The map of Nosy Be covers the screen; every step opens ABOVE it in
 * a panel (fade + slight slide) and the map follows each choice.
 *
 *   home → recipient → (usual grocer of a recognised recipient | choice on the map)
 *        → route (road drawn, distance, departure: street hand-over / grocer, drivers with
 *          their price) → vehicle sheet → contents → payment → order.
 *
 * The business logic is the one of phases 2A-2B2, unchanged: the SAME server functions
 * (navy_quote / navy_quote_handover for the price, navy_create_parcel for the order,
 * frozen by the server), the same modes (automatic = cheapest, "Je choisis mon chauffeur"
 * = "Lui proposer mon colis", 30 s then the next one, "Je propose mon prix"), credit,
 * cash or Orange Money, direct hand-over with its photo. The phone never sends a price,
 * except the total proposed by the client (checked again by the server).
 *
 * Position: ONE GPS reading when the map opens (never a continuous tracking); refused or
 * unavailable → centred on Hell-Ville. Drivers are shown at their DECLARED destination
 * (the live position comes in 2C3), never with a phone. Pickup always at a grocer
 * (decisions 7, 16): no home is ever shown.
 * Offline: the map, the last grocers, drivers and recent recipients kept on the phone;
 * an order prepared offline leaves at the return of the network with the same id.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Banknote,
  Bike,
  Car,
  Check,
  ChevronRight,
  Contact,
  Copy,
  FileText,
  HandCoins,
  Hand,
  Loader2,
  MapPin,
  Package,
  Send,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Store,
  Utensils,
  Wallet,
  WifiOff,
} from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { useNavyProfile } from '../../services/navyProfileStore';
import {
  doGesture,
  getHandoverQuote,
  getQuote,
  loadGrocerDistances,
  loadOpenGrocers,
  myCredit,
  placeOrder,
  signedPhotoUrl,
  useParcels,
} from '../../services/parcelService';
import {
  availableDrivers,
  dismissUsualGrocerProposal,
  lookupRecipient,
  myUsualGrocer,
  routePath,
  setUsualGrocer,
  usualGrocerProposalDismissed,
} from '../../services/clientService';
import { loadZones, useNavyZones, zoneName } from '../../services/zoneService';
import type {
  DepartureMode,
  DriverMode,
  NavyAvailableDriver,
  NavyGrocerDistance,
  NavyOpenGrocer,
  NavyQuote,
  NavyRecipientLookup,
  ParcelCategory,
  PaymentMethod,
} from '../../types/parcel';
import type { LatLng, VehicleType } from '../../types/partner';
import { computeFare, VEHICLE_LABELS } from '../../utils/partnerRules';
import {
  creditSplit,
  estimatedKm,
  estimateMarginPct,
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
  round5,
} from '../../utils/parcelRules';
import {
  contactFromPicker,
  firstName,
  formatMgPhone,
  formatWalk,
  HELL_VILLE,
  metres,
  nearestGrocer,
  pricedDrivers,
  recentRecipients,
  spreadDrivers,
} from '../../utils/clientRules';
import NavyMap, { type NavyMapApi, type NavyMapShop, type NavyMapVehicle } from '../map/NavyMap';
import PhotoField from '../ui/PhotoField';
import { formatAr, NavyNotice } from '../ui/NavyUi';
import { NavyNotifyPrompt } from '../parcel/ParcelUi';
import { MapButtons, MapSheet, MapStage } from './MapStage';
import { Avatar, bigCtaCls, choiceCls, ctaCls, fieldCls, ghostCls, HelpToggle, linkCls, LivePill, MapToast, PanelHead, Plate } from './ClientUi';

type Panel = 'home' | 'recipient' | 'pickGrocer' | 'route' | 'pickDepot' | 'moveStart' | 'vehicle' | 'price' | 'what' | 'pay';
type Mode = 'colis' | 'taxi' | 'courses';

const HOME_ZOOM = 14.3;
const NOTE_MAX = 120;
const CATEGORIES: { v: ParcelCategory; label: string; icon: typeof FileText }[] = [
  { v: 'document', label: 'Document', icon: FileText },
  { v: 'vetement', label: 'Vêtement', icon: Shirt },
  { v: 'telephone', label: 'Téléphone', icon: Smartphone },
  { v: 'nourriture', label: 'Nourriture', icon: Utensils },
  { v: 'autre', label: 'Autre', icon: Package },
];
const SOON: Record<Exclude<Mode, 'colis'>, string> = {
  taxi: 'Le taxi arrive bientôt dans NAVY ay : vous pourrez monter vous-même dans un véhicule qui va dans votre direction.',
  courses: 'Les courses arrivent bientôt : vous comparerez les prix des épiceries et recevrez vos achats.',
};

/** ONE GPS reading per opening of the app (never watchPosition). */
let gpsReading: Promise<{ lat: number; lng: number } | null> | null = null;
function readPositionOnce(): Promise<{ lat: number; lng: number } | null> {
  if (gpsReading) return gpsReading;
  gpsReading = new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
  return gpsReading;
}

/** Contact Picker API (Chrome Android): name + phone of ONE contact, never the whole book. */
function contactPickerAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window;
}

const toLatLng = (p: [number, number]): LatLng => [p[1], p[0]];

export default function ClientMapHome({ startPanel = 'home' }: { startPanel?: 'home' | 'recipient' }) {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const profile = useNavyProfile();
  const parcels = useParcels();
  const { zones } = useNavyZones();
  const settings = profile.settings as any;

  // ---- map
  const apiRef = useRef<NavyMapApi | null>(null);
  const [sheetH, setSheetH] = useState(260);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDone, setGpsDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  // ---- data
  const [grocers, setGrocers] = useState<NavyOpenGrocer[]>([]);
  const [grocersFromPhone, setGrocersFromPhone] = useState(false);
  const [drivers, setDrivers] = useState<NavyAvailableDriver[]>([]);
  const [distances, setDistances] = useState<NavyGrocerDistance[]>([]);
  const [phoneCredit, setPhoneCredit] = useState<number | null>(null);
  const [usualId, setUsualId] = useState<string | null>(null);
  const [proposalDismissed, setProposalDismissed] = useState(true);

  // ---- journey
  const [panel, setPanel] = useState<Panel>(startPanel);
  const [mode, setMode] = useState<Mode>('colis');
  const [soon, setSoon] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [recipient, setRecipient] = useState<{ name: string; phone: string } | null>(null);
  const [lookup, setLookup] = useState<NavyRecipientLookup | null>(null);
  const [looking, setLooking] = useState(false);
  const [arrivalId, setArrivalId] = useState<string | null>(null);
  const [changingArrival, setChangingArrival] = useState(false);
  const [departure, setDeparture] = useState<DepartureMode>('epicier');
  const [movedStart, setMovedStart] = useState<{ lat: number; lng: number } | null>(null);
  const [depotChoice, setDepotChoice] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [vehicleUrl, setVehicleUrl] = useState<string | null>(null);
  const [driverMode, setDriverMode] = useState<DriverMode>('auto');
  const [chosenDriver, setChosenDriver] = useState<string | null>(null);
  const [proposed, setProposed] = useState('');
  const [category, setCategory] = useState<ParcelCategory | null>(null);
  const [value, setValue] = useState(0);
  const [photo, setPhoto] = useState<Blob | undefined>(undefined);
  const [senderPhone, setSenderPhone] = useState(() => (useAppStore.getState().user as { phone?: string | null } | null)?.phone ?? '');
  const [handNote, setHandNote] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('especes');
  const [reference, setReference] = useState('');
  const [quote, setQuote] = useState<NavyQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [path, setPath] = useState<{ coords: LatLng[]; km: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // ---- loading (phone copy first, then the server)
  useEffect(() => {
    let alive = true;
    void readPositionOnce().then((p) => {
      if (!alive) return;
      setGps(p);
      setGpsDone(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    void loadZones();
    loadOpenGrocers()
      .then(({ list, fromPhone }) => {
        setGrocers(list);
        setGrocersFromPhone(fromPhone);
      })
      .catch(() => setGrocers([]));
    loadGrocerDistances().then(setDistances).catch(() => undefined);
    if (userId) {
      myCredit(userId).then(({ credit }) => setPhoneCredit(credit?.balance ?? null)).catch(() => undefined);
      myUsualGrocer(userId).then(setUsualId).catch(() => undefined);
      usualGrocerProposalDismissed(userId).then(setProposalDismissed).catch(() => undefined);
    }
  }, [isOnline, userId]);

  useEffect(() => {
    let alive = true;
    const load = () => availableDrivers().then(({ list }) => alive && setDrivers(list)).catch(() => undefined);
    void load();
    if (!isOnline) return;
    const t = window.setInterval(load, 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [isOnline]);

  // ---- derived
  const start = movedStart ?? gps;
  const startOrCentre = start ?? HELL_VILLE;
  const remise = departure === 'remise';
  const arrival = grocers.find((g) => g.id === arrivalId) ?? null;
  const proposedDepot = useMemo(() => nearestGrocer(grocers, startOrCentre, arrivalId), [grocers, startOrCentre.lat, startOrCentre.lng, arrivalId]); // eslint-disable-line react-hooks/exhaustive-deps
  const depot = remise ? null : (depotChoice && depotChoice !== arrivalId ? grocers.find((g) => g.id === depotChoice) : null) ?? proposedDepot?.grocer ?? null;
  // Depot shown on its card even while the street hand-over is selected.
  const depotCard = depot ?? proposedDepot?.grocer ?? null;
  const depotCardWalk = depotCard && start ? metres(start, depotCard) : null;
  const pinLat = remise && start ? round5(start.lat) : null;
  const pinLng = remise && start ? round5(start.lng) : null;
  const recents = useMemo(() => (userId && parcels.userId === userId ? recentRecipients(parcels.rows, userId) : []), [parcels, userId]);
  const settingsOm = String(settings?.orange_money_number ?? '').trim();

  // ---- server quote (same functions as 2A-2B2), read again while the road distance is computed
  useEffect(() => {
    setQuote(null);
    if (!arrivalId || !isOnline) return;
    if (remise ? pinLat == null || pinLng == null : !depot) return;
    let cancelled = false;
    let timer: number | undefined;
    const ask = (left: number) => {
      const p = remise ? getHandoverQuote(pinLat as number, pinLng as number, arrivalId) : getQuote(depot!.id, arrivalId);
      p.then((q) => {
        if (cancelled) return;
        setQuote(q);
        if (q.distance_pending && left > 0) timer = window.setTimeout(() => ask(left - 1), 2500);
      })
        .catch((err) => !cancelled && setError(parcelErrorMessage(err)))
        .finally(() => !cancelled && setQuoteLoading(false));
    };
    setQuoteLoading(true);
    timer = window.setTimeout(() => ask(3), remise ? 600 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [depot?.id, arrivalId, isOnline, remise, pinLat, pinLng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- road drawn on the map (computed once per pair by the server; dashed straight line meanwhile)
  const fromPoint = remise ? (pinLat != null && pinLng != null ? { lat: pinLat, lng: pinLng } : null) : depot ? { lat: depot.lat, lng: depot.lng } : null;
  useEffect(() => {
    setPath(null);
    if (!arrivalId || !fromPoint || !isOnline) return;
    let cancelled = false;
    let timer: number | undefined;
    const ask = (left: number) => {
      routePath(remise ? null : depot!.id, remise ? fromPoint : null, arrivalId)
        .then((r) => {
          if (cancelled) return;
          if (r.status === 'ok' && r.path && r.path.length > 1) setPath({ coords: r.path.map(toLatLng), km: r.km });
          else if (r.status === 'pending' && left > 0) timer = window.setTimeout(() => ask(left - 1), 2500);
        })
        .catch(() => undefined);
    };
    timer = window.setTimeout(() => ask(4), remise ? 700 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [arrivalId, fromPoint?.lat, fromPoint?.lng, isOnline, remise]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- offline estimate (same rules as the server, cached settings and road distances)
  const margin = quote?.estimate_margin_pct ?? estimateMarginPct(settings);
  const estimate = useMemo(() => {
    if (quote || !arrival) return null;
    let d: { km: number; source: 'route' | 'estimation' };
    if (remise) {
      if (pinLat == null || pinLng == null) return null;
      d = { km: estimatedKm(pinLat, pinLng, arrival.lat, arrival.lng, margin), source: 'estimation' };
    } else {
      if (!depot) return null;
      d = pairKm(distances, depot, arrival, margin);
    }
    const ceiling = computeFare(d.km, settings?.suggested_min_fare ?? 1000, settings?.suggested_fare_per_5km ?? 1000);
    const b = priceBreakdown(remise ? 0 : depot?.depot_fee ?? 0, ceiling, arrival.pickup_fee, settings?.cyberkely_share ?? 300);
    return { km: d.km, source: d.source, total: b.total, lines: b.lines.filter((l) => !(remise && l.kind === 'depot')).map((l) => ({ kind: l.kind, shown: l.shown })) };
  }, [quote, depot, arrival, settings, distances, remise, pinLat, pinLng, margin]);

  const share = quote?.share ?? settings?.cyberkely_share ?? 300;
  const depotFee = remise ? 0 : quote?.depot_fee ?? depot?.depot_fee ?? 0;
  const pickupFee = quote?.pickup_fee ?? arrival?.pickup_fee ?? 0;
  const priced = useMemo(() => pricedDrivers(quote?.drivers ?? [], depotFee, pickupFee, share), [quote, depotFee, pickupFee, share]);
  const pricedById = useMemo(() => new Map(priced.map((p) => [p.driver.partner_id, p])), [priced]);
  const cheapest = priced[0] ?? null;
  const minTotal = quote?.min_total ?? minProposedTotal(depotFee, pickupFee, share);
  const proposedTotal = Number(proposed.replace(/[\s.]/g, ''));
  const proposedOk = driverMode === 'prix' && proposedTotalProblem(proposedTotal, minTotal) === null;
  const proposedGain = proposedOk ? proposedDriverGain(proposedTotal, depotFee, pickupFee, share) : null;
  const proposedLines = proposedOk ? priceBreakdown(depotFee, proposedGain ?? 0, pickupFee, share).lines.map((l) => ({ kind: l.kind, shown: l.shown })) : null;
  const lines = (proposedLines ?? (quote ? quote.breakdown.lines.map((l) => ({ kind: l.kind, shown: l.shown })) : estimate?.lines ?? [])).filter(
    (l) => !(remise && l.kind === 'depot')
  );
  const total = driverMode === 'prix' ? (proposedOk ? proposedTotal : null) : quote?.breakdown.total ?? estimate?.total ?? null;
  const km = quote?.distance_km ?? estimate?.km ?? null;
  const kmSource = quote?.distance_source ?? estimate?.source ?? 'estimation';
  const creditBalance = quote?.credit_balance ?? phoneCredit ?? 0;
  const credit = total !== null ? creditSplit(creditBalance, total) : null;
  const toPay = credit ? credit.due : total;
  const omNumber = quote?.orange_money_number?.trim() || null;
  const omOpen = quote ? !!omNumber : !!settingsOm || !isOnline;
  const arrivalZone = zoneName(zones, arrival?.zone_id) ?? arrival?.shop_name ?? '';
  const chosen = chosenDriver ? drivers.find((d) => d.partner_id === chosenDriver) ?? null : null;
  const lineLabel = (kind: string) =>
    kind === 'depot'
      ? depot?.shop_name ?? 'Épicerie de départ'
      : kind === 'pickup'
      ? arrival?.shop_name ?? 'Épicerie d’arrivée'
      : driverMode === 'choix' && chosen?.first_name
      ? `Transport (${chosen.first_name})`
      : 'Transport';

  // Transport paid at the advised price; a cheaper driver leaves the gap as NAVY credit (2A-2B1).
  const gapDriver = driverMode === 'choix' ? pricedById.get(chosenDriver ?? '') ?? null : driverMode === 'auto' ? cheapest : null;
  const gap = quote && gapDriver ? quote.breakdown.total - gapDriver.total : 0;
  const avoirNote =
    gap > 0 && gapDriver
      ? driverMode === 'choix'
        ? `Si ${firstName(gapDriver.driver.name)} accepte (${formatAr(gapDriver.total)}), ${formatAr(gap)} vous reviennent en avoir NAVY.`
        : `Prix conseillé. Si un chauffeur moins cher accepte (dès ${formatAr(gapDriver.total)}), la différence vous revient en avoir NAVY.`
      : null;

  // ---- map content
  const routeLine: { coords: LatLng[]; dashed?: boolean } | null =
    arrival && fromPoint ? (path ? { coords: path.coords } : { coords: [[fromPoint.lat, fromPoint.lng], [arrival.lat, arrival.lng]], dashed: true }) : null;
  const inJourney = !['home', 'recipient'].includes(panel) && !!arrival;
  const shops: NavyMapShop[] = useMemo(
    () =>
      grocers.map((g) => ({
        id: g.id,
        lat: g.lat,
        lng: g.lng,
        name: g.shop_name,
        role: g.id === arrivalId && inJourney ? 'dest' : !remise && inJourney && depot?.id === g.id ? 'pick' : 'normal',
      })),
    [grocers, arrivalId, inJourney, remise, depot?.id]
  );
  const vehicles: NavyMapVehicle[] = useMemo(
    () =>
      spreadDrivers(drivers).map((d) => {
        const p = pricedById.get(d.partner_id);
        const vt = d.vehicle_type ? VEHICLE_LABELS[d.vehicle_type as VehicleType] ?? d.vehicle_type : 'Véhicule';
        return {
          id: d.partner_id,
          lat: d.lat,
          lng: d.lng,
          type: d.vehicle_type,
          label: `${d.first_name ?? 'Chauffeur'}, ${vt}`,
          price: inJourney && p ? formatAr(p.total) : null,
          dim: inJourney && !p,
          selected: selected === d.partner_id || (panel !== 'vehicle' && chosenDriver === d.partner_id && driverMode === 'choix'),
        };
      }),
    [drivers, pricedById, inJourney, selected, panel, chosenDriver, driverMode]
  );
  const selectedDriver = selected ? drivers.find((d) => d.partner_id === selected) ?? null : null;
  const trail = selectedDriver?.route && selectedDriver.route.length > 1 ? selectedDriver.route : null;
  const walk = !remise && inJourney && start && depot ? ([[start.lat, start.lng], [depot.lat, depot.lng]] as LatLng[]) : null;

  // ---- framing above the panel
  const pad = useCallback(() => ({ top: 64, bottom: sheetH + 40, left: 48, right: 72 }), [sheetH]);
  const fitJourney = useCallback(() => {
    if (!arrival) return;
    const pts: LatLng[] = [[arrival.lat, arrival.lng], ...(routeLine?.coords ?? [])];
    if (start) pts.push([start.lat, start.lng]);
    if (!remise && depot) pts.push([depot.lat, depot.lng]);
    apiRef.current?.fitPoints(pts, pad(), 15.5);
  }, [arrival, routeLine?.coords, start, remise, depot, pad]); // eslint-disable-line react-hooks/exhaustive-deps

  const routeKey = routeLine ? `${routeLine.coords.length}:${routeLine.dashed ? 1 : 0}:${arrivalId}:${depot?.id}:${remise}` : '';
  useEffect(() => {
    if (panel === 'route') fitJourney();
  }, [routeKey, panel, sheetH]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (panel === 'pickGrocer' || panel === 'pickDepot') {
      const pts = grocers.map((g) => [g.lat, g.lng] as LatLng);
      if (start) pts.push([start.lat, start.lng]);
      if (pts.length) apiRef.current?.fitPoints(pts, pad(), 15);
    }
    if (panel === 'home' && gpsDone) apiRef.current?.easeTo(startOrCentre.lat, startOrCentre.lng, HOME_ZOOM);
  }, [panel, gpsDone, grocers.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (panel !== 'vehicle' || !selectedDriver) return;
    const pts: LatLng[] = [[selectedDriver.dest_lat, selectedDriver.dest_lng], ...(trail ?? [])];
    if (arrival) pts.push([arrival.lat, arrival.lng]);
    if (fromPoint) pts.push([fromPoint.lat, fromPoint.lng]);
    apiRef.current?.fitPoints(pts, pad(), 15);
  }, [panel, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vehicle photo of the sheet (short-lived signed link, online only).
  useEffect(() => {
    setVehicleUrl(null);
    if (!selectedDriver?.vehicle_photo_path || !isOnline) return;
    let cancelled = false;
    void signedPhotoUrl(selectedDriver.vehicle_photo_path).then((u) => !cancelled && setVehicleUrl(u));
    return () => {
      cancelled = true;
    };
  }, [selectedDriver?.vehicle_photo_path, isOnline]);

  // ---- navigation between panels
  const go = (p: Panel) => {
    setError(null);
    setPanel(p);
  };
  const resetJourney = () => {
    setRecipient(null);
    setLookup(null);
    setArrivalId(null);
    setChangingArrival(false);
    setSelected(null);
    setDriverMode('auto');
    setChosenDriver(null);
    setProposed('');
    setQuote(null);
    setPath(null);
    setDepotChoice(null);
  };

  const chooseRecipient = async (n: string, p: string) => {
    const tel = formatMgPhone(p) ?? p.trim();
    if (!n.trim()) return setError('Indiquez le nom du destinataire.');
    if (!isValidRecipientPhone(tel)) return setError('Numéro incomplet : 10 chiffres, par exemple 034 12 345 67.');
    setError(null);
    setName(n.trim());
    setPhone(tel);
    setRecipient({ name: n.trim(), phone: tel });
    setArrivalId(null);
    setChangingArrival(false);
    setLooking(true);
    const res = await lookupRecipient(tel);
    setLooking(false);
    setLookup(res);
    const usual = res?.known && res.usual_grocer_id ? grocers.find((g) => g.id === res.usual_grocer_id && g.zone_id) : null;
    if (usual) {
      setArrivalId(usual.id);
      go('route');
    } else go('pickGrocer');
  };

  const pickContact = async () => {
    try {
      const nav = navigator as Navigator & { contacts?: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> } };
      const list = await nav.contacts!.select(['name', 'tel'], { multiple: false });
      const c = contactFromPicker(list?.[0]);
      if (!c) return;
      setName(c.name);
      setPhone(c.phone);
      if (c.name && isValidRecipientPhone(c.phone)) void chooseRecipient(c.name, c.phone);
      else setError(c.phone ? 'Ce numéro n’est pas un numéro malgache complet : corrigez-le ci-dessous.' : 'Ce contact n’a pas de numéro : saisissez-le ci-dessous.');
    } catch {
      /* closed without choosing */
    }
  };

  const onShopTap = (id: string) => {
    const g = grocers.find((x) => x.id === id);
    if (!g) return;
    if (panel === 'pickGrocer') {
      if (!g.zone_id) return setToast(`${g.shop_name} est hors des zones desservies.`);
      setArrivalId(id);
      setChangingArrival(false);
      go('route');
      return;
    }
    if (panel === 'pickDepot') {
      if (id === arrivalId) return setToast('C’est l’épicerie d’arrivée : choisissez-en une autre pour le dépôt.');
      setDepotChoice(id);
      go('route');
      return;
    }
    if (panel === 'route' && id === arrivalId) {
      setChangingArrival(true);
      go('pickGrocer');
      return;
    }
    setToast(`${g.shop_name} · retrait ${formatAr(g.pickup_fee)}`);
  };

  const onVehicleTap = (id: string) => {
    if (['what', 'pay', 'price', 'recipient', 'pickGrocer', 'pickDepot', 'moveStart'].includes(panel)) return;
    setSelected(id);
    go('vehicle');
  };

  const onMapTap = (lat: number, lng: number) => {
    if (panel !== 'moveStart') return;
    setMovedStart({ lat, lng });
    setToast('Départ déplacé');
    go('route');
  };

  const closeVehicle = () => {
    setSelected(null);
    go(arrival ? 'route' : 'home');
  };

  // ---- checks (same rules as before)
  const checkWhat = (): string | null => {
    if (!category) return 'Choisissez ce que vous envoyez.';
    if (!Number.isFinite(value) || value < 0 || value > MAX_DECLARED_VALUE) return `La valeur déclarée est limitée à ${formatAr(MAX_DECLARED_VALUE)}.`;
    if (remise) {
      if (!omOpen) return 'La remise au chauffeur se paie par Orange Money, qui n’est pas encore ouvert. Choisissez un épicier.';
      if (!start) return 'Touchez votre point jaune puis la carte pour placer le lieu de remise.';
      if (!isValidRecipientPhone(senderPhone)) return 'Indiquez votre téléphone (10 chiffres) : le chauffeur vous appellera en approchant.';
      if (handNote.trim().length > NOTE_MAX) return `Repère trop long (${NOTE_MAX} caractères au plus).`;
    }
    return null;
  };
  const checkOrder = (): string | null => {
    if (!recipient) return 'Choisissez le destinataire.';
    if (!arrival) return 'Choisissez l’épicerie de retrait.';
    if (!arrival.zone_id) return 'Cette épicerie est hors des zones desservies. Choisissez-en une autre.';
    if (!remise && !depot) return 'Aucune épicerie de dépôt ouverte pour l’instant.';
    if (driverMode === 'choix') {
      if (!isOnline) return 'Proposer le colis à un chauffeur demande une connexion.';
      if (!chosenDriver || !pricedById.has(chosenDriver)) return 'Ce chauffeur ne va plus vers cette épicerie. Choisissez-en un autre.';
    }
    if (driverMode === 'prix') {
      const problem = proposedTotalProblem(proposedTotal, minTotal);
      if (problem) return problem;
    }
    const w = checkWhat();
    if (w) return w;
    if ((remise || payment === 'orange_money') && !omNumber && toPay !== 0 && isOnline)
      return remise ? 'Le paiement Orange Money n’est pas encore ouvert : choisissez un épicier de départ.' : 'Le paiement Orange Money n’est pas encore ouvert. Choisissez les espèces.';
    if ((remise || payment === 'orange_money') && reference.trim() && reference.trim().length < 4) return 'Référence Orange Money incomplète.';
    return null;
  };

  const submit = async () => {
    const problem = checkOrder();
    if (problem) return setError(problem);
    if (!userId || !arrival || !category || !recipient) return;
    setSending(true);
    setError(null);
    try {
      const { parcelId, result } = await placeOrder(userId, {
        depotId: remise ? null : depot!.id,
        arrivalId: arrival.id,
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        category,
        declaredValue: Math.round(value),
        driverMode,
        chosenDriverId: driverMode === 'choix' ? chosenDriver : null,
        paymentMethod: remise ? 'orange_money' : toPay === 0 ? 'especes' : payment,
        proposedTotal: driverMode === 'prix' ? proposedTotal : null,
        departureMode: departure,
        handoverLat: remise ? pinLat : null,
        handoverLng: remise ? pinLng : null,
        handoverNote: remise ? handNote.trim() || null : null,
        senderPhone: remise ? senderPhone.trim() : null,
      });
      if (result.status === 'error') return setError(parcelErrorMessage(result.error));
      if (remise && photo) await doGesture(userId, { kind: 'photo', parcelId, blob: photo });
      if ((remise || payment === 'orange_money') && toPay !== 0 && reference.trim()) {
        await doGesture(userId, { kind: 'payment_ref', paymentId: crypto.randomUUID(), parcelId, reference: reference.trim() });
      }
      navigate(result.status === 'sent' ? `/navy/colis/${parcelId}?nouveau=1` : '/navy/colis?garde=1', { replace: true });
    } finally {
      setSending(false);
    }
  };

  const copyOm = async () => {
    if (!omNumber) return;
    try {
      await navigator.clipboard.writeText(omNumber.replace(/\s/g, ''));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast(omNumber);
    }
  };

  // ---- usual grocer proposal after a first withdrawal (decision 7)
  const lastWithdrawn = userId && parcels.userId === userId
    ? parcels.rows.filter((p) => p.recipient_user_id === userId && p.status === 'retire').sort((a, b) => (b.withdrawn_at ?? '').localeCompare(a.withdrawn_at ?? ''))[0]
    : undefined;
  const proposalGrocer = !usualId && !proposalDismissed && lastWithdrawn ? grocers.find((g) => g.id === lastWithdrawn.arrival_partner_id) ?? null : null;
  const acceptProposal = async () => {
    if (!userId || !proposalGrocer) return;
    const r = await setUsualGrocer(userId, proposalGrocer.id);
    if (r === 'error') return setToast('Cette épicerie ne peut pas être choisie pour l’instant.');
    setUsualId(proposalGrocer.id);
    setToast(`${proposalGrocer.shop_name} est votre épicerie de retrait`);
  };

  // ---- pill at the top
  const pill = !isOnline
    ? 'Hors ligne : dernières données gardées'
    : inJourney && arrival
    ? `${priced.length} chauffeur${priced.length > 1 ? 's' : ''} ${priced.length > 1 ? 'vont' : 'va'} vers ${arrivalZone}`
    : `${drivers.length} chauffeur${drivers.length > 1 ? 's' : ''} disponible${drivers.length > 1 ? 's' : ''} sur l’île`;

  const recipientFirst = firstName(recipient?.name);
  const known = !!lookup?.known;

  // ------------------------------------------------------------------ panels
  const errorBox = error ? (
    <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
      {error}
    </div>
  ) : null;

  const homePanel = (
    <div className="space-y-3">
      <PanelHead
        title="Bonjour !"
        sub="Les chauffeurs disponibles sont sur la carte, là où ils vont. Touchez-en un pour le découvrir."
        help={
          <>
            <p>NAVY ay transporte vos petits colis à Nosy Be avec des chauffeurs qui font déjà le trajet.</p>
            <p>Vous choisissez le destinataire, NAVY ay trace la route jusqu’à son épicerie et montre le prix de chaque chauffeur.</p>
            <p>Le destinataire retire toujours son colis dans une épicerie, avec un code que vous lui donnez.</p>
          </>
        }
      />
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Que voulez-vous faire ?">
        {(
          [
            ['colis', 'Un colis', 'Disponible', Package],
            ['taxi', 'Un taxi', 'Bientôt', Car],
            ['courses', 'Mes courses', 'Bientôt', ShoppingBasket],
          ] as const
        ).map(([m, label, small, Icon]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setSoon(m === 'colis' ? null : SOON[m]);
            }}
            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] px-1 py-2 text-[13px] font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
              mode === m ? 'border-navyay-yellow bg-navyay-yellow/[0.18]' : 'border-navyay-charcoal/15 bg-white'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
            <small className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-navyay-charcoal/75">{small}</small>
          </button>
        ))}
      </div>
      {soon && (
        <p className="rounded-xl bg-navyay-charcoal/[0.05] px-3 py-2 text-sm" role="status">
          {soon}
        </p>
      )}
      <button
        type="button"
        className={bigCtaCls}
        onClick={() => {
          if (mode === 'colis') {
            resetJourney();
            go('recipient');
          } else setSoon(SOON[mode]);
        }}
      >
        {mode === 'colis' ? <Send className="h-[22px] w-[22px]" aria-hidden="true" /> : mode === 'taxi' ? <Car className="h-[22px] w-[22px]" aria-hidden="true" /> : <ShoppingBasket className="h-[22px] w-[22px]" aria-hidden="true" />}
        {mode === 'colis' ? 'J’envoie un colis à…' : mode === 'taxi' ? 'Je cherche un taxi' : 'Je fais mes courses'}
      </button>
      {proposalGrocer && (
        <div className="space-y-2 rounded-2xl bg-navyay-charcoal/[0.05] p-3 text-sm">
          <p>
            Vous avez retiré un colis chez <strong>{proposalGrocer.shop_name}</strong>. En faire votre épicerie de retrait ? Vos proches la verront
            proposée quand ils vous enverront un colis.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={ctaCls} onClick={() => void acceptProposal()}>
              <Check className="h-5 w-5" aria-hidden="true" />
              Oui
            </button>
            <button
              type="button"
              className={ghostCls}
              onClick={() => {
                setProposalDismissed(true);
                if (userId) void dismissUsualGrocerProposal(userId);
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <Link to="/navy/mon-epicerie" className={linkCls}>
          <Store className="h-4 w-4" aria-hidden="true" />
          Mon épicerie de retrait
        </Link>
        <Link to="/navy/colis" className={linkCls}>
          Mes colis
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );

  const recipientPanel = (
    <div className="space-y-3">
      <PanelHead
        title="À qui ?"
        onBack={() => go('home')}
        help={
          <>
            <p>Choisissez la personne dans le répertoire de votre téléphone, parmi vos derniers destinataires, ou tapez son nom et son numéro.</p>
            <p>Si elle utilise NAVY ay, son épicerie habituelle devient l’arrivée. Sinon, appelez-la puis touchez sur la carte l’épicerie qu’elle préfère.</p>
            <p>NAVY ay ne lit jamais tout votre répertoire : seulement le contact que vous choisissez.</p>
          </>
        }
      />
      {errorBox}
      {contactPickerAvailable() && (
        <button type="button" className={ctaCls} onClick={() => void pickContact()} disabled={looking}>
          <Contact className="h-5 w-5" aria-hidden="true" />
          Choisir dans mes contacts
        </button>
      )}
      {recents.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.05em] text-navyay-charcoal/75">Mes destinataires récents</p>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {recents.map((r) => (
              <button
                key={r.phone}
                type="button"
                disabled={looking}
                onClick={() => void chooseRecipient(r.name, r.phone)}
                className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl p-1 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
                aria-label={`${r.name}, ${r.phone}`}
              >
                <Avatar name={r.name} on />
                <span className="max-w-[72px] truncate">{firstName(r.name)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void chooseRecipient(name, phone);
        }}
        noValidate
      >
        <label className="block text-sm font-bold">
          Nom
          <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={80} placeholder="Ex. Soa Rakoto" />
        </label>
        <label className="block text-sm font-bold">
          Numéro
          <input
            className={fieldCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setPhone((p) => formatMgPhone(p) ?? p)}
            inputMode="tel"
            autoComplete="off"
            placeholder="034 12 345 67"
          />
        </label>
        <button type="submit" className={ctaCls} disabled={looking}>
          {looking ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
          {looking ? 'Recherche sur NAVY ay…' : 'Continuer'}
        </button>
      </form>
      {!contactPickerAvailable() && <p className="text-xs text-navyay-charcoal/75">Sur ce téléphone, tapez le nom et le numéro (le choix dans le répertoire existe sur Chrome Android).</p>}
    </div>
  );

  const pickGrocerPanel = (
    <div className="space-y-3">
      <PanelHead
        title={changingArrival ? 'Autre épicerie de retrait' : `Où ${recipientFirst} retirera le colis ?`}
        sub={
          changingArrival
            ? 'Touchez une épicerie sur la carte.'
            : known
            ? `${lookup?.first_name ?? recipientFirst} est sur NAVY ay mais n’a pas encore choisi d’épicerie. Appelez cette personne, puis touchez sur la carte l’épicerie qu’elle préfère.`
            : lookup === null && !isOnline
            ? `Hors ligne : impossible de savoir si ${recipientFirst} est sur NAVY ay. Appelez cette personne, puis touchez sur la carte l’épicerie qu’elle préfère.`
            : `${recipientFirst} n’utilise pas encore NAVY ay. Appelez cette personne, puis touchez sur la carte l’épicerie qu’elle préfère.`
        }
        onBack={() => go(arrival ? 'route' : 'recipient')}
        help={<p>Les carrés blancs sont les épiceries ouvertes. Le destinataire y retire le colis avec le code que vous lui donnerez. Aucun colis n’est livré à domicile.</p>}
      />
      {grocers.length === 0 ? (
        <NavyNotice>Aucune épicerie partenaire ouverte pour l’instant.</NavyNotice>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto" aria-label="Épiceries ouvertes">
          {[...grocers]
            .sort((a, b) => a.shop_name.localeCompare(b.shop_name))
            .map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  disabled={!g.zone_id}
                  onClick={() => onShopTap(g.id)}
                  aria-pressed={g.id === arrivalId}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-navyay-yellow/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-50"
                >
                  <Store className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{g.shop_name}</span>
                  <span className="text-xs text-navyay-charcoal/75">{g.zone_id ? zoneName(zones, g.zone_id) ?? '' : 'Hors zone'}</span>
                </button>
              </li>
            ))}
        </ul>
      )}
      {grocersFromPhone && !isOnline && <p className="text-xs text-navyay-charcoal/75">Épiceries gardées sur ce téléphone lors de votre dernière connexion.</p>}
    </div>
  );

  const routePanel = arrival && recipient && (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={recipient.name} on={known} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">
            {recipient.name}
            {known && <span className="ml-1.5 rounded-full bg-navyay-yellow px-2 py-0.5 align-middle text-[11px] font-extrabold uppercase tracking-[0.03em]">Sur NAVY</span>}
          </p>
          <p className="truncate text-sm text-navyay-charcoal/75">
            retire chez <strong>{arrival.shop_name}</strong>
            {zoneName(zones, arrival.zone_id) ? `, ${zoneName(zones, arrival.zone_id)}` : ''}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-[26px] font-extrabold leading-none tabular-nums">{km != null ? formatKm(km) : '—'}</p>
          <p className="text-xs text-navyay-charcoal/75">{kmSource === 'route' ? 'par la route' : 'distance estimée'}</p>
        </div>
      </div>
      {errorBox}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Départ du colis">
        <button
          type="button"
          aria-pressed={remise}
          disabled={!omOpen}
          className={`${choiceCls(remise)} flex min-h-[78px] flex-col gap-1`}
          onClick={() => {
            setDeparture('remise');
            setPayment('orange_money');
            if (!start) {
              setToast('Touchez la carte à l’endroit de la remise');
              go('moveStart');
            }
          }}
        >
          <Hand className="h-4 w-4" aria-hidden="true" />
          <b className="text-sm leading-tight">Je le remets au chauffeur</b>
          <small className="text-xs text-navyay-charcoal/75">{omOpen ? 'dans la rue, près de moi · Orange Money' : 'demande Orange Money, pas encore ouvert'}</small>
        </button>
        <button
          type="button"
          aria-pressed={!remise}
          className={`${choiceCls(!remise)} flex min-h-[78px] flex-col gap-1`}
          onClick={() => setDeparture('epicier')}
        >
          <Store className="h-4 w-4" aria-hidden="true" />
          <b className="text-sm leading-tight">Je dépose chez un épicier</b>
          <small className="truncate text-xs text-navyay-charcoal/75">
            {depotCard ? `${depotCard.shop_name}${depotCardWalk != null ? `, ${formatWalk(depotCardWalk)} à pied` : ''}` : 'aucune épicerie ouverte'}
          </small>
        </button>
      </div>
      {quoteLoading && !quote && isOnline && (
        <p className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Recherche des chauffeurs…
        </p>
      )}
      {!isOnline ? (
        <NavyNotice icon={WifiOff}>Hors ligne : les chauffeurs seront cherchés au retour du réseau. Vous pouvez préparer la commande.</NavyNotice>
      ) : cheapest ? (
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl bg-navyay-charcoal/[0.05] px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
          onClick={() => {
            setDriverMode('auto');
            setChosenDriver(null);
            go('what');
          }}
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-navyay-charcoal text-navyay-yellow">
            {cheapest.driver.vehicle_type === 'velo' || cheapest.driver.vehicle_type === 'moto' ? <Bike className="h-5 w-5" aria-hidden="true" /> : <Car className="h-5 w-5" aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block truncate">Le moins cher : {cheapest.driver.name ? firstName(cheapest.driver.name) : 'un chauffeur'}</b>
            <small className="text-xs text-navyay-charcoal/75">
              Automatique : NAVY ay lui propose d’abord votre colis
            </small>
          </span>
          <span className="whitespace-nowrap text-lg font-extrabold tabular-nums">{formatAr(cheapest.total)}</span>
        </button>
      ) : quote ? (
        <div className="space-y-2">
          <p className="text-sm text-navyay-charcoal/80">Aucun chauffeur ne va vers {arrivalZone} pour l’instant. NAVY ay cherchera dès que le colis sera prêt.</p>
          <button
            type="button"
            className={ghostCls}
            onClick={() => {
              setDriverMode('auto');
              setChosenDriver(null);
              go('what');
            }}
          >
            Commander quand même
          </button>
        </div>
      ) : null}
      <p className="flex items-start gap-2 text-[13px] text-navyay-charcoal/75">
        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>Touchez un véhicule pour voir sa fiche. Touchez votre point jaune ou l’épicerie d’arrivée pour les changer.</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-3 text-sm">
        <button
          type="button"
          className={linkCls}
          onClick={() => {
            setDriverMode('prix');
            setChosenDriver(null);
            go('price');
          }}
        >
          Autres façons de commander
        </button>
        {!remise && (
          <button type="button" className={linkCls} onClick={() => go('pickDepot')}>
            Autre épicerie de dépôt
          </button>
        )}
        <button
          type="button"
          className={linkCls}
          onClick={() => {
            resetJourney();
            go('recipient');
          }}
        >
          Changer de destinataire
        </button>
        <span className="ml-auto">
          <HelpToggle>
            <p>Le trait jaune est la route du colis, de votre départ jusqu’à l’épicerie où le destinataire le retirera.</p>
            <p>Chaque chauffeur qui va dans cette direction affiche son prix pour votre colis. Les autres sont grisés.</p>
            <p>« Le moins cher » : NAVY ay propose le colis au chauffeur le moins cher. Touchez un véhicule pour choisir vous-même.</p>
          </HelpToggle>
        </span>
      </div>
    </div>
  );

  const vehiclePanel = selectedDriver && (() => {
    const p = pricedById.get(selectedDriver.partner_id);
    const vt = selectedDriver.vehicle_type ? VEHICLE_LABELS[selectedDriver.vehicle_type as VehicleType] ?? selectedDriver.vehicle_type : 'Véhicule';
    const dn = selectedDriver.first_name ?? 'Ce chauffeur';
    const ceilingTotal = quote?.breakdown.total ?? null;
    const lp = p ? priceBreakdown(depotFee, p.driver.fare, pickupFee, share).lines.filter((l) => !(remise && l.kind === 'depot')) : [];
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {vehicleUrl ? (
            <img src={vehicleUrl} alt={`Véhicule de ${dn}`} className="h-14 w-14 flex-shrink-0 rounded-[14px] bg-navyay-charcoal/5 object-cover" />
          ) : (
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] bg-navyay-charcoal text-navyay-yellow" aria-hidden="true">
              {selectedDriver.vehicle_type === 'velo' || selectedDriver.vehicle_type === 'moto' ? <Bike className="h-7 w-7" /> : <Car className="h-7 w-7" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate">
              <b className="text-[17px]">{dn}</b> <span className="text-sm text-navyay-charcoal/75">· {vt}</span>
            </p>
            <Plate plate={selectedDriver.plate} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-navyay-charcoal/[0.05] px-2.5 py-2">
            <span className="block text-[11px] font-bold uppercase tracking-[0.05em] text-navyay-charcoal/75">Vers</span>
            <b className="block truncate">{zoneName(zones, selectedDriver.dest_zone_id) ?? 'Destination déclarée'}</b>
          </div>
          <div className="rounded-xl bg-navyay-charcoal/[0.05] px-2.5 py-2">
            <span className="block text-[11px] font-bold uppercase tracking-[0.05em] text-navyay-charcoal/75">Votre colis</span>
            <b className="block truncate tabular-nums">{arrival && km != null ? formatKm(km) : '—'}</b>
          </div>
        </div>
        {!arrival ? (
          <>
            <p className="text-sm text-navyay-charcoal/80">Choisissez d’abord un destinataire pour voir le prix de {dn}.</p>
            <button
              type="button"
              className={ctaCls}
              onClick={() => {
                setSelected(null);
                resetJourney();
                go('recipient');
              }}
            >
              <Send className="h-5 w-5" aria-hidden="true" />
              J’envoie un colis à…
            </button>
          </>
        ) : p ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs text-navyay-charcoal/75">Prix pour votre colis</p>
                <p className="text-[30px] font-extrabold leading-none tabular-nums">{formatAr(p.total)}</p>
              </div>
              <div className="flex min-w-[180px] flex-1 flex-col gap-0.5 text-[13px] text-navyay-charcoal/75">
                {lp.map((l) => (
                  <div key={l.kind} className="flex justify-between gap-3 tabular-nums">
                    <span className="truncate">{l.kind === 'transport' ? `${dn} (transport)` : l.kind === 'depot' ? `${depot?.shop_name ?? 'Épicerie'} (dépôt)` : `${arrival.shop_name} (retrait)`}</span>
                    <b className="whitespace-nowrap">{formatAr(l.base + l.navyShare)}</b>
                  </div>
                ))}
              </div>
            </div>
            {ceilingTotal != null && ceilingTotal > p.total && (
              <p className="text-xs text-navyay-charcoal/75">
                Vous payez {formatAr(ceilingTotal)} à la commande ; s’il accepte, les {formatAr(ceilingTotal - p.total)} d’écart deviennent un avoir NAVY pour votre prochain envoi.
              </p>
            )}
            <button
              type="button"
              className={ctaCls}
              disabled={!isOnline}
              onClick={() => {
                setDriverMode('choix');
                setChosenDriver(selectedDriver.partner_id);
                setSelected(null);
                go('what');
              }}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
              Lui proposer mon colis
            </button>
            {!isOnline && <p className="text-xs text-navyay-charcoal/75">Proposer le colis à un chauffeur demande une connexion.</p>}
            <p className="text-xs text-navyay-charcoal/75">Il aura 30 secondes pour accepter. Sans réponse, la course passe au chauffeur suivant, au même prix ou moins cher.</p>
          </>
        ) : (
          <p className="text-sm text-navyay-charcoal/80">
            {dn} ne va pas vers {arrivalZone} en ce moment{quote ? '' : ' (ou son prix n’est pas encore connu)'}.
          </p>
        )}
        <p className="text-xs text-navyay-charcoal/75">
          Position approximative tant qu’il n’a pas accepté : le véhicule est montré là où il va. Le trait pointillé montre son chemin. Son téléphone s’affichera après son acceptation.
        </p>
        <div className="flex items-center justify-between">
          <button type="button" className={linkCls} onClick={closeVehicle}>
            Fermer la fiche
          </button>
          <HelpToggle>
            <p>La fiche montre le véhicule, sa plaque et le prénom du chauffeur, pour le reconnaître. Son téléphone n’apparaît qu’après son acceptation.</p>
            <p>« Lui proposer mon colis » : il a 30 secondes pour accepter, sinon la course passe au suivant.</p>
          </HelpToggle>
        </div>
      </div>
    );
  })();

  const pricePanel = (
    <div className="space-y-3">
      <PanelHead
        title="Je propose mon prix"
        onBack={() => {
          setDriverMode('auto');
          go('route');
        }}
        help={
          <>
            <p>Vous fixez le prix total. La course est proposée en même temps à tous les chauffeurs qui vont dans la bonne direction : le premier qui accepte l’emporte.</p>
            <p>Il ne voit que ce qu’il gagne, jamais le prix total. Si personne n’accepte, NAVY ay vous propose jusqu’à 3 chauffeurs à un autre prix.</p>
          </>
        }
      />
      {errorBox}
      <label className="block text-sm font-bold">
        Prix total que vous proposez
        <div className="relative">
          <input
            className={`${fieldCls} pr-10 text-lg font-extrabold`}
            inputMode="numeric"
            value={proposed}
            onChange={(e) => setProposed(e.target.value)}
            placeholder={String(Math.max(minTotal, 100))}
          />
          <span className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-navyay-charcoal/75" aria-hidden="true">
            Ar
          </span>
        </div>
      </label>
      <p className="text-sm">
        Minimum : <strong className="tabular-nums">{formatAr(minTotal)}</strong> (épiceries + part NAVY ay), par tranches de 100 Ar.
      </p>
      {proposedGain !== null && (
        <p className="text-sm" aria-live="polite">
          Le chauffeur gagnera <strong className="tabular-nums">{formatAr(proposedGain)}</strong>.
          {quote && proposedGain < quote.transport_ceiling && ' C’est moins que le prix habituel : la course peut mettre plus de temps à trouver preneur.'}
        </p>
      )}
      <button
        type="button"
        className={ctaCls}
        onClick={() => {
          const problem = proposedTotalProblem(proposedTotal, minTotal);
          if (problem) return setError(problem);
          go('what');
        }}
      >
        Continuer
      </button>
    </div>
  );

  const whatPanel = (
    <div className="space-y-3">
      <PanelHead
        title="Qu’envoyez-vous ?"
        onBack={() => go(driverMode === 'prix' ? 'price' : 'route')}
        help={
          <>
            <p>En cas de perte, NAVY ay rembourse la valeur déclarée, au plus {formatAr(MAX_DECLARED_VALUE)}. N’envoyez pas d’objet plus cher.</p>
            {remise && <p>Remise dans la rue : prenez une photo du contenu ouvert avant de refermer le colis. Seuls vous, le chauffeur de la course et l’opératrice la voient.</p>}
          </>
        }
      />
      {errorBox}
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Type de contenu">
        {CATEGORIES.map(({ v, label, icon: Icon }) => (
          <button
            key={v}
            type="button"
            aria-pressed={category === v}
            onClick={() => setCategory(v)}
            className={`flex min-h-[66px] flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] px-0.5 py-2 text-[11.5px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
              category === v ? 'border-navyay-yellow bg-navyay-yellow/[0.18]' : 'border-navyay-charcoal/15 bg-white'
            }`}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <label className="block text-sm font-bold">
        Valeur déclarée : <span className="tabular-nums">{formatAr(value)}</span>
        <input
          type="range"
          min={0}
          max={MAX_DECLARED_VALUE}
          step={1000}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="mt-2 block h-11 w-full accent-navyay-yellow"
          aria-valuetext={formatAr(value)}
        />
        <span className="block text-xs font-normal text-navyay-charcoal/75">Remboursement plafonné à {formatAr(MAX_DECLARED_VALUE)}. 0 Ar si le contenu n’a pas de valeur.</span>
      </label>
      {remise && (
        <div className="space-y-2">
          <PhotoField
            label="Photo du contenu ouvert"
            hint="Facultative maintenant, obligatoire avant la remise au chauffeur."
            blob={photo}
            onChange={setPhoto}
          />
          <label className="block text-sm font-bold">
            Votre téléphone (le chauffeur vous appellera)
            <input className={fieldCls} value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="034 12 345 67" />
          </label>
          <label className="block text-sm font-bold">
            Repère (facultatif)
            <input className={fieldCls} value={handNote} onChange={(e) => setHandNote(e.target.value)} maxLength={NOTE_MAX} placeholder="Ex. devant la pharmacie" autoComplete="off" />
          </label>
        </div>
      )}
      <button
        type="button"
        className={ctaCls}
        onClick={() => {
          const problem = checkWhat();
          if (problem) return setError(problem);
          go('pay');
        }}
      >
        Continuer vers le paiement
      </button>
    </div>
  );

  const payPanel = (
    <div className="space-y-3">
      <PanelHead
        title="Paiement"
        onBack={() => go('what')}
        help={
          <>
            <p>Le prix est fixé à la commande et ne change plus, sauf si vous acceptez vous-même un chauffeur plus cher.</p>
            <p>Votre avoir NAVY est déduit tout seul. Orange Money : une opératrice vérifie la référence ; aucun chauffeur n’est appelé avant.</p>
          </>
        }
      />
      {errorBox}
      {quoteLoading && !quote && isOnline && (
        <p className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Calcul du prix…
        </p>
      )}
      {total !== null && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-navyay-charcoal/75">{credit && credit.used > 0 ? 'Reste à payer' : 'Total à payer'}</p>
            <p className="text-[30px] font-extrabold leading-none tabular-nums">{formatAr(toPay)}</p>
          </div>
          <div className="flex min-w-[180px] flex-1 flex-col gap-0.5 text-[13px] text-navyay-charcoal/75">
            {lines.map((l) => (
              <div key={l.kind} className="flex justify-between gap-3 tabular-nums">
                <span className="truncate">{lineLabel(l.kind)}</span>
                <b className="whitespace-nowrap">{formatAr(l.shown)}</b>
              </div>
            ))}
            {credit && credit.used > 0 && (
              <div className="flex justify-between gap-3 tabular-nums">
                <span className="flex items-center gap-1">
                  <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                  Avoir utilisé
                </span>
                <b>−{formatAr(credit.used)}</b>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-navyay-charcoal/75">
        {kmSource === 'route' ? `Distance par la route : ${formatKm(km)}.` : `Distance estimée : ${formatKm(km)} (à vol d’oiseau + ${margin} %).`} La part NAVY ay est comprise dans chaque
        ligne.{!quote && ' Estimation faite sur ce téléphone : le prix exact sera confirmé à l’envoi.'}
        {kmSource === 'route' && ` ${ORS_ATTRIBUTION}`}
      </p>
      {avoirNote && <p className="rounded-xl bg-navyay-yellow/[0.16] px-3 py-2 text-sm">{avoirNote}</p>}
      {toPay === 0 ? (
        <NavyNotice tone="ok" icon={Wallet}>
          Votre avoir NAVY couvre tout le prix : rien à payer.
        </NavyNotice>
      ) : remise ? (
        <p className="text-sm">Remise au chauffeur : paiement par Orange Money uniquement.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Moyen de paiement">
          <button type="button" aria-pressed={payment === 'especes'} className={`${choiceCls(payment === 'especes')} flex min-h-[64px] flex-col gap-0.5`} onClick={() => setPayment('especes')}>
            <Banknote className="h-4 w-4" aria-hidden="true" />
            <b className="text-sm">Espèces</b>
            <small className="text-xs text-navyay-charcoal/75">à {depot?.shop_name ?? 'l’épicier'}, au dépôt</small>
          </button>
          <button
            type="button"
            aria-pressed={payment === 'orange_money'}
            disabled={!!quote && !omNumber}
            className={`${choiceCls(payment === 'orange_money')} flex min-h-[64px] flex-col gap-0.5`}
            onClick={() => setPayment('orange_money')}
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            <b className="text-sm">Orange Money</b>
            <small className="text-xs text-navyay-charcoal/75">{quote && !omNumber ? 'pas encore disponible' : 'référence ensuite'}</small>
          </button>
        </div>
      )}
      {toPay !== 0 && (remise || payment === 'orange_money') && omNumber && (
        <div className="space-y-2 rounded-2xl bg-navyay-charcoal/[0.05] p-3">
          <p className="text-xs text-navyay-charcoal/75">Envoyez {formatAr(toPay)} par Orange Money au numéro de CyberKELY</p>
          <div className="flex items-center justify-between gap-2">
            <b className="text-lg tabular-nums">{omNumber}</b>
            <button type="button" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-[1.5px] border-navyay-charcoal/15 bg-white px-3 text-sm font-bold" onClick={() => void copyOm()}>
              {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
          <input
            className={fieldCls}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Référence reçue par SMS (ou plus tard)"
            aria-label="Référence du transfert Orange Money"
            autoComplete="off"
          />
        </div>
      )}
      {!remise && payment === 'especes' && toPay !== 0 && (
        <p className="text-sm">Vous payez {formatAr(toPay)} en espèces en déposant le colis chez {depot?.shop_name}. L’épicier confirme « encaissé ».</p>
      )}
      <NavyNotifyPrompt why="Recevez une notification à chaque étape de votre colis." />
      <button type="button" className={ctaCls} disabled={sending || (isOnline && !quote)} onClick={() => void submit()}>
        {sending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <HandCoins className="h-5 w-5" aria-hidden="true" />}
        {!remise && payment === 'especes' && toPay !== 0 ? 'Commander, je paie au dépôt' : 'Commander'}
      </button>
    </div>
  );

  const pickDepotPanel = (
    <div className="space-y-3">
      <PanelHead
        title="Où déposez-vous le colis ?"
        sub="Touchez une épicerie sur la carte."
        onBack={() => go('route')}
        help={<p>L’épicier referme le colis devant vous, encaisse si vous payez en espèces, puis le remet au chauffeur. La plus proche de vous est en haut de la liste.</p>}
      />
      <ul className="max-h-40 space-y-1 overflow-y-auto" aria-label="Épiceries de dépôt">
        {grocers
          .filter((g) => g.id !== arrivalId)
          .map((g) => ({ g, m: start ? metres(start, g) : null }))
          .sort((a, b) => (a.m ?? 0) - (b.m ?? 0))
          .map(({ g, m }) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => onShopTap(g.id)}
                aria-pressed={depot?.id === g.id}
                className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-navyay-yellow/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
              >
                <Store className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate font-semibold">{g.shop_name}</span>
                {m != null && <span className="text-xs tabular-nums text-navyay-charcoal/75">{formatWalk(m)}</span>}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );

  const moveStartPanel = (
    <div className="space-y-3">
      <PanelHead
        title="Placez votre départ"
        sub="Touchez la carte à l’endroit où vous remettrez le colis (ou d’où vous partez vers l’épicier)."
        onBack={() => go(arrival ? 'route' : 'home')}
        help={<p>Votre position n’est lue qu’une fois, à l’ouverture. Touchez la carte pour indiquer un autre endroit : pour une remise dans la rue, le chauffeur viendra là.</p>}
      />
      {!gps && gpsDone && <p className="text-sm text-navyay-charcoal/75">Votre position n’a pas pu être lue : la carte est centrée sur Hell-Ville.</p>}
    </div>
  );

  const content: Record<Panel, ReactNode> = {
    home: homePanel,
    recipient: recipientPanel,
    pickGrocer: pickGrocerPanel,
    route: routePanel || homePanel,
    pickDepot: pickDepotPanel,
    moveStart: moveStartPanel,
    vehicle: vehiclePanel || homePanel,
    price: pricePanel,
    what: whatPanel,
    pay: payPanel,
  };

  return (
    <MapStage
      map={
        <NavyMap
          ariaLabel="Carte de Nosy Be"
          frame="full"
          zones={panel === 'pickGrocer' || panel === 'pickDepot' ? zones : []}
          initialView={{ ...startOrCentre, zoom: HOME_ZOOM }}
          me={start ? { lat: start.lat, lng: start.lng } : null}
          onMeTap={() => {
            if (panel === 'route') {
              setToast('Touchez la carte pour placer le point de départ');
              go('moveStart');
            }
          }}
          shops={shops}
          onShopTap={onShopTap}
          shopNames={panel === 'pickGrocer' || panel === 'pickDepot' ? 'always' : 'zoom'}
          vehicles={vehicles}
          onVehicleTap={onVehicleTap}
          route={inJourney ? routeLine : null}
          trail={panel === 'vehicle' ? trail : null}
          walk={walk}
          onMapTap={onMapTap}
          onReady={(api) => {
            apiRef.current = api;
          }}
        />
      }
    >
      <LivePill>{pill}</LivePill>
      <MapToast text={toast} onDone={clearToast} />
      <MapButtons
        bottom={sheetH + 24}
        onZoom={(d) => apiRef.current?.zoomBy(d)}
        onRecenter={() => (panel === 'route' || panel === 'what' || panel === 'pay' ? fitJourney() : apiRef.current?.easeTo(startOrCentre.lat, startOrCentre.lng, HOME_ZOOM))}
      />
      <MapSheet panelKey={panel === 'vehicle' ? `vehicle:${selected}` : panel} onHeight={setSheetH} tall={panel === 'pay' || panel === 'what'}>
        {content[panel]}
      </MapSheet>
    </MapStage>
  );
}
