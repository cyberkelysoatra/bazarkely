/**
 * Tendances /gestion-eau/tendances (releveur/admin) — graphiques de pilotage :
 * conso métrée par jour, niveau du bassin, NRW par semaine, top consommateurs,
 * conso par zone. Recharts + charte AHUVI (vert forêt / olive / or).
 */
import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Gauge } from 'lucide-react';
import EauPageShell from './EauPageShell';
import EauAide from './EauAide';
import { EauEmptyState } from './EauUi';
import { AIDE } from './eauAideTextes';
import { getTendances, type TendancesData, type SeriePoint } from '../services/eauTendanceService';
import { fmtM3, fmtPct } from '../utils/format';

const FOREST = '#364E30';
const OLIVE = '#4C6D40';
const GOLD = '#9D9B4B';
const TEAL = '#10939F';
const ROSE = '#b91c1c';

function ChartCard({
  title,
  hint,
  badge,
  children,
}: {
  title: string;
  hint?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-ahuvi-100 bg-white p-3 shadow-soft">
      <div className="mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-ahuvi-forest font-ahuvi-body">{title}</h3>
          {badge}
        </div>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** Aire de consommation (m³/jour) — animation Recharts désactivée (cf. v3.43.1). */
function ConsoArea({ points }: { points: SeriePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={points.map((p) => ({ ...p, x: shortDay(p.label) }))}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="x" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} width={32} />
        <Tooltip formatter={(v: number) => fmtM3(v)} />
        <Area type="monotone" dataKey="value" name="Conso" stroke={OLIVE} fill={OLIVE} fillOpacity={0.25} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function shortDay(label: string): string {
  // 'YYYY-MM-DD' → 'DD/MM'
  const [, m, d] = label.split('-');
  return d && m ? `${d}/${m}` : label;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-gray-400 text-center py-8">{children}</div>;
}

export default function EauTendancesPage() {
  const [data, setData] = useState<TendancesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const d = await getTendances();
      if (alive) {
        setData(d);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <EauPageShell title="Tendances" subtitle="Pilotage — conso, niveau, NRW, consommateurs" aide={AIDE.tendances}>
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : !data ? (
        <Empty>Aucune donnée.</Empty>
      ) : (
        <div className="space-y-3">
          {/* Conso par jour : MÉTRÉE dès qu'il existe des relevés de compteur,
              sinon ESTIMÉE via le débit des pompes (bascule automatique). */}
          {data.aDesCompteurs ? (
            <ChartCard title="Consommation métrée par jour" hint="m³ — issu des compteurs">
              {data.consoParJour.length === 0 ? (
                <Empty>Pas encore de bilan sur la période.</Empty>
              ) : (
                <ConsoArea points={data.consoParJour} />
              )}
            </ChartCard>
          ) : data.debitDisponible ? (
            <ChartCard
              title="Consommation estimée par jour"
              hint="m³ — estimée via le débit des pompes (en attendant les compteurs)"
              badge={
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  estimée (débit)
                </span>
              }
            >
              <EauAide {...AIDE.tendancesConsoEstimee} />
              {data.consoEstimeeParJour.length === 0 ? (
                <Empty>Pas assez de relevés de niveau pour estimer.</Empty>
              ) : (
                <ConsoArea points={data.consoEstimeeParJour} />
              )}
            </ChartCard>
          ) : (
            <ChartCard title="Consommation estimée par jour">
              <EauEmptyState
                icon={Gauge}
                title="Estimation indisponible"
                hint="Enregistrez un test de débit (onglet Débit de la saisie bassin) pour estimer la consommation."
              />
            </ChartCard>
          )}

          <ChartCard title="Niveau du bassin" hint="volume mesuré (m³) à chaque relevé">
            {data.niveauBassin.length === 0 ? (
              <Empty>Pas encore de relevé de niveau.</Empty>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.niveauBassin.map((p) => ({ ...p, x: shortDay(p.label) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={32} />
                  <Tooltip formatter={(v: number) => fmtM3(v)} />
                  <Line type="monotone" dataKey="value" name="Niveau" stroke={TEAL} dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="NRW (pertes) par semaine" hint="% d'eau non facturée">
            {data.nrwParBucket.length === 0 ? (
              <Empty>Pas encore de données entrées/conso.</Empty>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.nrwParBucket.map((p) => ({ ...p, x: shortDay(p.label) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={32} />
                  <Tooltip formatter={(v: number) => fmtPct(v)} />
                  <Bar dataKey="nrwPct" name="NRW" fill={ROSE} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Top consommateurs" hint="conso sur la fenêtre (m³)">
            {data.topConsommateurs.length === 0 ? (
              <Empty>Aucune consommation positive relevée.</Empty>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, data.topConsommateurs.length * 28)}>
                <BarChart
                  layout="vertical"
                  data={data.topConsommateurs}
                  margin={{ left: 8, right: 8 }}
                >
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nom" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => fmtM3(v)} />
                  <Bar dataKey="value" name="Conso" fill={FOREST} radius={[0, 3, 3, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Consommation par zone" hint="répartition (m³)">
            {data.consoParZone.length === 0 ? (
              <Empty>Aucune zone avec consommation.</Empty>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(120, data.consoParZone.length * 28)}>
                <BarChart layout="vertical" data={data.consoParZone} margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nom" width={90} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => fmtM3(v)} />
                  <Bar dataKey="value" name="Conso" fill={GOLD} radius={[0, 3, 3, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}
    </EauPageShell>
  );
}
