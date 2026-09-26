import { describe, expect, it } from 'vitest';
import {
  computeFare,
  documentPath,
  emptyFormFields,
  isValidPhone,
  navItemsForRole,
  pickActiveRole,
  resolveNavyRoles,
  validateRequest,
} from './partnerRules';
import { combinePatches, isEmptyPatch, mergePreferences } from './moduleAccess';

describe('computeFare', () => {
  it('applies the default grid (1000 / 1000)', () => {
    expect(computeFare(3, 1000, 1000)).toBe(1000);
    expect(computeFare(12, 1000, 1000)).toBe(3000);
    expect(computeFare(5, 1000, 1000)).toBe(1000);
    expect(computeFare(5.1, 1000, 1000)).toBe(2000);
    expect(computeFare(0, 1000, 1000)).toBe(1000);
  });
  it('keeps the minimum when slices are cheap', () => {
    expect(computeFare(12, 5000, 1000)).toBe(5000);
    expect(computeFare(-4, 1500, 1000)).toBe(1500);
    expect(computeFare(Number.NaN, 1500, 1000)).toBe(1500);
  });
});

describe('roles', () => {
  it('client only until a request is approved', () => {
    expect(resolveNavyRoles([{ kind: 'epicier', status: 'pending' }], false)).toEqual(['client']);
    expect(
      resolveNavyRoles(
        [
          { kind: 'epicier', status: 'approved' },
          { kind: 'chauffeur', status: 'suspended' },
        ],
        true
      )
    ).toEqual(['client', 'epicier', 'operatrice']);
  });
  it('active role falls back to client when not held', () => {
    expect(pickActiveRole(['client', 'epicier'], 'epicier')).toBe('epicier');
    expect(pickActiveRole(['client'], 'operatrice')).toBe('client');
    expect(pickActiveRole(['client'], null)).toBe('client');
  });
  it('bars stay within 6 buttons and hide "Devenir partenaire" when both requests exist', () => {
    expect(navItemsForRole('client', false).map((i) => i.label)).toEqual(['Accueil', 'Envoyer', 'Mes colis', 'À recevoir', 'Partenaire']);
    expect(navItemsForRole('client', true).map((i) => i.label)).toEqual(['Accueil', 'Envoyer', 'Mes colis', 'À recevoir']);
    for (const r of ['client', 'epicier', 'chauffeur', 'operatrice'] as const) {
      expect(navItemsForRole(r, false).length).toBeLessThanOrEqual(6);
    }
  });
});

describe('request validation', () => {
  const all = () => true;
  it('requires shop, phone, NIF, stat number and 4 photos for a grocer', () => {
    const f = { ...emptyFormFields(), shop_name: 'Chez Zo', display_name: 'Zo', phone: '034 12 345 67', nif: '123', stat_number: '456', shop_lat: -13.4, shop_lng: 48.27 };
    expect(validateRequest('epicier', f, all)).toBeNull();
    expect(validateRequest('epicier', { ...f, stat_number: '' }, all)).toMatch(/statistique/);
    expect(validateRequest('epicier', { ...f, shop_lat: null, shop_lng: null }, all)).toMatch(/position/);
    expect(validateRequest('epicier', f, (s) => s !== 'shop_photo')).toMatch(/boutique/);
  });
  it('requires the NIF holder name when it is not the driver', () => {
    const f = { ...emptyFormFields(), display_name: 'Rado', phone: '0321234567', nif: '1', vehicle_type: 'bajaj' as const, vehicle_plate: '1234 TBA' };
    expect(validateRequest('chauffeur', f, all)).toBeNull();
    expect(validateRequest('chauffeur', { ...f, nif_holder_type: 'owner' }, all)).toMatch(/propriétaire/);
    expect(validateRequest('chauffeur', { ...f, vehicle_plate: '' }, all)).toMatch(/immatriculation/);
  });
  it('phone format', () => {
    expect(isValidPhone('+261 34 12 345 67')).toBe(true);
    expect(isValidPhone('34123')).toBe(false);
  });
  it('document path starts with the owner folder', () => {
    expect(documentPath('u1', 'p1', 'id_doc')).toBe('u1/p1/id_doc.jpg');
  });
});

describe('navyRole preference patch', () => {
  it('merges the most recent role without touching other keys', () => {
    const base = { moduleOrder: ['a'], modules: ['navy-ay'], navyRole: { id: 'client', at: '2026-01-01T00:00:00Z' } };
    const out = mergePreferences(base, { navyRole: { id: 'epicier', at: '2026-02-01T00:00:00Z' } }, true);
    expect(out.navyRole).toEqual({ id: 'epicier', at: '2026-02-01T00:00:00Z' });
    expect(out.moduleOrder).toEqual(['a']);
    expect(out.modules).toEqual(['navy-ay']);
    const older = mergePreferences(out, { navyRole: { id: 'client', at: '2025-01-01T00:00:00Z' } }, true);
    expect(older.navyRole.id).toBe('epicier');
  });
  it('combines and detects emptiness', () => {
    const p = combinePatches({ navyRole: { id: 'client', at: '2026-01-01T00:00:00Z' } }, { lastModule: { id: 'navy-ay', at: 'x' } });
    expect(p.navyRole?.id).toBe('client');
    expect(isEmptyPatch({ navyRole: { id: 'client', at: 'x' } })).toBe(false);
  });
});
