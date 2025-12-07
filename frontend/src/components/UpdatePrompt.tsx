/**
 * Composant de notification de mise à jour du Service Worker
 * Affiche une bannière en bas de l'écran quand une nouvelle version est disponible
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

const UpdatePrompt: React.FC = () => {
  const { updateAvailable, applyUpdate } = useServiceWorkerUpdate();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div
      className="fixed bottom-20 left-0 right-0 z-50 px-4 animate-slide-up"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="max-w-md mx-auto bg-purple-600 text-white rounded-lg shadow-lg p-4 flex items-center justify-between gap-4">
        {/* Icône et texte */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium flex-1">
            Nouvelle version disponible
          </p>
        </div>

        {/* Bouton Actualiser */}
        <button
          onClick={applyUpdate}
          className="flex-shrink-0 bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-purple-50 active:bg-purple-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600"
          aria-label="Actualiser pour appliquer la mise à jour"
        >
          Actualiser
        </button>
      </div>
    </div>
  );
};

export default UpdatePrompt;


