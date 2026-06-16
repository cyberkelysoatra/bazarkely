/**
 * Section admin/releveur « Relevés récents » de l'onglet Source (extrait de EauBassinReleves
 * v3.62.0) : édition inline / suppression d'un relevé + recalcul global des bilans.
 * L'état d'édition (`editing`) et les handlers viennent du hook ; le composant est purement
 * présentationnel. Borne 48 h (releveur) préservée à l'identique.
 */
import { type Dispatch, type SetStateAction } from 'react';
import { ListChecks, Ruler, NotebookPen, Trash2, Save, RefreshCw } from 'lucide-react';
import { EauEmptyState, EauListIcon } from '../EauUi';
import { fmtM3, fmtDate } from '../../utils/format';
import { isoToLocalInput } from '../../utils/dateInput';
import { WINDOW_48H_MS, type EditingReleve } from './useBassinReleves';
import type { EauRoles, ReleveBassinLocal } from '../../types/gestionEau';

export default function BassinHistoriqueAdmin({
  roles,
  isReleveurOnly,
  isReadOnly,
  isOnline,
  busy,
  recomputing,
  visibleReleves,
  editing,
  setEditing,
  saveEdit,
  removeReleve,
  recomputeAll,
}: {
  roles: EauRoles;
  isReleveurOnly: boolean;
  isReadOnly: boolean;
  isOnline: boolean;
  busy: boolean;
  recomputing: boolean;
  visibleReleves: ReleveBassinLocal[];
  editing: EditingReleve | null;
  setEditing: Dispatch<SetStateAction<EditingReleve | null>>;
  saveEdit: () => void | Promise<void>;
  removeReleve: (r: ReleveBassinLocal) => void | Promise<void>;
  recomputeAll: () => void | Promise<void>;
}) {
  return (
    <details className="rounded-xl border border-ahuvi-200 bg-white shadow-soft">
      <summary className="flex items-center gap-2 cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ahuvi-forest">
        <ListChecks className="w-4 h-4" aria-hidden="true" />{' '}
        {isReleveurOnly ? 'Relevés récents — modifiables 48 h' : 'Relevés récents (admin)'}
      </summary>
      <div className="px-4 pb-4 space-y-3">
        <p className="text-xs text-gray-500 leading-snug">
          Un bilan compare deux relevés qui se suivent (niveau précédent → niveau actuel) pour estimer la
          consommation et les pertes. Quand vous modifiez ou supprimez un relevé, les bilans concernés sont
          recalculés automatiquement. Le bouton « Recalculer tous les bilans » refait toute la série depuis
          le début (utile une fois pour les relevés importés).
          {isReleveurOnly && (
            <> En tant que releveur, vous ne pouvez corriger ou supprimer que les relevés des dernières 48 heures.</>
          )}
        </p>

        {!isOnline && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Connectez-vous pour corriger un relevé.
          </div>
        )}

        {visibleReleves.length === 0 ? (
          <EauEmptyState icon={Ruler} title="Aucun relevé de niveau pour l'instant" />
        ) : (
          <ul className="space-y-2">
            {visibleReleves.map((r) => (
              <li key={r.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
                {editing?.id === r.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="block text-xs text-gray-600 mb-1">Hauteur (cm)</span>
                        <input type="number" inputMode="decimal" step="0.1" value={editing.hauteur}
                          onChange={(e) => setEditing((prev) => (prev ? { ...prev, hauteur: e.target.value } : prev))}
                          className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
                      </label>
                      <label className="block">
                        <span className="block text-xs text-gray-600 mb-1">Date et heure</span>
                        <input type="datetime-local" value={editing.datetime}
                          onChange={(e) => setEditing((prev) => (prev ? { ...prev, datetime: e.target.value } : prev))}
                          min={isReleveurOnly ? isoToLocalInput(new Date(Date.now() - WINDOW_48H_MS).toISOString()) : undefined}
                          max={isReleveurOnly ? isoToLocalInput(new Date().toISOString()) : undefined}
                          className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={busy}
                        className="inline-flex items-center gap-1.5 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg">
                        <Save className="w-3.5 h-3.5" aria-hidden="true" /> Enregistrer
                      </button>
                      <button onClick={() => setEditing(null)} disabled={busy}
                        className="inline-flex items-center gap-1.5 bg-white border border-ahuvi-200 text-ahuvi-forest text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50">
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <EauListIcon icon={Ruler} tone="teal" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-800">{r.hauteur_cm} cm · {fmtM3(r.volume_m3)}</div>
                      <div className="text-xs text-gray-500">{fmtDate(r.timestamp)}</div>
                    </div>
                    <button onClick={() => setEditing({ id: r.id, hauteur: String(r.hauteur_cm), datetime: isoToLocalInput(r.timestamp) })}
                      disabled={busy || !isOnline || isReadOnly} aria-label="Modifier le relevé"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-ahuvi-forest hover:bg-ahuvi-50 disabled:opacity-40">
                      <NotebookPen className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button onClick={() => removeReleve(r)} disabled={busy || !isOnline || isReadOnly} aria-label="Supprimer le relevé"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40">
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {roles.admin && (
          <button onClick={recomputeAll} disabled={recomputing || busy || !isOnline || isReadOnly}
            className="w-full inline-flex items-center justify-center gap-2 bg-white border border-ahuvi-200 text-ahuvi-forest hover:bg-ahuvi-50 disabled:opacity-50 text-sm font-medium py-2.5 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${recomputing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {recomputing ? 'Recalcul…' : 'Recalculer tous les bilans'}
          </button>
        )}
      </div>
    </details>
  );
}
