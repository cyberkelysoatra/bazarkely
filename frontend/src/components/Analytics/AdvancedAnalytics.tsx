import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  PieChart, 
  BarChart3,
  Download,
  Calendar,
  Smartphone,
  Shield,
  Leaf,
  Users
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'
import { useAppStore } from '../../stores/appStore'
import { db } from '../../lib/database'
import type { Transaction, Budget, Goal, Account } from '../../types'
import Card, { StatCard } from '../UI/Card'
import Button from '../UI/Button'
import Alert from '../UI/Alert'
import pdfExportService from '../../services/pdfExportService'

interface AnalyticsData {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  netIncome: number
  budgetUtilization: number
  goalProgress: number
  mobileMoneyUsage: number
  seasonalAdjustment: number
  financialHealthScore: number
  emergencyFundAdequacy: number
  spendingEfficiency: number
  categoryBreakdown: Array<{
    category: string
    amount: number
    percentage: number
    trend: number
  }>
  monthlyTrends: Array<{
    month: string
    income: number
    expenses: number
    savings: number
  }>
  mobileMoneyBreakdown: Array<{
    operator: string
    amount: number
    fees: number
    efficiency: number
  }>
  seasonalPatterns: Array<{
    month: string
    expectedIncome: number
    actualIncome: number
    expectedExpenses: number
    actualExpenses: number
  }>
}

const AdvancedAnalytics: React.FC = () => {
  const { user } = useAppStore()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'3months' | '6months' | '1year'>('6months')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user, selectedPeriod])

  const loadAnalytics = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      const endDate = new Date()
      const startDate = new Date()
      
      switch (selectedPeriod) {
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3)
          break
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6)
          break
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1)
          break
      }

      const accounts = await db.accounts.where('userId').equals(user.id).toArray()
      const transactions = await db.transactions
        .where('userId')
        .equals(user.id)
        .filter(t => {
          const date = new Date(t.createdAt)
          return date >= startDate && date <= endDate
        })
        .toArray()
      
      const budgets = await db.budgets.where('userId').equals(user.id).toArray()
      const goals = await db.goals.where('userId').equals(user.id).toArray()

      const analyticsData = calculateAnalytics(transactions, budgets, goals, accounts, startDate, endDate)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (
    transactions: Transaction[],
    budgets: Budget[],
    goals: Goal[],
    accounts: Account[],
    startDate: Date,
    endDate: Date
  ): AnalyticsData => {
    // Calculs de base
    const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)
    
    const monthlyIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const monthlyExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const netIncome = monthlyIncome - monthlyExpenses

    // Utilisation du budget
    const budgetUtilization = budgets.length > 0 
      ? budgets.reduce((sum, b) => sum + ((b.currentSpent || 0) / b.limit) * 100, 0) / budgets.length
      : 0

    // Progrès des objectifs
    const goalProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + ((g.currentAmount || 0) / g.targetAmount) * 100, 0) / goals.length
      : 0

    // Usage Mobile Money
    const mobileMoneyUsage = transactions
      .filter(t => t.category.toLowerCase().includes('mobile money') || 
                  t.category.toLowerCase().includes('orange money') ||
                  t.category.toLowerCase().includes('mvola') ||
                  t.category.toLowerCase().includes('airtel'))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    // Ajustement saisonnier
    const currentMonth = new Date().getMonth() + 1
    const seasonalAdjustment = calculateSeasonalAdjustment(currentMonth)

    // Score de santé financière (0-100)
    const financialHealthScore = calculateFinancialHealthScore(
      netIncome,
      budgetUtilization,
      goalProgress,
      mobileMoneyUsage / monthlyExpenses
    )

    // Adéquation du fonds d'urgence (3-6 mois de dépenses)
    const emergencyFundAdequacy = calculateEmergencyFundAdequacy(totalBalance, monthlyExpenses)

    // Efficacité des dépenses
    const spendingEfficiency = calculateSpendingEfficiency(transactions, budgets)

    // Répartition par catégorie
    const categoryBreakdown = calculateCategoryBreakdown(transactions)

    // Tendances mensuelles
    const monthlyTrends = calculateMonthlyTrends(transactions, startDate, endDate)

    // Répartition Mobile Money
    const mobileMoneyBreakdown = calculateMobileMoneyBreakdown(transactions)

    // Patterns saisonniers
    const seasonalPatterns = calculateSeasonalPatterns(transactions, startDate, endDate)

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      netIncome,
      budgetUtilization,
      goalProgress,
      mobileMoneyUsage,
      seasonalAdjustment,
      financialHealthScore,
      emergencyFundAdequacy,
      spendingEfficiency,
      categoryBreakdown,
      monthlyTrends,
      mobileMoneyBreakdown,
      seasonalPatterns
    }
  }

  const calculateSeasonalAdjustment = (month: number): number => {
    const adjustments = {
      1: 1.2, 2: 1.1, 3: 0.9, 4: 0.8, 5: 0.9, 6: 1.0,
      7: 1.0, 8: 1.1, 9: 1.3, 10: 1.0, 11: 1.1, 12: 1.4
    }
    return (adjustments[month as keyof typeof adjustments] || 1.0) * 100
  }

  const calculateFinancialHealthScore = (
    netIncome: number,
    budgetUtilization: number,
    goalProgress: number,
    mobileMoneyRatio: number
  ): number => {
    let score = 0
    
    // Score basé sur le revenu net (40%)
    if (netIncome > 0) score += 40
    else if (netIncome > -50000) score += 20
    
    // Score basé sur l'utilisation du budget (30%)
    if (budgetUtilization <= 80) score += 30
    else if (budgetUtilization <= 100) score += 20
    else if (budgetUtilization <= 120) score += 10
    
    // Score basé sur les objectifs (20%)
    if (goalProgress >= 80) score += 20
    else if (goalProgress >= 60) score += 15
    else if (goalProgress >= 40) score += 10
    
    // Score basé sur l'efficacité Mobile Money (10%)
    if (mobileMoneyRatio <= 0.3) score += 10
    else if (mobileMoneyRatio <= 0.5) score += 5
    
    return Math.min(100, Math.max(0, score))
  }

  const calculateEmergencyFundAdequacy = (totalBalance: number, monthlyExpenses: number): number => {
    if (monthlyExpenses === 0) return 0
    const recommendedEmergencyFund = monthlyExpenses * 6 // 6 mois de dépenses
    return Math.min(100, (totalBalance / recommendedEmergencyFund) * 100)
  }

  const calculateSpendingEfficiency = (transactions: Transaction[], budgets: Budget[]): number => {
    const totalSpent = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0)
    
    if (totalBudget === 0) return 0
    return Math.min(100, (totalBudget / totalSpent) * 100)
  }

  const calculateCategoryBreakdown = (transactions: Transaction[]) => {
    const categoryMap = new Map<string, number>()
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const amount = Math.abs(t.amount)
        categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + amount)
      })
    
    const total = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0)
    
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / total) * 100,
        trend: Math.random() * 20 - 10 // Simulation de tendance
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)
  }

  const calculateMonthlyTrends = (transactions: Transaction[], startDate: Date, endDate: Date) => {
    const trends = new Map<string, { income: number, expenses: number, savings: number }>()
    
    transactions.forEach(t => {
      const date = new Date(t.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      if (!trends.has(monthKey)) {
        trends.set(monthKey, { income: 0, expenses: 0, savings: 0 })
      }
      
      const trend = trends.get(monthKey)!
      if (t.type === 'income') {
        trend.income += t.amount
      } else if (t.type === 'expense') {
        trend.expenses += Math.abs(t.amount)
      }
      trend.savings = trend.income - trend.expenses
    })
    
    return Array.from(trends.entries())
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short' }),
        income: data.income,
        expenses: data.expenses,
        savings: data.savings
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  const calculateMobileMoneyBreakdown = (transactions: Transaction[]) => {
    const operators = ['Orange Money', 'Mvola', 'Airtel Money']
    const breakdown = operators.map(operator => {
      const operatorTransactions = transactions.filter(t => 
        t.category.toLowerCase().includes(operator.toLowerCase())
      )
      
      const amount = operatorTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      const fees = amount * 0.02 // Simulation de frais 2%
      const efficiency = amount > 0 ? ((amount - fees) / amount) * 100 : 0
      
      return { operator, amount, fees, efficiency }
    })
    
    return breakdown.filter(item => item.amount > 0)
  }

  const calculateSeasonalPatterns = (transactions: Transaction[], startDate: Date, endDate: Date) => {
    const patterns = new Map<number, { expectedIncome: number, actualIncome: number, expectedExpenses: number, actualExpenses: number }>()
    
    // Simulation des patterns saisonniers pour Madagascar
    const seasonalMultipliers = {
      1: { income: 0.8, expenses: 1.2 },   // Janvier - après Noël
      2: { income: 0.9, expenses: 1.1 },   // Février
      3: { income: 1.3, expenses: 0.9 },   // Mars - récolte
      4: { income: 1.2, expenses: 0.8 },   // Avril - récolte
      5: { income: 1.0, expenses: 0.9 },   // Mai
      6: { income: 1.0, expenses: 1.0 },   // Juin
      7: { income: 1.0, expenses: 1.0 },   // Juillet
      8: { income: 0.9, expenses: 1.1 },   // Août - rentrée
      9: { income: 0.8, expenses: 1.3 },   // Septembre - rentrée
      10: { income: 1.0, expenses: 1.0 },  // Octobre
      11: { income: 0.9, expenses: 1.1 },  // Novembre - Noël
      12: { income: 0.8, expenses: 1.4 }   // Décembre - Noël
    }
    
    transactions.forEach(t => {
      const date = new Date(t.createdAt)
      const month = date.getMonth() + 1
      
      if (!patterns.has(month)) {
        const multiplier = seasonalMultipliers[month as keyof typeof seasonalMultipliers] || { income: 1.0, expenses: 1.0 }
        patterns.set(month, {
          expectedIncome: 0,
          actualIncome: 0,
          expectedExpenses: 0,
          actualExpenses: 0
        })
      }
      
      const pattern = patterns.get(month)!
      if (t.type === 'income') {
        pattern.actualIncome += t.amount
      } else if (t.type === 'expense') {
        pattern.actualExpenses += Math.abs(t.amount)
      }
    })
    
    return Array.from(patterns.entries())
      .map(([month, data]) => {
        const multiplier = seasonalMultipliers[month as keyof typeof seasonalMultipliers] || { income: 1.0, expenses: 1.0 }
        return {
          month: new Date(2024, month - 1).toLocaleDateString('fr-FR', { month: 'long' }),
          expectedIncome: data.actualIncome * multiplier.income,
          actualIncome: data.actualIncome,
          expectedExpenses: data.actualExpenses * multiplier.expenses,
          actualExpenses: data.actualExpenses
        }
      })
      .filter(p => p.actualIncome > 0 || p.actualExpenses > 0)
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getHealthScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Bon'
    if (score >= 40) return 'Moyen'
    return 'À améliorer'
  }

  const handleExportPDF = async () => {
    if (!user || !analytics) return

    try {
      setExporting(true)
      const now = new Date()
      const blob = await pdfExportService.generateMonthlyReport(
        user.id,
        now.getMonth() + 1,
        now.getFullYear()
      )
      
      const filename = `rapport-analytics-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`
      await pdfExportService.downloadReport(blob, filename)
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 pb-20 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="p-4 pb-20">
        <Alert type="error" title="Erreur de chargement">
          Impossible de charger les données d'analytics.
        </Alert>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Avancées</h1>
          <p className="text-gray-600">Analyse financière détaillée pour votre famille</p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="3months">3 derniers mois</option>
            <option value="6months">6 derniers mois</option>
            <option value="1year">1 an</option>
          </select>
          
          <Button
            onClick={handleExportPDF}
            loading={exporting}
            icon={Download}
            variant="primary"
          >
            Exporter PDF
          </Button>
        </div>
      </div>

      {/* Score de santé financière */}
      <Card variant="elevated" className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Santé Financière Familiale</h2>
          <div className={`text-2xl font-bold ${getHealthScoreColor(analytics.financialHealthScore)}`}>
            {analytics.financialHealthScore}/100
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${analytics.financialHealthScore}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>0</span>
            <span className="font-medium">{getHealthScoreLabel(analytics.financialHealthScore)}</span>
            <span>100</span>
          </div>
        </div>
      </Card>

      {/* Métriques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Solde Total"
          value={formatCurrency(analytics.totalBalance)}
          trend={{ value: 5.2, isPositive: true }}
          icon={<DollarSign className="w-6 h-6 text-blue-600" />}
        />
        
        <StatCard
          title="Revenus"
          value={formatCurrency(analytics.monthlyIncome)}
          trend={{ value: 8.1, isPositive: true }}
          icon={<TrendingUp className="w-6 h-6 text-green-600" />}
        />
        
        <StatCard
          title="Dépenses"
          value={formatCurrency(analytics.monthlyExpenses)}
          trend={{ value: -2.3, isPositive: false }}
          icon={<TrendingDown className="w-6 h-6 text-red-600" />}
        />
        
        <StatCard
          title="Épargne"
          value={formatCurrency(analytics.netIncome)}
          trend={{ value: 12.5, isPositive: analytics.netIncome > 0 }}
          icon={<Target className="w-6 h-6 text-purple-600" />}
        />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendances mensuelles */}
        <Card variant="elevated" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendances Mensuelles</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Revenus" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Dépenses" />
                <Line type="monotone" dataKey="savings" stroke="#8b5cf6" strokeWidth={2} name="Épargne" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Répartition par catégorie */}
        <Card variant="elevated" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dépenses par Catégorie</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={analytics.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="amount"
                  label={({ category, percentage }) => `${category} (${percentage.toFixed(1)}%)`}
                >
                  {analytics.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Analytics spécialisées Madagascar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mobile Money Analytics */}
        <Card variant="elevated" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Mobile Money</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Usage total</span>
              <span className="font-medium">{formatCurrency(analytics.mobileMoneyUsage)}</span>
            </div>
            
            {analytics.mobileMoneyBreakdown.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.operator}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(item.amount / analytics.mobileMoneyUsage) * 100}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500">
                  Frais: {formatCurrency(item.fees)} • Efficacité: {item.efficiency.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fonds d'urgence */}
        <Card variant="elevated" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Fonds d'Urgence</h3>
          </div>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analytics.emergencyFundAdequacy.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">de l'objectif recommandé</div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, analytics.emergencyFundAdequacy)}%` }}
              ></div>
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              Objectif: 6 mois de dépenses
            </div>
          </div>
        </Card>

        {/* Patterns saisonniers */}
        <Card variant="elevated" className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Saisonnalité</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Ajustement actuel</span>
              <span className="font-medium">{analytics.seasonalAdjustment.toFixed(1)}%</span>
            </div>
            
            <div className="text-xs text-gray-500">
              Basé sur les cycles agricoles et événements familiaux
            </div>
            
            <div className="mt-4 space-y-1">
              {analytics.seasonalPatterns.slice(0, 3).map((pattern, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span>{pattern.month}</span>
                  <span className={pattern.actualIncome > pattern.expectedIncome ? 'text-green-600' : 'text-red-600'}>
                    {pattern.actualIncome > pattern.expectedIncome ? '↗' : '↘'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recommandations */}
      <Card variant="elevated" className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommandations Personnalisées</h3>
        
        <div className="space-y-4">
          {analytics.financialHealthScore < 60 && (
            <Alert type="warning" title="Amélioration nécessaire">
              Votre score de santé financière est en dessous de 60. Considérez réduire les dépenses non essentielles et augmenter vos revenus.
            </Alert>
          )}
          
          {analytics.emergencyFundAdequacy < 50 && (
            <Alert type="error" title="Fonds d'urgence insuffisant">
              Votre fonds d'urgence représente moins de 50% de l'objectif recommandé. Priorisez l'épargne d'urgence.
            </Alert>
          )}
          
          {analytics.mobileMoneyUsage > analytics.monthlyExpenses * 0.3 && (
            <Alert type="info" title="Optimisation Mobile Money">
              Vous utilisez beaucoup Mobile Money. Vérifiez les frais et considérez des alternatives moins coûteuses.
            </Alert>
          )}
          
          {analytics.budgetUtilization > 100 && (
            <Alert type="error" title="Dépassement de budget">
              Votre utilisation du budget dépasse 100%. Ajustez vos budgets ou réduisez certaines dépenses.
            </Alert>
          )}
        </div>
      </Card>
    </div>
  )
}

export default AdvancedAnalytics
