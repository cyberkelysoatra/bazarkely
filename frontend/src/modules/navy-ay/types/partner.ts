/**
 * NAVY ay partner types (phase 1A).
 *
 * PERSONAL DATA: a partner row holds a phone number, a NIF and the storage paths of
 * identity documents. The documents themselves live in the PRIVATE storage bucket
 * `navy-documents` and are only ever shown through short-lived signed URLs.
 */

export type PartnerKind = 'epicier' | 'chauffeur';
/** 'ended' = end of partnership (phase 1B), distinct from a suspension. */
export type PartnerStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'ended';
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
  // phase 1B
  shop_location_set_at?: string | null;
  shop_location_verified_at?: string | null;
  shop_location_verified_by?: string | null;
  /** Computed by the server from shop_lat / shop_lng (first zone in the order). */
  zone_id?: string | null;
  suspension_reason?: string | null;
  /** Final refusal: the documents are deleted, the request cannot be sent again. */
  rejection_final?: boolean;
  ended_at?: string | null;
  documents_purge_after?: string | null;
  /** Phase 2B1 (driver): do not receive offers below my own fare. */
  hide_low_offers?: boolean;
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
  | 'shop_lat'
  | 'shop_lng'
>;

/** Fields the owner edits after approval (settings of the shop / vehicle). */
export type NavyPartnerSettingsPatch = Partial<
  Pick<NavyPartnerRow, 'is_open' | 'depot_fee' | 'pickup_fee' | 'min_fare' | 'fare_per_5km' | 'shop_lat' | 'shop_lng' | 'hide_low_offers'>
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
  /** Grocer only: shop position (phase 1B), set on site then adjusted. */
  shop_lat: number | null;
  shop_lng: number | null;
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
  /** Phase 2A: fixed CyberKELY share per parcel (Ar). */
  cyberkely_share?: number;
  /** Phase 2A: CyberKELY Orange Money number (null = Orange Money not open yet). */
  orange_money_number?: string | null;
  /** Phase 2B1: corridor width around a driver's route (meters). */
  corridor_width_m?: number;
  updated_at?: string;
}

/** Phase 2B1: road distances follow-up for operators (navy_distance_status). */
export interface NavyDistanceStatus {
  computed_at: string | null;
  requested_at: string | null;
  last_error: string | null;
  full_pending: boolean;
  corridor_width_m: number;
  grocers: number;
  pairs_route: number;
  pairs_total: number;
  queued: number;
  month_requests: number;
  month_matrix: number;
  month_directions: number;
  month_errors: number;
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

// ------------------------------------------------------------------ phase 1B

/** A point as [lat, lng] (same order as the server polygons). */
export type LatLng = [number, number];

/** Server row of public.navy_zones. polygon = list of [lat, lng] points. */
export interface NavyZone {
  id: string;
  name: string;
  polygon: LatLng[];
  color: string;
  sort_order: number;
  created_by?: string | null;
  created_at: string;
  updated_at?: string;
}

/** Server row of public.navy_driver_status (destination only, never a live position). */
export interface NavyDriverStatusRow {
  partner_id: string;
  user_id: string;
  available: boolean;
  dest_lat: number | null;
  dest_lng: number | null;
  dest_zone_id: string | null;
  available_until: string | null;
  client_at: string;
  updated_at: string;
}

/** Driver choice kept on the phone until the server has it (idempotent, ordered by clientAt). */
export interface DriverStatusLocal {
  partnerId: string;
  available: boolean;
  destLat: number | null;
  destLng: number | null;
  /** Time of the choice on the phone. */
  clientAt: string;
  /** Not on the server yet. */
  pending: boolean;
  /** Zone of the destination computed by the server (null = unknown yet). */
  destZoneId?: string | null;
  /**
   * Phase 2B1: ONE GPS reading taken when the driver declares himself available or
   * changes direction, kept on the phone only until it is sent (then removed).
   */
  originLat?: number | null;
  originLng?: number | null;
}

export type PartnerChangeStatus = 'pending' | 'approved' | 'rejected';

/** Fields a validated partner may ask to change (mirrors navy_request_partner_change). */
export interface PartnerChangeFields {
  display_name?: string;
  shop_name?: string;
  vehicle_type?: VehicleType;
  vehicle_plate?: string;
  nif_holder_type?: NifHolderType;
  nif_holder_name?: string | null;
  nif?: string;
  stat_number?: string;
  id_doc_path?: string;
  nif_doc_path?: string;
  stat_doc_path?: string;
  shop_photo_path?: string;
  vehicle_photo_path?: string;
  license_doc_path?: string;
}

/** Server row of public.navy_partner_changes. */
export interface NavyPartnerChangeRow {
  id: string;
  partner_id: string;
  requested_by: string;
  status: PartnerChangeStatus;
  changes: PartnerChangeFields;
  rejection_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

/** A document due for deletion (navy_purge_documents). */
export interface NavyPurgeItem {
  path: string;
  reason: 'rejected_final' | 'replaced' | 'change_rejected' | 'ended';
  due_at: string;
}
