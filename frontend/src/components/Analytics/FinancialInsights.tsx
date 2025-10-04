import React, { useState, useEffect } from 'react'
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  DollarSign,
  Calendar,
  Users,
  Smartphone,
  Shield,
  Leaf,
  BarChart3
} from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { db } from '../../lib/database'
import type { Transaction, Budget, Goal } from '../../types'
import Card from '../UI/Card'
import Alert from '../UI/Alert'

interface Insight {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  category: 'budget' | 'savings' | 'income' | 'expenses' | 'mobile_money' | 'seasonal' | 'emergency'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  action?: {
    label: string
    onClick: () => void
  }
  value?: number
  target?: number
  icon: React.ReactNode
}

interface FinancialInsightsProps {
  userId: string
  period?: 'monthly' | 'quarterly' | 'yearly'
}

const FinancialInsights: React.FC<FinancialInsightsProps> = ({ 
  userId, 
  period = 'monthly' 
}) => {
  const { user } = useAppStore()
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      generateInsights()
    }
  }, [userId, period])

  const generateInsights = async () => {
    try {
      setLoading(true)
      
      const endDate = new Date()
      const startDate = new Date()
      
      switch (period) {
        case 'monthly':
          startDate.setMonth(endDate.getMonth() - 1)
          break
        case 'quarterly':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case 'yearly':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      const transactions = await db.transactions
        .where('userId')
        .equals(userId)
        .filter(t => {
          const date = new Date(t.createdAt)
          return date >= startDate && date <= endDate
        })
        .toArray()
      
      const budgets = await db.budgets.where('userId').equals(userId).toArray()
      const goals = await db.goals.where('userId').equals(userId).toArray()

      const generatedInsights = await analyzeFinancialData(transactions, budgets, goals, startDate, endDate)
      setInsights(generatedInsights)
    } catch (error) {
      console.error('Erreur lors de la génération des insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeFinancialData = async (
    transactions: Transaction[],
    budgets: Budget[],
    goals: Goal[],
    startDate: Date,
    endDate: Date
  ): Promise<Insight[]> => {
    const insights: Insight[] = []

    // Analyse des revenus
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const netIncome = totalIncome - totalExpenses

    // 1. Analyse du revenu net
    if (netIncome > 0) {
      insights.push({
        id: 'positive-net-income',
        type: 'success',
        category: 'income',
        title: 'Revenu net positif',
        description: `Excellent ! Votre famille génère ${formatCurrency(netIncome)} d'épargne ce mois.`,
        impact: 'high',
        icon: <CheckCircle className="w-5 h-5 text-green-600" />
      })
    } else if (netIncome < -100000) {
      insights.push({
        id: 'negative-net-income',
        type: 'error',
        category: 'income',
        title: 'Déficit budgétaire critique',
        description: `Votre famille dépense ${formatCurrency(Math.abs(netIncome))} de plus que ses revenus. Action immédiate requise.`,
        impact: 'high',
        action: {
          label: 'Réviser le budget',
          onClick: () => console.log('Réviser le budget')
        },
        icon: <AlertTriangle className="w-5 h-5 text-red-600" />
      })
    }

    // 2. Analyse des budgets
    budgets.forEach(budget => {
      const utilization = ((budget.currentSpent || 0) / budget.limit) * 100
      
      if (utilization > 120) {
        insights.push({
          id: `budget-exceeded-${budget.category}`,
          type: 'error',
          category: 'budget',
          title: `Budget ${budget.category} dépassé`,
          description: `Vous avez dépensé ${utilization.toFixed(1)}% de votre budget ${budget.category}.`,
          impact: 'high',
          value: utilization,
          target: 100,
          action: {
            label: 'Ajuster le budget',
            onClick: () => console.log('Ajuster le budget')
          },
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />
        })
      } else if (utilization > 90) {
        insights.push({
          id: `budget-warning-${budget.category}`,
          type: 'warning',
          category: 'budget',
          title: `Budget ${budget.category} proche de la limite`,
          description: `Vous avez utilisé ${utilization.toFixed(1)}% de votre budget ${budget.category}.`,
          impact: 'medium',
          value: utilization,
          target: 100,
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />
        })
      } else if (utilization < 50) {
        insights.push({
          id: `budget-underused-${budget.category}`,
          type: 'info',
          category: 'budget',
          title: `Budget ${budget.category} sous-utilisé`,
          description: `Vous n'avez utilisé que ${utilization.toFixed(1)}% de votre budget ${budget.category}. Considérez réallouer ces fonds.`,
          impact: 'low',
          value: utilization,
          target: 80,
          icon: <Lightbulb className="w-5 h-5 text-blue-600" />
        })
      }
    })

    // 3. Analyse des objectifs d'épargne
    goals.forEach(goal => {
      const progress = ((goal.currentAmount || 0) / goal.targetAmount) * 100
      const daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const monthlyRequired = (goal.targetAmount - (goal.currentAmount || 0)) / Math.max(1, daysRemaining / 30)
      
      if (progress >= 100) {
        insights.push({
          id: `goal-completed-${goal.id}`,
          type: 'success',
          category: 'savings',
          title: `Objectif "${goal.name}" atteint !`,
          description: `Félicitations ! Vous avez atteint votre objectif d'épargne.`,
          impact: 'high',
          value: progress,
          target: 100,
          icon: <CheckCircle className="w-5 h-5 text-green-600" />
        })
      } else if (daysRemaining < 30 && progress < 80) {
        insights.push({
          id: `goal-urgent-${goal.id}`,
          type: 'error',
          category: 'savings',
          title: `Objectif "${goal.name}" en danger`,
          description: `Il reste ${daysRemaining} jours et vous n'êtes qu'à ${progress.toFixed(1)}%. Épargnez ${formatCurrency(monthlyRequired)}/mois.`,
          impact: 'high',
          value: progress,
          target: 100,
          action: {
            label: 'Augmenter l\'épargne',
            onClick: () => console.log('Augmenter l\'épargne')
          },
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />
        })
      } else if (progress < 50) {
        insights.push({
          id: `goal-slow-${goal.id}`,
          type: 'warning',
          category: 'savings',
          title: `Objectif "${goal.name}" en retard`,
          description: `Vous êtes à ${progress.toFixed(1)}% de votre objectif. Considérez augmenter vos contributions.`,
          impact: 'medium',
          value: progress,
          target: 100,
          icon: <Target className="w-5 h-5 text-yellow-600" />
        })
      }
    })

    // 4. Analyse Mobile Money
    const mobileMoneyTransactions = transactions.filter(t => 
      t.category.toLowerCase().includes('mobile money') || 
      t.category.toLowerCase().includes('orange money') ||
      t.category.toLowerCase().includes('mvola') ||
      t.category.toLowerCase().includes('airtel')
    )
    
    const mobileMoneyAmount = mobileMoneyTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const mobileMoneyRatio = totalExpenses > 0 ? mobileMoneyAmount / totalExpenses : 0
    
    if (mobileMoneyRatio > 0.5) {
      insights.push({
        id: 'mobile-money-high-usage',
        type: 'warning',
        category: 'mobile_money',
        title: 'Usage élevé de Mobile Money',
        description: `${(mobileMoneyRatio * 100).toFixed(1)}% de vos dépenses passent par Mobile Money. Vérifiez les frais.`,
        impact: 'medium',
        value: mobileMoneyRatio * 100,
        target: 30,
        action: {
          label: 'Optimiser les frais',
          onClick: () => console.log('Optimiser les frais')
        },
        icon: <Smartphone className="w-5 h-5 text-yellow-600" />
      })
    }

    // 5. Analyse saisonnière
    const currentMonth = new Date().getMonth() + 1
    const seasonalMultipliers = {
      1: 1.2, 2: 1.1, 3: 0.9, 4: 0.8, 5: 0.9, 6: 1.0,
      7: 1.0, 8: 1.1, 9: 1.3, 10: 1.0, 11: 1.1, 12: 1.4
    }
    
    const expectedExpenses = totalExpenses * (seasonalMultipliers[currentMonth as keyof typeof seasonalMultipliers] || 1.0)
    const seasonalAdjustment = ((totalExpenses - expectedExpenses) / expectedExpenses) * 100
    
    if (seasonalAdjustment > 20) {
      insights.push({
        id: 'seasonal-expenses-high',
        type: 'warning',
        category: 'seasonal',
        title: 'Dépenses saisonnières élevées',
        description: `Vos dépenses sont ${seasonalAdjustment.toFixed(1)}% au-dessus de la normale pour cette période.`,
        impact: 'medium',
        value: seasonalAdjustment,
        target: 0,
        icon: <Leaf className="w-5 h-5 text-orange-600" />
      })
    }

    // 6. Analyse du fonds d'urgence
    const accounts = await db.accounts.where('userId').equals(userId).toArray()
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
    const emergencyFundTarget = totalExpenses * 6 // 6 mois de dépenses
    const emergencyFundRatio = totalBalance / emergencyFundTarget
    
    if (emergencyFundRatio < 0.3) {
      insights.push({
        id: 'emergency-fund-low',
        type: 'error',
        category: 'emergency',
        title: 'Fonds d\'urgence insuffisant',
        description: `Votre fonds d'urgence ne couvre que ${(emergencyFundRatio * 100).toFixed(1)}% de l'objectif recommandé (6 mois de dépenses).`,
        impact: 'high',
        value: emergencyFundRatio * 100,
        target: 100,
        action: {
          label: 'Constituer un fonds d\'urgence',
          onClick: () => console.log('Constituer un fonds d\'urgence')
        },
        icon: <Shield className="w-5 h-5 text-red-600" />
      })
    } else if (emergencyFundRatio < 0.6) {
      insights.push({
        id: 'emergency-fund-medium',
        type: 'warning',
        category: 'emergency',
        title: 'Fonds d\'urgence en construction',
        description: `Votre fonds d'urgence couvre ${(emergencyFundRatio * 100).toFixed(1)}% de l'objectif. Continuez à épargner.`,
        impact: 'medium',
        value: emergencyFundRatio * 100,
        target: 100,
        icon: <Shield className="w-5 h-5 text-yellow-600" />
      })
    }

    // 7. Analyse des patterns de dépenses
    const categorySpending = new Map<string, number>()
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const amount = Math.abs(t.amount)
        categorySpending.set(t.category, (categorySpending.get(t.category) || 0) + amount)
      })
    
    const topCategory = Array.from(categorySpending.entries())
      .sort((a, b) => b[1] - a[1])[0]
    
    if (topCategory && topCategory[1] > totalExpenses * 0.4) {
      insights.push({
        id: 'category-dominance',
        type: 'info',
        category: 'expenses',
        title: `Concentration des dépenses`,
        description: `${(topCategory[1] / totalExpenses * 100).toFixed(1)}% de vos dépenses sont dans la catégorie "${topCategory[0]}".`,
        impact: 'low',
        value: topCategory[1] / totalExpenses * 100,
        target: 30,
        icon: <BarChart3 className="w-5 h-5 text-blue-600" />
      })
    }

    return insights.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 }
      return impactOrder[b.impact] - impactOrder[a.impact]
    })
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getInsightIcon = (category: string) => {
    const icons = {
      budget: <DollarSign className="w-5 h-5" />,
      savings: <Target className="w-5 h-5" />,
      income: <TrendingUp className="w-5 h-5" />,
      expenses: <BarChart3 className="w-5 h-5" />,
      mobile_money: <Smartphone className="w-5 h-5" />,
      seasonal: <Leaf className="w-5 h-5" />,
      emergency: <Shield className="w-5 h-5" />
    }
    return icons[category as keyof typeof icons] || <Lightbulb className="w-5 h-5" />
  }

  const getInsightColor = (type: string) => {
    const colors = {
      success: 'text-green-600 bg-green-50 border-green-200',
      warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      error: 'text-red-600 bg-red-50 border-red-200',
      info: 'text-blue-600 bg-blue-50 border-blue-200'
    }
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (insights.length === 0) {
    return (
      <Card variant="elevated" className="p-6">
        <div className="text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Aucun problème détecté
          </h3>
          <p className="text-gray-600">
            Votre situation financière semble stable. Continuez à suivre vos budgets et objectifs.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Insights Financiers
        </h2>
        <span className="text-sm text-gray-500">
          ({insights.length} recommandation{insights.length > 1 ? 's' : ''})
        </span>
      </div>

      <div className="grid gap-4">
        {insights.map((insight) => (
          <Card
            key={insight.id}
            variant="outlined"
            className={`p-4 border-l-4 ${getInsightColor(insight.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {insight.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {insight.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    insight.impact === 'high' ? 'bg-red-100 text-red-800' :
                    insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {insight.impact === 'high' ? 'Critique' :
                     insight.impact === 'medium' ? 'Important' : 'Info'}
                  </span>
                </div>
                
                <p className="text-sm text-gray-700 mb-3">
                  {insight.description}
                </p>
                
                {insight.value !== undefined && insight.target !== undefined && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progression</span>
                      <span>{insight.value.toFixed(1)}% / {insight.target}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          insight.type === 'success' ? 'bg-green-500' :
                          insight.type === 'warning' ? 'bg-yellow-500' :
                          insight.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, (insight.value / insight.target) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {insight.action && (
                  <button
                    onClick={insight.action.onClick}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                  >
                    {insight.action.label}
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default FinancialInsights
