/** Page mission PUBLIQUE /gestion-eau/accueil :
 *  - présente l'app
 *  - propose l'installation PWA (Android/Chrome via beforeinstallprompt ; iOS = instructions)
 *  - « J'ai un code » → Google + saisie du code → liaison du compte client
 *  - « Demander un accès » → Google → crée une demande en_attente
 *
 *  Montée AU NIVEAU App.tsx (hors garde d'auth) pour rester accessible sans connexion.
 *  L'enrôlement effectif est traité au retour de Google par GestionEauProvider
 *  (eauEnrollmentService), quel que soit l'écran d'atterrissage.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../../../services/authService';
import { useAppStore } from '../../../stores/appStore';
import {
  setPendingEnrollment,
  processPendingEnrollment,
} from '../services/eauEnrollmentService';
import { isStandalone, isIOS, type BeforeInstallPromptEvent } from '../utils/pwa';
import { normalizeCode } from '../utils/codes';
import { Droplet, Smartphone, KeyRound, Inbox, ArrowRight } from 'lucide-react';
import EauAide from './EauAide';
import { AIDE } from './eauAideTextes';

export default function EauAccueilPage() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [busy, setBusy] = useState(false);

  // PWA install
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed] = useState(isStandalone());
  const ios = isIOS();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const doInstall = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === 'accepted') toast.success('Installation lancée');
    setInstallEvt(null);
  };

  // « J'ai un code »
  const submitCode = async () => {
    const c = normalizeCode(code);
    if (!c) {
      toast.error('Saisissez votre code d’enrôlement');
      return;
    }
    setBusy(true);
    try {
      if (isAuthenticated && user?.id) {
        // Déjà connecté → traite immédiatement.
        setPendingEnrollment({ intent: 'code', code: c });
        const res = await processPendingEnrollment(user.id, user.email ?? null);
        if (res.kind === 'code-ok') {
          toast.success('Accès activé ✅');
          navigate('/gestion-eau/client');
        } else if (res.kind === 'code-deja-utilise') {
          toast.error('Ce code est déjà rattaché à un autre compte.');
        } else {
          toast.error('Code invalide.');
        }
      } else {
        // Pas connecté → mémorise l'intention puis connexion Google (redirection).
        setPendingEnrollment({ intent: 'code', code: c });
        await authService.signInWithGoogle();
      }
    } finally {
      setBusy(false);
    }
  };

  // « Demander un accès »
  const submitDemande = async () => {
    setBusy(true);
    try {
      if (isAuthenticated && user?.id) {
        setPendingEnrollment({ intent: 'demande', nom: nom.trim() || null });
        await processPendingEnrollment(user.id, user.email ?? null);
        toast.success('Demande envoyée. Un administrateur va la traiter.');
        navigate('/gestion-eau');
      } else {
        setPendingEnrollment({ intent: 'demande', nom: nom.trim() || null });
        await authService.signInWithGoogle();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-ahuvi-50 to-white">
      <div className="max-w-md mx-auto px-4 py-10 space-y-6">
        {/* En-tête mission */}
        <header className="text-center">
          <div className="flex justify-center mb-2">
            <span className="w-16 h-16 rounded-2xl bg-ahuvi-100 text-ahuvi-forest flex items-center justify-center">
              <Droplet className="w-8 h-8" aria-hidden="true" />
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de l’eau — copropriété</h1>
          <p className="text-gray-600 mt-2 text-sm">
            Suivez votre consommation d’eau et recevez vos factures directement sur votre téléphone.
            Une application gratuite, simple, qui fonctionne même sans connexion.
          </p>
        </header>

        <EauAide id={AIDE.accueil.id} quoi={AIDE.accueil.quoi} comment={AIDE.accueil.comment} />

        {/* Mission / valeurs */}
        <section className="rounded-xl border border-ahuvi-100 bg-white p-4 shadow-soft text-sm text-gray-700 space-y-2">
          <p>✅ Consultez vos relevés et votre consommation</p>
          <p>✅ Téléchargez vos factures (PDF) à tout moment</p>
          <p>✅ Transparence sur la distribution de l’eau du bassin</p>
        </section>

        {/* Installation PWA */}
        {!installed && (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-800 mb-1">
              <Smartphone className="w-5 h-5" aria-hidden="true" /> Installer l’application
            </div>
            {installEvt ? (
              <button
                onClick={doInstall}
                className="mt-1 w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg"
              >
                <Smartphone className="w-4 h-4" aria-hidden="true" /> Ajouter à l’écran d’accueil
              </button>
            ) : ios ? (
              <p className="text-emerald-700">
                Sur iPhone/iPad : appuyez sur <strong>Partager</strong> (carré avec flèche) puis
                <strong> « Sur l’écran d’accueil »</strong>.
              </p>
            ) : (
              <p className="text-emerald-700">
                Ouvrez le menu de votre navigateur (⋮) puis <strong>« Ajouter à l’écran d’accueil »</strong> /
                <strong> « Installer l’application »</strong>.
              </p>
            )}
          </section>
        )}

        {/* J'ai un code */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
          <h2 className="flex items-center gap-1.5 font-semibold text-gray-800 mb-2">
            <KeyRound className="w-5 h-5 text-ahuvi-forest" aria-hidden="true" /> J’ai un code d’enrôlement
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Votre administrateur vous a donné un code ? Connectez-vous avec Google et saisissez-le.
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ex : K7QM4P"
            className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500 uppercase tracking-widest text-center font-semibold"
          />
          <button
            onClick={submitCode}
            disabled={busy}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 bg-ahuvi-forest hover:bg-ahuvi-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg"
          >
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            {isAuthenticated ? 'Activer mon accès' : 'Continuer avec Google'}
          </button>
        </section>

        {/* Demander un accès */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-soft">
          <h2 className="flex items-center gap-1.5 font-semibold text-gray-800 mb-2">
            <Inbox className="w-5 h-5 text-ahuvi-forest" aria-hidden="true" /> Je n’ai pas de code
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Demandez un accès : un administrateur validera votre compte et vous attribuera vos compteurs.
          </p>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Votre nom (optionnel)"
            className="w-full rounded-lg border-gray-300 focus:border-ahuvi-500 focus:ring-ahuvi-500"
          />
          <button
            onClick={submitDemande}
            disabled={busy}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 bg-white border border-ahuvi-200 text-ahuvi-forest hover:bg-ahuvi-50 disabled:opacity-50 font-semibold py-2.5 rounded-lg"
          >
            <Inbox className="w-4 h-4" aria-hidden="true" />
            {isAuthenticated ? 'Envoyer ma demande' : 'Demander un accès (Google)'}
          </button>
        </section>

        {isAuthenticated && (
          <div className="text-center">
            <button onClick={() => navigate('/gestion-eau')} className="inline-flex items-center gap-1 text-ahuvi-forest text-sm underline">
              Accéder au module <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
