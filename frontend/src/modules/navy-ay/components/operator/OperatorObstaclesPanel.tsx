/**
 * Operator — "Obstacles" tab of the Zones screen (phase 2C3, decisions 52 (2), 55 (2)):
 * the private NAVY layer of temporary obstacles (works, flooded road, closed passage).
 * - draw a passage (points on the map) or place a point, choose the reason and the
 *   duration ("jusqu'à quand"): shown at once on every NAVY map, gone by itself at the end;
 * - drivers' reports: validate (with a duration) or refuse;
 * - change the duration / reason of an obstacle, or delete it.
 * Writes are ONLINE ONLY (RLS: operators only; a driver can only propose).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Check, Eraser, Loader2, MapPin, Pencil, Route, Trash2, Undo2, X } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { decideObstacle, deleteObstacle, listAllObstacles, saveObstacle } from '../../services/liveService';
import { operatorErrorMessage } from '../../services/operatorService';
import type { NavyObstacle, NavyObstacleKind } from '../../types/parcel';
import type { LatLng } from '../../types/partner';
import { formatUntil, isObstacleActive, OBSTACLE_DURATIONS, OBSTACLE_LABELS, OBSTACLE_MAX_MS, obstacleGeom, obstaclePoints } from '../../utils/obstacleRules';
import NavyMap from '../map/NavyMap';
import { OBSTACLE_ICONS } from '../partner/DriverObstacleReport';
import { btnAccent, btnPrimary, btnSecondary, inputCls, labelCls, NavyCard, NavyHelp, NavyNotice } from '../ui/NavyUi';

interface Editing {
  id?: string;
  shape: 'point' | 'line';
  points: LatLng[];
  kind: NavyObstacleKind | null;
  note: string;
  durationMs: number | null;
  /** datetime-local value when the operator types her own end. */
  until: string;
  /** Existing obstacle: its start is kept. */
  startsAt?: string;
}

const toolBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border border-navyay-charcoal/25 bg-white px-3 py-2.5 text-sm font-semibold hover:bg-navyay-yellow/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow disabled:opacity-50';
const chip = (on: boolean) =>
  `min-h-[44px] rounded-xl border-[1.5px] px-3 py-2 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
    on ? 'border-navyay-yellow bg-navyay-yellow/[0.18]' : 'border-navyay-charcoal/15 bg-white'
  }`;

/** "2026-09-27T18:30" (local) ↔ ISO. */
function localInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function OperatorObstaclesPanel() {
  const isOnline = useOnlineStatus();
  const [list, setList] = useState<NavyObstacle[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [decideMs, setDecideMs] = useState<number>(OBSTACLE_DURATIONS[2].ms);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    setError(null);
    try {
      setList(await listAllObstacles());
      setNow(Date.now());
    } catch (err) {
      setError(operatorErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const proposed = list.filter((o) => o.status === 'propose');
  const current = list.filter((o) => isObstacleActive(o, now));
  const planned = list.filter((o) => o.status === 'valide' && Date.parse(o.starts_at) > now);
  const past = list.filter((o) => o.status === 'refuse' || (o.status === 'valide' && Date.parse(o.ends_at) <= now));
  // On the operator's map: in progress + reports to decide (dashed, pale).
  const onMap = useMemo(() => list.filter((o) => (isObstacleActive(o, now) || o.status === 'propose') && o.id !== editing?.id), [list, now, editing?.id]);

  const run = async (key: string, fn: () => Promise<void>, ok: string) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(ok);
      await load();
    } catch (err) {
      setError(operatorErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const endOf = (e: Editing): number | null => {
    if (e.durationMs) return (e.startsAt ? Math.max(Date.now(), Date.parse(e.startsAt)) : Date.now()) + e.durationMs;
    const t = e.until ? new Date(e.until).getTime() : NaN;
    return Number.isFinite(t) ? t : null;
  };

  const save = async () => {
    if (!editing) return;
    const geom = obstacleGeom(editing.shape === 'point' ? editing.points.slice(0, 1) : editing.points);
    if (!geom || (editing.shape === 'line' && editing.points.length < 2)) return setError(editing.shape === 'point' ? 'Touchez la carte pour placer l’obstacle.' : 'Touchez la carte pour tracer le passage (2 points au moins).');
    if (!editing.kind) return setError('Choisissez le motif.');
    const end = endOf(editing);
    const start = editing.startsAt ? Date.parse(editing.startsAt) : Date.now();
    if (!end || end <= Date.now()) return setError('Choisissez une fin dans le futur.');
    if (end - start > OBSTACLE_MAX_MS) return setError('Un obstacle dure 90 jours au plus.');
    await run(
      'save',
      () =>
        saveObstacle({
          id: editing.id,
          kind: editing.kind as NavyObstacleKind,
          geom,
          note: editing.note.trim().slice(0, 200) || null,
          startsAt: new Date(start).toISOString(),
          endsAt: new Date(end).toISOString(),
        }),
      `Obstacle « ${OBSTACLE_LABELS[editing.kind]} » enregistré : il s’affiche sur toutes les cartes NAVY jusqu’à sa fin.`
    );
    setEditing(null);
  };

  const startNew = (shape: 'point' | 'line') => {
    setNotice(null);
    setError(null);
    setEditing({ shape, points: [], kind: null, note: '', durationMs: OBSTACLE_DURATIONS[2].ms, until: localInput(Date.now() + OBSTACLE_DURATIONS[2].ms) });
  };

  const startEdit = (o: NavyObstacle) => {
    setNotice(null);
    setError(null);
    setEditing({
      id: o.id,
      shape: o.geom.type === 'Point' ? 'point' : 'line',
      points: obstaclePoints(o.geom),
      kind: o.kind,
      note: o.note ?? '',
      durationMs: null,
      until: localInput(Date.parse(o.ends_at)),
      startsAt: o.starts_at,
    });
  };

  const onMapTap = (lat: number, lng: number) =>
    setEditing((e) => (!e ? e : e.shape === 'point' ? { ...e, points: [[lat, lng]] } : e.points.length < 100 ? { ...e, points: [...e.points, [lat, lng]] } : e));

  const item = (o: NavyObstacle, actions: ReactNode) => {
    const Icon = OBSTACLE_ICONS[o.kind] ?? OBSTACLE_ICONS.autre;
    return (
      <li key={o.id} className="rounded-2xl border border-navyay-charcoal/10 bg-white px-3 py-2.5 space-y-2">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#B42318] text-white" aria-hidden="true">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {OBSTACLE_LABELS[o.kind]} · {o.geom.type === 'Point' ? 'un point' : 'un passage'}
            </span>
            <span className="block text-xs text-navyay-charcoal/75">
              {o.status === 'refuse' ? 'Refusé' : Date.parse(o.ends_at) <= now ? 'Terminé' : formatUntil(o.ends_at, now)}
              {o.note ? ` · ${o.note}` : ''}
            </span>
          </span>
        </div>
        {actions}
      </li>
    );
  };

  if (editing) {
    return (
      <NavyCard className="p-4 space-y-3">
        <h3 className="font-semibold">{editing.id ? 'Modifier l’obstacle' : editing.shape === 'point' ? 'Nouvel obstacle (un point)' : 'Nouvel obstacle (un passage)'}</h3>
        <p className="text-sm text-navyay-charcoal/80" aria-live="polite">
          {editing.shape === 'point'
            ? editing.points.length
              ? 'Point placé. Touchez ailleurs pour le déplacer, ou faites glisser l’épingle.'
              : 'Touchez la carte à l’endroit de l’obstacle.'
            : editing.points.length < 2
            ? `Touchez la carte le long de la route fermée (${editing.points.length}/2 points au moins).`
            : `${editing.points.length} points. Continuez, ou choisissez le motif.`}
        </p>
        <NavyMap
          ariaLabel="Carte : tracé de l’obstacle"
          obstacles={onMap}
          pin={editing.shape === 'point' && editing.points[0] ? { lat: editing.points[0][0], lng: editing.points[0][1] } : null}
          onPinChange={editing.shape === 'point' ? (lat, lng) => onMapTap(lat, lng) : undefined}
          draft={editing.shape === 'line' ? editing.points : undefined}
          draftShape="line"
          draftColor="#B42318"
          onDraftChange={editing.shape === 'line' ? (points) => setEditing((e) => (e ? { ...e, points } : e)) : undefined}
          onMapTap={editing.shape === 'line' ? onMapTap : undefined}
          locate
          fit={editing.points.length ? (editing.shape === 'point' ? 'pin' : 'island') : 'island'}
        />
        {editing.shape === 'line' && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={toolBtn} disabled={!editing.points.length} onClick={() => setEditing((e) => (e ? { ...e, points: e.points.slice(0, -1) } : e))}>
              <Undo2 className="w-4 h-4" aria-hidden="true" />
              Annuler le dernier point
            </button>
            <button type="button" className={toolBtn} disabled={!editing.points.length} onClick={() => setEditing((e) => (e ? { ...e, points: [] } : e))}>
              <Eraser className="w-4 h-4" aria-hidden="true" />
              Tout effacer
            </button>
          </div>
        )}
        <fieldset>
          <legend className={labelCls}>Motif</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(Object.keys(OBSTACLE_LABELS) as NavyObstacleKind[]).map((k) => {
              const Icon = OBSTACLE_ICONS[k];
              return (
                <button key={k} type="button" aria-pressed={editing.kind === k} className={`${chip(editing.kind === k)} flex items-center gap-2 text-left`} onClick={() => setEditing((e) => (e ? { ...e, kind: k } : e))}>
                  <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  {OBSTACLE_LABELS[k]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className={labelCls}>Jusqu’à quand ?</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {OBSTACLE_DURATIONS.map((d) => (
              <button key={d.ms} type="button" aria-pressed={editing.durationMs === d.ms} className={chip(editing.durationMs === d.ms)} onClick={() => setEditing((e) => (e ? { ...e, durationMs: d.ms } : e))}>
                {d.label}
              </button>
            ))}
          </div>
          <label className={`${labelCls} mt-2 block`}>
            Ou une date et une heure précises
            <input
              type="datetime-local"
              className={inputCls}
              value={editing.until}
              onChange={(ev) => {
                const v = ev.target.value;
                setEditing((e) => (e ? { ...e, until: v, durationMs: null } : e));
              }}
            />
          </label>
        </fieldset>
        <label className={labelCls}>
          Précision (facultatif)
          <input className={inputCls} value={editing.note} maxLength={200} onChange={(ev) => { const v = ev.target.value; setEditing((e) => (e ? { ...e, note: v } : e)); }} placeholder="Pont en réparation, déviation par…" />
        </label>
        {error && <NavyNotice tone="error">{error}</NavyNotice>}
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className={btnAccent} disabled={!!busy || !isOnline} onClick={() => void save()}>
            {busy === 'save' ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Check className="w-5 h-5" aria-hidden="true" />}
            Enregistrer l’obstacle
          </button>
          <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => setEditing(null)}>
            Annuler
          </button>
        </div>
      </NavyCard>
    );
  }

  return (
    <div className="space-y-4">
      {error && <NavyNotice tone="error">{error}</NavyNotice>}
      {notice && <NavyNotice tone="ok">{notice}</NavyNotice>}
      <NavyMap ariaLabel="Carte des obstacles" obstacles={onMap} fit="island" />
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className={btnPrimary} disabled={!isOnline} onClick={() => startNew('line')}>
          <Route className="w-5 h-5" aria-hidden="true" />
          Tracer un passage fermé
        </button>
        <button type="button" className={btnPrimary} disabled={!isOnline} onClick={() => startNew('point')}>
          <MapPin className="w-5 h-5" aria-hidden="true" />
          Poser un point
        </button>
      </div>

      <section className="space-y-2" aria-labelledby="obs-proposed">
        <h3 id="obs-proposed" className="font-semibold">
          Signalements des chauffeurs {proposed.length ? `(${proposed.length})` : ''}
        </h3>
        {proposed.length === 0 ? (
          <p className="text-sm text-navyay-charcoal/75">Aucun signalement à vérifier.</p>
        ) : (
          <ul className="space-y-2">
            {proposed.map((o) =>
              item(
                o,
                deciding === o.id ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Afficher pendant :</p>
                    <div className="flex flex-wrap gap-2">
                      {OBSTACLE_DURATIONS.map((d) => (
                        <button key={d.ms} type="button" aria-pressed={decideMs === d.ms} className={chip(decideMs === d.ms)} onClick={() => setDecideMs(d.ms)}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className={btnAccent}
                        disabled={!!busy || !isOnline}
                        onClick={() => void run(`ok-${o.id}`, () => decideObstacle(o.id, 'valider', new Date(Date.now() + decideMs).toISOString()), 'Signalement validé : il s’affiche sur toutes les cartes NAVY.').then(() => setDeciding(null))}
                      >
                        {busy === `ok-${o.id}` ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Check className="w-4 h-4" aria-hidden="true" />}
                        Valider
                      </button>
                      <button type="button" className={btnSecondary} onClick={() => setDeciding(null)}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" className={btnAccent} disabled={!!busy || !isOnline} onClick={() => setDeciding(o.id)}>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      Valider…
                    </button>
                    <button type="button" className={btnSecondary} disabled={!!busy || !isOnline} onClick={() => void run(`no-${o.id}`, () => decideObstacle(o.id, 'refuser'), 'Signalement refusé : il n’apparaîtra pas.')}>
                      {busy === `no-${o.id}` ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <X className="w-4 h-4" aria-hidden="true" />}
                      Refuser
                    </button>
                  </div>
                )
              )
            )}
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="obs-current">
        <h3 id="obs-current" className="font-semibold">En cours sur les cartes {current.length ? `(${current.length})` : ''}</h3>
        {current.length + planned.length === 0 ? (
          <p className="text-sm text-navyay-charcoal/75">Aucun obstacle affiché pour l’instant.</p>
        ) : (
          <ul className="space-y-2">
            {[...current, ...planned].map((o) =>
              item(
                o,
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className={btnSecondary} disabled={!isOnline} onClick={() => startEdit(o)}>
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                    Modifier
                  </button>
                  <button type="button" className={btnSecondary} disabled={!!busy || !isOnline} onClick={() => void run(`del-${o.id}`, () => deleteObstacle(o.id), 'Obstacle supprimé des cartes.')}>
                    {busy === `del-${o.id}` ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Trash2 className="w-4 h-4" aria-hidden="true" />}
                    Supprimer
                  </button>
                </div>
              )
            )}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <details className="rounded-2xl border border-navyay-charcoal/10 bg-white px-3 py-2">
          <summary className="min-h-[44px] cursor-pointer py-2.5 font-semibold">Terminés ou refusés ({past.length}), effacés au bout de 7 jours</summary>
          <ul className="space-y-2 pb-2">{past.map((o) => item(o, null))}</ul>
        </details>
      )}

      <NavyHelp title="À quoi servent les obstacles ?">
        <p>Travaux, route inondée, passage fermé : un obstacle s’affiche sur toutes les cartes NAVY (clients, chauffeurs, épiciers), hachuré en rouge, jusqu’à la fin que vous choisissez. Il disparaît alors tout seul.</p>
        <p>Les itinéraires calculés ensuite évitent l’obstacle quand une autre route existe.</p>
        <p>Les chauffeurs peuvent signaler un obstacle : il n’apparaît aux autres qu’après votre validation. Vous recevez une notification à chaque signalement.</p>
        <p>Les routes elles-mêmes (sens interdit, nouvelle piste) se corrigent dans OpenStreetMap, pas ici.</p>
      </NavyHelp>
    </div>
  );
}
