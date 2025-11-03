/**
 * Page principale pour gérer les transactions récurrentes
 * Affiche la liste, filtres, et actions de gestion
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Repeat, Filter, Calendar } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import RecurringTransactionsList from '../components/RecurringTransactions/RecurringTransactionsList';
import Modal from '../components/UI/Modal';
import RecurringConfigSection from '../components/RecurringConfig/RecurringConfigSection';
import recurringTransactionService from '../services/recurringTransactionService';
import { validateRecurringData } from '../utils/recurringUtils';
import type { RecurringTransaction } from '../types/recurring';
import type { RecurrenceFrequency } from '../types/recurring';

const RecurringTransactionsPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'frequency'>('all');
  const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingId && editingId !== null) {
      loadRecurringForEdit(editingId);
    }
  }, [editingId]);

  const loadRecurringForEdit = async (id: string) => {
    try {
      const recurring = await recurringTransactionService.getById(id);
      if (recurring) {
        setEditingRecurring(recurring);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    }
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecurring || !user) return;

    const validation = validateRecurringData({
      userId: user.id,
      accountId: editingRecurring.accountId,
      type: editingRecurring.type,
      amount: editingRecurring.amount,
      description: editingRecurring.description,
      category: editingRecurring.category,
      frequency: editingRecurring.frequency,
      startDate: editingRecurring.startDate,
      endDate: editingRecurring.endDate,
      dayOfMonth: editingRecurring.dayOfMonth,
      dayOfWeek: editingRecurring.dayOfWeek,
      notifyBeforeDays: editingRecurring.notifyBeforeDays,
      autoCreate: editingRecurring.autoCreate,
      linkedBudgetId: editingRecurring.linkedBudgetId,
      isActive: editingRecurring.isActive
    });

    if (!validation.valid) {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach(error => {
        const fieldMatch = error.match(/^([^:]+):/);
        if (fieldMatch) {
          const field = fieldMatch[1].toLowerCase().replace(/\s+/g, '');
          errorMap[field] = error;
        }
      });
      setErrors(errorMap);
      return;
    }

    setIsSaving(true);
    try {
      await recurringTransactionService.update(editingRecurring.id, {
        id: editingRecurring.id,
        ...editingRecurring
      });
      setShowEditModal(false);
      setEditingId(null);
      setEditingRecurring(null);
      setErrors({});
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const getFilterActive = (): boolean | null => {
    if (activeTab === 'active') return true;
    if (activeTab === 'inactive') return false;
    return null;
  };

  const frequencies: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
  const frequencyLabels: Record<RecurrenceFrequency, string> = {
    daily: 'Quotidien',
    weekly: 'Hebdomadaire',
    monthly: 'Mensuel',
    quarterly: 'Trimestriel',
    yearly: 'Annuel'
  };

  if (!user) {
    return (
      <div className="p-4">
        <p className="text-gray-600">Veuillez vous connecter</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions récurrentes</h1>
          <p className="text-gray-600">Gérez vos transactions automatiques</p>
        </div>
        <button
          onClick={() => navigate('/add-transaction?recurring=true')}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Créer</span>
        </button>
      </div>

      {/* Tabs/Filtres */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setActiveTab('all');
            setSelectedFrequency(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'all' && selectedFrequency === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Toutes
        </button>
        <button
          onClick={() => {
            setActiveTab('active');
            setSelectedFrequency(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'active' && selectedFrequency === null
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Actives
        </button>
        <button
          onClick={() => {
            setActiveTab('inactive');
            setSelectedFrequency(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'inactive' && selectedFrequency === null
              ? 'bg-gray-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Inactives
        </button>
        <button
          onClick={() => {
            setActiveTab('frequency');
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === 'frequency'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-4 h-4 inline mr-1" />
          Par fréquence
        </button>
      </div>

      {/* Filtre par fréquence */}
      {activeTab === 'frequency' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            {frequencies.map((freq) => (
              <button
                key={freq}
                onClick={() => setSelectedFrequency(selectedFrequency === freq ? null : freq)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedFrequency === freq
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-purple-700 hover:bg-purple-100'
                }`}
              >
                {frequencyLabels[freq]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste */}
      <RecurringTransactionsList
        userId={user.id}
        onEdit={handleEdit}
        filterActive={getFilterActive()}
        filterFrequency={selectedFrequency}
      />

      {/* Modal d'édition */}
      {showEditModal && editingRecurring && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingId(null);
            setEditingRecurring(null);
            setErrors({});
          }}
          title="Modifier la transaction récurrente"
          size="lg"
        >
          <div className="space-y-4">
            <RecurringConfigSection
              frequency={editingRecurring.frequency}
              setFrequency={(freq) => setEditingRecurring(prev => prev ? { ...prev, frequency: freq } : null)}
              startDate={editingRecurring.startDate}
              setStartDate={(date) => setEditingRecurring(prev => prev ? { ...prev, startDate: date } : null)}
              endDate={editingRecurring.endDate}
              setEndDate={(date) => setEditingRecurring(prev => prev ? { ...prev, endDate: date } : null)}
              dayOfMonth={editingRecurring.dayOfMonth}
              setDayOfMonth={(day) => setEditingRecurring(prev => prev ? { ...prev, dayOfMonth: day } : null)}
              dayOfWeek={editingRecurring.dayOfWeek}
              setDayOfWeek={(day) => setEditingRecurring(prev => prev ? { ...prev, dayOfWeek: day } : null)}
              notifyBeforeDays={editingRecurring.notifyBeforeDays}
              setNotifyBeforeDays={(days) => setEditingRecurring(prev => prev ? { ...prev, notifyBeforeDays: days } : null)}
              autoCreate={editingRecurring.autoCreate}
              setAutoCreate={(auto) => setEditingRecurring(prev => prev ? { ...prev, autoCreate: auto } : null)}
              linkedBudgetId={editingRecurring.linkedBudgetId}
              setLinkedBudgetId={(id) => setEditingRecurring(prev => prev ? { ...prev, linkedBudgetId: id } : null)}
              userId={user.id}
              errors={errors}
            />
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingId(null);
                  setEditingRecurring(null);
                  setErrors({});
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default RecurringTransactionsPage;

