/**
 * Coûts électricité du mois (/gestion-eau/elec-couts) — Phase 1 élec.
 *
 * Saisie mensuelle (A) facture JIRAMA + (B) gasoil + (C) kWh produits → (D) prix du
 * kWh = (A + B) / C, calculé en direct et persisté (offline-first, upsert idempotent
 * par mois). Écriture réservée admin ; promoteur/releveur en lecture seule.
 */
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Zap, Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauIconButton, EauEmptyState } from './EauUi';
import { EauReadOnlyBadge } from './EauReadOnly';
import { AIDE } from './eauAideTextes';
import { useGestionEau } from '../context';
import {
  listCouts,
  refreshCouts,
  upsertCout,
  deleteCout,
  computePrixKwh,
} from '../services/eauElecCoutService';
import type { ElecCoutLocal } from '../types/gestionEau';

type FormState = {
  mois: string;
  total_jirama: string;
  total_gasoil: string;
  total_kwh: string;
};

const EMPTY_FORM: FormState = { mois: '', total_jirama: '', total_gasoil: '', total_kwh: '' };

/** Parse un champ texte en nombre fini ≥ 0 (vide → 0). */
function num(raw: string): number {
  if (raw == null || raw.trim() === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

const fmtNum = (v: number | null | undefined, digits = 0): string =>
  v == null || Number.isNaN(v)
    ? '—'
    : v.toLocaleString('fr-FR', { minimumFractionDigits: digits ? 2 : 0, maximumFractionDigits: digits || 0 });

/** Libellé lisible d'un mois `YYYY-MM` (ex. « juin 2025 »). */
function moisLabel(mois: string): string {
  const [y, m] = mois.split('-').map(Number);
  if (!y || !m) return mois;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function EauElecCoutsPage() {
  const { isReadOnly } = useGestionEau();
  const [couts, setCouts] = useState<ElecCoutLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const reload = async (online: boolean) => {
    const rows = online ? await refreshCouts(true) : await listCouts();
    setCouts(rows);
  };

  useEffect(() => {
    (async () => {
      await reload(navigator.onLine);
      setLoading(false);
    })();
  }, []);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Prix du kWh calculé en direct depuis le formulaire (D = (A + B) / C).
  const prixLive = useMemo(
    () => computePrixKwh(num(form.total_jirama), num(form.total_gasoil), num(form.total_kwh)),
    [form.total_jirama, form.total_gasoil, form.total_kwh],
  );
  const kwhValide = num(form.total_kwh) > 0;
  const devise = couts[0]?.devise ?? 'MGA';

  const openCreate = () => {
    if (isReadOnly) return;
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (c: ElecCoutLocal) => {
    if (isReadOnly) return;
    setEditingId(c.id);
    setForm({
      mois: c.mois,
      total_jirama: String(c.total_jirama ?? ''),
      total_gasoil: String(c.total_gasoil ?? ''),
      total_kwh: String(c.total_kwh ?? ''),
    });
    setShowForm(true);
  };

  const cancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const onSave = async () => {
    if (isReadOnly) return;
    if (!/^\d{4}-\d{2}$/.test(form.mois)) {
      toast.error('Choisissez un mois.');
      return;
    }
    setSaving(true);
    try {
      await upsertCout({
        mois: form.mois,
        total_jirama: num(form.total_jirama),
        total_gasoil: num(form.total_gasoil),
        total_kwh: num(form.total_kwh),
      });
      await reload(navigator.onLine);
      toast.success(editingId ? 'Mois mis à jour' : 'Mois enregistré');
      cancel();
    } catch {
      toast.error("Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (c: ElecCoutLocal) => {
    if (isReadOnly) return;
    if (!window.confirm(`Supprimer le coût de ${moisLabel(c.mois)} ?`)) return;
    try {
      await deleteCout(c.id);
      await reload(navigator.onLine);
      toast.success('Mois supprimé');
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  return (
    <EauPageShell
      title="Coûts électricité du mois"
      subtitle="Prix du kWh à partir des coûts de la centrale (admin)"
      aide={AIDE.elecCouts}
      actions={
        isReadOnly ? (
          <EauReadOnlyBadge />
        ) : (
          !showForm && (
            <EauIconButton icon={Plus} variant="primary" onClick={openCreate} className="text-sm">
              Nouveau mois
            </EauIconButton>
          )
        )
      }
    >
      {/* Formulaire d'ajout / édition */}
      {showForm && !isReadOnly && (
        <div className="mb-4 rounded-xl border border-ahuvi-200 bg-white p-4 shadow-soft">
          <h3 className="font-semibold text-ahuvi-forest mb-3 flex items-center gap-1.5">
            <Zap className="w-5 h-5 text-ahuvi-gold flex-shrink-0" aria-hidden="true" />
            {editingId ? 'Modifier le mois' : 'Nouveau mois'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Mois</span>
              <input
                type="month"
                value={form.mois}
                onChange={(e) => set('mois', e.target.value)}
                className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">A — Facture JIRAMA ({devise})</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.total_jirama}
                onChange={(e) => set('total_jirama', e.target.value)}
                className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">B — Gasoil groupe ({devise})</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.total_gasoil}
                onChange={(e) => set('total_gasoil', e.target.value)}
                className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">C — Production totale (kWh)</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={form.total_kwh}
                onChange={(e) => set('total_kwh', e.target.value)}
                className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
              />
            </label>
          </div>

          {/* D — prix du kWh en direct */}
          <div className="mt-3 rounded-lg bg-ahuvi-50 px-3 py-2 text-sm">
            {kwhValide ? (
              <span className="text-ahuvi-800">
                D — Prix du kWh ={' '}
                <strong className="text-ahuvi-forest text-base">
                  {fmtNum(prixLive, 2)} {devise}
                </strong>{' '}
                <span className="text-gray-500">= (A + B) ÷ C</span>
              </span>
            ) : (
              <span className="text-amber-700">
                Le total de kWh (C) doit être &gt; 0 pour calculer le prix du kWh.
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <EauIconButton icon={Save} variant="primary" onClick={onSave} disabled={saving} className="flex-1 py-2.5">
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Enregistrer'}
            </EauIconButton>
            <EauIconButton icon={X} variant="secondary" onClick={cancel} disabled={saving} className="py-2.5">
              Annuler
            </EauIconButton>
          </div>
        </div>
      )}

      {/* Liste des mois */}
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : couts.length === 0 ? (
        <EauEmptyState
          icon={Zap}
          title="Aucun coût électricité enregistré"
          hint="Ajoutez un mois (facture JIRAMA, gasoil, kWh produits) pour calculer le prix du kWh."
        />
      ) : (
        <div className="space-y-2">
          {couts.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-ahuvi-forest capitalize flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-ahuvi-gold flex-shrink-0" aria-hidden="true" />
                    {moisLabel(c.mois)}
                  </div>
                  <div className="mt-1 text-sm text-gray-600 grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <span>A — JIRAMA : <strong>{fmtNum(c.total_jirama)} {c.devise}</strong></span>
                    <span>B — Gasoil : <strong>{fmtNum(c.total_gasoil)} {c.devise}</strong></span>
                    <span>C — kWh : <strong>{fmtNum(c.total_kwh)}</strong></span>
                    <span className="text-ahuvi-forest">
                      D — Prix kWh :{' '}
                      <strong>{c.prix_kwh == null ? '—' : `${fmtNum(c.prix_kwh, 2)} ${c.devise}`}</strong>
                    </span>
                  </div>
                </div>
                {!isReadOnly && (
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <EauIconButton
                      icon={Pencil}
                      variant="secondary"
                      onClick={() => openEdit(c)}
                      className="text-xs px-2.5 py-1.5"
                      aria-label={`Modifier ${moisLabel(c.mois)}`}
                    >
                      Modifier
                    </EauIconButton>
                    <EauIconButton
                      icon={Trash2}
                      variant="danger"
                      onClick={() => onDelete(c)}
                      className="text-xs px-2.5 py-1.5"
                      aria-label={`Supprimer ${moisLabel(c.mois)}`}
                    >
                      Supprimer
                    </EauIconButton>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </EauPageShell>
  );
}
