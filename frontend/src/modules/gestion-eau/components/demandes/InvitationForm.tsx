/**
 * Formulaire d'invitation unitaire (email ou lien WhatsApp), extrait de EauDemandesPage
 * v3.62.0. Porte localement TOUT l'état du formulaire (canal, identité, rôles, compteurs,
 * délai) pour que la saisie ne re-render plus les listes d'invitations/demandes. Délègue la
 * création réussie au parent via `onCreated` (qui mémorise `lastInvite`, ferme et recharge).
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  UserPlus, Mail, MessageCircle, CalendarClock, ShieldCheck, ClipboardList, Users, Eye, Send,
} from 'lucide-react';
import { EauIconButton, eauSegmentTabClass } from '../EauUi';
import {
  createInvitation, createWhatsappInvitation, invitationTargetPath,
} from '../../services/eauInvitationService';
import type { CompteurLocal, InvitationLocal } from '../../types/gestionEau';

type InviteChannel = 'email' | 'whatsapp';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function InvitationForm({
  compteurs,
  me,
  isReadOnly,
  onCreated,
}: {
  compteurs: CompteurLocal[];
  me: string | null;
  isReadOnly: boolean;
  onCreated: (inv: InvitationLocal) => void | Promise<void>;
}) {
  const [channel, setChannel] = useState<InviteChannel>('whatsapp');
  const [iNom, setINom] = useState('');
  const [iEmail, setIEmail] = useState('');
  const [iPhone, setIPhone] = useState('');
  const [rAdmin, setRAdmin] = useState(false);
  const [rReleveur, setRReleveur] = useState(true);
  const [rClient, setRClient] = useState(false);
  const [rPromoteur, setRPromoteur] = useState(false);
  const [iCompteurs, setICompteurs] = useState<Set<string>>(new Set());
  const [iExpiresDays, setIExpiresDays] = useState<number | null>(30);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setINom(''); setIEmail(''); setIPhone('');
    setRAdmin(false); setRReleveur(true); setRClient(false); setRPromoteur(false);
    setICompteurs(new Set()); setIExpiresDays(30);
  };

  const toggleInviteCompteur = (id: string) => {
    setICompteurs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitInvite = async () => {
    if (isReadOnly) return; // garde lecture seule (promoteur)
    if (channel === 'email' && !EMAIL_RE.test(iEmail.trim().toLowerCase())) {
      toast.error('Email Google invalide'); return;
    }
    if (!iPhone.replace(/\D/g, '')) { toast.error('Numéro WhatsApp requis'); return; }
    if (!rAdmin && !rReleveur && !rClient && !rPromoteur) { toast.error('Choisissez au moins un rôle'); return; }
    if (rClient && iCompteurs.size === 0) { toast.error('Choisissez au moins un compteur pour un propriétaire'); return; }
    setBusy(true);
    try {
      const flags = { role_admin: rAdmin, role_releveur: rReleveur, role_client: rClient, role_promoteur: rPromoteur };
      const compteur_ids = rClient ? Array.from(iCompteurs) : [];
      const inv =
        channel === 'email'
          ? await createInvitation({
              email: iEmail.trim().toLowerCase(),
              nom: iNom.trim() || null,
              phone: iPhone.trim(),
              ...flags,
              compteur_ids,
              cible: invitationTargetPath(flags),
              invited_by: me,
            })
          : await createWhatsappInvitation({
              phone: iPhone.trim(),
              nom: iNom.trim() || null,
              ...flags,
              compteur_ids,
              expiresInDays: iExpiresDays,
              invited_by: me,
            });
      resetForm();
      await onCreated(inv);
      toast.success('Invitation créée');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-ahuvi-200 bg-ahuvi-50/50 p-4 shadow-soft space-y-3">
      <h2 className="font-semibold text-ahuvi-forest flex items-center gap-1.5">
        <UserPlus className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        Nouvelle invitation
      </h2>

      {/* Onglets canal : Email (adresse Google) / WhatsApp (lien jeton) */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setChannel('email')} className={eauSegmentTabClass(channel === 'email')}>
          <Mail className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> Email
        </button>
        <button type="button" onClick={() => setChannel('whatsapp')} className={eauSegmentTabClass(channel === 'whatsapp')}>
          <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> WhatsApp
        </button>
      </div>
      <p className="text-xs text-gray-500">
        {channel === 'email'
          ? '⚠️ La personne devra se connecter avec EXACTEMENT l’adresse Google saisie.'
          : 'Un lien d’invitation unique est créé ; la personne se connecte avec le compte Google de son choix.'}
      </p>

      <label className="text-sm block">
        <span className="block text-gray-600 mb-1">Nom</span>
        <input value={iNom} onChange={(e) => setINom(e.target.value)}
          className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
      </label>

      {channel === 'email' && (
        <label className="text-sm block">
          <span className="block text-gray-600 mb-1">Email Google *</span>
          <input type="email" inputMode="email" value={iEmail} onChange={(e) => setIEmail(e.target.value)}
            placeholder="prenom.nom@gmail.com"
            className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
        </label>
      )}

      <label className="text-sm block">
        <span className="block text-gray-600 mb-1">Numéro WhatsApp *</span>
        <input type="tel" inputMode="tel" value={iPhone} onChange={(e) => setIPhone(e.target.value)}
          placeholder="032 89 95 681"
          className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500" />
      </label>

      {channel === 'whatsapp' && (
        <label className="text-sm block">
          <span className="block text-gray-600 mb-1 flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4 text-ahuvi-olive" aria-hidden="true" /> Délai de validité du lien
          </span>
          <select
            value={iExpiresDays ?? ''}
            onChange={(e) => setIExpiresDays(e.target.value === '' ? null : Number(e.target.value))}
            className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="">Illimité</option>
          </select>
        </label>
      )}

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
            <span className="text-gray-700">Propriétaire</span>
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={rPromoteur} onChange={(e) => setRPromoteur(e.target.checked)}
              className="rounded border-gray-300 text-ahuvi-teal focus:ring-ahuvi-500" />
            <Eye className="w-4 h-4 text-ahuvi-teal" aria-hidden="true" />
            <span className="text-gray-700">Promoteur</span>
          </label>
        </div>
      </div>
      {rClient && (
        <div className="text-sm">
          <span className="block text-gray-600 mb-1">Compteurs visibles (propriétaire) *</span>
          {compteurs.length === 0 ? (
            <p className="text-xs text-gray-400">Aucun compteur. Créez-en d’abord.</p>
          ) : (
            <div className="max-h-44 overflow-y-auto border border-ahuvi-100 rounded-lg bg-white divide-y">
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
  );
}
