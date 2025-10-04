import React, { useState, useEffect } from 'react'
import { 
  Wheat, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  CloudRain,
  Sun,
  AlertTriangle,
  CheckCircle,
  Calculator,
  BarChart3,
  Leaf,
  Droplets
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { db } from '../../lib/database'
import type { User } from '../../types'
import Card from '../UI/Card'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Modal from '../UI/Modal'
import Alert from '../UI/Alert'

interface Crop {
  id: string
  name: string
  type: 'rice' | 'vanilla' | 'coffee' | 'cassava' | 'sweet_potato' | 'other'
  plantingDate: Date
  harvestDate: Date
  area: number // in hectares
  expectedYield: number // in kg per hectare
  marketPrice: number // per kg
  investmentCost: number
  maintenanceCost: number
  status: 'planning' | 'planted' | 'growing' | 'harvesting' | 'completed'
  notes: string
}

interface SeasonalForecast {
  month: string
  expectedIncome: number
  expectedExpenses: number
  weatherRisk: 'low' | 'medium' | 'high'
  recommendedActions: string[]
}

interface LoanCalculation {
  principal: number
  interestRate: number
  duration: number // in months
  monthlyPayment: number
  totalInterest: number
  totalAmount: number
}

interface AgriculturalPlannerProps {
  userId: string
}

const AgriculturalPlanner: React.FC<AgriculturalPlannerProps> = ({ userId }) => {
  const { user } = useAppStore()
  const [crops, setCrops] = useState<Crop[]>([])
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [forecast, setForecast] = useState<SeasonalForecast[]>([])
  const [loanCalculation, setLoanCalculation] = useState<LoanCalculation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form data for creating crop
  const [cropForm, setCropForm] = useState({
    name: '',
    type: 'rice' as Crop['type'],
    plantingDate: '',
    harvestDate: '',
    area: 0,
    expectedYield: 0,
    marketPrice: 0,
    investmentCost: 0,
    maintenanceCost: 0,
    notes: ''
  })

  // Form data for loan calculation
  const [loanForm, setLoanForm] = useState({
    principal: 0,
    interestRate: 0,
    duration: 12
  })

  useEffect(() => {
    loadCrops()
    generateSeasonalForecast()
  }, [userId])

  const loadCrops = async () => {
    try {
      setLoading(true)
      // Load crops from IndexedDB
      const userCrops = await db.crops?.where('userId').equals(userId).toArray() || []
      setCrops(userCrops)
    } catch (error) {
      console.error('Erreur lors du chargement des cultures:', error)
      setError('Impossible de charger les cultures')
    } finally {
      setLoading(false)
    }
  }

  const generateSeasonalForecast = () => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    const forecastData: SeasonalForecast[] = months.map((month, index) => {
      // Simulate seasonal patterns for Madagascar agriculture
      let expectedIncome = 0
      let expectedExpenses = 0
      let weatherRisk: 'low' | 'medium' | 'high' = 'low'
      let recommendedActions: string[] = []

      switch (index) {
        case 0: // Janvier - Après Noël, préparation
          expectedIncome = 500000
          expectedExpenses = 800000
          weatherRisk = 'high'
          recommendedActions = ['Préparer les semis', 'Acheter les graines', 'Préparer les outils']
          break
        case 1: // Février - Semis
          expectedIncome = 200000
          expectedExpenses = 1200000
          weatherRisk = 'high'
          recommendedActions = ['Semer le riz', 'Planter les légumes', 'Préparer l\'irrigation']
          break
        case 2: // Mars - Début de croissance
          expectedIncome = 300000
          expectedExpenses = 900000
          weatherRisk = 'medium'
          recommendedActions = ['Entretien des cultures', 'Fertilisation', 'Surveillance des maladies']
          break
        case 3: // Avril - Croissance
          expectedIncome = 400000
          expectedExpenses = 700000
          weatherRisk = 'low'
          recommendedActions = ['Irrigation régulière', 'Désherbage', 'Protection contre les ravageurs']
          break
        case 4: // Mai - Croissance
          expectedIncome = 600000
          expectedExpenses = 600000
          weatherRisk = 'low'
          recommendedActions = ['Entretien continu', 'Préparation de la récolte', 'Négociation des prix']
          break
        case 5: // Juin - Début récolte
          expectedIncome = 1500000
          expectedExpenses = 500000
          weatherRisk = 'low'
          recommendedActions = ['Récolte du riz', 'Vente des produits', 'Stockage']
          break
        case 6: // Juillet - Récolte principale
          expectedIncome = 2000000
          expectedExpenses = 400000
          weatherRisk = 'low'
          recommendedActions = ['Récolte intensive', 'Commercialisation', 'Préparation des stocks']
          break
        case 7: // Août - Fin récolte
          expectedIncome = 1800000
          expectedExpenses = 300000
          weatherRisk = 'low'
          recommendedActions = ['Fin de récolte', 'Vente des surplus', 'Préparation de la saison suivante']
          break
        case 8: // Septembre - Rentrée scolaire
          expectedIncome = 800000
          expectedExpenses = 1500000
          weatherRisk = 'medium'
          recommendedActions = ['Préparer la rentrée', 'Planifier les investissements', 'Épargner pour l\'éducation']
          break
        case 9: // Octobre - Préparation
          expectedIncome = 400000
          expectedExpenses = 600000
          weatherRisk = 'medium'
          recommendedActions = ['Préparer les terres', 'Acheter les intrants', 'Planifier la saison']
          break
        case 10: // Novembre - Préparation
          expectedIncome = 300000
          expectedExpenses = 700000
          weatherRisk = 'high'
          recommendedActions = ['Préparer les semis', 'Acheter les graines', 'Préparer l\'irrigation']
          break
        case 11: // Décembre - Noël
          expectedIncome = 1000000
          expectedExpenses = 2000000
          weatherRisk = 'high'
          recommendedActions = ['Célébrer Noël', 'Préparer la saison suivante', 'Épargner pour les fêtes']
          break
      }

      return {
        month,
        expectedIncome,
        expectedExpenses,
        weatherRisk,
        recommendedActions
      }
    })

    setForecast(forecastData)
  }

  const createCrop = async () => {
    if (!cropForm.name.trim() || cropForm.area <= 0) return

    try {
      const crop: Crop = {
        id: `crop_${Date.now()}`,
        name: cropForm.name,
        type: cropForm.type,
        plantingDate: new Date(cropForm.plantingDate),
        harvestDate: new Date(cropForm.harvestDate),
        area: cropForm.area,
        expectedYield: cropForm.expectedYield,
        marketPrice: cropForm.marketPrice,
        investmentCost: cropForm.investmentCost,
        maintenanceCost: cropForm.maintenanceCost,
        status: 'planning',
        notes: cropForm.notes
      }

      await db.crops?.add(crop)
      setCrops(prev => [...prev, crop])
      setShowCropModal(false)
      resetCropForm()
    } catch (error) {
      console.error('Erreur lors de la création de la culture:', error)
      setError('Impossible de créer la culture')
    }
  }

  const calculateLoan = () => {
    const { principal, interestRate, duration } = loanForm
    
    if (principal <= 0 || interestRate < 0 || duration <= 0) return

    const monthlyRate = interestRate / 100 / 12
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, duration)) / 
                          (Math.pow(1 + monthlyRate, duration) - 1)
    const totalAmount = monthlyPayment * duration
    const totalInterest = totalAmount - principal

    setLoanCalculation({
      principal,
      interestRate,
      duration,
      monthlyPayment,
      totalInterest,
      totalAmount
    })
  }

  const resetCropForm = () => {
    setCropForm({
      name: '',
      type: 'rice',
      plantingDate: '',
      harvestDate: '',
      area: 0,
      expectedYield: 0,
      marketPrice: 0,
      investmentCost: 0,
      maintenanceCost: 0,
      notes: ''
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getCropTypeLabel = (type: string) => {
    switch (type) {
      case 'rice': return 'Riz'
      case 'vanilla': return 'Vanille'
      case 'coffee': return 'Café'
      case 'cassava': return 'Manioc'
      case 'sweet_potato': return 'Patate douce'
      default: return 'Autre'
    }
  }

  const getCropTypeIcon = (type: string) => {
    switch (type) {
      case 'rice': return <Wheat className="w-5 h-5 text-yellow-600" />
      case 'vanilla': return <Leaf className="w-5 h-5 text-green-600" />
      case 'coffee': return <Droplets className="w-5 h-5 text-brown-600" />
      default: return <Leaf className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'text-blue-600 bg-blue-100'
      case 'planted': return 'text-green-600 bg-green-100'
      case 'growing': return 'text-yellow-600 bg-yellow-100'
      case 'harvesting': return 'text-orange-600 bg-orange-100'
      case 'completed': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return 'Planification'
      case 'planted': return 'Planté'
      case 'growing': return 'En croissance'
      case 'harvesting': return 'Récolte'
      case 'completed': return 'Terminé'
      default: return status
    }
  }

  const getWeatherRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getWeatherRiskLabel = (risk: string) => {
    switch (risk) {
      case 'low': return 'Faible'
      case 'medium': return 'Moyen'
      case 'high': return 'Élevé'
      default: return risk
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
          <h1 className="text-2xl font-bold text-gray-900">Planificateur Agricole</h1>
          <p className="text-gray-600">Planifiez vos cultures et calculez vos prêts</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowLoanModal(true)}
            icon={Calculator}
            variant="secondary"
          >
            Calculateur de Prêt
          </Button>
          <Button
            onClick={() => setShowCropModal(true)}
            icon={Wheat}
            variant="primary"
          >
            Nouvelle Culture
          </Button>
        </div>
      </div>

      {error && (
        <Alert type="error" title="Erreur">
          {error}
        </Alert>
      )}

      {/* Cultures */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Mes Cultures</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {crops.map((crop) => (
            <Card
              key={crop.id}
              variant="elevated"
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedCrop(crop)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {getCropTypeIcon(crop.type)}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{crop.name}</h3>
                    <p className="text-sm text-gray-600">{getCropTypeLabel(crop.type)}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor(crop.status)}`}>
                  {getStatusLabel(crop.status)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Superficie</span>
                  <span className="font-medium">{crop.area} ha</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Rendement attendu</span>
                  <span className="font-medium">{crop.expectedYield} kg/ha</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Prix marché</span>
                  <span className="font-medium">{formatCurrency(crop.marketPrice)}/kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Investissement</span>
                  <span className="font-medium">{formatCurrency(crop.investmentCost)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plantation</span>
                  <span className="text-gray-500">
                    {new Date(crop.plantingDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Récolte</span>
                  <span className="text-gray-500">
                    {new Date(crop.harvestDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Prévisions saisonnières */}
      <Card variant="elevated" className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Prévisions Saisonnières</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forecast.map((month, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{month.month}</h3>
                <div className={`px-2 py-1 rounded-full text-xs ${getWeatherRiskColor(month.weatherRisk)}`}>
                  {getWeatherRiskLabel(month.weatherRisk)}
                </div>
              </div>
              
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Revenus attendus</span>
                  <span className="font-medium text-green-600">{formatCurrency(month.expectedIncome)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Dépenses attendues</span>
                  <span className="font-medium text-red-600">{formatCurrency(month.expectedExpenses)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bénéfice net</span>
                  <span className={`font-medium ${month.expectedIncome - month.expectedExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(month.expectedIncome - month.expectedExpenses)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-xs font-medium text-gray-700">Actions recommandées:</h4>
                {month.recommendedActions.map((action, actionIndex) => (
                  <div key={actionIndex} className="text-xs text-gray-600 flex items-start gap-1">
                    <div className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0"></div>
                    {action}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Détails de la culture sélectionnée */}
      {selectedCrop && (
        <Card variant="elevated" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {getCropTypeIcon(selectedCrop.type)}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedCrop.name}</h2>
                <p className="text-gray-600">{getCropTypeLabel(selectedCrop.type)}</p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedCrop.status)}`}>
              {getStatusLabel(selectedCrop.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{selectedCrop.area}</div>
              <div className="text-sm text-blue-700">Hectares</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{selectedCrop.expectedYield}</div>
              <div className="text-sm text-green-700">kg/ha</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(selectedCrop.marketPrice)}
              </div>
              <div className="text-sm text-purple-700">Prix/kg</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <BarChart3 className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-orange-900">
                {formatCurrency(selectedCrop.expectedYield * selectedCrop.marketPrice * selectedCrop.area)}
              </div>
              <div className="text-sm text-orange-700">Revenu estimé</div>
            </div>
          </div>

          {selectedCrop.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{selectedCrop.notes}</p>
            </div>
          )}
        </Card>
      )}

      {/* Modal de création de culture */}
      <Modal
        isOpen={showCropModal}
        onClose={() => setShowCropModal(false)}
        title="Nouvelle Culture"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom de la culture"
            value={cropForm.name}
            onChange={(e) => setCropForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Riz de saison 2024"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type de culture
            </label>
            <select
              value={cropForm.type}
              onChange={(e) => setCropForm(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="rice">Riz</option>
              <option value="vanilla">Vanille</option>
              <option value="coffee">Café</option>
              <option value="cassava">Manioc</option>
              <option value="sweet_potato">Patate douce</option>
              <option value="other">Autre</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de plantation
              </label>
              <input
                type="date"
                value={cropForm.plantingDate}
                onChange={(e) => setCropForm(prev => ({ ...prev, plantingDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de récolte
              </label>
              <input
                type="date"
                value={cropForm.harvestDate}
                onChange={(e) => setCropForm(prev => ({ ...prev, harvestDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Superficie (hectares)"
              type="number"
              value={cropForm.area}
              onChange={(e) => setCropForm(prev => ({ ...prev, area: Number(e.target.value) }))}
              placeholder="1.5"
            />
            
            <Input
              label="Rendement attendu (kg/ha)"
              type="number"
              value={cropForm.expectedYield}
              onChange={(e) => setCropForm(prev => ({ ...prev, expectedYield: Number(e.target.value) }))}
              placeholder="3000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prix marché (MGA/kg)"
              type="number"
              value={cropForm.marketPrice}
              onChange={(e) => setCropForm(prev => ({ ...prev, marketPrice: Number(e.target.value) }))}
              placeholder="800"
              currency="MGA"
            />
            
            <Input
              label="Coût d'investissement (MGA)"
              type="number"
              value={cropForm.investmentCost}
              onChange={(e) => setCropForm(prev => ({ ...prev, investmentCost: Number(e.target.value) }))}
              placeholder="500000"
              currency="MGA"
            />
          </div>

          <Input
            label="Coût de maintenance (MGA)"
            type="number"
            value={cropForm.maintenanceCost}
            onChange={(e) => setCropForm(prev => ({ ...prev, maintenanceCost: Number(e.target.value) }))}
            placeholder="200000"
            currency="MGA"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={cropForm.notes}
              onChange={(e) => setCropForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes sur cette culture..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowCropModal(false)}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              onClick={createCrop}
              variant="primary"
              disabled={!cropForm.name.trim() || cropForm.area <= 0}
            >
              Créer la Culture
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de calcul de prêt */}
      <Modal
        isOpen={showLoanModal}
        onClose={() => setShowLoanModal(false)}
        title="Calculateur de Prêt Agricole"
        size="md"
      >
        <div className="space-y-4">
          <Alert type="info" title="Calculateur de prêt">
            Calculez les mensualités de votre prêt agricole.
          </Alert>
          
          <Input
            label="Montant du prêt (MGA)"
            type="number"
            value={loanForm.principal}
            onChange={(e) => setLoanForm(prev => ({ ...prev, principal: Number(e.target.value) }))}
            placeholder="1000000"
            currency="MGA"
          />
          
          <Input
            label="Taux d'intérêt annuel (%)"
            type="number"
            value={loanForm.interestRate}
            onChange={(e) => setLoanForm(prev => ({ ...prev, interestRate: Number(e.target.value) }))}
            placeholder="12"
          />
          
          <Input
            label="Durée (mois)"
            type="number"
            value={loanForm.duration}
            onChange={(e) => setLoanForm(prev => ({ ...prev, duration: Number(e.target.value) }))}
            placeholder="24"
          />
          
          <Button
            onClick={calculateLoan}
            variant="primary"
            className="w-full"
            disabled={loanForm.principal <= 0 || loanForm.interestRate < 0 || loanForm.duration <= 0}
          >
            Calculer
          </Button>
          
          {loanCalculation && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-3">
              <h3 className="font-semibold text-gray-900">Résultat du calcul</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Mensualité:</span>
                  <div className="font-semibold text-lg">{formatCurrency(loanCalculation.monthlyPayment)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total à payer:</span>
                  <div className="font-semibold text-lg">{formatCurrency(loanCalculation.totalAmount)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Intérêts totaux:</span>
                  <div className="font-semibold text-lg">{formatCurrency(loanCalculation.totalInterest)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Capital:</span>
                  <div className="font-semibold text-lg">{formatCurrency(loanCalculation.principal)}</div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setShowLoanModal(false)}
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

export default AgriculturalPlanner
