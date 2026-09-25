/**
 * Operator — one request (phase 1A): every field and the photos (short-lived signed
 * URLs of the private bucket), then Valider / Refuser (reason required, from a short
 * list or typed). ONLINE ONLY.
 *
 * SENSITIVE PERSONAL DATA: identity documents are displayed, never downloaded or cached.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ImageOff, Loader2, Store, Truck, WifiOff, X } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { decidePartner, getPartner, operatorErrorMessage } from '../../services/operatorService';
import { signedDocumentUrls } from '../../services/partnerService';
import type { NavyPartnerRow } from '../../types/partner';
import { KIND_LABELS, PHOTO_LABELS, PHOTO_SLOTS, SLOT_COLUMN, VEHICLE_LABELS } from '../../utils/partnerRules';
import { btnAccent, btnPrimary, btnSecondary, inputCls, labelCls, NavyCard, NavyHelp, NavyLoader, NavyNotice, NavyPage, NavyPageTitle, StatusBadge } from '../ui/NavyUi';

export const REJECTION_REASONS = [
  'Photo illisible ou floue',
  'Pièce manquante ou ne correspondant pas',
  'Informations incomplètes ou incorrectes',
  'NIF ou carte statistique invalide',
];
const OTHER = '__other__';

const NIF_HOLDER_LABELS = { self: 'Le chauffeur', owner: 'Le propriétaire', cooperative: 'Une coopérative' } as const;

export default function OperatorRequestDetailPage() {
  const { id = '' } = useParams();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const [row, setRow] = useState<NavyPartnerRow | null | undefined>(undefined);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reasonChoice, setReasonChoice] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await getPartner(id);
      setRow(r);
      if (r) {
        const paths = PHOTO_SLOTS[r.kind].map((s) => r[SLOT_COLUMN[s]] as string | null).filter(Boolean) as string[];
        setUrls(await signedDocumentUrls(paths, 600));
      }
    } catch (err) {
      setError(operatorErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    if (isOnline) void load();
  }, [isOnline, load]);

  const decide = async (decision: 'approve' | 'reject') => {
    if (!row) return;
    const reason = decision === 'reject' ? (reasonChoice === OTHER ? reasonText.trim() : reasonChoice) : undefined;
    if (decision === 'reject' && !reason) {
      setError('Choisissez ou écrivez un motif de refus.');
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      await decidePartner(row.id, decision, reason);
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
  if (row === undefined && !error) return <NavyLoader />;

  return (
    <NavyPage>
      <Link to="/navy/operatrice/demandes" className="inline-flex items-center gap-1.5 pt-2 text-sm font-medium hover:underline">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Toutes les demandes
      </Link>

      {row === null && <NavyNotice tone="warn">Cette demande n’existe plus.</NavyNotice>}
      {error && <NavyNotice tone="error">{error}</NavyNotice>}

      {row && (
        <>
          <NavyPageTitle
            icon={row.kind === 'epicier' ? Store : Truck}
            title={(row.kind === 'epicier' ? row.shop_name : row.display_name) || 'Demande'}
            subtitle={`Demande ${KIND_LABELS[row.kind].toLowerCase()} · ${new Date(row.created_at).toLocaleString('fr-FR')}`}
          />
          <div>
            <StatusBadge status={row.status} />
          </div>

          <NavyCard className="p-4">
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-2 text-sm">
              {row.kind === 'epicier' && (
                <>
                  <dt className="text-navyay-charcoal/70">Boutique</dt>
                  <dd className="min-w-0 break-words font-medium">{row.shop_name || '—'}</dd>
                  <dt className="text-navyay-charcoal/70">Gérant</dt>
                  <dd className="min-w-0 break-words font-medium">{row.display_name || '—'}</dd>
                  <dt className="text-navyay-charcoal/70">Carte stat.</dt>
                  <dd className="min-w-0 break-words font-medium">{row.stat_number || '—'}</dd>
                </>
              )}
              {row.kind === 'chauffeur' && (
                <>
                  <dt className="text-navyay-charcoal/70">Nom</dt>
                  <dd className="min-w-0 break-words font-medium">{row.display_name || '—'}</dd>
                  <dt className="text-navyay-charcoal/70">Véhicule</dt>
                  <dd className="min-w-0 break-words font-medium">{row.vehicle_type ? VEHICLE_LABELS[row.vehicle_type] : '—'}</dd>
                  <dt className="text-navyay-charcoal/70">Immatriculation</dt>
                  <dd className="min-w-0 break-words font-mono font-bold">{row.vehicle_plate || '—'}</dd>
                  <dt className="text-navyay-charcoal/70">NIF détenu par</dt>
                  <dd className="min-w-0 break-words font-medium">
                    {row.nif_holder_type ? NIF_HOLDER_LABELS[row.nif_holder_type] : '—'}
                    {row.nif_holder_name ? ` : ${row.nif_holder_name}` : ''}
                  </dd>
                </>
              )}
              <dt className="text-navyay-charcoal/70">Téléphone</dt>
              <dd className="min-w-0 break-words font-medium">
                {row.phone ? <a className="underline" href={`tel:${row.phone.replace(/\s/g, '')}`}>{row.phone}</a> : '—'}
              </dd>
              <dt className="text-navyay-charcoal/70">NIF</dt>
              <dd className="min-w-0 break-words font-medium">{row.nif || '—'}</dd>
            </dl>
          </NavyCard>

          <section className="grid gap-3 sm:grid-cols-2" aria-label="Photos du dossier">
            {PHOTO_SLOTS[row.kind].map((slot) => {
              const path = row[SLOT_COLUMN[slot]] as string | null;
              const url = path ? urls[path] : null;
              return (
                <figure key={slot} className="rounded-2xl border border-navyay-charcoal/10 bg-white p-2">
                  {url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Agrandir : ${PHOTO_LABELS[slot]}`}>
                      <img src={url} alt={PHOTO_LABELS[slot]} className="w-full h-48 object-contain rounded-xl bg-navyay-charcoal/5" />
                    </a>
                  ) : (
                    <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl bg-navyay-charcoal/5 text-sm text-navyay-charcoal/70">
                      <ImageOff className="w-6 h-6" aria-hidden="true" />
                      {path ? 'Chargement impossible' : 'Photo absente'}
                    </div>
                  )}
                  <figcaption className="mt-1.5 px-1 text-sm font-medium">{PHOTO_LABELS[slot]}</figcaption>
                </figure>
              );
            })}
          </section>

          {row.status === 'pending' && !rejecting && (
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" className={btnAccent} disabled={!!busy} onClick={() => void decide('approve')}>
                {busy === 'approve' ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Check className="w-5 h-5" aria-hidden="true" />}
                Valider
              </button>
              <button type="button" className={btnSecondary} disabled={!!busy} onClick={() => setRejecting(true)}>
                <X className="w-5 h-5" aria-hidden="true" />
                Refuser
              </button>
            </div>
          )}

          {row.status === 'pending' && rejecting && (
            <NavyCard className="p-4 space-y-3">
              <fieldset>
                <legend className="font-semibold">Motif du refus</legend>
                <div className="mt-2 space-y-1.5">
                  {[...REJECTION_REASONS, OTHER].map((r) => (
                    <label key={r} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-navyay-yellow/10 cursor-pointer">
                      <input
                        type="radio"
                        name="reason"
                        value={r}
                        checked={reasonChoice === r}
                        onChange={() => setReasonChoice(r)}
                        className="accent-navyay-charcoal w-4 h-4"
                      />
                      <span className="text-sm">{r === OTHER ? 'Autre motif (à écrire)' : r}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {reasonChoice === OTHER && (
                <label className={labelCls}>
                  Motif
                  <textarea className={inputCls} rows={3} value={reasonText} onChange={(e) => setReasonText(e.target.value)} maxLength={300} />
                </label>
              )}
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
        <p>Les photos doivent être lisibles, et les noms, NIF et numéros doivent correspondre à ce qui est saisi.</p>
        <p>Touchez une photo pour l’agrandir. Le lien d’affichage expire au bout de quelques minutes : rouvrez la demande si besoin.</p>
        <p>Un refus n’est pas définitif : la personne voit le motif, corrige et renvoie son dossier.</p>
      </NavyHelp>
    </NavyPage>
  );
}
