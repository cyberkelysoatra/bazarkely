/**
 * Grocer / driver request form (phase 1A), also used to correct a refused request.
 *
 * Offline-first: every change is saved on the phone as a draft (with the compressed
 * photos). The request id is created once on the phone and reused at every attempt.
 * Without network, "Envoyer" keeps the request on the phone and it leaves by itself
 * when the network comes back (or when the person presses "Réessayer").
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Loader2, Send, Store, Truck, WifiOff } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { useScrollToError } from '../../../../hooks/useScrollToError';
import { useNavyProfile } from '../../services/navyProfileStore';
import { getDraft, saveDraft, signedDocumentUrls, submitDraft } from '../../services/partnerService';
import type { NifHolderType, PartnerFormFields, PartnerKind, PhotoSlot, VehicleType } from '../../types/partner';
import {
  emptyFormFields,
  fieldsFromRow,
  PHOTO_LABELS,
  PHOTO_SLOTS,
  SLOT_COLUMN,
  validateRequest,
  VEHICLE_LABELS,
  VEHICLE_TYPES,
} from '../../utils/partnerRules';
import PhotoField from '../ui/PhotoField';
import ShopPositionField from './ShopPositionField';
import { btnPrimary, inputCls, labelCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

const PHOTO_HINTS: Partial<Record<PhotoSlot, string>> = {
  id_doc: 'CIN ou passeport, bien lisible, sans reflet.',
  vehicle_photo: 'La plaque d’immatriculation doit être visible.',
  shop_photo: 'La devanture, de jour.',
};

const NIF_HOLDERS: { value: NifHolderType; label: string }[] = [
  { value: 'self', label: 'Moi' },
  { value: 'owner', label: 'Le propriétaire' },
  { value: 'cooperative', label: 'Une coopérative' },
];

export default function PartnerRequestPage() {
  const { kind: kindParam } = useParams();
  const kind: PartnerKind | null = kindParam === 'epicier' || kindParam === 'chauffeur' ? kindParam : null;
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const { error, setError, errorRef, errorFlash } = useScrollToError();

  const row = kind && profile.userId === userId ? profile.partners.find((p) => p.kind === kind) : undefined;
  const [fields, setFields] = useState<PartnerFormFields | null>(null);
  const [photos, setPhotos] = useState<Partial<Record<PhotoSlot, Blob>>>({});
  const [existingUrls, setExistingUrls] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const changedSlots = useRef<Set<PhotoSlot>>(new Set());
  const loadedRef = useRef(false);
  // Only a real change creates a draft on the phone (a visit alone does not).
  const dirtyRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  // Initial form: local draft first, else the refused request, else empty.
  useEffect(() => {
    if (!kind || !userId || loadedRef.current || !profile.loadedLocal) return;
    loadedRef.current = true;
    void getDraft(userId, kind).then((d) => {
      if (d) {
        setFields(d.fields);
        setPhotos(d.photos);
      } else {
        setFields(row ? fieldsFromRow(row) : emptyFormFields());
      }
    });
  }, [kind, userId, profile.loadedLocal, row]);

  // Photos already on the server (correction): short-lived signed URLs.
  useEffect(() => {
    if (!row || !isOnline) return;
    const paths = PHOTO_SLOTS[row.kind].map((s) => row[SLOT_COLUMN[s]] as string | null).filter(Boolean) as string[];
    signedDocumentUrls(paths, 300)
      .then(setExistingUrls)
      .catch(() => setExistingUrls({}));
  }, [row, isOnline]);

  // Auto-save on the phone (debounced).
  useEffect(() => {
    if (!fields || !kind || !userId || !dirtyRef.current) return;
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      void saveDraft(userId, kind, fields, photos, row?.id, [...changedSlots.current]).then(() => {
        changedSlots.current.clear();
      });
    }, 500);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    };
  }, [fields, photos, kind, userId, row?.id]);

  const hasPhoto = useMemo(
    () => (slot: PhotoSlot) => !!photos[slot] || !!(row && row[SLOT_COLUMN[slot]]),
    [photos, row]
  );

  if (!kind) return <Navigate to="/navy/devenir" replace />;
  // A request already sent and not refused is not edited here.
  if (row && (row.status !== 'rejected' || row.rejection_final)) return <Navigate to={`/navy/demande/${kind}`} replace />;
  if (!fields) return <NavyLoader />;

  const set = <K extends keyof PartnerFormFields>(key: K, value: PartnerFormFields[K]) => {
    dirtyRef.current = true;
    setFields((f) => (f ? { ...f, [key]: value } : f));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validateRequest(kind, fields, hasPhoto);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSending(true);
    // No late auto-save may recreate the draft once it has been sent.
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = null;
    dirtyRef.current = false;
    try {
      // Make sure the latest state is on the phone before sending.
      await saveDraft(userId!, kind, fields, photos, row?.id, [...changedSlots.current]);
      changedSlots.current.clear();
      const res = await submitDraft(userId!, kind);
      if (res.status === 'error') {
        setError('L’envoi n’a pas abouti. Votre demande est gardée sur ce téléphone : réessayez dans un instant.');
        return;
      }
      navigate(`/navy/demande/${kind}`, { replace: true });
    } finally {
      setSending(false);
    }
  };

  const isGrocer = kind === 'epicier';

  return (
    <NavyPage>
      <NavyPageTitle
        icon={isGrocer ? Store : Truck}
        title={row ? 'Corriger ma demande' : isGrocer ? 'Devenir épicier' : 'Devenir chauffeur'}
        subtitle="Tout est gardé sur votre téléphone au fur et à mesure."
      />

      {row?.status === 'rejected' && row.rejection_reason && (
        <NavyNotice tone="warn">
          <strong>Motif du refus :</strong> {row.rejection_reason}
        </NavyNotice>
      )}
      {!isOnline && (
        <NavyNotice icon={WifiOff}>
          Hors ligne : vous pouvez tout remplir. La demande partira toute seule au retour du réseau.
        </NavyNotice>
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <NavyCard className="p-4 space-y-3">
          <h3 className="font-semibold">{isGrocer ? 'La boutique' : 'Vous et votre véhicule'}</h3>
          {isGrocer && (
            <label className={labelCls}>
              Nom de la boutique
              <input className={inputCls} value={fields.shop_name} onChange={(e) => set('shop_name', e.target.value)} autoComplete="organization" />
            </label>
          )}
          <label className={labelCls}>
            {isGrocer ? 'Nom du gérant' : 'Votre nom'}
            <input className={inputCls} value={fields.display_name} onChange={(e) => set('display_name', e.target.value)} autoComplete="name" />
          </label>
          <label className={labelCls}>
            Téléphone
            <input
              className={inputCls}
              value={fields.phone}
              onChange={(e) => set('phone', e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="034 12 345 67"
            />
          </label>
          {!isGrocer && (
            <>
              <label className={labelCls}>
                Type de véhicule
                <select
                  className={inputCls}
                  value={fields.vehicle_type}
                  onChange={(e) => set('vehicle_type', e.target.value as VehicleType | '')}
                >
                  <option value="">Choisir…</option>
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
                  value={fields.vehicle_plate}
                  onChange={(e) => set('vehicle_plate', e.target.value)}
                  autoCapitalize="characters"
                  placeholder="1234 TBA"
                />
              </label>
            </>
          )}
        </NavyCard>

        <NavyCard className="p-4 space-y-3">
          <h3 className="font-semibold">Papiers</h3>
          {!isGrocer && (
            <fieldset>
              <legend className={labelCls}>Qui détient le NIF ?</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {NIF_HOLDERS.map((h) => (
                  <label
                    key={h.value}
                    className={`flex items-center justify-center rounded-xl border px-2 py-2.5 text-center text-sm font-medium cursor-pointer focus-within:ring-2 focus-within:ring-navyay-yellow ${
                      fields.nif_holder_type === h.value
                        ? 'border-navyay-charcoal bg-navyay-charcoal text-navyay-yellow'
                        : 'border-navyay-charcoal/25 hover:bg-navyay-yellow/15'
                    }`}
                  >
                    <input
                      type="radio"
                      name="nif_holder"
                      value={h.value}
                      checked={fields.nif_holder_type === h.value}
                      onChange={() => set('nif_holder_type', h.value)}
                      className="sr-only"
                    />
                    {h.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {!isGrocer && fields.nif_holder_type !== 'self' && (
            <label className={labelCls}>
              {fields.nif_holder_type === 'owner' ? 'Nom du propriétaire' : 'Nom de la coopérative'}
              <input className={inputCls} value={fields.nif_holder_name} onChange={(e) => set('nif_holder_name', e.target.value)} />
            </label>
          )}
          <label className={labelCls}>
            Numéro NIF
            <input className={inputCls} value={fields.nif} onChange={(e) => set('nif', e.target.value)} inputMode="numeric" />
          </label>
          {isGrocer && (
            <label className={labelCls}>
              Numéro de la carte statistique
              <input className={inputCls} value={fields.stat_number} onChange={(e) => set('stat_number', e.target.value)} />
            </label>
          )}
        </NavyCard>

        {isGrocer && (
          <NavyCard className="p-4 space-y-3">
            <h3 className="font-semibold">Position de la boutique</h3>
            <ShopPositionField
              lat={fields.shop_lat}
              lng={fields.shop_lng}
              serverZoneId={row?.zone_id}
              onChange={(lat, lng) => {
                dirtyRef.current = true;
                setFields((f) => (f ? { ...f, shop_lat: lat, shop_lng: lng } : f));
              }}
            />
          </NavyCard>
        )}

        <section className="space-y-3" aria-label="Photos">
          <h3 className="font-semibold px-1">Photos</h3>
          {PHOTO_SLOTS[kind].map((slot) => {
            const path = row ? (row[SLOT_COLUMN[slot]] as string | null) : null;
            return (
              <PhotoField
                key={slot}
                label={PHOTO_LABELS[slot]}
                hint={PHOTO_HINTS[slot]}
                blob={photos[slot]}
                existingUrl={path ? existingUrls[path] ?? null : null}
                hasExisting={!!path}
                onChange={(b) => {
                  dirtyRef.current = true;
                  changedSlots.current.add(slot);
                  setPhotos((p) => ({ ...p, [slot]: b }));
                }}
              />
            );
          })}
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

        <button type="submit" disabled={sending} className={`${btnPrimary} w-full`}>
          {sending ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Send className="w-5 h-5" aria-hidden="true" />}
          {row ? 'Renvoyer ma demande' : 'Envoyer ma demande'}
        </button>
      </form>

      <NavyHelp title="Aide pour remplir">
        <p>Prenez chaque papier à plat, bien éclairé, sans reflet. Vous pouvez reprendre une photo autant de fois que nécessaire.</p>
        <p>Les photos sont allégées sur votre téléphone avant l’envoi : elles restent lisibles et consomment peu de données.</p>
        <p>Sans réseau, votre demande est gardée sur ce téléphone et part toute seule dès que le réseau revient.</p>
        {isGrocer && (
          <p>
            Indiquez la position <strong>depuis la boutique</strong> : les chauffeurs et les clients s’y fieront pour trouver
            votre porte. Une opératrice viendra la vérifier sur place.
          </p>
        )}
      </NavyHelp>
    </NavyPage>
  );
}
