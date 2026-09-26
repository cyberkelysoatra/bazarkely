/**
 * Client — "Mes colis" (sent) and "À recevoir" (parcels whose recipient phone matches
 * this account) (phase 2A). Read from the phone first, refreshed in the background.
 * Orders kept on the phone (offline) are listed on top until the server has them.
 */
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Package, PackageOpen, Send, Smartphone, Trash2, Wallet } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { discardQueued, myCredit, refreshParcels, useParcels } from '../../services/parcelService';
import type { NavyCreditSummary } from '../../types/parcel';
import { parcelErrorMessage } from '../../utils/parcelRules';
import { formatTime, ParcelCode, ParcelStatusBadge } from './ParcelUi';
import { btnAccent, formatAr, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyOfflineNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

export default function MyParcelsPage({ mode }: { mode: 'sent' | 'received' }) {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const parcels = useParcels();
  const [params] = useSearchParams();
  // Phase 2B1: NAVY credit of the account (own balance only; no partner sees it).
  const [credit, setCredit] = useState<NavyCreditSummary | null>(null);

  useEffect(() => {
    if (!userId || mode !== 'sent') return;
    myCredit(userId)
      .then(({ credit: c }) => setCredit(c))
      .catch(() => undefined);
  }, [userId, mode, isOnline, parcels.refreshedAt]);

  useEffect(() => {
    if (!userId || !isOnline) return;
    void refreshParcels(userId);
    const t = window.setInterval(() => void refreshParcels(userId), 20000);
    return () => window.clearInterval(t);
  }, [userId, isOnline]);

  if (!userId) return null;
  const mine = parcels.userId === userId;
  const rows = mine
    ? parcels.rows.filter((p) => (mode === 'sent' ? p.sender_id === userId : p.recipient_user_id === userId))
    : [];
  const queuedOrders = mode === 'sent' && mine ? parcels.queue.filter((q) => q.op.kind === 'create') : [];
  const active = rows.filter((p) => !['retire', 'annule'].includes(p.status));
  const done = rows.filter((p) => ['retire', 'annule'].includes(p.status));

  return (
    <NavyPage>
      <NavyPageTitle
        icon={mode === 'sent' ? Package : PackageOpen}
        title={mode === 'sent' ? 'Mes colis' : 'À recevoir'}
        subtitle={mode === 'sent' ? 'Les colis que vous avez envoyés.' : 'Les colis envoyés à votre numéro de téléphone.'}
      />
      {!isOnline && <NavyOfflineNotice />}
      {mode === 'sent' && credit && (credit.balance > 0 || credit.movements.length > 0) && (
        <NavyCard className="p-4 space-y-2">
          <p className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold">
              <Wallet className="w-5 h-5" aria-hidden="true" />
              Mon avoir NAVY
            </span>
            <span className="text-2xl font-bold tabular-nums" data-testid="navy-credit-balance">{formatAr(credit.balance)}</span>
          </p>
          <p className="text-sm text-navyay-charcoal/80">
            {credit.balance > 0 ? 'Déduit tout seul de votre prochain envoi.' : 'Votre avoir a été utilisé.'}
          </p>
          <NavyHelp title="D’où vient mon avoir ?">
            <p>Si le chauffeur qui prend votre colis est moins cher que le prix payé, ou si un colis payé est annulé, la différence vous revient en avoir.</p>
            <p>L’avoir est déduit automatiquement de vos prochains envois (et d’un éventuel supplément). Il n’est ni remboursé en espèces, ni transférable.</p>
            {credit.movements.slice(0, 5).map((m, i) => (
              <p key={i} className="flex justify-between gap-3 tabular-nums">
                <span>{m.amount > 0 ? 'Avoir' : 'Utilisé'}{m.parcel_code ? ` · colis ${m.parcel_code}` : ''}</span>
                <span>{m.amount > 0 ? '+' : '−'}{formatAr(Math.abs(m.amount))}</span>
              </p>
            ))}
          </NavyHelp>
        </NavyCard>
      )}
      {params.get('garde') && queuedOrders.length > 0 && (
        <NavyNotice icon={Smartphone}>Commande gardée sur ce téléphone. Elle partira toute seule au retour du réseau, sans doublon.</NavyNotice>
      )}

      {queuedOrders.map((q) => (
        <NavyCard key={q.id} className="p-4 space-y-2">
          <p className="flex items-center gap-2 font-semibold">
            <Smartphone className="w-5 h-5" aria-hidden="true" />
            Commande en attente d’envoi
          </p>
          <p className="text-sm text-navyay-charcoal/80">
            Pour {q.op.kind === 'create' ? q.op.input.recipientName : ''} · préparée à {formatTime(q.createdAt)}
          </p>
          {q.lastError ? (
            <>
              <NavyNotice tone="error">Refusée par le serveur : {parcelErrorMessage(new Error(q.lastError))}</NavyNotice>
              <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold underline" onClick={() => void discardQueued(userId, q.id)}>
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Retirer cette commande
              </button>
            </>
          ) : (
            <p className="text-sm">Le code colis s’affichera dès que la commande sera arrivée chez NAVY ay.</p>
          )}
        </NavyCard>
      ))}

      {!mine || !parcels.loaded ? (
        <NavyLoader />
      ) : rows.length === 0 && queuedOrders.length === 0 ? (
        <NavyCard className="p-6 text-center space-y-3">
          {mode === 'sent' ? <Send className="w-10 h-10 mx-auto" aria-hidden="true" /> : <PackageOpen className="w-10 h-10 mx-auto" aria-hidden="true" />}
          <p className="font-semibold">{mode === 'sent' ? 'Aucun colis envoyé pour l’instant.' : 'Aucun colis à recevoir.'}</p>
          {mode === 'sent' ? (
            <Link to="/navy/envoyer" className={btnAccent}>
              <Send className="w-4 h-4" aria-hidden="true" />
              Envoyer un colis
            </Link>
          ) : (
            <p className="text-sm text-navyay-charcoal/75">Quand quelqu’un vous envoie un colis avec votre numéro, il apparaît ici.</p>
          )}
        </NavyCard>
      ) : (
        <>
          <ParcelList title="En cours" rows={active} mode={mode} />
          <ParcelList title="Terminés" rows={done} mode={mode} />
        </>
      )}

      <NavyHelp title={mode === 'sent' ? 'Suivre mes colis' : 'Recevoir un colis'}>
        {mode === 'sent' ? (
          <>
            <p>Touchez un colis pour voir ses étapes, le code à écrire dessus et le code de retrait à donner au destinataire.</p>
            <p>Accepté = un chauffeur a pris la course ; En route = il a le colis ; Livré = le destinataire l’a retiré.</p>
          </>
        ) : (
          <>
            <p>Quand le colis est « Arrivé », allez à l’épicerie indiquée avec le code de retrait.</p>
            <p>L’épicier saisit le code : ne le donnez à personne d’autre.</p>
          </>
        )}
      </NavyHelp>
    </NavyPage>
  );
}

function ParcelList({ title, rows, mode }: { title: string; rows: ReturnType<typeof useParcels>['rows']; mode: 'sent' | 'received' }) {
  if (!rows.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-navyay-charcoal/75">{title}</h3>
      <ul className="space-y-2">
        {rows.map((p) => (
          <li key={p.id}>
            <Link
              to={`/navy/colis/${p.id}`}
              className="flex items-center gap-3 rounded-2xl border border-navyay-charcoal/10 bg-white px-4 py-3 hover:bg-navyay-yellow/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
            >
              <ParcelCode code={p.code} />
              <span className="flex-1 min-w-0">
                <span className="block font-medium truncate">
                  {mode === 'sent' ? `Pour ${p.recipient_name}` : `De ${p.sender_name ?? 'un client NAVY'}`}
                </span>
                <span className="block text-xs text-navyay-charcoal/75 truncate">
                  {p.depot_name} → {p.arrival_name}
                </span>
              </span>
              <ParcelStatusBadge status={p.status} />
              <ChevronRight className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
