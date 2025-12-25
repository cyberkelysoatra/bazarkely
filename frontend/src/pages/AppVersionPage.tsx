/**
 * AppVersionPage Component
 * Displays application version information, update status, and version history
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  CheckCircle,
  AlertCircle,
  History,
  Smartphone,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  APP_VERSION,
  APP_BUILD_DATE,
  VERSION_HISTORY,
  type VersionEntry
} from '../constants/appVersion';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

/**
 * Get badge color based on version type
 */
const getVersionTypeColor = (type: VersionEntry['type']): string => {
  switch (type) {
    case 'major':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'minor':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'patch':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'hotfix':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * Format version type label
 */
const getVersionTypeLabel = (type: VersionEntry['type']): string => {
  switch (type) {
    case 'major':
      return 'Majeure';
    case 'minor':
      return 'Mineure';
    case 'patch':
      return 'Corrective';
    case 'hotfix':
      return 'Urgente';
    default:
      return type;
  }
};

const AppVersionPage: React.FC = () => {
  const navigate = useNavigate();
  const { updateAvailable, isChecking, applyUpdate } = useServiceWorkerUpdate();
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Toggle version history expansion
   */
  const toggleVersionExpansion = (version: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(version)) {
      newExpanded.delete(version);
    } else {
      newExpanded.add(version);
    }
    setExpandedVersions(newExpanded);
  };

  /**
   * Handle update button click
   */
  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await applyUpdate();
      // Reload page after update
      window.location.reload();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      setIsUpdating(false);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Retour au tableau de bord"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  Version de l'application
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Current Version Card */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Version installée
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-purple-600">
                  {APP_VERSION}
                </span>
                <span className="text-sm text-gray-500">
                  (Build {APP_BUILD_DATE})
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Compilé le {formatDate(APP_BUILD_DATE)}
              </p>
            </div>
            <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full">
              <Smartphone className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </section>

        {/* Update Status Card */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Statut de mise à jour
          </h2>
          {isChecking ? (
            <div className="flex items-center gap-3 text-gray-600">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Vérification des mises à jour...</span>
            </div>
          ) : updateAvailable ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">
                    Nouvelle version disponible
                  </p>
                  <p className="text-sm text-green-700">
                    Une mise à jour de l'application est disponible. Cliquez sur le bouton ci-dessous pour l'installer.
                  </p>
                </div>
              </div>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="
                  w-full sm:w-auto px-6 py-3
                  bg-purple-600 hover:bg-purple-700
                  text-white font-semibold rounded-xl
                  transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                  touch-manipulation
                "
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Mise à jour en cours...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Mettre à jour maintenant</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900">
                  Vous êtes à jour
                </p>
                <p className="text-sm text-blue-700">
                  Vous utilisez la dernière version de l'application.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Version History Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <History className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Historique des versions
            </h2>
          </div>
          <div className="space-y-3">
            {VERSION_HISTORY.map((entry) => {
              const isExpanded = expandedVersions.has(entry.version);
              return (
                <div
                  key={entry.version}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Version Header */}
                  <button
                    onClick={() => toggleVersionExpansion(entry.version)}
                    className="
                      w-full px-4 py-4
                      flex items-center justify-between
                      hover:bg-gray-50 transition-colors
                      touch-manipulation
                    "
                  >
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <span className="text-lg font-semibold text-gray-900">
                          v{entry.version}
                        </span>
                        <span
                          className={`
                            px-2 py-1 rounded text-xs font-medium border
                            ${getVersionTypeColor(entry.type)}
                          `}
                        >
                          {getVersionTypeLabel(entry.type)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(entry.date)}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>

                  {/* Version Details (Expandable) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-4">
                        Modifications :
                      </h3>
                      <ul className="space-y-2">
                        {entry.changes.map((change, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-gray-600"
                          >
                            <span className="text-purple-600 mt-1">•</span>
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppVersionPage;

