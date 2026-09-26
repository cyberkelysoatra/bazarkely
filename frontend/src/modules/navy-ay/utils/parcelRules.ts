/**
 * NAVY ay parcel rules (phase 2A) — pure functions, no React, no Supabase.
 * The server is the authority for every amount (navy_quote / navy_create_parcel): the
 * functions below MIRROR its rules so the phone can explain them and so that they are
 * covered by unit tests (parcelRules.test.ts). They never produce a price sent to the
 * server.
 */
import type {
  DistanceSource,
  NavyGrocerDistance,
  NavyParcelRow,
  ParcelCategory,
  ParcelStatus,
  PaymentStatus,
  PriceLineKind,
} from '../types/parcel';

/** Maximum declared value (compensation ceiling). */
export const MAX_DECLARED_VALUE = 50000;
/** Offer deadline for a driver. */
export const OFFER_SECONDS = 30;
/** Correction applied to the straight-line distance (phase 2A estimate). */
export const DISTANCE_FACTOR = 1.3;

/**
 * Estimated distance between two shops: great-circle distance + 30 %, rounded to
 * 0.1 km. SINGLE place to replace by a road distance (phase 2B). Mirrors
 * public.navy_estimated_km().
 */
export function estimatedKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.sqrt(a)) * DISTANCE_FACTOR;
  return Math.round(km * 10) / 10;
}

/**
 * Phase 2B1: distance between two grocers — the road distance of the table kept on the
 * phone (navy_grocer_distances) when it was computed for the CURRENT positions of both
 * shops, else the estimate above. Mirrors public.navy_pair_km(), so the offline price
 * uses the same distance as the server.
 */
export function pairKm(
  distances: NavyGrocerDistance[] | null | undefined,
  from: { id: string; lat: number; lng: number },
  to: { id: string; lat: number; lng: number }
): { km: number; source: DistanceSource } {
  const row = (distances ?? []).find(
    (d) =>
      d.from_id === from.id &&
      d.to_id === to.id &&
      d.source === 'route' &&
      d.from_lat === from.lat &&
      d.from_lng === from.lng &&
      d.to_lat === to.lat &&
      d.to_lng === to.lng
  );
  if (row) return { km: Number(row.km), source: 'route' };
  return { km: estimatedKm(from.lat, from.lng, to.lat, to.lng), source: 'estimation' };
}

/** Attribution required by OpenRouteService (terms of use) for road distances. */
export const ORS_ATTRIBUTION = '© openrouteservice by HeiGIT | Données © les contributeurs d’OpenStreetMap';

/**
 * Phase 2B1, "Je propose mon prix": minimum accepted = both grocers' fees + CyberKELY
 * share, rounded UP to 100 Ar. Mirrors public.navy_min_total().
 */
export function minProposedTotal(depotFee: number, pickupFee: number, share: number): number {
  const sum = Math.max(0, depotFee || 0) + Math.max(0, pickupFee || 0) + Math.max(0, share || 0);
  return Math.ceil(sum / 100) * 100;
}

/** What the driver earns with a proposed total: total − both grocers − CyberKELY share. */
export function proposedDriverGain(total: number, depotFee: number, pickupFee: number, share: number): number {
  return Math.max(0, Math.round(total) - Math.max(0, depotFee || 0) - Math.max(0, pickupFee || 0) - Math.max(0, share || 0));
}

/** Plain-French problem of a proposed total, or null when it is accepted (same rules as the server). */
export function proposedTotalProblem(total: number, min: number): string | null {
  if (!Number.isFinite(total) || total <= 0) return 'Indiquez le prix total que vous proposez, en ariary.';
  if (total % 100 !== 0) return 'Le prix proposé doit être un multiple de 100 Ar (ex. 2 500 Ar).';
  if (total < min) return `Le prix proposé ne peut pas être inférieur à ${min.toLocaleString('fr-FR')} Ar.`;
  if (total > 1000000) return 'Prix proposé trop élevé.';
  return null;
}

/** NAVY credit deducted from an amount: used first, the rest is kept. */
export function creditSplit(balance: number, amount: number): { used: number; due: number; left: number } {
  const used = Math.max(0, Math.min(Math.max(0, balance || 0), Math.max(0, amount || 0)));
  return { used, due: Math.max(0, amount - used), left: Math.max(0, (balance || 0) - used) };
}

export interface BreakdownLine {
  kind: PriceLineKind;
  base: number;
  navyShare: number;
  shown: number;
}

export interface Breakdown {
  subtotal: number;
  total: number;
  navyTotal: number;
  rounding: number;
  lines: BreakdownLine[];
}

/**
 * Mirror of public.navy_price_breakdown(): total rounded UP to 100 Ar, the rounding
 * goes to CyberKELY; the CyberKELY part is spread over the lines in proportion to their
 * fee (largest remainder, ties in line order) so the lines add up to the total.
 */
export function priceBreakdown(depot: number, transport: number, pickup: number, share: number): Breakdown {
  const base = [depot, transport, pickup].map((n) => Math.max(0, Math.round(n || 0)));
  const s = Math.max(0, Math.round(share || 0));
  const subtotal = base[0] + base[1] + base[2] + s;
  const total = Math.ceil(subtotal / 100) * 100;
  const navyTotal = s + (total - subtotal);
  const sum = base[0] + base[1] + base[2];
  const parts = [0, 0, 0];
  if (sum === 0) {
    parts[1] = navyTotal;
  } else {
    const rem = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const exact = (navyTotal * base[i]) / sum;
      parts[i] = Math.floor(exact);
      rem[i] = exact - Math.floor(exact);
    }
    let left = navyTotal - (parts[0] + parts[1] + parts[2]);
    while (left > 0) {
      let best = 0;
      for (let i = 1; i < 3; i++) if (rem[i] > rem[best]) best = i;
      parts[best] += 1;
      rem[best] = -1;
      left -= 1;
    }
  }
  const kinds: PriceLineKind[] = ['depot', 'transport', 'pickup'];
  return {
    subtotal,
    total,
    navyTotal,
    rounding: total - subtotal,
    lines: kinds.map((kind, i) => ({ kind, base: base[i], navyShare: parts[i], shown: base[i] + parts[i] })),
  };
}

export const CATEGORY_LABELS: Record<ParcelCategory, string> = {
  document: 'Document',
  vetement: 'Vêtement',
  telephone: 'Téléphone',
  nourriture: 'Nourriture',
  autre: 'Autre',
};

export const STATUS_LABELS: Record<ParcelStatus, string> = {
  commande: 'Commandé',
  depose: 'Déposé',
  chauffeur_trouve: 'Chauffeur trouvé',
  pris_en_charge: 'En route',
  arrive: 'Arrivé, à retirer',
  retire: 'Livré',
  annule: 'Annulé',
};

/** Phase 2B1: supplement after a chosen counter-proposal. */
export const SUPPLEMENT_LABELS: Record<PaymentStatus, string> = {
  a_payer_depot: 'Supplément à payer en espèces au dépôt',
  attente_reference: 'Supplément à payer par Orange Money',
  a_verifier: 'Supplément en cours de vérification',
  refuse: 'Supplément non reconnu',
  paye: 'Supplément payé',
};

export const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  a_payer_depot: 'Espèces à payer au dépôt',
  attente_reference: 'Référence Orange Money à saisir',
  a_verifier: 'Paiement en cours de vérification',
  refuse: 'Paiement non reconnu',
  paye: 'Payé',
};

/** The three simple milestones of the sender: Accepté / En route / Livré. */
export function milestones(p: Pick<NavyParcelRow, 'status' | 'driver_found_at' | 'picked_up_at' | 'withdrawn_at'>) {
  const order: ParcelStatus[] = ['commande', 'depose', 'chauffeur_trouve', 'pris_en_charge', 'arrive', 'retire'];
  const at = order.indexOf(p.status);
  return [
    { key: 'accepte', label: 'Accepté', done: at >= 2, time: p.driver_found_at },
    { key: 'en_route', label: 'En route', done: at >= 3, time: p.picked_up_at },
    { key: 'livre', label: 'Livré', done: at >= 5, time: p.withdrawn_at },
  ];
}

/** Plain-French label of a journal event. */
export const EVENT_LABELS: Record<string, string> = {
  commande: 'Commande passée',
  reference_orange_money: 'Référence Orange Money envoyée',
  paiement_valide: 'Paiement confirmé',
  paiement_refuse: 'Paiement non reconnu',
  depose: 'Déposé à l’épicerie de départ',
  recherche_chauffeur: 'Recherche d’un chauffeur',
  offre_envoyee: 'Course proposée à un chauffeur',
  offre_expiree: 'Pas de réponse du chauffeur, au suivant',
  offre_refusee: 'Course refusée par un chauffeur',
  relance_chauffeurs: 'Nouvelle recherche de chauffeur',
  avis_client_demande: 'Choix d’un autre chauffeur demandé',
  chauffeur_choisi: 'Autre chauffeur choisi',
  mode_automatique: 'Passage en mode automatique',
  alerte_sans_chauffeur_30min: 'Aucun chauffeur depuis 30 min : opératrice prévenue',
  chauffeur_trouve: 'Chauffeur trouvé',
  remis_au_chauffeur: 'Remis au chauffeur par l’épicier',
  prise_en_charge_confirmee: 'Prise en charge confirmée par le chauffeur',
  pris_en_charge: 'En route',
  arrive: 'Arrivé à l’épicerie d’arrivée',
  code_retrait_faux: 'Code de retrait incorrect',
  code_retrait_bloque: 'Code de retrait bloqué',
  code_retrait_debloque: 'Code de retrait débloqué',
  rappel_24h: 'Rappel : colis à retirer',
  alerte_non_retire_3j: 'Non retiré depuis 3 jours',
  alerte_non_retire_7j: 'Non retiré depuis 7 jours',
  retour_a_organiser: 'Retour à organiser',
  retire: 'Retiré par le destinataire',
  annule: 'Commande annulée',
  // phase 2B1
  offre_diffusee: 'Course proposée à tous les chauffeurs (le premier qui accepte l’emporte)',
  contre_proposition: 'Chauffeurs disponibles à un autre prix : votre choix est demandé',
  contre_proposition_choisie: 'Chauffeur choisi à un autre prix',
  contre_proposition_refusee: 'Autre prix refusé : la recherche continue',
  supplement_paye_avoir: 'Supplément payé par l’avoir NAVY',
  supplement_especes_depot: 'Supplément à payer en espèces au dépôt',
  supplement_orange_money: 'Supplément à payer par Orange Money',
  reference_orange_money_supplement: 'Référence Orange Money du supplément envoyée',
  supplement_valide: 'Supplément confirmé',
  supplement_refuse: 'Supplément non reconnu',
};

export function eventLabel(event: string): string {
  return EVENT_LABELS[event] ?? event;
}

/** Madagascar phone number, loose (same rule as partner requests). */
export function isValidRecipientPhone(phone: string): boolean {
  const digits = phone.replace(/[\s.-]/g, '');
  return /^0\d{9}$/.test(digits) || /^\+261\d{9}$/.test(digits);
}

/** Seconds left before an offer expires (never negative). */
export function secondsLeft(expiresAt: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
}

/**
 * Seconds left of an offer, by the SERVER clock when known (seconds_left read at
 * fetched_at, minus the time elapsed on the phone since), else by expires_at. Never more
 * than the offer deadline, never negative.
 */
export function offerSecondsLeft(
  o: { expires_at: string; seconds_left?: number; fetched_at?: number; broadcast?: boolean },
  now = Date.now()
): number {
  const left =
    o.seconds_left != null && o.fetched_at != null
      ? o.seconds_left - (now - o.fetched_at) / 1000
      : (new Date(o.expires_at).getTime() - now) / 1000;
  // A "Je propose mon prix" offer stays open for the whole round: no 30 s cap.
  return Math.max(0, (o as { broadcast?: boolean }).broadcast ? Math.ceil(left) : Math.min(OFFER_SECONDS, Math.ceil(left)));
}

/** Operator alerts shown on top of the list. */
export function parcelAlerts(p: NavyParcelRow, now = Date.now()): string[] {
  const out: string[] = [];
  if (p.status === 'depose' && p.no_driver_alert_at) out.push('Sans chauffeur depuis 30 min');
  if (p.status === 'depose' && p.search_state === 'attente_client') out.push('Le client doit choisir un chauffeur');
  if (['commande', 'depose'].includes(p.status) && p.counter_state === 'propose') out.push('Prix trop bas : le client doit choisir');
  if (p.supplement_status === 'a_verifier' && p.status !== 'annule') out.push('Supplément à vérifier');
  if (p.payment_status === 'a_verifier' && p.status !== 'annule') out.push('Paiement à vérifier');
  if (p.withdraw_blocked_at && p.status === 'arrive') out.push('Code de retrait bloqué');
  if (p.status === 'arrive' && p.return_status === 'a_organiser') out.push('Retour à organiser');
  else if (p.status === 'arrive' && (p.overdue_7d_at || (p.arrived_at && now - new Date(p.arrived_at).getTime() > 7 * 864e5)))
    out.push('Non retiré depuis 7 jours');
  else if (p.status === 'arrive' && p.alert_3d_at) out.push('Non retiré depuis 3 jours');
  return out;
}

/** Plain-French message of a server refusal (codes and messages of the navy_* functions). */
export function parcelErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String((err as any)?.message ?? err ?? '');
  const code = (err as any)?.code;
  if (/timeout|Failed to fetch|NetworkError|Load failed/i.test(msg)) return 'Le réseau ne répond pas. Vérifiez la connexion puis réessayez.';
  if (/offer already taken/i.test(msg)) return 'Trop tard : un autre chauffeur a déjà accepté cette course.';
  if (/offer expired/i.test(msg)) return 'Trop tard : cette course a été proposée à un autre chauffeur.';
  if (/below the minimum/i.test(msg)) return 'Le prix proposé est inférieur au minimum accepté. Augmentez-le.';
  if (/multiple of 100/i.test(msg)) return 'Le prix proposé doit être un multiple de 100 Ar.';
  if (/proposed total too high/i.test(msg)) return 'Prix proposé trop élevé.';
  if (/no counter-proposal pending/i.test(msg)) return 'Cette proposition n’est plus d’actualité. Actualisez.';
  if (/no longer available/i.test(msg)) return 'Ce colis n’est plus disponible.';
  if (/not the expected driver/i.test(msg)) return 'Ce n’est pas le chauffeur attendu pour ce colis.';
  if (/grocer must hand/i.test(msg)) return 'L’épicier doit d’abord confirmer qu’il vous a remis le colis.';
  if (/wrong parcel code/i.test(msg)) return 'Ce code colis ne correspond pas.';
  if (/cash must be collected/i.test(msg)) return 'Confirmez que les espèces ont été encaissées.';
  if (/closed in front/i.test(msg)) return 'Cochez « Colis refermé devant moi ».';
  if (/Orange Money number not set/i.test(msg)) return 'Le paiement Orange Money n’est pas encore ouvert. Choisissez les espèces.';
  if (/outside every zone/i.test(msg)) return 'L’épicerie d’arrivée est hors des zones desservies. Choisissez-en une autre.';
  if (/chosen driver not available|driver not available/i.test(msg)) return 'Ce chauffeur n’est plus disponible. Choisissez-en un autre.';
  if (/grocer not available/i.test(msg)) return 'Cette épicerie n’est plus disponible (fermée). Choisissez-en une autre.';
  if (/same grocer/i.test(msg)) return 'Choisissez deux épiceries différentes.';
  if (/declared value/i.test(msg)) return `La valeur déclarée doit être comprise entre 0 et ${MAX_DECLARED_VALUE.toLocaleString('fr-FR')} Ar.`;
  if (/invalid reference/i.test(msg)) return 'Référence incomplète (4 caractères au moins).';
  if (/too late/i.test(msg)) return 'Il est trop tard pour annuler ce colis.';
  if (/only after 7 days/i.test(msg)) return 'Possible seulement après 7 jours sans retrait.';
  if (/reason required/i.test(msg)) return 'Indiquez un motif.';
  if (/not allowed from|not waiting|not expected now/i.test(msg)) return 'Ce colis a déjà changé d’état. Actualisez.';
  if (code === '42501') return 'Cette action ne vous est pas permise pour ce colis.';
  return 'L’action n’a pas abouti. Réessayez dans un instant.';
}

/** Error meaning "no network": the gesture can be kept and replayed. */
export function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String((err as any)?.message ?? err ?? '');
  return /timeout|timed out|Failed to fetch|NetworkError|Load failed/i.test(msg);
}
