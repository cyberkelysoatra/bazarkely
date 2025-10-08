import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallState {
  isInstallable: boolean
  isInstalled: boolean
  install: () => Promise<void>
  uninstall: () => void
}

// Fonctions de détection de navigateur
const isChromiumBrowser = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase()
  const hasChrome = userAgent.includes('chrome') || userAgent.includes('chromium') || userAgent.includes('edg')
  const hasWindowChrome = typeof window !== 'undefined' && 'chrome' in window
  const isNotFirefox = !userAgent.includes('firefox')
  const isNotSafari = !userAgent.includes('safari') || userAgent.includes('chrome')
  
  return (hasChrome || hasWindowChrome) && isNotFirefox && isNotSafari
}

const isBraveDetected = (): boolean => {
  return typeof navigator !== 'undefined' && 
         'brave' in navigator && 
         typeof (navigator as any).brave === 'object'
}

const getUserBrowser = (): string => {
  const userAgent = navigator.userAgent.toLowerCase()
  
  if (isBraveDetected()) return 'Brave'
  if (userAgent.includes('edg')) return 'Edge'
  if (userAgent.includes('chrome')) return 'Chrome'
  if (userAgent.includes('firefox')) return 'Firefox'
  if (userAgent.includes('safari')) return 'Safari'
  if (userAgent.includes('opera')) return 'Opera'
  
  return 'Unknown'
}

export const usePWAInstall = (): PWAInstallState => {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const navigate = useNavigate()

  // Initialisation avec détection de navigateur et logging
  useEffect(() => {
    const browser = getUserBrowser()
    const isChromium = isChromiumBrowser()
    const isBrave = isBraveDetected()
    
    console.log(`PWA Install Hook initialized - Browser: ${browser}, Chromium: ${isChromium}, Brave: ${isBrave}`)
    
    // Définir isInstallable par défaut pour les navigateurs Chromium
    if (isChromium && !isInstalled) {
      setIsInstallable(true)
      console.log('isInstallable set to true - Reason: Chromium browser detected')
    }
  }, [isInstalled])

  // Détecter si l'app est déjà installée
  useEffect(() => {
    const checkInstalled = () => {
      // Vérifier si l'app est en mode standalone (installée)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      // Vérifier si l'app est lancée depuis l'écran d'accueil
      const isFromHomeScreen = window.navigator.standalone === true
      
      setIsInstalled(isStandalone || isFromHomeScreen)
    }

    checkInstalled()

    // Écouter les changements de mode d'affichage
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayModeChange = () => checkInstalled()
    
    mediaQuery.addEventListener('change', handleDisplayModeChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleDisplayModeChange)
    }
  }, [])

  // Écouter l'événement beforeinstallprompt (amélioration, pas requis)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Empêcher l'affichage automatique du prompt
      e.preventDefault()
      // Stocker l'événement pour l'utiliser plus tard
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      console.log(`beforeinstallprompt event fired at ${new Date().toISOString()}`)
    }

    const handleAppInstalled = () => {
      console.log('PWA installée avec succès')
      setDeferredPrompt(null)
      setIsInstallable(false)
      setIsInstalled(true)
      showToast('Application installée avec succès !', 'success')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Fonction d'installation avec fallback vers instructions
  const install = useCallback(async () => {
    const browser = getUserBrowser()
    const isChromium = isChromiumBrowser()
    
    console.log(`Install button clicked - Prompt available: ${!!deferredPrompt}, Browser: ${browser}`)
    
    if (deferredPrompt) {
      // Utiliser le prompt natif si disponible
      try {
        console.log('Using native install prompt')
        await deferredPrompt.prompt()
        
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
          console.log('Utilisateur a accepté l\'installation')
          showToast('Installation en cours...', 'info')
        } else {
          console.log('Utilisateur a refusé l\'installation')
          showToast('Installation annulée', 'warning')
        }
        
        setDeferredPrompt(null)
      } catch (error) {
        console.error('Erreur lors de l\'installation:', error)
        showToast('Erreur lors de l\'installation', 'error')
      }
    } else if (isChromium) {
      // Fallback pour navigateurs Chromium sans prompt natif
      console.log('No native prompt available, redirecting to instructions for Chromium browser')
      showToast('L\'installation n\'est pas encore disponible, redirection vers les instructions...', 'info')
      
      // Attendre 2 secondes pour que l'utilisateur lise le message
      setTimeout(() => {
        console.log('Redirecting to PWA instructions page')
        navigate('/pwa-instructions')
      }, 2000)
    } else {
      // Navigateur non supporté
      console.log('Browser not supported for PWA installation')
      showToast('Installation non disponible sur ce navigateur', 'error')
      navigate('/pwa-instructions')
    }
  }, [deferredPrompt, navigate])

  // Fonction de désinstallation
  const uninstall = useCallback(() => {
    if (isInstalled) {
      // Rediriger vers la page d'instructions de désinstallation
      navigate('/pwa-instructions')
      showToast('Instructions de désinstallation affichées', 'info')
    } else {
      showToast('Application non installée', 'warning')
    }
  }, [isInstalled, navigate])

  // Fonction pour afficher les toasts
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    // Utiliser le système de notification existant si disponible
    if (typeof window !== 'undefined' && window.alert) {
      // Fallback vers alert si pas de système de toast
      window.alert(message)
    }
    
    // Log pour le debugging
    console.log(`Toast ${type}:`, message)
  }

  return {
    isInstallable: isInstallable || !isInstalled,
    isInstalled,
    install,
    uninstall
  }
}

export default usePWAInstall
