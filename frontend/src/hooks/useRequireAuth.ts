/**
 * Hook pour gérer l'authentification Supabase avec vérification de session
 * Résout les race conditions où les pages chargent des données avant que la session soit prête
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Type de retour du hook useRequireAuth
 */
interface UseRequireAuthReturn {
  /** Session Supabase actuelle (null si non authentifié) */
  session: Session | null;
  /** Utilisateur Supabase actuel (null si non authentifié) */
  user: User | null;
  /** Indique si la vérification de la session est en cours */
  isLoading: boolean;
  /** Indique si l'utilisateur est authentifié (basé sur la session Supabase réelle) */
  isAuthenticated: boolean;
}

/**
 * Hook personnalisé pour gérer l'authentification Supabase
 * 
 * Ce hook :
 * - Vérifie la session Supabase réelle (pas seulement localStorage)
 * - Fournit un état de chargement pendant la vérification
 * - Redirige automatiquement vers /auth si non authentifié
 * - Écoute les changements d'état d'authentification (SIGNED_IN, SIGNED_OUT)
 * - Nettoie les subscriptions au démontage
 * 
 * @example
 * ```tsx
 * const { session, user, isLoading, isAuthenticated } = useRequireAuth();
 * 
 * if (isLoading) {
 *   return <LoadingSpinner />;
 * }
 * 
 * if (!isAuthenticated) {
 *   // Redirection automatique vers /auth
 *   return null;
 * }
 * 
 * // Utiliser session ou user pour les appels API
 * ```
 * 
 * @returns {UseRequireAuthReturn} État d'authentification et session
 */
export const useRequireAuth = (): UseRequireAuthReturn => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Référence pour éviter les redirections multiples
  const hasRedirectedRef = useRef(false);
  // Référence pour la subscription
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  /**
   * Vérifie la session initiale et configure l'écoute des changements
   */
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        console.log('🔐 [useRequireAuth] Vérification de la session Supabase...');
        
        // Vérifier la session initiale
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ [useRequireAuth] Erreur lors de la vérification de la session:', sessionError);
          
          if (isMounted) {
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            
            // Rediriger seulement si pas déjà redirigé
            if (!hasRedirectedRef.current) {
              console.log('🔄 [useRequireAuth] Redirection vers /auth (erreur de session)');
              hasRedirectedRef.current = true;
              navigate('/auth', { replace: true });
            }
          }
          return;
        }

        if (isMounted) {
          if (initialSession) {
            console.log('✅ [useRequireAuth] Session trouvée pour utilisateur:', initialSession.user.email);
            setSession(initialSession);
            setUser(initialSession.user);
            setIsAuthenticated(true);
            hasRedirectedRef.current = false; // Reset pour permettre les futures redirections
          } else {
            console.log('⚠️ [useRequireAuth] Aucune session trouvée');
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
            
            // Rediriger seulement si pas déjà redirigé
            if (!hasRedirectedRef.current) {
              console.log('🔄 [useRequireAuth] Redirection vers /auth (pas de session)');
              hasRedirectedRef.current = true;
              navigate('/auth', { replace: true });
            }
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('❌ [useRequireAuth] Erreur inattendue lors de la vérification de la session:', error);
        
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          
          // Rediriger en cas d'erreur réseau ou autre
          if (!hasRedirectedRef.current) {
            console.log('🔄 [useRequireAuth] Redirection vers /auth (erreur inattendue)');
            hasRedirectedRef.current = true;
            navigate('/auth', { replace: true });
          }
        }
      }
    };

    // Vérifier la session initiale
    checkSession();

    // Écouter les changements d'état d'authentification
    console.log('👂 [useRequireAuth] Configuration de l\'écoute des changements d\'authentification...');
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [useRequireAuth] Événement d\'authentification:', event);
      
      if (!isMounted) return;

      switch (event) {
        case 'SIGNED_IN':
          if (session) {
            console.log('✅ [useRequireAuth] Utilisateur connecté:', session.user.email);
            setSession(session);
            setUser(session.user);
            setIsAuthenticated(true);
            hasRedirectedRef.current = false; // Reset pour permettre les futures redirections
          }
          setIsLoading(false);
          break;

        case 'SIGNED_OUT':
          console.log('👋 [useRequireAuth] Utilisateur déconnecté');
          setSession(null);
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
          
          // Rediriger vers /auth
          if (!hasRedirectedRef.current) {
            console.log('🔄 [useRequireAuth] Redirection vers /auth (déconnexion)');
            hasRedirectedRef.current = true;
            navigate('/auth', { replace: true });
          }
          break;

        case 'TOKEN_REFRESHED':
          if (session) {
            console.log('🔄 [useRequireAuth] Token rafraîchi');
            setSession(session);
            setUser(session.user);
            setIsAuthenticated(true);
          }
          break;

        case 'USER_UPDATED':
          if (session) {
            console.log('👤 [useRequireAuth] Utilisateur mis à jour');
            setSession(session);
            setUser(session.user);
            setIsAuthenticated(true);
          }
          break;

        case 'PASSWORD_RECOVERY':
          console.log('🔑 [useRequireAuth] Récupération de mot de passe en cours');
          // Ne pas changer l'état d'authentification pour cet événement
          break;

        default:
          console.log('ℹ️ [useRequireAuth] Événement non géré:', event);
          // Pour les autres événements, mettre à jour la session si disponible
          if (session) {
            setSession(session);
            setUser(session.user);
            setIsAuthenticated(true);
          } else {
            setSession(null);
            setUser(null);
            setIsAuthenticated(false);
          }
          setIsLoading(false);
      }
    });

    subscriptionRef.current = subscription;

    // Cleanup function
    return () => {
      console.log('🧹 [useRequireAuth] Nettoyage du hook...');
      isMounted = false;
      
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [navigate]);

  return {
    session,
    user,
    isLoading,
    isAuthenticated
  };
};

export default useRequireAuth;



