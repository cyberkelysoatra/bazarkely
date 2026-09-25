/**
 * "Mon épicerie" (phase 1A): shop information, Open / Closed switch, deposit and
 * pickup fees in Ar (suggested fee shown when it exists, never imposed).
 * Offline-first: saved on the phone at once, sent when the network allows.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, DoorClosed, DoorOpen, Loader2, MapPin, Save, Smartphone, Store } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { useNavyProfile } from '../../services/navyProfileStore';
import { updateMyPartnerSettings } from '../../services/partnerService';
import PartnerChangeStatus from './PartnerChangeStatus';
import ShopPositionField from './ShopPositionField';
import { btnPrimary, formatAr, inputCls, labelCls, NavyCard, NavyHelp, NavyNotice, NavyOfflineNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

function parseAr(v: string): number | null {
  const n = Number(v.replace(/\s/g, ''));
  return v.trim() === '' || !Number.isFinite(n) || n < 0 ? null : Math.round(n);
}

export default function GrocerPage() {
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const isOnline = useOnlineStatus();
  const row = profile.partners.find((p) => p.kind === 'epicier' && p.status === 'approved');
  const [depot, setDepot] = useState('');
  const [pickup, setPickup] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<'sent' | 'queued' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [posSaved, setPosSaved] = useState<'sent' | 'queued' | null>(null);

  useEffect(() => {
    if (!row) return;
    setDepot(row.depot_fee != null ? String(row.depot_fee) : '');
    setPickup(row.pickup_fee != null ? String(row.pickup_fee) : '');
    // Only when the partner changes, not on every refresh of the same row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id]);

  if (!row || !userId) return null; // guarded by NavyRoleRoute
  const pending = profile.pendingPatchIds.includes(row.id);
  const s = profile.settings;

  const toggleOpen = async () => {
    setSaved(null);
    setSaved(await updateMyPartnerSettings(userId, row.id, { is_open: !row.is_open }));
  };

  const savePosition = async () => {
    if (!pos) return;
    const res = await updateMyPartnerSettings(userId, row.id, { shop_lat: pos.lat, shop_lng: pos.lng });
    setPos(null);
    setPosSaved(res);
  };

  const saveFees = async (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseAr(depot);
    const p = parseAr(pickup);
    if (d === null || p === null) {
      setError('Indiquez les deux tarifs en ariary (un nombre, 0 si gratuit).');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      setSaved(await updateMyPartnerSettings(userId, row.id, { depot_fee: d, pickup_fee: p }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <NavyPage>
      <NavyPageTitle icon={Store} title={row.shop_name || 'Mon épicerie'} subtitle={row.display_name ? `Gérant : ${row.display_name}` : undefined} />
      {!isOnline && <NavyOfflineNotice>Hors ligne : vos changements sont gardés sur ce téléphone et partiront au retour du réseau.</NavyOfflineNotice>}

      <button
        type="button"
        onClick={() => void toggleOpen()}
        aria-pressed={row.is_open}
        className={`w-full flex items-center gap-4 rounded-2xl px-5 py-5 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navyay-charcoal transition-colors ${
          row.is_open ? 'bg-navyay-yellow text-navyay-charcoal' : 'bg-navyay-charcoal text-white'
        }`}
      >
        {row.is_open ? <DoorOpen className="w-9 h-9 flex-shrink-0" aria-hidden="true" /> : <DoorClosed className="w-9 h-9 flex-shrink-0 text-navyay-yellow" aria-hidden="true" />}
        <span className="flex-1 min-w-0">
          <span className="block text-2xl font-bold">{row.is_open ? 'Ouvert' : 'Fermé'}</span>
          <span className={`block text-sm ${row.is_open ? 'text-navyay-charcoal/80' : 'text-white/80'}`}>
            {row.is_open ? 'Vous acceptez les colis. Touchez pour fermer.' : 'Aucun colis ne vous est envoyé. Touchez pour ouvrir.'}
          </span>
        </span>
      </button>

      <NavyCard className="p-4 space-y-3">
        <h3 className="font-semibold">Position de la boutique</h3>
        <ShopPositionField
          lat={pos?.lat ?? row.shop_lat}
          lng={pos?.lng ?? row.shop_lng}
          serverZoneId={pos ? null : row.zone_id}
          verifiedAt={row.shop_location_verified_at}
          onChange={
            row.shop_location_verified_at
              ? undefined
              : (lat, lng) => {
                  setPos({ lat, lng });
                  setPosSaved(null);
                }
          }
        />
        {!row.shop_location_verified_at && pos && (
          <button type="button" className={`${btnPrimary} w-full`} onClick={() => void savePosition()}>
            <MapPin className="w-4 h-4" aria-hidden="true" />
            Enregistrer la position
          </button>
        )}
        {posSaved && !pos && (
          <NavyNotice tone={posSaved === 'queued' ? 'info' : 'ok'} icon={posSaved === 'queued' ? Smartphone : CheckCircle2}>
            {posSaved === 'queued' ? 'Position gardée sur ce téléphone, en attente d’envoi.' : 'Position enregistrée.'}
          </NavyNotice>
        )}
      </NavyCard>

      <NavyCard className="p-4">
        <form onSubmit={saveFees} className="space-y-3" noValidate>
          <h3 className="font-semibold">Mes tarifs</h3>
          <label className={labelCls}>
            Recevoir un colis au départ (dépôt)
            <div className="relative">
              <input className={`${inputCls} pr-10`} inputMode="numeric" value={depot} onChange={(e) => setDepot(e.target.value)} placeholder="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-sm text-navyay-charcoal/70" aria-hidden="true">Ar</span>
            </div>
            {s?.suggested_depot_fee != null && (
              <span className="mt-1 block text-xs text-navyay-charcoal/70">Tarif conseillé : {formatAr(s.suggested_depot_fee)}</span>
            )}
          </label>
          <label className={labelCls}>
            Remettre un colis à l’arrivée (retrait)
            <div className="relative">
              <input className={`${inputCls} pr-10`} inputMode="numeric" value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="0" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-sm text-navyay-charcoal/70" aria-hidden="true">Ar</span>
            </div>
            {s?.suggested_pickup_fee != null && (
              <span className="mt-1 block text-xs text-navyay-charcoal/70">Tarif conseillé : {formatAr(s.suggested_pickup_fee)}</span>
            )}
          </label>
          {error && <p className="text-sm text-red-800" role="alert">{error}</p>}
          <button type="submit" disabled={saving} className={`${btnPrimary} w-full`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
            Enregistrer mes tarifs
          </button>
        </form>
      </NavyCard>

      {(saved || pending) && (
        <NavyNotice tone={pending ? 'info' : 'ok'} icon={pending ? Smartphone : CheckCircle2}>
          {pending ? 'Enregistré sur ce téléphone, en attente d’envoi.' : 'Enregistré.'}
        </NavyNotice>
      )}

      <PartnerChangeStatus userId={userId} row={row} />

      <NavyHelp title="Pourquoi indiquer la position sur place ?">
        <p>Les chauffeurs et les clients viendront à l’endroit exact de l’épingle : placez-la sur votre porte, depuis la boutique.</p>
        <p>La zone (Hell-Ville, Ambatoloaka…) est calculée toute seule à partir de la position.</p>
        <p>Une opératrice passera vérifier. Une fois la position vérifiée, elle ne peut plus être changée depuis l’application.</p>
      </NavyHelp>

      <NavyHelp title="À propos des tarifs">
        <p>Vous fixez librement vos tarifs. Le tarif conseillé par NAVY ay n’est qu’un repère.</p>
        <p>Un nouveau tarif s’applique aux commandes suivantes, jamais à un colis déjà commandé.</p>
        <p>Fermé : aucun nouveau colis ne vous est confié, par exemple pendant une absence.</p>
      </NavyHelp>
    </NavyPage>
  );
}
