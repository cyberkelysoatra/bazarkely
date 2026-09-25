/**
 * Operator — "Partenaires" (phase 1A): approved / suspended grocers and drivers,
 * filtered by type and state, with Suspend / Reactivate (reason required to suspend).
 * ONLINE ONLY.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, PauseCircle, PlayCircle, RefreshCw, Store, Truck, Users, WifiOff } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { decidePartner, listPartners, operatorErrorMessage } from '../../services/operatorService';
import type { NavyPartnerRow, PartnerKind, PartnerStatus } from '../../types/partner';
import { VEHICLE_LABELS } from '../../utils/partnerRules';
import { btnPrimary, btnSecondary, inputCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle, StatusBadge } from '../ui/NavyUi';

type KindFilter = PartnerKind | 'all';
type StatusFilter = 'approved' | 'suspended' | 'all';

const chip = (active: boolean) =>
  `rounded-full px-3.5 py-2.5 text-sm font-medium border focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
    active ? 'bg-navyay-charcoal text-navyay-yellow border-navyay-charcoal' : 'bg-white border-navyay-charcoal/25 hover:bg-navyay-yellow/15'
  }`;

export default function OperatorPartnersPage() {
  const isOnline = useOnlineStatus();
  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [rows, setRows] = useState<NavyPartnerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const statuses: PartnerStatus[] = status === 'all' ? ['approved', 'suspended'] : [status];
      setRows(await listPartners({ statuses, kind }));
    } catch (err) {
      setError(operatorErrorMessage(err));
    }
  }, [kind, status]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const act = async (row: NavyPartnerRow) => {
    const suspending = row.status === 'approved';
    if (suspending && !reason.trim()) {
      setError('Indiquez le motif de la suspension.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await decidePartner(row.id, suspending ? 'suspend' : 'reactivate', suspending ? reason.trim() : undefined);
      setActing(null);
      setReason('');
      await load();
    } catch (err) {
      setError(operatorErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <NavyPage>
      <NavyPageTitle icon={Users} title="Partenaires" subtitle="Épiciers et chauffeurs validés." />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Type">
        {(['all', 'epicier', 'chauffeur'] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} className={chip(kind === k)} onClick={() => setKind(k)}>
            {k === 'all' ? 'Tous' : k === 'epicier' ? 'Épiciers' : 'Chauffeurs'}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="État">
        {(['all', 'approved', 'suspended'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} className={chip(status === s)} onClick={() => setStatus(s)}>
            {s === 'all' ? 'Tous les états' : s === 'approved' ? 'Actifs' : 'Suspendus'}
          </button>
        ))}
      </div>

      {error && <NavyNotice tone="error">{error}</NavyNotice>}

      {!isOnline ? (
        <NavyNotice icon={WifiOff}>Cet écran demande une connexion. La liste s’affichera au retour du réseau.</NavyNotice>
      ) : rows === null ? (
        error ? (
          <button type="button" className={btnSecondary} onClick={() => void load()}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Réessayer
          </button>
        ) : (
          <NavyLoader />
        )
      ) : rows.length === 0 ? (
        <NavyCard className="px-5 py-10 text-center">
          <Users className="mx-auto w-10 h-10 text-navyay-charcoal/60" aria-hidden="true" />
          <p className="mt-3 font-semibold">Aucun partenaire pour ce filtre</p>
        </NavyCard>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const Icon = r.kind === 'epicier' ? Store : Truck;
            const open = acting === r.id;
            return (
              <li key={r.id} className="rounded-2xl border border-navyay-charcoal/10 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-navyay-charcoal text-navyay-yellow flex items-center justify-center">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">{r.kind === 'epicier' ? r.shop_name || r.display_name : r.display_name}</span>
                    <span className="block text-sm text-navyay-charcoal/70 truncate">
                      {r.kind === 'chauffeur'
                        ? `${r.vehicle_type ? VEHICLE_LABELS[r.vehicle_type] : ''} ${r.vehicle_plate ?? ''}`
                        : r.is_open ? 'Ouvert' : 'Fermé'}
                      {r.phone ? ` · ${r.phone}` : ''}
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                {r.status === 'suspended' && r.rejection_reason && (
                  <p className="mt-2 text-sm text-navyay-charcoal/75">Motif : {r.rejection_reason}</p>
                )}
                {!open ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow rounded"
                    onClick={() => {
                      setActing(r.id);
                      setReason('');
                      setError(null);
                    }}
                  >
                    {r.status === 'approved' ? <PauseCircle className="w-4 h-4" aria-hidden="true" /> : <PlayCircle className="w-4 h-4" aria-hidden="true" />}
                    {r.status === 'approved' ? 'Suspendre' : 'Réactiver'}
                  </button>
                ) : (
                  <div className="mt-3 space-y-2">
                    {r.status === 'approved' && (
                      <label className="block text-sm font-medium">
                        Motif de la suspension
                        <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
                      </label>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className={btnPrimary} disabled={busy} onClick={() => void act(r)}>
                        {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                        {r.status === 'approved' ? 'Suspendre' : 'Réactiver'}
                      </button>
                      <button type="button" className={btnSecondary} disabled={busy} onClick={() => setActing(null)}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <NavyHelp title="Suspendre un partenaire">
        <p>Une suspension retire le partenaire du réseau : son rôle disparaît de son application et son QR code n’est plus reconnu.</p>
        <p>Le motif est visible par le partenaire. Vous pouvez le réactiver à tout moment.</p>
      </NavyHelp>
    </NavyPage>
  );
}
