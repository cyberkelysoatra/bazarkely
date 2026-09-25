/**
 * "Demander une modification" (phase 1B): a validated grocer / driver asks to change
 * vetted data (name, shop, vehicle, plate, NIF holder, NIF, statistical card, photos).
 * Prefilled form; only what changed is sent. New photos are compressed like in 1A.
 * The request goes back to an operator; the current profile stays active meanwhile.
 * Needs the network to send (replay-safe: same request id at every attempt).
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loader2, PencilLine, Send, WifiOff } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { useScrollToError } from '../../../../hooks/useScrollToError';
import { useNavyProfile } from '../../services/navyProfileStore';
import { changeErrorMessage, getMyLastChange, submitPartnerChange } from '../../services/changeService';
import type { NifHolderType, PartnerChangeFields, PartnerKind, PhotoSlot, VehicleType } from '../../types/partner';
import { normalizePlate, PHOTO_LABELS, PHOTO_SLOTS, VEHICLE_LABELS, VEHICLE_TYPES } from '../../utils/partnerRules';
import PhotoField from '../ui/PhotoField';
import { btnPrimary, inputCls, labelCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

type Form = {
  display_name: string;
  shop_name: string;
  vehicle_type: VehicleType | '';
  vehicle_plate: string;
  nif_holder_type: NifHolderType;
  nif_holder_name: string;
  nif: string;
  stat_number: string;
};

const NIF_HOLDERS: { value: NifHolderType; label: string }[] = [
  { value: 'self', label: 'Moi' },
  { value: 'owner', label: 'Le propriétaire' },
  { value: 'cooperative', label: 'Une coopérative' },
];

export default function PartnerChangePage() {
  const { kind: kindParam } = useParams();
  const kind: PartnerKind | null = kindParam === 'epicier' || kindParam === 'chauffeur' ? kindParam : null;
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const { error, setError, errorRef, errorFlash } = useScrollToError();
  const row = kind ? profile.partners.find((p) => p.kind === kind && (p.status === 'approved' || p.status === 'suspended')) : undefined;
  const [form, setForm] = useState<Form | null>(null);
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlot, Blob>>>({});
  const [pendingExists, setPendingExists] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!row || form) return;
    setForm({
      display_name: row.display_name ?? '',
      shop_name: row.shop_name ?? '',
      vehicle_type: row.vehicle_type ?? '',
      vehicle_plate: row.vehicle_plate ?? '',
      nif_holder_type: row.nif_holder_type ?? 'self',
      nif_holder_name: row.nif_holder_name ?? '',
      nif: row.nif ?? '',
      stat_number: row.stat_number ?? '',
    });
  }, [row, form]);

  useEffect(() => {
    if (!row || !userId) return;
    void getMyLastChange(userId, row.id).then((c) => setPendingExists(c?.status === 'pending'));
  }, [row?.id, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const changes = useMemo<PartnerChangeFields>(() => {
    if (!row || !form) return {};
    const out: PartnerChangeFields = {};
    const txt = (k: 'display_name' | 'shop_name' | 'nif' | 'stat_number') => {
      const v = form[k].trim();
      if (v !== (row[k] ?? '')) out[k] = v;
    };
    txt('display_name');
    txt('nif');
    if (kind === 'epicier') {
      txt('shop_name');
      txt('stat_number');
    } else {
      if (form.vehicle_type && form.vehicle_type !== row.vehicle_type) out.vehicle_type = form.vehicle_type;
      const plate = normalizePlate(form.vehicle_plate);
      if (plate !== (row.vehicle_plate ?? '')) out.vehicle_plate = plate;
      if (form.nif_holder_type !== (row.nif_holder_type ?? 'self')) out.nif_holder_type = form.nif_holder_type;
      const holder = form.nif_holder_type === 'self' ? null : form.nif_holder_name.trim();
      if ((holder ?? null) !== (row.nif_holder_name ?? null)) out.nif_holder_name = holder;
    }
    return out;
  }, [row, form, kind]);

  if (!kind) return <Navigate to="/navy" replace />;
  if (!profile.loadedLocal) return <NavyLoader />;
  if (!row) return <Navigate to="/navy" replace />;
  if (!form || pendingExists === null) return <NavyLoader />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const isGrocer = kind === 'epicier';
  const newPhotos = Object.keys(photos).length;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Object.keys(changes).length && !newPhotos) {
      setError('Vous n’avez rien modifié.');
      return;
    }
    if (isGrocer && !form.shop_name.trim()) return setError('Indiquez le nom de la boutique.');
    if (!form.display_name.trim()) return setError(isGrocer ? 'Indiquez le nom du gérant.' : 'Indiquez votre nom.');
    if (!isGrocer && form.vehicle_type !== 'velo' && !form.vehicle_plate.trim()) return setError('Indiquez l’immatriculation du véhicule.');
    if (!isGrocer && form.nif_holder_type !== 'self' && !form.nif_holder_name.trim()) {
      return setError(form.nif_holder_type === 'owner' ? 'Indiquez le nom du propriétaire.' : 'Indiquez le nom de la coopérative.');
    }
    if (!form.nif.trim()) return setError('Indiquez le numéro NIF.');
    if (!isOnline) return setError('L’envoi demande une connexion. Vos saisies restent sur cet écran : réessayez au retour du réseau.');
    setError(null);
    setSending(true);
    try {
      await submitPartnerChange(userId!, row, changes, photos);
      navigate(kind === 'epicier' ? '/navy/epicerie' : '/navy/vehicule', { replace: true });
    } catch (err) {
      setError(changeErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <NavyPage>
      <NavyPageTitle
        icon={PencilLine}
        title={isGrocer ? 'Modifier ma boutique' : 'Modifier mon véhicule'}
        subtitle="Votre profil actuel reste actif jusqu’à la validation."
      />
      {pendingExists && (
        <NavyNotice tone="warn">Une demande de modification est déjà en attente. Attendez la réponse de l’opératrice.</NavyNotice>
      )}
      {!isOnline && (
        <NavyNotice icon={WifiOff}>Hors ligne : vous pouvez préparer la modification, l’envoi se fera au retour du réseau.</NavyNotice>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <NavyCard className="p-4 space-y-3">
          {isGrocer && (
            <label className={labelCls}>
              Nom de la boutique
              <input className={inputCls} value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} />
            </label>
          )}
          <label className={labelCls}>
            {isGrocer ? 'Nom du gérant' : 'Votre nom'}
            <input className={inputCls} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} />
          </label>
          {!isGrocer && (
            <>
              <label className={labelCls}>
                Type de véhicule
                <select className={inputCls} value={form.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value as VehicleType)}>
                  {VEHICLE_TYPES.map((v) => (
                    <option key={v} value={v}>
                      {VEHICLE_LABELS[v]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelCls}>
                Immatriculation
                <input
                  className={`${inputCls} uppercase`}
                  value={form.vehicle_plate}
                  onChange={(e) => set('vehicle_plate', e.target.value)}
                  autoCapitalize="characters"
                />
              </label>
              <fieldset>
                <legend className={labelCls}>Qui détient le NIF ?</legend>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {NIF_HOLDERS.map((h) => (
                    <label
                      key={h.value}
                      className={`flex items-center justify-center rounded-xl border px-2 py-2.5 text-center text-sm font-medium cursor-pointer focus-within:ring-2 focus-within:ring-navyay-yellow ${
                        form.nif_holder_type === h.value
                          ? 'border-navyay-charcoal bg-navyay-charcoal text-navyay-yellow'
                          : 'border-navyay-charcoal/25 hover:bg-navyay-yellow/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name="nif_holder"
                        value={h.value}
                        checked={form.nif_holder_type === h.value}
                        onChange={() => set('nif_holder_type', h.value)}
                        className="sr-only"
                      />
                      {h.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {form.nif_holder_type !== 'self' && (
                <label className={labelCls}>
                  {form.nif_holder_type === 'owner' ? 'Nom du propriétaire' : 'Nom de la coopérative'}
                  <input className={inputCls} value={form.nif_holder_name} onChange={(e) => set('nif_holder_name', e.target.value)} />
                </label>
              )}
            </>
          )}
          <label className={labelCls}>
            Numéro NIF
            <input className={inputCls} value={form.nif} onChange={(e) => set('nif', e.target.value)} inputMode="numeric" />
          </label>
          {isGrocer && (
            <label className={labelCls}>
              Numéro de la carte statistique
              <input className={inputCls} value={form.stat_number} onChange={(e) => set('stat_number', e.target.value)} />
            </label>
          )}
        </NavyCard>

        <section className="space-y-3" aria-label="Nouvelles photos">
          <h3 className="font-semibold px-1">Nouvelles photos (seulement si elles changent)</h3>
          {PHOTO_SLOTS[kind].map((slot) => (
            <PhotoField
              key={slot}
              label={PHOTO_LABELS[slot]}
              hint={photos[slot] ? undefined : 'La photo actuelle est gardée si vous n’en prenez pas de nouvelle.'}
              blob={photos[slot]}
              onChange={(b) => setPhotos((p) => ({ ...p, [slot]: b }))}
            />
          ))}
        </section>

        {error && (
          <div
            ref={errorRef}
            tabIndex={-1}
            role="alert"
            className={`rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 outline-none ${errorFlash ? 'animate-error-pulse' : ''}`}
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={sending || !!pendingExists} className={`${btnPrimary} w-full`}>
          {sending ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Send className="w-5 h-5" aria-hidden="true" />}
          Envoyer la demande de modification
        </button>
      </form>

      <NavyHelp title="Comment se passe une modification ?">
        <p>Seuls les champs changés et les nouvelles photos sont envoyés. Une opératrice compare l’ancien et le nouveau.</p>
        <p>Tant qu’elle n’a pas validé, votre profil actuel reste actif{isGrocer ? '' : ' et votre QR code montre l’ancienne plaque'}.</p>
        <p>Après validation, les anciennes photos remplacées sont supprimées.</p>
      </NavyHelp>
    </NavyPage>
  );
}
