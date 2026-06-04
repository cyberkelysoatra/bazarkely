/**
 * Annonces du domaine /gestion-eau/annonces (admin) : CRUD (titre, texte, type,
 * période d'affichage, actif). Les annonces actives défilent dans le bandeau du
 * header en mode eau (cf. Header.tsx). Charte AHUVI.
 */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Megaphone, Pencil, X } from 'lucide-react';
import EauPageShell from './EauPageShell';
import {
  listAnnonces,
  saveAnnonce,
  deleteAnnonce,
  toggleAnnonceActif,
  isAnnonceActive,
  type AnnonceType,
} from '../services/eauAnnonceService';
import { showConfirm } from '../../../utils/dialogUtils';
import { fmtDate } from '../utils/format';
import type { AnnonceLocal } from '../types/gestionEau';

const TYPE_OPTIONS: { value: AnnonceType; label: string; emoji: string }[] = [
  { value: 'promo', label: 'Promo', emoji: '🏷️' },
  { value: 'evenement', label: 'Évènement', emoji: '🎉' },
  { value: 'communaute', label: 'Communauté', emoji: '🤝' },
];

interface Draft {
  id?: string;
  titre: string;
  texte: string;
  type: AnnonceType;
  actif: boolean;
  date_debut: string; // yyyy-mm-dd ou ''
  date_fin: string;
}

const EMPTY_DRAFT: Draft = { titre: '', texte: '', type: 'promo', actif: true, date_debut: '', date_fin: '' };

function toDateInput(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : '';
}
function toIso(dateStr: string, endOfDay = false): string | null {
  if (!dateStr) return null;
  return new Date(`${dateStr}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString();
}

export default function EauAnnoncesPage() {
  const [annonces, setAnnonces] = useState<AnnonceLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setAnnonces(await listAnnonces());
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  const openNew = () => setDraft({ ...EMPTY_DRAFT });
  const openEdit = (a: AnnonceLocal) =>
    setDraft({
      id: a.id,
      titre: a.titre ?? '',
      texte: a.texte ?? '',
      type: (a.type ?? 'promo') as AnnonceType,
      actif: a.actif,
      date_debut: toDateInput(a.date_debut),
      date_fin: toDateInput(a.date_fin),
    });

  const save = async () => {
    if (!draft) return;
    if (!draft.titre.trim()) {
      toast.error('Titre requis');
      return;
    }
    setSaving(true);
    try {
      await saveAnnonce({
        id: draft.id,
        titre: draft.titre.trim(),
        texte: draft.texte.trim(),
        type: draft.type,
        actif: draft.actif,
        date_debut: toIso(draft.date_debut),
        date_fin: toIso(draft.date_fin, true),
      });
      toast.success(draft.id ? 'Annonce modifiée' : 'Annonce créée');
      setDraft(null);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: AnnonceLocal) => {
    const ok = await showConfirm(`Supprimer l'annonce « ${a.titre} » ?`, 'Suppression', {
      variant: 'danger',
      confirmText: 'Supprimer',
    });
    if (!ok) return;
    await deleteAnnonce(a.id);
    await reload();
  };

  const toggle = async (a: AnnonceLocal) => {
    await toggleAnnonceActif(a.id);
    await reload();
  };

  return (
    <EauPageShell
      title="Annonces du domaine"
      subtitle="Promos, évènements, actions communautaires (admin)"
      actions={
        !draft && (
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 bg-ahuvi-forest hover:bg-ahuvi-olive text-white text-xs font-semibold px-3 py-2 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Nouvelle
          </button>
        )
      }
    >
      {draft && (
        <div className="mb-4 rounded-xl border border-ahuvi-200 bg-ahuvi-50/60 p-4 shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ahuvi-forest font-ahuvi-body">
              {draft.id ? 'Modifier l’annonce' : 'Nouvelle annonce'}
            </h2>
            <button onClick={() => setDraft(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <label className="text-sm block">
            <span className="block text-gray-600 mb-1">Titre</span>
            <input
              type="text"
              value={draft.titre}
              onChange={(e) => setDraft({ ...draft, titre: e.target.value })}
              className="w-full rounded-lg border-gray-300 focus:border-ahuvi-olive focus:ring-ahuvi-olive"
              placeholder="Ex. Tarif promo Club House"
            />
          </label>
          <label className="text-sm block">
            <span className="block text-gray-600 mb-1">Texte</span>
            <textarea
              value={draft.texte}
              onChange={(e) => setDraft({ ...draft, texte: e.target.value })}
              rows={2}
              className="w-full rounded-lg border-gray-300 focus:border-ahuvi-olive focus:ring-ahuvi-olive"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Type</span>
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as AnnonceType })}
                className="w-full rounded-lg border-gray-300 focus:border-ahuvi-olive focus:ring-ahuvi-olive"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.emoji} {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={draft.actif}
                onChange={(e) => setDraft({ ...draft, actif: e.target.checked })}
                className="rounded border-gray-300 text-ahuvi-forest focus:ring-ahuvi-olive"
              />
              <span className="text-gray-600">Active</span>
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Début (optionnel)</span>
              <input
                type="date"
                value={draft.date_debut}
                onChange={(e) => setDraft({ ...draft, date_debut: e.target.value })}
                className="w-full rounded-lg border-gray-300 focus:border-ahuvi-olive focus:ring-ahuvi-olive"
              />
            </label>
            <label className="text-sm">
              <span className="block text-gray-600 mb-1">Fin (optionnel)</span>
              <input
                type="date"
                value={draft.date_fin}
                onChange={(e) => setDraft({ ...draft, date_fin: e.target.value })}
                className="w-full rounded-lg border-gray-300 focus:border-ahuvi-olive focus:ring-ahuvi-olive"
              />
            </label>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-ahuvi-forest hover:bg-ahuvi-olive disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : annonces.length === 0 ? (
        <div className="text-gray-400 text-sm py-8 text-center">
          Aucune annonce. Créez-en une pour l’afficher dans le bandeau du domaine.
        </div>
      ) : (
        <div className="space-y-2">
          {annonces.map((a) => {
            const active = isAnnonceActive(a);
            const opt = TYPE_OPTIONS.find((o) => o.value === a.type);
            return (
              <div key={a.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-ahuvi-olive flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate">{a.titre}</span>
                      <span className="text-[10px] uppercase tracking-wide bg-ahuvi-50 text-ahuvi-700 rounded px-1.5 py-0.5">
                        {opt?.label ?? a.type}
                      </span>
                    </div>
                    {a.texte && <p className="text-sm text-gray-600 mt-1">{a.texte}</p>}
                    <div className="text-xs text-gray-400 mt-1">
                      {a.date_debut || a.date_fin
                        ? `${a.date_debut ? fmtDate(a.date_debut) : '…'} → ${a.date_fin ? fmtDate(a.date_fin) : '…'}`
                        : 'Sans date'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggle(a)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {active ? 'Affichée' : a.actif ? 'Hors période' : 'Inactive'}
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(a)} className="text-gray-400 hover:text-ahuvi-olive">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(a)} className="text-gray-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </EauPageShell>
  );
}
