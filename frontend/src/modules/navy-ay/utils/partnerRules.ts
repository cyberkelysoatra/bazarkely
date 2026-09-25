/**
 * NAVY ay partner rules (phase 1A) — pure functions, no React, no Supabase.
 * Covered by partnerRules.test.ts.
 */
import type {
  NavyPartnerRow,
  NavyRole,
  PartnerFormFields,
  PartnerKind,
  PhotoSlot,
  VehicleType,
} from '../types/partner';

export const DEFAULT_MIN_FARE = 1000;
export const DEFAULT_FARE_PER_5KM = 1000;

/**
 * Driver fare: max(minimum fare, fare per 5 km × number of STARTED 5 km slices).
 * 3 km → 1 slice ; 12 km → 3 slices ; 0 km → 0 slice (minimum applies).
 */
export function computeFare(km: number, minFare: number, farePer5km: number): number {
  const safeKm = Number.isFinite(km) && km > 0 ? km : 0;
  const slices = Math.ceil(safeKm / 5);
  return Math.max(Math.max(0, minFare || 0), Math.max(0, farePer5km || 0) * slices);
}

/** Photo slots required for each kind of request (order = display order). */
export const PHOTO_SLOTS: Record<PartnerKind, PhotoSlot[]> = {
  epicier: ['id_doc', 'nif_doc', 'stat_doc', 'shop_photo'],
  chauffeur: ['id_doc', 'license_doc', 'nif_doc', 'vehicle_photo'],
};

/** Server column holding the storage path of each slot. */
export const SLOT_COLUMN: Record<PhotoSlot, keyof NavyPartnerRow> = {
  id_doc: 'id_doc_path',
  nif_doc: 'nif_doc_path',
  stat_doc: 'stat_doc_path',
  shop_photo: 'shop_photo_path',
  license_doc: 'license_doc_path',
  vehicle_photo: 'vehicle_photo_path',
};

/** Storage path: {user_id}/{partner_id}/{slot}.jpg (the first folder drives RLS). */
export function documentPath(userId: string, partnerId: string, slot: PhotoSlot): string {
  return `${userId}/${partnerId}/${slot}.jpg`;
}

export const VEHICLE_TYPES: VehicleType[] = ['bajaj', 'moto', 'taxi', 'voiture', 'velo', 'camion', 'autre'];

export function emptyFormFields(): PartnerFormFields {
  return {
    display_name: '',
    phone: '',
    nif: '',
    shop_name: '',
    stat_number: '',
    vehicle_type: '',
    vehicle_plate: '',
    nif_holder_type: 'self',
    nif_holder_name: '',
  };
}

/** Form fields prefilled from an existing request (correction after refusal). */
export function fieldsFromRow(row: NavyPartnerRow): PartnerFormFields {
  return {
    display_name: row.display_name ?? '',
    phone: row.phone ?? '',
    nif: row.nif ?? '',
    shop_name: row.shop_name ?? '',
    stat_number: row.stat_number ?? '',
    vehicle_type: row.vehicle_type ?? '',
    vehicle_plate: row.vehicle_plate ?? '',
    nif_holder_type: row.nif_holder_type ?? 'self',
    nif_holder_name: row.nif_holder_name ?? '',
  };
}

/** Madagascar phone number, loose: 10 digits starting with 03, or +261 then 9 digits. */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s.-]/g, '');
  return /^0\d{9}$/.test(digits) || /^\+261\d{9}$/.test(digits);
}

/** Normalised licence plate (upper case, single spaces). */
export function normalizePlate(plate: string): string {
  return plate.toUpperCase().replace(/\s+/g, ' ').trim();
}

/**
 * First blocking problem of a request form, in plain French, or null when it can be
 * sent. `hasPhoto(slot)` says whether a photo exists (new one or already on server).
 */
export function validateRequest(
  kind: PartnerKind,
  f: PartnerFormFields,
  hasPhoto: (slot: PhotoSlot) => boolean
): string | null {
  if (kind === 'epicier' && !f.shop_name.trim()) return 'Indiquez le nom de la boutique.';
  if (!f.display_name.trim()) return kind === 'epicier' ? 'Indiquez le nom du gérant.' : 'Indiquez votre nom.';
  if (!isValidPhone(f.phone)) return 'Numéro de téléphone incomplet (10 chiffres, ex. 034 12 345 67).';
  if (kind === 'chauffeur') {
    if (!f.vehicle_type) return 'Choisissez le type de véhicule.';
    if (f.vehicle_type !== 'velo' && !f.vehicle_plate.trim()) return 'Indiquez l’immatriculation du véhicule.';
    if (f.nif_holder_type !== 'self' && !f.nif_holder_name.trim()) {
      return f.nif_holder_type === 'owner' ? 'Indiquez le nom du propriétaire.' : 'Indiquez le nom de la coopérative.';
    }
  }
  if (!f.nif.trim()) return 'Indiquez le numéro NIF.';
  if (kind === 'epicier' && !f.stat_number.trim()) return 'Indiquez le numéro de la carte statistique.';
  const missing = PHOTO_SLOTS[kind].find((slot) => !hasPhoto(slot));
  if (missing) return `Ajoutez la photo : ${PHOTO_LABELS[missing].toLowerCase()}.`;
  return null;
}

export const PHOTO_LABELS: Record<PhotoSlot, string> = {
  id_doc: 'Pièce d’identité',
  nif_doc: 'Carte NIF',
  stat_doc: 'Carte statistique',
  shop_photo: 'Photo de la boutique',
  license_doc: 'Permis de conduire',
  vehicle_photo: 'Photo du véhicule',
};

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  bajaj: 'Bajaj',
  moto: 'Moto',
  taxi: 'Taxi',
  voiture: 'Voiture',
  velo: 'Vélo',
  camion: 'Camion',
  autre: 'Autre',
};

export const KIND_LABELS: Record<PartnerKind, string> = {
  epicier: 'Épicier',
  chauffeur: 'Chauffeur',
};

/** Roles held by the account: client always, partner roles only once approved. */
export function resolveNavyRoles(partners: Pick<NavyPartnerRow, 'kind' | 'status'>[], isOperator: boolean): NavyRole[] {
  const roles: NavyRole[] = ['client'];
  if (partners.some((p) => p.kind === 'epicier' && p.status === 'approved')) roles.push('epicier');
  if (partners.some((p) => p.kind === 'chauffeur' && p.status === 'approved')) roles.push('chauffeur');
  if (isOperator) roles.push('operatrice');
  return roles;
}

/** Active role: the remembered one when still held, else client. */
export function pickActiveRole(held: NavyRole[], remembered: string | null | undefined): NavyRole {
  return remembered && (held as string[]).includes(remembered) ? (remembered as NavyRole) : 'client';
}

export const ROLE_LABELS: Record<NavyRole, string> = {
  client: 'Client',
  epicier: 'Épicier',
  chauffeur: 'Chauffeur',
  operatrice: 'Opératrice',
};

export interface NavyNavItem {
  path: string;
  icon: string;
  label: string;
  /** Match the exact path only (roots whose sub-pages belong elsewhere). */
  end?: boolean;
}

/** Bottom-bar items of a role (≤ 6). */
export function navItemsForRole(role: NavyRole, hasBothRequests: boolean): NavyNavItem[] {
  switch (role) {
    case 'epicier':
      return [
        { path: '/navy/epicerie', icon: 'Store', label: 'Mon épicerie' },
        { path: '/navy/qr', icon: 'QrCode', label: 'Mon QR' },
      ];
    case 'chauffeur':
      return [
        { path: '/navy/vehicule', icon: 'Truck', label: 'Mon véhicule' },
        { path: '/navy/qr', icon: 'QrCode', label: 'Mon QR' },
      ];
    case 'operatrice':
      return [
        { path: '/navy/operatrice/demandes', icon: 'Inbox', label: 'Demandes' },
        { path: '/navy/operatrice/partenaires', icon: 'Users', label: 'Partenaires' },
        { path: '/navy/operatrice/reglages', icon: 'Settings', label: 'Réglages' },
      ];
    default: {
      const items: NavyNavItem[] = [{ path: '/navy', icon: 'Home', label: 'Accueil', end: true }];
      if (!hasBothRequests) items.push({ path: '/navy/devenir', icon: 'UserPlus', label: 'Devenir partenaire' });
      return items;
    }
  }
}

/** Landing page of a role (used when switching role). */
export function homePathForRole(role: NavyRole): string {
  return navItemsForRole(role, false)[0].path;
}
