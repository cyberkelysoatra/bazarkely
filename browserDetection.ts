/**
 * Browser Detection Utilities for PWA Installation
 * 
 * This module provides comprehensive browser detection for PWA installation prompts.
 * It handles all major browsers and their specific PWA capabilities.
 */

/**
 * Check if the app is already installed (running in standalone mode)
 */
export const isStandalone = (): boolean => {
  // Check for standalone display mode
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check for iOS standalone mode
  if ((window.navigator as any).standalone === true) {
    return true;
  }
  
  // Check for Android standalone mode
  if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }
  
  return false;
};

/**
 * Detect iOS devices (iPhone, iPad, iPod)
 */
export const isIOS = (): boolean => {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
};

/**
 * Detect Safari browser (including iOS Safari)
 */
export const isSafari = (): boolean => {
  const userAgent = navigator.userAgent;
  return /Safari/.test(userAgent) && !/Chrome|Chromium|Edge|Firefox/.test(userAgent);
};

/**
 * Detect Chrome or Chromium-based browsers (including Edge)
 */
export const isChrome = (): boolean => {
  const userAgent = navigator.userAgent;
  return /Chrome|Chromium/.test(userAgent) && !/Edge|Edg/.test(userAgent);
};

/**
 * Detect Microsoft Edge
 */
export const isEdge = (): boolean => {
  const userAgent = navigator.userAgent;
  return /Edge|Edg/.test(userAgent);
};

/**
 * Detect Firefox browser
 */
export const isFirefox = (): boolean => {
  return navigator.userAgent.includes('Firefox');
};

/**
 * Detect mobile devices
 */
export const isMobile = (): boolean => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Check if browser supports native PWA installation
 */
export const supportsPWAInstall = (): boolean => {
  // Chrome, Edge, and other Chromium-based browsers support beforeinstallprompt
  return isChrome() || isEdge();
};

/**
 * Check if browser supports PWA features (Service Worker, etc.)
 */
export const supportsPWAFeatures = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Get browser-specific installation method
 */
export const getInstallationMethod = (): 'native' | 'safari' | 'firefox' | 'unsupported' => {
  if (isStandalone()) {
    return 'unsupported'; // Already installed
  }
  
  if (supportsPWAInstall()) {
    return 'native';
  }
  
  if (isSafari()) {
    return 'safari';
  }
  
  if (isFirefox()) {
    return 'firefox';
  }
  
  return 'unsupported';
};

/**
 * Get browser name for display purposes
 */
export const getBrowserName = (): string => {
  if (isChrome()) return 'Chrome';
  if (isEdge()) return 'Edge';
  if (isFirefox()) return 'Firefox';
  if (isSafari()) return 'Safari';
  return 'Unknown';
};

/**
 * Check if browser supports beforeinstallprompt event
 */
export const supportsBeforeInstallPrompt = (): boolean => {
  return 'onbeforeinstallprompt' in window;
};

/**
 * Get device type for installation instructions
 */
export const getDeviceType = (): 'mobile' | 'desktop' => {
  return isMobile() ? 'mobile' : 'desktop';
};

/**
 * Check if we should show installation prompt
 */
export const shouldShowInstallPrompt = (): boolean => {
  // Don't show if already installed
  if (isStandalone()) {
    return false;
  }
  
  // Don't show on unsupported browsers
  const method = getInstallationMethod();
  if (method === 'unsupported') {
    return false;
  }
  
  return true;
};

/**
 * Get installation instructions based on browser and device
 */
export const getInstallationInstructions = (): {
  title: string;
  steps: string[];
  icon: string;
  buttonText: string;
} => {
  const deviceType = getDeviceType();
  const method = getInstallationMethod();
  
  if (method === 'native') {
    return {
      title: 'Installer BazarKELY',
      steps: [
        'Cliquez sur le bouton "Installer" ci-dessous',
        'Confirmez l\'installation dans la popup de votre navigateur',
        'L\'application sera ajoutée à votre écran d\'accueil'
      ],
      icon: 'download',
      buttonText: 'Installer maintenant'
    };
  }
  
  if (method === 'safari') {
    if (deviceType === 'mobile') {
      return {
        title: 'Ajouter à l\'écran d\'accueil',
        steps: [
          'Appuyez sur le bouton Partager en bas de l\'écran',
          'Sélectionnez "Sur l\'écran d\'accueil"',
          'Appuyez sur "Ajouter" pour confirmer'
        ],
        icon: 'share',
        buttonText: 'Voir les instructions'
      };
    } else {
      return {
        title: 'Installer BazarKELY',
        steps: [
          'Cliquez sur le menu Safari (Safari > Installer BazarKELY)',
          'Ou utilisez le raccourci Cmd+Shift+I',
          'Confirmez l\'installation'
        ],
        icon: 'download',
        buttonText: 'Voir les instructions'
      };
    }
  }
  
  if (method === 'firefox') {
    return {
      title: 'Installer BazarKELY',
      steps: [
        'Firefox a un support limité pour les PWA',
        'Vous pouvez créer un raccourci sur votre bureau',
        'Ou utiliser un autre navigateur comme Chrome ou Edge'
      ],
      icon: 'info',
      buttonText: 'Comprendre'
    };
  }
  
  return {
    title: 'Installation non supportée',
    steps: ['Votre navigateur ne supporte pas l\'installation d\'applications'],
    icon: 'warning',
    buttonText: 'Fermer'
  };
};

/**
 * Debug information for development
 */
export const getDebugInfo = () => {
  return {
    userAgent: navigator.userAgent,
    isStandalone: isStandalone(),
    isIOS: isIOS(),
    isSafari: isSafari(),
    isChrome: isChrome(),
    isEdge: isEdge(),
    isFirefox: isFirefox(),
    isMobile: isMobile(),
    supportsPWAInstall: supportsPWAInstall(),
    supportsPWAFeatures: supportsPWAFeatures(),
    supportsBeforeInstallPrompt: supportsBeforeInstallPrompt(),
    installationMethod: getInstallationMethod(),
    browserName: getBrowserName(),
    deviceType: getDeviceType(),
    shouldShowPrompt: shouldShowInstallPrompt()
  };
};
