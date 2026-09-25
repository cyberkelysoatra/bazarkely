/**
 * State of a grocer / driver request (phase 1A): kept on the phone (waiting for the
 * network), pending, approved, refused (reason + correct and send again), suspended.
 * Readable offline (device copy).
 */
import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2, PencilLine, RefreshCw, Smartphone, Store, Truck } from 'lucide-react';
import { useAppStore } from '../../../../stores/appStore';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { useNavyRoles } from '../../context/useNavyRoles';
import { useNavyProfile } from '../../services/navyProfileStore';
import { flushNavyQueue, refreshNavyProfile } from '../../services/partnerService';
import type { PartnerKind } from '../../types/partner';
import { homePathForRole, KIND_LABELS, VEHICLE_LABELS } from '../../utils/partnerRules';
import {
  btnAccent,
  btnPrimary,
  btnSecondary,
  NavyCard,
  NavyHelp,
  NavyLoader,
  NavyNotice,
  NavyOfflineNotice,
  NavyPage,
  NavyPageTitle,
  StatusBadge,
} from '../ui/NavyUi';

export default function RequestStatusPage() {
  const { kind: kindParam } = useParams();
  const kind: PartnerKind | null = kindParam === 'epicier' || kindParam === 'chauffeur' ? kindParam : null;
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const isOnline = useOnlineStatus();
  const { setActiveRole } = useNavyRoles();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  if (!kind) return <Navigate to="/navy/devenir" replace />;
  const mine = profile.userId === userId;
  if (!mine || !profile.loadedLocal) return <NavyLoader />;

  const row = profile.partners.find((p) => p.kind === kind);
  const draft = profile.drafts.find((d) => d.kind === kind && d.state === 'queued');
  const Icon = kind === 'epicier' ? Store : Truck;

  const retry = async () => {
    if (!userId) return;
    setRetrying(true);
    try {
      await flushNavyQueue(userId);
      await refreshNavyProfile(userId);
    } finally {
      setRetrying(false);
    }
  };

  if (!row && !draft) {
    return <Navigate to={`/navy/devenir/${kind}`} replace />;
  }

  return (
    <NavyPage>
      <NavyPageTitle icon={Icon} title={`Ma demande ${KIND_LABELS[kind].toLowerCase()}`} />
      {!isOnline && <NavyOfflineNotice />}

      {draft && (
        <NavyCard className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <p className="flex-1 min-w-0 font-semibold">{row ? 'Correction gardée sur ce téléphone' : 'Demande gardée sur ce téléphone'}</p>
          </div>
          <p className="text-sm text-navyay-charcoal/80 leading-relaxed">
            {isOnline
              ? 'L’envoi n’a pas encore abouti. Il repart tout seul ; vous pouvez aussi réessayer maintenant.'
              : 'Elle partira toute seule dès que le réseau revient. Rien n’est perdu.'}
          </p>
          {draft.lastError && <p className="text-sm text-red-800">Dernier essai : l’envoi a été refusé. Vérifiez vos informations puis réessayez.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => void retry()} disabled={!isOnline || retrying} className={btnPrimary}>
              {retrying ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="w-4 h-4" aria-hidden="true" />}
              Réessayer maintenant
            </button>
            <Link to={`/navy/devenir/${kind}`} className={btnSecondary}>
              <PencilLine className="w-4 h-4" aria-hidden="true" />
              Modifier
            </Link>
          </div>
        </NavyCard>
      )}

      {row && (
        <NavyCard className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <p className="flex-1 min-w-0 font-semibold">État de la demande</p>
            <StatusBadge status={row.status} />
          </div>

          {row.status === 'pending' && (
            <p className="text-sm text-navyay-charcoal/80 leading-relaxed">
              Une opératrice vérifie votre dossier. Vous verrez la réponse ici.
            </p>
          )}
          {row.status === 'approved' && (
            <>
              <NavyNotice tone="ok">
                Bienvenue dans le réseau ! Choisissez « {KIND_LABELS[kind]} » dans « Je suis », en haut de l’écran.
              </NavyNotice>
              <button
                type="button"
                className={`${btnAccent} w-full`}
                onClick={() => {
                  setActiveRole(kind);
                  navigate(homePathForRole(kind));
                }}
              >
                {kind === 'epicier' ? 'Ouvrir mon épicerie' : 'Ouvrir mon véhicule'}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </>
          )}
          {row.status === 'rejected' && !draft && (
            <>
              <NavyNotice tone="error">
                <strong>Motif :</strong> {row.rejection_reason || 'non précisé'}
              </NavyNotice>
              <Link to={`/navy/devenir/${kind}`} className={`${btnPrimary} w-full`}>
                <PencilLine className="w-4 h-4" aria-hidden="true" />
                Corriger et renvoyer
              </Link>
            </>
          )}
          {row.status === 'suspended' && (
            <NavyNotice tone="warn">
              Votre compte partenaire est suspendu{row.rejection_reason ? ` : ${row.rejection_reason}` : '.'} Contactez CyberKELY.
            </NavyNotice>
          )}

          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-sm">
            {kind === 'epicier' && (
              <>
                <dt className="text-navyay-charcoal/70">Boutique</dt>
                <dd className="min-w-0 break-words font-medium">{row.shop_name || '—'}</dd>
              </>
            )}
            <dt className="text-navyay-charcoal/70">{kind === 'epicier' ? 'Gérant' : 'Nom'}</dt>
            <dd className="min-w-0 break-words font-medium">{row.display_name || '—'}</dd>
            <dt className="text-navyay-charcoal/70">Téléphone</dt>
            <dd className="min-w-0 break-words font-medium">{row.phone || '—'}</dd>
            {kind === 'chauffeur' && (
              <>
                <dt className="text-navyay-charcoal/70">Véhicule</dt>
                <dd className="min-w-0 break-words font-medium">
                  {row.vehicle_type ? VEHICLE_LABELS[row.vehicle_type] : '—'} {row.vehicle_plate ? `· ${row.vehicle_plate}` : ''}
                </dd>
              </>
            )}
            <dt className="text-navyay-charcoal/70">Envoyée le</dt>
            <dd className="font-medium">{new Date(row.created_at).toLocaleDateString('fr-FR')}</dd>
          </dl>
        </NavyCard>
      )}

      <NavyHelp title="Que veut dire chaque état ?">
        <p><strong>En attente</strong> : votre dossier est arrivé, une opératrice va le vérifier.</p>
        <p><strong>Validée</strong> : vous faites partie du réseau. Votre espace et votre QR code sont prêts.</p>
        <p><strong>Refusée</strong> : lisez le motif, corrigez, puis renvoyez. Le même dossier est réutilisé.</p>
        <p><strong>Gardée sur ce téléphone</strong> : pas encore arrivée, faute de réseau. Elle part toute seule.</p>
      </NavyHelp>
    </NavyPage>
  );
}
