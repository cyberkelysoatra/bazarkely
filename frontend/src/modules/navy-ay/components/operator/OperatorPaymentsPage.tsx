/**
 * Operator — "Paiements" (phase 2A): Orange Money references typed by clients, to be
 * checked on CyberKELY's phone. Validate → the driver search starts (if the parcel is
 * already dropped); refuse → reason required, the client can send another reference.
 * ONLINE ONLY (payment data is never kept on the device).
 */
import { useCallback, useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Loader2, RefreshCw, WifiOff, XCircle } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { decidePayment, paymentsToCheck, refreshParcels, type PaymentToCheck } from '../../services/parcelService';
import { parcelErrorMessage } from '../../utils/parcelRules';
import { formatTime, ParcelCode } from '../parcel/ParcelUi';
import { btnAccent, btnSecondary, formatAr, inputCls, labelCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

export default function OperatorPaymentsPage() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const [list, setList] = useState<PaymentToCheck[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await paymentsToCheck());
      setError(null);
    } catch (err) {
      setError(parcelErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    void load();
    const t = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(t);
  }, [isOnline, load]);

  if (!isOnline) {
    return (
      <NavyPage>
        <NavyPageTitle icon={Banknote} title="Paiements" />
        <NavyNotice icon={WifiOff}>Cet écran demande une connexion.</NavyNotice>
      </NavyPage>
    );
  }

  return (
    <NavyPage>
      <NavyPageTitle icon={Banknote} title="Paiements" subtitle="Références Orange Money à vérifier sur le téléphone de CyberKELY." />
      <button type="button" className={`${btnSecondary} w-full`} onClick={() => void load()}>
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Actualiser
      </button>
      {error && <NavyNotice tone="error">{error}</NavyNotice>}
      {list === null ? (
        !error && <NavyLoader />
      ) : list.length === 0 ? (
        <NavyCard className="p-6 text-center">
          <p className="font-semibold">Aucun paiement à vérifier.</p>
        </NavyCard>
      ) : (
        list.map((pay) => (
          <PaymentCard
            key={pay.id}
            pay={pay}
            onDone={() => {
              void load();
              if (userId) void refreshParcels(userId);
            }}
          />
        ))
      )}
      <NavyHelp title="Comment vérifier un paiement ?">
        <p>Ouvrez les SMS Orange Money reçus sur le téléphone de CyberKELY. Cherchez la référence et vérifiez que le montant reçu est bien celui indiqué.</p>
        <p>Validez seulement si les deux correspondent. Aucun chauffeur n’est appelé avant votre validation.</p>
        <p>En cas de refus, écrivez un motif simple (par exemple « référence introuvable ») : le client pourra renvoyer une référence.</p>
      </NavyHelp>
    </NavyPage>
  );
}

function PaymentCard({ pay, onDone }: { pay: PaymentToCheck; onDone: () => void }) {
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const decide = async (decision: 'valider' | 'refuser') => {
    if (decision === 'refuser' && !reason.trim()) {
      setMsg({ tone: 'error', text: 'Indiquez un motif.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await decidePayment(pay.id, decision, decision === 'refuser' ? reason.trim() : null);
      setMsg({ tone: 'ok', text: decision === 'valider' ? 'Paiement validé.' : 'Paiement refusé.' });
      onDone();
    } catch (err) {
      setMsg({ tone: 'error', text: parcelErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <NavyCard className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          {pay.parcel && <ParcelCode code={pay.parcel.code} />}
          <p className="text-sm">Client : {pay.parcel?.sender_name ?? '—'} · pour {pay.parcel?.recipient_name ?? '—'}</p>
          <p className="text-xs text-navyay-charcoal/75">Envoyée à {formatTime(pay.submitted_at)}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums">{formatAr(pay.amount)}</p>
      </div>
      <p className="rounded-xl bg-navyay-charcoal/[0.05] px-3 py-2">
        <span className="block text-xs text-navyay-charcoal/75">Référence</span>
        <span className="font-mono text-lg font-semibold tracking-wide break-all">{pay.reference}</span>
      </p>
      {refusing && (
        <label className={labelCls}>
          Motif du refus
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex. référence introuvable" />
        </label>
      )}
      {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={btnSecondary} disabled={busy} onClick={() => (refusing ? void decide('refuser') : setRefusing(true))}>
          <XCircle className="w-5 h-5" aria-hidden="true" />
          {refusing ? 'Confirmer le refus' : 'Refuser'}
        </button>
        <button type="button" className={btnAccent} disabled={busy} onClick={() => void decide('valider')}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-5 h-5" aria-hidden="true" />}
          Valider
        </button>
      </div>
    </NavyCard>
  );
}
