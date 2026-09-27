/**
 * NAVY ay — "Mon épicerie de retrait" (phase 2C2, decision 7): the grocer where this
 * account withdraws its parcels. Chosen by touching a grocer on the map. Senders who
 * type this account's phone see it proposed as the arrival (navy_lookup_recipient),
 * never a home. Kept on the phone at once, sent to the server (own row only, RLS).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Store, WifiOff } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { loadOpenGrocers } from '../../services/parcelService';
import { myUsualGrocer, setUsualGrocer } from '../../services/clientService';
import { loadZones, useNavyZones, zoneName } from '../../services/zoneService';
import type { NavyOpenGrocer } from '../../types/parcel';
import type { LatLng } from '../../types/partner';
import { HELL_VILLE } from '../../utils/clientRules';
import NavyMap, { type NavyMapApi } from '../map/NavyMap';
import { formatAr, NavyNotice } from '../ui/NavyUi';
import { MapButtons, MapSheet, MapStage } from './MapStage';
import { ctaCls, LivePill, MapToast, PanelHead } from './ClientUi';

export default function ClientGrocerPage() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const { zones } = useNavyZones();
  const apiRef = useRef<NavyMapApi | null>(null);
  const [sheetH, setSheetH] = useState(240);
  const [grocers, setGrocers] = useState<NavyOpenGrocer[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void loadZones();
    loadOpenGrocers()
      .then(({ list }) => setGrocers(list))
      .catch(() => setGrocers([]));
    if (userId) myUsualGrocer(userId).then(setCurrent).catch(() => undefined);
  }, [userId, isOnline]);

  const selectedId = picked ?? current;
  const selected = grocers.find((g) => g.id === selectedId) ?? null;
  const shops = useMemo(
    () => grocers.map((g) => ({ id: g.id, lat: g.lat, lng: g.lng, name: g.shop_name, role: g.id === selectedId ? ('dest' as const) : ('normal' as const) })),
    [grocers, selectedId]
  );

  useEffect(() => {
    if (!grocers.length) return;
    apiRef.current?.fitPoints(grocers.map((g) => [g.lat, g.lng] as LatLng), { top: 64, bottom: sheetH + 40, left: 44, right: 64 }, 15);
  }, [grocers.length, sheetH > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!userId || !picked) return;
    setSaving(true);
    setMsg(null);
    const r = await setUsualGrocer(userId, picked);
    setSaving(false);
    if (r === 'error') return setMsg({ tone: 'error', text: 'Cette épicerie ne peut pas être choisie pour l’instant. Choisissez-en une autre.' });
    setCurrent(picked);
    setPicked(null);
    setMsg(
      r === 'queued'
        ? { tone: 'info', text: 'Choix gardé sur ce téléphone : il sera envoyé au retour du réseau.' }
        : { tone: 'ok', text: 'C’est noté. Vos proches la verront proposée quand ils vous enverront un colis.' }
    );
  };

  return (
    <MapStage
      map={
        <NavyMap
          ariaLabel="Carte : épiceries de retrait"
          frame="full"
          initialView={{ ...HELL_VILLE, zoom: 12.5 }}
          shops={shops}
          shopNames="always"
          onShopTap={(id) => {
            const g = grocers.find((x) => x.id === id);
            setPicked(id);
            setMsg(null);
            if (g) setToast(g.shop_name);
          }}
          onReady={(api) => {
            apiRef.current = api;
          }}
        />
      }
    >
      <LivePill>{grocers.length} épicerie{grocers.length > 1 ? 's' : ''} ouverte{grocers.length > 1 ? 's' : ''}</LivePill>
      <MapToast text={toast} onDone={() => setToast(null)} />
      <MapButtons bottom={sheetH + 24} onZoom={(d) => apiRef.current?.zoomBy(d)} />
      <MapSheet panelKey="grocer" onHeight={setSheetH}>
        <div className="space-y-3">
          <PanelHead
            title="Mon épicerie de retrait"
            sub="Touchez sur la carte l’épicerie où vous voulez retirer vos colis."
            onBack={() => navigate('/navy')}
            help={
              <>
                <p>Quand quelqu’un vous envoie un colis avec votre numéro, NAVY ay lui propose cette épicerie comme arrivée.</p>
                <p>Seul son nom est montré, jamais votre adresse. Vous pouvez la changer à tout moment.</p>
              </>
            }
          />
          {!isOnline && <NavyNotice icon={WifiOff}>Hors ligne : votre choix sera envoyé au retour du réseau.</NavyNotice>}
          {msg && <NavyNotice tone={msg.tone}>{msg.text}</NavyNotice>}
          {selected ? (
            <p className="flex items-center gap-2 rounded-xl bg-navyay-yellow px-3 py-2 font-bold">
              <Store className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{selected.shop_name}</span>
              <span className="text-xs font-semibold">{zoneName(zones, selected.zone_id) ?? ''}</span>
            </p>
          ) : (
            <p className="text-sm text-navyay-charcoal/75">Aucune épicerie choisie pour l’instant.</p>
          )}
          {selected && <p className="text-xs text-navyay-charcoal/75">Retrait : {formatAr(selected.pickup_fee)} (compris dans le prix payé par l’expéditeur).</p>}
          <button type="button" className={ctaCls} disabled={!picked || picked === current || saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Check className="h-5 w-5" aria-hidden="true" />}
            Garder cette épicerie
          </button>
        </div>
      </MapSheet>
    </MapStage>
  );
}
