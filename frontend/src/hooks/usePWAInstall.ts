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
  const [promptCaptured, setPromptCaptured] = useState(false)
  const navigate = useNavigate()

  // Vérification du manifest et service worker
  useEffect(() => {
    const verifyPWARequirements = async () => {
      try {
        // Vérifier le manifest
        const manifestResponse = await fetch('/manifest.webmanifest')
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json()
          console.log('✅ Manifest.webmanifest accessible et valide:', manifest.name || 'BazarKELY')
        } else {
          console.warn('⚠️ Manifest.webmanifest non accessible:', manifestResponse.status)
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la vérification du manifest:', error)
      }

      // Vérifier le service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          if (registration && registration.active) {
            console.log('✅ Service Worker enregistré et actif')
          } else {
            console.warn('⚠️ Service Worker non enregistré ou inactif')
          }
        } catch (error) {
          console.warn('⚠️ Erreur lors de la vérification du Service Worker:', error)
        }
      } else {
        console.warn('⚠️ Service Worker non supporté par ce navigateur')
      }
    }

    verifyPWARequirements()
  }, [])

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

  // Vérification prolongée de beforeinstallprompt en arrière-plan
  useEffect(() => {
    let checkCount = 0
    const maxChecks = 15 // 30 secondes total (2s * 15)
    
    const intervalId = setInterval(() => {
      checkCount++
      console.log(`Background check ${checkCount}/${maxChecks} for beforeinstallprompt - Prompt captured: ${promptCaptured}`)
      
      if (deferredPrompt && !promptCaptured) {
        console.log('✅ Prompt captured during background check')
        setPromptCaptured(true)
        clearInterval(intervalId)
      } else if (checkCount >= maxChecks) {
        console.log('⚠️ No prompt after 30 seconds of waiting')
        clearInterval(intervalId)
      }
    }, 2000)
    
    return () => clearInterval(intervalId)
  }, [deferredPrompt, promptCaptured])

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

  // Écouter l'événement beforeinstallprompt avec logging détaillé
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Empêcher l'affichage automatique du prompt
      e.preventDefault()
      
      const eventDetails = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
      
      console.log(`🎉 beforeinstallprompt event fired at ${eventDetails.timestamp}`)
      console.log('Event details:', eventDetails)
      
      // Stocker l'événement pour l'utiliser plus tard
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      setPromptCaptured(true)
      
      showToast('Installation directe maintenant disponible!', 'success')
      console.log('✅ Prompt captured and stored in deferredPrompt state')
    }

    const handleAppInstalled = () => {
      console.log('🎉 PWA installée avec succès')
      setDeferredPrompt(null)
      setIsInstallable(false)
      setIsInstalled(true)
      setPromptCaptured(false)
      showToast('Application installée avec succès !', 'success')
    }

    console.log('🔍 Setting up beforeinstallprompt event listener')
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      console.log('🧹 Cleaning up beforeinstallprompt event listeners')
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Fonction d'installation avec mécanisme d'attente et retry
  const install = useCallback(async () => {
    const browser = getUserBrowser()
    const isChromium = isChromiumBrowser()
    
    console.log(`🚀 Install button clicked - Prompt available: ${!!deferredPrompt}, Browser: ${browser}, Prompt captured: ${promptCaptured}`)
    console.log(`DeferredPrompt state at click:`, deferredPrompt)
    
    if (deferredPrompt) {
      // Utiliser le prompt natif si disponible immédiatement
      try {
        console.log('✅ Using native install prompt immediately')
        showToast('Installation en cours...', 'info')
        
        await deferredPrompt.prompt()
        
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
          console.log('✅ Utilisateur a accepté l\'installation')
          showToast('Installation réussie!', 'success')
        } else {
          console.log('❌ Utilisateur a refusé l\'installation')
          showToast('Installation annulée', 'warning')
        }
        
        setDeferredPrompt(null)
        setPromptCaptured(false)
      } catch (error) {
        console.error('❌ Erreur lors de l\'installation:', error)
        showToast('Erreur lors de l\'installation', 'error')
      }
    } else if (isChromium) {
      // Prompt pas disponible - attendre et réessayer
      console.log('⏳ No native prompt available, starting wait-and-retry mechanism')
      showToast('Vérification de la disponibilité de l\'installation...', 'info')
      
      let attempts = 0
      const maxAttempts = 20 // 10 secondes total (500ms * 20)
      
      const checkPrompt = setInterval(async () => {
        attempts++
        console.log(`🔄 Retry attempt ${attempts}/${maxAttempts} - Checking for prompt (${attempts * 500}ms elapsed)`)
        
        if (deferredPrompt) {
          // Prompt est devenu disponible !
          clearInterval(checkPrompt)
          console.log('🎉 Prompt now available, triggering installation immediately')
          showToast('Installation disponible!', 'success')
          
          try {
            await deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            
            if (outcome === 'accepted') {
              console.log('✅ Installation accepted during retry')
              showToast('Installation réussie!', 'success')
            } else {
              console.log('❌ Installation rejected during retry')
              showToast('Installation annulée', 'warning')
            }
            
            setDeferredPrompt(null)
            setPromptCaptured(false)
          } catch (error) {
            console.error('❌ Error during retry installation:', error)
            showToast('Erreur lors de l\'installation', 'error')
          }
        } else if (attempts >= maxAttempts) {
          // Abandonner après le nombre maximum de tentatives
          clearInterval(checkPrompt)
          console.log('⏰ Prompt not available after 10 seconds, redirecting to instructions')
          showToast('Utilisez le menu du navigateur', 'warning')
          
          setTimeout(() => {
            console.log('🔗 Redirecting to PWA instructions page')
            navigate('/pwa-instructions')
          }, 2000)
        }
      }, 500)
    } else {
      // Navigateur non supporté
      console.log('❌ Browser not supported for PWA installation')
      showToast('Installation non disponible sur ce navigateur', 'error')
      navigate('/pwa-instructions')
    }
  }, [deferredPrompt, navigate, promptCaptured])

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
