/**
 * Utilitaires de hachage de mots de passe utilisant Web Crypto API
 * Compatible avec tous les navigateurs modernes
 * Aucune dépendance externe requise
 */

// Configuration du hachage PBKDF2
const HASH_CONFIG = {
  algorithm: 'PBKDF2',
  iterations: 100000, // Nombre d'itérations pour la sécurité
  hashLength: 32, // 256 bits
  saltLength: 16, // 128 bits
  hashFunction: 'SHA-256'
} as const;

/**
 * Génère un sel aléatoire sécurisé
 * @returns Promise<string> - Sel encodé en base64
 */
async function generateSalt(): Promise<string> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(HASH_CONFIG.saltLength));
    return btoa(String.fromCharCode(...salt));
  } catch (error) {
    console.error('❌ Erreur lors de la génération du sel:', error);
    throw new Error('Impossible de générer un sel sécurisé');
  }
}

/**
 * Hache un mot de passe avec PBKDF2 et un sel
 * @param password - Mot de passe en texte clair
 * @param salt - Sel pour le hachage (optionnel, généré automatiquement si non fourni)
 * @returns Promise<string> - Hash encodé en base64 avec le sel
 */
export async function hashPassword(password: string, salt?: string): Promise<string> {
  try {
    // Validation du mot de passe
    if (!password || typeof password !== 'string') {
      throw new Error('Le mot de passe doit être une chaîne non vide');
    }

    if (password.length < 4) {
      throw new Error('Le mot de passe doit contenir au moins 4 caractères');
    }

    // Générer un sel si non fourni
    const usedSalt = salt || await generateSalt();
    
    // Convertir le sel de base64 vers Uint8Array
    const saltBytes = Uint8Array.from(atob(usedSalt), c => c.charCodeAt(0));
    
    // Convertir le mot de passe en Uint8Array
    const passwordBytes = new TextEncoder().encode(password);
    
    // Importer la clé pour PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBytes,
      'PBKDF2',
      false,
      ['deriveBits']
    );
    
    // Dériver la clé avec PBKDF2
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: HASH_CONFIG.algorithm,
        salt: saltBytes,
        iterations: HASH_CONFIG.iterations,
        hash: HASH_CONFIG.hashFunction
      },
      keyMaterial,
      HASH_CONFIG.hashLength * 8 // Convertir en bits
    );
    
    // Convertir le hash en base64
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(derivedKey)));
    
    // Retourner le format: salt$hash
    return `${usedSalt}$${hashBase64}`;
    
  } catch (error) {
    console.error('❌ Erreur lors du hachage du mot de passe:', error);
    throw new Error('Impossible de hacher le mot de passe');
  }
}

/**
 * Vérifie un mot de passe contre son hash
 * @param password - Mot de passe en texte clair à vérifier
 * @param hash - Hash stocké au format salt$hash
 * @returns Promise<boolean> - true si le mot de passe est correct
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Validation des paramètres
    if (!password || typeof password !== 'string') {
      console.warn('⚠️ Mot de passe invalide pour la vérification');
      return false;
    }

    if (!hash || typeof hash !== 'string') {
      console.warn('⚠️ Hash invalide pour la vérification');
      return false;
    }

    // Vérifier le format du hash (salt$hash)
    const hashParts = hash.split('$');
    if (hashParts.length !== 2) {
      console.warn('⚠️ Format de hash invalide');
      return false;
    }

    const [salt] = hashParts;

    // Hacher le mot de passe fourni avec le même sel
    const computedHash = await hashPassword(password, salt);
    
    // Comparer les hashes de manière sécurisée
    return computedHash === hash;
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du mot de passe:', error);
    return false;
  }
}

/**
 * Vérifie si un hash est valide (format correct)
 * @param hash - Hash à vérifier
 * @returns boolean - true si le format est valide
 */
export function isValidHash(hash: string): boolean {
  try {
    if (!hash || typeof hash !== 'string') {
      return false;
    }

    const hashParts = hash.split('$');
    if (hashParts.length !== 2) {
      return false;
    }

    const [salt, hashPart] = hashParts;
    
    // Vérifier que les deux parties sont en base64 valide
    try {
      atob(salt);
      atob(hashPart);
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Génère un mot de passe temporaire pour la migration
 * @param username - Nom d'utilisateur pour la génération
 * @returns string - Mot de passe temporaire
 */
export function generateTemporaryPassword(username: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `temp_${username}_${timestamp}_${randomPart}`;
}

/**
 * Vérifie si un hash est un hash temporaire de migration
 * @param hash - Hash à vérifier
 * @returns boolean - true si c'est un hash temporaire
 */
export function isTemporaryHash(hash: string): boolean {
  return hash.startsWith('MIGRATION_REQUIRED_') || 
         hash.startsWith('TEMP_PASSWORD_HASH_') ||
         hash.startsWith('temp_');
}

/**
 * Valide la force d'un mot de passe (règles simples)
 * @param password - Mot de passe à valider
 * @returns { isValid: boolean; errors: string[] } - Résultat de la validation
 */
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Le mot de passe est requis');
    return { isValid: false, errors };
  }
  
  if (password.length < 4) {
    errors.push('Le mot de passe doit contenir au moins 4 caractères');
  }
  
  if (password.length > 128) {
    errors.push('Le mot de passe ne peut pas dépasser 128 caractères');
  }
  
  // Vérifier les caractères autorisés (lettres, chiffres, symboles de base)
  const allowedChars = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`\s]*$/;
  if (!allowedChars.test(password)) {
    errors.push('Le mot de passe contient des caractères non autorisés');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Fonction utilitaire pour tester le hachage (développement uniquement)
 * @param password - Mot de passe de test
 * @returns Promise<void> - Affiche les résultats dans la console
 */
export async function testPasswordHashing(password: string = 'test123'): Promise<void> {
  try {
    console.log('🧪 Test du hachage de mot de passe...');
    console.log('Mot de passe original:', password);
    
    // Hacher le mot de passe
    const hash = await hashPassword(password);
    console.log('Hash généré:', hash);
    
    // Vérifier le hash
    const isValid = await verifyPassword(password, hash);
    console.log('Vérification:', isValid ? '✅ Réussie' : '❌ Échouée');
    
    // Tester avec un mauvais mot de passe
    const wrongPassword = 'wrong123';
    const isWrongValid = await verifyPassword(wrongPassword, hash);
    console.log('Test mot de passe incorrect:', isWrongValid ? '❌ Problème' : '✅ Correct');
    
    // Vérifier le format du hash
    const isHashValid = isValidHash(hash);
    console.log('Format du hash:', isHashValid ? '✅ Valide' : '❌ Invalide');
    
    console.log('✅ Test terminé avec succès');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

// Export des constantes pour utilisation externe
export const PASSWORD_CONFIG = {
  ...HASH_CONFIG,
  minLength: 4,
  maxLength: 128,
  allowedChars: /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`\s]*$/
} as const;
