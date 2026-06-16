/**
 * Import du répertoire → lot d'invitations WhatsApp (ÉVO 3), extrait de EauDemandesPage
 * v3.62.0. Regroupe : panneau « Importer du répertoire » (A), revue du lot importé (B) et
 * liens prêts à envoyer (C). Porte localement tout l'état du lot ; le parent recharge ses
 * listes via `onBatchCreated` et réinitialise sa confirmation/son formulaire via `onPickStart`.
 */
import { type ReactNode, useState } from 'react';
import toast from 'react-hot-toast';
import {
  BookUser, Info, Users, ClipboardList, ShieldCheck, CalendarClock, Trash2, Send, X,
  MessageCircle, Link as LinkIcon,
} from 'lucide-react';
import { EauIconButton, EauListIcon, eauSegmentTabClass } from '../EauUi';
import { createWhatsappInvitation } from '../../services/eauInvitationService';
import { mapImportedContacts, type ImportedContact, type RawWebContact } from '../../utils/contactImport';
import type { InvitationLocal } from '../../types/gestionEau';

/**
 * Détection robuste du Contact Picker API (répertoire téléphone) : Android Chrome en
 * contexte sécurisé (HTTPS), document top-level. Absent sur iOS et desktop → dégradation
 * propre (bouton désactivé + aide). Ne lève jamais.
 */
function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof (navigator as any).contacts?.select === 'function' &&
    typeof window !== 'undefined' &&
    'ContactsManager' in window
  );
}

export default function BatchImportPanel({
  me,
  isReadOnly,
  onBatchCreated,
  onPickStart,
  openWhatsappToken,
  copyLink,
  roleBadges,
}: {
  me: string | null;
  isReadOnly: boolean;
  onBatchCreated: () => void | Promise<void>;
  onPickStart: () => void;
  openWhatsappToken: (inv: InvitationLocal) => void;
  copyLink: (inv: InvitationLocal) => void;
  roleBadges: (inv: InvitationLocal) => ReactNode;
}) {
  // Contact Picker API : Android Chrome uniquement (contexte sécurisé, geste utilisateur).
  const contactsSupported = isContactPickerSupported();
  const [batch, setBatch] = useState<ImportedContact[] | null>(null); // lot en cours de revue (null = aucun)
  const [batchIgnored, setBatchIgnored] = useState(0);
  const [batchRole, setBatchRole] = useState<'admin' | 'releveur'>('releveur');
  const [batchExpiresDays, setBatchExpiresDays] = useState<number | null>(30);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchCreated, setBatchCreated] = useState<InvitationLocal[] | null>(null); // liens prêts
  const [importHelpOpen, setImportHelpOpen] = useState(false);

  /** Ouvre le sélecteur de contacts du téléphone (geste utilisateur requis), mappe et ouvre la revue du lot. */
  const openContactPicker = async () => {
    if (isReadOnly) return; // garde lecture seule (promoteur)
    try {
      const nav = navigator as any;
      const props = ['name', 'tel'];
      // `email` n'est pas garanti partout → ne l'ajouter que s'il est proposé.
      const avail: string[] = (await nav.contacts?.getProperties?.()) ?? [];
      if (avail.includes('email')) props.push('email');
      const selected = (await nav.contacts.select(props, { multiple: true })) as RawWebContact[];
      const { contacts, ignored } = mapImportedContacts(selected);
      if (contacts.length === 0) {
        toast.error(ignored > 0 ? `${ignored} contact(s) sans numéro — rien à inviter` : 'Aucun contact sélectionné');
        return;
      }
      setBatch(contacts);
      setBatchIgnored(ignored);
      setBatchCreated(null);
      onPickStart();
    } catch {
      // Annulation utilisateur ou refus de l'API : silencieux, jamais bloquant.
    }
  };

  const updateBatchRow = (i: number, patch: Partial<ImportedContact>) =>
    setBatch((prev) => (prev ? prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) : prev));

  const removeBatchRow = (i: number) =>
    setBatch((prev) => (prev ? prev.filter((_, idx) => idx !== i) : prev));

  const cancelBatch = () => { setBatch(null); setBatchIgnored(0); };

  /** Crée toutes les invitations valides du lot (séquentiel, idempotent), puis prépare les liens. */
  const createBatch = async () => {
    if (isReadOnly) return; // garde lecture seule (promoteur)
    if (!batch) return;
    const valid = batch.filter((c) => c.phone.replace(/\D/g, '')); // numéro requis
    if (valid.length === 0) { toast.error('Aucune ligne valide (numéro WhatsApp requis)'); return; }
    setBatchBusy(true);
    try {
      const created: InvitationLocal[] = [];
      for (const c of valid) {
        const inv = await createWhatsappInvitation({
          phone: c.phone,
          nom: c.nom.trim() || null,
          role_admin: batchRole === 'admin',
          role_releveur: batchRole === 'releveur',
          role_client: false,
          compteur_ids: [],
          expiresInDays: batchExpiresDays,
          invited_by: me,
        });
        created.push(inv);
      }
      setBatchCreated(created);
      setBatch(null);
      setBatchIgnored(0);
      await onBatchCreated();
      toast.success(`${created.length} invitation(s) créée(s)`);
    } finally {
      setBatchBusy(false);
    }
  };

  return (
    <>
      {/* Import du répertoire → lot d'invitations WhatsApp (ÉVO 3) — masqué en lecture seule (promoteur) */}
      {!isReadOnly && (
      <div className="rounded-xl border border-ahuvi-200 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold text-ahuvi-forest flex items-center gap-1.5">
            <BookUser className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            Importer du répertoire
          </h2>
          <button
            type="button"
            onClick={() => setImportHelpOpen((v) => !v)}
            aria-expanded={importHelpOpen}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-ahuvi-forest"
          >
            <Info className="w-4 h-4" aria-hidden="true" /> Aide
          </button>
        </div>
        {importHelpOpen && (
          <p className="text-xs text-gray-600 mt-2 bg-ahuvi-50/60 rounded-lg p-2.5">
            Choisissez des contacts dans le répertoire de votre téléphone : leur nom et leur
            numéro WhatsApp sont remplis tout seuls. Vous donnez un rôle et un délai communs,
            puis vous envoyez chaque invitation par WhatsApp.
          </p>
        )}
        <div className="mt-3">
          <EauIconButton
            icon={BookUser}
            variant="secondary"
            onClick={openContactPicker}
            disabled={!contactsSupported}
            title={contactsSupported ? undefined : 'Disponible sur Android (Chrome).'}
          >
            Importer du répertoire
          </EauIconButton>
          {!contactsSupported && (
            <p className="text-xs text-gray-400 mt-1.5">Disponible sur Android (Chrome).</p>
          )}
        </div>
      </div>
      )}

      {/* Revue du lot importé (avant création) */}
      {batch && (
        <div className="rounded-xl border border-ahuvi-300 bg-ahuvi-50/50 p-4 shadow-soft space-y-3">
          <h2 className="font-semibold text-ahuvi-forest flex items-center gap-1.5">
            <Users className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            Lot d’invitations ({batch.length})
          </h2>
          {batchIgnored > 0 && (
            <p className="text-xs text-amber-700">
              {batchIgnored} contact(s) sans numéro ignoré(s).
            </p>
          )}

          {/* Rôle commun (un seul) — pas de client dans un lot (compteurs propres). */}
          <div className="text-sm">
            <span className="block text-gray-600 mb-1">Rôle commun</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setBatchRole('releveur')} className={eauSegmentTabClass(batchRole === 'releveur')}>
                <ClipboardList className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> Releveur
              </button>
              <button type="button" onClick={() => setBatchRole('admin')} className={eauSegmentTabClass(batchRole === 'admin')}>
                <ShieldCheck className="w-4 h-4 flex-shrink-0" aria-hidden="true" /> Administrateur
              </button>
            </div>
          </div>

          {/* Délai commun */}
          <label className="text-sm block">
            <span className="block text-gray-600 mb-1 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-ahuvi-olive" aria-hidden="true" /> Délai de validité commun
            </span>
            <select
              value={batchExpiresDays ?? ''}
              onChange={(e) => setBatchExpiresDays(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
            >
              <option value="7">7 jours</option>
              <option value="30">30 jours</option>
              <option value="90">90 jours</option>
              <option value="">Illimité</option>
            </select>
          </label>

          {/* Lignes éditables */}
          <div className="space-y-2">
            {batch.map((c, i) => (
              <div key={c._id} className="bg-white border border-ahuvi-100 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={c.nom}
                    onChange={(e) => updateBatchRow(i, { nom: e.target.value })}
                    placeholder="Nom"
                    className="flex-1 min-w-0 rounded-lg border-gray-300 text-sm focus:border-ahuvi-500 focus:ring-ahuvi-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeBatchRow(i)}
                    aria-label="Retirer ce contact"
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
                <input
                  type="tel"
                  inputMode="tel"
                  value={c.phone}
                  onChange={(e) => updateBatchRow(i, { phone: e.target.value })}
                  placeholder="Numéro WhatsApp"
                  className="w-full rounded-lg border-gray-300 text-sm focus:border-ahuvi-500 focus:ring-ahuvi-500"
                />
                {c.email && <div className="text-xs text-gray-400 truncate">{c.email}</div>}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <EauIconButton icon={Send} variant="primary" onClick={createBatch} disabled={batchBusy} className="flex-1 py-2.5">
              {batchBusy ? 'Création…' : `Créer les invitations (${batch.length})`}
            </EauIconButton>
            <EauIconButton icon={X} variant="secondary" onClick={cancelBatch} disabled={batchBusy}>
              Annuler
            </EauIconButton>
          </div>
        </div>
      )}

      {/* Liens prêts à envoyer (après création du lot) */}
      {batchCreated && batchCreated.length > 0 && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm text-emerald-800 font-medium flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              Liens prêts à envoyer ({batchCreated.length})
            </h2>
            <button
              type="button"
              onClick={() => setBatchCreated(null)}
              aria-label="Masquer les liens prêts"
              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-emerald-700">
            WhatsApp s’ouvre un contact à la fois : touchez « Envoyer » pour chacun.
          </p>
          <div className="space-y-2">
            {batchCreated.map((inv) => (
              <div key={inv.id} className="bg-white border border-emerald-200 rounded-lg p-2.5">
                <div className="flex items-start gap-2">
                  <EauListIcon icon={inv.role_admin ? ShieldCheck : ClipboardList} tone={inv.role_admin ? 'gold' : 'olive'} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">{inv.nom || inv.phone}</div>
                    <div className="text-xs text-gray-500 truncate">{inv.phone}</div>
                    {roleBadges(inv)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-sm">
                  <button onClick={() => openWhatsappToken(inv)}
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium">
                    <Send className="w-4 h-4" aria-hidden="true" /> Envoyer sur WhatsApp
                  </button>
                  <button onClick={() => copyLink(inv)}
                    className="inline-flex items-center gap-1 text-gray-500 hover:underline">
                    <LinkIcon className="w-4 h-4" aria-hidden="true" /> Copier le lien
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
