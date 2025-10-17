import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import authService from '../services/authService';
import { supabase } from '../lib/supabase';
import type { User } from '../types';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, Phone } from 'lucide-react';
import { usePracticeTracking } from '../hooks/usePracticeTracking';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const { setUser, setAuthenticated } = useAppStore();
  const navigate = useNavigate();
  const { trackDailyLogin } = usePracticeTracking();

  // Vérifier la connexion automatique au chargement de la page
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        // Vérifier si l'utilisateur a été déconnecté explicitement
        const wasLoggedOut = sessionStorage.getItem('bazarkely-logged-out');
        if (wasLoggedOut) {
          console.log('ℹ️ Utilisateur déconnecté explicitement, pas de restauration automatique');
          sessionStorage.removeItem('bazarkely-logged-out');
          return;
        }

        const storedUser = localStorage.getItem('bazarkely-user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          console.log('🔄 Vérification de session existante pour:', userData.username);
          
          // Essayer de synchroniser avec le serveur
          // Architecture simplifiée - utilisation directe des données locales
          setUser(userData);
          setAuthenticated(true);
          console.log('✅ Session restaurée');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification de session:', error);
      }
    };

    checkExistingSession();
  }, [setUser, setAuthenticated]);

  // Gérer le callback OAuth et les changements d'état d'authentification
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // PRIORITY 1: Check sessionStorage for pre-captured tokens
      const savedTokens = sessionStorage.getItem('bazarkely-oauth-tokens');
      const hash = window.location.hash;
      const search = window.location.search;
      
      console.log('🔍 OAuth Detection - Saved tokens:', !!savedTokens);
      console.log('🔍 OAuth Detection - Hash:', hash);
      console.log('🔍 OAuth Detection - Search:', search);
      
      let accessToken: string | null = null;
      let refreshToken: string | null = null;
      let tokenType: string | null = null;
      let expiresIn: string | null = null;
      
      if (savedTokens) {
        // Use pre-captured tokens from sessionStorage
        console.log('✅ Using pre-captured tokens from sessionStorage...');
        try {
          const tokenData = JSON.parse(savedTokens);
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token;
          tokenType = tokenData.token_type;
          expiresIn = tokenData.expires_in;
          
          console.log('🔍 Pre-captured access_token (first 20 chars):', accessToken?.substring(0, 20) + '...');
          console.log('🔍 Pre-captured refresh_token (first 20 chars):', refreshToken?.substring(0, 20) + '...');
          
          // Clear saved tokens after use
          sessionStorage.removeItem('bazarkely-oauth-tokens');
          console.log('🧹 Pre-captured tokens cleared from sessionStorage');
        } catch (error) {
          console.error('❌ Error parsing saved tokens:', error);
          sessionStorage.removeItem('bazarkely-oauth-tokens');
        }
      } else if (hash && hash.includes('access_token')) {
        // Fallback: Extract from hash (if not cleared by Service Worker)
        console.log('✅ Hash fragments detected, extracting tokens...');
        try {
          const hashParams = new URLSearchParams(hash.substring(1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
          tokenType = hashParams.get('token_type') || 'bearer';
          expiresIn = hashParams.get('expires_in');
          
          console.log('🔍 Raw access_token (first 20 chars):', accessToken?.substring(0, 20) + '...');
          console.log('🔍 Raw refresh_token (first 20 chars):', refreshToken?.substring(0, 20) + '...');
        } catch (error) {
          console.error('❌ Error parsing hash tokens:', error);
        }
      }
      
      if (accessToken && refreshToken) {
        console.log('✅ Tokens available, setting session...');
        setIsLoading(true);
        setError(null);
        
        try {
          // Set session with extracted tokens
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('❌ Error setting session:', error);
            setError(`Erreur de session: ${error.message}`);
            setIsLoading(false);
            return;
          }
          
          if (data.session) {
            console.log('✅ Session established:', data.session.user.id);
            
            // Use authService to handle the OAuth callback properly
            const result = await authService.handleOAuthCallback();
            
            if (result.success && result.user) {
              console.log('✅ User profile created/retrieved:', result.user.username);
              
              // Set user state and wait for state update
              localStorage.setItem('bazarkely-user', JSON.stringify(result.user));
              setUser(result.user);
              setAuthenticated(true);
              trackDailyLogin();
              
              // Clear hash if still present
              if (hash) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
              
              // Small delay to ensure state is updated before navigation
              setTimeout(() => {
                navigate('/dashboard');
              }, 100);
            } else {
              console.error('❌ Error handling OAuth callback:', result.error);
              setError(`Erreur de profil: ${result.error}`);
            }
          } else {
            console.error('❌ No session established after setSession');
            setError('Aucune session établie');
          }
        } catch (error) {
          console.error('❌ Error processing OAuth callback:', error);
          setError(`Erreur de traitement OAuth: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('ℹ️ No OAuth tokens found in sessionStorage or hash');
      }
    };

    handleOAuthCallback();
  }, [navigate, setUser, setAuthenticated]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Gestionnaire pour la connexion Google
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.signInWithGoogle();
      
      if (result.success) {
        // La redirection se fait automatiquement avec OAuth
        console.log('✅ Redirection vers Google en cours...');
      } else {
        setError(result.error || 'Erreur lors de la connexion Google');
      }
    } catch (error) {
      console.error('Erreur de connexion Google:', error);
      setError('Erreur inattendue lors de la connexion Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Mode connexion
        if (!formData.username || !formData.password) {
          setError('Veuillez remplir tous les champs');
          return;
        }

        const result = await authService.login(formData.username, formData.password);
        
        if (result.success && result.user) {
          // Connexion réussie
          localStorage.setItem('bazarkely-user', JSON.stringify(result.user));
          setUser(result.user);
          setAuthenticated(true);
          trackDailyLogin();
        } else {
          // Erreur de connexion
          setError(result.error || 'Erreur de connexion');
          
          // Si l'utilisateur a besoin de réinitialiser son mot de passe
          if (result.error === 'Veuillez réinitialiser votre mot de passe') {
            setShowPasswordReset(true);
          }
        }
      } else {
        // Mode inscription
        if (!formData.username || !formData.email || !formData.phone || !formData.password) {
          setError('Veuillez remplir tous les champs');
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Les mots de passe ne correspondent pas');
          return;
        }

        const result = await authService.register(
          formData.username,
          formData.email,
          formData.phone,
          formData.password
        );
        
        if (result.success && result.user) {
          // Inscription réussie
          localStorage.setItem('bazarkely-user', JSON.stringify(result.user));
          setUser(result.user);
          setAuthenticated(true);
          trackDailyLogin();
        } else {
          // Erreur d'inscription
          setError(result.error || 'Erreur d\'inscription');
        }
      }
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      setError('Erreur inattendue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction de réinitialisation de mot de passe
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!formData.username || !formData.password) {
        setError('Veuillez remplir tous les champs');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Les mots de passe ne correspondent pas');
        return;
      }

      const result = await authService.resetPassword(formData.username, formData.password);
      
      if (result.success) {
        // Réinitialisation réussie, basculer vers le mode connexion
        setShowPasswordReset(false);
        setIsLogin(true);
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        setError(null);
        console.log('✅ Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.');
      } else {
        setError(result.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('Erreur de réinitialisation:', error);
      setError('Erreur inattendue. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour annuler la réinitialisation
  const handleCancelReset = () => {
    setShowPasswordReset(false);
    setError(null);
    setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full">
        {/* Logo et titre */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">B</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">BazarKELY</h1>
          <p className="text-gray-600">Gestion budget familial - Madagascar</p>
        </div>

        {/* Formulaire */}
        <div className="card-glass">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isLoading && window.location.hash.includes('access_token')
                ? 'Connexion en cours...'
                : showPasswordReset 
                  ? 'Réinitialiser le mot de passe' 
                  : isLogin 
                    ? 'Connexion' 
                    : 'Inscription'
              }
            </h2>
            <p className="text-gray-600">
              {isLoading && window.location.hash.includes('access_token')
                ? 'Traitement de votre connexion Google...'
                : showPasswordReset
                  ? 'Définissez un nouveau mot de passe pour votre compte'
                  : isLogin 
                    ? 'Connectez-vous à votre compte' 
                    : 'Créez votre compte pour commencer'
              }
            </p>
          </div>

          {/* Affichage des erreurs */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {typeof error === 'string' ? error : error.message || JSON.stringify(error)}
            </div>
          )}

          {/* Loading indicator for OAuth */}
          {isLoading && window.location.hash.includes('access_token') && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Connexion Google en cours...</span>
              </div>
            </div>
          )}

          <form onSubmit={showPasswordReset ? handlePasswordReset : handleSubmit} className="space-y-4">
            {/* Nom d'utilisateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="Votre nom d'utilisateur"
                  required
                />
              </div>
            </div>

            {/* Email (inscription uniquement) */}
            {!isLogin && !showPasswordReset && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>
            )}

            {/* Téléphone (inscription uniquement) */}
            {!isLogin && !showPasswordReset && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="+261 34 00 000 00"
                    required
                  />
                </div>
              </div>
            )}

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-field pl-10 pr-10"
                  placeholder="Votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmation mot de passe (inscription et réinitialisation) */}
            {(!isLogin || showPasswordReset) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="Confirmez votre mot de passe"
                    required
                  />
                </div>
              </div>
            )}

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading 
                ? 'Chargement...' 
                : showPasswordReset 
                  ? 'Réinitialiser le mot de passe'
                  : isLogin 
                    ? 'Se connecter' 
                    : 'S\'inscrire'
              }
            </button>
          </form>

          {/* Séparateur */}
          {!showPasswordReset && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>
          )}

          {/* Bouton Google OAuth */}
          {!showPasswordReset && (
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </button>
          )}

          {/* Boutons d'action pour la réinitialisation */}
          {showPasswordReset && (
            <div className="mt-4 text-center">
              <button
                onClick={handleCancelReset}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                Annuler
              </button>
            </div>
          )}

          {/* Lien de basculement (pas en mode réinitialisation) */}
          {!showPasswordReset && (
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                {isLogin ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
              </p>
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
                }}
                className="text-primary-600 hover:text-primary-700 font-medium mt-1"
              >
                {isLogin ? 'Créer un compte' : 'Se connecter'}
              </button>
            </div>
          )}
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>En continuant, vous acceptez nos conditions d'utilisation</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
