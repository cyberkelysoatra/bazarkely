// /validation/connexion: e-mail fallback of the sign-in (D5, VC-01): sign in, « Créer mon compte »,
// « Mot de passe oublié » (back here with a reset link, then a new password).
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { connexionEmail, creerCompte, lireRetourConnexion, motDePasseOublie, nouveauMotDePasse, retourMotDePasse } from '../appels/session';
import { useEspace } from '../EspaceContexte';
import EnTete from '../composants/EnTete';
import { BarreRetour, CARTE, Corps, PRIMAIRE, useCouleurTheme } from '../composants/Mise';
import { retourSur } from '../utils/regles';

type Mode = 'connexion' | 'creer' | 'oubli' | 'nouveau';

const CHAMP = 'h-[46px] border border-[#94a3b8] rounded-[10px] px-3 text-[15px] w-full bg-white';

function messageErreur(e: unknown): string {
  const m = e instanceof Error ? e.message : '';
  if (/invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.';
  if (/email not confirmed/i.test(m)) return 'Vérifiez votre boîte e-mail pour confirmer votre compte, puis revenez sur ce lien.';
  if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec cet e-mail : connectez-vous.';
  if (/password/i.test(m) && /(6|characters|short)/i.test(m)) return 'Le mot de passe doit faire au moins 6 caractères.';
  if (m === 'timeout' || /fetch|network/i.test(m)) return 'Le réseau ne répond pas. Réessayez.';
  return "L'opération n'a pas abouti. Réessayez.";
}

export default function Connexion() {
  useCouleurTheme('#0369a1');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const retour = retourSur(params.get('retour'));
  const { session } = useEspace();
  const [mode, setMode] = useState<Mode>(() => (retourMotDePasse() ? 'nouveau' : 'connexion'));
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    void lireRetourConnexion();
  }, []);

  // Already signed in (and not choosing a new password): straight back.
  useEffect(() => {
    if (session && mode !== 'nouveau') navigate(retour, { replace: true });
  }, [session, mode, retour, navigate]);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setEnvoi(true);
    try {
      if (mode === 'connexion') {
        await connexionEmail(email, motDePasse);
      } else if (mode === 'creer') {
        const ouverte = await creerCompte(email, motDePasse, `/validation${retour === '/' ? '/' : retour}`);
        if (!ouverte) setMessage({ texte: 'Vérifiez votre boîte e-mail pour confirmer votre compte, puis revenez sur ce lien.', erreur: false });
      } else if (mode === 'oubli') {
        await motDePasseOublie(email);
        setMessage({ texte: 'Un e-mail vous a été envoyé : touchez son lien pour choisir un nouveau mot de passe.', erreur: false });
      } else {
        await nouveauMotDePasse(motDePasse);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setMessage({ texte: messageErreur(err), erreur: true });
    } finally {
      setEnvoi(false);
    }
  };

  const titre = { connexion: 'Connexion par e-mail', creer: 'Créer mon compte', oubli: 'Mot de passe oublié', nouveau: 'Nouveau mot de passe' }[mode];
  const bouton = { connexion: 'Me connecter', creer: 'Créer mon compte', oubli: 'Recevoir le lien', nouveau: 'Enregistrer le mot de passe' }[mode];

  return (
    <>
      <EnTete variante="neutre" />
      <Corps>
        <BarreRetour vers={retour} />
        <form className={CARTE} onSubmit={soumettre} noValidate data-connexion={mode}>
          <h1 className="text-[20px] font-bold m-0">{titre}</h1>
          {mode !== 'nouveau' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="vc-email" className="text-[14px] font-semibold">
                E-mail
              </label>
              <input id="vc-email" type="email" autoComplete="email" className={CHAMP} value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          )}
          {mode !== 'oubli' && (
            <div className="flex flex-col gap-1">
              <label htmlFor="vc-mdp" className="text-[14px] font-semibold">
                Mot de passe
              </label>
              <input
                id="vc-mdp"
                type="password"
                autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
                className={CHAMP}
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
              />
            </div>
          )}
          {message && (
            <p className={`text-[14px] m-0 ${message.erreur ? 'text-danger' : 'text-nuit'}`} role={message.erreur ? 'alert' : 'status'} data-message="">
              {message.texte}
            </p>
          )}
          <button type="submit" className={PRIMAIRE} disabled={envoi}>
            {bouton}
          </button>
          {mode === 'connexion' && (
            <div className="flex flex-col items-center">
              <button type="button" className="text-[14px] text-ciel min-h-11" onClick={() => setMode('creer')} data-creer="">
                Créer mon compte
              </button>
              <button type="button" className="text-[14px] text-ciel min-h-11" onClick={() => setMode('oubli')} data-oubli="">
                Mot de passe oublié
              </button>
            </div>
          )}
          {(mode === 'creer' || mode === 'oubli') && (
            <button type="button" className="text-[14px] text-ciel min-h-11" onClick={() => setMode('connexion')}>
              J'ai déjà un compte : me connecter
            </button>
          )}
        </form>
      </Corps>
    </>
  );
}
