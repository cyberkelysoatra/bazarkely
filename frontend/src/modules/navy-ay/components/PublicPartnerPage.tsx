/**
 * Public page behind a partner QR code: /navy/p/:id (phase 1A), reachable WITHOUT
 * sign-in. Shows only what navy_public_partner() returns for an APPROVED partner:
 * type, name and, for a driver, vehicle type and plate. Never a document, a phone
 * number or a NIF. Unknown or not approved → neutral message, no detail.
 * "Rejoindre NAVY ay" remembers the referrer, then goes to /navy (sign-in first).
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, CircleHelp, Store, Truck, UserPlus, WifiOff } from 'lucide-react';
import { supabase, withTimeout } from '../../../lib/supabase';
import type { NavyPublicPartner } from '../types/partner';
import { rememberReferrer } from '../services/partnerService';
import { VEHICLE_LABELS } from '../utils/partnerRules';
import { NavyWordmark } from './NavyLogo';
import { btnPrimary } from './ui/NavyUi';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type State = { kind: 'loading' } | { kind: 'found'; partner: NavyPublicPartner } | { kind: 'unknown' } | { kind: 'offline' };

export default function PublicPartnerPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!UUID_RE.test(id)) {
      setState({ kind: 'unknown' });
      return;
    }
    (async () => {
      try {
        const { data, error } = (await withTimeout(
          (supabase as any).rpc('navy_public_partner', { p_id: id }),
          8000,
          'navy-public-partner'
        )) as any;
        if (cancelled) return;
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : null;
        setState(row ? { kind: 'found', partner: row } : { kind: 'unknown' });
      } catch {
        if (!cancelled) setState({ kind: navigator.onLine ? 'unknown' : 'offline' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const join = () => {
    if (state.kind === 'found') rememberReferrer(id);
    navigate('/navy');
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-navyay-charcoal selection:bg-navyay-yellow selection:text-navyay-charcoal">
      <div className="h-1.5 bg-navyay-yellow" aria-hidden="true" />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex justify-center">
            <NavyWordmark className="h-14 w-auto max-w-full" />
          </div>

          <section className="mt-8 rounded-3xl border border-navyay-charcoal/10 bg-white shadow-soft overflow-hidden" aria-live="polite">
            {state.kind === 'loading' && (
              <div className="flex items-center justify-center py-16" role="status" aria-label="Vérification">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-navyay-charcoal" />
              </div>
            )}

            {state.kind === 'found' && (
              <>
                <div className="bg-navyay-yellow px-5 py-3 flex items-center gap-2 font-semibold">
                  <BadgeCheck className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {state.partner.kind === 'epicier' ? 'Épicerie partenaire validée' : 'Chauffeur partenaire validé'}
                </div>
                <div className="px-5 py-6 text-center">
                  <span className="mx-auto w-14 h-14 rounded-2xl bg-navyay-charcoal text-navyay-yellow flex items-center justify-center">
                    {state.partner.kind === 'epicier' ? <Store className="w-7 h-7" aria-hidden="true" /> : <Truck className="w-7 h-7" aria-hidden="true" />}
                  </span>
                  <h1 className="mt-4 text-2xl font-bold leading-tight break-words">{state.partner.name || 'Partenaire NAVY ay'}</h1>
                  {state.partner.kind === 'chauffeur' && (
                    <>
                      {state.partner.vehicle_type && (
                        <p className="mt-1 text-base text-navyay-charcoal/80">{VEHICLE_LABELS[state.partner.vehicle_type]}</p>
                      )}
                      {state.partner.vehicle_plate && (
                        <p className="mt-4 inline-block rounded-xl bg-navyay-charcoal px-4 py-2 font-mono text-3xl font-bold tracking-wider text-navyay-yellow">
                          {state.partner.vehicle_plate}
                        </p>
                      )}
                      <p className="mt-4 text-base font-semibold">Comparez l’immatriculation avec le véhicule.</p>
                    </>
                  )}
                </div>
              </>
            )}

            {state.kind === 'unknown' && (
              <div className="px-5 py-10 text-center">
                <CircleHelp className="mx-auto w-10 h-10" aria-hidden="true" />
                <p className="mt-3 text-base font-semibold">Ce QR code ne correspond à aucun partenaire actif.</p>
              </div>
            )}

            {state.kind === 'offline' && (
              <div className="px-5 py-10 text-center">
                <WifiOff className="mx-auto w-10 h-10" aria-hidden="true" />
                <p className="mt-3 text-base font-semibold">Pas de réseau : la vérification est impossible pour l’instant.</p>
              </div>
            )}
          </section>

          <button type="button" onClick={join} className={`${btnPrimary} mt-6 w-full`}>
            <UserPlus className="w-5 h-5" aria-hidden="true" />
            Rejoindre NAVY ay
          </button>
          <p className="mt-3 text-center text-sm text-navyay-charcoal/75">
            Envoyer un petit colis à Nosy Be, déposé et retiré dans une épicerie près de chez vous.
          </p>
        </div>
      </main>
    </div>
  );
}
