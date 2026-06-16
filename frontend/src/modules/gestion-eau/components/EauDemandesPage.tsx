/** Invitations & demandes /gestion-eau/demandes (admin) :
 *  - INVITER par EMAIL (octroi auto au 1er login Google sur l'adresse) + envoi WhatsApp (wa.me).
 *  - INVITER par LIEN WhatsApp (jeton) : l'admin n'a que le numéro ; un lien `/i/<token>`
 *    enrôle au 1er login, quel que soit le compte Google choisi (aucune adresse imposée).
 *  - Suivre les invitations envoyées (en attente / acceptées / expirées) : renvoyer / révoquer.
 *  - Gérer les demandes d'accès reçues : valider (rôles + compteurs) ou refuser.
 *
 * Découpé (v3.62.0) : l'orchestration (données, listes d'invitations, liens, révocation)
 * reste ici ; le formulaire d'invitation, l'import du répertoire et la liste des demandes
 * vivent dans `demandes/*` et portent leur propre état de saisie (re-renders isolés). */
import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  UserPlus, Copy, Trash2, RefreshCw, ShieldCheck, ClipboardList, Users, Mail,
  BadgeCheck, Clock, MailPlus, MessageCircle, Link as LinkIcon, CalendarClock, Eye, Send,
} from 'lucide-react';
import EauPageShell from './EauPageShell';
import { EauEmptyState, EauIconButton, EauListIcon } from './EauUi';
import { EauReadOnlyBadge } from './EauReadOnly';
import { useGestionEau } from '../context';
import { AIDE } from './eauAideTextes';
import { listDemandes } from '../services/eauDemandeService';
import {
  revokeInvitation, refreshInvitations,
  buildInvitationMessage, buildWhatsappUrl,
  buildInviteUrl, buildWhatsappInviteMessage, buildWhatsappInviteUrl,
} from '../services/eauInvitationService';
import { listCompteurs } from '../services/eauCompteurService';
import { getCurrentUserIdSync } from '../services/eauAuth';
import { fmtDate } from '../utils/format';
import { eauIsOnline } from '../utils/online';
import { showConfirm } from '../../../utils/dialogUtils';
import InvitationForm from './demandes/InvitationForm';
import BatchImportPanel from './demandes/BatchImportPanel';
import DemandesList from './demandes/DemandesList';
import type { DemandeAccesLocal, CompteurLocal, InvitationLocal } from '../types/gestionEau';

/** Une invitation par jeton est expirée si sa date d'expiration est passée. */
const isExpired = (inv: InvitationLocal): boolean =>
  !!inv.expires_at && new Date(inv.expires_at).getTime() < Date.now();

/** Rang d'affichage des invitations par lien : en attente (0) < acceptée (1) < expirée (2). */
function statusRank(inv: InvitationLocal): number {
  if (inv.statut === 'acceptee') return 1;
  if (isExpired(inv)) return 2;
  return 0;
}

export default function EauDemandesPage() {
  const [demandes, setDemandes] = useState<DemandeAccesLocal[]>([]);
  const [invitations, setInvitations] = useState<InvitationLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const me = getCurrentUserIdSync();
  const { isReadOnly } = useGestionEau();

  // Formulaire d'invitation (visibilité) + dernière invitation créée (confirmation).
  const [showForm, setShowForm] = useState(false);
  const [lastInvite, setLastInvite] = useState<InvitationLocal | null>(null);

  const reload = useCallback(async () => {
    setDemandes(await listDemandes({ statut: 'en_attente' }));
    setCompteurs(await listCompteurs());
    const online = eauIsOnline();
    setInvitations(await refreshInvitations(online));
  }, []);

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [reload]);

  // — Actions canal EMAIL (octroi par correspondance d'adresse Google) —
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

  // — Actions canal WHATSAPP (enrôlement par jeton, compte Google au choix) —
  const openWhatsappToken = (inv: InvitationLocal) => {
    const url = buildWhatsappInviteUrl(inv);
    const win = window.open(url, '_blank');
    if (!win) {
      navigator.clipboard?.writeText(buildWhatsappInviteMessage(inv)).then(() => {});
      toast.error('WhatsApp n’a pas pu s’ouvrir — message copié, collez-le dans WhatsApp.');
    }
  };

  const copyLink = (inv: InvitationLocal) => {
    if (!inv.token) { toast.error('Lien indisponible'); return; }
    navigator.clipboard?.writeText(buildInviteUrl(inv.token))
      .then(() => toast.success('Lien copié'))
      .catch(() => toast.error('Copie impossible'));
  };

  const copyTokenMessage = (inv: InvitationLocal) => {
    navigator.clipboard?.writeText(buildWhatsappInviteMessage(inv))
      .then(() => toast.success('Message copié'))
      .catch(() => toast.error('Copie impossible'));
  };

  const revoke = async (inv: InvitationLocal) => {
    if (isReadOnly) return; // garde lecture seule (promoteur)
    const who = inv.invite_channel === 'whatsapp' ? (inv.nom || inv.phone || 'ce lien') : (inv.email ?? 'cette personne');
    if (!(await showConfirm(`Révoquer l’invitation de ${who} ?`, 'Invitation', { variant: 'danger', confirmText: 'Révoquer' }))) return;
    await revokeInvitation(inv.id);
    if (lastInvite?.id === inv.id) setLastInvite(null);
    await reload();
    toast.success('Invitation révoquée');
  };

  const visible = useMemo(() => invitations.filter((i) => i.statut !== 'revoquee'), [invitations]);
  const emailInvites = useMemo(() => visible.filter((i) => i.invite_channel !== 'whatsapp'), [visible]);
  const waInvites = useMemo(
    () =>
      visible
        .filter((i) => i.invite_channel === 'whatsapp')
        .sort((a, b) => statusRank(a) - statusRank(b)), // en_attente, acceptée, expirée — déjà triées date desc en amont
    [visible]
  );

  const roleBadges = (inv: InvitationLocal) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {inv.role_admin && <Badge icon={ShieldCheck} tone="gold">Admin</Badge>}
      {inv.role_releveur && <Badge icon={ClipboardList} tone="olive">Releveur</Badge>}
      {inv.role_promoteur && <Badge icon={Eye} tone="teal">Promoteur</Badge>}
      {inv.role_client && <Badge icon={Users} tone="teal">Propriétaire{inv.compteur_ids?.length ? ` · ${inv.compteur_ids.length} compteur(s)` : ''}</Badge>}
    </div>
  );

  return (
    <EauPageShell
      title="Invitations & demandes"
      subtitle="Inviter par email ou par lien WhatsApp, et valider les demandes reçues (admin)"
      aide={AIDE.invitations}
      actions={
        isReadOnly ? (
          <EauReadOnlyBadge />
        ) : (
          <EauIconButton
            icon={UserPlus}
            variant="primary"
            onClick={() => { setShowForm((v) => !v); setLastInvite(null); }}
          >
            Inviter
          </EauIconButton>
        )
      }
    >
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>
      ) : (
        <div className="space-y-5">
          {/* Import du répertoire → lot d'invitations WhatsApp (A + revue B + liens prêts C). */}
          <BatchImportPanel
            me={me}
            isReadOnly={isReadOnly}
            onBatchCreated={reload}
            onPickStart={() => { setLastInvite(null); setShowForm(false); }}
            openWhatsappToken={openWhatsappToken}
            copyLink={copyLink}
            roleBadges={roleBadges}
          />

          {/* Confirmation : invitation par LIEN WhatsApp créée */}
          {lastInvite && lastInvite.invite_channel === 'whatsapp' && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <div className="text-sm text-emerald-800 font-medium flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                Lien d’invitation prêt{lastInvite.nom ? ` pour ${lastInvite.nom}` : ''}
              </div>
              <p className="text-xs text-emerald-700 mt-1">
                Envoyez le lien par WhatsApp : l’accès s’activera à la connexion Google (compte au choix).
              </p>
              {lastInvite.token && (
                <div className="mt-2 px-3 py-2 rounded-lg bg-white border border-emerald-200 text-xs text-gray-600 break-all">
                  {buildInviteUrl(lastInvite.token)}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-3">
                <EauIconButton icon={Send} variant="primary" onClick={() => openWhatsappToken(lastInvite)}>
                  Envoyer sur WhatsApp
                </EauIconButton>
                <EauIconButton icon={LinkIcon} variant="secondary" onClick={() => copyLink(lastInvite)}>
                  Copier le lien
                </EauIconButton>
                <EauIconButton icon={Copy} variant="secondary" onClick={() => copyTokenMessage(lastInvite)}>
                  Copier le message
                </EauIconButton>
              </div>
            </div>
          )}

          {/* Confirmation : invitation par EMAIL créée → envoi WhatsApp */}
          {lastInvite && lastInvite.invite_channel !== 'whatsapp' && (
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

          {/* Formulaire d'invitation unitaire */}
          {showForm && (
            <InvitationForm
              compteurs={compteurs}
              me={me}
              isReadOnly={isReadOnly}
              onCreated={async (inv) => {
                setLastInvite(inv);
                setShowForm(false);
                await reload();
              }}
            />
          )}

          {/* Liste des invitations par LIEN WhatsApp */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <MessageCircle className="w-5 h-5 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
              Invitations par lien WhatsApp ({waInvites.length})
            </h2>
            {waInvites.length === 0 ? (
              <EauEmptyState icon={MessageCircle} title="Aucune invitation par lien"
                hint="Onglet « WhatsApp » de « Inviter » : créez un lien à envoyer par numéro." />
            ) : (
              <div className="space-y-2">
                {waInvites.map((inv) => {
                  const accepted = inv.statut === 'acceptee';
                  const expired = !accepted && isExpired(inv);
                  return (
                    <div key={inv.id} className="bg-white border border-ahuvi-100 rounded-lg p-3 shadow-soft">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          <EauListIcon icon={inv.role_admin ? ShieldCheck : inv.role_client ? Users : ClipboardList}
                            tone={inv.role_admin ? 'gold' : inv.role_client ? 'teal' : 'olive'} />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{inv.nom || inv.phone}</div>
                            <div className="text-xs text-gray-500 truncate">{inv.phone}</div>
                            {roleBadges(inv)}
                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                              {inv.expires_at ? `Expire le ${fmtDate(inv.expires_at)}` : 'Sans expiration'}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                          accepted ? 'bg-emerald-100 text-emerald-700'
                            : expired ? 'bg-gray-100 text-gray-500'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {accepted
                            ? <><BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" />Acceptée{inv.accepted_at ? ` · ${fmtDate(inv.accepted_at)}` : ''}</>
                            : expired
                              ? <><Clock className="w-3.5 h-3.5" aria-hidden="true" />Expirée</>
                              : <><Clock className="w-3.5 h-3.5" aria-hidden="true" />En attente</>}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm">
                        <button onClick={() => openWhatsappToken(inv)}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium">
                          {accepted ? <Send className="w-4 h-4" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
                          Renvoyer WhatsApp
                        </button>
                        <button onClick={() => copyLink(inv)}
                          className="inline-flex items-center gap-1 text-gray-500 hover:underline">
                          <LinkIcon className="w-4 h-4" aria-hidden="true" /> Copier le lien
                        </button>
                        {!accepted && !isReadOnly && (
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

          {/* Liste des invitations par EMAIL */}
          <div>
            <h2 className="font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <Mail className="w-5 h-5 text-ahuvi-forest flex-shrink-0" aria-hidden="true" />
              Invitations par email ({emailInvites.length})
            </h2>
            {emailInvites.length === 0 ? (
              <EauEmptyState icon={Mail} title="Aucune invitation par email"
                hint="Onglet « Email » de « Inviter » pour ajouter une personne par son adresse Google." />
            ) : (
              <div className="space-y-2">
                {emailInvites.map((inv) => {
                  const accepted = inv.statut === 'acceptee';
                  return (
                    <div key={inv.id} className="bg-white border border-ahuvi-100 rounded-lg p-3 shadow-soft">
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
                        {!accepted && !isReadOnly && (
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

          {/* Demandes d'accès reçues */}
          <DemandesList
            demandes={demandes}
            compteurs={compteurs}
            me={me}
            isReadOnly={isReadOnly}
            onChanged={reload}
          />
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
    ? 'bg-ahuvi-gold/15 text-ahuvi-gold-700'
    : tone === 'teal'
      ? 'bg-cyan-50 text-ahuvi-teal'
      : 'bg-ahuvi-100 text-ahuvi-olive';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${cls}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />{children}
    </span>
  );
}
