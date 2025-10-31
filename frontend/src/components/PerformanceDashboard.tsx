/**
 * Composant de tableau de bord de performance en temps réel
 * Affiche les métriques de charge pour 100+ utilisateurs concurrents
 */

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../services/PerformanceMonitor';
import { syncService } from '../services/syncService';
import type { PerformanceMetrics, PerformanceAlert } from '../services/PerformanceMonitor';

interface PerformanceDashboardProps {
  isVisible: boolean;
  onClose: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isVisible, onClose }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    // Démarrer le monitoring si pas déjà actif
    if (!isMonitoring) {
      performanceMonitor.startMonitoring(2000); // Toutes les 2 secondes
      setIsMonitoring(true);
    }

    // Mettre à jour les métriques
    const updateMetrics = () => {
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      const currentAlerts = performanceMonitor.getActiveAlerts();
      
      setMetrics(currentMetrics);
      setAlerts(currentAlerts);
    };

    // Mettre à jour le statut de sync
    const updateSyncStatus = async () => {
      try {
        const status = await syncService.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du statut de sync:', error);
      }
    };

    // Mise à jour initiale
    updateMetrics();
    updateSyncStatus();

    // Intervalles de mise à jour
    const metricsInterval = setInterval(updateMetrics, 2000);
    const syncInterval = setInterval(updateSyncStatus, 5000);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(syncInterval);
    };
  }, [isVisible, isMonitoring]);

  useEffect(() => {
    return () => {
      if (isMonitoring) {
        performanceMonitor.stopMonitoring();
        setIsMonitoring(false);
      }
    };
  }, [isMonitoring]);

  if (!isVisible) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            📊 Tableau de Bord de Performance
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Métriques principales */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🧠</div>
                  <div>
                    <p className="text-sm text-gray-600">Mémoire</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatPercentage(metrics.memoryUsage)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">⚡</div>
                  <div>
                    <p className="text-sm text-gray-600">Temps de réponse</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatTime(metrics.averageResponseTime)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">👥</div>
                  <div>
                    <p className="text-sm text-gray-600">Utilisateurs actifs</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {metrics.concurrentUsers}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📊</div>
                  <div>
                    <p className="text-sm text-gray-600">Opérations</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {metrics.operationCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Statut de synchronisation */}
          {syncStatus && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🔄 Statut de Synchronisation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${syncStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {syncStatus.isOnline ? 'En ligne' : 'Hors ligne'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Dernière sync:</span>{' '}
                  {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'Jamais'}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Opérations en attente:</span>{' '}
                  {syncStatus.pendingOperations}
                </div>
              </div>
            </div>
          )}

          {/* Alertes de performance */}
          {alerts.length > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900 mb-3">
                🚨 Alertes de Performance ({alerts.length})
              </h3>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm opacity-75">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <span className="text-xs font-medium uppercase">
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
                {alerts.length > 5 && (
                  <p className="text-sm text-gray-600 text-center">
                    ... et {alerts.length - 5} autres alertes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => syncService.manualSync()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Synchroniser maintenant
            </button>
            <button
              onClick={() => performanceMonitor.stopMonitoring()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ⏹️ Arrêter le monitoring
            </button>
            <button
              onClick={() => {
                // Nettoyer les données anciennes
                performanceMonitor.cleanupOldData();
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              🧹 Nettoyer les données
            </button>
          </div>

          {/* Informations système */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              ℹ️ Informations Système
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Navigateur:</span> {navigator.userAgent.split(' ')[0]}
              </div>
              <div>
                <span className="font-medium">Langue:</span> {navigator.language}
              </div>
              <div>
                <span className="font-medium">Plateforme:</span> {navigator.platform}
              </div>
              <div>
                <span className="font-medium">En ligne:</span> {navigator.onLine ? 'Oui' : 'Non'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;































