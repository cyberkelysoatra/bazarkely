/** Comptes & rôles /gestion-eau/utilisateurs (admin) :
 *  - cocher Administrateur / Releveur (effet immédiat, eau_roles)
 *  - créer un compte client (nom, contact, compteurs visibles) → code d'enrôlement */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import EauPageShell from './EauPageShell';
import { listRoles, setRoles, fetchUserDirectory, type UserInfo } from '../services/eauRoleService';
import { listCompteurs } from '../services/eauCompteurService';
import { listComptesClient, createCompteClient } from '../services/eauCompteClientService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import type { RoleLocal, CompteurLocal, CompteClientLocal } from '../types/gestionEau';

export default function EauUtilisateursPage() {
  const [roles, setRolesList] = useState<RoleLocal[]>([]);
  const [dir, setDir] = useState<Map<string, UserInfo>>(new Map());
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [comptes, setComptes] = useState<CompteClientLocal[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire compte client
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [contact, setContact] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  const me = getCurrentUserIdSync();

  const reload = useCallback(async () => {
    const r = await listRoles();
    setRolesList(r);
    setComptes(await listComptesClient());
    setCompteurs(await listCompteurs());
    const ids = r.map((x) => x.user_id);
    setDir(await fetchUserDirectory(ids));
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  const labelFor = (userId: string) => {
    const info = dir.get(userId);
    if (info?.email) return info.email;
    if (info?.username) return info.username;
    return `${userId.slice(0, 8)}…`;
  };

  const toggleRole = async (r: RoleLocal, key: 'admin' | 'releveur', value: boolean) => {
    if (key === 'admin' && !value && r.user_id === me) {
      if (!window.confirm('Retirer VOTRE propre rôle administrateur ? Vous perdrez l’accès admin.')) return;
    }
    await setRoles(r.user_id, {
      admin: key === 'admin' ? value : r.admin,
      releveur: key === 'releveur' ? value : r.releveur,
    });
    await reload();
    toast.success('Rôles mis à jour');
  };

  const toggleCompteur = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitClient = async () => {
    if (!nom.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    setBusy(true);
    try {
      const compte = await createCompteClient({
        nom: nom.trim(),
        contact: contact.trim() || null,
        compteur_ids: Array.from(selected),
        created_by: me,
      });
      setNewCode(compte.code_enrolement);
      setNom('');
      setContact('');
      setSelected(new Set());
      setShowForm(false);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <EauPageShell
      title="Utilisateurs"
      subtitle="Rôles & comptes clients (admin)"
      actions={
        <button
          onClick={() => { setShowForm((v) => !v); setNewCode(null); }}
          className="bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
        >
          + Compte client
        </button>
      }
    >
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="space-y-4">
          {/* Code d'enrôlement généré */}
          {newCode && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <div className="text-sm text-emerald-800 font-medium">Code d’enrôlement généré</div>
              <div className="text-3xl font-bold tracking-widest text-emerald-700 my-2 select-all">{newCode}</div>
              <p className="text-xs text-emerald-700">
                Transmettez ce code au client. Il pourra l’utiliser sur la page d’accueil
                (« J’ai un code ») après connexion avec Google pour activer son compte.
              </p>
              <button
                onClick={() => { navigator.clipboard?.writeText(newCode).then(() => toast.success('Code copié')); }}
                className="mt-2 text-sm text-emerald-700 underline"
              >
                Copier le code
              </button>
            </div>
          )}

          {/* Formulaire compte client */}
          {showForm && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 shadow-soft space-y-3">
              <h2 className="font-semibold text-gray-800">Nouveau compte client</h2>
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Nom *</span>
                <input value={nom} onChange={(e) => setNom(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500" />
              </label>
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Contact</span>
                <input value={contact} onChange={(e) => setContact(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-sky-500 focus:ring-sky-500" />
              </label>
              <div className="text-sm">
                <span className="block text-gray-600 mb-1">Compteurs visibles</span>
                {compteurs.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun compteur. Créez-en d’abord.</p>
                ) : (
                  <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y">
                    {compteurs.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 px-3 py-2">
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleCompteur(c.id)}
                          className="rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                        <span className="text-gray-800">{c.nom}</span>
                        <span className="text-xs text-gray-400">{c.zone ?? ''}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={submitClient} disabled={busy}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg">
                {busy ? 'Création…' : 'Créer & générer le code'}
              </button>
            </div>
          )}

          {/* Rôles */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Rôles ({roles.length})</h2>
            {roles.length === 0 ? (
              <div className="text-gray-400 text-sm py-4 text-center">Aucun utilisateur enregistré.</div>
            ) : (
              <div className="space-y-1">
                {roles.map((r) => (
                  <div key={r.user_id} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {labelFor(r.user_id)}
                      {r.user_id === me && <span className="ml-2 text-xs text-sky-600">(vous)</span>}
                    </div>
                    <div className="flex gap-4 mt-1 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={r.admin}
                          onChange={(e) => toggleRole(r, 'admin', e.target.checked)}
                          className="rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                        <span className="text-gray-700">Administrateur</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={r.releveur}
                          onChange={(e) => toggleRole(r, 'releveur', e.target.checked)}
                          className="rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                        <span className="text-gray-700">Releveur</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comptes clients */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Comptes clients ({comptes.length})</h2>
            {comptes.length === 0 ? (
              <div className="text-gray-400 text-sm py-4 text-center">Aucun compte client.</div>
            ) : (
              <div className="space-y-1">
                {comptes.map((c) => (
                  <div key={c.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{c.nom}</div>
                      <div className="text-xs text-gray-500">
                        {c.compteur_ids?.length ?? 0} compteur(s) · code {c.code_enrolement}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      c.actif ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {c.actif ? 'Activé' : 'En attente'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </EauPageShell>
  );
}
