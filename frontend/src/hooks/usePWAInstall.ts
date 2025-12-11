import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { showToast } from '../services/toastService'

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
        if (!manifestResponse.ok) {
          console.warn('⚠️ Manifest.webmanifest non accessible:', manifestResponse.status)
        }
      } catch (error) {
        console.warn('⚠️ Erreur lors de la vérification du manifest:', error)
      }

      // Vérifier le service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          if (!registration || !registration.active) {
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
    const isChromium = isChromiumBrowser()
    
    // Définir isInstallable par défaut pour les navigateurs Chromium
    if (isChromium && !isInstalled) {
      setIsInstallable(true)
    }
  }, [isInstalled])

  // Vérification prolongée de beforeinstallprompt en arrière-plan
  useEffect(() => {
    let checkCount = 0
    const maxChecks = 15 // 30 secondes total (2s * 15)
    
    const intervalId = setInterval(() => {
      checkCount++
      
      if (deferredPrompt && !promptCaptured) {
        setPromptCaptured(true)
        clearInterval(intervalId)
      } else if (checkCount >= maxChecks) {
        clearInterval(intervalId)
      }
    }, 2000)
    
    return () => clearInterval(intervalId)
  }, [deferredPrompt, promptCaptured])

  // Diagnostic PWA automatique après 2 secondes
  useEffect(() => {
    const diagnosticTimeout = setTimeout(() => {
      runPWADiagnostics()
    }, 2000)
    
    return () => clearTimeout(diagnosticTimeout)
  }, [])

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

  // Vérifier si un prompt a été pré-capturé dans main.tsx
  useEffect(() => {
    const checkPreCapturedPrompt = () => {
      try {
        const savedPrompt = sessionStorage.getItem('bazarkely-pwa-prompt')
        if (savedPrompt) {
          const promptData = JSON.parse(savedPrompt)
          
          // Marquer comme installable car le prompt était disponible
          setIsInstallable(true)
          setPromptCaptured(true)
          
          // Nettoyer les données sauvegardées
          sessionStorage.removeItem('bazarkely-pwa-prompt')
          
          showToast('Installation directe disponible!', 'success')
        }
      } catch (error) {
        console.error('❌ Error checking pre-captured prompt:', error)
      }
    }

    checkPreCapturedPrompt()
  }, [])

  // Écouter l'événement beforeinstallprompt avec logging détaillé (fallback)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Empêcher l'affichage automatique du prompt
      e.preventDefault()
      
      // Stocker l'événement pour l'utiliser plus tard
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      setPromptCaptured(true)
      
      showToast('Installation directe maintenant disponible!', 'success')
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstallable(false)
      setIsInstalled(true)
      setPromptCaptured(false)
      showToast('Application installée avec succès !', 'success')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Fonction d'installation avec mécanisme d'attente et retry
  const install = useCallback(() => {
    const isChromium = isChromiumBrowser()
    
    if (deferredPrompt) {
      // Utiliser le prompt natif si disponible immédiatement
      showToast('Installation en cours...', 'info')
      
      // Appeler prompt() SYNCHRONIQUEMENT pour préserver le user gesture
      deferredPrompt.prompt()
        .then(() => {
          return deferredPrompt.userChoice
        })
        .then(({ outcome }) => {
          if (outcome === 'accepted') {
            showToast('Installation réussie!', 'success')
          } else {
            showToast('Installation annulée', 'warning')
          }
          
          setDeferredPrompt(null)
          setPromptCaptured(false)
        })
        .catch((error) => {
          console.error('❌ Erreur lors de l\'installation:', error)
          showToast('Erreur lors de l\'installation', 'error')
        })
    } else if (promptCaptured) {
      // Prompt pré-capturé mais pas d'événement natif - utiliser instructions manuelles
      showToast('Utilisez le menu du navigateur pour installer', 'info')
      
      setTimeout(() => {
        navigate('/pwa-instructions')
      }, 2000)
    } else if (isChromium) {
      // Prompt pas disponible - attendre et réessayer
      showToast('Vérification de la disponibilité de l\'installation...', 'info')
      
      let attempts = 0
      const maxAttempts = 20 // 10 secondes total (500ms * 20)
      
      const checkPrompt = setInterval(() => {
        attempts++
        
        if (deferredPrompt) {
          // Prompt est devenu disponible !
          clearInterval(checkPrompt)
          showToast('Installation disponible!', 'success')
          
          // Appeler prompt() SYNCHRONIQUEMENT pour préserver le user gesture
          deferredPrompt.prompt()
            .then(() => {
              return deferredPrompt.userChoice
            })
            .then(({ outcome }) => {
              if (outcome === 'accepted') {
                showToast('Installation réussie!', 'success')
              } else {
                showToast('Installation annulée', 'warning')
              }
              
              setDeferredPrompt(null)
              setPromptCaptured(false)
            })
            .catch((error) => {
              console.error('❌ Error during retry installation:', error)
              showToast('Erreur lors de l\'installation', 'error')
            })
        } else if (attempts >= maxAttempts) {
          // Abandonner après le nombre maximum de tentatives
          clearInterval(checkPrompt)
          showToast('Utilisez le menu du navigateur', 'warning')
          
          setTimeout(() => {
            navigate('/pwa-instructions')
          }, 2000)
        }
      }, 500)
    } else {
      // Navigateur non supporté
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

  // Note: showToast is now imported from toastService

  // Fonction de diagnostic PWA pour identifier les problèmes d'installabilité
  const runPWADiagnostics = async () => {
    const results = {
      manifest: {
        valid: false,
        errors: [] as string[],
        data: null as any
      },
      serviceWorker: {
        registered: false,
        active: false,
        errors: [] as string[]
      },
      icons: {
        valid: false,
        errors: [] as string[],
        found: [] as string[]
      },
      installable: false
    }

    try {
      // 1. Vérification du manifest
      try {
        const manifestResponse = await fetch('/manifest.webmanifest')
        if (!manifestResponse.ok) {
          results.manifest.errors.push(`❌ Manifest non accessible: ${manifestResponse.status} ${manifestResponse.statusText}`)
        } else {
          const manifest = await manifestResponse.json()
          results.manifest.data = manifest
          
          // Vérifier les champs requis
          const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons']
          for (const field of requiredFields) {
            if (!manifest[field]) {
              results.manifest.errors.push(`❌ Champ manquant dans le manifest: ${field}`)
            }
          }
          
          // Vérifier le display mode
          if (manifest.display && !['standalone', 'fullscreen'].includes(manifest.display)) {
            results.manifest.errors.push(`❌ Display mode invalide: ${manifest.display} (doit être 'standalone' ou 'fullscreen')`)
          }
          
          // Vérifier les icônes
          if (manifest.icons && Array.isArray(manifest.icons)) {
            const iconSizes = manifest.icons.map((icon: any) => icon.sizes).filter(Boolean)
            const has192 = iconSizes.some((size: string) => size.includes('192'))
            const has512 = iconSizes.some((size: string) => size.includes('512'))
            
            if (!has192) {
              results.icons.errors.push('❌ Icône 192x192 manquante')
            } else {
              results.icons.found.push('✅ Icône 192x192 trouvée')
            }
            
            if (!has512) {
              results.icons.errors.push('❌ Icône 512x512 manquante')
            } else {
              results.icons.found.push('✅ Icône 512x512 trouvée')
            }
            
            // Vérifier l'accessibilité des icônes
            for (const icon of manifest.icons) {
              if (icon.src) {
                try {
                  const iconResponse = await fetch(icon.src)
                  if (!iconResponse.ok) {
                    results.icons.errors.push(`❌ Icône non accessible: ${icon.src} (${iconResponse.status})`)
                  } else {
                    results.icons.found.push(`✅ Icône accessible: ${icon.src}`)
                  }
                } catch (error) {
                  results.icons.errors.push(`❌ Erreur lors de la vérification de l'icône ${icon.src}: ${error}`)
                }
              }
            }
          } else {
            results.icons.errors.push('❌ Aucune icône définie dans le manifest')
          }
          
          if (results.manifest.errors.length === 0) {
            results.manifest.valid = true
          }
        }
      } catch (error) {
        results.manifest.errors.push(`❌ Erreur lors de la récupération du manifest: ${error}`)
      }

      // 2. Vérification du service worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          if (registration) {
            results.serviceWorker.registered = true
            
            if (registration.active) {
              results.serviceWorker.active = true
            } else {
              results.serviceWorker.errors.push('❌ Service Worker enregistré mais non actif')
            }
          } else {
            results.serviceWorker.errors.push('❌ Aucun Service Worker enregistré')
          }
        } catch (error) {
          results.serviceWorker.errors.push(`❌ Erreur lors de la vérification du Service Worker: ${error}`)
        }
      } else {
        results.serviceWorker.errors.push('❌ Service Worker non supporté par ce navigateur')
      }

      // 3. Vérification de l'URL de démarrage
      if (results.manifest.data && results.manifest.data.start_url) {
        try {
          const startUrl = new URL(results.manifest.data.start_url, window.location.origin)
          const startResponse = await fetch(startUrl.toString(), { method: 'HEAD' })
          if (!startResponse.ok) {
            results.manifest.errors.push(`❌ URL de démarrage non accessible: ${startUrl} (${startResponse.status})`)
          }
        } catch (error) {
          results.manifest.errors.push(`❌ Erreur lors de la vérification de l'URL de démarrage: ${error}`)
        }
      }

      // 4. Calcul du statut d'installabilité global
      results.installable = results.manifest.valid && results.serviceWorker.active && results.icons.valid
      
    } catch (error) {
      console.error('❌ Erreur lors du diagnostic PWA:', error)
    }
  }

  return {
    isInstallable: isInstallable || !isInstalled,
    isInstalled,
    install,
    uninstall
  }
}

export default usePWAInstall
