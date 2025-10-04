/**
 * Service de monitoring de performance en temps réel
 */

import { db } from '../lib/database';

export interface PerformanceMetrics {
  timestamp: Date;
  memoryUsage: number;
  operationCount: number;
  averageResponseTime: number;
  concurrentUsers: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🚀 Démarrage du monitoring de performance...');

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.metrics.push(metrics);
        
        if (this.metrics.length > 1000) {
          this.metrics = this.metrics.slice(-1000);
        }
        
        await this.saveMetrics(metrics);
        
      } catch (error) {
        console.error('❌ Erreur lors de la collecte des métriques:', error);
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('⏹️ Monitoring de performance arrêté');
  }

  private async collectMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date();
    const memory = (performance as any).memory;
    const memoryUsage = memory ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100 : 0;
    
    let dbMetrics = {
      operationCount: 0,
      averageResponseTime: 0,
      concurrentUsers: 0
    };

    try {
      const metrics = await db.performanceMetrics.orderBy('lastUpdated').last();
      if (metrics) {
        dbMetrics = {
          operationCount: metrics.operationCount,
          averageResponseTime: metrics.averageResponseTime,
          concurrentUsers: metrics.concurrentUsers
        };
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des métriques DB:', error);
    }
    
    return {
      timestamp,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
      ...dbMetrics
    };
  }

  private async saveMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      await db.performanceMetrics.add({
        operationCount: metrics.operationCount,
        averageResponseTime: metrics.averageResponseTime,
        concurrentUsers: metrics.concurrentUsers,
        memoryUsage: metrics.memoryUsage,
        lastUpdated: metrics.timestamp
      });
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des métriques:', error);
    }
  }

  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metrics.length
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;