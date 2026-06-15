/** Tableau de bord /gestion-eau : stock, entrées/conso du jour, dernier bilan, NRW + mini-graphe. */
import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Droplet, ArrowDownToLine, Gauge, Percent, Waves, Hourglass, ScrollText, Zap, CalendarRange,
} from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauStatCard, EauCard, EauChartCard, EAU_CHART } from './EauUi';
import { AIDE } from './eauAideTextes';
import { getDashboardData, type DashboardData, type ConsoJourSource, type BaseHoraire } from '../services/eauBilanService';
import { getTendances, type SeriePoint } from '../services/eauTendanceService';
import { getElecKpiData, type ElecKpiData } from '../services/eauElecReleveService';
import { fmtM3, fmtPct, fmtKwh, fmtM3h, fmtKw } from '../utils/format';
import { fmtDate } from '../utils/format';

/** Base horaire mémorisée (localStorage) + libellés associés. */
const BASE_KEY = 'eau_dashboard_base_horaire';
const BASE_HORAIRE_OPTIONS: { key: BaseHoraire; label: string }[] = [
  { key: 'jour', label: 'Depuis minuit' },
  { key: 'h24', label: 'Sur 24 h' },
  { key: 'periode', label: 'Sur la période' },
];

/**
 * Libellé discret sous « Conso du jour » selon l'origine du chiffre. Une absence de
 * relevé n'est pas une consommation nulle → on signale qu'il s'agit d'une projection.
 */
function consoJourHint(source: ConsoJourSource | undefined): React.ReactNode {
  const proj = (txt: string) => (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <TrendingUp className="w-3 h-3" aria-hidden="true" /> {txt}
    </span>
  );
  switch (source) {
    case 'estimee_intervalle':
      return <span className="text-xs text-gray-400">estimée (débit)</span>;
    case 'projection_tendance':
      return proj('estimée (tendance, relevés en attente)');
    case 'projection_moyenne':
      return proj('estimée (moyenne période)');
    case 'projection_debit':
      return proj('estimée (débit, à confirmer)');
    case 'zero_compteurs':
      return <span className="text-xs text-gray-400">mesurée (compteurs à 0)</span>;
    case 'mesuree':
    default:
      return undefined;
  }
}

/** Formate une autonomie en heures → « 2 j 4 h » ou « 5 h » (— si indéfinie). */
function fmtAutonomie(heures: number | null): string {
  if (heures == null || !Number.isFinite(heures)) return '—';
  if (heures < 24) return `${heures.toFixed(1)} h`;
  const j = Math.floor(heures / 24);
  const h = Math.round(heures - j * 24);
  return `${j} j ${h} h`;
}

/**
 * En-tête de carte titrée du tableau de bord : libellé majuscule + icône optionnelle
 * (cliquable → `onIconClick`, ex. « saisir »). Extrait pour les cartes non-graphe
 * (« Dernier bilan ») qui s'appuient sur la coque centralisée `EauCard`.
 */
function CardHeader({
  title,
  icon: Icon,
  onIconClick,
  iconAriaLabel,
}: {
  title: string;
  icon?: typeof ScrollText;
  onIconClick?: () => void;
  iconAriaLabel?: string;
}) {
  return (
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
  // Sous-onglet « Électricité » des Relevés (saisie d'index kWh).
  const goSaisieElec = () => navigate('/gestion-eau/releves?tab=elec');

  const [data, setData] = useState<DashboardData | null>(null);
  const [conso, setConso] = useState<SeriePoint[]>([]);
  const [niveau, setNiveau] = useState<SeriePoint[]>([]);
  const [elecKpi, setElecKpi] = useState<ElecKpiData | null>(null);
  const [loading, setLoading] = useState(true);

  // Base horaire des débits (m³/h) — choix mémorisé, défaut « depuis minuit ».
  const [base, setBase] = useState<BaseHoraire>(() => {
    const saved = localStorage.getItem(BASE_KEY);
    return saved === 'h24' || saved === 'periode' ? saved : 'jour';
  });
  const changeBase = (b: BaseHoraire) => {
    setBase(b);
    try {
      localStorage.setItem(BASE_KEY, b);
    } catch {
      /* stockage indisponible (mode privé) — sans gravité */
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, t, e] = await Promise.all([
        getDashboardData(),
        getTendances({ fenetreJours: 30 }),
        getElecKpiData(),
      ]);
      if (alive) {
        setData(d);
        setConso(t.consoParJour);
        setNiveau(t.niveauBassin);
        setElecKpi(e);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /** Texte d'aide sous la valeur de la carte KPI électricité selon l'état des relevés. */
  const elecHint = (): React.ReactNode => {
    if (!elecKpi || elecKpi.totalReleves === 0)
      return 'Aucun relevé électrique — appuyez pour saisir un index';
    if (elecKpi.consoRecenteKwh == null)
      return "En attente d'un 2ᵉ relevé pour calculer la consommation";
    return (
      <>
        Dernière conso · {fmtKwh(elecKpi.consoRecenteKwh)} · {elecKpi.nbCompteursReleves} compteur
        {elecKpi.nbCompteursReleves > 1 ? 's' : ''}
        {elecKpi.dernierReleveDate && (
          <span className="text-gray-400"> · relevé du {fmtDate(elecKpi.dernierReleveDate)}</span>
        )}
      </>
    );
  };

  // ── Dérivés « base horaire » : fenêtre sélectionnée, débit moyen m³/h et libellés ──
  const flux = data?.flux[base];
  /** Convertit un cumul (m³) en débit moyen m³/h sur la fenêtre courante. */
  const rate = (cumul: number | null | undefined): number | null => {
    if (cumul == null || !flux || flux.heures <= 0) return null;
    return cumul / flux.heures;
  };
  // Suffixe de libellé de carte + texte du sous-titre (cumul) selon la fenêtre.
  const winSuffix = base === 'jour' ? 'du jour' : base === 'h24' ? '(24 h)' : '(période)';
  const winSub =
    base === 'jour' ? 'depuis minuit' : base === 'h24' ? 'sur 24 h' : `sur ${data?.periodeJours ?? 30} j`;
  /** Sous-titre standard d'une carte de flux : cumul m³ + fenêtre. */
  const cumulSub = (cumul: number | null | undefined) => `${fmtM3(cumul ?? 0)} ${winSub}`;

  const baseSelector = (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-ahuvi-200 bg-white px-2 py-1.5 text-xs font-ahuvi-body text-ahuvi-forest shadow-soft transition-colors hover:border-ahuvi-300 focus-within:border-ahuvi-300 focus-within:ring-2 focus-within:ring-ahuvi-300">
      <CalendarRange className="w-3.5 h-3.5 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
      <select
        value={base}
        onChange={(e) => changeBase(e.target.value as BaseHoraire)}
        aria-label="Base horaire des débits"
        className="appearance-none cursor-pointer border-0 bg-transparent font-medium text-ahuvi-forest focus:outline-none focus:ring-0"
      >
        {BASE_HORAIRE_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <EauPageShell
      title="Gestion Eau"
      subtitle="Tableau de bord"
      aide={AIDE.dashboard}
      actions={baseSelector}
    >
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
                icon={Gauge}
                tone="forest"
                label="Pompes en marche"
                value={data?.debitCourantM3h != null ? `${data.debitCourantM3h.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} m³/h` : '—'}
                hint="Apport des pompes"
                onClick={goTendances}
                onIconClick={() => goSaisieBassin('debit')}
                iconAriaLabel="Saisir un relevé bassin"
                hideChevron
              />

              <EauStatCard
                icon={ArrowDownToLine}
                tone="emerald"
                label={`Entrées ${winSuffix}`}
                value={fmtM3h(rate(flux?.entreesM3))}
                hint={cumulSub(flux?.entreesM3)}
                onClick={goTendances}
                onIconClick={() => goSaisieBassin('entree')}
                iconAriaLabel="Saisir une entrée d'eau (bassin)"
                hideChevron
              />
            </div>

            {/* Colonne droite : cartes dont l'icône ouvre la saisie COMPTEUR. */}
            <div className="flex flex-col gap-3">
              <EauStatCard
                icon={Waves}
                tone="teal"
                label="Conso du réseau"
                value={flux?.consoReseauM3 != null ? fmtM3h(rate(flux.consoReseauM3)) : '—'}
                hint={flux?.consoReseauM3 != null ? cumulSub(flux.consoReseauM3) : 'Sortie vers le réseau'}
                onClick={goTendances}
                onIconClick={goSaisieCompteur}
                iconAriaLabel="Saisir un relevé compteur"
                hideChevron
              />

              <EauStatCard
                icon={Droplet}
                tone="olive"
                label="Conso au compteur"
                value={fmtM3h(rate(flux?.consoM3))}
                hint={
                  <>
                    {cumulSub(flux?.consoM3)}
                    {base === 'jour' && consoJourHint(data?.consoJourSource) && (
                      <span className="block">{consoJourHint(data?.consoJourSource)}</span>
                    )}
                  </>
                }
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

          {/* KPI électricité : conso kWh récente (somme des dernières consos par compteur).
              Carte cliquable → sous-onglet « Électricité » des Relevés (navigation interne). */}
          <EauStatCard
            icon={Zap}
            tone="gold"
            label="Conso électrique"
            value={elecKpi?.consoRecenteKw != null ? fmtKw(elecKpi.consoRecenteKw) : '—'}
            hint={elecHint()}
            onClick={goSaisieElec}
          />

          <div>
            <EauCard
              onClick={goSuivi}
              className={
                data?.dernierBilan
                  ? data.dernierBilan.anomalie
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-emerald-300 bg-emerald-50'
                  : undefined
              }
            >
              <CardHeader
                title="Dernier bilan"
                icon={ScrollText}
                onIconClick={() => goSaisieBassin('niveau')}
                iconAriaLabel="Saisir un relevé bassin"
              />
              <div className="mt-1">
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
              </div>
            </EauCard>
          </div>

          {/* Mini-graphique : consommation des 30 derniers jours → toute la zone renvoie vers Tendances. */}
          <EauChartCard
            icon={Droplet}
            title="Conso (30 j)"
            onClick={goTendances}
            action={
              <Link
                to="/gestion-eau/tendances"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-ahuvi-olive hover:underline"
              >
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Tendances
              </Link>
            }
            empty={conso.length === 0}
            emptyIcon={Droplet}
            emptyTitle="Pas encore de bilan."
          >
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={conso}>
                <Tooltip formatter={(v: number) => fmtM3(v)} labelFormatter={() => ''} />
                <Area type="monotone" dataKey="value" stroke={EAU_CHART.olive} fill={EAU_CHART.olive} fillOpacity={0.2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </EauChartCard>

          {/* Mini-graphique : niveau du bassin (volume mesuré) → toute la zone renvoie vers Tendances. */}
          <EauChartCard
            icon={Waves}
            title="Niveau du bassin"
            onClick={goTendances}
            action={
              <Link
                to="/gestion-eau/tendances"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-ahuvi-olive hover:underline"
              >
                <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" /> Tendances
              </Link>
            }
            empty={niveau.length === 0}
            emptyIcon={Waves}
            emptyTitle="Pas encore de relevé de niveau."
          >
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={niveau}>
                <XAxis dataKey="label" hide />
                <Tooltip formatter={(v: number) => fmtM3(v)} labelFormatter={() => ''} />
                <Area type="monotone" dataKey="value" stroke={EAU_CHART.teal} fill={EAU_CHART.teal} fillOpacity={0.2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </EauChartCard>
        </div>
      )}
    </EauPageShell>
  );
}
