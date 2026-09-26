/**
 * NAVY ay parcel types (phase 2A). Server rows are snake_case (public.navy_parcel*).
 *
 * Amounts: the total paid is in NavyParcelPrices (sender + operators only); a grocer
 * reads its own price line; a driver only reads what he earns (driver_fare / offer fare).
 * The withdrawal code (NavyParcelSecret) is readable by the sender and the linked
 * recipient ONLY.
 */

export type ParcelStatus = 'commande' | 'depose' | 'chauffeur_trouve' | 'pris_en_charge' | 'arrive' | 'retire' | 'annule';
export type PaymentMethod = 'especes' | 'orange_money';
export type PaymentStatus = 'a_payer_depot' | 'attente_reference' | 'a_verifier' | 'refuse' | 'paye';
/** 'prix' (phase 2B1): "Je propose mon prix", offer broadcast to every eligible driver. */
export type DriverMode = 'auto' | 'choix' | 'prix';
export type ParcelCategory = 'document' | 'vetement' | 'telephone' | 'nourriture' | 'autre';
export type SearchState = 'recherche' | 'attente_client' | 'trouve' | 'contre_proposition' | 'attente_supplement';
/** Phase 2B1: counter-proposal of the server when the price paid is too low for the drivers. */
export type CounterState = 'propose' | 'choisi' | 'refuse';
export type DistanceSource = 'route' | 'estimation';

export interface NavyParcelRow {
  id: string;
  code: string;
  sender_id: string;
  sender_name: string | null;
  sender_phone: string | null;
  recipient_name: string;
  recipient_phone: string;
  recipient_user_id: string | null;
  depot_partner_id: string;
  depot_name: string | null;
  depot_phone: string | null;
  depot_lat: number | null;
  depot_lng: number | null;
  depot_zone_id: string | null;
  arrival_partner_id: string;
  arrival_name: string | null;
  arrival_phone: string | null;
  arrival_lat: number | null;
  arrival_lng: number | null;
  arrival_zone_id: string | null;
  distance_km: number;
  category: ParcelCategory;
  declared_value: number;
  status: ParcelStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_refusal_reason: string | null;
  paid_at: string | null;
  driver_mode: DriverMode;
  chosen_driver_id: string | null;
  chosen_fare: number | null;
  search_state: SearchState | null;
  search_round: number;
  search_started_at: string | null;
  next_relaunch_at: string | null;
  no_driver_alert_at: string | null;
  driver_partner_id: string | null;
  driver_user_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_vehicle: string | null;
  driver_plate: string | null;
  driver_fare: number | null;
  handover_grocer_at: string | null;
  handover_driver_at: string | null;
  withdraw_attempts: number;
  withdraw_blocked_at: string | null;
  reminder_24h_at: string | null;
  alert_3d_at: string | null;
  overdue_7d_at: string | null;
  return_status: 'a_organiser' | null;
  sealed_confirmed: boolean;
  cash_collected_at: string | null;
  ordered_at: string;
  deposited_at: string | null;
  driver_found_at: string | null;
  picked_up_at: string | null;
  arrived_at: string | null;
  withdrawn_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  updated_at: string;
  // phase 2B1
  distance_source?: DistanceSource;
  proposed_total?: number | null;
  counter_state?: CounterState | null;
  counter_at?: string | null;
  counter_round?: number | null;
  precheck_at?: string | null;
  /** Supplement after a chosen counter-proposal (same states as the first payment). */
  supplement_status?: PaymentStatus | null;
}

export interface NavyParcelPrices {
  parcel_id: string;
  depot_fee: number;
  pickup_fee: number;
  transport_ceiling: number;
  share_fixed: number;
  rounding: number;
  navy_total: number;
  total_price: number;
  credit_due: number;
  credit_reason: string | null;
  // phase 2B1
  initial_total?: number | null;
  /** NAVY credit (avoir) deducted at the order. */
  credit_used?: number;
  /** What is left to pay for the first payment (initial_total - credit_used). */
  amount_due?: number | null;
  supplement?: number;
  supplement_credit_used?: number;
  supplement_due?: number;
  supplement_method?: 'avoir' | 'especes' | 'orange_money' | null;
}

export type PriceLineKind = 'depot' | 'transport' | 'pickup';

export interface NavyPriceLine {
  parcel_id: string;
  seq: number;
  kind: PriceLineKind;
  partner_id: string | null;
  label: string;
  base_amount: number;
  navy_share: number;
  shown_amount: number;
}

export interface NavyParcelEvent {
  id: number;
  parcel_id: string;
  at: string;
  actor_id: string | null;
  actor_role: 'client' | 'epicier' | 'chauffeur' | 'operatrice' | 'systeme';
  event: string;
  note: string | null;
}

export interface NavyParcelOffer {
  id: string;
  parcel_id: string;
  driver_partner_id: string;
  driver_user_id: string;
  round: number;
  fare: number;
  parcel_code: string;
  depot_name: string | null;
  depot_lat: number | null;
  depot_lng: number | null;
  arrival_name: string | null;
  arrival_lat: number | null;
  arrival_lng: number | null;
  distance_km: number;
  category: ParcelCategory;
  status: 'envoyee' | 'acceptee' | 'refusee' | 'expiree' | 'annulee';
  sent_at: string;
  expires_at: string;
  answered_at: string | null;
  /** Phase 2B1: "Je propose mon prix" offer, sent to every driver, open for the round (no 30 s countdown). */
  broadcast?: boolean;
  /** navy_my_offers(): seconds left by the SERVER clock at fetch time. */
  seconds_left?: number;
  /** Phone time (ms) when seconds_left was read. */
  fetched_at?: number;
}

export interface NavyParcelPayment {
  id: string;
  parcel_id: string;
  reference: string;
  amount: number;
  status: 'a_verifier' | 'valide' | 'refuse';
  /** Phase 2B1: first payment or supplement after a counter-proposal. */
  kind?: 'principal' | 'supplement';
  reason: string | null;
  submitted_by: string;
  submitted_at: string;
  decided_at: string | null;
}

/** Open grocer usable for an order (navy_open_grocers). */
export interface NavyOpenGrocer {
  id: string;
  shop_name: string;
  lat: number;
  lng: number;
  zone_id: string | null;
  depot_fee: number;
  pickup_fee: number;
}

export interface NavyQuoteDriver {
  partner_id: string;
  name: string | null;
  vehicle_type: string | null;
  fare: number;
  dest_zone_id: string | null;
  via?: 'zone' | 'couloir';
}

export interface NavyQuoteLine {
  kind: PriceLineKind;
  base: number;
  navy_share: number;
  shown: number;
}

/** navy_quote(): computed by the server, never by the phone. */
export interface NavyQuote {
  distance_km: number;
  /** Phase 2B1: 'route' = OpenRouteService road distance, 'estimation' = straight line + 30 %. */
  distance_source?: DistanceSource;
  transport_ceiling: number;
  depot_fee: number;
  pickup_fee: number;
  share: number;
  breakdown: { subtotal: number; total: number; navy_total: number; rounding: number; lines: NavyQuoteLine[] };
  depot_name: string;
  arrival_name: string;
  depot_zone_id: string | null;
  arrival_zone_id: string | null;
  drivers: NavyQuoteDriver[];
  orange_money_number: string | null;
  /** Phase 2B1: minimum accepted for "Je propose mon prix" (grocers + CyberKELY share, rounded up). */
  min_total?: number;
  /** Phase 2B1: NAVY credit of the signed-in account (deducted automatically). */
  credit_balance?: number;
}

/** Phase 2B1: road distance between two grocers (public.navy_grocer_distances). */
export interface NavyGrocerDistance {
  from_id: string;
  to_id: string;
  from_lat: number;
  from_lng: number;
  to_lat: number;
  to_lng: number;
  km: number;
  duration_s: number | null;
  source: DistanceSource;
  computed_at: string;
}

/** Phase 2B1: one driver of a counter-proposal (navy_parcel_counter). */
export interface NavyCounterOption {
  rank: number;
  driver_partner_id: string;
  driver_name: string | null;
  vehicle_type: string | null;
  new_total: number;
  supplement: number;
  near_km: number | null;
}

/** Phase 2B1: NAVY credit (navy_my_credit). */
export interface NavyCreditSummary {
  balance: number;
  movements: { at: string; amount: number; kind: 'credit' | 'utilisation'; note: string | null; parcel_code: string | null }[];
}

/** Order form (kept on the phone as the payload of a queued order). */
export interface ParcelOrderInput {
  depotId: string;
  arrivalId: string;
  recipientName: string;
  recipientPhone: string;
  category: ParcelCategory;
  declaredValue: number;
  driverMode: DriverMode;
  chosenDriverId: string | null;
  paymentMethod: PaymentMethod;
  /** "Je propose mon prix": total proposed by the client (multiple of 100 Ar). */
  proposedTotal?: number | null;
}

/** Gesture kept on the phone until the server has it (same ids on every attempt). */
export type ParcelQueuedOp =
  | { kind: 'create'; parcelId: string; input: ParcelOrderInput }
  | { kind: 'payment_ref'; paymentId: string; parcelId: string; reference: string }
  | { kind: 'deposit'; parcelId: string; cash: boolean }
  | { kind: 'handover_grocer'; parcelId: string; driverPartnerId: string }
  | { kind: 'handover_driver'; parcelId: string }
  | { kind: 'receive'; parcelId: string; code: string };

export interface ParcelQueueEntry {
  /** Unique key of the gesture: `${kind}:${parcelId}`. */
  id: string;
  userId: string;
  op: ParcelQueuedOp;
  createdAt: string;
  lastError: string | null;
}

/** Created order as kept on the phone (codes shown again on the "created" screen). */
export interface ParcelCodes {
  parcelId: string;
  code: string;
  withdrawCode: string;
}
