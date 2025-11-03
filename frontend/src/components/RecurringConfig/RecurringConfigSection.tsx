/**
 * Section de configuration pour les transactions récurrentes
 * Composant réutilisable pour créer/éditer une transaction récurrente
 */

import { useState, useEffect } from 'react';
import { Calendar, Clock, Bell, Zap, Wallet } from 'lucide-react';
import type { RecurrenceFrequency } from '../../types/recurring';
import type { Budget } from '../../types';
import { db } from '../../lib/database';
import apiService from '../../services/apiService';
import { formatFrequency } from '../../utils/recurringUtils';

interface RecurringConfigSectionProps {
  frequency: RecurrenceFrequency;
  setFrequency: (freq: RecurrenceFrequency) => void;
  startDate: Date;
  setStartDate: (date: Date) => void;
  endDate: Date | null;
  setEndDate: (date: Date | null) => void;
  dayOfMonth: number | null;
  setDayOfMonth: (day: number | null) => void;
  dayOfWeek: number | null;
  setDayOfWeek: (day: number | null) => void;
  notifyBeforeDays: number;
  setNotifyBeforeDays: (days: number) => void;
  autoCreate: boolean;
  setAutoCreate: (auto: boolean) => void;
  linkedBudgetId: string | null;
  setLinkedBudgetId: (id: string | null) => void;
  userId: string;
  errors?: Record<string, string>;
}

const RecurringConfigSection: React.FC<RecurringConfigSectionProps> = ({
  frequency,
  setFrequency,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  dayOfMonth,
  setDayOfMonth,
  dayOfWeek,
  setDayOfWeek,
  notifyBeforeDays,
  setNotifyBeforeDays,
  autoCreate,
  setAutoCreate,
  linkedBudgetId,
  setLinkedBudgetId,
  userId,
  errors = {}
}) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);
  const [hasNoEndDate, setHasNoEndDate] = useState(endDate === null);

  // Charger les budgets de l'utilisateur
  useEffect(() => {
    const loadBudgets = async () => {
      try {
        setIsLoadingBudgets(true);
        const response = await apiService.getBudgets();
        if (response.success && response.data) {
          setBudgets(response.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des budgets:', error);
      } finally {
        setIsLoadingBudgets(false);
      }
    };

    if (userId) {
      loadBudgets();
    }
  }, [userId]);

  // Gérer le toggle "Sans fin"
  useEffect(() => {
    if (hasNoEndDate) {
      setEndDate(null);
    } else if (!endDate) {
      // Si on désactive "Sans fin" et qu'il n'y a pas de date, mettre une date par défaut
      const defaultEndDate = new Date(startDate);
      defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 1);
      setEndDate(defaultEndDate);
    }
  }, [hasNoEndDate, startDate]);

  // Réinitialiser les champs spécifiques à la fréquence quand elle change
  useEffect(() => {
    if (frequency === 'daily') {
      setDayOfMonth(null);
      setDayOfWeek(null);
    } else if (frequency === 'weekly') {
      setDayOfMonth(null);
      if (dayOfWeek === null) {
        setDayOfWeek(startDate.getDay());
      }
    } else if (['monthly', 'quarterly', 'yearly'].includes(frequency)) {
      setDayOfWeek(null);
      if (dayOfMonth === null) {
        setDayOfMonth(startDate.getDate());
      }
    }
  }, [frequency]);

  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  return (
    <div className="space-y-6 border-t border-gray-200 pt-6 mt-6">
      <div className="flex items-center space-x-2 mb-4">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Configuration de la récurrence</h3>
      </div>

      {/* Fréquence */}
      <div>
        <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
          Fréquence *
        </label>
        <select
          id="frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.frequency ? 'border-red-300' : 'border-slate-300'
          }`}
          required
        >
          <option value="daily">Quotidien</option>
          <option value="weekly">Hebdomadaire</option>
          <option value="monthly">Mensuel</option>
          <option value="quarterly">Trimestriel</option>
          <option value="yearly">Annuel</option>
        </select>
        {errors.frequency && (
          <p className="mt-1 text-sm text-red-600">{errors.frequency}</p>
        )}
      </div>

      {/* Date de début */}
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
          Date de début *
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate.toISOString().split('T')[0]}
          onChange={(e) => {
            const newDate = new Date(e.target.value);
            if (!isNaN(newDate.getTime())) {
              setStartDate(newDate);
              // Si la date de fin est avant la nouvelle date de début, ajuster
              if (endDate && endDate <= newDate) {
                const adjustedEnd = new Date(newDate);
                adjustedEnd.setFullYear(adjustedEnd.getFullYear() + 1);
                setEndDate(adjustedEnd);
              }
            }
          }}
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.startDate ? 'border-red-300' : 'border-slate-300'
          }`}
          required
        />
        {errors.startDate && (
          <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
        )}
      </div>

      {/* Date de fin */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <input
            type="checkbox"
            id="hasNoEndDate"
            checked={hasNoEndDate}
            onChange={(e) => setHasNoEndDate(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="hasNoEndDate" className="text-sm font-medium text-gray-700">
            Sans fin
          </label>
        </div>
        {!hasNoEndDate && (
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              Date de fin
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                const newDate = new Date(e.target.value);
                if (!isNaN(newDate.getTime()) && newDate > startDate) {
                  setEndDate(newDate);
                }
              }}
              min={startDate.toISOString().split('T')[0]}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.endDate ? 'border-red-300' : 'border-slate-300'
              }`}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
            )}
          </div>
        )}
      </div>

      {/* Jour du mois (pour monthly, quarterly, yearly) */}
      {['monthly', 'quarterly', 'yearly'].includes(frequency) && (
        <div>
          <label htmlFor="dayOfMonth" className="block text-sm font-medium text-gray-700 mb-2">
            Jour du mois *
          </label>
          <select
            id="dayOfMonth"
            value={dayOfMonth || ''}
            onChange={(e) => setDayOfMonth(e.target.value ? parseInt(e.target.value) : null)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.dayOfMonth ? 'border-red-300' : 'border-slate-300'
            }`}
            required
          >
            <option value="">Sélectionner un jour</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day === 31 ? 'Dernier jour du mois' : `Jour ${day}`}
              </option>
            ))}
          </select>
          {errors.dayOfMonth && (
            <p className="mt-1 text-sm text-red-600">{errors.dayOfMonth}</p>
          )}
        </div>
      )}

      {/* Jour de la semaine (pour weekly) */}
      {frequency === 'weekly' && (
        <div>
          <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-2">
            Jour de la semaine *
          </label>
          <select
            id="dayOfWeek"
            value={dayOfWeek !== null ? dayOfWeek : ''}
            onChange={(e) => setDayOfWeek(e.target.value ? parseInt(e.target.value) : null)}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.dayOfWeek ? 'border-red-300' : 'border-slate-300'
            }`}
            required
          >
            <option value="">Sélectionner un jour</option>
            {dayNames.map((name, index) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>
          {errors.dayOfWeek && (
            <p className="mt-1 text-sm text-red-600">{errors.dayOfWeek}</p>
          )}
        </div>
      )}

      {/* Paramètres de notification */}
      <div className="space-y-4 border-t border-gray-200 pt-4">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="w-5 h-5 text-blue-600" />
          <h4 className="text-md font-semibold text-gray-900">Notifications</h4>
        </div>

        <div>
          <label htmlFor="notifyBeforeDays" className="block text-sm font-medium text-gray-700 mb-2">
            Notifier X jours avant
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="number"
              id="notifyBeforeDays"
              min="0"
              max="7"
              value={notifyBeforeDays}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 7) {
                  setNotifyBeforeDays(value);
                }
              }}
              className="w-24 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">jours</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Vous serez notifié avant chaque transaction récurrente
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="autoCreate"
            checked={autoCreate}
            onChange={(e) => setAutoCreate(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="autoCreate" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Créer automatiquement la transaction</span>
          </label>
        </div>
        <p className="text-xs text-gray-500 ml-7">
          Si activé, la transaction sera créée automatiquement à la date prévue. Sinon, vous recevrez une notification pour confirmer.
        </p>
      </div>

      {/* Lien vers un budget (optionnel) */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center space-x-2 mb-4">
          <Wallet className="w-5 h-5 text-blue-600" />
          <h4 className="text-md font-semibold text-gray-900">Budget lié (optionnel)</h4>
        </div>
        <select
          id="linkedBudgetId"
          value={linkedBudgetId || ''}
          onChange={(e) => setLinkedBudgetId(e.target.value || null)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Aucun budget</option>
          {isLoadingBudgets ? (
            <option disabled>Chargement...</option>
          ) : budgets.length === 0 ? (
            <option disabled>Aucun budget disponible</option>
          ) : (
            budgets.map((budget) => (
              <option key={budget.id} value={budget.id}>
                {budget.category} - {budget.amount.toLocaleString('fr-FR')} Ar/mois
              </option>
            ))
          )}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Lier cette transaction récurrente à un budget pour un suivi automatique
        </p>
      </div>
    </div>
  );
};

export default RecurringConfigSection;

