/**
 * Carte « Stock d'eau du bassin » (carte de tête de l'onglet Source), extraite de
 * EauBassinReleves v3.62.0. Présentationnelle : reçoit les données/dérivés du hook + les
 * bascules de tiroirs (pilotées par le parent pour les deep-links et le scroll sous Header).
 * Imbrique le tiroir de saisie (<BassinSaisie>) et le tiroir Historique.
 */
import { type RefObject } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, Tooltip,
} from 'recharts';
import {
  Waves, Ruler, Pencil, ChevronDown, TrendingUp, TrendingDown, Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EauListIcon, EAU_CHART } from '../EauUi';
import EauDrawer from '../EauDrawer';
import BassinSaisie from './BassinSaisie';
import { fmtM3, fmtPct, fmtDate } from '../../utils/format';
import type { BassinDimensions } from '../../utils/bassin';
import type { DashboardData } from '../../services/eauBilanService';
import type { BilanLocal, ReleveBassinLocal } from '../../types/gestionEau';

/** « Comprendre cette situation » : ton + icône + textes (calculé par le parent). */
export interface ExplainInfo {
  tone: string;
  Icon: LucideIcon;
  title: string;
  text: string;
  advice: string;
}

export default function BassinStockCard({
  dash,
  bilan,
  anomalie,
  explain,
  explainOpen,
  setExplainOpen,
  openDrawer,
  setOpenDrawer,
  releveRowRef,
  dernierReleve,
  niveauChart,
  relevesList,
  isReadOnly,
  dim,
  busy,
  onSubmitNiveau,
}: {
  dash: DashboardData | null;
  bilan: BilanLocal | null;
  anomalie: boolean;
  explain: ExplainInfo;
  explainOpen: boolean;
  setExplainOpen: (updater: (o: boolean) => boolean) => void;
  openDrawer: 'saisir' | 'histo' | null;
  setOpenDrawer: (updater: (k: 'saisir' | 'histo' | null) => 'saisir' | 'histo' | null) => void;
  releveRowRef: RefObject<HTMLDivElement | null>;
  dernierReleve: ReleveBassinLocal | null;
  niveauChart: { x: string; value: number }[];
  relevesList: ReleveBassinLocal[];
  isReadOnly: boolean;
  dim: BassinDimensions | null;
  busy: boolean;
  onSubmitNiveau: (
    vals: { hauteurCm: string; niveauNote: string; niveauDateTime: string },
    reset: () => void
  ) => void | Promise<void>;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={explainOpen}
      onClick={() => setExplainOpen((o) => !o)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setExplainOpen((o) => !o);
        }
      }}
      className={`cursor-pointer rounded-xl border bg-white p-4 shadow-soft transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-400 ${anomalie ? 'border-amber-300' : 'border-ahuvi-100'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stock d'eau du bassin</div>
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${anomalie ? 'bg-amber-100 text-amber-700' : 'bg-cyan-50 text-ahuvi-teal'}`}>
          <Waves className="w-5 h-5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold text-ahuvi-teal">{fmtM3(dash?.stockActuelM3 ?? null)}</div>
      <div className="text-sm text-gray-500 mt-0.5">
        Remplissage : {dash?.tauxRemplissage != null ? fmtPct(dash.tauxRemplissage, { isRatio: true }) : '—'}
        {dash?.volumeMaxM3 != null && <span className="text-gray-400"> / {fmtM3(dash.volumeMaxM3)}</span>}
      </div>

      {bilan ? (
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Attendu (dernier bilan)</div>
            <div className="font-semibold text-gray-800">{fmtM3(bilan.stock_attendu)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Écart mesuré − attendu</div>
            <div className={`font-semibold inline-flex items-center gap-1 ${anomalie ? 'text-amber-700' : 'text-emerald-700'}`}>
              {(bilan.ecart_m3 ?? 0) < 0 ? (
                <TrendingDown className="w-4 h-4" aria-hidden="true" />
              ) : (
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
              )}
              {fmtM3(bilan.ecart_m3)} ({fmtPct(bilan.ecart_pct)})
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Stock de référence — le bilan (écart mesuré vs attendu) sera calculé au prochain relevé de niveau.
        </div>
      )}

      {/* Affordance « icône d'abord » : la carte est cliquable → tiroir « Comprendre cette
          situation » (explication des chiffres ci-dessus). Placée juste sous le bilan. */}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <Info className="w-4 h-4" aria-hidden="true" /> Comprendre cette situation
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${explainOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </div>

      {/* Tiroir explicatif (un seul cas affiché) — sous les chiffres, dans la même carte. */}
      {explainOpen && (
        <EauDrawer>
          <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 space-y-1.5">
            <div className={`font-semibold ${explain.tone}`}>{explain.title}</div>
            <p>{explain.text}</p>
            <p className="flex items-start gap-1.5">
              <explain.Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${explain.tone}`} aria-hidden="true" />
              <span>{explain.advice}</span>
            </p>
          </div>
        </EauDrawer>
      )}

      {/* Rangée relevé (fusion de l'ex-carte « Bassin ») : icône Règle + ligne de relevé brut
          cliquable → tiroir Historique, et crayon → tiroir Saisie. stopPropagation impératif
          pour ne pas déclencher « Comprendre » de la carte parente. */}
      <div ref={releveRowRef} className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={openDrawer === 'histo'}
          onClick={(e) => {
            e.stopPropagation();
            setOpenDrawer((k) => (k === 'histo' ? null : 'histo'));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setOpenDrawer((k) => (k === 'histo' ? null : 'histo'));
            }
          }}
          className="cursor-pointer rounded-lg -m-1 p-1 flex items-center gap-2 flex-1 min-w-0 transition-colors hover:bg-ahuvi-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-400"
        >
          <EauListIcon icon={Ruler} tone="teal" />
          <div className="text-sm text-gray-500 truncate">
            {dernierReleve ? (
              <>
                {dernierReleve.hauteur_cm} cm · {fmtM3(dernierReleve.volume_m3)} · {fmtDate(dernierReleve.timestamp)}
              </>
            ) : (
              'Aucun relevé de niveau'
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenDrawer((k) => (k === 'saisir' ? null : 'saisir'));
          }}
          disabled={isReadOnly || !dim}
          aria-label="Saisir une hauteur"
          className={`flex-shrink-0 w-9 h-9 rounded-lg inline-flex items-center justify-center transition-colors ${
            openDrawer === 'saisir'
              ? 'bg-ahuvi-forest text-white'
              : 'bg-ahuvi-50 text-ahuvi-forest hover:bg-ahuvi-100 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Tiroirs « Saisir hauteur » et « Historique » : déployés JUSTE sous la ligne du relevé
          cliquée (le défilement cale cette ligne sous le Header). « Comprendre » passe en bas. */}
      {openDrawer === 'saisir' && (
        <BassinSaisie dim={dim} isReadOnly={isReadOnly} busy={busy} onSubmit={onSubmitNiveau} />
      )}

      {openDrawer === 'histo' && (
        <EauDrawer>
          <div className="px-3 pb-3 border-t border-ahuvi-100 pt-3 space-y-2">
            {niveauChart.length > 0 && (
              <div className="rounded-lg border border-ahuvi-100 bg-ahuvi-50/40 p-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Waves className="w-3.5 h-3.5" aria-hidden="true" /> Niveau mesuré (m³)
                </div>
                <ResponsiveContainer width="100%" height={90}>
                  <LineChart data={niveauChart}>
                    <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => fmtM3(v)} labelFormatter={() => ''} />
                    <Line type="monotone" dataKey="value" stroke={EAU_CHART.teal} dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {relevesList.length === 0 ? (
              <div className="pt-1 text-sm text-gray-400 text-center">Aucun relevé de niveau.</div>
            ) : (
              <div className="max-h-[8.5rem] overflow-y-auto pr-1">
                <div className="space-y-1">
                  {relevesList.slice(0, 6).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-ahuvi-100 bg-white px-3 py-2 shadow-sm"
                    >
                      <span className="text-sm text-gray-600">{fmtDate(r.timestamp)}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{r.hauteur_cm} cm</span>
                        <span className="text-xs text-gray-500 w-20 text-right">{fmtM3(r.volume_m3)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </EauDrawer>
      )}
    </div>
  );
}
