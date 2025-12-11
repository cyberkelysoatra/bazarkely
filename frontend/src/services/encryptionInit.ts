/**
 * Initialisation du système de chiffrement AES-256
 * Lance automatiquement la migration des données existantes
 */

import { migrationService } from './migrationService'
import { encryptionService } from './encryptionService'

class EncryptionInitializer {
  private initialized = false

  /**
   * Initialise le système de chiffrement
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Vérifier le support du navigateur
      if (!encryptionService.isSupported()) {
        console.warn('⚠️ Chiffrement AES-256 non supporté, utilisation de Base64')
        this.initialized = true
        return
      }

      // Vérifier si la migration a déjà été effectuée
      if (migrationService.isMigrationCompleted()) {
        this.initialized = true
        return
      }

      // Lancer la migration
      const result = await migrationService.runFullMigration()

      if (!result.success) {
        console.warn(`⚠️ Migration partielle: ${result.migrated} éléments migrés, ${result.failed} échecs`)
        if (result.errors.length > 0) {
          console.error('❌ Erreurs de migration:', result.errors)
        }
      }

      this.initialized = true
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du chiffrement:', error)
      this.initialized = true // Marquer comme initialisé pour éviter les boucles
    }
  }

  /**
   * Vérifie si le système est initialisé
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Force la réinitialisation (pour les tests)
   */
  reset(): void {
    this.initialized = false
  }
}

// Instance singleton
export const encryptionInit = new EncryptionInitializer()

// Auto-initialisation lors de l'import
if (typeof window !== 'undefined') {
  // Attendre que le DOM soit prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      encryptionInit.initialize()
    })
  } else {
    encryptionInit.initialize()
  }
}










