/** Tableau de bord /gestion-eau : stock, entrées/conso du jour, dernier bilan, NRW + mini-graphe. */
import { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Droplet, GlassWater, ArrowDownToLine, Gauge, SearchX, Waves, Hourglass, ScrollText, Zap, CalendarRange, Check,
} from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauStatCard, EauCard, EauChartCard, EAU_CHART } from './EauUi';
import { AIDE } from './eauAideTextes';
import { getDashboardData, type DashboardData, type BaseHoraire } from '../services/eauBilanService';
import { getTendances, type SeriePoint } from '../services/eauTendanceService';
import { getElecKpiData, type ElecKpiData } from '../services/eauElecReleveService';
import { fmtM3, fmtPct, fmtKwh, fmtM3h, fmtKw, fmtAutonomie } from '../utils/format';
import { fmtDate } from '../utils/format';

/** Base horaire mémorisée (localStorage) + libellés associés. */
const BASE_KEY = 'eau_dashboard_base_horaire';
const BASE_HORAIRE_OPTIONS: { key: BaseHoraire; label: string }[] = [
  { key: 'jour', label: 'Depuis minuit' },
  { key: 'h24', label: 'Sur 24 h' },
  { key: 'periode', label: 'Sur la période' },
];

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

  // Menu déroulant custom (remplace le <select> natif, non animable) : ouverture/fermeture
  // pilotées + fermeture au clic extérieur / Échap. Animation façon iOS (cf. baseSelector).
  const [baseMenuOpen, setBaseMenuOpen] = useState(false);
  const baseMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!baseMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (baseMenuRef.current && !baseMenuRef.current.contains(e.target as Node)) setBaseMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBaseMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [baseMenuOpen]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
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
        }
      } catch (err) {
        console.warn('⚠️ [EauDashboard] chargement échoué:', (err as any)?.message);
      } finally {
        if (alive) setLoading(false);
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

  // Eau non comptée sur la fenêtre courante = sortie réseau − conso comptée (mêmes fenêtres
  // que les cartes Conso du réseau / Conso au compteur), + sa part de la conso du réseau.
  // null si débit inconnu (sortie nulle) ; valeur négative aberrante traitée à l'affichage.
  const eauNonCompteeM3 = flux?.consoReseauM3 != null ? flux.consoReseauM3 - flux.consoM3 : null;
  const eauNonCompteePct =
    eauNonCompteeM3 != null && flux?.consoReseauM3 ? (eauNonCompteeM3 / flux.consoReseauM3) * 100 : null;
  // Part comptée = conso compteur ÷ conso du réseau (complément de l'eau non comptée → ~100 % à deux).
  const consoCompteurPct =
    flux?.consoReseauM3 ? (flux.consoM3 / flux.consoReseauM3) * 100 : null;

  const currentBaseLabel = BASE_HORAIRE_OPTIONS.find((o) => o.key === base)?.label ?? '';
  // Courbe d'ouverture façon iOS (ease-out-expo) : démarrage vif puis arrivée douce, sans rebond.
  const IOS_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const baseSelector = (
    <div ref={baseMenuRef} className="relative">
      <button
        type="button"
        onClick={() => setBaseMenuOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={baseMenuOpen}
        aria-label="Base horaire des débits"
        className="inline-flex items-center gap-1.5 rounded-lg border border-ahuvi-200 bg-white px-2 py-1.5 text-xs font-ahuvi-body font-medium text-ahuvi-forest shadow-soft transition-colors hover:border-ahuvi-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300"
      >
        <CalendarRange className="w-3.5 h-3.5 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
        <span>{currentBaseLabel}</span>
      </button>

      {/* Menu déroulant animé (toujours monté pour la transition ; ouverture/fermeture par classes). */}
      <div
        role="listbox"
        aria-label="Base horaire des débits"
        style={{ transitionTimingFunction: IOS_EASE }}
        className={`absolute right-0 z-30 mt-1.5 min-w-[10.5rem] origin-top-right rounded-xl border border-ahuvi-100 bg-white p-1 shadow-lg transition-[opacity,transform] duration-200 motion-reduce:transition-none ${
          baseMenuOpen
            ? 'pointer-events-auto opacity-100 scale-100 translate-y-0'
            : 'pointer-events-none opacity-0 scale-95 -translate-y-1'
        }`}
      >
        {BASE_HORAIRE_OPTIONS.map((o) => {
          const selected = base === o.key;
          return (
            <button
              key={o.key}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => {
                changeBase(o.key);
                setBaseMenuOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                selected ? 'bg-ahuvi-50 text-ahuvi-forest' : 'text-gray-600 hover:bg-ahuvi-50 hover:text-ahuvi-forest'
              }`}
            >
              {o.label}
              {selected && <Check className="w-3.5 h-3.5 flex-shrink-0 text-ahuvi-forest" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
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
                icon={GlassWater}
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
                value={fmtM3h(data?.debitCourantM3h)}
                hint="Débit entrant"
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
                value={
                  <span className="flex items-baseline justify-between gap-2">
                    <span>{fmtM3h(rate(flux?.consoM3))}</span>
                    {consoCompteurPct != null && (
                      <span className="text-sm font-medium text-gray-400" title="Part de la conso du réseau">
                        {fmtPct(consoCompteurPct)}
                      </span>
                    )}
                  </span>
                }
                hint={cumulSub(flux?.consoM3)}
                onClick={goTendances}
                onIconClick={goSaisieCompteur}
                iconAriaLabel="Saisir un relevé compteur"
                hideChevron
              />

              {/* Eau non comptée = sortie réseau − conso comptée (modèle « débit × temps de
                  marche »). Inclut la conso non comptée (golf, communs, villas sans compteur)
                  + les pertes — PAS un « NRW » de pertes tant que tout n'est pas compté.
                  Garde-fous : « — » si débit inconnu (sortie nulle) ou écart négatif aberrant. */}
              <EauStatCard
                icon={SearchX}
                tone="amber"
                label="Eau non comptée"
                value={
                  eauNonCompteeM3 != null && eauNonCompteeM3 >= 0 ? (
                    <span className="flex items-baseline justify-between gap-2">
                      <span>{fmtM3h(rate(eauNonCompteeM3))}</span>
                      {eauNonCompteePct != null && (
                        <span className="text-sm font-medium text-gray-400" title="Part de la conso du réseau">
                          {fmtPct(eauNonCompteePct)}
                        </span>
                      )}
                    </span>
                  ) : (
                    '—'
                  )
                }
                hint={
                  eauNonCompteeM3 != null && eauNonCompteeM3 >= 0
                    ? `${fmtM3(eauNonCompteeM3)} hors compteur`
                    : flux?.consoReseauM3 == null
                      ? 'Débit des pompes requis (test de débit)'
                      : 'Sortie sous le compteur — vérifier le débit'
                }
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
                hint={
                  data?.autonomie.consoMoyenneJourM3 ? (
                    <span className="flex items-baseline justify-between gap-2">
                      <span>{fmtM3(data.autonomie.consoMoyenneJourM3)}/j</span>
                      <span className="text-gray-400">{fmtM3h(data.autonomie.consoMoyenneHeureM3)}</span>
                    </span>
                  ) : (
                    'Conso moyenne inconnue'
                  )
                }
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
