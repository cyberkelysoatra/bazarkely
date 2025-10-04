import React, { useState, useEffect } from 'react'
import { 
  Calendar, 
  Download, 
  FileText, 
  BarChart3, 
  PieChart,
  TrendingUp,
  Users,
  Smartphone,
  Shield,
  Leaf,
  DollarSign,
  Target
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { db } from '../../lib/database'
import type { Transaction, Budget, Goal, Account } from '../../types'
import Card from '../UI/Card'
import Button from '../UI/Button'
import Input from '../UI/Input'
import Alert from '../UI/Alert'
import pdfExportService from '../../services/pdfExportService'

interface ReportConfig {
  title: string
  period: {
    start: Date
    end: Date
  }
  sections: {
    summary: boolean
    transactions: boolean
    budgets: boolean
    goals: boolean
    analytics: boolean
    recommendations: boolean
    charts: boolean
  }
  format: 'A4' | 'A5'
  language: 'fr' | 'mg'
}

interface ReportData {
  user: any
  accounts: Account[]
  transactions: Transaction[]
  budgets: Budget[]
  goals: Goal[]
  analytics: {
    totalIncome: number
    totalExpenses: number
    netIncome: number
    budgetUtilization: number
    goalProgress: number
    mobileMoneyUsage: number
    seasonalAdjustment: number
    financialHealthScore: number
    emergencyFundAdequacy: number
  }
}

const ReportGenerator: React.FC = () => {
  const { user } = useAppStore()
  const [config, setConfig] = useState<ReportConfig>({
    title: 'Rapport Financier Personnalisé',
    period: {
      start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
      end: new Date()
    },
    sections: {
      summary: true,
      transactions: true,
      budgets: true,
      goals: true,
      analytics: true,
      recommendations: true,
      charts: true
    },
    format: 'A4',
    language: 'fr'
  })
  
  const [generating, setGenerating] = useState(false)
  const [previewData, setPreviewData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadPreviewData()
    }
  }, [user, config.period])

  const loadPreviewData = async () => {
    if (!user) return

    try {
      const data = await prepareReportData()
      setPreviewData(data)
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err)
    }
  }

  const prepareReportData = async (): Promise<ReportData> => {
    if (!user) throw new Error('Utilisateur non trouvé')

    const accounts = await db.accounts.where('userId').equals(user.id).toArray()
    const transactions = await db.transactions
      .where('userId')
      .equals(user.id)
      .filter(t => {
        const date = new Date(t.createdAt)
        return date >= config.period.start && date <= config.period.end
      })
      .toArray()
    
    const budgets = await db.budgets.where('userId').equals(user.id).toArray()
    const goals = await db.goals.where('userId').equals(user.id).toArray()

    // Calcul des analytics
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const netIncome = totalIncome - totalExpenses
    
    const budgetUtilization = budgets.length > 0 
      ? budgets.reduce((sum, b) => sum + ((b.currentSpent || 0) / b.limit) * 100, 0) / budgets.length
      : 0
    
    const goalProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + ((g.currentAmount || 0) / g.targetAmount) * 100, 0) / goals.length
      : 0
    
    const mobileMoneyUsage = transactions
      .filter(t => t.category.toLowerCase().includes('mobile money') || 
                  t.category.toLowerCase().includes('orange money') ||
                  t.category.toLowerCase().includes('mvola') ||
                  t.category.toLowerCase().includes('airtel'))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
    const emergencyFundAdequacy = totalExpenses > 0 
      ? Math.min(100, (totalBalance / (totalExpenses * 6)) * 100)
      : 0
    
    const financialHealthScore = calculateFinancialHealthScore(
      netIncome,
      budgetUtilization,
      goalProgress,
      mobileMoneyUsage / totalExpenses
    )

    const currentMonth = new Date().getMonth() + 1
    const seasonalAdjustment = calculateSeasonalAdjustment(currentMonth)

    return {
      user,
      accounts,
      transactions,
      budgets,
      goals,
      analytics: {
        totalIncome,
        totalExpenses,
        netIncome,
        budgetUtilization,
        goalProgress,
        mobileMoneyUsage,
        seasonalAdjustment,
        financialHealthScore,
        emergencyFundAdequacy
      }
    }
  }

  const calculateFinancialHealthScore = (
    netIncome: number,
    budgetUtilization: number,
    goalProgress: number,
    mobileMoneyRatio: number
  ): number => {
    let score = 0
    
    if (netIncome > 0) score += 40
    else if (netIncome > -50000) score += 20
    
    if (budgetUtilization <= 80) score += 30
    else if (budgetUtilization <= 100) score += 20
    else if (budgetUtilization <= 120) score += 10
    
    if (goalProgress >= 80) score += 20
    else if (goalProgress >= 60) score += 15
    else if (goalProgress >= 40) score += 10
    
    if (mobileMoneyRatio <= 0.3) score += 10
    else if (mobileMoneyRatio <= 0.5) score += 5
    
    return Math.min(100, Math.max(0, score))
  }

  const calculateSeasonalAdjustment = (month: number): number => {
    const adjustments = {
      1: 1.2, 2: 1.1, 3: 0.9, 4: 0.8, 5: 0.9, 6: 1.0,
      7: 1.0, 8: 1.1, 9: 1.3, 10: 1.0, 11: 1.1, 12: 1.4
    }
    return (adjustments[month as keyof typeof adjustments] || 1.0) * 100
  }

  const handleGenerateReport = async () => {
    if (!user) return

    try {
      setGenerating(true)
      setError(null)

      const blob = await pdfExportService.generateCustomReport(
        user.id,
        config.period.start,
        config.period.end
      )
      
      const filename = `rapport-personnalise-${config.period.start.toISOString().split('T')[0]}-${config.period.end.toISOString().split('T')[0]}.pdf`
      await pdfExportService.downloadReport(blob, filename)
    } catch (err) {
      setError('Erreur lors de la génération du rapport')
      console.error('Erreur:', err)
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Générateur de Rapports</h1>
      </div>

      {error && (
        <Alert type="error" title="Erreur">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration du rapport */}
        <Card variant="elevated" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration du Rapport</h2>
          
          <div className="space-y-4">
            <Input
              label="Titre du rapport"
              value={config.title}
              onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Rapport Financier Personnalisé"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={config.period.start.toISOString().split('T')[0]}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    period: { ...prev.period, start: new Date(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={config.period.end.toISOString().split('T')[0]}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    period: { ...prev.period, end: new Date(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format
                </label>
                <select
                  value={config.format}
                  onChange={(e) => setConfig(prev => ({ ...prev, format: e.target.value as 'A4' | 'A5' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="A4">A4 (Standard)</option>
                  <option value="A5">A5 (Compact)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Langue
                </label>
                <select
                  value={config.language}
                  onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value as 'fr' | 'mg' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="fr">Français</option>
                  <option value="mg">Malagasy</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Sections à inclure */}
        <Card variant="elevated" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sections à Inclure</h2>
          
          <div className="space-y-3">
            {Object.entries(config.sections).map(([key, value]) => {
              const labels = {
                summary: 'Résumé financier',
                transactions: 'Liste des transactions',
                budgets: 'Budgets par catégorie',
                goals: 'Objectifs d\'épargne',
                analytics: 'Analytics avancées',
                recommendations: 'Recommandations',
                charts: 'Graphiques et visualisations'
              }
              
              const icons = {
                summary: <DollarSign className="w-4 h-4" />,
                transactions: <FileText className="w-4 h-4" />,
                budgets: <BarChart3 className="w-4 h-4" />,
                goals: <Target className="w-4 h-4" />,
                analytics: <TrendingUp className="w-4 h-4" />,
                recommendations: <Shield className="w-4 h-4" />,
                charts: <PieChart className="w-4 h-4" />
              }

              return (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      sections: { ...prev.sections, [key]: e.target.checked }
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  {icons[key as keyof typeof icons]}
                  <span className="text-sm text-gray-700">
                    {labels[key as keyof typeof labels]}
                  </span>
                </label>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Aperçu des données */}
      {previewData && (
        <Card variant="elevated" className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Aperçu des Données</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <DollarSign className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(previewData.analytics.totalIncome)}
              </div>
              <div className="text-sm text-blue-700">Revenus</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <BarChart3 className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-900">
                {formatCurrency(previewData.analytics.totalExpenses)}
              </div>
              <div className="text-sm text-red-700">Dépenses</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">
                {formatCurrency(previewData.analytics.netIncome)}
              </div>
              <div className="text-sm text-green-700">Épargne</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Target className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-900">
                {previewData.analytics.financialHealthScore.toFixed(0)}/100
              </div>
              <div className="text-sm text-purple-700">Score Santé</div>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            <p><strong>Période:</strong> {formatDate(config.period.start)} au {formatDate(config.period.end)}</p>
            <p><strong>Transactions:</strong> {previewData.transactions.length}</p>
            <p><strong>Budgets:</strong> {previewData.budgets.length}</p>
            <p><strong>Objectifs:</strong> {previewData.goals.length}</p>
          </div>
        </Card>
      )}

      {/* Bouton de génération */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerateReport}
          loading={generating}
          disabled={generating}
          size="lg"
          icon={Download}
          variant="primary"
        >
          {generating ? 'Génération en cours...' : 'Générer le Rapport PDF'}
        </Button>
      </div>

      {/* Informations sur l'export */}
      <Card variant="outlined" className="p-4">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-blue-600 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">À propos de l'export PDF</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Le rapport est généré localement dans votre navigateur</li>
              <li>• Aucune donnée n'est envoyée à des serveurs externes</li>
              <li>• Le fichier PDF contient tous les graphiques et analyses</li>
              <li>• Compatible avec l'impression et le partage</li>
              <li>• Optimisé pour la lecture sur mobile et desktop</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ReportGenerator
