/**
 * NAVY ay — parcels (phase 2A), offline-first.
 *
 * Reads: the parcels the account may see (RLS: sender, linked recipient, grocers,
 * driver, operators) are kept on the phone (NavyAyDB.parcels) and refreshed from
 * Supabase in the background. After each COMPLETE refresh, a local row the server did
 * not return is removed (server-side deletion reconciled, protections: a gesture still
 * queued keeps its row, an incomplete answer compares nothing).
 *
 * Writes: EVERY state change is a navy_* SECURITY DEFINER function; the app never
 * writes a status nor a price. Gestures made without network (order, Orange Money
 * reference, deposit, hand-over, reception) are kept in NavyAyDB.parcelQueue and
 * replayed with the SAME ids (the server functions are idempotent). High-stake gestures
 * (accepting an offer, typing the withdrawal code) require the network.
 * A timeout is NOT a failure: the gesture stays queued.
 * Never uses supabase.auth.getUser() (network call, fails offline).
 */
import { useSyncExternalStore } from 'react';
import { supabase, withTimeout } from '../../../lib/supabase';
import { navyDb, type NavyParcelLocal } from '../db/navyDb';
import type {
  NavyOpenGrocer,
  NavyParcelEvent,
  NavyParcelOffer,
  NavyParcelPayment,
  NavyParcelPrices,
  NavyParcelRow,
  NavyPriceLine,
  NavyQuote,
  NavyQuoteDriver,
  ParcelCodes,
  ParcelOrderInput,
  ParcelQueueEntry,
  ParcelQueuedOp,
} from '../types/parcel';
import { isNetworkError } from '../utils/parcelRules';

const db = supabase as any;
const PAGE = 1000;
const GROCERS_KEY = 'openGrocers';

function online() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

async function run<T>(p: Promise<any>, label: string, ms = 8000): Promise<T> {
  const { data, error } = (await withTimeout(p, ms, label)) as any;
  if (error) throw error;
  return data as T;
}

// ------------------------------------------------------------------ reactive store

interface ParcelState {
  userId: string | null;
  loaded: boolean;
  refreshing: boolean;
  /** Last complete server answer (ms). */
  refreshedAt: number | null;
  rows: NavyParcelLocal[];
  queue: ParcelQueueEntry[];
  codes: Record<string, ParcelCodes>;
  /** Live offers addressed to the signed-in driver (badge). */
  liveOffers: number;
}

let state: ParcelState = { userId: null, loaded: false, refreshing: false, refreshedAt: null, rows: [], queue: [], codes: {}, liveOffers: 0 };
const listeners = new Set<() => void>();

function set(next: Partial<ParcelState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useParcels(): ParcelState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state
  );
}

async function reloadLocal(userId: string) {
  const [rows, queue, codes] = await Promise.all([
    navyDb.parcels.where('ownerUserId').equals(userId).toArray(),
    navyDb.parcelQueue.where('userId').equals(userId).toArray(),
    navyDb.parcelCodes.where('userId').equals(userId).toArray(),
  ]);
  rows.sort((a, b) => b.ordered_at.localeCompare(a.ordered_at));
  queue.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (state.userId !== userId) return;
  set({
    rows,
    queue,
    codes: Object.fromEntries(codes.map((c) => [c.parcelId, { parcelId: c.parcelId, code: c.code, withdrawCode: c.withdrawCode }])),
    loaded: true,
  });
}

/** Phone copy for this account (instant, offline). */
export async function loadParcels(userId: string): Promise<void> {
  if (state.userId !== userId) set({ userId, loaded: false, rows: [], queue: [], codes: {}, refreshedAt: null, liveOffers: 0 });
  try {
    await reloadLocal(userId);
  } catch (err) {
    console.warn('⚠️ [navy] parcels unreadable on this phone:', err);
    set({ loaded: true });
  }
}

// ------------------------------------------------------------------ server refresh

let refreshInFlight: Promise<void> | null = null;

/**
 * Background refresh (paged, complete or nothing), then reconciliation of server-side
 * deletions. Replays the queue first.
 */
export function refreshParcels(userId: string): Promise<void> {
  if (!userId || !online()) return Promise.resolve();
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    set({ refreshing: true });
    try {
      await flushParcelQueue(userId);
      const rows: NavyParcelRow[] = [];
      let complete = false;
      for (let page = 0; page < 20; page++) {
        const data = await run<NavyParcelRow[]>(
          db.from('navy_parcels').select('*').order('ordered_at', { ascending: false }).order('id').range(page * PAGE, page * PAGE + PAGE - 1),
          'navy-parcels',
          10000
        );
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) {
          complete = true;
          break;
        }
      }
      // Codes of the account's own orders (sender / linked recipient only, RLS).
      let secrets: { parcel_id: string; withdraw_code: string }[] = [];
      try {
        secrets = await run(db.from('navy_parcel_secrets').select('parcel_id, withdraw_code'), 'navy-parcel-secrets', 8000);
      } catch {
        /* kept from the previous refresh */
      }

      const queued = new Set((await navyDb.parcelQueue.where('userId').equals(userId).toArray()).map((q) => q.op.parcelId));
      const serverIds = new Set(rows.map((r) => r.id));
      await navyDb.transaction('rw', navyDb.parcels, navyDb.parcelCodes, async () => {
        await navyDb.parcels.bulkPut(rows.map((r) => ({ ...r, ownerUserId: userId })));
        if (complete) {
          // Reconciliation: absent from a complete answer = deleted on the server,
          // unless a gesture about it is still waiting to go up.
          const local = await navyDb.parcels.where('ownerUserId').equals(userId).toArray();
          const gone = local.filter((l) => !serverIds.has(l.id) && !queued.has(l.id));
          if (gone.length) {
            console.info(`🧹 [navy] ${gone.length} parcel(s) removed on the server, removed from this phone`);
            await navyDb.parcels.bulkDelete(gone.map((g) => [userId, g.id] as [string, string]));
            await navyDb.parcelCodes.bulkDelete(gone.map((g) => g.id));
          }
        }
        for (const s of secrets) {
          const row = rows.find((r) => r.id === s.parcel_id);
          if (row) await navyDb.parcelCodes.put({ parcelId: row.id, code: row.code, withdrawCode: s.withdraw_code, userId });
        }
      });
      await reloadLocal(userId);
      if (complete) set({ refreshedAt: Date.now() });
    } catch (err) {
      console.warn('⚠️ [navy] parcels refresh deferred:', err instanceof Error ? err.message : err);
    } finally {
      set({ refreshing: false });
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ------------------------------------------------------------------ queue (offline gestures)

function queueKey(op: ParcelQueuedOp): string {
  return op.kind === 'payment_ref' ? `${op.kind}:${op.paymentId}` : `${op.kind}:${op.parcelId}`;
}

async function enqueue(userId: string, op: ParcelQueuedOp): Promise<ParcelQueueEntry> {
  const entry: ParcelQueueEntry = { id: queueKey(op), userId, op, createdAt: new Date().toISOString(), lastError: null };
  await navyDb.parcelQueue.put(entry);
  await reloadLocal(userId);
  return entry;
}

async function sendOp(op: ParcelQueuedOp): Promise<any> {
  switch (op.kind) {
    case 'create': {
      const i = op.input;
      return run(
        db.rpc('navy_create_parcel', {
          p_id: op.parcelId,
          p_depot: i.depotId,
          p_arrival: i.arrivalId,
          p_recipient_name: i.recipientName,
          p_recipient_phone: i.recipientPhone,
          p_category: i.category,
          p_declared_value: i.declaredValue,
          p_driver_mode: i.driverMode,
          p_chosen_driver: i.driverMode === 'choix' ? i.chosenDriverId : null,
          p_payment_method: i.paymentMethod,
        }),
        'navy-create-parcel',
        12000
      );
    }
    case 'payment_ref':
      return run(db.rpc('navy_submit_payment_reference', { p_id: op.paymentId, p_parcel_id: op.parcelId, p_reference: op.reference }), 'navy-payment-ref');
    case 'deposit':
      return run(db.rpc('navy_deposit_parcel', { p_parcel_id: op.parcelId, p_sealed: true, p_cash_collected: op.cash }), 'navy-deposit');
    case 'handover_grocer':
      return run(db.rpc('navy_handover_grocer', { p_parcel_id: op.parcelId, p_driver_partner_id: op.driverPartnerId }), 'navy-handover-grocer');
    case 'handover_driver':
      return run(db.rpc('navy_handover_driver', { p_parcel_id: op.parcelId }), 'navy-handover-driver');
    case 'receive':
      return run(db.rpc('navy_receive_parcel', { p_parcel_id: op.parcelId, p_code: op.code }), 'navy-receive');
  }
}

async function afterSuccess(userId: string, op: ParcelQueuedOp, data: any) {
  if (op.kind === 'create' && data?.code) {
    await navyDb.parcelCodes.put({ parcelId: op.parcelId, code: data.code, withdrawCode: data.withdraw_code, userId });
  } else if (data && typeof data === 'object' && 'status' in data && 'code' in data) {
    await navyDb.parcels.put({ ...(data as NavyParcelRow), ownerUserId: userId });
  }
}

export type GestureResult = { status: 'sent'; data: any } | { status: 'queued' } | { status: 'error'; error: unknown };

/** Keep the gesture, then try at once. Network trouble → stays queued (same ids). */
export async function doGesture(userId: string, op: ParcelQueuedOp): Promise<GestureResult> {
  const entry = await enqueue(userId, op);
  if (!online()) return { status: 'queued' };
  try {
    const data = await sendOp(op);
    await navyDb.parcelQueue.delete(entry.id);
    await afterSuccess(userId, op, data);
    await reloadLocal(userId);
    return { status: 'sent', data };
  } catch (err) {
    if (isNetworkError(err)) return { status: 'queued' };
    // Refused by the server: nothing to replay.
    await navyDb.parcelQueue.delete(entry.id);
    await reloadLocal(userId);
    return { status: 'error', error: err };
  }
}

let flushing: Promise<void> | null = null;

/** Replay the queued gestures in order (on start, when back online, before a refresh). */
export function flushParcelQueue(userId: string): Promise<void> {
  if (!userId || !online()) return Promise.resolve();
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      const entries = (await navyDb.parcelQueue.where('userId').equals(userId).toArray()).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      );
      for (const e of entries) {
        if (e.lastError) continue; // refused for good: shown to the person, never replayed blindly
        try {
          const data = await sendOp(e.op);
          await navyDb.parcelQueue.delete(e.id);
          await afterSuccess(userId, e.op, data);
        } catch (err) {
          if (isNetworkError(err)) break; // still no network: keep the rest in order
          await navyDb.parcelQueue.update(e.id, { lastError: err instanceof Error ? err.message : String((err as any)?.message ?? err) });
        }
      }
    } finally {
      await reloadLocal(userId);
      flushing = null;
    }
  })();
  return flushing;
}

export async function discardQueued(userId: string, id: string): Promise<void> {
  await navyDb.parcelQueue.delete(id);
  await reloadLocal(userId);
}

// ------------------------------------------------------------------ order

/** New order: one id created on the phone, reused at every attempt. */
export async function placeOrder(userId: string, input: ParcelOrderInput): Promise<{ parcelId: string; result: GestureResult }> {
  const parcelId = crypto.randomUUID();
  const result = await doGesture(userId, { kind: 'create', parcelId, input });
  if (result.status === 'sent') void refreshParcels(userId);
  return { parcelId, result };
}

/** Open grocers (server), kept on the phone for an order prepared offline. */
export async function loadOpenGrocers(): Promise<{ list: NavyOpenGrocer[]; fromPhone: boolean }> {
  if (online()) {
    try {
      const list = await run<NavyOpenGrocer[]>(db.rpc('navy_open_grocers'), 'navy-open-grocers');
      await navyDb.kv.put({ key: GROCERS_KEY, value: list });
      return { list, fromPhone: false };
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }
  const kv = await navyDb.kv.get(GROCERS_KEY);
  return { list: (kv?.value as NavyOpenGrocer[] | undefined) ?? [], fromPhone: true };
}

export function getQuote(depotId: string, arrivalId: string): Promise<NavyQuote> {
  return run<NavyQuote>(db.rpc('navy_quote', { p_depot: depotId, p_arrival: arrivalId }), 'navy-quote');
}

// ------------------------------------------------------------------ detail

export interface ParcelDetail {
  parcel: NavyParcelRow;
  events: NavyParcelEvent[];
  prices: NavyParcelPrices | null;
  lines: NavyPriceLine[];
  withdrawCode: string | null;
  payments: NavyParcelPayment[];
}

export async function getParcelDetail(id: string): Promise<ParcelDetail | null> {
  const [parcel, events, prices, lines, secret, payments] = await Promise.all([
    run<NavyParcelRow | null>(db.from('navy_parcels').select('*').eq('id', id).maybeSingle(), 'navy-parcel'),
    run<NavyParcelEvent[]>(db.from('navy_parcel_events').select('*').eq('parcel_id', id).order('at').order('id'), 'navy-parcel-events'),
    run<NavyParcelPrices | null>(db.from('navy_parcel_prices').select('*').eq('parcel_id', id).maybeSingle(), 'navy-parcel-prices'),
    run<NavyPriceLine[]>(db.from('navy_parcel_price_lines').select('*').eq('parcel_id', id).order('seq'), 'navy-parcel-lines'),
    run<{ withdraw_code: string } | null>(db.from('navy_parcel_secrets').select('withdraw_code').eq('parcel_id', id).maybeSingle(), 'navy-parcel-secret'),
    run<NavyParcelPayment[]>(db.from('navy_parcel_payments').select('*').eq('parcel_id', id).order('submitted_at'), 'navy-parcel-payments'),
  ]);
  if (!parcel) return null;
  return { parcel, events: events ?? [], prices, lines: lines ?? [], withdrawCode: secret?.withdraw_code ?? null, payments: payments ?? [] };
}

/** Price lines of the grocers' own lines (RLS: a grocer only reads his lines). */
export function myPriceLines(parcelIds: string[]): Promise<NavyPriceLine[]> {
  if (!parcelIds.length) return Promise.resolve([]);
  return run<NavyPriceLine[]>(db.from('navy_parcel_price_lines').select('*').in('parcel_id', parcelIds), 'navy-my-lines');
}

/** Cash to collect at the depot (depot grocer only, cash parcels only). */
export async function cashDue(parcelIds: string[]): Promise<Record<string, number>> {
  if (!parcelIds.length) return {};
  const rows = await run<{ parcel_id: string; amount: number }[]>(db.rpc('navy_cash_due', { p_parcel_ids: parcelIds }), 'navy-cash-due');
  return Object.fromEntries((rows ?? []).map((r) => [r.parcel_id, r.amount]));
}

// ------------------------------------------------------------------ online-only gestures

export function acceptOffer(offerId: string): Promise<NavyParcelRow> {
  return run<NavyParcelRow>(db.rpc('navy_accept_offer', { p_offer_id: offerId }), 'navy-accept-offer');
}

export function refuseOffer(offerId: string): Promise<void> {
  return run<void>(db.rpc('navy_refuse_offer', { p_offer_id: offerId }), 'navy-refuse-offer');
}

export function withdrawParcel(parcelId: string, code: string): Promise<{ ok: boolean; blocked?: boolean; remaining?: number; already?: boolean }> {
  return run(db.rpc('navy_withdraw_parcel', { p_parcel_id: parcelId, p_withdraw_code: code }), 'navy-withdraw');
}

export function cancelParcel(parcelId: string, reason: string | null): Promise<NavyParcelRow> {
  return run<NavyParcelRow>(db.rpc('navy_cancel_parcel', { p_parcel_id: parcelId, p_reason: reason }), 'navy-cancel');
}

export function chooseDriver(parcelId: string, driverPartnerId: string | null): Promise<NavyParcelRow> {
  return run<NavyParcelRow>(db.rpc('navy_choose_driver', { p_parcel_id: parcelId, p_driver: driverPartnerId }), 'navy-choose-driver');
}

export function parcelDrivers(parcelId: string): Promise<NavyQuoteDriver[]> {
  return run<NavyQuoteDriver[]>(db.rpc('navy_parcel_drivers', { p_parcel_id: parcelId }), 'navy-parcel-drivers');
}

/**
 * Live offers addressed to the signed-in driver, with the time left by the SERVER clock
 * (navy_my_offers): the countdown never depends on a phone clock that may be off.
 */
export async function myOffers(): Promise<NavyParcelOffer[]> {
  const list = await run<NavyParcelOffer[]>(db.rpc('navy_my_offers'), 'navy-offers', 6000);
  const at = Date.now();
  const offers = (list ?? []).map((o) => ({ ...o, fetched_at: at }));
  set({ liveOffers: offers.length });
  return offers;
}

// ------------------------------------------------------------------ operator

export function unblockWithdraw(parcelId: string): Promise<NavyParcelRow> {
  return run<NavyParcelRow>(db.rpc('navy_unblock_withdraw', { p_parcel_id: parcelId }), 'navy-unblock');
}

export function relaunchOffers(parcelId: string): Promise<NavyParcelRow> {
  return run<NavyParcelRow>(db.rpc('navy_relaunch_offers', { p_parcel_id: parcelId }), 'navy-relaunch');
}

export function markReturn(parcelId: string): Promise<NavyParcelRow> {
  return run<NavyParcelRow>(db.rpc('navy_mark_return', { p_parcel_id: parcelId }), 'navy-mark-return');
}

export interface PaymentToCheck extends NavyParcelPayment {
  parcel: Pick<NavyParcelRow, 'code' | 'sender_name' | 'recipient_name' | 'status'> | null;
}

export function paymentsToCheck(): Promise<PaymentToCheck[]> {
  return run<PaymentToCheck[]>(
    db
      .from('navy_parcel_payments')
      .select('*, parcel:navy_parcels(code, sender_name, recipient_name, status)')
      .eq('status', 'a_verifier')
      .order('submitted_at', { ascending: true }),
    'navy-payments'
  );
}

export function decidePayment(paymentId: string, decision: 'valider' | 'refuser', reason: string | null): Promise<NavyParcelRow> {
  return run<NavyParcelRow>(db.rpc('navy_decide_payment', { p_payment_id: paymentId, p_decision: decision, p_reason: reason }), 'navy-decide-payment');
}

/** Frozen totals of several parcels (operators: all; sender: own). */
export function pricesOf(parcelIds: string[]): Promise<NavyParcelPrices[]> {
  if (!parcelIds.length) return Promise.resolve([]);
  return run<NavyParcelPrices[]>(db.from('navy_parcel_prices').select('*').in('parcel_id', parcelIds), 'navy-prices');
}
