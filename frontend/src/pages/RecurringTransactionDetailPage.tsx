/**
 * Page de détail d'une transaction récurrente
 * Affiche les détails, historique, et actions
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Power, PowerOff, Calendar, Repeat, Clock, Wallet, Zap, Bell, TrendingUp, TrendingDown } from 'lucide-react';
import recurringTransactionService from '../services/recurringTransactionService';
import transactionService from '../services/transactionService';
import { db } from '../lib/database';
import { formatRecurrenceDescription, getNextOccurrenceLabel, formatFrequency, getNextNOccurrences } from '../utils/recurringUtils';
import { ConfirmModal, Modal } from '../components/UI';
import RecurringConfigSection from '../components/RecurringConfig/RecurringConfigSection';
import { validateRecurringData } from '../utils/recurringUtils';
import { useCurrency } from '../hooks/useCurrency';
import type { RecurringTransaction } from '../types/recurring';
import type { Transaction } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants';

const RecurringTransactionDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { displayCurrency } = useCurrency();
  const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';
  const [recurring, setRecurring] = useState<RecurringTransaction | null>(null);
  const [generatedTransactions, setGeneratedTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [upcomingOccurrences, setUpcomingOccurrences] = useState<Date[]>([]);

  useEffect(() => {
    if (id) {
      loadRecurringTransaction();
      loadGeneratedTransactions();
    }
  }, [id]);

  const loadRecurringTransaction = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const transaction = await recurringTransactionService.getById(id);
      if (transaction) {
        setRecurring(transaction);
        // Calculer les prochaines occurrences
        const nextOccurrences = getNextNOccurrences(transaction, 5);
        setUpcomingOccurrences(nextOccurrences);
      } else {
        navigate('/recurring');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      navigate('/recurring');
    } finally {
      setIsLoading(false);
    }
  };

  const loadGeneratedTransactions = async () => {
    if (!id) return;

    try {
      const transactions = await db.transactions
        .where('recurringTransactionId')
        .equals(id)
        .toArray();
      
      // Trier par date décroissante
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setGeneratedTransactions(transactions);
    } catch (error) {
      console.error('Erreur lors du chargement des transactions générées:', error);
    }
  };

  const handleToggleActive = async () => {
    if (!recurring) return;

    try {
      await recurringTransactionService.toggleActive(recurring.id, !recurring.isActive);
      await loadRecurringTransaction();
    } catch (error) {
      console.error('Erreur lors du changement d\'état:', error);
      alert('Erreur lors du changement d\'état');
    }
  };

  const handleDelete = async () => {
    if (!recurring) return;

    try {
      await recurringTransactionService.delete(recurring.id);
      navigate('/recurring');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleGenerateNow = async () => {
    if (!recurring) return;

    try {
      setIsGenerating(true);
      const transaction = await recurringTransactionService.generateTransaction(recurring.id);
      if (transaction) {
        alert('Transaction générée avec succès !');
        await loadRecurringTransaction();
        await loadGeneratedTransactions();
      } else {
        alert('Aucune transaction générée. Vérifiez que la date est due.');
      }
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      alert('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!recurring) return;

    const validation = validateRecurringData({
      userId: recurring.userId,
      accountId: recurring.accountId,
      type: recurring.type,
      amount: recurring.amount,
      description: recurring.description,
      category: recurring.category,
      frequency: recurring.frequency,
      startDate: recurring.startDate,
      endDate: recurring.endDate,
      dayOfMonth: recurring.dayOfMonth,
      dayOfWeek: recurring.dayOfWeek,
      notifyBeforeDays: recurring.notifyBeforeDays,
      autoCreate: recurring.autoCreate,
      linkedBudgetId: recurring.linkedBudgetId,
      isActive: recurring.isActive
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
      await recurringTransactionService.update(recurring.id, {
        id: recurring.id,
        ...recurring
      });
      setShowEditModal(false);
      setErrors({});
      await loadRecurringTransaction();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} ${currencySymbol}`;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!recurring) {
    return (
      <div className="p-4">
        <p className="text-gray-600">Transaction récurrente non trouvée</p>
        <button
          onClick={() => navigate('/recurring')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retour
        </button>
      </div>
    );
  }

  const category = TRANSACTION_CATEGORIES[recurring.category as keyof typeof TRANSACTION_CATEGORIES] || {
    name: recurring.category,
    icon: 'MoreHorizontal',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50'
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/recurring')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Détails de la récurrence</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Carte principale */}
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{recurring.description}</h2>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  recurring.type === 'income'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {recurring.type === 'income' ? 'Revenu' : 'Dépense'}
                </span>
                {!recurring.isActive && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-4">{formatCurrency(recurring.amount)}</p>
            </div>
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
              recurring.type === 'income' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {recurring.type === 'income' ? (
                <TrendingUp className="w-8 h-8 text-green-600" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-600" />
              )}
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Catégorie</p>
                <p className="font-medium text-gray-900">{category.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Fréquence</p>
                <div className="flex items-center space-x-2">
                  <Repeat className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900">{formatFrequency(recurring.frequency)}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Description de la récurrence</p>
              <p className="font-medium text-gray-900">{formatRecurrenceDescription(recurring)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Date de début</p>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900">{recurring.startDate.toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              {recurring.endDate && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date de fin</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900">{recurring.endDate.toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Prochaine occurrence</p>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <p className="font-medium text-blue-600">{getNextOccurrenceLabel(recurring.nextGenerationDate)}</p>
                <span className="text-sm text-gray-500">
                  ({recurring.nextGenerationDate.toLocaleDateString('fr-FR')})
                </span>
              </div>
            </div>

            {recurring.lastGeneratedDate && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Dernière génération</p>
                <p className="font-medium text-gray-900">
                  {recurring.lastGeneratedDate.toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Notification</p>
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <p className="font-medium text-gray-900">
                    {recurring.notifyBeforeDays} jour(s) avant
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Création automatique</p>
                <div className="flex items-center space-x-2">
                  <Zap className={`w-4 h-4 ${recurring.autoCreate ? 'text-yellow-500' : 'text-gray-400'}`} />
                  <p className="font-medium text-gray-900">
                    {recurring.autoCreate ? 'Activée' : 'Désactivée'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleToggleActive}
            className={`card hover:shadow-lg transition-shadow flex items-center justify-center space-x-2 py-4 ${
              recurring.isActive
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-gray-50 border-gray-200 text-gray-700'
            }`}
          >
            {recurring.isActive ? (
              <>
                <PowerOff className="w-5 h-5" />
                <span>Suspendre</span>
              </>
            ) : (
              <>
                <Power className="w-5 h-5" />
                <span>Reprendre</span>
              </>
            )}
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center space-x-2 py-4 bg-blue-50 border-blue-200 text-blue-700"
          >
            <Edit className="w-5 h-5" />
            <span>Modifier</span>
          </button>
          <button
            onClick={handleGenerateNow}
            disabled={isGenerating || !recurring.isActive}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center space-x-2 py-4 bg-purple-50 border-purple-200 text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-5 h-5" />
            <span>{isGenerating ? 'Génération...' : 'Générer maintenant'}</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="card hover:shadow-lg transition-shadow flex items-center justify-center space-x-2 py-4 bg-red-50 border-red-200 text-red-700"
          >
            <Trash2 className="w-5 h-5" />
            <span>Supprimer</span>
          </button>
        </div>

        {/* Prochaines occurrences */}
        {upcomingOccurrences.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prochaines occurrences</h3>
            <div className="space-y-2">
              {upcomingOccurrences.map((date, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {getNextOccurrenceLabel(date)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {date.toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historique des transactions générées */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Transactions générées ({generatedTransactions.length})
          </h3>
          {generatedTransactions.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              Aucune transaction générée pour le moment
            </p>
          ) : (
            <div className="space-y-2">
              {generatedTransactions.slice(0, 10).map((transaction) => (
                <div
                  key={transaction.id}
                  onClick={() => navigate(`/transaction/${transaction.id}`)}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <p className={`font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                  </p>
                </div>
              ))}
              {generatedTransactions.length > 10 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  Et {generatedTransactions.length - 10} autre(s) transaction(s)
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Supprimer la transaction récurrente"
        message="Êtes-vous sûr de vouloir supprimer cette transaction récurrente ? Toutes les transactions futures générées automatiquement seront également supprimées."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />

      {/* Modal d'édition */}
      {showEditModal && recurring && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setErrors({});
          }}
          title="Modifier la transaction récurrente"
          size="lg"
        >
          <div className="space-y-4">
            {/* Champs de base de la transaction */}
            <div className="space-y-4 border-b border-gray-200 pb-4">
              <h3 className="text-lg font-semibold text-gray-900">Informations de la transaction</h3>
              
              {/* Description */}
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <input
                  type="text"
                  id="edit-description"
                  value={recurring.description}
                  onChange={(e) => setRecurring(prev => prev ? { ...prev, description: e.target.value } : null)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.description ? 'border-red-300' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                )}
              </div>

              {/* Montant */}
              <div>
                <label htmlFor="edit-amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Montant ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  id="edit-amount"
                  min="0"
                  step="0.01"
                  value={recurring.amount}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === '' || inputValue === '-') {
                      // Allow empty input for user to clear field
                      return;
                    }
                    const value = parseFloat(inputValue);
                    if (!isNaN(value) && value >= 0) {
                      setRecurring(prev => prev ? { ...prev, amount: value } : null);
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.amount ? 'border-red-300' : 'border-slate-300'
                  }`}
                  required
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                )}
              </div>

              {/* Catégorie */}
              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie *
                </label>
                <select
                  id="edit-category"
                  value={recurring.category}
                  onChange={(e) => setRecurring(prev => prev ? { ...prev, category: e.target.value } : null)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.category ? 'border-red-300' : 'border-slate-300'
                  }`}
                  required
                >
                  {Object.entries(TRANSACTION_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>
            </div>

            <RecurringConfigSection
              frequency={recurring.frequency}
              setFrequency={(freq) => setRecurring(prev => prev ? { ...prev, frequency: freq } : null)}
              startDate={recurring.startDate}
              setStartDate={(date) => setRecurring(prev => prev ? { ...prev, startDate: date } : null)}
              endDate={recurring.endDate}
              setEndDate={(date) => setRecurring(prev => prev ? { ...prev, endDate: date } : null)}
              dayOfMonth={recurring.dayOfMonth}
              setDayOfMonth={(day) => setRecurring(prev => prev ? { ...prev, dayOfMonth: day } : null)}
              dayOfWeek={recurring.dayOfWeek}
              setDayOfWeek={(day) => setRecurring(prev => prev ? { ...prev, dayOfWeek: day } : null)}
              notifyBeforeDays={recurring.notifyBeforeDays}
              setNotifyBeforeDays={(days) => setRecurring(prev => prev ? { ...prev, notifyBeforeDays: days } : null)}
              autoCreate={recurring.autoCreate}
              setAutoCreate={(auto) => setRecurring(prev => prev ? { ...prev, autoCreate: auto } : null)}
              linkedBudgetId={recurring.linkedBudgetId}
              setLinkedBudgetId={(id) => setRecurring(prev => prev ? { ...prev, linkedBudgetId: id } : null)}
              userId={recurring.userId}
              transactionType={recurring.type}
              errors={errors}
            />
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => {
                  setShowEditModal(false);
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

export default RecurringTransactionDetailPage;

