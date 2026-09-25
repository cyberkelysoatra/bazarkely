/**
 * NAVY ay skin of the sign-in screen (public entry page 1sakely.org/navy).
 * PURELY visual: receives AuthPage's own Google handler and state — no auth logic
 * here, the OAuth flow described in CLAUDE.md is untouched.
 */
import { NavyWordmark } from './NavyLogo';

interface NavyAuthSkinProps {
  onGoogleSignIn: () => void;
  isLoading: boolean;
  error: string | null;
  oauthInProgress: boolean;
}

/** True when the sign-in screen should wear the NAVY ay skin. */
export function isNavyAuthContext(): boolean {
  if (typeof window === 'undefined') return false;
  const isNavyPath = (p: string | null) => !!p && (p.startsWith('/navy') || p.startsWith('/ouvrir/navy'));
  if (isNavyPath(window.location.pathname)) return true;
  // Back from Google (on /auth or /): the stored post-login address tells where we came from.
  if (window.location.pathname !== '/auth' && window.location.pathname !== '/') return false;
  try {
    return isNavyPath(sessionStorage.getItem('bazarkely_post_login_redirect'));
  } catch {
    return false;
  }
}

export default function NavyAuthSkin({ onGoogleSignIn, isLoading, error, oauthInProgress }: NavyAuthSkinProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-navyay-charcoal selection:bg-navyay-yellow selection:text-navyay-charcoal">
      <div className="h-1.5 bg-navyay-yellow" aria-hidden="true" />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="flex justify-center">
            <NavyWordmark className="h-16 sm:h-20 w-auto max-w-full" />
          </div>

          <h1 className="mt-8 text-center text-2xl font-bold leading-tight text-balance">
            Envoyer un petit colis à Nosy Be
          </h1>
          <p className="mt-2 text-center text-base text-navyay-charcoal/80 leading-relaxed text-pretty">
            Déposé et retiré dans une épicerie près de chez vous.
          </p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          {oauthInProgress ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm" role="status">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-navyay-charcoal" />
              Connexion en cours…
            </div>
          ) : (
            <button
              onClick={onGoogleSignIn}
              disabled={isLoading}
              className="mt-8 w-full flex items-center justify-center gap-3 rounded-xl bg-navyay-charcoal px-4 py-3.5 text-base font-semibold text-white shadow-md hover:bg-navyay-charcoal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navyay-yellow disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white">
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </span>
              Continuer avec Google
            </button>
          )}

          <p className="mt-4 text-center text-xs text-navyay-charcoal/75">
            Un compte Google suffit pour commencer.
          </p>
        </div>
      </main>
    </div>
  );
}
