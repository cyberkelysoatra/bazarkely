import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Smartphone, Monitor, Globe } from 'lucide-react'

const PWAInstructionsPage: React.FC = () => {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoBack}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Instructions d'Installation PWA
            </h1>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Introduction */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Download className="w-8 h-8 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Installer BazarKELY comme Application
            </h2>
          </div>
          <p className="text-gray-600 mb-4">
            BazarKELY peut être installé comme une application native sur votre appareil. 
            Suivez les instructions ci-dessous selon votre navigateur.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Avantages de l'installation :</strong> Accès rapide, mode hors ligne, 
              notifications push, et expérience utilisateur améliorée.
            </p>
          </div>
        </div>

        {/* Instructions par navigateur */}
        <div className="grid gap-6">
          {/* Chrome / Edge */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Globe className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Chrome / Microsoft Edge
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">1</span>
                <p className="text-gray-700">Ouvrez BazarKELY dans Chrome ou Edge</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">2</span>
                <p className="text-gray-700">Cliquez sur l'icône <strong>+</strong> dans la barre d'adresse</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">3</span>
                <p className="text-gray-700">Sélectionnez "Installer BazarKELY" dans le menu</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">4</span>
                <p className="text-gray-700">Confirmez l'installation</p>
              </div>
            </div>
          </div>

          {/* Firefox */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Globe className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Firefox
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2 py-1 rounded-full">1</span>
                <p className="text-gray-700">Ouvrez BazarKELY dans Firefox</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2 py-1 rounded-full">2</span>
                <p className="text-gray-700">Cliquez sur l'icône <strong>+</strong> dans la barre d'adresse</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2 py-1 rounded-full">3</span>
                <p className="text-gray-700">Sélectionnez "Installer" dans le menu</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2 py-1 rounded-full">4</span>
                <p className="text-gray-700">Confirmez l'installation</p>
              </div>
            </div>
          </div>

          {/* Safari (iOS) */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Smartphone className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Safari (iPhone/iPad)
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">1</span>
                <p className="text-gray-700">Ouvrez BazarKELY dans Safari</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">2</span>
                <p className="text-gray-700">Appuyez sur l'icône <strong>Partager</strong> (carré avec flèche)</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">3</span>
                <p className="text-gray-700">Faites défiler et sélectionnez "Sur l'écran d'accueil"</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">4</span>
                <p className="text-gray-700">Appuyez sur "Ajouter"</p>
              </div>
            </div>
          </div>

          {/* Android Chrome */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Smartphone className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Chrome (Android)
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">1</span>
                <p className="text-gray-700">Ouvrez BazarKELY dans Chrome</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">2</span>
                <p className="text-gray-700">Appuyez sur le menu (3 points) en haut à droite</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">3</span>
                <p className="text-gray-700">Sélectionnez "Ajouter à l'écran d'accueil"</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">4</span>
                <p className="text-gray-700">Confirmez l'ajout</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions de désinstallation */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <div className="flex items-center space-x-3 mb-4">
            <Monitor className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Désinstaller l'Application
            </h3>
          </div>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Windows :</h4>
              <p className="text-red-700 text-sm">
                Clic droit sur l'icône de l'application → "Désinstaller"
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">macOS :</h4>
              <p className="text-red-700 text-sm">
                Glissez l'application vers la Corbeille depuis le Launchpad
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">Android :</h4>
              <p className="text-red-700 text-sm">
                Appuyez longuement sur l'icône → "Désinstaller"
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">iOS :</h4>
              <p className="text-red-700 text-sm">
                Appuyez longuement sur l'icône → "Supprimer l'application"
              </p>
            </div>
          </div>
        </div>

        {/* Note importante */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-8">
          <h4 className="font-medium text-yellow-800 mb-2">Note importante :</h4>
          <p className="text-yellow-700 text-sm">
            L'installation PWA permet d'utiliser BazarKELY comme une application native 
            avec accès hors ligne et notifications. Vos données restent synchronisées 
            avec votre compte.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PWAInstructionsPage
