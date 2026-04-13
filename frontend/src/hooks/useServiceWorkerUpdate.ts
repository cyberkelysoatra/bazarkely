/**
 * Hook pour gérer les mises à jour du Service Worker
 * Détecte les nouvelles versions disponibles et permet leur application
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface ServiceWorkerUpdateState {
  updateAvailable: boolean
  isChecking: boolean
  applyUpdate: () => Promise<void>
}

/**
 * Hook personnalisé pour gérer les mises à jour du Service Worker
 * 
 * @returns {ServiceWorkerUpdateState} État et fonction pour gérer les mises à jour
 * 
 * @example
 * ```tsx
 * const { updateAvailable, isChecking, applyUpdate } = useServiceWorkerUpdate()
 * 
 * if (updateAvailable) {
 *   return <button onClick={applyUpdate}>Mettre à jour</button>
 * }
 * ```
 */
export const useServiceWorkerUpdate = (): ServiceWorkerUpdateState => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  
  // Références pour éviter les fuites mémoire
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const updateCheckIntervalRef = useRef<number | null>(null)
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)
  // Guard: only auto-reload if user explicitly clicked update
  const userRequestedUpdateRef = useRef(false)

  /**
   * Vérifie si une mise à jour est disponible
   */
  const checkForUpdate = useCallback(async (): Promise<void> => {
    // Vérifier le support du Service Worker
    if (!('serviceWorker' in navigator)) {
      console.log('ℹ️ Service Worker non supporté par ce navigateur')
      return
    }

    setIsChecking(true)

    try {
      // Utiliser ready pour obtenir une registration fiable
      const registration = await navigator.serviceWorker.ready
      registrationRef.current = registration

      // Vérifier s'il y a un worker en attente
      if (registration.waiting) {
        console.log('🔄 Service Worker en attente détecté')
        waitingWorkerRef.current = registration.waiting
        setUpdateAvailable(true)
        setIsChecking(false)
        return
      }

      // Vérifier s'il y a un worker en cours d'installation
      if (registration.installing) {
        console.log('⚙️ Service Worker en cours d\'installation')
        const installingWorker = registration.installing

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // Nouvelle version disponible
              console.log('✅ Nouvelle version du Service Worker disponible')
              waitingWorkerRef.current = installingWorker
              setUpdateAvailable(true)
            } else {
              // Première installation
              console.log('✅ Service Worker installé pour la première fois')
            }
            setIsChecking(false)
          }
        })
        return
      }

      // Forcer une vérification de mise à jour
      try {
        await registration.update()
        console.log('🔍 Vérification de mise à jour effectuée')
      } catch (error) {
        console.warn('⚠️ Erreur lors de la vérification de mise à jour:', error)
      }

      setIsChecking(false)
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du Service Worker:', error)
      setIsChecking(false)
    }
  }, [])

  /**
   * Applique la mise à jour en envoyant skipWaiting et en rechargeant la page
   */
  const applyUpdate = useCallback(async (): Promise<void> => {
    const waitingWorker = waitingWorkerRef.current
    const registration = registrationRef.current

    if (!waitingWorker) {
      console.warn('⚠️ Aucun Service Worker en attente')
      return
    }

    try {
      console.log('🔄 Application de la mise à jour...')
      userRequestedUpdateRef.current = true

      // Envoyer le message skipWaiting au worker en attente
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })

      // Attendre que le nouveau worker prenne le contrôle
      // Le rechargement se fera automatiquement via l'événement controllerchange
    } catch (error) {
      console.error('❌ Erreur lors de l\'application de la mise à jour:', error)
      // En cas d'erreur, forcer le rechargement manuel
      window.location.reload()
    }
  }, [])

  /**
   * Écoute l'événement updatefound pour détecter les nouvelles versions
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    let registration: ServiceWorkerRegistration | null = null

    const setupUpdateListener = async () => {
      try {
        registration = await navigator.serviceWorker.ready
        registrationRef.current = registration

        // Écouter l'événement updatefound
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Nouvelle version du Service Worker détectée')
          
          const newWorker = registration?.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // Nouvelle version disponible (pas la première installation)
                console.log('✅ Nouvelle version disponible et installée')
                waitingWorkerRef.current = newWorker
                setUpdateAvailable(true)
              } else {
                // Première installation
                console.log('✅ Service Worker installé pour la première fois')
              }
            } else if (newWorker.state === 'activated') {
              console.log('✅ Nouveau Service Worker activé')
            }
          })
        })
      } catch (error) {
        console.error('❌ Erreur lors de la configuration de l\'écouteur de mise à jour:', error)
      }
    }

    setupUpdateListener()

    // Nettoyage : pas nécessaire car l'événement est attaché à la registration
    // qui persiste pendant la durée de vie de l'application
  }, [])

  /**
   * Écoute l'événement controllerchange pour recharger automatiquement
   * quand un nouveau Service Worker prend le contrôle
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    const handleControllerChange = () => {
      // Only auto-reload if user explicitly clicked the update button
      // Prevents infinite reload loop when DevTools "Update on reload" is checked
      if (!userRequestedUpdateRef.current) {
        console.log('🔄 Nouveau Service Worker a pris le contrôle (rechargement ignoré — pas déclenché par l\'utilisateur)')
        return
      }
      console.log('🔄 Nouveau Service Worker a pris le contrôle, rechargement...')
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  /**
   * Vérification périodique des mises à jour (toutes les 60 secondes)
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    // Vérification initiale
    checkForUpdate()

    // Vérification périodique toutes les 60 secondes
    updateCheckIntervalRef.current = window.setInterval(() => {
      console.log('⏰ Vérification périodique des mises à jour...')
      checkForUpdate()
    }, 60000) // 60 secondes

    return () => {
      if (updateCheckIntervalRef.current !== null) {
        clearInterval(updateCheckIntervalRef.current)
        updateCheckIntervalRef.current = null
      }
    }
  }, [checkForUpdate])

  /**
   * Vérification des mises à jour quand la page redevient visible
   * (utilisateur revient à l'application)
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page redevenue visible, vérification des mises à jour...')
        checkForUpdate()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkForUpdate])

  /**
   * Réinitialiser l'état quand une mise à jour est appliquée
   */
  useEffect(() => {
    if (!updateAvailable) {
      waitingWorkerRef.current = null
    }
  }, [updateAvailable])

  return {
    updateAvailable,
    isChecking,
    applyUpdate
  }
}

export default useServiceWorkerUpdate

















