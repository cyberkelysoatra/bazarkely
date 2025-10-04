import React, { useState, useEffect, useRef } from 'react'
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Languages,
  Settings
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import type { User } from '../../types'
import Card from '../UI/Card'
import Button from '../UI/Button'
import Modal from '../UI/Modal'
import Alert from '../UI/Alert'

interface VoiceCommand {
  id: string
  text: string
  language: 'fr' | 'mg'
  confidence: number
  timestamp: Date
  processed: boolean
  action?: string
  amount?: number
  category?: string
  description?: string
}

interface VoiceSettings {
  language: 'fr' | 'mg'
  autoProcess: boolean
  feedbackEnabled: boolean
  confidenceThreshold: number
  timeout: number
}

interface VoiceInterfaceProps {
  onTransactionCreate?: (data: { amount: number; category: string; description: string }) => void
  onBudgetUpdate?: (data: { category: string; amount: number }) => void
  onGoalCreate?: (data: { name: string; target: number; deadline: Date }) => void
}

const VoiceInterface: React.FC<VoiceInterfaceProps> = ({
  onTransactionCreate,
  onBudgetUpdate,
  onGoalCreate
}) => {
  const { user } = useAppStore()
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [commands, setCommands] = useState<VoiceCommand[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<VoiceSettings>({
    language: 'fr',
    autoProcess: true,
    feedbackEnabled: true,
    confidenceThreshold: 0.7,
    timeout: 5000
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthesisRef = useRef<SpeechSynthesis | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    initializeVoiceInterface()
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const initializeVoiceInterface = () => {
    // Check for speech recognition support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('La reconnaissance vocale n\'est pas supportée par ce navigateur')
      return
    }

    // Check for speech synthesis support
    if (!('speechSynthesis' in window)) {
      setError('La synthèse vocale n\'est pas supportée par ce navigateur')
      return
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    // Configure recognition
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = settings.language === 'fr' ? 'fr-FR' : 'mg-MG'

    // Initialize speech synthesis
    synthesisRef.current = window.speechSynthesis

    // Set up event listeners
    recognitionRef.current.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      setCurrentTranscript(interimTranscript)

      if (finalTranscript) {
        processVoiceCommand(finalTranscript)
        setCurrentTranscript('')
      }
    }

    recognitionRef.current.onerror = (event) => {
      console.error('Erreur de reconnaissance vocale:', event.error)
      setError(`Erreur de reconnaissance: ${event.error}`)
      setIsListening(false)
    }

    recognitionRef.current.onend = () => {
      setIsListening(false)
    }
  }

  const processVoiceCommand = (transcript: string) => {
    const command: VoiceCommand = {
      id: `cmd_${Date.now()}`,
      text: transcript,
      language: settings.language,
      confidence: 0.8, // Simulated confidence
      timestamp: new Date(),
      processed: false
    }

    // Parse the command
    const parsedCommand = parseCommand(transcript)
    if (parsedCommand) {
      command.action = parsedCommand.action
      command.amount = parsedCommand.amount
      command.category = parsedCommand.category
      command.description = parsedCommand.description
    }

    setCommands(prev => [command, ...prev.slice(0, 9)]) // Keep last 10 commands

    if (settings.autoProcess && parsedCommand) {
      executeCommand(parsedCommand)
      command.processed = true
    }

    // Provide audio feedback
    if (settings.feedbackEnabled) {
      speak(`Commande reçue: ${transcript}`)
    }
  }

  const parseCommand = (transcript: string) => {
    const text = transcript.toLowerCase()
    
    // Transaction commands
    if (text.includes('ajouter') || text.includes('dépense') || text.includes('achat')) {
      const amountMatch = text.match(/(\d+)\s*(?:mga|ariary|ar)/i)
      const amount = amountMatch ? parseInt(amountMatch[1]) : 0
      
      let category = 'Autres'
      if (text.includes('nourriture') || text.includes('manger')) category = 'Nourriture'
      else if (text.includes('transport') || text.includes('taxi')) category = 'Transport'
      else if (text.includes('santé') || text.includes('médecin')) category = 'Santé'
      else if (text.includes('éducation') || text.includes('école')) category = 'Éducation'
      
      return {
        action: 'transaction',
        amount,
        category,
        description: transcript
      }
    }

    // Budget commands
    if (text.includes('budget') || text.includes('limite')) {
      const amountMatch = text.match(/(\d+)\s*(?:mga|ariary|ar)/i)
      const amount = amountMatch ? parseInt(amountMatch[1]) : 0
      
      let category = 'Général'
      if (text.includes('nourriture')) category = 'Nourriture'
      else if (text.includes('transport')) category = 'Transport'
      
      return {
        action: 'budget',
        amount,
        category,
        description: transcript
      }
    }

    // Goal commands
    if (text.includes('objectif') || text.includes('but') || text.includes('épargne')) {
      const amountMatch = text.match(/(\d+)\s*(?:mga|ariary|ar)/i)
      const amount = amountMatch ? parseInt(amountMatch[1]) : 0
      
      return {
        action: 'goal',
        amount,
        category: 'Épargne',
        description: transcript
      }
    }

    return null
  }

  const executeCommand = (command: any) => {
    setIsProcessing(true)

    try {
      switch (command.action) {
        case 'transaction':
          if (onTransactionCreate && command.amount > 0) {
            onTransactionCreate({
              amount: command.amount,
              category: command.category,
              description: command.description
            })
            speak(`Transaction ajoutée: ${command.amount} MGA pour ${command.category}`)
          }
          break

        case 'budget':
          if (onBudgetUpdate && command.amount > 0) {
            onBudgetUpdate({
              category: command.category,
              amount: command.amount
            })
            speak(`Budget mis à jour: ${command.amount} MGA pour ${command.category}`)
          }
          break

        case 'goal':
          if (onGoalCreate && command.amount > 0) {
            onGoalCreate({
              name: command.description,
              target: command.amount,
              deadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
            })
            speak(`Objectif créé: ${command.amount} MGA`)
          }
          break

        default:
          speak('Commande non reconnue')
      }
    } catch (error) {
      console.error('Erreur lors de l\'exécution de la commande:', error)
      speak('Erreur lors de l\'exécution de la commande')
    } finally {
      setIsProcessing(false)
    }
  }

  const speak = (text: string) => {
    if (!synthesisRef.current) return

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = settings.language === 'fr' ? 'fr-FR' : 'mg-MG'
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = (event) => {
      console.error('Erreur de synthèse vocale:', event.error)
      setIsSpeaking(false)
    }

    synthesisRef.current.speak(utterance)
  }

  const startListening = () => {
    if (!recognitionRef.current) return

    try {
      recognitionRef.current.start()
      
      // Set timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        stopListening()
      }, settings.timeout)
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'écoute:', error)
      setError('Impossible de démarrer l\'écoute')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const clearCommands = () => {
    setCommands([])
  }

  const updateSettings = (newSettings: Partial<VoiceSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    
    // Update recognition language if changed
    if (recognitionRef.current && newSettings.language) {
      recognitionRef.current.lang = newSettings.language === 'fr' ? 'fr-FR' : 'mg-MG'
    }
  }

  const getLanguageLabel = (lang: string) => {
    return lang === 'fr' ? 'Français' : 'Malagasy'
  }

  const getCommandStatusIcon = (command: VoiceCommand) => {
    if (command.processed) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    } else if (command.action) {
      return <AlertCircle className="w-4 h-4 text-yellow-600" />
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />
    }
  }

  const getCommandStatusText = (command: VoiceCommand) => {
    if (command.processed) {
      return 'Exécutée'
    } else if (command.action) {
      return 'En attente'
    } else {
      return 'Non reconnue'
    }
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interface Vocale</h1>
          <p className="text-gray-600">Contrôlez BazarKELY par la voix</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowSettings(true)}
            icon={Settings}
            variant="secondary"
          >
            Paramètres
          </Button>
          <Button
            onClick={clearCommands}
            icon={RotateCcw}
            variant="secondary"
          >
            Effacer
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Erreur">
          {error}
        </Alert>
      )}

      {/* Contrôles vocaux */}
      <Card variant="elevated" className="p-6">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isListening ? (
                <MicOff className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {isListening ? 'Écoute en cours...' : 'Appuyez pour parler'}
            </h2>
            <p className="text-sm text-gray-600">
              Langue: {getLanguageLabel(settings.language)}
            </p>
          </div>

          {currentTranscript && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Transcription en cours:</p>
              <p className="font-medium text-gray-900">{currentTranscript}</p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2">
              {isSpeaking ? (
                <Volume2 className="w-5 h-5 text-green-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {isSpeaking ? 'Parle' : 'Silencieux'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckCircle className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {isProcessing ? 'Traitement...' : 'Prêt'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Commandes vocales */}
      <Card variant="elevated" className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Commandes Vocales</h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Transactions</h3>
              <p className="text-sm text-blue-700">
                "Ajouter dépense 50000 MGA nourriture"
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-900 mb-2">Budgets</h3>
              <p className="text-sm text-green-700">
                "Budget transport 100000 MGA"
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium text-purple-900 mb-2">Objectifs</h3>
              <p className="text-sm text-purple-700">
                "Objectif épargne 500000 MGA"
              </p>
            </div>
          </div>

          {commands.length > 0 ? (
            <div className="space-y-2">
              {commands.map((command) => (
                <div key={command.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{command.text}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(command.timestamp).toLocaleTimeString('fr-FR')} • 
                      {command.action && ` ${command.action}`}
                      {command.amount && ` • ${command.amount} MGA`}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getCommandStatusIcon(command)}
                    <span className="text-sm text-gray-600">
                      {getCommandStatusText(command)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Mic className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune commande vocale enregistrée</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modal des paramètres */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Paramètres Vocaux"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Langue
            </label>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value as 'fr' | 'mg' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="fr">Français</option>
              <option value="mg">Malagasy</option>
            </select>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoProcess"
              checked={settings.autoProcess}
              onChange={(e) => updateSettings({ autoProcess: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="autoProcess" className="ml-2 block text-sm text-gray-900">
              Traitement automatique des commandes
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="feedbackEnabled"
              checked={settings.feedbackEnabled}
              onChange={(e) => updateSettings({ feedbackEnabled: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="feedbackEnabled" className="ml-2 block text-sm text-gray-900">
              Retour audio activé
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seuil de confiance
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={settings.confidenceThreshold}
              onChange={(e) => updateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-sm text-gray-600">
              {Math.round(settings.confidenceThreshold * 100)}%
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeout (secondes)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={settings.timeout / 1000}
              onChange={(e) => updateSettings({ timeout: parseInt(e.target.value) * 1000 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowSettings(false)}
              variant="secondary"
            >
              Fermer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default VoiceInterface
