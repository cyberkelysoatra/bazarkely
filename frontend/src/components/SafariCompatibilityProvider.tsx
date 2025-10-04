import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// TEMPORARY FIX: Comment out problematic import to prevent blocking errors
// import { safariCompatibility } from '../services/SafariCompatibility';
import { useDeviceDetection } from '../hooks/useDeviceDetection';
import iOSInstallPrompt from './iOSInstallPrompt';
import iOSTouchInterface from './iOSTouchInterface';
import '../styles/iOSOptimizations.css';

// TEMPORARY: Mock safariCompatibility service
const safariCompatibility = {
  isSafariOrIOS: () => {
    console.log('🍎 Safari detection temporarily disabled in SafariCompatibilityProvider')
    return false
  },
  isIOSStandalone: () => {
    console.log('📱 iOS standalone detection temporarily disabled in SafariCompatibilityProvider')
    return false
  },
  detectSafariVersion: () => {
    console.log('🔍 Safari version detection temporarily disabled in SafariCompatibilityProvider')
    return 'unknown'
  },
  applySafariSpecificFixes: () => {
    console.log('🔧 Safari-specific fixes temporarily disabled in SafariCompatibilityProvider')
  }
}

interface SafariCompatibilityContextType {
  isSafariOrIOS: boolean;
  needsIOSOptimizations: boolean;
  needsSafariFallbacks: boolean;
  deviceInfo: any;
  showInstallPrompt: boolean;
  setShowInstallPrompt: (show: boolean) => void;
}

const SafariCompatibilityContext = createContext<SafariCompatibilityContextType | undefined>(undefined);

interface SafariCompatibilityProviderProps {
  children: ReactNode;
}

export const SafariCompatibilityProvider: React.FC<SafariCompatibilityProviderProps> = ({ children }) => {
  const { 
    deviceInfo, 
    needsIOSOptimizations, 
    needsSafariFallbacks, 
    isSafariOrIOS 
  } = useDeviceDetection();
  
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialiser les optimisations spécifiques à l'appareil
    if (deviceInfo) {
      safariCompatibility.initializeDeviceOptimizations();
      setIsInitialized(true);
      
      // Afficher le prompt d'installation pour iOS si nécessaire
      if (deviceInfo.capabilities.isIOS && !deviceInfo.capabilities.isStandalone) {
        // Attendre un peu avant d'afficher le prompt
        const timer = setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [deviceInfo]);

  // Appliquer les classes CSS au body
  useEffect(() => {
    if (isInitialized && deviceInfo) {
      const classes = deviceInfo.deviceClasses;
      document.body.classList.add(...classes);
      
      return () => {
        document.body.classList.remove(...classes);
      };
    }
  }, [isInitialized, deviceInfo]);

  const contextValue: SafariCompatibilityContextType = {
    isSafariOrIOS,
    needsIOSOptimizations,
    needsSafariFallbacks,
    deviceInfo,
    showInstallPrompt,
    setShowInstallPrompt
  };

  if (!isInitialized) {
    return (
      <div className="safari-compatibility-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Initialisation de la compatibilité Safari/iOS...</p>
        </div>
      </div>
    );
  }

  return (
    <SafariCompatibilityContext.Provider value={contextValue}>
      <iOSTouchInterface>
        {children}
      </iOSTouchInterface>
      
      {showInstallPrompt && (
        <iOSInstallPrompt
          onClose={() => setShowInstallPrompt(false)}
          onInstall={() => {
            console.log('📱 Installation PWA demandée');
            setShowInstallPrompt(false);
          }}
        />
      )}
    </SafariCompatibilityContext.Provider>
  );
};

export const useSafariCompatibility = (): SafariCompatibilityContextType => {
  const context = useContext(SafariCompatibilityContext);
  if (context === undefined) {
    throw new Error('useSafariCompatibility must be used within a SafariCompatibilityProvider');
  }
  return context;
};

// Composant de chargement pour Safari/iOS
const SafariLoadingSpinner: React.FC = () => (
  <div className="safari-compatibility-loading">
    <div className="loading-spinner">
      <div className="spinner"></div>
      <p>Optimisation pour votre appareil...</p>
    </div>
    <style jsx>{`
      .safari-compatibility-loading {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      
      .loading-spinner {
        text-align: center;
        color: white;
      }
      
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      p {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }
    `}</style>
  </div>
);

export default SafariCompatibilityProvider;
