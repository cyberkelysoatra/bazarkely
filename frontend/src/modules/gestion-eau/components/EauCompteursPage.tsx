/** CRUD compteurs /gestion-eau/compteurs (admin) : Liste (CRUD + QR + géoloc) · Carte. */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Save, X, Gauge, QrCode, Pencil, Trash2, MapPin, ListChecks, Map } from 'lucide-react';
import EauPageShell from './EauPageShell';
import { AIDE } from './eauAideTextes';
import EauTabs from './EauTabs';
import EauCartePage from './EauCartePage';
import EauQrCompteurManager from './EauQrCompteurManager';
import { EauIconButton, EauEmptyState, EauListIcon } from './EauUi';
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
          { key: 'liste', label: 'Liste', icon: ListChecks },
          { key: 'carte', label: 'Carte', icon: Map },
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
            <EauIconButton icon={Plus} variant="primary" onClick={openNew}>
              Nouveau
            </EauIconButton>
          }
        >
          {showForm && (
            <div className="rounded-xl border border-ahuvi-200 bg-ahuvi-50/50 p-4 shadow-soft space-y-3 mb-4">
              <h2 className="font-semibold text-ahuvi-forest">{editing ? 'Modifier' : 'Nouveau compteur'}</h2>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm col-span-2">
                  <span className="block text-gray-600 mb-1">Nom *</span>
                  <input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-600 mb-1">Type</span>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as CompteurType })}
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
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
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-600 mb-1">Propriétaire</span>
                  <input
                    value={form.proprietaire ?? ''}
                    onChange={(e) => setForm({ ...form, proprietaire: e.target.value })}
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-gray-600 mb-1">Ordre</span>
                  <input
                    type="number"
                    value={form.ordre ?? ''}
                    onChange={(e) => setForm({ ...form, ordre: numOrNull(e.target.value) })}
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
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
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
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
                    className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
                  />
                </label>
                <label className="text-sm flex items-center gap-2 col-span-2">
                  <input
                    type="checkbox"
                    checked={form.actif ?? true}
                    onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                    className="rounded border-gray-300 text-ahuvi-forest focus:ring-ahuvi-500"
                  />
                  <span className="text-gray-600">Actif</span>
                </label>
              </div>
              <div className="flex gap-2">
                <EauIconButton
                  icon={editing ? Save : Plus}
                  variant="primary"
                  onClick={save}
                  disabled={busy}
                  className="flex-1"
                >
                  {editing ? 'Enregistrer' : 'Créer'}
                </EauIconButton>
                <EauIconButton icon={X} variant="secondary" onClick={() => setShowForm(false)}>
                  Annuler
                </EauIconButton>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
          ) : list.length === 0 ? (
            <EauEmptyState
              icon={Gauge}
              title="Aucun compteur"
              hint="Créez-en un pour commencer."
              action={
                <EauIconButton icon={Plus} variant="primary" onClick={openNew}>
                  Nouveau
                </EauIconButton>
              }
            />
          ) : (
            <div className="space-y-1">
              {list.map((c) => (
                <div
                  key={c.id}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <EauListIcon icon={Gauge} tone={c.actif ? 'teal' : 'neutral'} />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {c.nom}
                        {!c.actif && <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">inactif</span>}
                        {c.lat != null && c.lng != null && (
                          <MapPin className="w-3.5 h-3.5 text-ahuvi-olive flex-shrink-0" aria-hidden="true" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.type} · {c.zone ?? 'sans zone'}
                        {c.proprietaire ? ` · ${c.proprietaire}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm flex-shrink-0">
                    <button onClick={() => setQrCompteur(c)} title="QR" className="inline-flex items-center gap-1 text-ahuvi-forest hover:underline">
                      <QrCode className="w-4 h-4" aria-hidden="true" /> QR
                    </button>
                    <button onClick={() => openEdit(c)} title="Modifier" className="inline-flex items-center gap-1 text-ahuvi-olive hover:underline">
                      <Pencil className="w-4 h-4" aria-hidden="true" /> Modifier
                    </button>
                    <button onClick={() => remove(c)} title="Supprimer" className="inline-flex items-center gap-1 text-rose-600 hover:underline">
                      <Trash2 className="w-4 h-4" aria-hidden="true" /> Suppr.
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
