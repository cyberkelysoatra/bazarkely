/**
 * Service de monitoring pour les transactions récurrentes
 * Phase 2: Vérification automatique et génération en arrière-plan
 */

import { db } from '../lib/database';
import type { RecurringTransaction } from '../types/recurring';
import type { Transaction } from '../types';

class RecurringTransactionMonitoringService {
  private checkInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private checkIntervalMs = 12 * 60 * 60 * 1000; // 12 heures par défaut

  /**
   * Vérifie et génère toutes les transactions récurrentes dues
   * 
   * @returns Nombre de transactions générées
   */
  async checkAndGenerateDue(): Promise<number> {
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { default: recurringTransactionService } = await import('./recurringTransactionService');
      const { default: notificationService } = await import('./notificationService');

      // Récupérer tous les utilisateurs actifs
      const users = await db.users.toArray();
      let totalGenerated = 0;

      for (const user of users) {
        try {
          // Générer les transactions dues pour cet utilisateur
          const generatedTransactions = await recurringTransactionService.generatePendingTransactions(user.id);
          totalGenerated += generatedTransactions.length;

          // Envoyer des notifications pour chaque transaction générée
          for (const transaction of generatedTransactions) {
            if (transaction.recurringTransactionId) {
              await notificationService.sendRecurringCreatedNotification(
                user.id,
                transaction,
                transaction.recurringTransactionId
              );
            }
          }
        } catch (error) {
          console.error(`❌ Erreur lors de la génération pour l'utilisateur ${user.id}:`, error);
          // Continuer avec les autres utilisateurs
        }
      }

      console.log(`✅ Monitoring: ${totalGenerated} transaction(s) générée(s)`);
      return totalGenerated;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des transactions dues:', error);
      return 0;
    }
  }

  /**
   * Calcule la prochaine heure de vérification
   * 
   * @returns Date de la prochaine vérification
   */
  scheduleNextCheck(): Date {
    const nextCheck = new Date();
    nextCheck.setTime(nextCheck.getTime() + this.checkIntervalMs);
    return nextCheck;
  }

  /**
   * Démarre le monitoring automatique
   * 
   * @param intervalMs Intervalle de vérification en millisecondes (défaut: 12 heures)
   */
  startMonitoring(intervalMs?: number): void {
    if (this.isMonitoring) {
      console.warn('⚠️ Le monitoring est déjà actif');
      return;
    }

    if (intervalMs) {
      this.checkIntervalMs = intervalMs;
    }

    console.log('🔄 Démarrage du monitoring des transactions récurrentes...');
    
    // Vérification immédiate
    this.checkAndGenerateDue().catch(error => {
      console.error('❌ Erreur lors de la vérification initiale:', error);
    });

    // Vérifications périodiques
    this.checkInterval = setInterval(() => {
      this.checkAndGenerateDue().catch(error => {
        console.error('❌ Erreur lors de la vérification périodique:', error);
      });
    }, this.checkIntervalMs);

    this.isMonitoring = true;
    console.log(`✅ Monitoring démarré (intervalle: ${this.checkIntervalMs / 1000 / 60 / 60}h)`);
  }

  /**
   * Arrête le monitoring automatique
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    this.isMonitoring = false;
    console.log('⏹️ Monitoring arrêté');
  }

  /**
   * Vérifie si le monitoring est actif
   */
  isActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Gère les messages du Service Worker pour les vérifications en arrière-plan
   * 
   * @param event Message event du Service Worker
   */
  async handleServiceWorkerMessage(event: MessageEvent): Promise<void> {
    if (event.data && event.data.type === 'CHECK_RECURRING_TRANSACTIONS') {
      try {
        const count = await this.checkAndGenerateDue();
        // Envoyer une réponse au Service Worker
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true, count });
        }
      } catch (error) {
        console.error('❌ Erreur lors de la vérification depuis le Service Worker:', error);
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: false, error: String(error) });
        }
      }
    }
  }

  /**
   * Gère les événements de synchronisation périodique (Periodic Background Sync)
   * 
   * @param event SyncEvent du Service Worker
   */
  async handlePeriodicSync(event: SyncEvent): Promise<void> {
    if (event.tag === 'recurring-transactions-check') {
      try {
        console.log('🔄 Synchronisation périodique des transactions récurrentes...');
        await this.checkAndGenerateDue();
      } catch (error) {
        console.error('❌ Erreur lors de la synchronisation périodique:', error);
        // Ne pas rejeter pour permettre de nouvelles tentatives
      }
    }
  }
}

export const recurringTransactionMonitoringService = new RecurringTransactionMonitoringService();
export default recurringTransactionMonitoringService;

