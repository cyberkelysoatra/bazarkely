/**
 * NAVY ay partner types (phase 1A).
 *
 * PERSONAL DATA: a partner row holds a phone number, a NIF and the storage paths of
 * identity documents. The documents themselves live in the PRIVATE storage bucket
 * `navy-documents` and are only ever shown through short-lived signed URLs.
 */

export type PartnerKind = 'epicier' | 'chauffeur';
export type PartnerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type VehicleType = 'bajaj' | 'moto' | 'taxi' | 'voiture' | 'velo' | 'camion' | 'autre';
export type NifHolderType = 'self' | 'owner' | 'cooperative';

/** NAVY roles, cumulative on one account. */
export type NavyRole = 'client' | 'epicier' | 'chauffeur' | 'operatrice';

/** Photo slots per partner kind (file name in storage = slot name). */
export type PhotoSlot = 'id_doc' | 'nif_doc' | 'stat_doc' | 'shop_photo' | 'license_doc' | 'vehicle_photo';

/** Server row of public.navy_partners (snake_case). */
export interface NavyPartnerRow {
  id: string;
  user_id: string;
  kind: PartnerKind;
  status: PartnerStatus;
  rejection_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  display_name: string | null;
  phone: string | null;
  nif: string | null;
  id_doc_path: string | null;
  shop_name: string | null;
  stat_number: string | null;
  stat_doc_path: string | null;
  nif_doc_path: string | null;
  shop_photo_path: string | null;
  is_open: boolean;
  depot_fee: number | null;
  pickup_fee: number | null;
  vehicle_type: VehicleType | null;
  vehicle_plate: string | null;
  vehicle_photo_path: string | null;
  license_doc_path: string | null;
  nif_holder_type: NifHolderType | null;
  nif_holder_name: string | null;
  min_fare: number | null;
  fare_per_5km: number | null;
  shop_lat: number | null;
  shop_lng: number | null;
  phone_verified_at: string | null;
}

/** Columns the owner may write (mirrors the column grants of the SQL). */
export type NavyPartnerWritable = Pick<
  NavyPartnerRow,
  | 'id'
  | 'user_id'
  | 'kind'
  | 'display_name'
  | 'phone'
  | 'nif'
  | 'id_doc_path'
  | 'shop_name'
  | 'stat_number'
  | 'stat_doc_path'
  | 'nif_doc_path'
  | 'shop_photo_path'
  | 'vehicle_type'
  | 'vehicle_plate'
  | 'vehicle_photo_path'
  | 'license_doc_path'
  | 'nif_holder_type'
  | 'nif_holder_name'
>;

/** Fields the owner edits after approval (settings of the shop / vehicle). */
export type NavyPartnerSettingsPatch = Partial<
  Pick<NavyPartnerRow, 'is_open' | 'depot_fee' | 'pickup_fee' | 'min_fare' | 'fare_per_5km'>
>;

/** Text fields of the request form. */
export interface PartnerFormFields {
  display_name: string;
  phone: string;
  nif: string;
  shop_name: string;
  stat_number: string;
  vehicle_type: VehicleType | '';
  vehicle_plate: string;
  nif_holder_type: NifHolderType;
  nif_holder_name: string;
}

/**
 * Request kept on the device until the server has it (offline-first). The id is the
 * partner id, created once on the phone and reused at every attempt (idempotent).
 */
export interface PartnerDraft {
  id: string;
  userId: string;
  kind: PartnerKind;
  fields: PartnerFormFields;
  /** Compressed JPEG per slot. Absent slot = keep the photo already on the server. */
  photos: Partial<Record<PhotoSlot, Blob>>;
  /** Slots already uploaded for this draft (skipped on retry). */
  uploaded: PhotoSlot[];
  /** 'editing' = form not sent yet; 'queued' = the person pressed Send. */
  state: 'editing' | 'queued';
  lastError: string | null;
  updatedAt: string;
}

export interface NavySettings {
  suggested_min_fare: number;
  suggested_fare_per_5km: number;
  suggested_depot_fee: number | null;
  suggested_pickup_fee: number | null;
  updated_at?: string;
}

/** Public card behind the QR code (navy_public_partner). */
export interface NavyPublicPartner {
  kind: PartnerKind;
  name: string | null;
  vehicle_type: VehicleType | null;
  vehicle_plate: string | null;
}

export interface NavyOperatorEntry {
  user_id: string;
  email: string | null;
  username: string | null;
  designated_at: string | null;
  is_admin: boolean;
}
