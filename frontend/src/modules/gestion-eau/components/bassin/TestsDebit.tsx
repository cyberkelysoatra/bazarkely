/**
 * Section repliable « Tests de débit » de l'onglet Source (extrait de EauBassinReleves
 * v3.62.0). Porte localement les champs de saisie (hauteurs/heures/note) + leurs aperçus
 * dérivés pour isoler les re-renders ; délègue l'enregistrement au handler du hook.
 */
import { useMemo, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Gauge, ChevronDown, AlertTriangle, Settings, Activity, Save } from 'lucide-react';
import { EauEmptyState, EauListIcon, EAU_CHART } from '../EauUi';
import EauDrawer from '../EauDrawer';
import { computeDebit } from '../../utils/debit';
import { dureeMinFromHeures } from '../../utils/duree';
import { fmtM3, fmtDate, fmtM3h } from '../../utils/format';
import type { DebitTestLocal } from '../../types/gestionEau';

export default function TestsDebit({
  surface,
  isReadOnly,
  busy,
  debitOpen,
  setDebitOpen,
  debitRef,
  tests,
  debitChartData,
  debitCourantM3h,
  flotteurCm,
  onSubmit,
}: {
  surface: number | null;
  isReadOnly: boolean;
  busy: boolean;
  debitOpen: boolean;
  setDebitOpen: Dispatch<SetStateAction<boolean>>;
  debitRef: RefObject<HTMLDivElement | null>;
  tests: DebitTestLocal[];
  debitChartData: { label: string; debit: number }[];
  debitCourantM3h: number | null | undefined;
  flotteurCm: number | null;
  onSubmit: (
    vals: { debitDebutCm: string; debitFinCm: string; debitDureeMin: number | null; debitNote: string },
    reset: () => void
  ) => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const [debitDebutCm, setDebitDebutCm] = useState('');
  const [debitFinCm, setDebitFinCm] = useState('');
  const [debitHeureDebut, setDebitHeureDebut] = useState('');
  const [debitHeureFin, setDebitHeureFin] = useState('');
  const [debitNote, setDebitNote] = useState('');

  // Durée dérivée des heures de début/fin (min), null tant que la saisie est incomplète.
  const debitDureeMin = useMemo(
    () => dureeMinFromHeures(debitHeureDebut, debitHeureFin),
    [debitHeureDebut, debitHeureFin]
  );

  // Aperçu live du débit (Q_in) — durée dérivée des heures.
  const debitPreview = useMemo(() => {
    if (surface == null) return null;
    if (debitDebutCm.trim() === '' || debitFinCm.trim() === '' || debitDureeMin == null) return null;
    const d = Number(debitDebutCm);
    const f = Number(debitFinCm);
    if (![d, f].every(Number.isFinite)) return null;
    return computeDebit({ niveauDebutCm: d, niveauFinCm: f, dureeMin: debitDureeMin, surfaceM2: surface });
  }, [debitDebutCm, debitFinCm, debitDureeMin, surface]);

  const debitFinAuDessusFlotteur =
    flotteurCm != null && debitFinCm.trim() !== '' && Number(debitFinCm) > flotteurCm;

  const submit = () =>
    onSubmit({ debitDebutCm, debitFinCm, debitDureeMin, debitNote }, () => {
      setDebitDebutCm('');
      setDebitFinCm('');
      setDebitHeureDebut('');
      setDebitHeureFin('');
      setDebitNote('');
    });

  return (
    <div ref={debitRef} className="rounded-xl border border-ahuvi-100 bg-white shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setDebitOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-ahuvi-forest"
      >
        <span className="inline-flex items-center gap-2">
          <Gauge className="w-4 h-4" aria-hidden="true" /> Tests de débit
          {debitCourantM3h != null && (
            <span className="text-xs font-medium text-ahuvi-olive bg-ahuvi-50 rounded-full px-2 py-0.5">
              courant {fmtM3h(debitCourantM3h)}
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${debitOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {debitOpen && (
        <EauDrawer>
          <div className="px-4 pb-4 border-t border-ahuvi-100 pt-3 space-y-4">
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                Test « vanne fermée » : fermez la sortie, relevez le niveau au début et à la fin, notez la durée —
                le débit d'apport Q_in est déduit automatiquement.
              </div>
              {surface == null && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <span>
                    Configurez les dimensions du bassin (L × l) d'abord.{' '}
                    <button className="inline-flex items-center gap-1 underline font-medium" onClick={() => navigate('/gestion-eau/config')}>
                      <Settings className="w-3.5 h-3.5" aria-hidden="true" /> Configurer
                    </button>
                  </span>
                </div>
              )}
              {/* Saisie par hauteur + heure (début / fin) — la durée est dérivée automatiquement. */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Hauteur début (cm)</span>
                    <input type="number" inputMode="decimal" step="0.1" value={debitDebutCm}
                      onChange={(e) => setDebitDebutCm(e.target.value)} disabled={surface == null || isReadOnly}
                      className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" placeholder="ex : 150" />
                  </label>
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Heure début</span>
                    <input type="time" value={debitHeureDebut}
                      onChange={(e) => setDebitHeureDebut(e.target.value)} disabled={surface == null || isReadOnly}
                      className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" />
                  </label>
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Hauteur fin (cm)</span>
                    <input type="number" inputMode="decimal" step="0.1" value={debitFinCm}
                      onChange={(e) => setDebitFinCm(e.target.value)} disabled={surface == null || isReadOnly}
                      className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" placeholder="ex : 160" />
                  </label>
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Heure fin</span>
                    <input type="time" value={debitHeureFin}
                      onChange={(e) => setDebitHeureFin(e.target.value)} disabled={surface == null || isReadOnly}
                      className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" />
                  </label>
                </div>
                {debitDureeMin != null ? (
                  <div className="text-xs text-gray-500">Durée déduite : <strong>{debitDureeMin} min</strong></div>
                ) : (
                  (debitHeureDebut.trim() !== '' || debitHeureFin.trim() !== '') && (
                    <div className="text-xs text-amber-700">Renseignez les deux heures (fin après début).</div>
                  )
                )}
              </div>
              {debitFinAuDessusFlotteur && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  ⚠️ Le niveau final dépasse la hauteur du flotteur — test au-delà du plafond opérationnel.
                </div>
              )}
              {debitPreview != null &&
                (debitPreview.valid ? (
                  <div className="text-sm text-ahuvi-teal bg-cyan-50 rounded-lg px-3 py-2">
                    Débit d'apport Q_in : <strong>{debitPreview.debitM3h.toFixed(1)} m³/h</strong>
                    <span className="text-ahuvi-teal/60"> ({fmtM3(debitPreview.volumeM3)} en {debitDureeMin} min)</span>
                  </div>
                ) : (
                  <div className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{debitPreview.error}</div>
                ))}
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                <input type="text" value={debitNote} onChange={(e) => setDebitNote(e.target.value)} disabled={surface == null || isReadOnly}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100" />
              </label>
              {!isReadOnly && (
                <button onClick={submit} disabled={busy || surface == null || !debitPreview?.valid}
                  className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl">
                  <Save className="w-4 h-4" aria-hidden="true" /> Nouveau test de débit
                </button>
              )}
            </div>

            {/* Historique des tests + débit courant mis en avant. */}
            {tests.length === 0 ? (
              <EauEmptyState icon={Gauge} title="Aucun test de débit pour l'instant" />
            ) : (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  <Activity className="w-3.5 h-3.5" aria-hidden="true" /> Débit mesuré (m³/h)
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={debitChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={EAU_CHART.grid} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={32} />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)} m³/h`} />
                    <Bar dataKey="debit" name="Débit" fill={EAU_CHART.teal} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
                <ul className="space-y-2 mt-3">
                  {tests.map((t, i) => (
                    <li key={t.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm border ${i === 0 ? 'border-ahuvi-300 bg-ahuvi-50' : 'border-gray-100 bg-gray-50'}`}>
                      <EauListIcon icon={Gauge} tone={i === 0 ? 'teal' : 'neutral'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ahuvi-teal">
                            {t.debit_m3h.toFixed(1)} m³/h
                            {i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wide text-ahuvi-olive">débit courant</span>}
                          </span>
                          {t.ecart_pct != null && <span className="text-xs text-gray-500">écart {t.ecart_pct.toFixed(0)} %</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {fmtDate(t.timestamp)} · {t.niveau_debut_cm}→{t.niveau_fin_cm} cm en {t.duree_min} min
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </EauDrawer>
      )}
    </div>
  );
}
