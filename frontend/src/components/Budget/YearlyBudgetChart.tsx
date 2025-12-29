import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { MonthlyData } from '../../hooks/useYearlyBudgetData';

interface YearlyBudgetChartProps {
  monthlyData: readonly MonthlyData[];
  className?: string;
}

/**
 * Format large numbers with K/M suffix for Y-axis
 * @param value - Number to format
 * @returns Formatted string (e.g., "1.5M", "250K")
 */
const formatLargeNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
};

/**
 * Format number with thousand separators for tooltip
 * @param value - Number to format
 * @returns Formatted string with separators (e.g., "1 500 000")
 */
const formatNumberWithSeparators = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

/**
 * Get abbreviated month name in French
 * @param month - Month number (1-12)
 * @returns Abbreviated month name (e.g., "Jan", "Fév")
 */
const getAbbreviatedMonth = (month: number): string => {
  const months = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ];
  return months[month - 1] || '';
};

/**
 * Custom tooltip component matching BazarKELY design
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;
  const budget = data.budget || 0;
  const spent = data.spent || 0;
  const isOverBudget = spent > budget;

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 border-l-4 border-purple-600">
      <p className="text-sm font-semibold text-gray-800 mb-2">
        {data.monthName}
      </p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600">Budget prévu:</span>
          <span className="text-sm font-semibold text-purple-600">
            {formatNumberWithSeparators(budget)} Ar
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600">Dépensé:</span>
          <span className={`text-sm font-semibold ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
            {formatNumberWithSeparators(spent)} Ar
          </span>
        </div>
        {isOverBudget && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-200">
            <span className="text-sm text-gray-600">Dépassement:</span>
            <span className="text-sm font-semibold text-red-500">
              {formatNumberWithSeparators(spent - budget)} Ar
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * YearlyBudgetChart - Displays grouped bar chart for yearly budget vs spent data
 * 
 * Features:
 * - 12 months on X-axis with French abbreviated labels
 * - 2 bars per month: Budget (purple) and Spent (green/red based on budget comparison)
 * - Y-axis with K/M suffix formatting
 * - Custom tooltip with formatted values
 * - Responsive design with horizontal scroll on mobile
 * - Empty state message when no data
 */
export const YearlyBudgetChart: React.FC<YearlyBudgetChartProps> = ({
  monthlyData,
  className = ''
}) => {
  // Check if data is empty or all zeros
  const hasData = monthlyData.length > 0 && 
    monthlyData.some(item => item.budget > 0 || item.spent > 0);

  if (!hasData) {
    return (
      <div className={`flex items-center justify-center min-h-[250px] sm:min-h-[300px] bg-white rounded-lg border border-gray-200 ${className}`}>
        <p className="text-gray-500 text-sm font-medium">
          Aucune donnée pour cette année
        </p>
      </div>
    );
  }

  // Prepare chart data with abbreviated month names
  const chartData = monthlyData.map(item => ({
    ...item,
    monthLabel: getAbbreviatedMonth(item.month)
  }));

  // Calculate max value for Y-axis (add 20% padding)
  const maxValue = Math.max(
    ...chartData.map(item => Math.max(item.budget, item.spent))
  );
  const yAxisMax = Math.ceil(maxValue * 1.2);

  // Custom Y-axis tick formatter
  const formatYAxisTick = (value: number): string => {
    return `${formatLargeNumber(value)} Ar`;
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <div className="w-full overflow-x-auto">
          <div className="min-w-[600px] sm:min-w-0" style={{ minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="monthLabel"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={{ stroke: '#9ca3af' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={formatYAxisTick}
                  tickLine={{ stroke: '#9ca3af' }}
                  domain={[0, yAxisMax]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="rect"
                  formatter={(value) => {
                    if (value === 'budget') return 'Budget prévu';
                    if (value === 'spent') return 'Dépensé';
                    return value;
                  }}
                />
                <Bar
                  dataKey="budget"
                  name="budget"
                  fill="#9333ea"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="spent"
                  name="spent"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => {
                    const isOverBudget = entry.spent > entry.budget;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isOverBudget ? '#ef4444' : '#22c55e'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearlyBudgetChart;

