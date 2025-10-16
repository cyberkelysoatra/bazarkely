/**
 * Service de migration pour remplacer Base64 par AES-256
 * Gère la migration progressive des données existantes
 */

import { encryptionService } from './encryptionService'

interface MigrationResult {
  success: boolean
  migrated: number
  failed: number
  errors: string[]
}

class MigrationService {
  private readonly migrationKey = 'bazarkely_migration_key_2025'
  private readonly migrationVersion = 'aes256_v1'

  /**
   * Vérifie si la migration AES-256 a été effectuée
   */
  isMigrationCompleted(): boolean {
    const migrationStatus = localStorage.getItem('bazarkely_migration_aes256')
    return migrationStatus === this.migrationVersion
  }

  /**
   * Marque la migration comme terminée
   */
  markMigrationCompleted(): void {
    localStorage.setItem('bazarkely_migration_aes256', this.migrationVersion)
  }

  /**
   * Migre les données d'un service de stockage
   */
  async migrateStorageService(service: any): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migrated: 0,
      failed: 0,
      errors: []
    }

    try {
      if (!encryptionService.isSupported()) {
        result.errors.push('Chiffrement AES-256 non supporté par ce navigateur')
        return result
      }

      // Récupérer toutes les clés du service
      const keys = await this.getAllKeys(service)
      
      for (const key of keys) {
        try {
          // Récupérer la valeur actuelle (Base64)
          const currentValue = await service.getItem(key)
          
          if (currentValue && this.isBase64Encoded(currentValue)) {
            // Déchiffrer Base64
            const decryptedValue = atob(currentValue)
            
            // Chiffrer avec AES-256
            const encrypted = await encryptionService.encrypt(decryptedValue, this.migrationKey)
            
            // Stocker la nouvelle valeur chiffrée
            const newValue = JSON.stringify({
              encrypted: encrypted.encrypted,
              iv: encrypted.iv,
              algorithm: 'AES-256-GCM',
              version: this.migrationVersion
            })
            
            await service.setItem(key, newValue)
            result.migrated++
          }
        } catch (error) {
          result.failed++
          result.errors.push(`Erreur migration clé ${key}: ${error}`)
        }
      }

      result.success = result.failed === 0
      return result
    } catch (error) {
      result.errors.push(`Erreur générale migration: ${error}`)
      return result
    }
  }

  /**
   * Récupère toutes les clés d'un service de stockage
   */
  private async getAllKeys(service: any): Promise<string[]> {
    try {
      if (service.getAllKeys) {
        return await service.getAllKeys()
      } else if (service.keys) {
        return service.keys()
      } else {
        // Fallback: essayer de récupérer les clés connues
        return [
          'user',
          'accounts',
          'transactions',
          'budgets',
          'goals',
          'preferences',
          'settings'
        ]
      }
    } catch (error) {
      console.error('❌ Erreur récupération clés:', error)
      return []
    }
  }

  /**
   * Vérifie si une chaîne est encodée en Base64
   */
  private isBase64Encoded(str: string): boolean {
    try {
      // Vérifier si c'est du JSON (données déjà migrées)
      JSON.parse(str)
      return false
    } catch {
      // Vérifier si c'est du Base64 valide
      try {
        atob(str)
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * Déchiffre une valeur migrée
   */
  async decryptMigratedValue(encryptedValue: string): Promise<string> {
    try {
      const data = JSON.parse(encryptedValue)
      
      if (data.algorithm === 'AES-256-GCM' && data.encrypted && data.iv) {
        const result = await encryptionService.decrypt(
          data.encrypted,
          data.iv,
          this.migrationKey
        )
        
        if (result.success) {
          return result.decrypted
        } else {
          throw new Error('Échec du déchiffrement')
        }
      } else {
        // Ancien format Base64
        return atob(encryptedValue)
      }
    } catch (error) {
      console.error('❌ Erreur déchiffrement valeur migrée:', error)
      return encryptedValue // Retourner la valeur originale en cas d'erreur
    }
  }

  /**
   * Chiffre une nouvelle valeur
   */
  async encryptNewValue(value: string): Promise<string> {
    try {
      const encrypted = await encryptionService.encrypt(value, this.migrationKey)
      return JSON.stringify({
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        algorithm: 'AES-256-GCM',
        version: this.migrationVersion
      })
    } catch (error) {
      console.error('❌ Erreur chiffrement nouvelle valeur:', error)
      // Fallback vers Base64 en cas d'erreur
      return btoa(value)
    }
  }

  /**
   * Lance la migration complète
   */
  async runFullMigration(): Promise<MigrationResult> {
    console.log('🚀 Début de la migration AES-256...')
    
    const result: MigrationResult = {
      success: false,
      migrated: 0,
      failed: 0,
      errors: []
    }

    try {
      // Migrer localStorage
      const localStorageResult = await this.migrateStorageService(localStorage)
      result.migrated += localStorageResult.migrated
      result.failed += localStorageResult.failed
      result.errors.push(...localStorageResult.errors)

      // Migrer sessionStorage
      const sessionStorageResult = await this.migrateStorageService(sessionStorage)
      result.migrated += sessionStorageResult.migrated
      result.failed += sessionStorageResult.failed
      result.errors.push(...sessionStorageResult.errors)

      // Marquer la migration comme terminée
      this.markMigrationCompleted()
      result.success = result.failed === 0

      console.log(`✅ Migration terminée: ${result.migrated} éléments migrés, ${result.failed} échecs`)
      return result
    } catch (error) {
      result.errors.push(`Erreur migration complète: ${error}`)
      return result
    }
  }
}

// Instance singleton
export const migrationService = new MigrationService()

// Export des types
export type { MigrationResult }


