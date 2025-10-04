import React, { useState, useEffect } from 'react'
import { 
  Users, 
  RotateCcw, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Settings
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { db } from '../../lib/database'
import type { User } from '../../types'
import Card from '../UI/Card'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Modal from '../UI/Modal'
import Alert from '../UI/Alert'

interface TontineMember {
  id: string
  name: string
  phone: string
  contribution: number
  status: 'active' | 'pending' | 'suspended' | 'completed'
  joinDate: Date
  payoutDate?: Date
  payoutAmount?: number
  avatar?: string
}

interface Tontine {
  id: string
  name: string
  description: string
  organizerId: string
  organizerName: string
  totalAmount: number
  contributionAmount: number
  frequency: 'weekly' | 'monthly' | 'quarterly'
  duration: number // in periods
  currentPeriod: number
  members: TontineMember[]
  status: 'active' | 'completed' | 'suspended'
  startDate: Date
  endDate: Date
  nextPayoutDate: Date
  rules: string[]
  currency: 'MGA' | 'EUR' | 'USD'
  createdAt: Date
}

interface TontineManagerProps {
  userId: string
}

const TontineManager: React.FC<TontineManagerProps> = ({ userId }) => {
  const { user } = useAppStore()
  const [tontines, setTontines] = useState<Tontine[]>([])
  const [selectedTontine, setSelectedTontine] = useState<Tontine | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data for creating tontine
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contributionAmount: 0,
    frequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly',
    duration: 12,
    rules: ''
  })

  useEffect(() => {
    loadTontines()
  }, [userId])

  const loadTontines = async () => {
    try {
      setLoading(true)
      // Load tontines from IndexedDB
      const userTontines = await db.tontines?.where('organizerId').equals(userId).toArray() || []
      const memberTontines = await db.tontines?.where('members.userId').equals(userId).toArray() || []
      
      // Combine and deduplicate
      const allTontines = [...userTontines, ...memberTontines]
      const uniqueTontines = allTontines.filter((tontine, index, self) => 
        index === self.findIndex(t => t.id === tontine.id)
      )
      
      setTontines(uniqueTontines)
    } catch (error) {
      console.error('Erreur lors du chargement des tontines:', error)
      setError('Impossible de charger les tontines')
    } finally {
      setLoading(false)
    }
  }

  const createTontine = async () => {
    if (!formData.name.trim() || formData.contributionAmount <= 0) return

    try {
      const totalAmount = formData.contributionAmount * formData.duration
      const startDate = new Date()
      const endDate = new Date()
      
      // Calculate end date based on frequency
      switch (formData.frequency) {
        case 'weekly':
          endDate.setDate(startDate.getDate() + (formData.duration * 7))
          break
        case 'monthly':
          endDate.setMonth(startDate.getMonth() + formData.duration)
          break
        case 'quarterly':
          endDate.setMonth(startDate.getMonth() + (formData.duration * 3))
          break
      }

      const nextPayoutDate = new Date(startDate)
      switch (formData.frequency) {
        case 'weekly':
          nextPayoutDate.setDate(startDate.getDate() + 7)
          break
        case 'monthly':
          nextPayoutDate.setMonth(startDate.getMonth() + 1)
          break
        case 'quarterly':
          nextPayoutDate.setMonth(startDate.getMonth() + 3)
          break
      }

      const tontine: Tontine = {
        id: `tontine_${Date.now()}`,
        name: formData.name,
        description: formData.description,
        organizerId: userId,
        organizerName: user?.username || 'Organisateur',
        totalAmount,
        contributionAmount: formData.contributionAmount,
        frequency: formData.frequency,
        duration: formData.duration,
        currentPeriod: 1,
        members: [{
          id: `member_${userId}`,
          name: user?.username || 'Organisateur',
          phone: user?.phone || '',
          contribution: formData.contributionAmount,
          status: 'active',
          joinDate: new Date(),
          payoutDate: nextPayoutDate,
          payoutAmount: totalAmount
        }],
        status: 'active',
        startDate,
        endDate,
        nextPayoutDate,
        rules: formData.rules.split('\n').filter(rule => rule.trim()),
        currency: 'MGA',
        createdAt: new Date()
      }

      await db.tontines?.add(tontine)
      setTontines(prev => [...prev, tontine])
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Erreur lors de la création de la tontine:', error)
      setError('Impossible de créer la tontine')
    }
  }

  const joinTontine = async () => {
    if (!joinCode.trim()) return

    try {
      // In a real app, this would validate the join code with a server
      // For now, we'll create a mock tontine
      const mockTontine: Tontine = {
        id: `tontine_${Date.now()}`,
        name: `Tontine ${joinCode}`,
        description: 'Tontine rejointe via code',
        organizerId: 'other_user',
        organizerName: 'Organisateur',
        totalAmount: 1200000,
        contributionAmount: 100000,
        frequency: 'monthly',
        duration: 12,
        currentPeriod: 3,
        members: [
          {
            id: `member_other`,
            name: 'Organisateur',
            phone: '+261 34 12 345 67',
            contribution: 100000,
            status: 'active',
            joinDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            payoutDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            payoutAmount: 1200000
          },
          {
            id: `member_${userId}`,
            name: user?.username || 'Nouveau membre',
            phone: user?.phone || '',
            contribution: 100000,
            status: 'active',
            joinDate: new Date(),
            payoutDate: new Date(Date.now() + 9 * 30 * 24 * 60 * 60 * 1000),
            payoutAmount: 1200000
          }
        ],
        status: 'active',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
        nextPayoutDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        rules: ['Paiement mensuel obligatoire', 'Absence = suspension'],
        currency: 'MGA',
        createdAt: new Date()
      }

      await db.tontines?.add(mockTontine)
      setTontines(prev => [...prev, mockTontine])
      setShowJoinModal(false)
      setJoinCode('')
    } catch (error) {
      console.error('Erreur lors de la participation à la tontine:', error)
      setError('Impossible de rejoindre la tontine')
    }
  }

  const makeContribution = async (tontineId: string) => {
    try {
      const tontine = tontines.find(t => t.id === tontineId)
      if (!tontine) return

      // In a real app, this would process the payment
      console.log(`Contribution de ${tontine.contributionAmount} MGA pour la tontine ${tontine.name}`)
      
      // Update tontine status
      const updatedTontine = {
        ...tontine,
        currentPeriod: tontine.currentPeriod + 1,
        nextPayoutDate: new Date(tontine.nextPayoutDate.getTime() + (30 * 24 * 60 * 60 * 1000))
      }

      await db.tontines?.update(tontineId, updatedTontine)
      setTontines(prev => prev.map(t => t.id === tontineId ? updatedTontine : t))
    } catch (error) {
      console.error('Erreur lors de la contribution:', error)
      setError('Impossible de faire la contribution')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      contributionAmount: 0,
      frequency: 'monthly',
      duration: 12,
      rules: ''
    })
  }

  const formatCurrency = (amount: number, currency: string = 'MGA'): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 'Hebdomadaire'
      case 'monthly': return 'Mensuel'
      case 'quarterly': return 'Trimestriel'
      default: return frequency
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'suspended': return 'text-red-600 bg-red-100'
      case 'completed': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'pending': return 'En attente'
      case 'suspended': return 'Suspendue'
      case 'completed': return 'Terminée'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="p-4 pb-20 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Tontines</h1>
          <p className="text-gray-600">Organisez vos cercles d'épargne rotatifs</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowJoinModal(true)}
            icon={Users}
            variant="secondary"
          >
            Rejoindre
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            icon={Plus}
            variant="primary"
          >
            Créer une Tontine
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Erreur">
          {error}
        </Alert>
      )}

      {/* Liste des tontines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tontines.map((tontine) => (
          <Card
            key={tontine.id}
            variant="elevated"
            className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedTontine(tontine)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{tontine.name}</h3>
                <p className="text-sm text-gray-600">{tontine.description}</p>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(tontine.status)}`}>
                {getStatusLabel(tontine.status)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Contribution</span>
                <span className="font-medium">{formatCurrency(tontine.contributionAmount, tontine.currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fréquence</span>
                <span className="font-medium">{getFrequencyLabel(tontine.frequency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Période</span>
                <span className="font-medium">{tontine.currentPeriod}/{tontine.duration}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Membres</span>
                <span className="font-medium">{tontine.members.length}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Prochaine contribution: {new Date(tontine.nextPayoutDate).toLocaleDateString('fr-FR')}
                </span>
                <div className="flex items-center gap-1">
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">
                    {Math.round(((tontine.duration - tontine.currentPeriod) / tontine.duration) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Détails de la tontine sélectionnée */}
      {selectedTontine && (
        <Card variant="elevated" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedTontine.name}</h2>
              <p className="text-gray-600">{selectedTontine.description}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => makeContribution(selectedTontine.id)}
                icon={DollarSign}
                variant="primary"
                disabled={selectedTontine.status !== 'active'}
              >
                Contribuer
              </Button>
              <Button
                icon={Settings}
                variant="secondary"
              >
                Paramètres
              </Button>
            </div>
          </div>

          {/* Informations de la tontine */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(selectedTontine.contributionAmount, selectedTontine.currency)}
              </div>
              <div className="text-sm text-blue-700">Contribution</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(selectedTontine.totalAmount, selectedTontine.currency)}
              </div>
              <div className="text-sm text-green-700">Montant total</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">
                {selectedTontine.currentPeriod}/{selectedTontine.duration}
              </div>
              <div className="text-sm text-purple-700">Périodes</div>
            </div>
          </div>

          {/* Membres de la tontine */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Membres de la tontine</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTontine.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-600">{member.phone}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      {member.status === 'active' && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {member.status === 'pending' && <Clock className="w-4 h-4 text-yellow-600" />}
                      {member.status === 'suspended' && <XCircle className="w-4 h-4 text-red-600" />}
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(member.status)}`}>
                        {getStatusLabel(member.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(member.contribution, selectedTontine.currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Règles de la tontine */}
          {selectedTontine.rules.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-medium text-gray-900">Règles de la tontine</h3>
              <ul className="space-y-1">
                {selectedTontine.rules.map((rule, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0"></div>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Modal de création */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Créer une Tontine"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la tontine"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Tontine Famille Rakoto"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description de la tontine..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Montant de contribution"
              type="number"
              value={formData.contributionAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, contributionAmount: Number(e.target.value) }))}
              placeholder="100000"
              currency="MGA"
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fréquence
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="weekly">Hebdomadaire</option>
                <option value="monthly">Mensuel</option>
                <option value="quarterly">Trimestriel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Durée (périodes)"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
              placeholder="12"
            />
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                Montant total: {formatCurrency(formData.contributionAmount * formData.duration)}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Règles (une par ligne)
            </label>
            <textarea
              value={formData.rules}
              onChange={(e) => setFormData(prev => ({ ...prev, rules: e.target.value }))}
              placeholder="Paiement mensuel obligatoire&#10;Absence = suspension&#10;..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowCreateModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={createTontine}
              variant="primary"
              disabled={!formData.name.trim() || formData.contributionAmount <= 0}
            >
              Créer la Tontine
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de participation */}
      <Modal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Rejoindre une Tontine"
        size="md"
      >
        <div className="space-y-4">
          <Alert type="info" title="Comment rejoindre">
            Demandez le code de participation à l'organisateur de la tontine.
          </Alert>
          
          <Input
            label="Code de participation"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Ex: TON123456"
          />
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowJoinModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={joinTontine}
              variant="primary"
              disabled={!joinCode.trim()}
            >
              Rejoindre
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TontineManager
