/**
 * Service d'authentification côté serveur pour BazarKELY
 * Permet l'authentification multi-navigateur via une API serveur
 */

import type { User } from '../types';

interface ServerAuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  token?: string;
}

interface ServerUserData {
  id: string;
  username: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: string;
  preferences: any;
  createdAt: string;
  lastSync: string;
}

class ServerAuthService {
  private baseUrl: string;
  private currentToken: string | null = null;

  constructor() {
    // Note: Now using Supabase Auth instead of PHP API
    this.baseUrl = 'supabase://auth';
  }

  // Vérifier si l'API serveur est disponible
  async isServerAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // Timeout de 5 secondes
      });
      
      if (!response.ok) {
        return false;
      }
      
      // Vérifier que la réponse est bien du JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('⚠️ Serveur ne retourne pas de JSON, utilisation du mode local');
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('🔌 Serveur d\'authentification non disponible, utilisation du mode local');
      return false;
    }
  }

  // Authentifier un utilisateur côté serveur
  async authenticateUser(username: string, password: string): Promise<ServerAuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      // Vérifier le type de contenu de la réponse
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Serveur retourne du HTML au lieu de JSON');
        return {
          success: false,
          error: 'Serveur non configuré correctement'
        };
      }

      if (!response.ok) {
        try {
          const errorData = await response.json();
          return {
            success: false,
            error: errorData.error || 'Erreur d\'authentification'
          };
        } catch (parseError) {
          return {
            success: false,
            error: `Erreur serveur: ${response.status} ${response.statusText}`
          };
        }
      }

      const data = await response.json();
      this.currentToken = data.token;
      
      return {
        success: true,
        user: this.convertServerUserToLocal(data.user),
        token: data.token
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'authentification serveur:', error);
      return {
        success: false,
        error: 'Erreur de connexion au serveur'
      };
    }
  }

  // Enregistrer un utilisateur côté serveur
  async registerUser(username: string, email: string, phone: string, password: string): Promise<ServerAuthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, phone, password })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Erreur d\'enregistrement'
        };
      }

      const data = await response.json();
      this.currentToken = data.token;
      
      return {
        success: true,
        user: this.convertServerUserToLocal(data.user),
        token: data.token
      };
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement serveur:', error);
      return {
        success: false,
        error: 'Erreur de connexion au serveur'
      };
    }
  }

  // Récupérer un utilisateur par nom d'utilisateur côté serveur
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/user/${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.currentToken && { 'Authorization': `Bearer ${this.currentToken}` })
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.convertServerUserToLocal(data.user);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération utilisateur serveur:', error);
      return null;
    }
  }

  // Synchroniser les données utilisateur depuis le serveur
  async syncUserData(userId: string): Promise<User | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/sync/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.currentToken && { 'Authorization': `Bearer ${this.currentToken}` })
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return this.convertServerUserToLocal(data.user);
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation utilisateur:', error);
      return null;
    }
  }

  // Convertir les données utilisateur du serveur vers le format local
  private convertServerUserToLocal(serverUser: ServerUserData): User {
    return {
      id: serverUser.id,
      username: serverUser.username,
      email: serverUser.email,
      phone: serverUser.phone,
      passwordHash: serverUser.passwordHash,
      role: serverUser.role as 'user' | 'admin',
      preferences: serverUser.preferences,
      createdAt: new Date(serverUser.createdAt),
      lastSync: new Date(serverUser.lastSync)
    };
  }

  // Obtenir le token d'authentification actuel
  getCurrentToken(): string | null {
    return this.currentToken;
  }

  // Définir le token d'authentification
  setToken(token: string): void {
    this.currentToken = token;
  }

  // Effacer le token d'authentification
  clearToken(): void {
    this.currentToken = null;
  }

  // Déconnexion côté serveur
  async logout(): Promise<boolean> {
    try {
      if (!this.currentToken) {
        console.log('ℹ️ Aucun token à déconnecter');
        return true;
      }

      const response = await fetch(`${this.baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.currentToken}`
        }
      });

      // Même si le serveur échoue, on considère la déconnexion comme réussie
      // car on va effacer les données locales de toute façon
      this.currentToken = null;
      
      if (response.ok) {
        console.log('✅ Déconnexion serveur réussie');
        return true;
      } else {
        console.log('⚠️ Déconnexion serveur échouée, mais déconnexion locale effectuée');
        return true;
      }
    } catch (error) {
      console.log('⚠️ Erreur lors de la déconnexion serveur, déconnexion locale effectuée:', error);
      this.currentToken = null;
      return true;
    }
  }
}

export const serverAuthService = new ServerAuthService();
