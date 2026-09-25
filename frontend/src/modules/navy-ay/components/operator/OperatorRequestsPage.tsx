/**
 * Operator — "Demandes" (phase 1A): pending requests, oldest first. ONLINE ONLY
 * (other people's data is never cached on the device).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Inbox, PencilLine, RefreshCw, Store, Truck, WifiOff } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { listChanges, listPartners, operatorErrorMessage, type ChangeWithPartner } from '../../services/operatorService';
import { setNavyProfile } from '../../services/navyProfileStore';
import type { NavyPartnerRow } from '../../types/partner';
import { KIND_LABELS } from '../../utils/partnerRules';
import { btnSecondary, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

function since(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'hier';
  return `il y a ${days} jours`;
}

export default function OperatorRequestsPage() {
  const isOnline = useOnlineStatus();
  const [rows, setRows] = useState<NavyPartnerRow[] | null>(null);
  const [changes, setChanges] = useState<ChangeWithPartner[]>([]);
  const [tab, setTab] = useState<'new' | 'changes'>('new');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, chg] = await Promise.all([listPartners({ statuses: ['pending'] }), listChanges('pending')]);
      setRows(data);
      setChanges(chg);
      setNavyProfile({ pendingCount: data.length + chg.length });
    } catch (err) {
      setError(operatorErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  return (
    <NavyPage>
      <NavyPageTitle icon={Inbox} title="Demandes" subtitle="Dossiers en attente, les plus anciens d’abord." />

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Type de demande">
        {([
          ['new', 'Nouvelles', rows?.length ?? 0],
          ['changes', 'Modifications', changes.length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
              tab === key ? 'border-navyay-charcoal bg-navyay-charcoal text-navyay-yellow' : 'border-navyay-charcoal/25 bg-white hover:bg-navyay-yellow/15'
            }`}
          >
            {label}
            {count > 0 && (
              <span className={`min-w-[20px] rounded-full px-1.5 text-xs leading-5 tabular-nums ${tab === key ? 'bg-navyay-yellow text-navyay-charcoal' : 'bg-navyay-charcoal text-white'}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'changes' && isOnline && !error && rows !== null ? (
        changes.length === 0 ? (
          <NavyCard className="px-5 py-10 text-center">
            <PencilLine className="mx-auto w-10 h-10 text-navyay-charcoal/60" aria-hidden="true" />
            <p className="mt-3 font-semibold">Aucune modification en attente</p>
            <p className="mt-1 text-sm text-navyay-charcoal/70">Les demandes de changement de véhicule ou de boutique apparaîtront ici.</p>
          </NavyCard>
        ) : (
          <ul className="space-y-2">
            {changes.map((c) => {
              const p = c.partner;
              const Icon = p?.kind === 'epicier' ? Store : Truck;
              return (
                <li key={c.id}>
                  <Link
                    to={`/navy/operatrice/modifications/${c.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-navyay-charcoal/10 bg-white px-4 py-3 hover:bg-navyay-yellow/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
                  >
                    <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-navyay-yellow text-navyay-charcoal flex items-center justify-center">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">
                        {(p?.kind === 'epicier' ? p?.shop_name || p?.display_name : p?.display_name) || 'Partenaire'}
                      </span>
                      <span className="block text-sm text-navyay-charcoal/70 truncate">
                        Modification · {since(c.created_at)}
                      </span>
                    </span>
                    <ChevronRight className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )
      ) : !isOnline ? (
        <NavyNotice icon={WifiOff}>Cet écran demande une connexion. Les demandes s’afficheront au retour du réseau.</NavyNotice>
      ) : error ? (
        <>
          <NavyNotice tone="error">{error}</NavyNotice>
          <button type="button" className={btnSecondary} onClick={() => void load()}>
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Réessayer
          </button>
        </>
      ) : rows === null ? (
        <NavyLoader />
      ) : rows.length === 0 ? (
        <NavyCard className="px-5 py-10 text-center">
          <Inbox className="mx-auto w-10 h-10 text-navyay-charcoal/60" aria-hidden="true" />
          <p className="mt-3 font-semibold">Aucune demande en attente</p>
          <p className="mt-1 text-sm text-navyay-charcoal/70">Les nouveaux dossiers apparaîtront ici.</p>
        </NavyCard>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const Icon = r.kind === 'epicier' ? Store : Truck;
            return (
              <li key={r.id}>
                <Link
                  to={`/navy/operatrice/demandes/${r.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-navyay-charcoal/10 bg-white px-4 py-3 hover:bg-navyay-yellow/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
                >
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-navyay-charcoal text-navyay-yellow flex items-center justify-center">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold truncate">
                      {r.kind === 'epicier' ? r.shop_name || r.display_name : r.display_name}
                    </span>
                    <span className="block text-sm text-navyay-charcoal/70 truncate">
                      {KIND_LABELS[r.kind]} · {since(r.created_at)}
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {isOnline && rows && !loading && (rows.length > 0 || changes.length > 0) && (
        <button type="button" className={btnSecondary} onClick={() => void load()}>
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Actualiser
        </button>
      )}

      <NavyHelp title="Comment traiter une demande ?">
        <p>Ouvrez le dossier, vérifiez que les photos sont lisibles et correspondent aux informations saisies.</p>
        <p>Validez si tout est bon. Sinon, refusez en choisissant un motif. « À corriger » : la personne corrige et renvoie. « Définitif » : les photos sont supprimées et la demande ne peut plus être renvoyée.</p>
        <p>L’onglet « Modifications » regroupe les partenaires déjà validés qui changent de véhicule, de boutique ou de papiers : l’ancien et le nouveau sont affichés côte à côte.</p>
        <p>Les pièces d’identité sont des données personnelles : ne les copiez pas, ne les partagez pas.</p>
      </NavyHelp>
    </NavyPage>
  );
}
