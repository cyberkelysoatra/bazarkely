/** Demandes d'accès /gestion-eau/demandes (admin) : valider (rôles + compteurs) ou refuser. */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Inbox, UserPlus, Check, X, Shield, Gauge } from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauEmptyState, EauIconButton, EauListIcon } from './EauUi';
import { AIDE } from './eauAideTextes';
import { listDemandes, validerDemande, refuserDemande } from '../services/eauDemandeService';
import { listCompteurs } from '../services/eauCompteurService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { fmtDate } from '../utils/format';
import { showConfirm } from '../../../utils/dialogUtils';
import type { DemandeAccesLocal, CompteurLocal } from '../types/gestionEau';

interface DraftState {
  admin: boolean;
  releveur: boolean;
  compteurs: Set<string>;
}

export default function EauDemandesPage() {
  const [demandes, setDemandes] = useState<DemandeAccesLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const me = getCurrentUserIdSync();

  const reload = useCallback(async () => {
    setDemandes(await listDemandes({ statut: 'en_attente' }));
    setCompteurs(await listCompteurs());
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  const draftFor = (id: string): DraftState =>
    drafts[id] ?? { admin: false, releveur: false, compteurs: new Set() };

  const updateDraft = (id: string, patch: Partial<DraftState>) =>
    setDrafts((p) => ({ ...p, [id]: { ...draftFor(id), ...patch } }));

  const toggleCompteur = (id: string, cid: string) => {
    const d = draftFor(id);
    const next = new Set(d.compteurs);
    if (next.has(cid)) next.delete(cid);
    else next.add(cid);
    updateDraft(id, { compteurs: next });
  };

  const valider = async (d: DemandeAccesLocal) => {
    const draft = draftFor(d.id);
    if (!draft.admin && !draft.releveur && draft.compteurs.size === 0) {
      toast.error('Attribuez au moins un rôle ou un compteur visible');
      return;
    }
    await validerDemande(d.id, {
      admin: draft.admin,
      releveur: draft.releveur,
      compteur_ids: Array.from(draft.compteurs),
      traitee_par: me,
    });
    await reload();
    setOpenId(null);
    toast.success('Demande validée');
  };

  const refuser = async (d: DemandeAccesLocal) => {
    if (!(await showConfirm('Refuser cette demande ?', 'Demande d\'accès', { variant: 'danger', confirmText: 'Refuser' }))) return;
    await refuserDemande(d.id, me);
    await reload();
    toast.success('Demande refusée');
  };

  return (
    <EauPageShell title="Demandes d’accès" subtitle="Valider ou refuser les nouvelles demandes (admin)" aide={AIDE.demandes}>
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : demandes.length === 0 ? (
        <EauEmptyState icon={Inbox} title="Aucune demande en attente" />
      ) : (
        <div className="space-y-2">
          {demandes.map((d) => {
            const draft = draftFor(d.id);
            const open = openId === d.id;
            return (
              <div key={d.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <EauListIcon icon={UserPlus} tone="olive" />
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">{d.nom || d.email || 'Utilisateur'}</div>
                      <div className="text-xs text-gray-500">
                        {d.email ?? ''} · {fmtDate(d.created_at)}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    En attente
                  </span>
                </div>

                {open ? (
                  <div className="mt-3 border-t border-gray-100 pt-3 space-y-3">
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={draft.admin}
                          onChange={(e) => updateDraft(d.id, { admin: e.target.checked })}
                          className="rounded border-gray-300 text-ahuvi-forest focus:ring-ahuvi-500" />
                        <Shield className="w-4 h-4 text-ahuvi-olive" aria-hidden="true" />
                        <span className="text-gray-700">Administrateur</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={draft.releveur}
                          onChange={(e) => updateDraft(d.id, { releveur: e.target.checked })}
                          className="rounded border-gray-300 text-ahuvi-forest focus:ring-ahuvi-500" />
                        <Gauge className="w-4 h-4 text-ahuvi-olive" aria-hidden="true" />
                        <span className="text-gray-700">Releveur</span>
                      </label>
                    </div>
                    <div className="text-sm">
                      <span className="block text-gray-600 mb-1">Compteurs visibles (client)</span>
                      {compteurs.length === 0 ? (
                        <p className="text-xs text-gray-400">Aucun compteur.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                          {compteurs.map((c) => (
                            <label key={c.id} className="flex items-center gap-2 px-3 py-2">
                              <input type="checkbox" checked={draft.compteurs.has(c.id)}
                                onChange={() => toggleCompteur(d.id, c.id)}
                                className="rounded border-gray-300 text-ahuvi-forest focus:ring-ahuvi-500" />
                              <span className="text-gray-800">{c.nom}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => valider(d)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg">
                        <Check className="w-4 h-4" aria-hidden="true" /> Valider
                      </button>
                      <EauIconButton icon={X} variant="secondary" onClick={() => setOpenId(null)}>
                        Annuler
                      </EauIconButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 mt-2 text-sm">
                    <button onClick={() => setOpenId(d.id)} className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium">
                      <Check className="w-4 h-4" aria-hidden="true" /> Valider…
                    </button>
                    <button onClick={() => refuser(d)} className="inline-flex items-center gap-1 text-rose-600 hover:underline">
                      <X className="w-4 h-4" aria-hidden="true" /> Refuser
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </EauPageShell>
  );
}
