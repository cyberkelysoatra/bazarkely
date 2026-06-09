/**
 * Vue « Situation du bassin » pour le PROPRIÉTAIRE (rôle technique `client`) — LECTURE SEULE.
 *
 * Le propriétaire consulte l'état du bassin commun (niveau, % de remplissage, autonomie
 * estimée, conso estimée du jour) sans aucune saisie. Réutilise les MÊMES services que le
 * tableau de bord opérationnel (`getDashboardData` + `getTendances`) — aucun calcul dupliqué.
 *
 * La RLS (policies `_sel_client`) ouvre la LECTURE des tables bassin au propriétaire ;
 * il n'a aucune policy d'écriture → cet écran n'expose donc aucun contrôle de modification.
 */
import { useEffect, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';
import { Waves, Droplet, Percent, Hourglass } from 'lucide-react';
import { EauStatCard, EauEmptyState } from './EauUi';
import { getDashboardData, type DashboardData } from '../services/eauBilanService';
import { getTendances, type SeriePoint } from '../services/eauTendanceService';
import { fmtM3, fmtPct } from '../utils/format';

/** Formate une autonomie en heures → « 2 j 4 h » / « 5 h » (— si indéfinie). */
function fmtAutonomie(heures: number | null): string {
  if (heures == null || !Number.isFinite(heures) || heures <= 0) return '—';
  const j = Math.floor(heures / 24);
  const h = Math.round(heures % 24);
  if (j > 0) return `${j} j ${h} h`;
  return `${h} h`;
}

export default function EauProprietaireBassinPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [niveau, setNiveau] = useState<SeriePoint[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [d, t] = await Promise.all([getDashboardData(), getTendances({ fenetreJours: 30 })]);
        if (!alive) return;
        setData(d);
        setNiveau(t.niveauBassin);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>;
  }

  const aucuneDonnee = data == null || data.stockActuelM3 == null;

  if (aucuneDonnee) {
    return (
      <EauEmptyState
        icon={Waves}
        title="Pas encore de relevé du bassin"
        hint="La situation du bassin s'affichera dès qu'un relevé de niveau aura été saisi."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Cartes KPI — iconographie « icône d'abord » (charte AHUVI). */}
      <div className="grid grid-cols-2 gap-3">
        <EauStatCard
          icon={Droplet}
          tone="teal"
          label="Niveau actuel"
          value={fmtM3(data.stockActuelM3)}
          hint={data.volumeMaxM3 != null ? <span className="text-gray-400">/ {fmtM3(data.volumeMaxM3)}</span> : undefined}
        />
        <EauStatCard
          icon={Percent}
          tone="forest"
          label="Remplissage"
          value={data.tauxRemplissage != null ? fmtPct(data.tauxRemplissage, { isRatio: true }) : '—'}
          hint="du bassin commun"
        />
        <EauStatCard
          icon={Hourglass}
          tone="gold"
          label="Autonomie estimée"
          value={fmtAutonomie(data.autonomie.autonomieHeures ?? null)}
          hint={data.autonomie.consoMoyenneJourM3 ? `${fmtM3(data.autonomie.consoMoyenneJourM3)}/j` : 'Conso moyenne inconnue'}
        />
        <EauStatCard
          icon={Waves}
          tone="olive"
          label="Conso du jour"
          value={fmtM3(data.consoJourM3 ?? 0)}
          hint={data.consoJourEstimee ? 'estimée' : 'mesurée'}
        />
      </div>

      {/* Courbe du niveau du bassin (volume mesuré) — animation désactivée (cf. v3.43.1). */}
      <div className="rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          <Waves className="w-4 h-4 text-ahuvi-teal" aria-hidden="true" /> Niveau du bassin (30 j)
        </div>
        {niveau.length === 0 ? (
          <div className="text-xs text-gray-400 py-6 text-center">Historique disponible après plusieurs relevés.</div>
        ) : (
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={niveau}>
              <XAxis dataKey="label" hide />
              <Tooltip formatter={(v: number) => fmtM3(v)} labelFormatter={() => ''} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10939F"
                fill="#10939F"
                fillOpacity={0.2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
