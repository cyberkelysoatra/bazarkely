/**
 * Mode tournée (releveur/admin) — onglet « Tournée » du thème Relevés.
 * Compteurs ordonnés (zone/ordre), progression X/N des relevés du jour, reprise là où
 * on s'est arrêté (1er non relevé mis en avant), coche au fur et à mesure. Sélectionner
 * un compteur ouvre directement sa saisie d'index (onglet Compteur préselectionné).
 */
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle2, ArrowRight, Square, Route } from 'lucide-react';
import { getTourneeData, type TourneeItem } from '../services/eauTourneeService';
import { EauEmptyState } from './EauUi';
import EauAide from './EauAide';
import { AIDE } from './eauAideTextes';
import { fmtDate } from '../utils/format';

export default function EauTourneePage({ onPick }: { onPick: (compteurId: string) => void }) {
  const [items, setItems] = useState<TourneeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [faits, setFaits] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await getTourneeData();
    setItems(data.items);
    setTotal(data.total);
    setFaits(data.faits);
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  // Index du 1er compteur non relevé aujourd'hui → point de reprise.
  const repriseIdx = items.findIndex((it) => !it.releveAujourdhui);
  const pct = total > 0 ? Math.round((faits / total) * 100) : 0;

  // Regroupement par zone en conservant l'ordre.
  const groups: Array<[string, TourneeItem[]]> = [];
  for (const it of items) {
    const z = it.compteur.zone ?? 'Sans zone';
    const last = groups[groups.length - 1];
    if (last && last[0] === z) last[1].push(it);
    else groups.push([z, [it]]);
  }

  return (
    <div className="max-w-3xl mx-auto px-3 space-y-3">
      <EauAide id={AIDE.tournee.id} quoi={AIDE.tournee.quoi} comment={AIDE.tournee.comment} />
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : total === 0 ? (
        <EauEmptyState icon={Route} title="Aucun compteur actif à relever." />
      ) : (
        <>
          {/* Progression */}
          <div className="rounded-xl border border-ahuvi-200 bg-ahuvi-50/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-ahuvi-forest">Progression du jour</span>
              <span className="text-sm font-bold text-ahuvi-forest">{faits}/{total}</span>
            </div>
            <div className="h-2 rounded-full bg-ahuvi-100 overflow-hidden">
              <div className="h-full bg-ahuvi-forest transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">{pct}% relevés</span>
              <button onClick={reload} className="inline-flex items-center gap-1 text-xs text-ahuvi-forest hover:underline">
                <RefreshCw className="w-4 h-4" aria-hidden="true" /> Actualiser
              </button>
            </div>
          </div>

          {/* Liste ordonnée par zone */}
          {groups.map(([zone, list]) => (
            <div key={zone}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 px-1">{zone}</div>
              <div className="space-y-1">
                {list.map((it) => {
                  const idx = items.indexOf(it);
                  const isReprise = idx === repriseIdx;
                  return (
                    <button
                      key={it.compteur.id}
                      onClick={() => onPick(it.compteur.id)}
                      className={`w-full text-left rounded-lg px-3 py-2 flex items-center justify-between border transition-colors ${
                        it.releveAujourdhui
                          ? 'bg-emerald-50 border-emerald-200'
                          : isReprise
                          ? 'bg-white border-ahuvi-forest ring-1 ring-ahuvi-forest'
                          : 'bg-white border-gray-200 hover:bg-ahuvi-50'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          {it.releveAujourdhui ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                          ) : isReprise ? (
                            <ArrowRight className="w-4 h-4 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 flex-shrink-0" aria-hidden="true" />
                          )}
                          <span className="truncate">{it.compteur.nom}</span>
                        </span>
                        <span className="block text-xs text-gray-500 pl-6">
                          {it.dernierIndex != null ? `Dernier index ${it.dernierIndex}` : 'Aucun relevé'}
                          {it.dernierReleveDate && ` · ${fmtDate(it.dernierReleveDate)}`}
                        </span>
                      </span>
                      <span className="text-xs text-ahuvi-forest flex-shrink-0">
                        {it.releveAujourdhui ? 'Relevé' : 'Saisir'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
