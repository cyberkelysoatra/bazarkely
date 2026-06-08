/**
 * Page vitrine PUBLIQUE /i/:token (Phase 2 — invitation vitrine WhatsApp par JETON).
 *
 * Affichée quand l'invité tape l'aperçu WhatsApp (`https://1sakely.org/i/<token>`).
 * Accessible SANS authentification (route déclarée hors garde d'auth dans App.tsx, au
 * même niveau que /gestion-eau/accueil).
 *
 * DEUX VISAGES selon l'état public du jeton (`getInvitationTokenState`, ÉVO 1) — ÉVO 2 :
 *  - `valid` → écran d'INSCRIPTION inchangé (en-tête AHUVI, chiffres non nominatifs,
 *    3 bénéfices, bouton « Continuer avec Google » qui mémorise le jeton + un deep-link
 *    robuste au boot à froid puis lance OAuth ; l'octroi du rôle est fait au retour par
 *    GestionEauContext via `claimPendingTokenInvitation`).
 *  - `used` / `expired` / `revoked` / `unknown` → page VITRINE MARKETING (le lien a déjà
 *    servi à une inscription, ou n'est plus valable) : on ne propose plus l'inscription
 *    par jeton ; on présente le domaine AHUVI / Itampolo Resort (textes + photos), des
 *    astuces, puis une fiche de demande d'accès qui s'envoie via une connexion Google
 *    (enrôlement `intent: 'demande'` enrichi en ÉVO 1, traité au retour par
 *    `processPendingEnrollment` → `createDemande`). Le jeton mort N'EST PAS réclamé.
 *
 * Hors-ligne / erreur → `getInvitationTokenState` renvoie `'unknown'` (ÉVO 1) → page
 * marketing (jamais une inscription trompeuse sur un lien peut-être mort).
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase, withTimeout } from '../../../lib/supabase';
import authService from '../../../services/authService';
import { useAppStore } from '../../../stores/appStore';
import { useGestionEau } from '../context';
import {
  PENDING_TOKEN_KEY,
  getInvitationTokenState,
  type InviteTokenState,
} from '../services/eauInvitationService';
import { setPendingEnrollment } from '../services/eauEnrollmentService';
import type { LucideIcon } from './EauUi';
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
  Lightbulb,
  Smartphone,
  BellRing,
  UserPlus,
  Flag,
  Sun,
  Anchor,
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

/**
 * Photo du domaine (page marketing). Dégrade proprement si le fichier est absent : sur
 * `onError`, l'`<img>` est masquée et le bloc garde un fond dégradé AHUVI + l'icône lucide.
 */
function VitrinePhoto({
  src,
  caption,
  icon: Icon,
}: {
  src: string;
  caption: string;
  icon: LucideIcon;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="rounded-2xl overflow-hidden border border-ahuvi-100 bg-white shadow-soft">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-ahuvi-100 to-ahuvi-50 flex items-center justify-center">
        {/* Couche de base : icône TOUJOURS présente — visible tant que la photo n'a pas
            recouvert le bloc (absente, en attente, ou onError). En prod, un chemin de photo
            absent renvoie le fallback SPA (200/HTML) qui ne déclenche pas toujours onError :
            l'icône en fond garantit une dégradation propre dans tous les cas. */}
        <Icon className="w-12 h-12 text-ahuvi-forest/40" aria-hidden="true" />
        {!failed && (
          <img
            src={src}
            alt={caption}
            loading="lazy"
            onError={() => setFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>
      <figcaption className="px-4 py-2.5 text-xs text-gray-500 text-center">{caption}</figcaption>
    </figure>
  );
}

export default function EauVitrinePage() {
  const { token } = useParams<{ token: string }>();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { userId, retryAccess, rolesConfirmed, hasEauAccess } = useGestionEau();

  // État public du jeton (ÉVO 1) : null = en cours de résolution → écran de chargement.
  const [tokenState, setTokenState] = useState<InviteTokenState | null>(null);

  const [stats, setStats] = useState<VitrineStats | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [claimAttempted, setClaimAttempted] = useState(false);

  // Fiche de demande d'accès (page marketing).
  const [nom, setNom] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fonction, setFonction] = useState('');
  const [message, setMessage] = useState('');

  // 0) Résolution de l'état du jeton (ÉVO 1). Hors-ligne/erreur → 'unknown' (→ marketing).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = token ? await getInvitationTokenState(token) : 'unknown';
      if (!cancelled) setTokenState(s);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // 1) Capture du jeton dès l'arrivée (avant même le clic) → couvre le cas « déjà connecté »
  //    du chemin VALID. Pour un lien mort, le submit marketing retire ce jeton avant OAuth.
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
  //    Un jeton mort (used/expired/...) n'accorde rien → comportement neutre conservé.
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

  /** Chemin VALID : mémorise le jeton + deep-link puis lance OAuth (octroi par jeton au retour). */
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

  /**
   * Page MARKETING : enregistre la fiche comme intention d'enrôlement (intent `demande`,
   * traitée au retour de Google par `processPendingEnrollment` → `createDemande` enrichie),
   * puis lance OAuth. IMPORTANT : on RETIRE le jeton mort (`PENDING_TOKEN_KEY`) avant le
   * login pour ne JAMAIS tenter un claim sur un lien déjà utilisé/expiré.
   */
  const handleRequestAccess = async () => {
    if (!nom.trim() || !phone.trim() || !fonction) {
      toast.error('Renseignez au moins votre nom, votre WhatsApp et votre fonction.');
      return;
    }
    setBusy(true);
    try {
      setPendingEnrollment({
        intent: 'demande',
        nom: nom.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        fonction,
        message: message.trim() || null,
      });
      try {
        sessionStorage.setItem('bazarkely_post_login_redirect', POST_LOGIN_ENTRY);
      } catch {
        /* ignore */
      }
      // Lien mort : surtout PAS de claim de jeton → on ne crée qu'une demande d'accès.
      try {
        sessionStorage.removeItem(PENDING_TOKEN_KEY);
      } catch {
        /* ignore */
      }
      await authService.signInWithGoogle();
      // OAuth redirige hors de la page ; pas de reset de busy nécessaire.
    } catch {
      setBusy(false);
    }
  };

  // ── Écran de chargement tant que l'état du jeton n'est pas résolu ───────────────
  if (tokenState === null) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ahuvi-50 to-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement…</p>
      </div>
    );
  }

  // ════════════════════════════ BRANCHE MARKETING ════════════════════════════════
  // Lien déjà utilisé / expiré / révoqué / inconnu → vitrine de présentation + fiche.
  if (tokenState !== 'valid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-ahuvi-50 to-white">
        <div className="max-w-md mx-auto px-4 py-8 space-y-6">
          {/* En-tête léger */}
          <header className="text-center">
            <div className="flex justify-center mb-3">
              <span className="w-14 h-14 rounded-2xl bg-ahuvi-100 text-ahuvi-forest flex items-center justify-center">
                <Droplet className="w-7 h-7" aria-hidden="true" />
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Gestion Eau AHUVI</h1>
          </header>

          {/* Bandeau « lien déjà utilisé » (ton doux) */}
          <div className="rounded-xl border border-ahuvi-200 bg-ahuvi-50 p-3 text-sm text-ahuvi-forest flex items-start gap-2">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Ce lien d’invitation a déjà été utilisé. Découvrez le domaine ci-dessous, ou demandez
              votre accès.
            </span>
          </div>

          {/* Hero */}
          <section className="text-center space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-ahuvi-olive">
              Itampolo Resort · Nosy Be
            </p>
            <h2 className="text-2xl font-bold text-gray-900 leading-snug">
              Votre investissement prend de la valeur.
            </h2>
            <p className="text-gray-600 text-sm">
              Et l’eau qui fait vivre le domaine est suivie avec le même soin.
            </p>
          </section>

          {/* Photo 1 — golf */}
          <VitrinePhoto
            src="/gestion-eau/vitrine/ahuvi-golf-practice.jpg"
            caption="Le parcours de golf prend forme."
            icon={Flag}
          />

          {/* Bloc « Un domaine pensé pour durer » */}
          <section className="rounded-2xl border border-ahuvi-100 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-gray-900 mb-2">Un domaine pensé pour durer</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Au cœur d’Itampolo Resort, à Nosy Be, chaque ouvrage avance avec soin : le golf, la
              centrale solaire, le ponton, les Résidences. Un domaine pensé pour durer, respecter son
              île et révéler la valeur de votre bien. Cette application de suivi de l’eau en est une
              expression discrète : bien gérer l’eau, c’est protéger votre investissement et le
              confort de chacun. Merci pour votre confiance.
            </p>
          </section>

          {/* Photo 2 — solaire */}
          <VitrinePhoto
            src="/gestion-eau/vitrine/ahuvi-solaire.jpg"
            caption="La centrale solaire est en service."
            icon={Sun}
          />

          {/* Bloc « Une eau suivie, un domaine serein » */}
          <section className="rounded-2xl border border-ahuvi-100 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-gray-900 mb-2">Une eau suivie, un domaine serein</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              L’application affiche le niveau du bassin, la consommation et les alertes en temps réel
              — pour les propriétaires, les locataires et les équipes du domaine. Gratuite, sans
              publicité, elle fonctionne même sans connexion. Un outil simple, au service de la
              qualité de vie à Itampolo.
            </p>
          </section>

          {/* Astuces d'utilisation */}
          <section className="rounded-2xl border border-ahuvi-100 bg-white p-5 shadow-soft">
            <h3 className="font-semibold text-gray-900 mb-3 inline-flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-ahuvi-gold" aria-hidden="true" />
              Astuces d’utilisation
            </h3>
            <ul className="space-y-3">
              {[
                {
                  icon: Smartphone,
                  texte:
                    'Installez l’application sur votre écran d’accueil (Android) : un accès en un geste.',
                },
                {
                  icon: Gauge,
                  texte: 'Jetez un œil au niveau du bassin avant les fortes chaleurs.',
                },
                {
                  icon: BellRing,
                  texte: 'Activez les alertes pour être prévenu d’une baisse ou d’une fuite.',
                },
                {
                  icon: WifiOff,
                  texte: 'Tout reste lisible hors connexion : vos infos vous suivent partout.',
                },
              ].map(({ icon: Icon, texte }) => (
                <li key={texte} className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-ahuvi-100 text-ahuvi-forest flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-gray-600 pt-1.5">{texte}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Photo 3 — ponton */}
          <VitrinePhoto
            src="/gestion-eau/vitrine/ahuvi-ponton.jpg"
            caption="Le ponton, porte d’entrée du domaine."
            icon={Anchor}
          />

          {/* Fiche de demande d'accès */}
          <section className="rounded-2xl border border-ahuvi-100 bg-white p-5 shadow-soft space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 inline-flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-ahuvi-forest" aria-hidden="true" />
                Demander un accès
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Laissez-nous vos coordonnées : un administrateur reviendra vers vous.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="vit-nom" className="block text-xs font-medium text-gray-600 mb-1">
                  Nom complet
                </label>
                <input
                  id="vit-nom"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Votre nom complet"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ahuvi-300 focus:border-ahuvi-300"
                />
              </div>

              <div>
                <label htmlFor="vit-phone" className="block text-xs font-medium text-gray-600 mb-1">
                  Numéro WhatsApp
                </label>
                <input
                  id="vit-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="032 00 000 00"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ahuvi-300 focus:border-ahuvi-300"
                />
              </div>

              <div>
                <label htmlFor="vit-email" className="block text-xs font-medium text-gray-600 mb-1">
                  Email
                </label>
                <input
                  id="vit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prénom.nom@gmail.com (optionnel)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ahuvi-300 focus:border-ahuvi-300"
                />
              </div>

              <div>
                <label
                  htmlFor="vit-fonction"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Fonction
                </label>
                <select
                  id="vit-fonction"
                  value={fonction}
                  onChange={(e) => setFonction(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ahuvi-300 focus:border-ahuvi-300"
                >
                  <option value="">Choisir…</option>
                  <option value="releveur">Releveur</option>
                  <option value="proprietaire">Propriétaire</option>
                  <option value="investisseur">Investisseur</option>
                  <option value="locataire">Locataire</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="vit-message"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Message
                </label>
                <textarea
                  id="vit-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="Votre villa / lodge, ou un mot pour nous (optionnel)"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ahuvi-300 focus:border-ahuvi-300 resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleRequestAccess}
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl shadow-soft text-base"
            >
              <LogIn className="w-5 h-5" aria-hidden="true" />
              {busy ? 'Connexion…' : 'Continuer avec Google'}
            </button>
            <p className="text-center text-xs text-gray-500">
              Une connexion Google rapide pour enregistrer votre demande.
            </p>
          </section>

          {/* Aide repliable (contexte marketing) */}
          <section className="rounded-xl border border-ahuvi-100 bg-white shadow-soft overflow-hidden">
            <button
              type="button"
              onClick={() => setHelpOpen((o) => !o)}
              aria-expanded={helpOpen}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ahuvi-forest"
            >
              <span className="inline-flex items-center gap-2">
                <Info className="w-4 h-4" aria-hidden="true" /> Comment obtenir un accès ?
              </span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${helpOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            {helpOpen && (
              <div className="px-4 pb-4 space-y-3 text-sm text-gray-700">
                <div>
                  <p className="font-semibold text-gray-800">Pourquoi ce lien ne marche plus ?</p>
                  <p>
                    Chaque lien d’invitation ne sert qu’une seule fois, pour une seule inscription.
                    Le vôtre a déjà été utilisé.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Comment rejoindre l’application ?</p>
                  <p>
                    Remplissez la fiche ci-dessus puis connectez-vous avec Google. Un administrateur
                    validera votre accès. C’est gratuit.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // ════════════════════════════ BRANCHE VALID (inchangée) ═════════════════════════
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
