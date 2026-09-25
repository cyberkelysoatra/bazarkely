/**
 * Operator — one change request of a validated partner (phase 1B): current and new
 * values side by side (only what changes), current and new photos (short-lived signed
 * URLs), then Valider / Refuser (reason required). ONLINE ONLY.
 * Approval copies the fields into the partner profile (public QR page included) and
 * deletes the replaced photos; refusal deletes the unused new photos.
 *
 * SENSITIVE PERSONAL DATA: identity documents are displayed, never downloaded or cached.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ImageOff, Loader2, PencilLine, WifiOff, X } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { decideChange, getChange, operatorErrorMessage, type ChangeWithPartner } from '../../services/operatorService';
import { signedDocumentUrls } from '../../services/partnerService';
import type { NavyPartnerRow, PhotoSlot } from '../../types/partner';
import { KIND_LABELS, PHOTO_LABELS, PHOTO_SLOTS, SLOT_COLUMN, VEHICLE_LABELS } from '../../utils/partnerRules';
import { btnAccent, btnPrimary, btnSecondary, inputCls, labelCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle } from '../ui/NavyUi';

const FIELD_LABELS: Record<string, string> = {
  shop_name: 'Boutique',
  display_name: 'Nom',
  vehicle_type: 'Véhicule',
  vehicle_plate: 'Immatriculation',
  nif_holder_type: 'NIF détenu par',
  nif_holder_name: 'Nom du détenteur du NIF',
  nif: 'NIF',
  stat_number: 'Carte statistique',
};
const NIF_HOLDER_LABELS: Record<string, string> = { self: 'Le chauffeur', owner: 'Le propriétaire', cooperative: 'Une coopérative' };

function show(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (key === 'vehicle_type') return VEHICLE_LABELS[v as keyof typeof VEHICLE_LABELS] ?? String(v);
  if (key === 'nif_holder_type') return NIF_HOLDER_LABELS[String(v)] ?? String(v);
  return String(v);
}

function Photo({ url, label, path }: { url: string | undefined; label: string; path: string | null }) {
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Agrandir : ${label}`}>
      <img src={url} alt={label} className="w-full h-40 object-contain rounded-xl bg-navyay-charcoal/5" />
    </a>
  ) : (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-navyay-charcoal/5 text-sm text-navyay-charcoal/75">
      <ImageOff className="w-6 h-6" aria-hidden="true" />
      {path ? 'Chargement impossible' : 'Photo absente'}
    </div>
  );
}

export default function OperatorChangeDetailPage() {
  const { id = '' } = useParams();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const [item, setItem] = useState<ChangeWithPartner | null | undefined>(undefined);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const c = await getChange(id);
      setItem(c);
      if (c?.partner) {
        const p = c.partner;
        const paths = PHOTO_SLOTS[p.kind].flatMap((s) => [
          p[SLOT_COLUMN[s]] as string | null,
          ((c.changes as Record<string, unknown>)[SLOT_COLUMN[s] as string] as string | undefined) ?? null,
        ]);
        setUrls(await signedDocumentUrls(paths.filter(Boolean) as string[], 600));
      }
    } catch (err) {
      setError(operatorErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const decide = async (decision: 'approve' | 'reject') => {
    if (!item) return;
    if (decision === 'reject' && !reason.trim()) {
      setError('Indiquez le motif du refus.');
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      await decideChange(item.id, decision, decision === 'reject' ? reason.trim() : undefined);
      navigate('/navy/operatrice/demandes', { replace: true });
    } catch (err) {
      setError(operatorErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (!isOnline) {
    return (
      <NavyPage>
        <NavyNotice icon={WifiOff}>Cet écran demande une connexion. Réessayez au retour du réseau.</NavyNotice>
      </NavyPage>
    );
  }
  if (item === undefined && !error) return <NavyLoader />;

  const p: NavyPartnerRow | null = item?.partner ?? null;
  const changes = (item?.changes ?? {}) as Record<string, unknown>;
  const fieldKeys = Object.keys(FIELD_LABELS).filter((k) => k in changes);
  const photoSlots: PhotoSlot[] = p ? PHOTO_SLOTS[p.kind].filter((s) => (SLOT_COLUMN[s] as string) in changes) : [];

  return (
    <NavyPage>
      <Link to="/navy/operatrice/demandes" className="inline-flex items-center gap-1.5 pt-2 text-sm font-medium hover:underline">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Toutes les demandes
      </Link>
      {item === null && <NavyNotice tone="warn">Cette demande n’existe plus.</NavyNotice>}
      {error && <NavyNotice tone="error">{error}</NavyNotice>}

      {item && p && (
        <>
          <NavyPageTitle
            icon={PencilLine}
            title={(p.kind === 'epicier' ? p.shop_name : p.display_name) || 'Modification'}
            subtitle={`Modification ${KIND_LABELS[p.kind].toLowerCase()} · ${new Date(item.created_at).toLocaleString('fr-FR')}`}
          />
          {item.status !== 'pending' && (
            <NavyNotice tone={item.status === 'approved' ? 'ok' : 'warn'}>
              {item.status === 'approved' ? 'Déjà validée.' : `Déjà refusée : ${item.rejection_reason ?? ''}`}
            </NavyNotice>
          )}

          {fieldKeys.length > 0 && (
            <NavyCard className="p-4 space-y-3">
              <h3 className="font-semibold">Informations</h3>
              <ul className="space-y-2.5">
                {fieldKeys.map((k) => (
                  <li key={k} className="text-sm">
                    <p className="text-navyay-charcoal/75">{FIELD_LABELS[k]}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-navyay-charcoal/5 px-2 py-1 line-through decoration-navyay-charcoal/40">
                        {show(k, (p as unknown as Record<string, unknown>)[k])}
                      </span>
                      <ArrowRight className="w-4 h-4 flex-shrink-0" aria-label="devient" />
                      <span className={`rounded-lg bg-navyay-yellow/30 px-2 py-1 font-semibold ${k === 'vehicle_plate' ? 'font-mono' : ''}`}>
                        {show(k, changes[k])}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </NavyCard>
          )}

          {photoSlots.map((slot) => {
            const oldPath = p[SLOT_COLUMN[slot]] as string | null;
            const newPath = (changes[SLOT_COLUMN[slot] as string] as string | undefined) ?? null;
            return (
              <NavyCard key={slot} className="p-3 space-y-2">
                <h3 className="px-1 font-semibold">{PHOTO_LABELS[slot]}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <figure>
                    <Photo url={oldPath ? urls[oldPath] : undefined} label={`${PHOTO_LABELS[slot]} actuelle`} path={oldPath} />
                    <figcaption className="mt-1 px-1 text-xs text-navyay-charcoal/75">Actuelle</figcaption>
                  </figure>
                  <figure>
                    <Photo url={newPath ? urls[newPath] : undefined} label={`${PHOTO_LABELS[slot]} nouvelle`} path={newPath} />
                    <figcaption className="mt-1 px-1 text-xs font-semibold">Nouvelle</figcaption>
                  </figure>
                </div>
              </NavyCard>
            );
          })}

          {item.status === 'pending' && !rejecting && (
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" className={btnAccent} disabled={!!busy} onClick={() => void decide('approve')}>
                {busy === 'approve' ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Check className="w-5 h-5" aria-hidden="true" />}
                Valider la modification
              </button>
              <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => setRejecting(true)}>
                <X className="w-5 h-5" aria-hidden="true" />
                Refuser
              </button>
            </div>
          )}
          {item.status === 'pending' && rejecting && (
            <NavyCard className="p-4 space-y-3">
              <label className={labelCls}>
                Motif du refus
                <textarea className={inputCls} rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" className={btnPrimary} disabled={!!busy} onClick={() => void decide('reject')}>
                  {busy === 'reject' ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <X className="w-5 h-5" aria-hidden="true" />}
                  Confirmer le refus
                </button>
                <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => setRejecting(false)}>
                  Annuler
                </button>
              </div>
            </NavyCard>
          )}
        </>
      )}

      <NavyHelp title="Que vérifier ?">
        <p>À gauche la valeur actuelle, à droite la nouvelle. Vérifiez que les nouvelles photos sont lisibles et correspondent.</p>
        <p>Valider : le profil est mis à jour aussitôt, QR code public compris, et les anciennes photos remplacées sont supprimées.</p>
        <p>Refuser : le partenaire voit le motif ; son profil actuel reste inchangé et les nouvelles photos sont supprimées.</p>
      </NavyHelp>
    </NavyPage>
  );
}
