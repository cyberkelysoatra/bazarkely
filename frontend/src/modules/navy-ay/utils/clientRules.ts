/**
 * NAVY ay client journey on the map (phase 2C2) — pure functions, no React, no Supabase.
 * Covered by clientRules.test.ts. Amounts shown here MIRROR the server rules
 * (priceBreakdown = navy_price_breakdown); the server stays the authority at the order.
 */
import type { NavyAvailableDriver, NavyOpenGrocer, NavyParcelRow, NavyQuoteDriver } from '../types/parcel';
import { priceBreakdown } from './parcelRules';

/** Hell-Ville, where the map centres when the phone gives no position. */
export const HELL_VILLE = { lat: -13.40541, lng: 48.27431 };

/** Digits of a Madagascar number reduced to the national 10-digit form (0XXXXXXXXX), or null. */
export function mgPhoneDigits(raw: string | null | undefined): string | null {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00261')) d = d.slice(5);
  else if (d.startsWith('261') && d.length === 12) d = d.slice(3);
  if (d.length === 9 && d[0] !== '0') d = `0${d}`;
  return /^0\d{9}$/.test(d) ? d : null;
}

/** "0341122233" / "+261 34 11 222 33" → "034 11 222 33" (0XX XX XXX XX), or null. */
export function formatMgPhone(raw: string | null | undefined): string | null {
  const d = mgPhoneDigits(raw);
  return d ? `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : null;
}

/** Same key as the server (navy_phone_key): the last 9 digits. */
export function phoneKey(raw: string | null | undefined): string | null {
  const d = String(raw ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : null;
}

export interface RecentRecipient {
  name: string;
  phone: string;
}

/** Last distinct recipients of the parcels sent by this account (most recent first). */
export function recentRecipients(
  rows: Pick<NavyParcelRow, 'sender_id' | 'recipient_name' | 'recipient_phone' | 'ordered_at' | 'return_of'>[],
  userId: string,
  max = 6
): RecentRecipient[] {
  const seen = new Set<string>();
  const out: RecentRecipient[] = [];
  const mine = rows.filter((r) => r.sender_id === userId && !r.return_of).sort((a, b) => b.ordered_at.localeCompare(a.ordered_at));
  for (const r of mine) {
    const key = phoneKey(r.recipient_phone);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: r.recipient_name, phone: formatMgPhone(r.recipient_phone) ?? r.recipient_phone });
    if (out.length >= max) break;
  }
  return out;
}

/** First name for the panels ("Soa Rakoto" → "Soa"). */
export function firstName(name: string | null | undefined): string {
  const f = String(name ?? '').trim().split(/\s+/)[0];
  return f || 'le destinataire';
}

/** Contact returned by the phone's contact picker, normalised (first number that is Malagasy). */
export function contactFromPicker(c: { name?: string[]; tel?: string[] } | null | undefined): RecentRecipient | null {
  if (!c) return null;
  const phone = (c.tel ?? []).map((t) => formatMgPhone(t)).find((t): t is string => !!t) ?? null;
  const name = (c.name ?? []).map((n) => n.trim()).find(Boolean) ?? '';
  if (!phone && !name) return null;
  return { name, phone: phone ?? (c.tel?.[0] ?? '') };
}

/** Straight-line distance in metres (small distances on the island). */
export function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Walking distance shown to the depot grocer ("350 m", "1,2 km"). */
export function formatWalk(m: number): string {
  if (!Number.isFinite(m)) return '';
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(Math.round(m / 100) / 10).toLocaleString('fr-FR')} km`;
}

/** Nearest open grocer to a point (depot proposed), excluding one id (the arrival). */
export function nearestGrocer(
  grocers: NavyOpenGrocer[],
  from: { lat: number; lng: number },
  excludeId?: string | null
): { grocer: NavyOpenGrocer; m: number } | null {
  let best: { grocer: NavyOpenGrocer; m: number } | null = null;
  for (const g of grocers) {
    if (g.id === excludeId) continue;
    const m = metres(from, g);
    if (!best || m < best.m) best = { grocer: g, m };
  }
  return best;
}

/**
 * Total price of the parcel with one driver (his fare in place of the transport ceiling),
 * CyberKELY share included and spread (decision 31). Direct hand-over: no depot fee.
 */
export function driverTotal(depotFee: number, fare: number, pickupFee: number, share: number): number {
  return priceBreakdown(depotFee, fare, pickupFee, share).total;
}

export interface PricedDriver {
  driver: NavyQuoteDriver;
  total: number;
}

/** Drivers able to take the parcel (server quote), with their total price, cheapest first. */
export function pricedDrivers(drivers: NavyQuoteDriver[], depotFee: number, pickupFee: number, share: number): PricedDriver[] {
  return drivers
    .map((driver) => ({ driver, total: driverTotal(depotFee, driver.fare, pickupFee, share) }))
    .sort((a, b) => a.total - b.total || (a.driver.name ?? '').localeCompare(b.driver.name ?? ''));
}

/**
 * Drivers at the same rounded destination would hide each other: spread them a little
 * around the point (about 40 m), in a stable order.
 */
export function spreadDrivers(drivers: NavyAvailableDriver[]): (NavyAvailableDriver & { lat: number; lng: number })[] {
  const groups = new Map<string, number>();
  return drivers.map((d) => {
    const key = `${d.dest_lat},${d.dest_lng}`;
    const i = groups.get(key) ?? 0;
    groups.set(key, i + 1);
    if (i === 0) return { ...d, lat: d.dest_lat, lng: d.dest_lng };
    const angle = (i * 2 * Math.PI) / 6;
    return { ...d, lat: d.dest_lat + 0.00035 * Math.sin(angle), lng: d.dest_lng + 0.00035 * Math.cos(angle) };
  });
}

/** Seconds left of a driver's 30 s window, from the time the offer was sent (never above 30). */
export function ringSecondsLeft(sentAtMs: number, nowMs: number, windowS = 30): number {
  const left = Math.ceil(windowS - (nowMs - sentAtMs) / 1000);
  return Math.max(0, Math.min(windowS, left));
}

/**
 * Seconds left of the 30 s offer window shown to the sender. The phone clock may be off
 * (P21): it is trusted only when it looks consistent (offer seen 0-30 s after it was
 * sent); otherwise the count starts when the phone first saw the offer.
 */
export function offerRingLeft(sentAtMs: number, seenAtMs: number, nowMs: number, windowS = 30): number {
  const lag = (seenAtMs - sentAtMs) / 1000;
  const already = lag >= 0 && lag <= windowS ? lag : 0;
  const left = Math.ceil(windowS - already - (nowMs - seenAtMs) / 1000);
  return Math.max(0, Math.min(windowS, left));
}
