/**
 * ReimbursementStatsSection Component - BazarKELY
 * Displays statistics charts for reimbursement data
 * 
 * Features:
 * - Bar chart: Summary by member (pending to receive/pay)
 * - Pie chart: Distribution by category
 * - Line chart: Debt evolution over time
 * 
 * @version 1.0
 * @date 2026-01-27
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

/**
 * Interface for reimbursement data
 */
export interface ReimbursementStatsData {
  id: string;
  requestedBy: string;
  requestedFrom: string;
  requestedByName?: string;
  requestedFromName?: string;
  amount: number;
  category?: string;
  createdAt: string | Date;
  status: string;
}

/**
 * Props interface
 */
export interface ReimbursementStatsSectionProps {
  pendingReimbursements: ReimbursementStatsData[];
  currentMemberId: string;
}

/**
 * Format number as MGA currency
 */
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('fr-FR').format(value);
};

/**
 * Custom tooltip component
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${formatNumber(entry.value)} Ar`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * Color palette for charts
 */
const COLORS = {
  primary: '#9333ea',
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f97316',
  blue: '#3b82f6',
  pieColors: ['#9333ea', '#f97316', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6']
};

const ReimbursementStatsSection: React.FC<ReimbursementStatsSectionProps> = ({
  pendingReimbursements,
  currentMemberId
}) => {
  // Chart 1: Summary by member (pending to receive/pay)
  const memberSummaryData = useMemo(() => {
    if (!pendingReimbursements.length || !currentMemberId) return [];

    const memberMap = new Map<string, { name: string; pendingToReceive: number; pendingToPay: number }>();

    pendingReimbursements.forEach((reimbursement) => {
      const isOwedToMe = reimbursement.requestedBy === currentMemberId;
      const isIOwe = reimbursement.requestedFrom === currentMemberId;

      if (isOwedToMe && reimbursement.requestedFromName) {
        const memberId = reimbursement.requestedFrom;
        const existing = memberMap.get(memberId) || { name: reimbursement.requestedFromName, pendingToReceive: 0, pendingToPay: 0 };
        existing.pendingToReceive += reimbursement.amount;
        memberMap.set(memberId, existing);
      }

      if (isIOwe && reimbursement.requestedByName) {
        const memberId = reimbursement.requestedBy;
        const existing = memberMap.get(memberId) || { name: reimbursement.requestedByName, pendingToReceive: 0, pendingToPay: 0 };
        existing.pendingToPay += reimbursement.amount;
        memberMap.set(memberId, existing);
      }
    });

    return Array.from(memberMap.values()).filter(m => m.pendingToReceive > 0 || m.pendingToPay > 0);
  }, [pendingReimbursements, currentMemberId]);

  // Chart 2: Distribution by category
  const categoryData = useMemo(() => {
    if (!pendingReimbursements.length) return [];

    const categoryMap = new Map<string, number>();

    pendingReimbursements.forEach((reimbursement) => {
      const category = reimbursement.category || 'Non catégorisé';
      const existing = categoryMap.get(category) || 0;
      categoryMap.set(category, existing + reimbursement.amount);
    });

    return Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value
    }));
  }, [pendingReimbursements]);

  // Chart 3: Debt evolution by month
  const evolutionData = useMemo(() => {
    if (!pendingReimbursements.length) return [];

    const monthMap = new Map<string, number>();

    pendingReimbursements.forEach((reimbursement) => {
      const date = new Date(reimbursement.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      const existing = monthMap.get(monthKey) || 0;
      monthMap.set(monthKey, existing + reimbursement.amount);
    });

    const sortedMonths = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, amount], index, array) => {
        const date = new Date(key + '-01');
        const monthLabel = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        const cumulative = array.slice(0, index + 1).reduce((sum, [, amt]) => sum + amt, 0);
        return {
          month: monthLabel,
          total: cumulative
        };
      });

    return sortedMonths;
  }, [pendingReimbursements]);

  // Empty state
  if (!pendingReimbursements.length) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">Aucune donnée disponible pour afficher les statistiques</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart 1: Distribution by category */}
      {categoryData.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par catégorie</h3>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.pieColors[index % COLORS.pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Chart 2: Debt evolution */}
      {evolutionData.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des dettes</h3>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={evolutionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Total cumulé"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Chart 3: Summary by member */}
      {memberSummaryData.length > 0 && (
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé par membre</h3>
          <div className="overflow-x-auto">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={memberSummaryData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="pendingToReceive" fill={COLORS.green} name="On me doit" />
                <Bar dataKey="pendingToPay" fill={COLORS.red} name="Je dois" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReimbursementStatsSection;
