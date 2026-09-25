/**
 * "Demander une modification" block of "Mon épicerie" / "Mon véhicule" (phase 1B):
 * state of the last change request (pending, refused with its reason, approved) and
 * the button to ask for a new one. The current profile stays active meanwhile.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, PencilLine } from 'lucide-react';
import useOnlineStatus from '../../../../hooks/useOnlineStatus';
import { getMyLastChange } from '../../services/changeService';
import type { NavyPartnerChangeRow, NavyPartnerRow } from '../../types/partner';
import { btnSecondary, NavyCard, NavyNotice } from '../ui/NavyUi';

export default function PartnerChangeStatus({ userId, row }: { userId: string; row: NavyPartnerRow }) {
  const isOnline = useOnlineStatus();
  const [change, setChange] = useState<NavyPartnerChangeRow | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void getMyLastChange(userId, row.id).then((c) => {
      if (alive) setChange(c);
    });
    return () => {
      alive = false;
    };
  }, [userId, row.id, isOnline]);

  const pending = change?.status === 'pending';
  const what = row.kind === 'chauffeur' ? 'votre véhicule' : 'votre boutique';

  return (
    <NavyCard className="p-4 space-y-3">
      <h3 className="font-semibold">Modifier {what}</h3>
      {pending ? (
        <NavyNotice tone="warn" icon={Clock}>
          <strong>Modification en attente.</strong> Une opératrice la vérifie. En attendant, votre profil actuel reste actif
          {row.kind === 'chauffeur' ? ' (votre QR code montre encore l’ancienne plaque)' : ''}.
        </NavyNotice>
      ) : (
        <>
          {change?.status === 'rejected' && change.rejection_reason && (
            <NavyNotice tone="error">
              Dernière demande refusée : {change.rejection_reason}
            </NavyNotice>
          )}
          {change?.status === 'approved' && change.decided_at && (
            <NavyNotice tone="ok">Dernière modification validée le {new Date(change.decided_at).toLocaleDateString('fr-FR')}.</NavyNotice>
          )}
          <p className="text-sm text-navyay-charcoal/80">
            Nouveau véhicule, nouvelle plaque, nouveau nom ou nouveaux papiers : une opératrice valide le changement avant qu’il
            s’applique.
          </p>
          <Link to={`/navy/modifier/${row.kind}`} className={`${btnSecondary} w-full`} aria-disabled={change === undefined}>
            <PencilLine className="w-4 h-4" aria-hidden="true" />
            Demander une modification
          </Link>
        </>
      )}
    </NavyCard>
  );
}
