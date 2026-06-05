/**
 * Rapports /gestion-eau/rapports (admin) : rapport mensuel de pilotage (entrées,
 * conso, pertes/NRW, anomalies, factures) — aperçu écran + génération PDF à la
 * demande. Proposition automatique en fin de période (bannière). Charte AHUVI.
 */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileDown, CalendarClock, Droplet, Gauge, TrendingDown, AlertTriangle, Receipt, Coins } from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauStatCard, EauIconButton } from './EauUi';
import { AIDE } from './eauAideTextes';
import {
  getRapportMensuel,
  shouldProposeRapport,
  targetReportKey,
  dismissRapportPropose,
  type RapportMensuel,
} from '../services/eauRapportService';
import { downloadRapportMensuelPdf } from '../utils/rapportPdf';
import { fmtM3, fmtPct, fmtMontant } from '../utils/format';

export default function EauRapportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rapport, setRapport] = useState<RapportMensuel | null>(null);
  const [loading, setLoading] = useState(true);
  const [propose, setPropose] = useState(false);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const r = await getRapportMensuel(y, m);
    setRapport(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Proposition de fin de période → pré-sélectionne le mois ciblé.
    if (shouldProposeRapport(now)) {
      const t = targetReportKey(now);
      setYear(t.year);
      setMonth(t.month);
      setPropose(true);
      void load(t.year, t.month);
    } else {
      void load(year, month);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeMonth = (val: string) => {
    const [y, m] = val.split('-').map(Number);
    setYear(y);
    setMonth(m - 1);
    void load(y, m - 1);
  };

  const genererPdf = async () => {
    if (!rapport) return;
    try {
      await downloadRapportMensuelPdf(rapport);
      dismissRapportPropose(now);
      setPropose(false);
      toast.success('Rapport PDF généré');
    } catch {
      toast.error('Échec de la génération PDF');
    }
  };

  const monthInputValue = `${year}-${String(month + 1).padStart(2, '0')}`;

  return (
    <EauPageShell title="Rapport mensuel" subtitle="Synthèse de pilotage à exporter (admin)" aide={AIDE.rapports}>
      {propose && (
        <div className="mb-3 rounded-xl border border-ahuvi-gold/50 bg-ahuvi-50 p-3 flex items-start gap-2">
          <CalendarClock className="w-5 h-5 text-ahuvi-gold flex-shrink-0 mt-0.5" />
          <div className="text-sm text-ahuvi-800">
            Fin de période : le rapport de <strong>{rapport?.periodeLabel ?? '…'}</strong> est prêt à être généré.
            <button
              onClick={() => {
                dismissRapportPropose(now);
                setPropose(false);
              }}
              className="ml-2 text-xs text-gray-500 underline"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft mb-4">
        <label className="text-sm block">
          <span className="flex items-center gap-1.5 text-gray-600 mb-1">
            <CalendarClock className="w-4 h-4 text-ahuvi-olive flex-shrink-0" aria-hidden="true" />
            Mois du rapport
          </span>
          <input
            type="month"
            value={monthInputValue}
            max={`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`}
            onChange={(e) => onChangeMonth(e.target.value)}
            className="w-full rounded-lg border-gray-300 focus:border-ahuvi-olive focus:ring-ahuvi-olive"
          />
        </label>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : !rapport ? (
        <div className="text-gray-400 text-sm py-8 text-center">Aucune donnée.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <EauStatCard icon={Droplet} label="Entrées" value={fmtM3(rapport.entreesM3)} tone="forest" />
            <EauStatCard icon={Gauge} label="Consommation" value={fmtM3(rapport.consoM3)} tone="teal" />
            <EauStatCard icon={TrendingDown} label="Pertes (NRW)" value={`${fmtM3(rapport.pertesM3)} · ${fmtPct(rapport.nrwPct)}`} tone="rose" />
            <EauStatCard icon={AlertTriangle} label="Anomalies" value={String(rapport.nbAnomalies)} tone={rapport.nbAnomalies > 0 ? 'rose' : 'neutral'} />
            <EauStatCard icon={Receipt} label="Factures émises" value={String(rapport.nbFactures)} tone="olive" />
            <EauStatCard icon={Coins} label="Montant facturé" value={fmtMontant(rapport.montantFactureTotal, rapport.config?.devise)} tone="forest" />
          </div>

          {rapport.montantImpaye > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              Impayé sur la période : <strong>{fmtMontant(rapport.montantImpaye, rapport.config?.devise)}</strong>
            </div>
          )}

          <EauIconButton
            icon={FileDown}
            variant="primary"
            onClick={genererPdf}
            className="w-full py-3 rounded-xl"
          >
            Générer le rapport PDF — {rapport.periodeLabel}
          </EauIconButton>
        </div>
      )}
    </EauPageShell>
  );
}
