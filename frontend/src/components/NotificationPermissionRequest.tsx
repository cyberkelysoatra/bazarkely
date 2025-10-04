import React, { useState, useEffect } from 'react'
import { Bell, BellOff, X, CheckCircle, AlertCircle } from 'lucide-react'
// TEMPORARY FIX: Comment out problematic import to unblock the app
// import notificationService from '../services/notificationService'

// TEMPORARY: Mock notification service to unblock the app
const notificationService = {
  requestPermission: async (): Promise<NotificationPermission> => {
    console.log('🔔 Notification service temporarily disabled')
    return 'denied'
  },
  isSupported: (): boolean => {
    return false
  }
}

interface NotificationPermissionRequestProps {
  onPermissionGranted?: () => void
  onPermissionDenied?: () => void
  onDismiss?: () => void
  showDismiss?: boolean
}

const NotificationPermissionRequest: React.FC<NotificationPermissionRequestProps> = ({
  onPermissionGranted,
  onPermissionDenied,
  onDismiss,
  showDismiss = true
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isRequesting, setIsRequesting] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Vérifier le support des notifications
    const supported = 'Notification' in window && 'serviceWorker' in navigator
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
    }
  }, [])

  const handleRequestPermission = async () => {
    if (!isSupported) {
      return
    }

    setIsRequesting(true)

    try {
      const newPermission = await notificationService.requestPermission()
      setPermission(newPermission)

      if (newPermission === 'granted') {
        onPermissionGranted?.()
      } else {
        onPermissionDenied?.()
      }
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error)
      onPermissionDenied?.()
    } finally {
      setIsRequesting(false)
    }
  }

  const handleDismiss = () => {
    onDismiss?.()
  }

  // Ne pas afficher si les notifications ne sont pas supportées
  if (!isSupported) {
    return null
  }

  // Ne pas afficher si la permission est déjà accordée
  if (permission === 'granted') {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {permission === 'denied' ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Bell className="h-5 w-5 text-blue-500" />
          )}
        </div>
        
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">
            {permission === 'denied' ? 'Notifications Désactivées' : 'Activer les Notifications'}
          </h3>
          
          <div className="mt-2 text-sm text-gray-600">
            {permission === 'denied' ? (
              <p>
                Les notifications sont désactivées. Pour recevoir des alertes de budget et des rappels, 
                veuillez les activer dans les paramètres de votre navigateur.
              </p>
            ) : (
              <p>
                Recevez des alertes de budget, des rappels d'objectifs et des notifications importantes 
                pour mieux gérer vos finances familiales.
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            {permission === 'denied' ? (
              <button
                onClick={() => {
                  // Ouvrir les paramètres du navigateur
                  if (navigator.userAgent.includes('Chrome')) {
                    window.open('chrome://settings/content/notifications', '_blank')
                  } else if (navigator.userAgent.includes('Firefox')) {
                    window.open('about:preferences#privacy', '_blank')
                  } else if (navigator.userAgent.includes('Safari')) {
                    window.open('x-apple.systempreferences:com.apple.preference.security', '_blank')
                  }
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Bell className="h-4 w-4 mr-2" />
                Ouvrir les Paramètres
              </button>
            ) : (
              <button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRequesting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Activation...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Activer les Notifications
                  </>
                )}
              </button>
            )}

            {showDismiss && (
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="h-4 w-4 mr-2" />
                Plus tard
              </button>
            )}
          </div>

          {permission === 'denied' && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Comment réactiver les notifications
                  </h4>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Cliquez sur l'icône de cadenas ou de notification dans la barre d'adresse</li>
                      <li>Sélectionnez "Autoriser" pour les notifications</li>
                      <li>Rechargez la page</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationPermissionRequest
