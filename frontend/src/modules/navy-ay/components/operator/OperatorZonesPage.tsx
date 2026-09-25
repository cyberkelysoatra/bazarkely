/**
 * Operator — "Zones" (phase 1B): list, draw, rename, recolour, reorder and delete the
 * delivery zones of Nosy Be. A zone is drawn by touching the map point by point
 * (undo last point, drag a point, finish). Zones may touch; when they overlap, the
 * first one in the order wins (same rule on the phone and on the server). Every
 * validated grocer is shown on the map with its zone. Writes are ONLINE ONLY.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eraser, Loader2, Map as MapIcon, Pencil, Plus, Trash2, Undo2, WifiOff } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { listPartners, operatorErrorMessage } from '../../services/operatorService';
import { deleteZone, loadZones, saveZone, saveZoneOrders, useNavyZones } from '../../services/zoneService';
import type { LatLng, NavyPartnerRow, NavyZone } from '../../types/partner';
import { isValidPolygon, reorderZones, sortZones, ZONE_COLORS } from '../../utils/geo';
import NavyMap, { type NavyMapMarker } from '../map/NavyMap';
import { btnAccent, btnPrimary, btnSecondary, inputCls, labelCls, NavyCard, NavyHelp, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

interface Editing {
  id: string;
  isNew: boolean;
  name: string;
  color: string;
  points: LatLng[];
  /** Drawing finished: a tap no longer adds a point (points stay draggable). */
  closed: boolean;
  sort_order: number;
}

const toolBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-navyay-charcoal/25 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-navyay-yellow/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-50';

export default function OperatorZonesPage() {
  const isOnline = useOnlineStatus();
  const { zones } = useNavyZones();
  const [grocers, setGrocers] = useState<NavyPartnerRow[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      await loadZones();
      setGrocers(await listPartners({ statuses: ['approved', 'suspended'], kind: 'epicier' }));
    } catch (err) {
      setError(operatorErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (isOnline) void load();
    else void loadZones();
  }, [isOnline, load]);

  const sorted = useMemo(() => sortZones(zones), [zones]);
  const markers: NavyMapMarker[] = useMemo(
    () =>
      grocers
        .filter((g) => g.shop_lat != null && g.shop_lng != null)
        .map((g) => ({
          id: g.id,
          lat: g.shop_lat as number,
          lng: g.shop_lng as number,
          kind: 'shop' as const,
          label: `${g.shop_name || g.display_name || 'Épicerie'} — ${zones.find((z) => z.id === g.zone_id)?.name ?? 'hors zone'}`,
        })),
    [grocers, zones]
  );
  const countIn = (zoneId: string) => grocers.filter((g) => g.zone_id === zoneId).length;
  const outside = grocers.filter((g) => g.shop_lat != null && !g.zone_id).length;

  const startNew = () => {
    setNotice(null);
    setError(null);
    setConfirmDelete(false);
    const maxOrder = sorted.reduce((m, z) => Math.max(m, z.sort_order), -10);
    setEditing({
      id: crypto.randomUUID(),
      isNew: true,
      name: '',
      color: ZONE_COLORS[sorted.length % ZONE_COLORS.length].value,
      points: [],
      closed: false,
      sort_order: maxOrder + 10,
    });
  };

  const startEdit = (z: NavyZone) => {
    setNotice(null);
    setError(null);
    setConfirmDelete(false);
    setEditing({ id: z.id, isNew: false, name: z.name, color: z.color, points: z.polygon, closed: true, sort_order: z.sort_order });
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError('Donnez un nom à la zone.');
      return;
    }
    if (!isValidPolygon(editing.points)) {
      setError('Touchez la carte pour poser au moins 3 points.');
      return;
    }
    setBusy('save');
    setError(null);
    try {
      await saveZone({ id: editing.id, name: editing.name, polygon: editing.points, color: editing.color, sort_order: editing.sort_order });
      setNotice(`Zone « ${editing.name.trim()} » enregistrée.`);
      setEditing(null);
      setGrocers(await listPartners({ statuses: ['approved', 'suspended'], kind: 'epicier' }));
    } catch (err) {
      setError(operatorErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!editing) return;
    setBusy('delete');
    setError(null);
    try {
      await deleteZone(editing.id);
      setNotice(`Zone « ${editing.name} » supprimée.`);
      setEditing(null);
      setGrocers(await listPartners({ statuses: ['approved', 'suspended'], kind: 'epicier' }));
    } catch (err) {
      setError(operatorErrorMessage(err));
    } finally {
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  const move = async (id: string, dir: -1 | 1) => {
    const orders = reorderZones(zones, id, dir);
    if (!orders.length) return;
    setBusy(`move-${id}`);
    setError(null);
    try {
      await saveZoneOrders(orders);
    } catch (err) {
      setError(operatorErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const onMapTap = (lat: number, lng: number) => {
    setEditing((e) => (e && !e.closed && e.points.length < 200 ? { ...e, points: [...e.points, [lat, lng]] } : e));
  };

  return (
    <NavyPage>
      <NavyPageTitle icon={MapIcon} title="Zones" subtitle="Quartiers et villages de livraison de Nosy Be." />
      {!isOnline && (
        <NavyNotice icon={WifiOff}>Hors ligne : les zones s’affichent, mais les modifications demandent une connexion.</NavyNotice>
      )}
      {error && <NavyNotice tone="error">{error}</NavyNotice>}
      {notice && !editing && <NavyNotice tone="ok">{notice}</NavyNotice>}

      {editing ? (
        <NavyCard className="p-4 space-y-3">
          <h3 className="font-semibold">{editing.isNew ? 'Nouvelle zone' : `Modifier « ${editing.name || 'zone'} »`}</h3>
          <p className="text-sm text-navyay-charcoal/80" aria-live="polite">
            {editing.closed
              ? `Tracé terminé (${editing.points.length} points). Faites glisser un point pour l’ajuster.`
              : editing.points.length < 3
              ? `Touchez la carte pour poser les coins de la zone (${editing.points.length}/3 au moins).`
              : `${editing.points.length} points. Continuez, ou touchez « Terminer le tracé ».`}
          </p>
          <NavyMap
            ariaLabel="Carte : dessin de la zone"
            zones={zones}
            hiddenZoneId={editing.id}
            markers={markers}
            draft={editing.points}
            draftColor={editing.color}
            onDraftChange={(points) => setEditing((e) => (e ? { ...e, points } : e))}
            onMapTap={onMapTap}
            locate
            fit={editing.points.length ? 'content' : 'island'}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              className={toolBtn}
              disabled={!editing.points.length}
              onClick={() => setEditing((e) => (e ? { ...e, points: e.points.slice(0, -1), closed: false } : e))}
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" />
              Annuler le dernier point
            </button>
            <button
              type="button"
              className={toolBtn}
              disabled={!editing.points.length}
              onClick={() => setEditing((e) => (e ? { ...e, points: [], closed: false } : e))}
            >
              <Eraser className="w-4 h-4" aria-hidden="true" />
              Tout effacer
            </button>
            {editing.closed ? (
              <button type="button" className={toolBtn} onClick={() => setEditing((e) => (e ? { ...e, closed: false } : e))}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                Ajouter des points
              </button>
            ) : (
              <button
                type="button"
                className={toolBtn}
                disabled={editing.points.length < 3}
                onClick={() => setEditing((e) => (e ? { ...e, closed: true } : e))}
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                Terminer le tracé
              </button>
            )}
          </div>

          <label className={labelCls}>
            Nom de la zone
            <input
              className={inputCls}
              value={editing.name}
              maxLength={60}
              onChange={(e) => setEditing((z) => (z ? { ...z, name: e.target.value } : z))}
              placeholder="Hell-Ville, Ambatoloaka…"
            />
          </label>
          <fieldset>
            <legend className={labelCls}>Couleur</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ZONE_COLORS.map((c) => (
                <label
                  key={c.value}
                  className={`relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-2 focus-within:ring-2 focus-within:ring-navyay-yellow ${
                    editing.color === c.value ? 'border-navyay-charcoal' : 'border-transparent'
                  }`}
                  style={{ background: c.value }}
                  title={c.label}
                >
                  <input
                    type="radio"
                    name="zone-color"
                    value={c.value}
                    checked={editing.color === c.value}
                    onChange={() => setEditing((z) => (z ? { ...z, color: c.value } : z))}
                    className="sr-only"
                    aria-label={c.label}
                  />
                  {editing.color === c.value && <Check className="w-5 h-5 text-navyay-charcoal" aria-hidden="true" />}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className={btnAccent} disabled={!!busy || !isOnline} onClick={() => void save()}>
              {busy === 'save' ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Check className="w-5 h-5" aria-hidden="true" />}
              Enregistrer la zone
            </button>
            <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => setEditing(null)}>
              Annuler
            </button>
          </div>
          {!editing.isNew &&
            (confirmDelete ? (
              <div className="rounded-xl border border-red-300 bg-red-50 p-3 space-y-2" role="alert">
                <p className="text-sm text-red-900">
                  Supprimer « {editing.name} » ? Les épiceries de cette zone passent dans la zone suivante qui les contient, ou hors zone.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => void remove()}>
                    {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
                    Supprimer
                  </button>
                  <button type="button" className={btnSecondary} onClick={() => setConfirmDelete(false)}>
                    Garder
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow rounded"
                disabled={!isOnline}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                Supprimer cette zone
              </button>
            ))}
        </NavyCard>
      ) : (
        <>
          <NavyMap
            ariaLabel="Carte des zones et des épiceries"
            zones={zones}
            markers={markers}
            onZoneTap={(id) => {
              const z = zones.find((x) => x.id === id);
              if (z && isOnline) startEdit(z);
            }}
            fit="content"
          />
          <p className="text-sm text-navyay-charcoal/75">
            {markers.length} épicerie{markers.length > 1 ? 's' : ''} placée{markers.length > 1 ? 's' : ''} sur la carte
            {outside ? ` · ${outside} hors zone` : ''}. Touchez une zone pour la modifier.
          </p>
          <button type="button" className={`${btnPrimary} w-full`} onClick={startNew} disabled={!isOnline}>
            <Plus className="w-5 h-5" aria-hidden="true" />
            Dessiner une nouvelle zone
          </button>

          {sorted.length === 0 ? (
            <NavyCard className="px-5 py-8 text-center">
              <MapIcon className="mx-auto w-10 h-10 text-navyay-charcoal/60" aria-hidden="true" />
              <p className="mt-3 font-semibold">Aucune zone pour l’instant</p>
              <p className="mt-1 text-sm text-navyay-charcoal/75">Commencez par Hell-Ville, Ambatoloaka ou Dzamandzar.</p>
            </NavyCard>
          ) : (
            <ol className="space-y-2" aria-label="Zones, dans l’ordre de priorité">
              {sorted.map((z, i) => (
                <li key={z.id} className="flex items-center gap-2 rounded-2xl border border-navyay-charcoal/10 bg-white px-3 py-2.5">
                  <span className="w-6 text-center text-sm font-semibold tabular-nums text-navyay-charcoal/75">{i + 1}</span>
                  <span className="h-6 w-6 flex-shrink-0 rounded-md border border-navyay-charcoal/20" style={{ background: z.color }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{z.name}</span>
                    <span className="block text-xs text-navyay-charcoal/75">
                      {countIn(z.id)} épicerie{countIn(z.id) > 1 ? 's' : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-navyay-yellow/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-30"
                    aria-label={`Monter ${z.name}`}
                    disabled={i === 0 || !!busy || !isOnline}
                    onClick={() => void move(z.id, -1)}
                  >
                    {busy === `move-${z.id}` ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <ArrowUp className="w-4 h-4" aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-navyay-yellow/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-30"
                    aria-label={`Descendre ${z.name}`}
                    disabled={i === sorted.length - 1 || !!busy || !isOnline}
                    onClick={() => void move(z.id, 1)}
                  >
                    <ArrowDown className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-navyay-yellow/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-30"
                    aria-label={`Modifier ${z.name}`}
                    disabled={!isOnline}
                    onClick={() => startEdit(z)}
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </>
      )}

      <NavyHelp title="Comment dessiner une zone ?">
        <p>Touchez la carte à chaque coin de la zone, dans l’ordre du tour. Il faut au moins 3 points ; la zone se referme toute seule.</p>
        <p>Un point mal placé ? « Annuler le dernier point », ou faites-le glisser du doigt. Deux doigts pour zoomer.</p>
        <p>Les zones peuvent se toucher. Si elles se chevauchent, c’est la première de la liste qui compte : changez l’ordre avec les flèches.</p>
        <p>La zone de chaque épicerie et de chaque destination de chauffeur est recalculée automatiquement après chaque changement.</p>
      </NavyHelp>
    </NavyPage>
  );
}
