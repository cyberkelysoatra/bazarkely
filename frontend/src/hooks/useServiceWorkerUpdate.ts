/**
 * Hook pour gérer les mises à jour du Service Worker
 * Détecte les nouvelles versions disponibles et permet leur application
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-hot-toast'

interface ServiceWorkerUpdateState {
  updateAvailable: boolean
  isChecking: boolean
  applyUpdate: () => Promise<void>
}

/** Clés sessionStorage pour le rechargement automatique de mise à jour. */
const RELOAD_GUARD_KEY = 'bk_sw_reload_ts'   // anti-boucle (horodatage du dernier reload auto)
const JUST_UPDATED_KEY = 'bk_just_updated'   // drapeau « on vient de se mettre à jour » → toast au remontage

/**
 * Recharge la page pour appliquer la nouvelle version, de façon SÛRE :
 *  - anti-boucle : jamais 2 rechargements auto à moins de 10 s (protège des cas type
 *    DevTools « Update on reload ») ;
 *  - pose un drapeau pour afficher un toast de confirmation après le rechargement.
 * Ne touche à AUCUNE donnée (IndexedDB/Dexie/localStorage métier intacts).
 */
function safeReloadForUpdate(): void {
  try {
    const now = Date.now()
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0')
    if (now - last < 10000) {
      console.warn('🔁 [SW] Rechargement auto ignoré (anti-boucle <10s)')
      return
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now))
    sessionStorage.setItem(JUST_UPDATED_KEY, '1')
  } catch {
    /* sessionStorage indisponible : on recharge quand même */
  }
  window.location.reload()
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
  // Distingue la TOUTE PREMIÈRE prise de contrôle (install initiale, aucune ancienne
  // version à remplacer → PAS de rechargement) d'une vraie mise à jour (→ rechargement).
  // `controller` est null tant qu'aucun SW ne contrôle encore la page (1ʳᵉ visite).
  const firstInstallRef = useRef(
    typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? !navigator.serviceWorker.controller
      : false
  )

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

      // Forcer une vérification de mise à jour (skip si offline — éviter le bruit console
      // `Failed to update a ServiceWorker` qui pollue chaque cycle de polling en mode hors-ligne)
      if (typeof navigator === 'undefined' || navigator.onLine) {
        try {
          await registration.update()
          console.log('🔍 Vérification de mise à jour effectuée')
        } catch (error) {
          console.warn('⚠️ Erreur lors de la vérification de mise à jour:', error)
        }
      } else {
        console.log('⏸️ [SW] Vérification de mise à jour skipped — offline')
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

      // Envoyer le message skipWaiting au worker en attente (redondant avec le skipWaiting
      // automatique du SW à l'install, mais conservé pour les anciens clients en transition).
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
      // 1ʳᵉ prise de contrôle (install initiale) : la page affiche déjà la version courante
      // → ne PAS recharger (et ne plus considérer les suivantes comme « première »).
      if (firstInstallRef.current) {
        firstInstallRef.current = false
        console.log('✅ Service Worker a pris le contrôle (1ʳᵉ installation, pas de rechargement)')
        return
      }
      // Vraie mise à jour : le nouveau SW (auto-activé) contrôle désormais la page →
      // rechargement AUTOMATIQUE et sûr pour charger 100% du code neuf.
      console.log('🔄 Nouvelle version active — rechargement automatique…')
      safeReloadForUpdate()
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  /**
   * Au remontage après un rechargement automatique de mise à jour : confirmer à
   * l'utilisateur (toast discret) que l'application est désormais à jour.
   */
  useEffect(() => {
    try {
      if (sessionStorage.getItem(JUST_UPDATED_KEY) === '1') {
        sessionStorage.removeItem(JUST_UPDATED_KEY)
        toast.success('Application mise à jour ✅', { duration: 3000, position: 'top-center' })
      }
    } catch {
      /* sessionStorage indisponible : pas de toast, sans gravité */
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

















