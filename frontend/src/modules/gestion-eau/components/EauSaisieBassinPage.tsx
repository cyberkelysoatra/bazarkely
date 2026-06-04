/**
 * Saisie bassin /gestion-eau/saisie-bassin (releveur/admin) :
 *  (a) Entrée → volume m³ saisi
 *  (b) Niveau → hauteur cm → volumeM3 = L × l × (hauteurCm/100) affiché avant validation.
 *      Bloqué si config bassin absente. Chaque relevé de niveau déclenche un bilan.
 */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import EauPageShell from './EauPageShell';
import { getConfig, dimensionsFromConfig } from '../services/eauConfigService';
import { hauteurCmToVolumeM3 } from '../utils/bassin';
import { addEntreeBassin, addReleveBassin } from '../services/eauReleveService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { fmtM3 } from '../utils/format';
import type { ConfigLocal } from '../types/gestionEau';
import type { BassinDimensions } from '../utils/bassin';

type Tab = 'entree' | 'niveau';

export default function EauSaisieBassinPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('niveau');
  const [config, setConfig] = useState<ConfigLocal | null>(null);
  const [dim, setDim] = useState<BassinDimensions | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Entrée
  const [entreeM3, setEntreeM3] = useState('');
  const [entreeNote, setEntreeNote] = useState('');

  // Niveau
  const [hauteurCm, setHauteurCm] = useState('');
  const [niveauNote, setNiveauNote] = useState('');

  useEffect(() => {
    (async () => {
      const cfg = await getConfig();
      setConfig(cfg);
      setDim(dimensionsFromConfig(cfg));
      setLoading(false);
    })();
  }, []);

  const volumePreview = useMemo(() => {
    if (!dim) return null;
    const h = Number(hauteurCm);
    if (!Number.isFinite(h) || hauteurCm.trim() === '') return null;
    return hauteurCmToVolumeM3(h, dim);
  }, [hauteurCm, dim]);

  const submitEntree = async () => {
    const v = Number(entreeM3);
    if (!Number.isFinite(v) || v <= 0) {
      toast.error('Volume invalide');
      return;
    }
    setBusy(true);
    try {
      await addEntreeBassin({ volume_m3: v, note: entreeNote || null, agent_id: getCurrentUserIdSync() });
      toast.success(`Entrée enregistrée : ${fmtM3(v)}`);
      setEntreeM3('');
      setEntreeNote('');
    } finally {
      setBusy(false);
    }
  };

  const submitNiveau = async () => {
    if (!dim) {
      toast.error('Configurez le bassin d\'abord');
      return;
    }
    const h = Number(hauteurCm);
    if (!Number.isFinite(h) || h < 0) {
      toast.error('Hauteur invalide');
      return;
    }
    const volume = hauteurCmToVolumeM3(h, dim);
    setBusy(true);
    try {
      const { bilan } = await addReleveBassin({
        hauteur_cm: h,
        volume_m3: volume,
        note: niveauNote || null,
        agent_id: getCurrentUserIdSync(),
      });
      if (bilan) {
        toast.success(
          bilan.anomalie
            ? `Relevé enregistré — ⚠️ anomalie détectée (écart ${fmtM3(bilan.ecart_m3)})`
            : `Relevé enregistré — bilan OK (écart ${fmtM3(bilan.ecart_m3)})`
        );
      } else {
        toast.success('Relevé enregistré (référence initiale — pas de bilan)');
      }
      setHauteurCm('');
      setNiveauNote('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <EauPageShell title="Saisie bassin" subtitle="Entrées d'eau et relevé de niveau">
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('entree')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                tab === 'entree' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              ➕ Entrée d'eau
            </button>
            <button
              onClick={() => setTab('niveau')}
              className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                tab === 'niveau' ? 'bg-sky-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              📏 Niveau du bassin
            </button>
          </div>

          {tab === 'entree' ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft space-y-3">
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Volume entré (m³)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={entreeM3}
                  onChange={(e) => setEntreeM3(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  placeholder="ex : 50"
                />
              </label>
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                <input
                  type="text"
                  value={entreeNote}
                  onChange={(e) => setEntreeNote(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                />
              </label>
              <button
                onClick={submitEntree}
                disabled={busy}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
              >
                Enregistrer l'entrée
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft space-y-3">
              {!dim && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
                  ⚠️ Configurez le bassin d'abord (dimensions L × l × hauteur).{' '}
                  <button className="underline font-medium" onClick={() => navigate('/gestion-eau/config')}>
                    Configurer
                  </button>
                </div>
              )}
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Hauteur mesurée (cm)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={hauteurCm}
                  onChange={(e) => setHauteurCm(e.target.value)}
                  disabled={!dim}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500 disabled:bg-gray-100"
                  placeholder="ex : 180"
                />
              </label>
              {volumePreview != null && (
                <div className="text-sm text-sky-700 bg-sky-50 rounded-lg px-3 py-2">
                  Volume correspondant : <strong>{fmtM3(volumePreview)}</strong>
                </div>
              )}
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                <input
                  type="text"
                  value={niveauNote}
                  onChange={(e) => setNiveauNote(e.target.value)}
                  disabled={!dim}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500 disabled:bg-gray-100"
                />
              </label>
              <button
                onClick={submitNiveau}
                disabled={busy || !dim}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
              >
                Enregistrer le relevé (déclenche un bilan)
              </button>
            </div>
          )}
        </div>
      )}
    </EauPageShell>
  );
}
