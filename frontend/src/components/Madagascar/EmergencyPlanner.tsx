import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Shield, 
  Phone, 
  MapPin, 
  DollarSign, 
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Wind,
  Droplets,
  Home,
  Car,
  Utensils,
  Battery,
  Radio
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { db } from '../../lib/database'
import type { User } from '../../types'
import Card from '../UI/Card'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Modal from '../UI/Modal'
import Alert from '../UI/Alert'

interface EmergencyContact {
  id: string
  name: string
  phone: string
  relationship: string
  isPrimary: boolean
  location?: string
}

interface EmergencyFund {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  priority: 'critical' | 'important' | 'optional'
  category: 'food' | 'shelter' | 'medical' | 'transport' | 'communication' | 'other'
  deadline: Date
  status: 'active' | 'completed' | 'paused'
}

interface EmergencyPlan {
  id: string
  name: string
  familySize: number
  evacuationRoute: string
  meetingPoint: string
  emergencyContacts: EmergencyContact[]
  emergencyFunds: EmergencyFund[]
  supplies: EmergencySupply[]
  lastUpdated: Date
}

interface EmergencySupply {
  id: string
  name: string
  category: 'food' | 'water' | 'medical' | 'tools' | 'communication' | 'shelter'
  quantity: number
  unit: string
  isEssential: boolean
  currentStock: number
  targetStock: number
  expiryDate?: Date
}

interface EmergencyPlannerProps {
  userId: string
}

const EmergencyPlanner: React.FC<EmergencyPlannerProps> = ({ userId }) => {
  const { user } = useAppStore()
  const [emergencyPlan, setEmergencyPlan] = useState<EmergencyPlan | null>(null)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showFundModal, setShowFundModal] = useState(false)
  const [showSupplyModal, setShowSupplyModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data for emergency contact
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    relationship: '',
    isPrimary: false,
    location: ''
  })

  // Form data for emergency fund
  const [fundForm, setFundForm] = useState({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    priority: 'important' as 'critical' | 'important' | 'optional',
    category: 'food' as 'food' | 'shelter' | 'medical' | 'transport' | 'communication' | 'other',
    deadline: ''
  })

  // Form data for emergency supply
  const [supplyForm, setSupplyForm] = useState({
    name: '',
    category: 'food' as 'food' | 'water' | 'medical' | 'tools' | 'communication' | 'shelter',
    quantity: 0,
    unit: 'pièce',
    isEssential: false,
    currentStock: 0,
    targetStock: 0,
    expiryDate: ''
  })

  useEffect(() => {
    loadEmergencyPlan()
  }, [userId])

  const loadEmergencyPlan = async () => {
    try {
      setLoading(true)
      // Load emergency plan from IndexedDB
      const plan = await db.emergencyPlans?.where('userId').equals(userId).first()
      
      if (!plan) {
        // Create default emergency plan
        const defaultPlan: EmergencyPlan = {
          id: `emergency_plan_${userId}`,
          name: 'Plan d\'urgence familial',
          familySize: 4,
          evacuationRoute: 'Route principale vers Antananarivo',
          meetingPoint: 'École primaire du village',
          emergencyContacts: [],
          emergencyFunds: [],
          supplies: [],
          lastUpdated: new Date()
        }
        
        await db.emergencyPlans?.add(defaultPlan)
        setEmergencyPlan(defaultPlan)
      } else {
        setEmergencyPlan(plan)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du plan d\'urgence:', error)
      setError('Impossible de charger le plan d\'urgence')
    } finally {
      setLoading(false)
    }
  }

  const addEmergencyContact = async () => {
    if (!contactForm.name.trim() || !contactForm.phone.trim() || !emergencyPlan) return

    try {
      const newContact: EmergencyContact = {
        id: `contact_${Date.now()}`,
        name: contactForm.name,
        phone: contactForm.phone,
        relationship: contactForm.relationship,
        isPrimary: contactForm.isPrimary,
        location: contactForm.location
      }

      const updatedPlan = {
        ...emergencyPlan,
        emergencyContacts: [...emergencyPlan.emergencyContacts, newContact],
        lastUpdated: new Date()
      }

      await db.emergencyPlans?.update(emergencyPlan.id, updatedPlan)
      setEmergencyPlan(updatedPlan)
      setShowContactModal(false)
      resetContactForm()
    } catch (error) {
      console.error('Erreur lors de l\'ajout du contact:', error)
      setError('Impossible d\'ajouter le contact')
    }
  }

  const addEmergencyFund = async () => {
    if (!fundForm.name.trim() || fundForm.targetAmount <= 0 || !emergencyPlan) return

    try {
      const newFund: EmergencyFund = {
        id: `fund_${Date.now()}`,
        name: fundForm.name,
        targetAmount: fundForm.targetAmount,
        currentAmount: fundForm.currentAmount,
        priority: fundForm.priority,
        category: fundForm.category,
        deadline: new Date(fundForm.deadline),
        status: 'active'
      }

      const updatedPlan = {
        ...emergencyPlan,
        emergencyFunds: [...emergencyPlan.emergencyFunds, newFund],
        lastUpdated: new Date()
      }

      await db.emergencyPlans?.update(emergencyPlan.id, updatedPlan)
      setEmergencyPlan(updatedPlan)
      setShowFundModal(false)
      resetFundForm()
    } catch (error) {
      console.error('Erreur lors de l\'ajout du fonds:', error)
      setError('Impossible d\'ajouter le fonds')
    }
  }

  const addEmergencySupply = async () => {
    if (!supplyForm.name.trim() || supplyForm.targetStock <= 0 || !emergencyPlan) return

    try {
      const newSupply: EmergencySupply = {
        id: `supply_${Date.now()}`,
        name: supplyForm.name,
        category: supplyForm.category,
        quantity: supplyForm.quantity,
        unit: supplyForm.unit,
        isEssential: supplyForm.isEssential,
        currentStock: supplyForm.currentStock,
        targetStock: supplyForm.targetStock,
        expiryDate: supplyForm.expiryDate ? new Date(supplyForm.expiryDate) : undefined
      }

      const updatedPlan = {
        ...emergencyPlan,
        supplies: [...emergencyPlan.supplies, newSupply],
        lastUpdated: new Date()
      }

      await db.emergencyPlans?.update(emergencyPlan.id, updatedPlan)
      setEmergencyPlan(updatedPlan)
      setShowSupplyModal(false)
      resetSupplyForm()
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'approvisionnement:', error)
      setError('Impossible d\'ajouter l\'approvisionnement')
    }
  }

  const resetContactForm = () => {
    setContactForm({
      name: '',
      phone: '',
      relationship: '',
      isPrimary: false,
      location: ''
    })
  }

  const resetFundForm = () => {
    setFundForm({
      name: '',
      targetAmount: 0,
      currentAmount: 0,
      priority: 'important',
      category: 'food',
      deadline: ''
    })
  }

  const resetSupplyForm = () => {
    setSupplyForm({
      name: '',
      category: 'food',
      quantity: 0,
      unit: 'pièce',
      isEssential: false,
      currentStock: 0,
      targetStock: 0,
      expiryDate: ''
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'important': return 'text-yellow-600 bg-yellow-100'
      case 'optional': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Critique'
      case 'important': return 'Important'
      case 'optional': return 'Optionnel'
      default: return priority
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'food': return <Utensils className="w-4 h-4" />
      case 'water': return <Droplets className="w-4 h-4" />
      case 'medical': return <Shield className="w-4 h-4" />
      case 'tools': return <Home className="w-4 h-4" />
      case 'communication': return <Radio className="w-4 h-4" />
      case 'shelter': return <Home className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'food': return 'Nourriture'
      case 'water': return 'Eau'
      case 'medical': return 'Médical'
      case 'tools': return 'Outils'
      case 'communication': return 'Communication'
      case 'shelter': return 'Abri'
      default: return category
    }
  }

  const calculateReadinessScore = () => {
    if (!emergencyPlan) return 0

    let score = 0
    let maxScore = 0

    // Emergency contacts (20 points)
    maxScore += 20
    if (emergencyPlan.emergencyContacts.length >= 3) score += 20
    else if (emergencyPlan.emergencyContacts.length >= 1) score += 10

    // Emergency funds (30 points)
    maxScore += 30
    const totalFunds = emergencyPlan.emergencyFunds.reduce((sum, fund) => sum + fund.currentAmount, 0)
    const targetFunds = emergencyPlan.emergencyFunds.reduce((sum, fund) => sum + fund.targetAmount, 0)
    if (targetFunds > 0) {
      score += Math.min(30, (totalFunds / targetFunds) * 30)
    }

    // Emergency supplies (30 points)
    maxScore += 30
    const essentialSupplies = emergencyPlan.supplies.filter(s => s.isEssential)
    const suppliedEssentials = essentialSupplies.filter(s => s.currentStock >= s.targetStock).length
    if (essentialSupplies.length > 0) {
      score += (suppliedEssentials / essentialSupplies.length) * 30
    }

    // Plan completeness (20 points)
    maxScore += 20
    if (emergencyPlan.evacuationRoute && emergencyPlan.meetingPoint) score += 20

    return Math.round((score / maxScore) * 100)
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

  if (!emergencyPlan) {
    return (
      <div className="p-4 pb-20 space-y-4">
        <Alert type="error" title="Erreur">
          Impossible de charger le plan d'urgence
        </Alert>
      </div>
    )
  }

  const readinessScore = calculateReadinessScore()

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan d'Urgence Cyclone</h1>
          <p className="text-gray-600">Préparez-vous aux situations d'urgence</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowSupplyModal(true)}
            icon={Utensils}
            variant="secondary"
          >
            Approvisionnements
          </Button>
          <Button
            onClick={() => setShowFundModal(true)}
            icon={DollarSign}
            variant="secondary"
          >
            Fonds d'Urgence
          </Button>
          <Button
            onClick={() => setShowContactModal(true)}
            icon={Phone}
            variant="primary"
          >
            Contact d'Urgence
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Erreur">
          {error}
        </Alert>
      )}

      {/* Score de préparation */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Niveau de Préparation</h2>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            readinessScore >= 80 ? 'text-green-600 bg-green-100' :
            readinessScore >= 60 ? 'text-yellow-600 bg-yellow-100' :
            'text-red-600 bg-red-100'
          }`}>
            {readinessScore}%
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              readinessScore >= 80 ? 'bg-green-500' :
              readinessScore >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${readinessScore}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-600">
          {readinessScore >= 80 ? 'Excellent niveau de préparation !' :
           readinessScore >= 60 ? 'Bon niveau de préparation, quelques améliorations possibles.' :
           'Niveau de préparation insuffisant, action requise.'}
        </p>
      </Card>

      {/* Contacts d'urgence */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Contacts d'Urgence</h2>
          <Button
            onClick={() => setShowContactModal(true)}
            icon={Phone}
            variant="secondary"
            size="sm"
          >
            Ajouter
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emergencyPlan.emergencyContacts.map((contact) => (
            <div key={contact.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{contact.name}</h3>
                {contact.isPrimary && (
                  <div className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                    Principal
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">{contact.relationship}</p>
              <p className="text-sm text-gray-600 mb-1">{contact.phone}</p>
              {contact.location && (
                <p className="text-sm text-gray-500">{contact.location}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Fonds d'urgence */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Fonds d'Urgence</h2>
          <Button
            onClick={() => setShowFundModal(true)}
            icon={DollarSign}
            variant="secondary"
            size="sm"
          >
            Ajouter
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emergencyPlan.emergencyFunds.map((fund) => (
            <div key={fund.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{fund.name}</h3>
                <div className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(fund.priority)}`}>
                  {getPriorityLabel(fund.priority)}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{getCategoryLabel(fund.category)}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Actuel</span>
                  <span className="font-medium">{formatCurrency(fund.currentAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Objectif</span>
                  <span className="font-medium">{formatCurrency(fund.targetAmount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, (fund.currentAmount / fund.targetAmount) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Approvisionnements d'urgence */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Approvisionnements d'Urgence</h2>
          <Button
            onClick={() => setShowSupplyModal(true)}
            icon={Utensils}
            variant="secondary"
            size="sm"
          >
            Ajouter
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {emergencyPlan.supplies.map((supply) => (
            <div key={supply.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{supply.name}</h3>
                {supply.isEssential && (
                  <div className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                    Essentiel
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                {getCategoryIcon(supply.category)}
                {getCategoryLabel(supply.category)}
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Stock actuel</span>
                  <span className="font-medium">{supply.currentStock} {supply.unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Stock cible</span>
                  <span className="font-medium">{supply.targetStock} {supply.unit}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      supply.currentStock >= supply.targetStock ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(100, (supply.currentStock / supply.targetStock) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Informations du plan */}
      <Card variant="elevated" className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations du Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Taille de la famille</h3>
            <p className="text-gray-600">{emergencyPlan.familySize} personnes</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Point de rencontre</h3>
            <p className="text-gray-600">{emergencyPlan.meetingPoint}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Route d'évacuation</h3>
            <p className="text-gray-600">{emergencyPlan.evacuationRoute}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Dernière mise à jour</h3>
            <p className="text-gray-600">{new Date(emergencyPlan.lastUpdated).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </Card>

      {/* Modal de contact d'urgence */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title="Ajouter un Contact d'Urgence"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom complet"
            value={contactForm.name}
            onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Jean Rakoto"
          />
          
          <Input
            label="Numéro de téléphone"
            value={contactForm.phone}
            onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+261 34 12 345 67"
          />
          
          <Input
            label="Relation"
            value={contactForm.relationship}
            onChange={(e) => setContactForm(prev => ({ ...prev, relationship: e.target.value }))}
            placeholder="Ex: Frère, Voisin, Médecin"
          />
          
          <Input
            label="Localisation (optionnel)"
            value={contactForm.location}
            onChange={(e) => setContactForm(prev => ({ ...prev, location: e.target.value }))}
            placeholder="Ex: Antananarivo, Fianarantsoa"
          />
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPrimary"
              checked={contactForm.isPrimary}
              onChange={(e) => setContactForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isPrimary" className="ml-2 block text-sm text-gray-900">
              Contact principal
            </label>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowContactModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={addEmergencyContact}
              variant="primary"
              disabled={!contactForm.name.trim() || !contactForm.phone.trim()}
            >
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de fonds d'urgence */}
      <Modal
        isOpen={showFundModal}
        onClose={() => setShowFundModal(false)}
        title="Ajouter un Fonds d'Urgence"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom du fonds"
            value={fundForm.name}
            onChange={(e) => setFundForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Fonds nourriture d'urgence"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Montant cible (MGA)"
              type="number"
              value={fundForm.targetAmount}
              onChange={(e) => setFundForm(prev => ({ ...prev, targetAmount: Number(e.target.value) }))}
              placeholder="500000"
              currency="MGA"
            />
            
            <Input
              label="Montant actuel (MGA)"
              type="number"
              value={fundForm.currentAmount}
              onChange={(e) => setFundForm(prev => ({ ...prev, currentAmount: Number(e.target.value) }))}
              placeholder="100000"
              currency="MGA"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priorité
              </label>
              <select
                value={fundForm.priority}
                onChange={(e) => setFundForm(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="critical">Critique</option>
                <option value="important">Important</option>
                <option value="optional">Optionnel</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={fundForm.category}
                onChange={(e) => setFundForm(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="food">Nourriture</option>
                <option value="shelter">Abri</option>
                <option value="medical">Médical</option>
                <option value="transport">Transport</option>
                <option value="communication">Communication</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date limite
            </label>
            <input
              type="date"
              value={fundForm.deadline}
              onChange={(e) => setFundForm(prev => ({ ...prev, deadline: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowFundModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={addEmergencyFund}
              variant="primary"
              disabled={!fundForm.name.trim() || fundForm.targetAmount <= 0}
            >
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal d'approvisionnement d'urgence */}
      <Modal
        isOpen={showSupplyModal}
        onClose={() => setShowSupplyModal(false)}
        title="Ajouter un Approvisionnement d'Urgence"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom de l'article"
            value={supplyForm.name}
            onChange={(e) => setSupplyForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Riz, Eau, Médicaments"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Catégorie
              </label>
              <select
                value={supplyForm.category}
                onChange={(e) => setSupplyForm(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="food">Nourriture</option>
                <option value="water">Eau</option>
                <option value="medical">Médical</option>
                <option value="tools">Outils</option>
                <option value="communication">Communication</option>
                <option value="shelter">Abri</option>
              </select>
            </div>
            
            <Input
              label="Unité"
              value={supplyForm.unit}
              onChange={(e) => setSupplyForm(prev => ({ ...prev, unit: e.target.value }))}
              placeholder="Ex: kg, L, pièce"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stock actuel"
              type="number"
              value={supplyForm.currentStock}
              onChange={(e) => setSupplyForm(prev => ({ ...prev, currentStock: Number(e.target.value) }))}
              placeholder="0"
            />
            
            <Input
              label="Stock cible"
              type="number"
              value={supplyForm.targetStock}
              onChange={(e) => setSupplyForm(prev => ({ ...prev, targetStock: Number(e.target.value) }))}
              placeholder="10"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'expiration (optionnel)
            </label>
            <input
              type="date"
              value={supplyForm.expiryDate}
              onChange={(e) => setSupplyForm(prev => ({ ...prev, expiryDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isEssential"
              checked={supplyForm.isEssential}
              onChange={(e) => setSupplyForm(prev => ({ ...prev, isEssential: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isEssential" className="ml-2 block text-sm text-gray-900">
              Article essentiel
            </label>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowSupplyModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={addEmergencySupply}
              variant="primary"
              disabled={!supplyForm.name.trim() || supplyForm.targetStock <= 0}
            >
              Ajouter
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default EmergencyPlanner
