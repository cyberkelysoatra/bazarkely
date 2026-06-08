/**
 * Page vitrine PUBLIQUE /i/:token (Phase 2 — invitation vitrine WhatsApp par JETON).
 *
 * Affichée quand l'invité tape l'aperçu WhatsApp (`https://1sakely.org/i/<token>`).
 * Accessible SANS authentification (route déclarée hors garde d'auth dans App.tsx, au
 * même niveau que /gestion-eau/accueil). Elle :
 *  - capture le jeton de l'URL dans sessionStorage (`eau_pending_invitation_token`) ;
 *  - montre l'identité « Gestion Eau AHUVI » + des chiffres NON nominatifs (jauge %
 *    + tendance) via la RPC publique `eau_public_vitrine_stats()` (anon, withTimeout) ;
 *    dégrade proprement (slogan, aucun chiffre) si absent / hors-ligne / erreur ;
 *  - propose un bouton unique « Continuer avec Google » qui mémorise le jeton + un
 *    deep-link robuste au boot à froid (`/gestion-eau/accueil`, page publique sans
 *    garde de rôle → évite le rebond `/gestion-eau`→/dashboard) puis lance OAuth.
 *
 * Au retour de Google, l'octroi du rôle est fait par GestionEauContext (Phase 1 :
 * `claimPendingTokenInvitation`) et la redirection vers la cible du rôle est faite par
 * le contexte (post-claim). Si l'invité arrive DÉJÀ connecté, on relance la résolution
 * (`retryAccess`) pour enchaîner le claim immédiatement ; si aucun rôle n'est accordé
 * (jeton invalide/expiré/déjà utilisé) on affiche un message neutre, sans éjection.
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, withTimeout } from '../../../lib/supabase';
import authService from '../../../services/authService';
import { useAppStore } from '../../../stores/appStore';
import { useGestionEau } from '../context';
import { PENDING_TOKEN_KEY } from '../services/eauInvitationService';
import {
  Droplet,
  Gauge,
  BadgeCheck,
  WifiOff,
  LogIn,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';

/** Deep-link de retour OAuth : page publique robuste au boot à froid (pas de garde de rôle). */
const POST_LOGIN_ENTRY = '/gestion-eau/accueil';

interface VitrineStats {
  fill_pct: number | null;
  trend: number | null;
  as_of: string | null;
}

/** Formate une date ISO en JJ/MM/AAAA (locale FR), ou null si invalide. */
function formatDateFr(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const jj = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const aaaa = d.getFullYear();
  return `${jj}/${mm}/${aaaa}`;
}

export default function EauVitrinePage() {
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { userId, retryAccess, rolesConfirmed, hasEauAccess } = useGestionEau();

  const [stats, setStats] = useState<VitrineStats | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [claimAttempted, setClaimAttempted] = useState(false);

  // 1) Capture du jeton dès l'arrivée (avant même le clic) → couvre le cas « déjà connecté ».
  useEffect(() => {
    if (!token) return;
    try {
      sessionStorage.setItem(PENDING_TOKEN_KEY, token);
    } catch {
      /* sessionStorage indisponible : le clic CTA le re-tentera. */
    }
  }, [token]);

  // 2) Chiffres non nominatifs (anon). Dégradation propre : jamais d'erreur affichée.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          if (!cancelled) setStatsLoaded(true);
          return;
        }
        const { data, error } = (await withTimeout(
          (supabase.rpc as any)('eau_public_vitrine_stats'),
          6000,
          'eau:vitrine-stats'
        )) as any;
        if (cancelled) return;
        if (error || !data) {
          setStatsLoaded(true);
          return;
        }
        const row = Array.isArray(data) ? data[0] : data;
        const fill = row?.fill_pct;
        setStats({
          fill_pct: fill === null || fill === undefined ? null : Number(fill),
          trend: row?.trend === null || row?.trend === undefined ? null : Number(row.trend),
          as_of: row?.as_of ?? null,
        });
        setStatsLoaded(true);
      } catch {
        if (!cancelled) setStatsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 3) Cas « déjà connecté en arrivant » : enchaîne le claim immédiatement. Le contexte
  //    consomme le jeton (Phase 1) et, en cas de rôle accordé, redirige vers la cible
  //    (post-claim). Sinon, on affiche un message neutre (claimAttempted ci-dessous).
  useEffect(() => {
    if (!isAuthenticated || !userId || !token) return;
    let cancelled = false;
    (async () => {
      try {
        await retryAccess();
      } catch {
        /* best-effort */
      }
      if (!cancelled) setClaimAttempted(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId, token]);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      if (token) {
        try {
          sessionStorage.setItem(PENDING_TOKEN_KEY, token);
        } catch {
          /* ignore */
        }
      }
      // Deep-link robuste au boot à froid (page publique sans garde de rôle).
      try {
        sessionStorage.setItem('bazarkely_post_login_redirect', POST_LOGIN_ENTRY);
      } catch {
        /* ignore */
      }
      await authService.signInWithGoogle();
      // OAuth redirige hors de la page ; pas de reset de busy nécessaire.
    } catch {
      setBusy(false);
    }
  };

  // Message « invitation invalide / expirée » : uniquement après une tentative de claim
  // qui n'a accordé AUCUN rôle (session confirmée, sans accès). Pas d'éjection.
  const showInvalid = claimAttempted && rolesConfirmed && !hasEauAccess;

  const hasNumbers = stats && stats.fill_pct !== null && stats.fill_pct !== undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-ahuvi-50 to-white">
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">
        {/* En-tête léger (pas le header applicatif) */}
        <header className="text-center">
          <div className="flex justify-center mb-3">
            <span className="w-16 h-16 rounded-2xl bg-ahuvi-100 text-ahuvi-forest flex items-center justify-center">
              <Droplet className="w-8 h-8" aria-hidden="true" />
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion Eau AHUVI</h1>
          <p className="text-gray-600 mt-1.5 text-sm">Suivez l’eau de votre quartier, simplement.</p>
          <p className="text-ahuvi-forest mt-2 text-sm font-medium">
            Vous êtes invité(e) à rejoindre le suivi de l’eau.
          </p>
        </header>

        {/* Bloc chiffres (ou dégradation propre) */}
        <section className="rounded-2xl border border-ahuvi-100 bg-white p-5 shadow-soft text-center">
          {!statsLoaded ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : hasNumbers ? (
            <>
              <div className="text-5xl font-extrabold text-ahuvi-forest leading-none">
                {Math.round(stats!.fill_pct as number)} %
              </div>
              <p className="text-sm text-gray-600 mt-2">Niveau du bassin aujourd’hui</p>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium">
                {stats!.trend === 1 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <TrendingUp className="w-4 h-4" aria-hidden="true" /> en hausse
                  </span>
                ) : stats!.trend === -1 ? (
                  <span className="inline-flex items-center gap-1 text-rose-600">
                    <TrendingDown className="w-4 h-4" aria-hidden="true" /> en baisse
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <Minus className="w-4 h-4" aria-hidden="true" /> stable
                  </span>
                )}
              </div>
              {formatDateFr(stats!.as_of) && (
                <p className="text-xs text-gray-400 mt-2">Relevé du {formatDateFr(stats!.as_of)}</p>
              )}
            </>
          ) : (
            <p className="text-base font-semibold text-ahuvi-forest">
              Le suivi de l’eau, clair et toujours à jour.
            </p>
          )}
        </section>

        {/* Message neutre invitation invalide / expirée */}
        {showInvalid && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Cette invitation n’est plus valide ou a expiré. Contactez la personne qui vous a
              invité(e).
            </span>
          </div>
        )}

        {/* 3 bénéfices */}
        <section className="space-y-3">
          {[
            {
              icon: Gauge,
              titre: 'Suivez l’eau en temps réel',
              ligne: 'Niveau du bassin et consommation, toujours à jour.',
            },
            {
              icon: BadgeCheck,
              titre: '100 % gratuit',
              ligne: 'Aucun frais, aucune publicité.',
            },
            {
              icon: WifiOff,
              titre: 'Marche sans connexion',
              ligne: 'Consultez vos infos même sans internet.',
            },
          ].map(({ icon: Icon, titre, ligne }) => (
            <div
              key={titre}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-soft"
            >
              <span className="w-10 h-10 rounded-xl bg-ahuvi-100 text-ahuvi-forest flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{titre}</p>
                <p className="text-xs text-gray-500">{ligne}</p>
              </div>
            </div>
          ))}
        </section>

        {/* CTA unique */}
        <section>
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl shadow-soft text-base"
          >
            <LogIn className="w-5 h-5" aria-hidden="true" />
            {busy ? 'Connexion…' : 'Continuer avec Google'}
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            Utilisez le compte Google de votre choix.
          </p>
        </section>

        {/* Aide repliable */}
        <section className="rounded-xl border border-ahuvi-100 bg-white shadow-soft overflow-hidden">
          <button
            type="button"
            onClick={() => setHelpOpen((o) => !o)}
            aria-expanded={helpOpen}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ahuvi-forest"
          >
            <span className="inline-flex items-center gap-2">
              <Info className="w-4 h-4" aria-hidden="true" /> Comment ça marche ?
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          {helpOpen && (
            <div className="px-4 pb-4 space-y-3 text-sm text-gray-700">
              <div>
                <p className="font-semibold text-gray-800">C’est quoi ?</p>
                <p>
                  Une invitation à utiliser l’application de suivi de l’eau de votre quartier
                  (AHUVI).
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Que se passe-t-il si je continue ?</p>
                <p>
                  Vous vous connectez avec votre compte Google. Votre accès s’active tout seul.
                  C’est gratuit et l’application fonctionne même sans connexion.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
