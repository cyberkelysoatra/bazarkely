/**
 * Route guard by NAVY role (phase 1A). Rejects ONLY on a confirmed state:
 * - partner roles: the partner rows are known from a server answer (now or cached
 *   from an earlier one) and none of this kind is approved → /navy;
 * - operator: the server said "not an operator" during this session → /navy.
 * Unknown state → loader (online) or a clear offline message; never a redirect.
 *
 * SECURITY NOTE: UI only. Other people's data are protected by RLS / the navy_* RPCs.
 */
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RefreshCw, WifiOff } from 'lucide-react';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import { useAppStore } from '../../../stores/appStore';
import { useNavyProfile } from '../services/navyProfileStore';
import type { NavyRole } from '../types/partner';
import { refreshNavyProfile } from '../services/partnerService';
import { btnSecondary, NavyLoader, NavyNotice, NavyPage } from './ui/NavyUi';

function Unresolved({ online }: { online: boolean }) {
  const userId = useAppStore((s) => s.user?.id);
  return (
    <NavyPage>
      <NavyNotice icon={WifiOff}>
        {online
          ? 'Votre profil NAVY ay n’a pas pu être vérifié. Vérifiez la connexion puis réessayez.'
          : 'Hors ligne : cet écran demande que votre profil soit déjà sur ce téléphone ou une connexion.'}
      </NavyNotice>
      {online && userId && (
        <button type="button" className={btnSecondary} onClick={() => void refreshNavyProfile(userId)}>
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Réessayer
        </button>
      )}
    </NavyPage>
  );
}

/** 'partenaire' = any approved partner profile (grocer or driver), e.g. for "Mon QR". */
export type NavyGuardRole = Exclude<NavyRole, 'client'> | 'partenaire';

export default function NavyRoleRoute({ role, children }: { role: NavyGuardRole; children: ReactNode }) {
  const userId = useAppStore((s) => s.user?.id);
  const p = useNavyProfile();
  const isOnline = useOnlineStatus();
  const mine = p.userId === userId;

  if (!mine || !p.loadedLocal) return <NavyLoader />;

  if (role === 'operatrice') {
    if (p.isOperator === true) return <>{children}</>;
    // Operator screens need the network anyway: offline = clear message.
    if (!isOnline) return <Unresolved online={false} />;
    if (p.serverChecked && p.isOperator === false) return <Navigate to="/navy" replace />;
    if (p.refreshing) return <NavyLoader />;
    return p.isOperator === false ? <Navigate to="/navy" replace /> : <Unresolved online />;
  }

  if (p.partners.some((x) => (role === 'partenaire' || x.kind === role) && x.status === 'approved')) return <>{children}</>;
  if (p.serverChecked) return <Navigate to="/navy" replace />;
  if (isOnline && p.refreshing) return <NavyLoader />;
  return p.partnersKnown ? <Navigate to="/navy" replace /> : <Unresolved online={isOnline} />;
}
