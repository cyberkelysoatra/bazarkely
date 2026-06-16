/**
 * Liste des demandes d'accès reçues + validation (rôles + compteurs) ou refus, extraite de
 * EauDemandesPage v3.62.0. Porte localement l'état d'édition (`drafts`, `openId`) ; signale
 * tout changement au parent via `onChanged` (qui recharge ses listes).
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Inbox, UserPlus, Shield, Gauge, Eye, Check, X } from 'lucide-react';
import { EauEmptyState, EauIconButton, EauListIcon } from '../EauUi';
import { validerDemande, refuserDemande } from '../../services/eauDemandeService';
import { showConfirm } from '../../../../utils/dialogUtils';
import { fmtDate } from '../../utils/format';
import type { DemandeAccesLocal, CompteurLocal } from '../../types/gestionEau';

interface DraftState {
  admin: boolean;
  releveur: boolean;
  promoteur: boolean;
  compteurs: Set<string>;
}

export default function DemandesList({
  demandes,
  compteurs,
  me,
  isReadOnly,
  onChanged,
}: {
  demandes: DemandeAccesLocal[];
  compteurs: CompteurLocal[];
  me: string | null;
  isReadOnly: boolean;
  onChanged: () => void | Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const draftFor = (id: string): DraftState =>
    drafts[id] ?? { admin: false, releveur: false, promoteur: false, compteurs: new Set() };

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
    if (isReadOnly) return; // garde lecture seule (promoteur)
    const draft = draftFor(d.id);
    if (!draft.admin && !draft.releveur && !draft.promoteur && draft.compteurs.size === 0) {
      toast.error('Attribuez au moins un rôle ou un compteur visible');
      return;
    }
    await validerDemande(d.id, {
      admin: draft.admin,
      releveur: draft.releveur,
      promoteur: draft.promoteur,
      compteur_ids: Array.from(draft.compteurs),
      traitee_par: me,
    });
    await onChanged();
    setOpenId(null);
    toast.success('Demande validée');
  };

  const refuser = async (d: DemandeAccesLocal) => {
    if (isReadOnly) return; // garde lecture seule (promoteur)
    if (!(await showConfirm('Refuser cette demande ?', 'Demande d\'accès', { variant: 'danger', confirmText: 'Refuser' }))) return;
    await refuserDemande(d.id, me);
    await onChanged();
    toast.success('Demande refusée');
  };

  return (
    <div>
      <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
        <Inbox className="w-5 h-5 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
        Demandes reçues ({demandes.length})
      </h2>
      {demandes.length === 0 ? (
        <EauEmptyState icon={Inbox} title="Aucune demande en attente" />
      ) : (
        <div className="space-y-2">
          {demandes.map((d) => {
            const draft = draftFor(d.id);
            const open = openId === d.id;
            return (
              <div key={d.id} className="bg-white border border-ahuvi-100 rounded-lg p-3 shadow-soft">
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
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={draft.promoteur}
                          onChange={(e) => updateDraft(d.id, { promoteur: e.target.checked })}
                          className="rounded border-gray-300 text-ahuvi-teal focus:ring-ahuvi-500" />
                        <Eye className="w-4 h-4 text-ahuvi-teal" aria-hidden="true" />
                        <span className="text-gray-700">Promoteur</span>
                      </label>
                    </div>
                    <div className="text-sm">
                      <span className="block text-gray-600 mb-1">Compteurs visibles (propriétaire)</span>
                      {compteurs.length === 0 ? (
                        <p className="text-xs text-gray-400">Aucun compteur.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto border border-ahuvi-100 rounded-lg divide-y">
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
                ) : isReadOnly ? null : (
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
    </div>
  );
}
