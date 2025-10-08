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

export const usePWAInstall = (): PWAInstallState => {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const navigate = useNavigate()

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

  // Écouter l'événement beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Empêcher l'affichage automatique du prompt
      e.preventDefault()
      // Stocker l'événement pour l'utiliser plus tard
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
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

  // Fonction d'installation
  const install = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('Prompt d\'installation non disponible')
      showToast('Installation non disponible sur ce navigateur', 'error')
      return
    }

    try {
      // Afficher le prompt d'installation
      await deferredPrompt.prompt()
      
      // Attendre la réponse de l'utilisateur
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('Utilisateur a accepté l\'installation')
        showToast('Installation en cours...', 'info')
      } else {
        console.log('Utilisateur a refusé l\'installation')
        showToast('Installation annulée', 'warning')
      }
      
      // Nettoyer le prompt
      setDeferredPrompt(null)
    } catch (error) {
      console.error('Erreur lors de l\'installation:', error)
      showToast('Erreur lors de l\'installation', 'error')
    }
  }, [deferredPrompt])

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
