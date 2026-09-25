/**
 * "Mon véhicule" (phase 1A): vehicle information, minimum fare and fare per started
 * 5 km slice, prefilled with the suggested grid of navy_settings (1 000 / 1 000 Ar),
 * with a live example. Rule: fare = max(minimum, fare per slice × started slices).
 */
import { useEffect, useState } from 'react';
import { Calculator, CheckCircle2, Loader2, Save, Smartphone, Truck } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { useNavyProfile } from '../../services/navyProfileStore';
import { updateMyPartnerSettings } from '../../services/partnerService';
import { computeFare, DEFAULT_FARE_PER_5KM, DEFAULT_MIN_FARE, VEHICLE_LABELS } from '../../utils/partnerRules';
import { btnPrimary, formatAr, inputCls, labelCls, NavyCard, NavyHelp, NavyNotice, NavyOfflineNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

const EXAMPLES_KM = [3, 12];

function parseAr(v: string): number | null {
  const n = Number(v.replace(/\s/g, ''));
  return v.trim() === '' || !Number.isFinite(n) || n < 0 ? null : Math.round(n);
}

export default function DriverPage() {
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const isOnline = useOnlineStatus();
  const row = profile.partners.find((p) => p.kind === 'chauffeur' && p.status === 'approved');
  const suggestedMin = profile.settings?.suggested_min_fare ?? DEFAULT_MIN_FARE;
  const suggestedPer5 = profile.settings?.suggested_fare_per_5km ?? DEFAULT_FARE_PER_5KM;
  const [minFare, setMinFare] = useState('');
  const [per5, setPer5] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<'sent' | 'queued' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    // Prefilled with the suggested grid until the driver saves their own prices.
    setMinFare(String(row.min_fare ?? suggestedMin));
    setPer5(String(row.fare_per_5km ?? suggestedPer5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  if (!row || !userId) return null; // guarded by NavyRoleRoute
  const pending = profile.pendingPatchIds.includes(row.id);
  const m = parseAr(minFare);
  const p = parseAr(per5);
  const notSavedYet = row.min_fare == null || row.fare_per_5km == null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (m === null || p === null) {
      setError('Indiquez les deux prix en ariary (un nombre).');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      setSaved(await updateMyPartnerSettings(userId, row.id, { min_fare: m, fare_per_5km: p }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <NavyPage>
      <NavyPageTitle icon={Truck} title="Mon véhicule" subtitle={row.display_name ?? undefined} />
      {!isOnline && <NavyOfflineNotice>Hors ligne : vos changements sont gardés sur ce téléphone et partiront au retour du réseau.</NavyOfflineNotice>}

      <NavyCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-navyay-charcoal px-3 py-2 font-mono text-2xl font-bold tracking-wider text-navyay-yellow">
            {row.vehicle_plate || '—'}
          </span>
          <span className="text-base font-semibold">{row.vehicle_type ? VEHICLE_LABELS[row.vehicle_type] : ''}</span>
        </div>
      </NavyCard>

      <NavyCard className="p-4">
        <form onSubmit={save} className="space-y-3" noValidate>
          <h3 className="font-semibold">Mes prix</h3>
          {notSavedYet && (
            <p className="text-sm text-navyay-charcoal/75">Préremplis avec la grille conseillée. Modifiez-les si besoin, puis enregistrez.</p>
          )}
          <label className={labelCls}>
            Prix minimum d’une course
            <div className="relative">
              <input className={`${inputCls} pr-10`} inputMode="numeric" value={minFare} onChange={(e) => setMinFare(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-sm text-navyay-charcoal/70" aria-hidden="true">Ar</span>
            </div>
            <span className="mt-1 block text-xs text-navyay-charcoal/70">Conseillé : {formatAr(suggestedMin)}</span>
          </label>
          <label className={labelCls}>
            Prix par tranche de 5 km
            <div className="relative">
              <input className={`${inputCls} pr-10`} inputMode="numeric" value={per5} onChange={(e) => setPer5(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-sm text-navyay-charcoal/70" aria-hidden="true">Ar</span>
            </div>
            <span className="mt-1 block text-xs text-navyay-charcoal/70">Conseillé : {formatAr(suggestedPer5)}</span>
          </label>

          <div className="rounded-xl bg-navyay-yellow/20 border border-navyay-yellow px-3 py-3" aria-live="polite">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Calculator className="w-4 h-4" aria-hidden="true" />
              Exemple
            </p>
            <p className="mt-1 text-sm" data-testid="navy-fare-example">
              {m === null || p === null
                ? 'Indiquez vos deux prix pour voir un exemple.'
                : EXAMPLES_KM.map((km) => `${km} km : ${formatAr(computeFare(km, m, p))}`).join(' ; ')}
            </p>
          </div>

          {error && <p className="text-sm text-red-800" role="alert">{error}</p>}
          <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
            Enregistrer mes prix
          </button>
        </form>
      </NavyCard>

      {(saved || pending) && (
        <NavyNotice tone={pending ? 'info' : 'ok'} icon={pending ? Smartphone : CheckCircle2}>
          {pending ? 'Enregistré sur ce téléphone, en attente d’envoi.' : 'Enregistré.'}
        </NavyNotice>
      )}

      <NavyHelp title="Comment le prix est-il calculé ?">
        <p>Le trajet est découpé en tranches de 5 km ; une tranche commencée compte entière.</p>
        <p>Prix = le plus grand entre votre prix minimum et (prix par tranche × nombre de tranches).</p>
        <p>Avec 1 000 Ar et 1 000 Ar : 3 km = 1 tranche = 1 000 Ar ; 12 km = 3 tranches = 3 000 Ar.</p>
        <p>Un nouveau prix s’applique aux commandes suivantes, jamais à un colis déjà commandé.</p>
      </NavyHelp>
    </NavyPage>
  );
}
