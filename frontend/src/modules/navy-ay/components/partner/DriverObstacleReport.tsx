/**
 * Driver — "Signaler un obstacle" (phase 2C3, decision 55 (2)): touch the map where the
 * road is blocked, choose the reason, send. The report is shown to nobody else until an
 * operator validates it (she is notified). Online only. The driver's last reports and
 * their state are listed below.
 */
import { useEffect, useState } from 'react';
import { Ban, Construction, Loader2, Send, TriangleAlert, Waves } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { myObstacleReports, proposeObstacle } from '../../services/liveService';
import type { NavyObstacle, NavyObstacleKind } from '../../types/parcel';
import { formatUntil, OBSTACLE_LABELS, OBSTACLE_REPORT_MS, obstacleGeom } from '../../utils/obstacleRules';
import NavyMap from '../map/NavyMap';
import { btnAccent, btnSecondary, inputCls, labelCls, NavyCard, NavyNotice } from '../ui/NavyUi';

export const OBSTACLE_ICONS: Record<NavyObstacleKind, typeof Construction> = {
  travaux: Construction,
  inondation: Waves,
  ferme: Ban,
  autre: TriangleAlert,
};

const STATUS_TEXT: Record<string, string> = { propose: 'en attente de validation', valide: 'validé, visible sur les cartes', refuse: 'refusé' };

export default function DriverObstacleReport({ userId }: { userId: string }) {
  const isOnline = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [kind, setKind] = useState<NavyObstacleKind | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mine, setMine] = useState<NavyObstacle[]>([]);

  useEffect(() => {
    if (!isOnline) return;
    myObstacleReports(userId).then(setMine).catch(() => undefined);
  }, [userId, isOnline, done]);

  const send = async () => {
    if (!point) return setError('Touchez la carte à l’endroit de l’obstacle.');
    if (!kind) return setError('Choisissez le motif.');
    const geom = obstacleGeom([[point.lat, point.lng]]);
    if (!geom) return;
    setBusy(true);
    setError(null);
    try {
      await proposeObstacle({ kind, geom, note: note.trim().slice(0, 200) || null, endsAt: new Date(Date.now() + OBSTACLE_REPORT_MS).toISOString() });
      setDone(true);
      setOpen(false);
      setPoint(null);
      setKind(null);
      setNote('');
    } catch {
      setError('Le signalement n’est pas parti. Vérifiez la connexion puis réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {done && !open && <NavyNotice tone="ok">Merci ! L’opératrice va vérifier votre signalement avant de l’afficher aux autres.</NavyNotice>}
      {!open ? (
        <button
          type="button"
          className={`${btnSecondary} w-full`}
          disabled={!isOnline}
          onClick={() => {
            setDone(false);
            setError(null);
            setOpen(true);
          }}
        >
          <TriangleAlert className="w-5 h-5" aria-hidden="true" />
          Signaler un obstacle
        </button>
      ) : (
        <NavyCard className="p-4 space-y-3">
          <h3 className="font-semibold">Signaler un obstacle</h3>
          <p className="text-sm text-navyay-charcoal/80">Touchez la carte à l’endroit de l’obstacle, puis choisissez le motif.</p>
          <NavyMap
            ariaLabel="Carte : placez l’obstacle"
            pin={point}
            onPinChange={(lat, lng) => setPoint({ lat, lng })}
            fit={point ? 'pin' : 'island'}
            locate
          />
          <fieldset>
            <legend className={labelCls}>Motif</legend>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(Object.keys(OBSTACLE_LABELS) as NavyObstacleKind[]).map((k) => {
                const Icon = OBSTACLE_ICONS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                    className={`flex min-h-[48px] items-center gap-2 rounded-xl border-[1.5px] px-3 py-2 text-left text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
                      kind === k ? 'border-navyay-yellow bg-navyay-yellow/[0.18]' : 'border-navyay-charcoal/15 bg-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    {OBSTACLE_LABELS[k]}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className={labelCls}>
            Précision (facultatif)
            <input
              className={inputCls}
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Pont fermé, grosse flaque…"
            />
          </label>
          {error && <NavyNotice tone="error">{error}</NavyNotice>}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className={btnAccent} disabled={busy || !point || !kind || !isOnline} onClick={() => void send()}>
              {busy ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Send className="w-5 h-5" aria-hidden="true" />}
              Envoyer le signalement
            </button>
            <button type="button" className={btnSecondary} disabled={busy} onClick={() => setOpen(false)}>
              Annuler
            </button>
          </div>
          <p className="text-xs text-navyay-charcoal/75">Il n’apparaît aux autres qu’après la validation de l’opératrice.</p>
        </NavyCard>
      )}
      {mine.length > 0 && (
        <ul className="space-y-1 text-sm" aria-label="Vos signalements">
          {mine.slice(0, 5).map((o) => (
            <li key={o.id} className="flex items-center gap-2 text-navyay-charcoal/80">
              <TriangleAlert className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">
                {OBSTACLE_LABELS[o.kind]} · {STATUS_TEXT[o.status] ?? o.status}
                {o.status === 'valide' ? `, ${formatUntil(o.ends_at, Date.now())}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
