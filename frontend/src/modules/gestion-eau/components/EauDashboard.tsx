/** Tableau de bord /gestion-eau : stock, entrées/conso du jour, dernier bilan, NRW + mini-graphe. */
import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Droplet, ArrowDownToLine, Gauge, Percent, Waves, Hourglass, ScrollText,
} from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauStatCard } from './EauUi';
import { AIDE } from './eauAideTextes';
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

function Card({
  title,
  icon: Icon,
  children,
  tone,
  onClick,
  onIconClick,
  iconAriaLabel,
}: {
  title: string;
  icon?: typeof ScrollText;
  children: React.ReactNode;
  tone?: 'ok' | 'warn';
  onClick?: () => void;
  onIconClick?: () => void;
  iconAriaLabel?: string;
}) {
  const ring =
    tone === 'warn' ? 'border-amber-300 bg-amber-50' : tone === 'ok' ? 'border-emerald-300 bg-emerald-50' : 'border-ahuvi-100 bg-white';
  const interactiveProps = onClick
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};
  return (
    <div
      {...interactiveProps}
      className={`rounded-xl border p-4 shadow-soft ${ring} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
        {Icon &&
          (onIconClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIconClick();
              }}
              aria-label={iconAriaLabel}
              className="rounded cursor-pointer hover:text-ahuvi-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300"
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <Icon className="w-4 h-4" aria-hidden="true" />
          ))}
        {title}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function EauDashboard() {
  const navigate = useNavigate();
  // Destinations « voir » et « saisir » (cf. matrice du tableau de bord).
  const goTendances = () => navigate('/gestion-eau/tendances');
  const goSuivi = () => navigate('/gestion-eau/suivi');
  // Le paramètre `bt` (bassin-tab) ouvre directement le bon sous-onglet de la saisie bassin
  // (EauSaisieBassinPage lit `bt` : niveau/entree/debit). Absent → Niveau par défaut.
  const goSaisieBassin = (bt: 'niveau' | 'entree' | 'debit' = 'niveau') =>
    navigate(`/gestion-eau/releves?tab=bassin&bt=${bt}`);
  const goSaisieCompteur = () => navigate('/gestion-eau/releves?tab=compteur');

  const [data, setData] = useState<DashboardData | null>(null);
  const [conso, setConso] = useState<SeriePoint[]>([]);
  const [niveau, setNiveau] = useState<SeriePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, t] = await Promise.all([getDashboardData(), getTendances({ fenetreJours: 30 })]);
      if (alive) {
        setData(d);
        setConso(t.consoParJour);
        setNiveau(t.niveauBassin);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <EauPageShell title="Gestion Eau" subtitle="Tableau de bord du bassin et des compteurs" aide={AIDE.dashboard}>
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="space-y-3">
          {/* 2 colonnes thématiques : gauche = saisie bassin, droite = saisie compteur. */}
          <div className="grid grid-cols-2 gap-3">
            {/* Colonne gauche : cartes dont l'icône ouvre la saisie BASSIN. */}
            <div className="flex flex-col gap-3">
              <EauStatCard
                icon={Droplet}
                tone="teal"
                label="Stock actuel"
                value={fmtM3(data?.stockActuelM3 ?? null)}
                hint={
                  <>
                    Remplissage : {data?.tauxRemplissage != null ? fmtPct(data.tauxRemplissage, { isRatio: true }) : '—'}
                    {data?.volumeMaxM3 != null && <span className="text-gray-400"> / {fmtM3(data.volumeMaxM3)}</span>}
                  </>
                }
                onClick={goTendances}
                onIconClick={() => goSaisieBassin('niveau')}
                iconAriaLabel="Saisir un relevé bassin"
                hideChevron
              />

              <EauStatCard
                icon={ArrowDownToLine}
                tone="emerald"
                label="Entrées du jour"
                value={fmtM3(data?.entreesJourM3 ?? 0)}
                onClick={goTendances}
                onIconClick={() => goSaisieBassin('entree')}
                iconAriaLabel="Saisir une entrée d'eau (bassin)"
                hideChevron
              />

              <EauStatCard
                icon={Gauge}
                tone="forest"
                label="Débit courant"
                value={data?.debitCourantM3h != null ? `${data.debitCourantM3h.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m³/h` : '—'}
                hint="Apport des pompes"
                onClick={goTendances}
                onIconClick={() => goSaisieBassin('debit')}
                iconAriaLabel="Saisir un relevé bassin"
                hideChevron
              />
            </div>

            {/* Colonne droite : cartes dont l'icône ouvre la saisie COMPTEUR. */}
            <div className="flex flex-col gap-3">
              <EauStatCard
                icon={Droplet}
                tone="olive"
                label="Conso du jour"
                value={fmtM3(data?.consoJourM3 ?? 0)}
                hint={data?.consoJourEstimee ? <span className="text-xs text-gray-400">estimée (débit)</span> : undefined}
                onClick={goTendances}
                onIconClick={goSaisieCompteur}
                iconAriaLabel="Saisir un relevé compteur"
                hideChevron
              />

              {/* NRW : modèle réseau (apport − Δstock − compteurs) si disponible, sinon ancien NRW. */}
              <EauStatCard
                icon={Percent}
                tone="rose"
                label="NRW (période)"
                value={data?.nrwReseauPeriode ? fmtPct(data.nrwReseauPeriode.nrwPct) : data?.nrwPeriode ? fmtPct(data.nrwPeriode.nrwPct) : '—'}
                hint={`Pertes : ${data?.nrwReseauPeriode ? fmtM3(data.nrwReseauPeriode.pertesM3) : data?.nrwPeriode ? fmtM3(data.nrwPeriode.pertesM3) : '—'}`}
                onClick={goSuivi}
                onIconClick={goSaisieCompteur}
                iconAriaLabel="Saisir un relevé compteur"
                hideChevron
              />

              <EauStatCard
                icon={Waves}
                tone="teal"
                label="Conso réseau (période)"
                value={data?.consoReseauPeriodeM3 != null ? fmtM3(data.consoReseauPeriodeM3) : '—'}
                hint="Sortie vers le réseau"
                onClick={goTendances}
                onIconClick={goSaisieCompteur}
                iconAriaLabel="Saisir un relevé compteur"
                hideChevron
              />

              <EauStatCard
                icon={Hourglass}
                tone="amber"
                label="Autonomie estimée"
                value={fmtAutonomie(data?.autonomie.autonomieHeures ?? null)}
                hint={data?.autonomie.consoMoyenneJourM3 ? `${fmtM3(data.autonomie.consoMoyenneJourM3)}/j` : 'Conso moyenne inconnue'}
                onClick={goTendances}
                onIconClick={goSaisieCompteur}
                iconAriaLabel="Saisir un relevé compteur"
                hideChevron
              />
            </div>
          </div>

          <div>
            <Card
              title="Dernier bilan"
              icon={ScrollText}
              tone={data?.dernierBilan ? (data.dernierBilan.anomalie ? 'warn' : 'ok') : undefined}
              onClick={goSuivi}
              onIconClick={() => goSaisieBassin('niveau')}
              iconAriaLabel="Saisir un relevé bassin"
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

          {/* Mini-graphique : consommation des 30 derniers jours → toute la zone renvoie vers Tendances. */}
          <div
            role="button"
            tabIndex={0}
            onClick={goTendances}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goTendances();
              }
            }}
            className="rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300"
          >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <Droplet className="w-4 h-4" aria-hidden="true" /> Conso (30 j)
                </div>
                <Link
                  to="/gestion-eau/tendances"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-ahuvi-olive hover:underline"
                >
                  <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Tendances
                </Link>
              </div>
              {conso.length === 0 ? (
                <div className="text-sm text-gray-400 py-4 text-center">Pas encore de bilan.</div>
              ) : (
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={conso}>
                    <Tooltip formatter={(v: number) => fmtM3(v)} labelFormatter={() => ''} />
                    <Area type="monotone" dataKey="value" stroke="#4C6D40" fill="#4C6D40" fillOpacity={0.2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
          </div>

          {/* Mini-graphique : niveau du bassin (volume mesuré) → toute la zone renvoie vers Tendances. */}
          <div
            role="button"
            tabIndex={0}
            onClick={goTendances}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goTendances();
              }
            }}
            className="rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft cursor-pointer hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300"
          >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <Waves className="w-4 h-4" aria-hidden="true" /> Niveau du bassin
                </div>
                <Link
                  to="/gestion-eau/tendances"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-ahuvi-olive hover:underline"
                >
                  <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Tendances
                </Link>
              </div>
              {niveau.length === 0 ? (
                <div className="text-sm text-gray-400 py-4 text-center">Pas encore de relevé de niveau.</div>
              ) : (
                <ResponsiveContainer width="100%" height={90}>
                  <AreaChart data={niveau}>
                    <XAxis dataKey="label" hide />
                    <Tooltip formatter={(v: number) => fmtM3(v)} labelFormatter={() => ''} />
                    <Area type="monotone" dataKey="value" stroke="#10939F" fill="#10939F" fillOpacity={0.2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
          </div>
        </div>
      )}
    </EauPageShell>
  );
}
