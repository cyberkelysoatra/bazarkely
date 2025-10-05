import React, { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Share, 
  Plus, 
  X, 
  Smartphone, 
  CheckCircle, 
  Info, 
  AlertTriangle,
  ArrowDown,
  ExternalLink
} from 'lucide-react';
import {
  isStandalone,
  isIOS,
  isSafari,
  isChrome,
  isEdge,
  isFirefox,
  isMobile,
  supportsPWAInstall,
  supportsBeforeInstallPrompt,
  getInstallationMethod,
  getBrowserName,
  getDeviceType,
  shouldShowInstallPrompt,
  getInstallationInstructions,
  getDebugInfo
} from '../utils/browserDetection';

/**
 * Universal PWA Installation Prompt Component
 * 
 * This component provides a universal installation prompt that works across all browsers:
 * - Chrome/Edge: Uses native beforeinstallprompt API
 * - Safari: Shows custom instructions for "Add to Home Screen"
 * - Firefox: Shows fallback message about limited PWA support
 * - Mobile: Optimized for touch interfaces
 * - Desktop: Optimized for mouse/keyboard interaction
 */
interface InstallPromptProps {
  onClose?: () => void;
  onInstall?: () => void;
  show?: boolean;
  position?: 'top' | 'bottom';
  className?: string;
}

const InstallPrompt: React.FC<InstallPromptProps> = ({
  onClose,
  onInstall,
  show = true,
  position = 'bottom',
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);

  // Browser detection
  const browserName = getBrowserName();
  const deviceType = getDeviceType();
  const installationMethod = getInstallationMethod();
  const instructions = getInstallationInstructions();
  const shouldShow = shouldShowInstallPrompt();

  /**
   * Handle beforeinstallprompt event (Chrome/Edge)
   */
  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    console.log('🔔 beforeinstallprompt event captured');
    e.preventDefault();
    setDeferredPrompt(e);
  }, []);

  /**
   * Handle appinstalled event
   */
  const handleAppInstalled = useCallback(() => {
    console.log('✅ PWA was installed');
    setIsInstalled(true);
    setIsVisible(false);
    onInstall?.();
  }, [onInstall]);

  /**
   * Initialize event listeners
   */
  useEffect(() => {
    if (!shouldShow) {
      setIsVisible(false);
      return;
    }

    // Check if already installed
    if (isStandalone()) {
      setIsInstalled(true);
      setIsVisible(false);
      return;
    }

    // Add event listeners for native installation
    if (supportsBeforeInstallPrompt()) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }

    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [shouldShow, handleBeforeInstallPrompt, handleAppInstalled]);

  /**
   * Handle installation for native browsers (Chrome/Edge)
   */
  const handleNativeInstall = async () => {
    if (!deferredPrompt) {
      console.warn('⚠️ No deferred prompt available');
      return;
    }

    setIsInstalling(true);
    
    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`📱 User choice: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
        onInstall?.();
      } else {
        console.log('❌ User dismissed the install prompt');
      }
      
      // Clear the deferred prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('❌ Error during installation:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  /**
   * Handle installation for Safari
   */
  const handleSafariInstall = () => {
    if (deviceType === 'mobile') {
      setShowInstructions(true);
    } else {
      // Desktop Safari - show instructions
      setShowInstructions(true);
    }
  };

  /**
   * Handle installation for Firefox
   */
  const handleFirefoxInstall = () => {
    setShowInstructions(true);
  };

  /**
   * Handle close button
   */
  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  /**
   * Handle install button click
   */
  const handleInstall = () => {
    switch (installationMethod) {
      case 'native':
        handleNativeInstall();
        break;
      case 'safari':
        handleSafariInstall();
        break;
      case 'firefox':
        handleFirefoxInstall();
        break;
      default:
        console.warn('⚠️ Unsupported installation method');
    }
  };

  /**
   * Get icon for installation method
   */
  const getIcon = () => {
    switch (installationMethod) {
      case 'native':
        return <Download className="w-6 h-6" />;
      case 'safari':
        return <Share className="w-6 h-6" />;
      case 'firefox':
        return <Info className="w-6 h-6" />;
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  /**
   * Get button text based on state
   */
  const getButtonText = () => {
    if (isInstalling) return 'Installation...';
    if (isInstalled) return 'Installé';
    return instructions.buttonText;
  };

  /**
   * Render Safari instructions
   */
  const renderSafariInstructions = () => {
    if (deviceType === 'mobile') {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Share className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ajouter à l'écran d'accueil
            </h3>
            <p className="text-gray-600 mb-4">
              Suivez ces étapes pour installer BazarKELY sur votre iPhone/iPad
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Appuyez sur Partager</p>
                <p className="text-sm text-gray-600">Trouvez le bouton Partager en bas de votre écran Safari</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Sélectionnez "Sur l'écran d'accueil"</p>
                <p className="text-sm text-gray-600">Dans le menu qui s'ouvre, cherchez cette option</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Appuyez sur "Ajouter"</p>
                <p className="text-sm text-gray-600">Confirmez l'installation</p>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Installer BazarKELY
            </h3>
            <p className="text-gray-600 mb-4">
              Sur Safari Desktop, utilisez le menu pour installer l'application
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Menu Safari</p>
                <p className="text-sm text-gray-600">Cliquez sur "Safari" dans la barre de menu</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Installer BazarKELY</p>
                <p className="text-sm text-gray-600">Sélectionnez "Installer BazarKELY" dans le menu</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  /**
   * Render Firefox instructions
   */
  const renderFirefoxInstructions = () => {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Support PWA limité
          </h3>
          <p className="text-gray-600 mb-4">
            Firefox a un support limité pour les applications web progressives
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Alternatives recommandées :</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Utilisez Chrome ou Edge pour une meilleure expérience PWA</li>
              <li>• Créez un raccourci sur votre bureau</li>
              <li>• Ajoutez le site à vos favoris</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // Don't render if already installed or shouldn't show
  if (isInstalled || !shouldShow || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Main Install Prompt */}
      <div className={`
        fixed ${position === 'top' ? 'top-4' : 'bottom-4'} left-4 right-4 z-50
        bg-white rounded-xl shadow-2xl border border-gray-200
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
        ${className}
      `}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                {getIcon()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{instructions.title}</h3>
                <p className="text-sm text-gray-600">
                  {browserName} • {deviceType === 'mobile' ? 'Mobile' : 'Desktop'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-700 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Accès hors ligne</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Notifications push</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Interface native</span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Plus tard
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isInstalling && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{getButtonText()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Instructions d'installation
              </h2>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {installationMethod === 'safari' && renderSafariInstructions()}
              {installationMethod === 'firefox' && renderFirefoxInstructions()}
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPrompt;
