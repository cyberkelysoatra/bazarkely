import { describe, expect, it } from 'vitest';
import {
  contactFromPicker,
  driverTotal,
  firstName,
  formatMgPhone,
  formatWalk,
  mgPhoneDigits,
  nearestGrocer,
  offerRingLeft,
  phoneKey,
  pricedDrivers,
  recentRecipients,
  ringSecondsLeft,
  spreadDrivers,
} from './clientRules';
import { priceBreakdown } from './parcelRules';
import type { NavyAvailableDriver, NavyOpenGrocer } from '../types/parcel';

describe('Malagasy phone numbers', () => {
  it('normalises the usual writings to 0XX XX XXX XX', () => {
    expect(formatMgPhone('0341122233')).toBe('034 11 222 33');
    expect(formatMgPhone('+261 34 11 222 33')).toBe('034 11 222 33');
    expect(formatMgPhone('00261341122233')).toBe('034 11 222 33');
    expect(formatMgPhone('261341122233')).toBe('034 11 222 33');
    expect(formatMgPhone('34 11 222 33')).toBe('034 11 222 33');
    expect(formatMgPhone('034-11-222-33')).toBe('034 11 222 33');
  });
  it('refuses what is not a Malagasy mobile number', () => {
    expect(formatMgPhone('12345')).toBeNull();
    expect(formatMgPhone('')).toBeNull();
    expect(mgPhoneDigits('+33 6 12 34 56 78')).toBeNull();
  });
  it('keys a phone like the server (last 9 digits)', () => {
    expect(phoneKey('+261 34 11 222 33')).toBe('341122233');
    expect(phoneKey('034 11 222 33')).toBe('341122233');
    expect(phoneKey('12')).toBeNull();
  });
});

describe('recentRecipients', () => {
  const row = (name: string, phone: string, at: string, sender = 'me', return_of: string | null = null) => ({
    sender_id: sender,
    recipient_name: name,
    recipient_phone: phone,
    ordered_at: at,
    return_of,
  });
  it('keeps the distinct recipients of my parcels, most recent first', () => {
    const out = recentRecipients(
      [
        row('Soa', '0341122233', '2026-09-01'),
        row('Maman', '033 12 000 44', '2026-09-03'),
        row('Soa Rakoto', '+261341122233', '2026-09-05'),
        row('Autre', '0320000000', '2026-09-06', 'someone-else'),
        row('Moi (retour)', '0321111111', '2026-09-07', 'me', 'x'),
      ],
      'me'
    );
    expect(out).toEqual([
      { name: 'Soa Rakoto', phone: '034 11 222 33' },
      { name: 'Maman', phone: '033 12 000 44' },
    ]);
  });
  it('limits the list', () => {
    const rows = Array.from({ length: 9 }, (_, i) => row(`P${i}`, `03400000${String(i).padStart(2, '0')}`, `2026-09-0${i + 1}`));
    expect(recentRecipients(rows, 'me', 4)).toHaveLength(4);
  });
});

describe('contact picker', () => {
  it('takes the name and the first Malagasy number', () => {
    expect(contactFromPicker({ name: ['Maman'], tel: ['+33 6 00 00 00 00', '+261 33 12 000 44'] })).toEqual({
      name: 'Maman',
      phone: '033 12 000 44',
    });
  });
  it('keeps a foreign number as typed when there is nothing better', () => {
    expect(contactFromPicker({ name: ['Paul'], tel: ['+33 6 00'] })).toEqual({ name: 'Paul', phone: '+33 6 00' });
    expect(contactFromPicker(null)).toBeNull();
    expect(contactFromPicker({ name: [], tel: [] })).toBeNull();
  });
  it('first name of a contact', () => {
    expect(firstName('Soa Rakoto')).toBe('Soa');
    expect(firstName('  ')).toBe('le destinataire');
  });
});

describe('prices per driver', () => {
  it('mirrors the server breakdown with the driver fare', () => {
    expect(driverTotal(100, 1500, 100, 300)).toBe(priceBreakdown(100, 1500, 100, 300).total);
    expect(driverTotal(0, 1000, 200, 300)).toBe(1500);
  });
  it('sorts the drivers cheapest first', () => {
    const list = pricedDrivers(
      [
        { partner_id: 'a', name: 'Rivo', vehicle_type: 'bajaj', fare: 2000, dest_zone_id: null },
        { partner_id: 'b', name: 'Njaka', vehicle_type: 'moto', fare: 1000, dest_zone_id: null },
      ],
      200,
      200,
      300
    );
    expect(list.map((p) => p.driver.name)).toEqual(['Njaka', 'Rivo']);
    expect(list[0].total).toBe(1700);
  });
});

describe('map helpers', () => {
  const g = (id: string, lat: number, lng: number): NavyOpenGrocer => ({ id, shop_name: id, lat, lng, zone_id: null, depot_fee: 0, pickup_fee: 0 });
  it('nearest grocer, the arrival excluded', () => {
    const list = [g('near', -13.4, 48.27), g('far', -13.3, 48.2)];
    expect(nearestGrocer(list, { lat: -13.401, lng: 48.271 })?.grocer.id).toBe('near');
    expect(nearestGrocer(list, { lat: -13.401, lng: 48.271 }, 'near')?.grocer.id).toBe('far');
    expect(nearestGrocer([], { lat: 0, lng: 0 })).toBeNull();
  });
  it('walking distance in French', () => {
    expect(formatWalk(343)).toBe('340 m');
    expect(formatWalk(1234)).toBe('1,2 km');
    expect(formatWalk(2)).toBe('10 m');
  });
  it('spreads drivers sharing a destination', () => {
    const d = (id: string): NavyAvailableDriver => ({
      partner_id: id, first_name: id, vehicle_type: null, plate: null, vehicle_photo_path: null,
      dest_lat: -13.4, dest_lng: 48.27, dest_zone_id: null, route: null,
    });
    const out = spreadDrivers([d('a'), d('b'), d('c')]);
    expect(out[0]).toMatchObject({ lat: -13.4, lng: 48.27 });
    expect(new Set(out.map((o) => `${o.lat},${o.lng}`)).size).toBe(3);
  });
  it('30 s ring never above 30 nor below 0', () => {
    expect(ringSecondsLeft(0, 0)).toBe(30);
    expect(ringSecondsLeft(0, 12_500)).toBe(18);
    expect(ringSecondsLeft(0, 40_000)).toBe(0);
    expect(ringSecondsLeft(10_000, 0)).toBe(30);
  });
});

describe('offerRingLeft', () => {
  it('uses the phone clock when it looks right', () => {
    expect(offerRingLeft(0, 5_000, 5_000)).toBe(25);
    expect(offerRingLeft(0, 5_000, 20_000)).toBe(10);
  });
  it('counts from the first sight when the phone clock is off', () => {
    expect(offerRingLeft(60_000, 5_000, 5_000)).toBe(30); // phone behind the server
    expect(offerRingLeft(0, 90_000, 95_000)).toBe(25); // phone far ahead
    expect(offerRingLeft(0, 90_000, 200_000)).toBe(0);
  });
});
