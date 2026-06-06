/**
 * Écran de ré-authentification du module eau (Phase 1 — fondation identité).
 *
 * Affiché par <GestionEauRoute> UNIQUEMENT quand la session Supabase n'est pas
 * fiable pour ce module :
 *  - sessionStatus === 'needs-reauth' : aucune session lisible (déconnexion réelle,
 *    storage vidé, ou refresh token expiré). On propose une reconnexion Google.
 *  - sessionStatus === 'mismatch'    : la session Google appartient à un AUTRE compte
 *    que celui connecté au shell. On refuse (jamais de 2ᵉ identité) et on invite à se
 *    reconnecter avec le bon compte.
 *
 * Important : cet écran n'apparaît JAMAIS en routine. La session persiste entre les
 * ouvertures de l'app et les navigations (persistSession + autoRefreshToken) ; la
 * course au boot est absorbée par waitForEauSession. Il ne se montre qu'en l'absence
 * réelle de session valide.
 */
import { Droplet, ShieldAlert, LogIn } from 'lucide-react';
import { useGestionEau } from '../context/GestionEauContext';

export default function EauReauthScreen() {
  const { sessionStatus, reauth } = useGestionEau();
  const isMismatch = sessionStatus === 'mismatch';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-ahuvi-100 bg-white p-6 shadow-soft text-center space-y-4">
        <div className="flex justify-center">
          <span
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              isMismatch ? 'bg-amber-100 text-amber-700' : 'bg-ahuvi-100 text-ahuvi-forest'
            }`}
          >
            {isMismatch ? (
              <ShieldAlert className="w-8 h-8" aria-hidden="true" />
            ) : (
              <Droplet className="w-8 h-8" aria-hidden="true" />
            )}
          </span>
        </div>

        <h1 className="text-xl font-bold text-gray-900">
          {isMismatch ? 'Compte Google différent' : 'Reconnexion requise'}
        </h1>

        <p className="text-sm text-gray-600">
          {isMismatch ? (
            <>
              La session Google active n’est pas celle de votre compte BazarKELY.
              Pour la sécurité de l’espace eau, reconnectez-vous avec le{' '}
              <strong>même compte</strong> que celui de l’application.
            </>
          ) : (
            <>
              Pour la sécurité de l’espace eau, reconnectez-vous avec Google.
              Votre session sera ensuite conservée — vous n’aurez pas à recommencer
              à chaque ouverture.
            </>
          )}
        </p>

        <button
          onClick={reauth}
          className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 text-white font-semibold py-2.5 rounded-lg"
        >
          <LogIn className="w-4 h-4" aria-hidden="true" />
          Se reconnecter avec Google
        </button>
      </div>
    </div>
  );
}
