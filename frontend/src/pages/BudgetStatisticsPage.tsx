import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CheckCircle
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  CartesianGrid
} from 'recharts';
import { TRANSACTION_CATEGORIES } from '../constants';
import useMultiYearBudgetData, { type PeriodSelection } from '../hooks/useMultiYearBudgetData';

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
] as const;

const BudgetStatisticsPage = () => {
  const navigate = useNavigate();
  const {
    availableYears,
    availableMonths,
    period1,
    period2,
    setPeriod1,
    setPeriod2,
    comparisonResult,
    problematicCategories,
    yearlyEvolution,
    monthlyEvolution,
    isLoading,
    error
  } = useMultiYearBudgetData();

  const [evolutionView, setEvolutionView] = useState<'yearly' | 'monthly'>('yearly');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Format number with French locale
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Calculate data range indicator
  const dataRangeLabel = useMemo(() => {
    if (availableYears.length === 0) return 'Aucune donnée';
    if (availableYears.length === 1) return `Données de ${availableYears[0]}`;
    return `Données de ${availableYears[0]} à ${availableYears[availableYears.length - 1]}`;
  }, [availableYears]);

  // Update period helper
  const updatePeriod = (
    period: PeriodSelection,
    updates: Partial<PeriodSelection>
  ): PeriodSelection => {
    return { ...period, ...updates };
  };

  // Get severity badge colors
  const getSeverityColors = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical':
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
      case 'high':
        return { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' };
      case 'medium':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' };
      case 'low':
        return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="ml-3 text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 pb-20">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (availableYears.length === 0) {
    return (
      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/budgets')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Retour aux budgets"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Statistiques Budget</h1>
          </div>
        </div>
        <div className="card text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium text-lg mb-2">Aucune donnée disponible</p>
          <p className="text-sm text-gray-500">
            Créez des budgets pour voir les statistiques
          </p>
        </div>
      </div>
    );
  }

  const evolutionData = evolutionView === 'yearly' ? yearlyEvolution : monthlyEvolution;

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/budgets')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Retour aux budgets"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-purple-600" />
              <span>Statistiques Budget</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">{dataRangeLabel}</p>
          </div>
        </div>
      </div>

      {/* Period Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Period 1 */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Période 1 (référence)
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-medium text-gray-600">Type de période</label>
              <div className="flex flex-col space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={period1.type === 'year'}
                    onChange={() => setPeriod1(updatePeriod(period1, { type: 'year' }))}
                    className="text-purple-600"
                  />
                  <span className="text-sm">Année complète</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={period1.type === 'month'}
                    onChange={() => setPeriod1(updatePeriod(period1, { type: 'month', month: 1 }))}
                    className="text-purple-600"
                  />
                  <span className="text-sm">Mois spécifique</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={period1.type === 'range'}
                    onChange={() => setPeriod1(updatePeriod(period1, { type: 'range', startMonth: 1, endMonth: 3 }))}
                    className="text-purple-600"
                  />
                  <span className="text-sm">Plage de mois</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Année</label>
              <select
                value={period1.year}
                onChange={(e) => setPeriod1(updatePeriod(period1, { year: Number(e.target.value) }))}
                className="select-no-arrow input-field w-full"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {period1.type === 'month' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mois</label>
                <select
                  value={period1.month || 1}
                  onChange={(e) => setPeriod1(updatePeriod(period1, { month: Number(e.target.value) }))}
                  className="select-no-arrow input-field w-full"
                >
                  {MONTH_NAMES_FR.map((name, index) => (
                    <option key={index + 1} value={index + 1}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {period1.type === 'range' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mois de début</label>
                  <select
                    value={period1.startMonth || 1}
                    onChange={(e) => setPeriod1(updatePeriod(period1, { startMonth: Number(e.target.value) }))}
                    className="select-no-arrow input-field w-full"
                  >
                    {MONTH_NAMES_FR.map((name, index) => (
                      <option key={index + 1} value={index + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mois de fin</label>
                  <select
                    value={period1.endMonth || 3}
                    onChange={(e) => setPeriod1(updatePeriod(period1, { endMonth: Number(e.target.value) }))}
                    className="select-no-arrow input-field w-full"
                  >
                    {MONTH_NAMES_FR.map((name, index) => (
                      <option key={index + 1} value={index + 1}>{name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Period 2 */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Période 2 (comparaison)
          </h3>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-medium text-gray-600">Type de période</label>
              <div className="flex flex-col space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={period2.type === 'year'}
                    onChange={() => setPeriod2(updatePeriod(period2, { type: 'year' }))}
                    className="text-purple-600"
                  />
                  <span className="text-sm">Année complète</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={period2.type === 'month'}
                    onChange={() => setPeriod2(updatePeriod(period2, { type: 'month', month: 1 }))}
                    className="text-purple-600"
                  />
                  <span className="text-sm">Mois spécifique</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={period2.type === 'range'}
                    onChange={() => setPeriod2(updatePeriod(period2, { type: 'range', startMonth: 1, endMonth: 3 }))}
                    className="text-purple-600"
                  />
                  <span className="text-sm">Plage de mois</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Année</label>
              <select
                value={period2.year}
                onChange={(e) => setPeriod2(updatePeriod(period2, { year: Number(e.target.value) }))}
                className="select-no-arrow input-field w-full"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {period2.type === 'month' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mois</label>
                <select
                  value={period2.month || 1}
                  onChange={(e) => setPeriod2(updatePeriod(period2, { month: Number(e.target.value) }))}
                  className="select-no-arrow input-field w-full"
                >
                  {MONTH_NAMES_FR.map((name, index) => (
                    <option key={index + 1} value={index + 1}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {period2.type === 'range' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mois de début</label>
                  <select
                    value={period2.startMonth || 1}
                    onChange={(e) => setPeriod2(updatePeriod(period2, { startMonth: Number(e.target.value) }))}
                    className="select-no-arrow input-field w-full"
                  >
                    {MONTH_NAMES_FR.map((name, index) => (
                      <option key={index + 1} value={index + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mois de fin</label>
                  <select
                    value={period2.endMonth || 3}
                    onChange={(e) => setPeriod2(updatePeriod(period2, { endMonth: Number(e.target.value) }))}
                    className="select-no-arrow input-field w-full"
                  >
                    {MONTH_NAMES_FR.map((name, index) => (
                      <option key={index + 1} value={index + 1}>{name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Summary Cards */}
      {comparisonResult && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Period 1 Card */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {comparisonResult.period1.periodLabel}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Budget total</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatNumber(comparisonResult.period1.totalBudget)} Ar
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dépensé</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatNumber(comparisonResult.period1.totalSpent)} Ar
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Économies</p>
                  <p className={`text-lg font-semibold ${comparisonResult.period1.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatNumber(comparisonResult.period1.savings)} Ar
                    <span className="text-sm ml-2">
                      ({formatPercent(comparisonResult.period1.savingsRate)})
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Taux de conformité</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        comparisonResult.period1.savingsRate >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(Math.abs(comparisonResult.period1.savingsRate), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Period 2 Card */}
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {comparisonResult.period2.periodLabel}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Budget total</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-semibold text-gray-900">
                      {formatNumber(comparisonResult.period2.totalBudget)} Ar
                    </p>
                    {comparisonResult.differences.budgetChangePercent !== 0 && (
                      <span className={`text-xs flex items-center ${
                        comparisonResult.differences.budgetChangePercent > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {comparisonResult.differences.budgetChangePercent > 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {formatPercent(comparisonResult.differences.budgetChangePercent)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dépensé</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-semibold text-red-600">
                      {formatNumber(comparisonResult.period2.totalSpent)} Ar
                    </p>
                    {comparisonResult.differences.spentChangePercent !== 0 && (
                      <span className={`text-xs flex items-center ${
                        comparisonResult.differences.spentChangePercent < 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {comparisonResult.differences.spentChangePercent < 0 ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        {formatPercent(Math.abs(comparisonResult.differences.spentChangePercent))}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Économies</p>
                  <div className="flex items-center space-x-2">
                    <p className={`text-lg font-semibold ${comparisonResult.period2.savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatNumber(comparisonResult.period2.savings)} Ar
                      <span className="text-sm ml-2">
                        ({formatPercent(comparisonResult.period2.savingsRate)})
                      </span>
                    </p>
                    {comparisonResult.differences.savingsRateChange !== 0 && (
                      <span className={`text-xs flex items-center ${
                        comparisonResult.differences.savingsRateChange > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {comparisonResult.differences.savingsRateChange > 0 ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3" />
                        )}
                        {formatPercent(comparisonResult.differences.savingsRateChange)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Taux de conformité</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        comparisonResult.period2.savingsRate >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(Math.abs(comparisonResult.period2.savingsRate), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Evolution Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Évolution sur la période</h3>
              <div className="flex items-center space-x-2 bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setEvolutionView('yearly')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    evolutionView === 'yearly'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Vue annuelle
                </button>
                <button
                  onClick={() => setEvolutionView('monthly')}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    evolutionView === 'monthly'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Vue mensuelle
                </button>
              </div>
            </div>
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatNumber(value)}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="totalBudget"
                    fill="#9333ea"
                    fillOpacity={0.2}
                    stroke="#9333ea"
                    name="Budget"
                  />
                  <Area
                    type="monotone"
                    dataKey="totalSpent"
                    fill="#f97316"
                    fillOpacity={0.2}
                    stroke="#f97316"
                    name="Dépenses"
                  />
                  <Line
                    type="monotone"
                    dataKey="savingsRate"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 4 }}
                    name="Taux d'épargne (%)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Aucune donnée disponible pour cette période
              </div>
            )}
          </div>

          {/* Problematic Categories */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Catégories à surveiller</h3>
            </div>
            {problematicCategories.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Aucune catégorie problématique détectée</p>
                <p className="text-sm text-gray-500 mt-1">Toutes vos catégories respectent leurs budgets</p>
              </div>
            ) : (
              <div className="space-y-3">
                {problematicCategories.map((category) => {
                  const severityColors = getSeverityColors(category.severity);
                  const isExpanded = expandedCategory === category.category;
                  const showAllPeriods = category.affectedPeriods.length <= 3 || isExpanded;
                  const displayedPeriods = showAllPeriods
                    ? category.affectedPeriods
                    : category.affectedPeriods.slice(0, 3);

                  return (
                    <div
                      key={category.category}
                      className={`border rounded-lg p-4 ${severityColors.border}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors.bg} ${severityColors.text}`}>
                              {category.severity === 'critical' ? 'Critique' :
                               category.severity === 'high' ? 'Élevé' :
                               category.severity === 'medium' ? 'Moyen' : 'Faible'}
                            </span>
                            <h4 className="font-medium text-gray-900">
                              {category.categoryLabel}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {category.overspendingMonths} mois de dépassement sur {category.totalMonthsAnalyzed} analysés
                          </p>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-600">
                              Moyenne: <span className="font-semibold text-red-600">
                                {formatNumber(category.averageOverspend)} Ar
                              </span>
                            </span>
                            <span className="text-gray-600">
                              ({formatPercent(category.averageOverspendPercentage)})
                            </span>
                            <div className="flex items-center space-x-1">
                              {category.trend === 'worsening' && (
                                <ArrowDownRight className="w-4 h-4 text-red-500" />
                              )}
                              {category.trend === 'improving' && (
                                <ArrowUpRight className="w-4 h-4 text-green-500" />
                              )}
                              {category.trend === 'stable' && (
                                <Minus className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={`text-xs ${
                                category.trend === 'worsening' ? 'text-red-600' :
                                category.trend === 'improving' ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                {category.trend === 'worsening' ? 'Détérioration' :
                                 category.trend === 'improving' ? 'Amélioration' : 'Stable'}
                              </span>
                            </div>
                          </div>
                          {category.affectedPeriods.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-500 mb-1">Périodes affectées:</p>
                              <div className="flex flex-wrap gap-2">
                                {displayedPeriods.map((period, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                                  >
                                    {period}
                                  </span>
                                ))}
                                {category.affectedPeriods.length > 3 && (
                                  <button
                                    onClick={() => setExpandedCategory(isExpanded ? null : category.category)}
                                    className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 hover:bg-gray-200 flex items-center space-x-1"
                                  >
                                    <span>{isExpanded ? 'Voir moins' : `+${category.affectedPeriods.length - 3} autres`}</span>
                                    {isExpanded ? (
                                      <ChevronUp className="w-3 h-3" />
                                    ) : (
                                      <ChevronDown className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetStatisticsPage;

