/** CRUD compteurs /gestion-eau/compteurs (admin) : Liste (CRUD + QR + géoloc) · Carte. */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import EauPageShell from './EauPageShell';
import { AIDE } from './eauAideTextes';
import EauTabs from './EauTabs';
import EauCartePage from './EauCartePage';
import EauQrCompteurManager from './EauQrCompteurManager';
import {
  listCompteurs,
  createCompteur,
  updateCompteur,
  deleteCompteur,
  type CompteurInput,
} from '../services/eauCompteurService';
import type { CompteurLocal, CompteurType } from '../types/gestionEau';
import { showConfirm } from '../../../utils/dialogUtils';

const TYPES: CompteurType[] = ['villa', 'golf', 'commun'];

const emptyForm: CompteurInput = {
  nom: '', type: 'villa', proprietaire: '', zone: '', ordre: null, lat: null, lng: null, actif: true,
};

export default function EauCompteursPage() {
  const [tab, setTab] = useState<'liste' | 'carte'>('liste');
  const [list, setList] = useState<CompteurLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CompteurLocal | null>(null);
  const [form, setForm] = useState<CompteurInput>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [qrCompteur, setQrCompteur] = useState<CompteurLocal | null>(null);

  const reload = async () => setList(await listCompteurs());

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c: CompteurLocal) => {
    setEditing(c);
    setForm({
      nom: c.nom,
      type: c.type,
      proprietaire: c.proprietaire ?? '',
      zone: c.zone ?? '',
      ordre: c.ordre,
      lat: c.lat,
      lng: c.lng,
      actif: c.actif,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.nom.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await updateCompteur(editing.id, form);
        toast.success('Compteur mis à jour');
      } else {
        await createCompteur(form);
        toast.success('Compteur créé');
      }
      await reload();
      setShowForm(false);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: CompteurLocal) => {
    if (!(await showConfirm(`Supprimer le compteur « ${c.nom} » ?`, 'Suppression', { variant: 'danger', confirmText: 'Supprimer' }))) return;
    await deleteCompteur(c.id);
    await reload();
    toast.success('Compteur supprimé');
  };

  const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

  return (
    <div>
      {/* Onglets internes du thème Compteurs : Liste (CRUD + QR + géoloc) · Carte. */}
      <EauTabs
        active={tab}
        onChange={(k) => setTab(k as 'liste' | 'carte')}
        tabs={[
          { key: 'liste', label: 'Liste' },
          { key: 'carte', label: 'Carte' },
        ]}
      />

      {tab === 'carte' ? (
        <EauCartePage />
      ) : (
        <EauPageShell
          title="Compteurs"
          subtitle="Gestion des compteurs (admin)"
          aide={AIDE.compteurs}
          actions={
            <button onClick={openNew} className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-3 py-2 rounded-lg">
              + Nouveau
            </button>
          }
        >
          {showForm && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-soft space-y-3 mb-4">
              <h2 className="font-semibold text-gray-800">{editing ? 'Modifier' : 'Nouveau compteur'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm col-span-2">
                  <span className="block text-gray-600 mb-1">Nom *</span>
                  <input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-600 mb-1">Type</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as CompteurType })}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-gray-600 mb-1">Zone</span>
                  <input
                    value={form.zone ?? ''}
                    onChange={(e) => setForm({ ...form, zone: e.target.value })}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-600 mb-1">Propriétaire</span>
                  <input
                    value={form.proprietaire ?? ''}
                    onChange={(e) => setForm({ ...form, proprietaire: e.target.value })}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-600 mb-1">Ordre</span>
                  <input
                    type="number"
                    value={form.ordre ?? ''}
                    onChange={(e) => setForm({ ...form, ordre: numOrNull(e.target.value) })}
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-600 mb-1">Latitude</span>
                  <input
                    type="number"
                    step="0.000001"
                    inputMode="decimal"
                    value={form.lat ?? ''}
                    onChange={(e) => setForm({ ...form, lat: numOrNull(e.target.value) })}
                    placeholder="-13.41"
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-600 mb-1">Longitude</span>
                  <input
                    type="number"
                    step="0.000001"
                    inputMode="decimal"
                    value={form.lng ?? ''}
                    onChange={(e) => setForm({ ...form, lng: numOrNull(e.target.value) })}
                    placeholder="48.27"
                    className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500"
                  />
                </label>
                <label className="text-sm flex items-center gap-2 col-span-2">
                  <input
                    type="checkbox"
                    checked={form.actif ?? true}
                    onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                    className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-gray-600">Actif</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={busy}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg"
                >
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
          ) : list.length === 0 ? (
            <div className="text-gray-400 text-sm py-8 text-center">Aucun compteur. Créez-en un.</div>
          ) : (
            <div className="space-y-1">
              {list.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {c.nom}
                      {!c.actif && <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">inactif</span>}
                      {c.lat != null && c.lng != null && <span title="Géolocalisé" className="text-xs">📍</span>}
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.type} · {c.zone ?? 'sans zone'}
                      {c.proprietaire ? ` · ${c.proprietaire}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => setQrCompteur(c)} className="text-ahuvi-forest hover:underline">
                      QR
                    </button>
                    <button onClick={() => openEdit(c)} className="text-sky-600 hover:underline">
                      Modifier
                    </button>
                    <button onClick={() => remove(c)} className="text-rose-600 hover:underline">
                      Suppr.
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </EauPageShell>
      )}

      {qrCompteur && <EauQrCompteurManager compteur={qrCompteur} onClose={() => setQrCompteur(null)} />}
    </div>
  );
}
