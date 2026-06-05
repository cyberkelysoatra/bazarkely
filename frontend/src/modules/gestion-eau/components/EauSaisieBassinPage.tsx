/**
 * Saisie bassin /gestion-eau/saisie-bassin (releveur/admin) :
 *  (a) Entrée → volume m³ saisi (override manuel de l'apport)
 *  (b) Niveau → hauteur cm → volumeM3 = L × l × (hauteurCm/100) affiché avant validation.
 *      Bloqué si config bassin absente. Chaque relevé de niveau déclenche un bilan.
 *  (c) Test de débit (vanne fermée) → niveau début/fin + durée → Q_in (m³/h) déduit,
 *      historique des tests + débit courant mis en évidence + écart vs précédent.
 */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import EauPageShell from './EauPageShell';
import { getConfig, dimensionsFromConfig } from '../services/eauConfigService';
import {
  surfaceFromConfig,
  listDebitTests,
  addDebitTest,
} from '../services/eauBassinService';
import { hauteurCmToVolumeM3 } from '../utils/bassin';
import { computeDebit } from '../utils/debit';
import { addEntreeBassin, addReleveBassin } from '../services/eauReleveService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { fmtM3, fmtDate } from '../utils/format';
import type { ConfigLocal, DebitTestLocal } from '../types/gestionEau';
import type { BassinDimensions } from '../utils/bassin';

type Tab = 'entree' | 'niveau' | 'debit';

export default function EauSaisieBassinPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('niveau');
  const [config, setConfig] = useState<ConfigLocal | null>(null);
  const [dim, setDim] = useState<BassinDimensions | null>(null);
  const [surface, setSurface] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Entrée
  const [entreeM3, setEntreeM3] = useState('');
  const [entreeNote, setEntreeNote] = useState('');

  // Niveau
  const [hauteurCm, setHauteurCm] = useState('');
  const [niveauNote, setNiveauNote] = useState('');

  // Test de débit
  const [debitDebutCm, setDebitDebutCm] = useState('');
  const [debitFinCm, setDebitFinCm] = useState('');
  const [debitDureeMin, setDebitDureeMin] = useState('');
  const [debitNote, setDebitNote] = useState('');
  const [tests, setTests] = useState<DebitTestLocal[]>([]);

  useEffect(() => {
    (async () => {
      const cfg = await getConfig();
      setConfig(cfg);
      setDim(dimensionsFromConfig(cfg));
      setSurface(surfaceFromConfig(cfg));
      setTests(await listDebitTests());
      setLoading(false);
    })();
  }, []);

  // Hauteur du flotteur en cm (avertissement « au-dessus du flotteur »).
  const flotteurCm = useMemo(() => {
    const f = config?.bassin_hauteur_flotteur_m ?? config?.bassin_hauteur_max_m;
    return f != null && f > 0 ? f * 100 : null;
  }, [config]);

  const volumePreview = useMemo(() => {
    if (!dim) return null;
    const h = Number(hauteurCm);
    if (!Number.isFinite(h) || hauteurCm.trim() === '') return null;
    return hauteurCmToVolumeM3(h, dim);
  }, [hauteurCm, dim]);

  // Aperçu live du débit (Q_in) avant validation.
  const debitPreview = useMemo(() => {
    if (surface == null) return null;
    const d = Number(debitDebutCm);
    const f = Number(debitFinCm);
    const dur = Number(debitDureeMin);
    if ([debitDebutCm, debitFinCm, debitDureeMin].some((s) => s.trim() === '')) return null;
    if (![d, f, dur].every(Number.isFinite)) return null;
    return computeDebit({ niveauDebutCm: d, niveauFinCm: f, dureeMin: dur, surfaceM2: surface });
  }, [debitDebutCm, debitFinCm, debitDureeMin, surface]);

  const debitFinAuDessusFlotteur =
    flotteurCm != null && debitFinCm.trim() !== '' && Number(debitFinCm) > flotteurCm;

  const submitDebit = async () => {
    if (surface == null) {
      toast.error('Configurez les dimensions du bassin d\'abord');
      return;
    }
    const d = Number(debitDebutCm);
    const f = Number(debitFinCm);
    const dur = Number(debitDureeMin);
    setBusy(true);
    try {
      const res = await addDebitTest({
        niveau_debut_cm: d,
        niveau_fin_cm: f,
        duree_min: dur,
        note: debitNote || null,
        agent_id: getCurrentUserIdSync(),
      });
      toast.success(
        res.instable
          ? `Test enregistré : ${res.test.debit_m3h.toFixed(1)} m³/h — ⚠️ débit instable (écart ${res.ecartPct?.toFixed(0)} %)`
          : `Test enregistré : débit courant ${res.test.debit_m3h.toFixed(1)} m³/h`
      );
      setDebitDebutCm('');
      setDebitFinCm('');
      setDebitDureeMin('');
      setDebitNote('');
      setTests(await listDebitTests());
    } catch (e: any) {
      toast.error(e?.message ?? 'Test de débit invalide');
    } finally {
      setBusy(false);
    }
  };

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
              className={`flex-1 py-2 rounded-lg font-medium text-xs ${
                tab === 'entree' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              ➕ Entrée
            </button>
            <button
              onClick={() => setTab('niveau')}
              className={`flex-1 py-2 rounded-lg font-medium text-xs ${
                tab === 'niveau' ? 'bg-sky-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              📏 Niveau
            </button>
            <button
              onClick={() => setTab('debit')}
              className={`flex-1 py-2 rounded-lg font-medium text-xs ${
                tab === 'debit' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              ⚙️ Débit
            </button>
          </div>

          {tab === 'entree' && (
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
          )}

          {tab === 'niveau' && (
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

          {tab === 'debit' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft space-y-3">
                <div className="text-xs text-gray-500">
                  Test « vanne fermée » : fermez la sortie, relevez le niveau au début et à la fin,
                  notez la durée — le débit d'apport Q_in est déduit automatiquement.
                </div>
                {surface == null && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
                    ⚠️ Configurez les dimensions du bassin (L × l) d'abord.{' '}
                    <button className="underline font-medium" onClick={() => navigate('/gestion-eau/config')}>
                      Configurer
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Début (cm)</span>
                    <input
                      type="number" inputMode="decimal" step="0.1"
                      value={debitDebutCm}
                      onChange={(e) => setDebitDebutCm(e.target.value)}
                      disabled={surface == null}
                      className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                      placeholder="ex : 150"
                    />
                  </label>
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Fin (cm)</span>
                    <input
                      type="number" inputMode="decimal" step="0.1"
                      value={debitFinCm}
                      onChange={(e) => setDebitFinCm(e.target.value)}
                      disabled={surface == null}
                      className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                      placeholder="ex : 160"
                    />
                  </label>
                  <label className="text-sm block">
                    <span className="block text-gray-600 mb-1">Durée (min)</span>
                    <input
                      type="number" inputMode="decimal" step="1"
                      value={debitDureeMin}
                      onChange={(e) => setDebitDureeMin(e.target.value)}
                      disabled={surface == null}
                      className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                      placeholder="ex : 60"
                    />
                  </label>
                </div>

                {debitFinAuDessusFlotteur && (
                  <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    ⚠️ Le niveau final dépasse la hauteur du flotteur — test au-delà du plafond opérationnel.
                  </div>
                )}
                {debitPreview != null && (
                  debitPreview.valid ? (
                    <div className="text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
                      Débit d'apport Q_in : <strong>{debitPreview.debitM3h.toFixed(1)} m³/h</strong>
                      <span className="text-indigo-400"> ({fmtM3(debitPreview.volumeM3)} en {debitDureeMin} min)</span>
                    </div>
                  ) : (
                    <div className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{debitPreview.error}</div>
                  )
                )}
                <label className="text-sm block">
                  <span className="block text-gray-600 mb-1">Note (optionnel)</span>
                  <input
                    type="text"
                    value={debitNote}
                    onChange={(e) => setDebitNote(e.target.value)}
                    disabled={surface == null}
                    className="w-full rounded-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-100"
                  />
                </label>
                <button
                  onClick={submitDebit}
                  disabled={busy || surface == null || !(debitPreview?.valid)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl"
                >
                  Enregistrer le test de débit
                </button>
              </div>

              {/* Historique des tests — débit courant (le plus récent) mis en évidence. */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
                <h3 className="font-semibold text-gray-800 mb-2 text-sm">Historique des tests</h3>
                {tests.length === 0 ? (
                  <div className="text-sm text-gray-400">Aucun test de débit pour l'instant.</div>
                ) : (
                  <ul className="space-y-2">
                    {tests.map((t, i) => (
                      <li
                        key={t.id}
                        className={`rounded-lg px-3 py-2 text-sm border ${
                          i === 0 ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-indigo-700">
                            {t.debit_m3h.toFixed(1)} m³/h
                            {i === 0 && <span className="ml-2 text-[10px] uppercase tracking-wide text-indigo-500">débit courant</span>}
                          </span>
                          {t.ecart_pct != null && (
                            <span className="text-xs text-gray-500">écart {t.ecart_pct.toFixed(0)} %</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {fmtDate(t.timestamp)} · {t.niveau_debut_cm}→{t.niveau_fin_cm} cm en {t.duree_min} min
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </EauPageShell>
  );
}
