import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Upload, Link as LinkIcon, Loader2 } from 'lucide-react';
import { goalService } from '../../services/goalService';
import { useAppStore } from '../../stores/appStore';
import type { Goal } from '../../types';

const EXCHANGE_RATE_EUR_TO_MGA = 4900;

interface GoalProgressionChartProps {
  goal: Goal;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  amount: number;
  projectedAmount?: number;
}

const GoalProgressionChart: React.FC<GoalProgressionChartProps> = ({ goal, className = '' }) => {
  const { user } = useAppStore();
  const [historyData, setHistoryData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState<'EUR' | 'MGA'>('MGA');

  // Initialize displayCurrency from user preferences
  useEffect(() => {
    const userCurrency = user?.preferences?.currency || user?.preferences?.defaultDisplayCurrency;
    if (userCurrency === 'EUR' || userCurrency === 'MGA') {
      setDisplayCurrency(userCurrency);
    } else {
      // Fallback to localStorage if user preferences not available
      const saved = localStorage.getItem('bazarkely_display_currency');
      if (saved === 'EUR' || saved === 'MGA') {
        setDisplayCurrency(saved);
      }
    }
  }, [user]);

  // Currency conversion helper
  const convertAmount = (amount: number, toCurrency: 'EUR' | 'MGA'): number => {
    // Assume all stored amounts are in MGA (Ariary) as base currency
    if (toCurrency === 'EUR') {
      return amount / EXCHANGE_RATE_EUR_TO_MGA;
    }
    // toCurrency === 'MGA'
    return amount;
  };

  useEffect(() => {
    const loadData = async () => {
      if (!goal.linkedAccountId) {
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch history data
        const history = await goalService.getGoalProgressionHistory(goal.id, goal.userId);
        
        // Calculate projection data
        const startDate = history.length > 0 ? history[0].date : new Date().toISOString().split('T')[0];
        const projection = goalService.calculateProjectionData(
          goal.currentAmount,
          goal.targetAmount,
          startDate,
          goal.deadline instanceof Date ? goal.deadline : new Date(goal.deadline)
        );

        // Combine history and projection data
        const combinedData: ChartDataPoint[] = [];
        const allDates = new Set<string>();
        
        // Add all history dates
        history.forEach(item => allDates.add(item.date));
        
        // Add all projection dates
        projection.forEach(item => allDates.add(item.date));
        
        // Sort dates
        const sortedDates = Array.from(allDates).sort();
        
        // Build combined dataset
        sortedDates.forEach(date => {
          const historyPoint = history.find(h => h.date === date);
          const projectionPoint = projection.find(p => p.date === date);
          
          combinedData.push({
            date,
            amount: historyPoint?.amount ?? (projectionPoint ? goal.currentAmount : 0),
            projectedAmount: projectionPoint?.projectedAmount
          });
        });

        setHistoryData(combinedData);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'historique:', err);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [goal.id, goal.userId, goal.linkedAccountId, goal.currentAmount, goal.targetAmount, goal.deadline]);

  // Format date for X-axis (DD/MM)
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  // Format amount with abbreviated suffix for large numbers
  const formatAmountAbbreviated = (amount: number, currency: 'EUR' | 'MGA'): string => {
    if (currency === 'EUR') {
      // Keep existing EUR format unchanged
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    }
    
    // MGA formatting with abbreviations
    if (amount >= 1000000) {
      const millions = amount / 1000000;
      return millions.toLocaleString('fr-FR', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 1 
      }) + ' M.Ar';
    }
    if (amount >= 1000) {
      const thousands = amount / 1000;
      return thousands.toLocaleString('fr-FR', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      }) + ' k Ar';
    }
    return amount.toLocaleString('fr-FR') + ' Ar';
  };

  // Convert chart data based on displayCurrency for consistent scale
  const convertedChartData = useMemo(() => {
    if (!historyData || historyData.length === 0) return [];
    
    return historyData.map(point => ({
      ...point,
      amount: point.amount !== undefined && point.amount !== null 
        ? (displayCurrency === 'EUR' ? point.amount / EXCHANGE_RATE_EUR_TO_MGA : point.amount)
        : undefined,
      projectedAmount: point.projectedAmount !== undefined && point.projectedAmount !== null 
        ? (displayCurrency === 'EUR' ? point.projectedAmount / EXCHANGE_RATE_EUR_TO_MGA : point.projectedAmount)
        : undefined,
    }));
  }, [historyData, displayCurrency]);

  // Format currency for Y-axis (data is already converted, just format)
  const formatCurrencyDisplay = (value: number): string => {
    return formatAmountAbbreviated(value, displayCurrency);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {new Date(label).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}
          </p>
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'amount' && entry.value !== undefined) {
              // Value is already converted in convertedChartData, just format
              const formattedValue = formatAmountAbbreviated(entry.value, displayCurrency);
              return (
                <p key={index} className="text-sm" style={{ color: entry.color }}>
                  <span className="font-medium">Épargne réelle:</span> {formattedValue}
                </p>
              );
            }
            if (entry.dataKey === 'projectedAmount' && entry.value !== undefined) {
              // Value is already converted in convertedChartData, just format
              const formattedValue = formatAmountAbbreviated(entry.value, displayCurrency);
              return (
                <p key={index} className="text-sm" style={{ color: entry.color }}>
                  <span className="font-medium">Projection:</span> {formattedValue}
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  // If no linked account, show message
  if (!goal.linkedAccountId) {
    return (
      <div className={`bg-purple-50 border border-purple-200 rounded-lg p-6 text-center ${className}`}>
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
            <LinkIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Liez un compte épargne à cet objectif pour suivre son évolution
            </p>
            <p className="text-xs text-gray-600">
              L'historique de progression nécessite un compte d'épargne lié
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-sm text-gray-600">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  // Error or empty data state
  if (error || historyData.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <p className="text-sm text-gray-600">
          {error || 'Aucune donnée d\'évolution disponible'}
        </p>
      </div>
    );
  }

  // Format target amount for ReferenceLine label
  const formatTargetLabel = (): string => {
    const convertedTarget = convertAmount(goal.targetAmount, displayCurrency);
    const formattedTarget = formatAmountAbbreviated(convertedTarget, displayCurrency);
    return `Objectif: ${formattedTarget}`;
  };

  // Custom Legend with currency toggle
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <div className="flex items-center justify-between flex-wrap gap-2 pt-5">
        {/* Left side: Legend items */}
        <ul className="flex items-center gap-4 flex-wrap">
          {payload?.map((entry: any, index: number) => (
            <li key={`item-${index}`} className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                className="inline-block"
              >
                {entry.type === 'line' && (
                  <line
                    x1="0"
                    y1="7"
                    x2="14"
                    y2="7"
                    stroke={entry.color}
                    strokeWidth={entry.dataKey === 'projectedAmount' ? 2 : 2}
                    strokeDasharray={entry.dataKey === 'projectedAmount' ? '5 5' : '0'}
                  />
                )}
              </svg>
              <span className="text-xs text-gray-600">{entry.value}</span>
            </li>
          ))}
        </ul>
        
        {/* Right side: Currency toggle */}
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setDisplayCurrency('MGA')}
            className={`px-2 py-1 rounded transition-colors ${
              displayCurrency === 'MGA'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            Ar
          </button>
          <button
            type="button"
            onClick={() => setDisplayCurrency('EUR')}
            className={`px-2 py-1 rounded transition-colors ${
              displayCurrency === 'EUR'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            €
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={convertedChartData} margin={{ top: 25, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            style={{ fontSize: '12px' }}
            stroke="#6b7280"
          />
          <YAxis
            tickFormatter={formatCurrencyDisplay}
            style={{ fontSize: '12px' }}
            stroke="#6b7280"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            content={renderCustomLegend}
            verticalAlign="bottom"
          />
          <ReferenceLine
            y={convertAmount(goal.targetAmount, displayCurrency)}
            stroke="#22c55e"
            strokeWidth={2}
            label={{ 
              value: formatTargetLabel(), 
              position: 'insideRight',
              dy: -12,
              style: { fill: '#22c55e', fontSize: '11px', fontWeight: 500 } 
            }}
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="amount"
            name="Épargne réelle"
            stroke="#9333ea"
            strokeWidth={2}
            dot={{ r: 3, fill: '#9333ea' }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="projectedAmount"
            name="Projection"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GoalProgressionChart;

