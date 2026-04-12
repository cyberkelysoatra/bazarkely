/**
 * Service d'authentification pour BazarKELY avec Supabase
 * Utilise Supabase Auth pour la gestion des utilisateurs
 */

import type { User } from '../types/supabase';
import { supabase, getCurrentUser, isAuthenticated as checkAuth, withTimeout } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabase';

// Timeout par défaut pour toutes les requêtes DB Supabase dans le flux d'auth
// Les requêtes DB peuvent hanger silencieusement sans throw ni réponse
const DB_TIMEOUT_MS = 5000;

class AuthService {
  /**
   * Connexion utilisateur avec Supabase Auth
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔐 Connexion de l\'utilisateur:', email);
      
      // Connexion avec Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.log('❌ Erreur lors de la connexion:', error.message);
        return { success: false, error: handleSupabaseError(error) };
      }

      if (!data.user) {
        return { success: false, error: 'Aucun utilisateur trouvé' };
      }

      // Récupérer les données utilisateur depuis la table users (avec timeout)
      const { data: userData, error: userError } = await withTimeout(
        supabase.from('users').select('*').eq('id', data.user.id).single() as any,
        DB_TIMEOUT_MS, 'login/users'
      ) as { data: User | null; error: any };

      if (userError) {
        console.log('❌ Erreur lors de la récupération des données utilisateur:', userError.message);
        return { success: false, error: 'Erreur lors de la récupération des données utilisateur' };
      }

      if (!userData) {
        console.log('❌ Aucune donnée utilisateur trouvée');
        return { success: false, error: 'Aucune donnée utilisateur trouvée' };
      }

      // Convertir les données Supabase en format User
      const user: User = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role,
        preferences: userData.preferences,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        last_sync: userData.last_sync
      };
      
      console.log('✅ Connexion réussie pour:', email);
      return { success: true, user };

    } catch (error) {
      console.error('❌ Erreur lors de la connexion:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  }

  /**
   * Inscription utilisateur avec Supabase Auth
   * Le profil utilisateur est créé automatiquement par le trigger PostgreSQL handle_new_user
   */
  async register(username: string, email: string, phone: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('📝 Inscription de l\'utilisateur:', username);
      
      // Inscription avec Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            phone
          }
        }
      });
      
      if (error) {
        console.log('❌ Erreur lors de l\'inscription:', error.message);
        return { success: false, error: handleSupabaseError(error) };
      }

      if (!data.user) {
        return { success: false, error: 'Aucun utilisateur créé' };
      }

      // Attendre que la session soit établie
      console.log('⏳ Attente de l\'établissement de la session...');
      await this.waitForSession(data.user.id);

      // Le profil utilisateur sera créé automatiquement par le trigger PostgreSQL
      // Pas besoin d'insertion manuelle - le trigger handle_new_user s'en charge
      console.log('✅ Inscription réussie pour:', username);
      console.log('ℹ️ Le profil utilisateur sera créé automatiquement par le trigger PostgreSQL');
      
      // Retourner un utilisateur basique avec les données Auth
      const user: User = {
        id: data.user.id,
        username,
        email,
        phone: phone || '',
        role: 'user', // Rôle par défaut
        preferences: {
          theme: 'system',
          language: 'fr',
          currency: 'MGA'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_sync: new Date().toISOString()
      };
      
      return { success: true, user };

    } catch (error) {
      console.error('❌ Erreur lors de l\'inscription:', error);
      return { success: false, error: 'Erreur lors de l\'inscription' };
    }
  }

  /**
   * Attendre que la session Supabase soit établie
   */
  private async waitForSession(userId: string, maxAttempts: number = 10, delayMs: number = 500): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user?.id === userId) {
          console.log('✅ Session établie avec succès');
          return;
        }
      } catch (error) {
        console.log(`⚠️ Tentative ${attempt}/${maxAttempts} - Session pas encore disponible`);
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.warn('⚠️ Session non établie après toutes les tentatives, mais l\'inscription a réussi');
  }

  /**
   * Réinitialisation du mot de passe avec Supabase Auth
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Réinitialisation du mot de passe pour:', email);
      
      // Envoyer l'email de réinitialisation avec Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        console.log('❌ Erreur lors de la réinitialisation:', error.message);
        return { success: false, error: handleSupabaseError(error) };
      }

      console.log('✅ Email de réinitialisation envoyé pour:', email);
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur lors de la réinitialisation:', error);
      return { success: false, error: 'Erreur lors de la réinitialisation' };
    }
  }

  /**
   * Mettre à jour le mot de passe (après réinitialisation)
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Mise à jour du mot de passe...');
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.log('❌ Erreur lors de la mise à jour:', error.message);
        return { success: false, error: handleSupabaseError(error) };
      }

      console.log('✅ Mot de passe mis à jour');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      return { success: false, error: 'Erreur lors de la mise à jour' };
    }
  }

  /**
   * Connexion avec Google OAuth
   */
  async signInWithGoogle(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔐 Connexion avec Google...');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.log('❌ Erreur lors de la connexion Google:', error.message);
        return { success: false, error: handleSupabaseError(error) };
      }

      // Pour OAuth, la redirection se fait automatiquement
      // L'utilisateur sera redirigé vers Google, puis vers /dashboard
      console.log('✅ Redirection vers Google en cours...');
      return { success: true };

    } catch (error) {
      console.error('❌ Erreur lors de la connexion Google:', error);
      return { success: false, error: 'Erreur lors de la connexion Google' };
    }
  }

  /**
   * Gérer le callback OAuth et créer le profil utilisateur
   */
  async handleOAuthCallback(): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔄 Traitement du callback OAuth...');
      
      // Récupérer la session après redirection
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.log('❌ Erreur lors de la récupération de la session:', sessionError.message);
        return { success: false, error: 'Erreur de session' };
      }

      let currentUser = session?.user;
      
      if (!currentUser) {
        console.log('❌ Aucune session trouvée, tentative de récupération...');
        // Essayer de récupérer l'utilisateur directement
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          return { success: false, error: 'Aucune session trouvée' };
        }
        currentUser = user;
        console.log('✅ Utilisateur récupéré directement:', user.id);
      }

      // Attendre que le profil utilisateur soit créé par le trigger
      console.log('⏳ Attente de la création du profil utilisateur...');
      await this.waitForUserProfile(currentUser.id);

      // Récupérer les données utilisateur depuis la table users (avec timeout)
      const { data: userData, error: userError } = await withTimeout(
        supabase.from('users').select('*').eq('id', currentUser.id).single() as any,
        DB_TIMEOUT_MS, 'handleOAuthCallback/users'
      ) as { data: User | null; error: any };

      if (userError) {
        console.log('❌ Erreur lors de la récupération des données utilisateur:', userError.message);
        // Créer un utilisateur basique si le trigger n'a pas encore fonctionné
        const user: User = {
          id: currentUser.id,
          username: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Utilisateur',
          email: currentUser.email || '',
          phone: currentUser.user_metadata?.phone || '',
          role: 'user',
          preferences: {
            theme: 'system',
            language: 'fr',
            currency: 'MGA'
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_sync: new Date().toISOString()
        };
        return { success: true, user };
      }

      if (!userData) {
        console.log('❌ Aucune donnée utilisateur trouvée');
        return { success: false, error: 'Aucune donnée utilisateur trouvée' };
      }

      // Convertir les données Supabase en format User
      const user: User = {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role,
        preferences: userData.preferences,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        last_sync: userData.last_sync
      };

      console.log('✅ Connexion Google réussie pour:', user.username);
      return { success: true, user };

    } catch (error) {
      console.error('❌ Erreur lors du traitement du callback OAuth:', error);
      return { success: false, error: 'Erreur lors de la connexion Google' };
    }
  }

  /**
   * Attendre que le profil utilisateur soit créé par le trigger
   */
  private async waitForUserProfile(userId: string, maxAttempts: number = 5, delayMs: number = 1000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { data: userData, error } = await withTimeout(
          supabase.from('users').select('id').eq('id', userId).single(),
          DB_TIMEOUT_MS, `waitForUserProfile attempt ${attempt}`
        );

        if (!error && userData) {
          console.log('✅ Profil utilisateur créé avec succès');
          return;
        }
      } catch (error) {
        console.log(`⚠️ Tentative ${attempt}/${maxAttempts} - timeout/erreur profil utilisateur`);
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.warn('⚠️ Profil utilisateur non trouvé après toutes les tentatives, connexion maintenue');
  }

  /**
   * Déconnexion utilisateur avec Supabase Auth
   */
  async logout(): Promise<boolean> {
    console.log('🚪 Déconnexion en cours...');

    // Nettoyer les données locales EN PREMIER — même si Supabase est inaccessible
    localStorage.removeItem('bazarkely-user');
    localStorage.removeItem('bazarkely-authenticated');
    // Vider le store Zustand persisté
    const zustandKeys = Object.keys(localStorage).filter(k => k.startsWith('bazarkely'));
    zustandKeys.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();

    try {
      // Tentative de déconnexion Supabase avec timeout de 4s
      const signOutPromise = supabase.auth.signOut();
      const timeout = new Promise<{ error: Error }>(resolve =>
        setTimeout(() => resolve({ error: new Error('signOut timeout') }), 4000)
      );
      const { error } = await Promise.race([signOutPromise, timeout]) as any;
      if (error) {
        console.warn('⚠️ Supabase signOut:', error.message, '— session locale nettoyee quand meme');
      } else {
        console.log('✅ Deconnexion Supabase reussie');
      }
    } catch (error) {
      console.warn('⚠️ Supabase signOut echoue (offline?) — session locale nettoyee quand meme');
    }

    return true;
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      return await checkAuth();
    } catch {
      return false;
    }
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await getCurrentUser();
      if (!user) return null;

      // Récupérer les données utilisateur depuis la table users (avec timeout)
      const { data: userData, error } = await withTimeout(
        supabase.from('users').select('*').eq('id', user.id).single() as any,
        DB_TIMEOUT_MS, 'getCurrentUser/users'
      ) as { data: User | null; error: any };

      if (error) {
        console.error('❌ Erreur lors de la récupération des données utilisateur:', error);
        return null;
      }

      if (!userData) {
        console.error('❌ Aucune donnée utilisateur trouvée');
        return null;
      }

      // Convertir les données Supabase en format User
      return {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role,
        preferences: userData.preferences,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        last_sync: userData.last_sync
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  }

  /**
   * Sauvegarder l'utilisateur en local (pour compatibilité)
   */
  saveUser(user: User): void {
    localStorage.setItem('bazarkely-user', JSON.stringify(user));
    localStorage.setItem('bazarkely-authenticated', 'true');
  }

  /**
   * Écouter les changements d'authentification
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      }
    });
  }
}

export default new AuthService();
















