import React, { useState, useEffect } from 'react'
import { Bell, Settings, Clock, Shield, DollarSign, Target, AlertTriangle, Smartphone, Calendar, Home, ShoppingCart } from 'lucide-react'
import Button from './UI/Button'
import Card from './UI/Card'
import Alert from './UI/Alert'
import notificationService, { type NotificationSettings } from '../services/notificationService'
import toast from 'react-hot-toast'

interface NotificationSettingsProps {
  onClose?: () => void
}

const NotificationSettingsComponent: React.FC<NotificationSettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const currentSettings = notificationService.getSettings()
      setSettings(currentSettings)
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error)
      toast.error('Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const success = await notificationService.saveSettings(settings)
      if (success) {
        toast.success('Paramètres sauvegardés avec succès')
        onClose?.()
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: keyof NotificationSettings) => {
    if (!settings) return

    if (key === 'quietHours') {
      setSettings({
        ...settings,
        quietHours: {
          ...settings.quietHours,
          enabled: !settings.quietHours.enabled
        }
      })
    } else if (typeof settings[key] === 'boolean') {
      setSettings({
        ...settings,
        [key]: !settings[key]
      })
    }
  }

  const handleTimeChange = (field: 'start' | 'end', value: string) => {
    if (!settings) return

    setSettings({
      ...settings,
      quietHours: {
        ...settings.quietHours,
        [field]: value
      }
    })
  }

  const handleMaxDailyChange = (value: number) => {
    if (!settings) return

    setSettings({
      ...settings,
      maxDailyNotifications: Math.max(1, Math.min(20, value))
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <Alert type="error">
        <AlertTriangle className="h-4 w-4" />
        <div>
          <h4 className="font-medium">Erreur</h4>
          <p className="text-sm">Impossible de charger les paramètres de notification</p>
        </div>
      </Alert>
    )
  }

  const notificationTypes = [
    {
      key: 'budgetAlerts' as keyof NotificationSettings,
      title: 'Alertes de Budget',
      description: 'Notifications quand votre budget atteint 80% ou est dépassé',
      icon: DollarSign,
      color: 'text-red-600'
    },
    {
      key: 'goalReminders' as keyof NotificationSettings,
      title: 'Rappels d\'Objectifs',
      description: 'Rappels 3 jours avant la deadline si progression < 50%',
      icon: Target,
      color: 'text-green-600'
    },
    {
      key: 'transactionAlerts' as keyof NotificationSettings,
      title: 'Alertes de Transaction',
      description: 'Notifications pour les transactions importantes (>100,000 Ar)',
      icon: AlertTriangle,
      color: 'text-yellow-600'
    },
    {
      key: 'dailySummary' as keyof NotificationSettings,
      title: 'Résumé Quotidien',
      description: 'Résumé de vos dépenses à 20h chaque jour',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      key: 'mobileMoneyAlerts' as keyof NotificationSettings,
      title: 'Alertes Mobile Money',
      description: 'Notifications pour les transactions Orange Money, Mvola, Airtel Money',
      icon: Smartphone,
      color: 'text-purple-600'
    },
    {
      key: 'securityAlerts' as keyof NotificationSettings,
      title: 'Alertes de Sécurité',
      description: 'Notifications de sécurité et de connexion',
      icon: Shield,
      color: 'text-red-600'
    },
    {
      key: 'seasonalReminders' as keyof NotificationSettings,
      title: 'Rappels Saisonniers',
      description: 'Rappels adaptés aux saisons malgaches',
      icon: Calendar,
      color: 'text-orange-600'
    },
    {
      key: 'familyEventReminders' as keyof NotificationSettings,
      title: 'Événements Familiaux',
      description: 'Rappels pour les anniversaires et fêtes familiales',
      icon: Home,
      color: 'text-pink-600'
    },
    {
      key: 'marketDayReminders' as keyof NotificationSettings,
      title: 'Jour de Marché',
      description: 'Rappel du Zoma (marché du vendredi)',
      icon: ShoppingCart,
      color: 'text-green-600'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Bell className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Paramètres de Notifications</h2>
      </div>

      <Alert type="info">
        <Settings className="h-4 w-4" />
        <div>
          <h4 className="font-medium">Personnalisation</h4>
          <p className="text-sm">Configurez vos préférences de notification pour recevoir les alertes qui vous intéressent.</p>
        </div>
      </Alert>

      {/* Types de notifications */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Types de Notifications</h3>
        <div className="grid gap-4">
          {notificationTypes.map(({ key, title, description, icon: Icon, color }) => (
            <Card key={key} className="p-4">
              <div className="flex items-start space-x-3">
                <Icon className={`h-5 w-5 ${color} mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{title}</h4>
                    <button
                      onClick={() => handleToggle(key)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        settings[key] ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings[key] ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Heures silencieuses */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Heures Silencieuses</h3>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-600" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Activer les heures silencieuses</h4>
                <p className="text-sm text-gray-500">Les notifications seront différées pendant cette période</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('quietHours')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.quietHours.enabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.quietHours.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {settings.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Début
                </label>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) => handleTimeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin
                </label>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) => handleTimeChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Limite quotidienne */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Limite Quotidienne</h3>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Maximum de notifications par jour</h4>
              <p className="text-sm text-gray-500">Évite le spam (1-20 notifications)</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleMaxDailyChange(settings.maxDailyNotifications - 1)}
                disabled={settings.maxDailyNotifications <= 1}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="w-12 text-center font-medium">{settings.maxDailyNotifications}</span>
              <button
                onClick={() => handleMaxDailyChange(settings.maxDailyNotifications + 1)}
                disabled={settings.maxDailyNotifications >= 20}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={saving}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sauvegarde...
            </>
          ) : (
            'Sauvegarder'
          )}
        </Button>
      </div>
    </div>
  )
}

export default NotificationSettingsComponent
