/** Invitations & demandes /gestion-eau/demandes (admin) :
 *  - INVITER par email (octroi auto au 1er login Google) + envoi WhatsApp (wa.me).
 *  - Suivre les invitations envoyées (en attente / acceptées) : renvoyer / révoquer.
 *  - Gérer les demandes d'accès reçues : valider (rôles + compteurs) ou refuser. */
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  Inbox, UserPlus, Check, X, Shield, Gauge, Send, Copy, Trash2, RefreshCw,
  ShieldCheck, ClipboardList, Users, Mail, BadgeCheck, Clock, MailPlus,
} from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauEmptyState, EauIconButton, EauListIcon } from './EauUi';
import { AIDE } from './eauAideTextes';
import { listDemandes, validerDemande, refuserDemande } from '../services/eauDemandeService';
import {
  createInvitation, listInvitations, revokeInvitation, refreshInvitations,
  invitationTargetPath, buildInvitationMessage, buildWhatsappUrl,
} from '../services/eauInvitationService';
import { listCompteurs } from '../services/eauCompteurService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { fmtDate } from '../utils/format';
import { showConfirm } from '../../../utils/dialogUtils';
import type { DemandeAccesLocal, CompteurLocal, InvitationLocal } from '../types/gestionEau';

interface DraftState {
  admin: boolean;
  releveur: boolean;
  compteurs: Set<string>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EauDemandesPage() {
  const [demandes, setDemandes] = useState<DemandeAccesLocal[]>([]);
  const [invitations, setInvitations] = useState<InvitationLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const me = getCurrentUserIdSync();

  // Formulaire d'invitation
  const [showForm, setShowForm] = useState(false);
  const [iNom, setINom] = useState('');
  const [iEmail, setIEmail] = useState('');
  const [iPhone, setIPhone] = useState('');
  const [rAdmin, setRAdmin] = useState(false);
  const [rReleveur, setRReleveur] = useState(true);
  const [rClient, setRClient] = useState(false);
  const [iCompteurs, setICompteurs] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [lastInvite, setLastInvite] = useState<InvitationLocal | null>(null);

  const reload = useCallback(async () => {
    setDemandes(await listDemandes({ statut: 'en_attente' }));
    setCompteurs(await listCompteurs());
    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    setInvitations(await refreshInvitations(online));
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  // ─────────────────────────── Invitations ────────────────────────────
  const resetForm = () => {
    setINom(''); setIEmail(''); setIPhone('');
    setRAdmin(false); setRReleveur(true); setRClient(false);
    setICompteurs(new Set());
  };

  const toggleInviteCompteur = (id: string) => {
    setICompteurs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openWhatsapp = (inv: InvitationLocal) => {
    const url = buildWhatsappUrl(inv);
    const win = window.open(url, '_blank');
    if (!win) {
      navigator.clipboard?.writeText(buildInvitationMessage(inv)).then(() => {});
      toast.error('WhatsApp n’a pas pu s’ouvrir — message copié, collez-le dans WhatsApp.');
    }
  };

  const copyMessage = (inv: InvitationLocal) => {
    navigator.clipboard?.writeText(buildInvitationMessage(inv))
      .then(() => toast.success('Message copié'))
      .catch(() => toast.error('Copie impossible'));
  };

  const submitInvite = async () => {
    const email = iEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { toast.error('Email Google invalide'); return; }
    if (!iPhone.replace(/\D/g, '')) { toast.error('Numéro WhatsApp requis'); return; }
    if (!rAdmin && !rReleveur && !rClient) { toast.error('Choisissez au moins un rôle'); return; }
    setBusy(true);
    try {
      const flags = { role_admin: rAdmin, role_releveur: rReleveur, role_client: rClient };
      const inv = await createInvitation({
        email,
        nom: iNom.trim() || null,
        phone: iPhone.trim(),
        ...flags,
        compteur_ids: rClient ? Array.from(iCompteurs) : [],
        cible: invitationTargetPath(flags),
        invited_by: me,
      });
      setLastInvite(inv);
      resetForm();
      setShowForm(false);
      await reload();
      toast.success('Invitation créée');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (inv: InvitationLocal) => {
    if (!(await showConfirm(`Révoquer l’invitation de ${inv.email} ?`, 'Invitation', { variant: 'danger', confirmText: 'Révoquer' }))) return;
    await revokeInvitation(inv.id);
    if (lastInvite?.id === inv.id) setLastInvite(null);
    await reload();
    toast.success('Invitation révoquée');
  };

  const visibleInvites = invitations.filter((i) => i.statut !== 'revoquee');

  // ─────────────────────────── Demandes reçues ────────────────────────
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

  const roleBadges = (inv: InvitationLocal) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {inv.role_admin && <Badge icon={ShieldCheck} tone="gold">Admin</Badge>}
      {inv.role_releveur && <Badge icon={ClipboardList} tone="olive">Releveur</Badge>}
      {inv.role_client && <Badge icon={Users} tone="teal">Client{inv.compteur_ids?.length ? ` · ${inv.compteur_ids.length} compteur(s)` : ''}</Badge>}
    </div>
  );

  return (
    <EauPageShell
      title="Invitations & demandes"
      subtitle="Inviter par email + WhatsApp, et valider les demandes reçues (admin)"
      aide={AIDE.invitations}
      actions={
        <EauIconButton
          icon={UserPlus}
          variant="primary"
          onClick={() => { setShowForm((v) => !v); setLastInvite(null); }}
        >
          Inviter
        </EauIconButton>
      }
    >
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="space-y-5">
          {/* Confirmation d'invitation créée → envoi WhatsApp */}
          {lastInvite && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <div className="text-sm text-emerald-800 font-medium flex items-center gap-1.5">
                <MailPlus className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                Invitation prête pour {lastInvite.email}
              </div>
              <p className="text-xs text-emerald-700 mt-1">
                Envoyez le message WhatsApp : l’accès s’activera automatiquement à sa 1ʳᵉ connexion Google.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <EauIconButton icon={Send} variant="primary" onClick={() => openWhatsapp(lastInvite)}>
                  Envoyer sur WhatsApp
                </EauIconButton>
                <EauIconButton icon={Copy} variant="secondary" onClick={() => copyMessage(lastInvite)}>
                  Copier le message
                </EauIconButton>
              </div>
            </div>
          )}

          {/* Formulaire d'invitation */}
          {showForm && (
            <div className="rounded-xl border border-ahuvi-200 bg-ahuvi-50/50 p-4 shadow-soft space-y-3">
              <h2 className="font-semibold text-ahuvi-forest flex items-center gap-1.5">
                <UserPlus className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                Nouvelle invitation
              </h2>
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Nom</span>
                <input value={iNom} onChange={(e) => setINom(e.target.value)}
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
              </label>
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Email Google *</span>
                <input type="email" inputMode="email" value={iEmail} onChange={(e) => setIEmail(e.target.value)}
                  placeholder="prenom.nom@gmail.com"
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
              </label>
              <label className="text-sm block">
                <span className="block text-gray-600 mb-1">Numéro WhatsApp *</span>
                <input type="tel" inputMode="tel" value={iPhone} onChange={(e) => setIPhone(e.target.value)}
                  placeholder="032 89 95 681"
                  className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
              </label>
              <div className="text-sm">
                <span className="block text-gray-600 mb-1">Rôle(s)</span>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={rAdmin} onChange={(e) => setRAdmin(e.target.checked)}
                      className="rounded border-gray-300 text-ahuvi-forest focus:ring-ahuvi-500" />
                    <ShieldCheck className="w-4 h-4 text-ahuvi-olive" aria-hidden="true" />
                    <span className="text-gray-700">Administrateur</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={rReleveur} onChange={(e) => setRReleveur(e.target.checked)}
                      className="rounded border-gray-300 text-ahuvi-forest focus:ring-ahuvi-500" />
                    <ClipboardList className="w-4 h-4 text-ahuvi-olive" aria-hidden="true" />
                    <span className="text-gray-700">Releveur</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="checkbox" checked={rClient} onChange={(e) => setRClient(e.target.checked)}
                      className="rounded border-gray-300 text-ahuvi-forest focus:ring-ahuvi-500" />
                    <Users className="w-4 h-4 text-ahuvi-olive" aria-hidden="true" />
                    <span className="text-gray-700">Client</span>
                  </label>
                </div>
              </div>
              {rClient && (
                <div className="text-sm">
                  <span className="block text-gray-600 mb-1">Compteurs visibles (client)</span>
                  {compteurs.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucun compteur. Créez-en d’abord.</p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y">
                      {compteurs.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 px-3 py-2">
                          <input type="checkbox" checked={iCompteurs.has(c.id)} onChange={() => toggleInviteCompteur(c.id)}
                            className="rounded border-gray-300 text-ahuvi-forest focus:ring-ahuvi-500" />
                          <span className="text-gray-800">{c.nom}</span>
                          <span className="text-xs text-gray-400">{c.zone ?? ''}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <EauIconButton icon={Send} variant="primary" onClick={submitInvite} disabled={busy} className="w-full py-2.5">
                {busy ? 'Création…' : 'Créer l’invitation'}
              </EauIconButton>
            </div>
          )}

          {/* Liste des invitations */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <Mail className="w-5 h-5 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
              Invitations ({visibleInvites.length})
            </h2>
            {visibleInvites.length === 0 ? (
              <EauEmptyState icon={Mail} title="Aucune invitation envoyée"
                hint="Cliquez sur « Inviter » pour ajouter une personne par email." />
            ) : (
              <div className="space-y-2">
                {visibleInvites.map((inv) => {
                  const accepted = inv.statut === 'acceptee';
                  return (
                    <div key={inv.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-soft">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <EauListIcon icon={inv.role_admin ? ShieldCheck : inv.role_client ? Users : ClipboardList}
                            tone={inv.role_admin ? 'gold' : inv.role_client ? 'teal' : 'olive'} />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{inv.nom || inv.email}</div>
                            <div className="text-xs text-gray-500 truncate">{inv.email}</div>
                            {roleBadges(inv)}
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                          accepted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {accepted
                            ? <><BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />Acceptée{inv.accepted_at ? ` · ${fmtDate(inv.accepted_at)}` : ''}</>
                            : <><Clock className="w-3.5 h-3.5" aria-hidden="true" />En attente</>}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm">
                        <button onClick={() => openWhatsapp(inv)}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium">
                          {accepted ? <Send className="w-4 h-4" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
                          {accepted ? 'Envoyer WhatsApp' : 'Renvoyer WhatsApp'}
                        </button>
                        <button onClick={() => copyMessage(inv)}
                          className="inline-flex items-center gap-1 text-gray-500 hover:underline">
                          <Copy className="w-4 h-4" aria-hidden="true" /> Copier
                        </button>
                        {!accepted && (
                          <button onClick={() => revoke(inv)}
                            className="inline-flex items-center gap-1 text-rose-600 hover:underline">
                            <Trash2 className="w-4 h-4" aria-hidden="true" /> Révoquer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Demandes d'accès reçues (existant) */}
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
          </div>
        </div>
      )}
    </EauPageShell>
  );
}

/** Petit badge de rôle (icône + libellé) en charte AHUVI. */
function Badge({ icon: Icon, tone, children }: {
  icon: typeof ShieldCheck;
  tone: 'gold' | 'olive' | 'teal';
  children: ReactNode;
}) {
  const cls = tone === 'gold'
    ? 'bg-[#f4f2dd] text-[#8a8836]'
    : tone === 'teal'
      ? 'bg-cyan-50 text-ahuvi-teal'
      : 'bg-ahuvi-100 text-ahuvi-olive';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${cls}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />{children}
    </span>
  );
}
