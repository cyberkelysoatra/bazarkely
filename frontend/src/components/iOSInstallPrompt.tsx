import React, { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone, Download, CheckCircle } from 'lucide-react';
// TEMPORARY FIX: Comment out problematic import to prevent blocking errors
// import { safariCompatibility } from '../services/SafariCompatibility';

// TEMPORARY: Mock safariCompatibility service
const safariCompatibility = {
  isSafariOrIOS: () => {
    console.log('🍎 Safari detection temporarily disabled')
    return false
  },
  isIOSStandalone: () => {
    console.log('📱 iOS standalone detection temporarily disabled')
    return false
  },
  detectSafariVersion: () => {
    console.log('🔍 Safari version detection temporarily disabled')
    return 'unknown'
  },
  applySafariSpecificFixes: () => {
    console.log('🔧 Safari-specific fixes temporarily disabled')
  },
  getCapabilities: () => {
    console.log('🔧 Safari capabilities temporarily disabled')
    return {
      isStandalone: false,
      isSafari: false,
      isIOS: false,
      supportsPWA: false,
      supportsServiceWorker: false,
      supportsNotifications: false
    }
  },
  getInstallationMetadata: () => {
    console.log('🔧 Safari installation metadata temporarily disabled')
    return {
      canInstall: false,
      installPrompt: null,
      installSteps: [],
      requirements: []
    }
  }
}

interface iOSInstallPromptProps {
  onClose?: () => void;
  onInstall?: () => void;
  show?: boolean;
}

const IOSInstallPrompt: React.FC<iOSInstallPromptProps> = ({ 
  onClose, 
  onInstall, 
  show = true 
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [currentStep, setCurrentStep] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const capabilities = safariCompatibility.getCapabilities();
  const installation = safariCompatibility.getInstallationMetadata();

  useEffect(() => {
    // Vérifier si l'app est déjà installée
    if (capabilities.isStandalone) {
      setIsInstalled(true);
      setIsVisible(false);
    }
  }, [capabilities.isStandalone]);

  // Ne pas afficher si pas iOS ou si déjà installé
  if (!capabilities.isIOS || isInstalled || !isVisible) {
    return null;
  }

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleInstall = () => {
    setIsInstalling(true);
    onInstall?.();
    
    // Simuler le processus d'installation
    setTimeout(() => {
      setIsInstalling(false);
      setCurrentStep(1);
    }, 1000);
  };

  const handleNextStep = () => {
    if (currentStep < installation.instructions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Installation terminée
      setIsInstalled(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Installer BazarKELY sur votre iPhone
            </h3>
            <p className="text-gray-600 mb-6">
              Ajoutez BazarKELY à votre écran d'accueil pour un accès rapide et une expérience optimisée.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span>Accès hors ligne</span>
              </div>
              <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span>Notifications push</span>
              </div>
              <div className="flex items-center justify-center space-x-3 text-sm text-gray-700">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <span>Interface native</span>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Share className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Étape 1: Appuyez sur Partager
            </h3>
            <p className="text-gray-600 mb-6">
              Trouvez le bouton Partager en bas de votre écran Safari
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                <Share className="w-5 h-5" />
                <span>Bouton Partager</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Le bouton Partager ressemble à une boîte avec une flèche sortante
            </div>
          </div>
        );

      case 2:
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Étape 2: Sélectionnez "Sur l'écran d'accueil"
            </h3>
            <p className="text-gray-600 mb-6">
              Dans le menu qui s'ouvre, cherchez l'option "Sur l'écran d'accueil"
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <Plus className="w-4 h-4" />
                  <span>Sur l'écran d'accueil</span>
                </div>
                <div className="text-xs text-gray-500">
                  Cette option peut être dans la deuxième ligne du menu
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Étape 3: Appuyez sur "Ajouter"
            </h3>
            <p className="text-gray-600 mb-6">
              Confirmez l'installation en appuyant sur "Ajouter"
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-700">
                <Download className="w-5 h-5" />
                <span>Bouton Ajouter</span>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              L'icône BazarKELY apparaîtra sur votre écran d'accueil
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderProgressBar = () => {
    const totalSteps = installation.instructions.length + 1; // +1 pour l'étape d'introduction
    const progress = ((currentStep + 1) / totalSteps) * 100;

    return (
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  const renderButtons = () => {
    if (isInstalling) {
      return (
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Installation en cours...</span>
        </div>
      );
    }

    if (isInstalled) {
      return (
        <div className="flex items-center justify-center space-x-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span>Installation terminée !</span>
        </div>
      );
    }

    if (currentStep === 0) {
      return (
        <div className="flex space-x-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Plus tard
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Installer
          </button>
        </div>
      );
    }

    return (
      <div className="flex space-x-3">
        {currentStep > 0 && (
          <button
            onClick={handlePreviousStep}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Précédent
          </button>
        )}
        <button
          onClick={handleNextStep}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {currentStep === installation.instructions.length - 1 ? 'Terminer' : 'Suivant'}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Installation iOS
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Progress Bar */}
        {currentStep > 0 && (
          <div className="px-6 pb-4">
            {renderProgressBar()}
            <div className="text-center text-sm text-gray-500">
              Étape {currentStep} sur {installation.instructions.length}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          {renderButtons()}
        </div>
      </div>
    </div>
  );
};

export default IOSInstallPrompt;