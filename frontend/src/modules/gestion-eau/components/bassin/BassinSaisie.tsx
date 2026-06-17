/**
 * Tiroir « Saisir hauteur » de la carte Stock d'eau (extrait de EauBassinReleves v3.62.0).
 * Porte localement les champs de saisie (hauteur/note/date) pour isoler les re-renders du
 * reste de l'onglet ; délègue l'enregistrement au handler `onSubmit` du hook (même séquence).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Save, Settings } from 'lucide-react';
import EauDrawer from '../EauDrawer';
import { hauteurCmToVolumeM3, type BassinDimensions } from '../../utils/bassin';
import { fmtM3 } from '../../utils/format';

export default function BassinSaisie({
  dim,
  isReadOnly,
  busy,
  onSubmit,
}: {
  dim: BassinDimensions | null;
  isReadOnly: boolean;
  busy: boolean;
  onSubmit: (
    vals: { hauteurCm: string; niveauNote: string; niveauDateTime: string },
    reset: () => void
  ) => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const [hauteurCm, setHauteurCm] = useState('');
  const [niveauNote, setNiveauNote] = useState('');
  const [niveauDateTime, setNiveauDateTime] = useState('');

  // Aperçu live volume (cm → m³) avant validation.
  const volumePreview = useMemo(() => {
    if (!dim) return null;
    const h = Number(hauteurCm);
    if (!Number.isFinite(h) || hauteurCm.trim() === '') return null;
    return hauteurCmToVolumeM3(h, dim);
  }, [hauteurCm, dim]);

  const submit = () =>
    onSubmit({ hauteurCm, niveauNote, niveauDateTime }, () => {
      setHauteurCm('');
      setNiveauNote('');
      setNiveauDateTime('');
    });

  return (
    <EauDrawer>
      <div className="px-3 pb-3 border-t border-ahuvi-100 space-y-3 pt-3">
        {!dim && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>
              Configurez le bassin d'abord (dimensions L × l × hauteur).{' '}
              <button className="inline-flex items-center gap-1 underline font-medium" onClick={() => navigate('/gestion-eau/config')}>
                <Settings className="w-3.5 h-3.5" aria-hidden="true" /> Configurer
              </button>
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 items-start">
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Hauteur mesurée (cm)</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={hauteurCm}
              onChange={(e) => setHauteurCm(e.target.value)}
              disabled={!dim || isReadOnly}
              className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
              placeholder="ex : 180"
              autoFocus
            />
          </label>
          <label className="text-sm">
            <span className="block text-gray-600 mb-1">Date et heure du relevé (optionnel)</span>
            <input
              type="datetime-local"
              value={niveauDateTime}
              onChange={(e) => setNiveauDateTime(e.target.value)}
              disabled={!dim || isReadOnly}
              className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
            />
            <span className="block text-xs text-gray-500 mt-1">
              Laisser vide = maintenant. Renseigner pour saisir un relevé passé.
            </span>
          </label>
        </div>
        {volumePreview != null && (
          <div className="text-sm text-ahuvi-teal bg-cyan-50 rounded-lg px-3 py-2">
            Volume correspondant : <strong>{fmtM3(volumePreview)}</strong>
          </div>
        )}
        <label className="text-sm block">
          <span className="block text-gray-600 mb-1">Note (optionnel)</span>
          <input
            type="text"
            value={niveauNote}
            onChange={(e) => setNiveauNote(e.target.value)}
            disabled={!dim || isReadOnly}
            className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 disabled:bg-gray-100"
          />
        </label>
        <button
          onClick={submit}
          disabled={busy || !dim || hauteurCm.trim() === '' || isReadOnly}
          className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl"
        >
          <Save className="w-4 h-4" aria-hidden="true" /> Enregistrer le relevé (déclenche un bilan)
        </button>
      </div>
    </EauDrawer>
  );
}
