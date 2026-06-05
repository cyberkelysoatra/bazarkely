/** Tableau de bord /gestion-eau : stock, entrées/conso du jour, dernier bilan, NRW + mini-graphe. */
import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import EauPageShell from './EauPageShell';
import { getDashboardData, type DashboardData } from '../services/eauBilanService';
import { getTendances, type SeriePoint } from '../services/eauTendanceService';
import { fmtM3, fmtPct } from '../utils/format';
import { fmtDate } from '../utils/format';

/** Formate une autonomie en heures → « 2 j 4 h » ou « 5 h » (— si indéfinie). */
function fmtAutonomie(heures: number | null): string {
  if (heures == null || !Number.isFinite(heures)) return '—';
  if (heures < 24) return `${heures.toFixed(1)} h`;
  const j = Math.floor(heures / 24);
  const h = Math.round(heures - j * 24);
  return `${j} j ${h} h`;
}

function Card({ title, children, tone }: { title: string; children: React.ReactNode; tone?: 'ok' | 'warn' }) {
  const ring =
    tone === 'warn' ? 'border-amber-300 bg-amber-50' : tone === 'ok' ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white';
  return (
    <div className={`rounded-xl border p-4 shadow-soft ${ring}`}>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function EauDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [conso, setConso] = useState<SeriePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, t] = await Promise.all([getDashboardData(), getTendances({ fenetreJours: 30 })]);
      if (alive) {
        setData(d);
        setConso(t.consoParJour);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <EauPageShell title="Gestion Eau" subtitle="Tableau de bord du bassin et des compteurs">
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Card title="Stock actuel">
            <div className="text-2xl font-bold text-sky-700">{fmtM3(data?.stockActuelM3 ?? null)}</div>
            <div className="text-sm text-gray-500">
              Remplissage : {data?.tauxRemplissage != null ? fmtPct(data.tauxRemplissage, { isRatio: true }) : '—'}
              {data?.volumeMaxM3 != null && (
                <span className="text-gray-400"> / {fmtM3(data.volumeMaxM3)}</span>
              )}
            </div>
          </Card>

          <Card title="Entrées du jour">
            <div className="text-2xl font-bold text-emerald-700">{fmtM3(data?.entreesJourM3 ?? 0)}</div>
          </Card>

          <Card title="Conso du jour">
            <div className="text-2xl font-bold text-indigo-700">{fmtM3(data?.consoJourM3 ?? 0)}</div>
          </Card>

          <Card title="Débit courant">
            <div className="text-2xl font-bold text-ahuvi-olive">
              {data?.debitCourantM3h != null ? `${data.debitCourantM3h.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m³/h` : '—'}
            </div>
            <div className="text-sm text-gray-500">Apport des pompes</div>
          </Card>

          {/* NRW : modèle réseau (apport − Δstock − compteurs) si disponible, sinon ancien NRW. */}
          <Card title="NRW (période)">
            <div className="text-2xl font-bold text-rose-700">
              {data?.nrwReseauPeriode ? fmtPct(data.nrwReseauPeriode.nrwPct) : data?.nrwPeriode ? fmtPct(data.nrwPeriode.nrwPct) : '—'}
            </div>
            <div className="text-sm text-gray-500">
              Pertes : {data?.nrwReseauPeriode ? fmtM3(data.nrwReseauPeriode.pertesM3) : data?.nrwPeriode ? fmtM3(data.nrwPeriode.pertesM3) : '—'}
            </div>
          </Card>

          <Card title="Conso réseau (période)">
            <div className="text-2xl font-bold text-teal-700">
              {data?.consoReseauPeriodeM3 != null ? fmtM3(data.consoReseauPeriodeM3) : '—'}
            </div>
            <div className="text-sm text-gray-500">Sortie vers le réseau</div>
          </Card>

          <Card title="Autonomie estimée">
            <div className="text-2xl font-bold text-amber-700">{fmtAutonomie(data?.autonomie.autonomieHeures ?? null)}</div>
            <div className="text-sm text-gray-500">
              {data?.autonomie.consoMoyenneJourM3 ? `${fmtM3(data.autonomie.consoMoyenneJourM3)}/j` : 'Conso moyenne inconnue'}
            </div>
          </Card>

          <div className="col-span-2">
            <Card
              title="Dernier bilan"
              tone={data?.dernierBilan ? (data.dernierBilan.anomalie ? 'warn' : 'ok') : undefined}
            >
              {data?.dernierBilan ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{fmtDate(data.dernierBilan.timestamp)}</span>
                    <span
                      className={`text-sm font-semibold ${
                        data.dernierBilan.anomalie ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {data.dernierBilan.anomalie ? '⚠️ Anomalie' : '✅ OK'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    Écart : {fmtM3(data.dernierBilan.ecart_m3)} ({fmtPct(data.dernierBilan.ecart_pct)})
                  </div>
                  <div className="text-xs text-gray-500">
                    Attendu {fmtM3(data.dernierBilan.stock_attendu)} · Mesuré {fmtM3(data.dernierBilan.stock_mesure)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  Aucun bilan pour l'instant. Saisissez deux relevés de niveau pour générer un bilan.
                </div>
              )}
            </Card>
          </div>

          {/* Mini-graphique : consommation des 30 derniers jours → renvoie vers Tendances. */}
          <div className="col-span-2">
            <div className="rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Conso (30 j)
                </div>
                <Link to="/gestion-eau/tendances" className="flex items-center gap-1 text-xs text-ahuvi-olive hover:underline">
                  <TrendingUp className="w-3.5 h-3.5" /> Tendances
                </Link>
              </div>
              {conso.length === 0 ? (
                <div className="text-sm text-gray-400 py-4 text-center">Pas encore de bilan.</div>
              ) : (
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={conso}>
                    <Tooltip formatter={(v: number) => fmtM3(v)} labelFormatter={() => ''} />
                    <Area type="monotone" dataKey="value" stroke="#4C6D40" fill="#4C6D40" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </EauPageShell>
  );
}
