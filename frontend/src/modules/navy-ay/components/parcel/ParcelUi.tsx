/**
 * Shared building blocks of the parcel screens (phase 2A): status badge, the three
 * milestones (Accepté / En route / Livré), timeline of the journal, notification
 * permission card, QR scanner (driver's NAVY QR at hand-over).
 * Charter: yellow #E9B824 + charcoal, text on yellow always charcoal; lucide icons.
 */
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertTriangle,
  Ban,
  Bell,
  BellOff,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  ScanLine,
  Store,
  Truck,
  X,
} from 'lucide-react';
import notificationService from '../../../../services/notificationService';
import type { NavyParcelEvent, NavyParcelRow, ParcelStatus } from '../../types/parcel';
import { eventLabel, milestones, STATUS_LABELS } from '../../utils/parcelRules';
import { btnAccent, btnSecondary, NavyCard } from '../ui/NavyUi';

const STATUS_CLS: Record<ParcelStatus, string> = {
  commande: 'bg-navyay-charcoal/10 text-navyay-charcoal',
  depose: 'bg-navyay-yellow text-navyay-charcoal',
  chauffeur_trouve: 'bg-navyay-yellow text-navyay-charcoal',
  pris_en_charge: 'bg-navyay-charcoal text-white',
  arrive: 'bg-emerald-100 text-emerald-900',
  retire: 'bg-emerald-100 text-emerald-900',
  annule: 'bg-red-100 text-red-900',
};

const STATUS_ICON: Record<ParcelStatus, typeof Package> = {
  commande: Clock,
  depose: Store,
  chauffeur_trouve: Truck,
  pris_en_charge: Truck,
  arrive: MapPin,
  retire: PackageCheck,
  annule: Ban,
};

export function ParcelStatusBadge({ status }: { status: ParcelStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_CLS[status]}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Big parcel code (written with a marker on the parcel). */
export function ParcelCode({ code, size = 'md' }: { code: string; size?: 'md' | 'xl' }) {
  return (
    <span
      className={`inline-block font-mono font-bold tabular-nums tracking-[0.2em] ${
        size === 'xl' ? 'text-6xl sm:text-7xl leading-none' : 'text-lg'
      }`}
      aria-label={`Code colis ${code.split('').join(' ')}`}
    >
      {code}
    </span>
  );
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${time}`;
}

/** Accepté / En route / Livré. */
export function ParcelMilestones({ parcel }: { parcel: NavyParcelRow }) {
  if (parcel.status === 'annule') return null;
  const steps = milestones(parcel);
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Étapes du colis">
      {steps.map((s) => (
        <li
          key={s.key}
          className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center ${
            s.done ? 'bg-navyay-yellow text-navyay-charcoal' : 'bg-navyay-charcoal/[0.05] text-navyay-charcoal/75'
          }`}
        >
          {s.done ? <CheckCircle2 className="w-6 h-6" aria-hidden="true" /> : <Circle className="w-6 h-6" aria-hidden="true" />}
          <span className="text-sm font-semibold">{s.label}</span>
          <span className="text-xs tabular-nums min-h-[1rem]">{s.done ? formatTime(s.time) : ''}</span>
          <span className="sr-only">{s.done ? 'fait' : 'à venir'}</span>
        </li>
      ))}
    </ol>
  );
}

/** Journal of the parcel, oldest first (who, when, what). */
export function ParcelTimeline({ events }: { events: NavyParcelEvent[] }) {
  if (!events.length) return <p className="text-sm text-navyay-charcoal/75">Aucune étape enregistrée pour l’instant.</p>;
  const who: Record<NavyParcelEvent['actor_role'], string> = {
    client: 'Client',
    epicier: 'Épicier',
    chauffeur: 'Chauffeur',
    operatrice: 'Opératrice',
    systeme: 'NAVY ay',
  };
  return (
    <ol className="relative space-y-3 pl-5 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-navyay-charcoal/20">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-navyay-yellow ring-1 ring-navyay-charcoal/30" aria-hidden="true" />
          <p className="text-sm font-medium leading-snug">{eventLabel(e.event)}</p>
          <p className="text-xs text-navyay-charcoal/75">
            <span className="tabular-nums">{formatTime(e.at)}</span> · {who[e.actor_role]}
            {e.note ? ` · ${e.note}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Notification permission, asked ONLY on a gesture of the person (never at launch).
 * Reuses the web-push foundation (notificationService.requestPermission subscribes).
 */
export function NavyNotifyPrompt({ why }: { why: string }) {
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Already granted: make sure this browser is subscribed (silent, never a prompt).
    if (perm === 'granted') void notificationService.ensurePushSubscription();
  }, [perm]);

  if (perm === 'granted') return null;
  if (perm === 'unsupported') {
    return (
      <NavyCard className="p-4 flex items-start gap-3">
        <BellOff className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm">Ce téléphone ne reçoit pas les notifications dans le navigateur. Sur iPhone, installez l’application sur l’écran d’accueil.</p>
      </NavyCard>
    );
  }
  const ask = async () => {
    setBusy(true);
    try {
      setPerm(await notificationService.requestPermission());
    } catch {
      setPerm(Notification.permission);
    } finally {
      setBusy(false);
    }
  };
  return (
    <NavyCard className="p-4 space-y-3 border-navyay-yellow">
      <p className="flex items-start gap-3 text-sm">
        <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <span>{why}</span>
      </p>
      {perm === 'denied' ? (
        <p className="text-sm text-navyay-charcoal/80">
          Les notifications sont bloquées. Ouvrez les réglages du navigateur (le cadenas à côté de l’adresse) pour les autoriser.
        </p>
      ) : (
        <button type="button" className={`${btnAccent} w-full`} disabled={busy} onClick={() => void ask()}>
          {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Bell className="w-5 h-5" aria-hidden="true" />}
          Activer les notifications
        </button>
      )}
    </NavyCard>
  );
}

/** Camera QR scanner (NAVY charter). Calls onResult once, then stops. */
export function NavyQrScanner({ onResult, onClose, hint }: { onResult: (text: string) => void; onClose: () => void; hint: string }) {
  const elementId = 'navy-qr-reader';
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(elementId, { verbose: false });
    const stop = async () => {
      try {
        if (scanner.getState && scanner.getState() === 2) await scanner.stop();
        await scanner.clear();
      } catch {
        /* ignore */
      }
    };
    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (handledRef.current) return;
          handledRef.current = true;
          void stop().then(() => {
            if (!cancelled) onResult(text);
          });
        },
        () => {
          /* per-frame decoding misses: ignored */
        }
      )
      .catch((e) => {
        if (!cancelled) {
          setError(
            String(e).includes('NotAllowedError')
              ? 'Accès à la caméra refusé. Choisissez le chauffeur dans la liste.'
              : 'Caméra indisponible. Choisissez le chauffeur dans la liste.'
          );
        }
      });
    return () => {
      cancelled = true;
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60] bg-navyay-charcoal/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Scanner un QR">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-navyay-charcoal">
        <div className="flex items-center justify-between px-4 py-3 border-b border-navyay-charcoal/10">
          <h3 className="inline-flex items-center gap-2 font-semibold">
            <ScanLine className="w-5 h-5" aria-hidden="true" />
            Scanner le QR du chauffeur
          </h3>
          <button type="button" onClick={onClose} className="p-2 -mr-2 rounded-lg hover:bg-navyay-yellow/20" aria-label="Fermer">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-3">
          {error ? (
            <p className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900" role="alert">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : (
            <>
              <div id={elementId} className="w-full overflow-hidden rounded-xl bg-black" />
              <p className="mt-2 text-center text-sm text-navyay-charcoal/75">{hint}</p>
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-navyay-charcoal/10">
          <button type="button" onClick={onClose} className={`${btnSecondary} w-full`}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/** Partner id carried by a NAVY QR (https://…/navy/p/<id>), else null. */
export function partnerIdFromQr(text: string): string | null {
  const m = /\/navy\/p\/([0-9a-f-]{36})/i.exec(text);
  return m ? m[1].toLowerCase() : null;
}
