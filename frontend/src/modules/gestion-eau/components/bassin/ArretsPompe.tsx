/**
 * Section repliable « Arrêts de pompe » de l'onglet Source (extrait de EauBassinReleves
 * v3.62.0). Porte localement les champs de saisie (mode/début/fin/durée/note) + le dérivé
 * `arretResolved` pour isoler les re-renders ; délègue l'enregistrement/suppression au hook.
 */
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Power, ChevronDown, Save, Trash2 } from 'lucide-react';
import { EauEmptyState, EauListIcon } from '../EauUi';
import EauDrawer from '../EauDrawer';
import { fmtDuree } from '../../utils/duree';
import { fmtDate } from '../../utils/format';
import type { ArretPompeLocal } from '../../types/gestionEau';
import type { ArretResolved } from './useBassinReleves';

export default function ArretsPompe({
  isReadOnly,
  busy,
  arretOpen,
  setArretOpen,
  arrets,
  onSubmit,
  onRemove,
}: {
  isReadOnly: boolean;
  busy: boolean;
  arretOpen: boolean;
  setArretOpen: Dispatch<SetStateAction<boolean>>;
  arrets: ArretPompeLocal[];
  onSubmit: (
    vals: { arretResolved: ArretResolved | null; arretNote: string },
    reset: () => void
  ) => void | Promise<void>;
  onRemove: (a: ArretPompeLocal) => void | Promise<void>;
}) {
  // Arrêt de pompe : saisie au choix par durée (+ début) ou par début/fin.
  const [arretMode, setArretMode] = useState<'periode' | 'duree'>('periode');
  const [arretDebut, setArretDebut] = useState(''); // datetime-local
  const [arretFin, setArretFin] = useState(''); // datetime-local (mode période)
  const [arretDureeMin, setArretDureeMin] = useState(''); // minutes (mode durée)
  const [arretNote, setArretNote] = useState('');

  // Arrêt de pompe : résout (début, fin) selon le mode de saisie. null tant que la
  // saisie est incomplète/invalide ; `future` signale un début postérieur à maintenant.
  const arretResolved = useMemo<ArretResolved | null>(() => {
    if (!arretDebut.trim()) return null;
    const debut = new Date(arretDebut);
    if (Number.isNaN(debut.getTime())) return null;
    let fin: Date;
    if (arretMode === 'periode') {
      if (!arretFin.trim()) return null;
      const f = new Date(arretFin);
      if (Number.isNaN(f.getTime())) return null;
      fin = f;
    } else {
      const min = Number(arretDureeMin);
      if (!Number.isFinite(min) || min <= 0) return null;
      fin = new Date(debut.getTime() + min * 60000);
    }
    if (fin.getTime() <= debut.getTime()) return null;
    return {
      debutIso: debut.toISOString(),
      finIso: fin.toISOString(),
      dureeMin: (fin.getTime() - debut.getTime()) / 60000,
      future: debut.getTime() > Date.now(),
    };
  }, [arretMode, arretDebut, arretFin, arretDureeMin]);

  const submit = () =>
    onSubmit({ arretResolved, arretNote }, () => {
      setArretDebut('');
      setArretFin('');
      setArretDureeMin('');
      setArretNote('');
    });

  return (
    <div className="rounded-xl border border-ahuvi-100 bg-white shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setArretOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-ahuvi-forest"
      >
        <span className="inline-flex items-center gap-2">
          <Power className="w-4 h-4" aria-hidden="true" /> Arrêts de pompe
          {arrets.length > 0 && (
            <span className="text-xs font-medium text-ahuvi-olive bg-ahuvi-50 rounded-full px-2 py-0.5">
              {arrets.length} enregistré{arrets.length > 1 ? 's' : ''}
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${arretOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {arretOpen && (
        <EauDrawer>
          <div className="px-4 pb-4 border-t border-ahuvi-100 pt-3 space-y-4">
            <div className="space-y-3">
              <div className="text-xs text-gray-500">
                Notez les périodes pendant lesquelles les pompes étaient À L'ARRÊT. Ce temps d'arrêt servira
                à estimer plus justement l'eau apportée (le reste du temps, la pompe tourne).
              </div>

              {!isReadOnly && (
                <>
                  {/* Sélecteur de mode de saisie : début + fin, OU début + durée. */}
                  <div className="inline-flex rounded-lg border border-ahuvi-200 overflow-hidden text-sm">
                    <button
                      type="button"
                      onClick={() => setArretMode('periode')}
                      className={`px-3 py-1.5 font-medium ${arretMode === 'periode' ? 'bg-ahuvi-forest text-white' : 'bg-white text-ahuvi-forest hover:bg-ahuvi-50'}`}
                    >
                      Début / fin
                    </button>
                    <button
                      type="button"
                      onClick={() => setArretMode('duree')}
                      className={`px-3 py-1.5 font-medium border-l border-ahuvi-200 ${arretMode === 'duree' ? 'bg-ahuvi-forest text-white' : 'bg-white text-ahuvi-forest hover:bg-ahuvi-50'}`}
                    >
                      Durée
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm block">
                      <span className="block text-gray-600 mb-1">Début de l'arrêt</span>
                      <input
                        type="datetime-local"
                        value={arretDebut}
                        onChange={(e) => setArretDebut(e.target.value)}
                        className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                      />
                    </label>
                    {arretMode === 'periode' ? (
                      <label className="text-sm block">
                        <span className="block text-gray-600 mb-1">Fin de l'arrêt</span>
                        <input
                          type="datetime-local"
                          value={arretFin}
                          onChange={(e) => setArretFin(e.target.value)}
                          className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                        />
                      </label>
                    ) : (
                      <label className="text-sm block">
                        <span className="block text-gray-600 mb-1">Durée de l'arrêt (minutes)</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          step="1"
                          min="1"
                          value={arretDureeMin}
                          onChange={(e) => setArretDureeMin(e.target.value)}
                          className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                          placeholder="ex : 120"
                        />
                      </label>
                    )}

                    {arretResolved ? (
                      arretResolved.future ? (
                        <div className="text-xs text-amber-700">Le début est dans le futur — impossible.</div>
                      ) : (
                        <div className="text-sm text-ahuvi-teal bg-cyan-50 rounded-lg px-3 py-2">
                          Arrêt : <strong>{fmtDuree(arretResolved.dureeMin)}</strong>
                          <span className="text-ahuvi-teal/60"> · du {fmtDate(arretResolved.debutIso)} au {fmtDate(arretResolved.finIso)}</span>
                        </div>
                      )
                    ) : (
                      (arretDebut.trim() !== '' || arretFin.trim() !== '' || arretDureeMin.trim() !== '') && (
                        <div className="text-xs text-amber-700">
                          {arretMode === 'periode'
                            ? 'Renseignez le début et la fin (fin après début).'
                            : 'Renseignez le début et une durée (en minutes).'}
                        </div>
                      )
                    )}
                  </div>

                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                    <input
                      type="text"
                      value={arretNote}
                      onChange={(e) => setArretNote(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                      placeholder="ex : panne, maintenance, coupure"
                    />
                  </label>

                  <button
                    onClick={submit}
                    disabled={busy || !arretResolved || arretResolved.future}
                    className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
                  >
                    <Save className="w-4 h-4" aria-hidden="true" /> Enregistrer l'arrêt
                  </button>
                </>
              )}
            </div>

            {/* Historique des arrêts saisis. */}
            {arrets.length === 0 ? (
              <EauEmptyState icon={Power} title="Aucun arrêt de pompe enregistré" />
            ) : (
              <ul className="space-y-2">
                {arrets.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm border border-gray-100 bg-gray-50"
                  >
                    <EauListIcon icon={Power} tone="neutral" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-ahuvi-forest">{fmtDuree(a.duree_min)}</span>
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => onRemove(a)}
                            disabled={busy}
                            aria-label="Supprimer l'arrêt"
                            title="Supprimer"
                            className="text-gray-400 hover:text-rose-600 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {fmtDate(a.timestamp_debut)} → {fmtDate(a.timestamp_fin)}
                        {a.note ? ` · ${a.note}` : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </EauDrawer>
      )}
    </div>
  );
}
