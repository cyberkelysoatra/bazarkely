/**
 * Grocer — "Colis" (phase 2A). Three lists: to receive at the depot, to hand to the
 * driver, arrived (and on their way) to be collected. Search by parcel code.
 * Gestures: deposit (closed in front of me, cash collected), hand-over to the expected
 * driver (chosen in the list or his NAVY QR scanned), reception (parcel code),
 * withdrawal (code given by the recipient, checked by the SERVER, network required).
 * The grocer never sees the withdrawal code nor the total paid by the client (except
 * the cash he must collect); each line shows what he earns.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Package,
  PackageCheck,
  Phone,
  ScanLine,
  Search,
  Smartphone,
  Store,
  Truck,
  WifiOff,
} from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { navyDb } from '../../db/navyDb';
import type { NavyParcelLocal } from '../../db/navyDb';
import { useNavyProfile } from '../../services/navyProfileStore';
import { cashDue, doGesture, myPriceLines, refreshParcels, useParcels, withdrawParcel } from '../../services/parcelService';
import type { NavyPriceLine } from '../../types/parcel';
import { VEHICLE_LABELS } from '../../utils/partnerRules';
import type { VehicleType } from '../../types/partner';
import { CATEGORY_LABELS, parcelErrorMessage } from '../../utils/parcelRules';
import { NavyNotifyPrompt, NavyQrScanner, ParcelCode, ParcelStatusBadge, partnerIdFromQr } from './ParcelUi';
import { btnAccent, btnPrimary, btnSecondary, formatAr, inputCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

type Money = { lines: Record<string, NavyPriceLine[]>; cash: Record<string, number> };

export default function GrocerParcelsPage() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const profile = useNavyProfile();
  const parcels = useParcels();
  const shop = profile.partners.find((p) => p.kind === 'epicier' && p.status === 'approved');
  const [q, setQ] = useState('');
  const [money, setMoney] = useState<Money>({ lines: {}, cash: {} });
  const moneyKey = `${userId}:grocerMoney`;

  useEffect(() => {
    if (!userId) return;
    void navyDb.kv.get(moneyKey).then((kv) => kv?.value && setMoney(kv.value as Money));
    if (!isOnline) return;
    void refreshParcels(userId);
    const t = window.setInterval(() => void refreshParcels(userId), 15000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isOnline]);

  const mine = useMemo(
    () =>
      shop && parcels.userId === userId
        ? parcels.rows.filter((p) => p.depot_partner_id === shop.id || p.arrival_partner_id === shop.id)
        : [],
    [parcels, shop, userId]
  );

  // What the grocer earns (own price lines) and cash to collect, refreshed online.
  const ids = mine.map((p) => p.id).join(',');
  useEffect(() => {
    if (!isOnline || !ids) return;
    const list = ids.split(',');
    Promise.all([myPriceLines(list), cashDue(list.filter((id) => mine.find((p) => p.id === id)?.status === 'commande'))])
      .then(([lines, cash]) => {
        const byParcel: Record<string, NavyPriceLine[]> = {};
        for (const l of lines) (byParcel[l.parcel_id] ??= []).push(l);
        const next = { lines: byParcel, cash };
        setMoney(next);
        void navyDb.kv.put({ key: moneyKey, value: next });
      })
      .catch(() => {
        /* keeps the copy on the phone */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, isOnline]);

  if (!userId || !shop) return null; // guarded by NavyRoleRoute

  const match = (p: NavyParcelLocal) => !q.trim() || p.code.includes(q.trim());
  const atDepot = mine.filter((p) => p.depot_partner_id === shop.id && p.status === 'commande' && match(p));
  const toDriver = mine.filter((p) => p.depot_partner_id === shop.id && (p.status === 'depose' || p.status === 'chauffeur_trouve') && match(p));
  const arriving = mine.filter((p) => p.arrival_partner_id === shop.id && (p.status === 'pris_en_charge' || p.status === 'arrive') && match(p));

  return (
    <NavyPage>
      <NavyPageTitle icon={Package} title="Colis" subtitle={shop.shop_name ?? undefined} />
      {!isOnline && <NavyNotice icon={WifiOff}>Hors ligne : les listes sont celles gardées sur ce téléphone. Dépôts, remises et réceptions partiront au retour du réseau ; le retrait demande le réseau.</NavyNotice>}
      <NavyNotifyPrompt why="Activez les notifications pour être prévenu quand un client arrive avec un colis ou qu’un chauffeur vient le chercher." />

      <label className="relative block">
        <span className="sr-only">Rechercher par code colis</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navyay-charcoal/70" aria-hidden="true" />
        <input
          className={`${inputCls} mt-0 pl-10 font-mono tracking-widest`}
          inputMode="numeric"
          maxLength={4}
          value={q}
          onChange={(e) => setQ(e.target.value.replace(/\D/g, ''))}
          placeholder="Code colis (4 chiffres)"
        />
      </label>

      {parcels.userId !== userId || !parcels.loaded ? (
        <NavyLoader />
      ) : (
        <>
          <Section title="À recevoir au dépôt" icon={Store} empty="Aucun client attendu pour un dépôt.">
            {atDepot.map((p) => (
              <DepotCard key={p.id} p={p} userId={userId} lines={money.lines[p.id]} cash={money.cash[p.id]} queued={parcels.queue.some((x) => x.op.parcelId === p.id)} />
            ))}
          </Section>
          <Section title="À remettre au chauffeur" icon={Truck} empty="Aucun colis en attente de chauffeur.">
            {toDriver.map((p) => (
              <HandoverCard key={p.id} p={p} userId={userId} lines={money.lines[p.id]} queued={parcels.queue.some((x) => x.op.parcelId === p.id)} />
            ))}
          </Section>
          <Section title="Arrivés, à retirer" icon={PackageCheck} empty="Aucun colis arrivé pour l’instant.">
            {arriving.map((p) => (
              <ArrivalCard key={p.id} p={p} userId={userId} lines={money.lines[p.id]} isOnline={isOnline} queued={parcels.queue.some((x) => x.op.parcelId === p.id)} />
            ))}
          </Section>
        </>
      )}

      <NavyHelp title="Comment traiter un colis ?">
        <p><strong>Dépôt</strong> : trouvez le colis par le code écrit dessus, faites-le refermer devant vous, encaissez les espèces si le client paie ainsi.</p>
        <p><strong>Remise</strong> : quand le chauffeur arrive, vérifiez que c’est lui (nom, plaque) ou scannez son QR NAVY, puis confirmez. Il confirme à son tour dans son application.</p>
        <p><strong>Arrivée</strong> : saisissez le code écrit sur le colis. <strong>Retrait</strong> : saisissez le code secret que le destinataire vous donne. Après 5 codes faux, le colis est bloqué et l’opératrice est prévenue.</p>
      </NavyHelp>
    </NavyPage>
  );
}

function Section({ title, icon: Icon, empty, children }: { title: string; icon: typeof Store; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 font-semibold">
        <Icon className="w-5 h-5" aria-hidden="true" />
        {title}
        {children.length > 0 && <span className="rounded-full bg-navyay-yellow px-2 text-sm tabular-nums">{children.length}</span>}
      </h3>
      {children.length ? <div className="space-y-2">{children}</div> : <p className="rounded-2xl border border-dashed border-navyay-charcoal/20 px-4 py-3 text-sm text-navyay-charcoal/75">{empty}</p>}
    </section>
  );
}

/** "Vous gagnez 100 Ar · votre tarif 100 Ar + part NAVY 14 Ar". */
function Earnings({ lines }: { lines?: NavyPriceLine[] }) {
  if (!lines?.length) return null;
  const base = lines.reduce((s, l) => s + l.base_amount, 0);
  const share = lines.reduce((s, l) => s + l.navy_share, 0);
  return (
    <p className="text-sm">
      Vous gagnez <strong className="tabular-nums">{formatAr(base)}</strong>
      <span className="text-navyay-charcoal/75"> · votre tarif {formatAr(base)} + part NAVY {formatAr(share)}</span>
    </p>
  );
}

function CardHead({ p }: { p: NavyParcelLocal }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <ParcelCode code={p.code} />
        <p className="text-sm text-navyay-charcoal/80 truncate">
          {CATEGORY_LABELS[p.category]} · {p.depot_name} → {p.arrival_name}
        </p>
      </div>
      <ParcelStatusBadge status={p.status} />
    </div>
  );
}

function useGesture(userId: string) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const act = useCallback(
    async (op: Parameters<typeof doGesture>[1], ok: string) => {
      setBusy(true);
      setMsg(null);
      try {
        const res = await doGesture(userId, op);
        if (res.status === 'error') setMsg({ tone: 'error', text: parcelErrorMessage(res.error) });
        else if (res.status === 'queued') setMsg({ tone: 'info', text: 'Gardé sur ce téléphone, envoyé au retour du réseau.' });
        else {
          setMsg({ tone: 'ok', text: ok });
          void refreshParcels(userId);
        }
      } finally {
        setBusy(false);
      }
    },
    [userId]
  );
  return { busy, msg, act, setMsg };
}

function DepotCard({ p, userId, lines, cash, queued }: { p: NavyParcelLocal; userId: string; lines?: NavyPriceLine[]; cash?: number; queued: boolean }) {
  const [sealed, setSealed] = useState(false);
  const [collected, setCollected] = useState(false);
  const { busy, msg, act, setMsg } = useGesture(userId);
  const isCash = p.payment_method === 'especes';
  const submit = () => {
    if (!sealed) return setMsg({ tone: 'error', text: 'Cochez « Colis refermé devant moi ».' });
    if (isCash && !collected) return setMsg({ tone: 'error', text: 'Confirmez que les espèces sont encaissées.' });
    void act({ kind: 'deposit', parcelId: p.id, cash: isCash }, 'Colis déposé. NAVY ay cherche un chauffeur.');
  };
  return (
    <NavyCard className="p-4 space-y-3">
      <CardHead p={p} />
      <Earnings lines={lines} />
      <p className="text-sm">Client : {p.sender_name ?? '—'} · pour {p.recipient_name}</p>
      {queued ? (
        <NavyNotice icon={Smartphone}>Dépôt gardé sur ce téléphone, envoyé au retour du réseau.</NavyNotice>
      ) : (
        <>
          <label className="flex items-center gap-3 rounded-xl border border-navyay-charcoal/15 px-3 py-3">
            <input type="checkbox" className="w-5 h-5 accent-[#2E2E2E]" checked={sealed} onChange={(e) => setSealed(e.target.checked)} />
            <span className="font-medium">Colis refermé devant moi</span>
          </label>
          {isCash ? (
            <label className="flex items-center gap-3 rounded-xl border border-navyay-charcoal/15 px-3 py-3">
              <input type="checkbox" className="w-5 h-5 accent-[#2E2E2E]" checked={collected} onChange={(e) => setCollected(e.target.checked)} />
              <Banknote className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span className="font-medium">
                Espèces encaissées{cash != null ? <> : <span className="tabular-nums">{formatAr(cash)}</span></> : ''}
              </span>
            </label>
          ) : (
            <p className="text-sm text-navyay-charcoal/80">Payé par Orange Money : rien à encaisser.</p>
          )}
          <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={submit}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
            Confirmer le dépôt
          </button>
        </>
      )}
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
    </NavyCard>
  );
}

function HandoverCard({ p, userId, lines, queued }: { p: NavyParcelLocal; userId: string; lines?: NavyPriceLine[]; queued: boolean }) {
  const [scan, setScan] = useState(false);
  const { busy, msg, act, setMsg } = useGesture(userId);
  const handTo = (driverPartnerId: string) =>
    act({ kind: 'handover_grocer', parcelId: p.id, driverPartnerId }, 'Remis. Le chauffeur doit confirmer dans son application.');
  return (
    <NavyCard className="p-4 space-y-3">
      <CardHead p={p} />
      <Earnings lines={lines} />
      {p.status === 'depose' ? (
        <p className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" aria-hidden="true" />
          {p.payment_status === 'paye' ? 'NAVY ay cherche un chauffeur. Gardez le colis.' : 'Paiement Orange Money en cours de vérification. Gardez le colis.'}
        </p>
      ) : p.handover_grocer_at ? (
        <NavyNotice icon={Clock}>Remis au chauffeur. En attente de sa confirmation.</NavyNotice>
      ) : queued ? (
        <NavyNotice icon={Smartphone}>Remise gardée sur ce téléphone, envoyée au retour du réseau.</NavyNotice>
      ) : (
        <>
          <div className="rounded-xl bg-navyay-charcoal/[0.05] px-3 py-3">
            <p className="text-sm text-navyay-charcoal/75">Chauffeur attendu</p>
            <p className="font-semibold">{p.driver_name ?? 'Chauffeur'}</p>
            <p className="text-sm">
              {p.driver_vehicle ? VEHICLE_LABELS[p.driver_vehicle as VehicleType] ?? p.driver_vehicle : ''} · plaque <strong>{p.driver_plate ?? '—'}</strong>
            </p>
            {p.driver_phone && (
              <a href={`tel:${p.driver_phone.replace(/\s/g, '')}`} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold underline">
                <Phone className="w-4 h-4" aria-hidden="true" />
                Appeler le chauffeur
              </a>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className={btnAccent} disabled={busy} onClick={() => p.driver_partner_id && void handTo(p.driver_partner_id)}>
              {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
              C’est lui, je remets le colis
            </button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => setScan(true)}>
              <ScanLine className="w-5 h-5" aria-hidden="true" />
              Scanner son QR
            </button>
          </div>
        </>
      )}
      {scan && (
        <NavyQrScanner
          hint="Visez le QR NAVY du chauffeur (sur son téléphone ou sa carte)."
          onClose={() => setScan(false)}
          onResult={(text) => {
            setScan(false);
            const id = partnerIdFromQr(text);
            if (!id) return setMsg({ tone: 'error', text: 'Ce QR n’est pas un QR de chauffeur NAVY.' });
            if (id !== p.driver_partner_id) return setMsg({ tone: 'error', text: 'Ce n’est pas le chauffeur attendu pour ce colis.' });
            void handTo(id);
          }}
        />
      )}
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
    </NavyCard>
  );
}

function ArrivalCard({ p, userId, lines, isOnline, queued }: { p: NavyParcelLocal; userId: string; lines?: NavyPriceLine[]; isOnline: boolean; queued: boolean }) {
  const [code, setCode] = useState('');
  const [wcode, setWcode] = useState('');
  const { busy, msg, act, setMsg } = useGesture(userId);
  const [wBusy, setWBusy] = useState(false);

  const receive = () => {
    if (!/^\d{4}$/.test(code)) return setMsg({ tone: 'error', text: 'Saisissez les 4 chiffres écrits sur le colis.' });
    void act({ kind: 'receive', parcelId: p.id, code }, 'Colis réceptionné. Le destinataire est prévenu.');
  };
  const withdraw = async () => {
    if (!/^\d{6}$/.test(wcode)) return setMsg({ tone: 'error', text: 'Le code de retrait a 6 chiffres.' });
    setWBusy(true);
    setMsg(null);
    try {
      const r = await withdrawParcel(p.id, wcode);
      if (r.ok) {
        setMsg({ tone: 'ok', text: 'Code correct : remettez le colis au destinataire.' });
        setWcode('');
        void refreshParcels(userId);
      } else if (r.blocked) {
        setMsg({ tone: 'error', text: 'Trop d’essais faux : le retrait est bloqué. L’opératrice est prévenue, elle vous appellera.' });
        void refreshParcels(userId);
      } else {
        setMsg({ tone: 'error', text: `Code faux. Encore ${r.remaining} essai${(r.remaining ?? 0) > 1 ? 's' : ''}.` });
      }
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setWBusy(false);
    }
  };

  return (
    <NavyCard className="p-4 space-y-3">
      <CardHead p={p} />
      <Earnings lines={lines} />
      <p className="text-sm">Pour <strong>{p.recipient_name}</strong> · {p.recipient_phone}</p>
      {p.status === 'pris_en_charge' ? (
        queued ? (
          <NavyNotice icon={Smartphone}>Réception gardée sur ce téléphone, envoyée au retour du réseau.</NavyNotice>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">Le chauffeur {p.driver_name ?? ''} l’apporte. À son arrivée, saisissez le code écrit sur le colis.</p>
            <div className="flex gap-2">
              <input className={`${inputCls} mt-0 font-mono tracking-widest`} inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="Code colis" aria-label="Code écrit sur le colis" />
              <button type="button" className={btnPrimary} disabled={busy} onClick={receive}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <PackageCheck className="w-4 h-4" aria-hidden="true" />}
                Reçu
              </button>
            </div>
          </div>
        )
      ) : p.withdraw_blocked_at ? (
        <NavyNotice tone="error">Retrait bloqué après 5 codes faux. L’opératrice doit le débloquer.</NavyNotice>
      ) : !isOnline ? (
        <NavyNotice icon={WifiOff}>La vérification du code de retrait demande le réseau.</NavyNotice>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">Demandez au destinataire son code de retrait (6 chiffres).</p>
          <div className="flex gap-2">
            <input className={`${inputCls} mt-0 font-mono tracking-widest`} inputMode="numeric" maxLength={6} autoComplete="off" value={wcode} onChange={(e) => setWcode(e.target.value.replace(/\D/g, ''))} placeholder="Code de retrait" aria-label="Code de retrait donné par le destinataire" />
            <button type="button" className={btnAccent} disabled={wBusy} onClick={() => void withdraw()}>
              {wBusy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <KeyRound className="w-4 h-4" aria-hidden="true" />}
              Vérifier
            </button>
          </div>
          {p.withdraw_attempts > 0 && <p className="text-xs text-navyay-charcoal/75">{p.withdraw_attempts} essai(s) faux sur 5.</p>}
        </div>
      )}
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
    </NavyCard>
  );
}
