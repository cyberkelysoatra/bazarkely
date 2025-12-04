/**
 * Liste des transactions récurrentes
 * Affiche les transactions récurrentes sous forme de cartes
 */

import { useState, useEffect } from 'react';
import { Repeat, Edit, Trash2, Calendar, Clock, Power, PowerOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import recurringTransactionService from '../../services/recurringTransactionService';
import type { RecurringTransaction } from '../../types/recurring';
import { formatRecurrenceDescription, getNextOccurrenceLabel, formatFrequency } from '../../utils/recurringUtils';
import { ConfirmModal } from '../UI';
import { useCurrency } from '../../hooks/useCurrency';

interface RecurringTransactionsListProps {
  userId: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  filterActive?: boolean | null; // null = all, true = active only, false = inactive only
  filterFrequency?: string | null;
}

const RecurringTransactionsList: React.FC<RecurringTransactionsListProps> = ({
  userId,
  onEdit,
  onDelete,
  filterActive = null,
  filterFrequency = null
}) => {
  const navigate = useNavigate();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  // Currency display preference
  const { displayCurrency } = useCurrency();
  const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';

  useEffect(() => {
    loadRecurringTransactions();
  }, [userId, filterActive, filterFrequency]);

  const loadRecurringTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let transactions: RecurringTransaction[] = [];
      
      if (filterActive === true) {
        transactions = await recurringTransactionService.getActive(userId);
      } else if (filterActive === false) {
        const all = await recurringTransactionService.getAll(userId);
        transactions = all.filter(t => !t.isActive);
      } else {
        transactions = await recurringTransactionService.getAll(userId);
      }

      // Filtrer par fréquence si spécifié
      if (filterFrequency) {
        transactions = transactions.filter(t => t.frequency === filterFrequency);
      }

      setRecurringTransactions(transactions);
    } catch (err) {
      console.error('Erreur lors du chargement des transactions récurrentes:', err);
      setError('Impossible de charger les transactions récurrentes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      setTogglingId(id);
      await recurringTransactionService.toggleActive(id, !currentState);
      await loadRecurringTransactions();
    } catch (err) {
      console.error('Erreur lors du changement d\'état:', err);
      alert('Erreur lors du changement d\'état');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await recurringTransactionService.delete(id);
      setDeleteConfirmId(null);
      await loadRecurringTransactions();
      if (onDelete) {
        onDelete(id);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} ${currencySymbol}`;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600 bg-green-100';
      case 'expense':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadRecurringTransactions}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (recurringTransactions.length === 0) {
    return (
      <div className="text-center py-12">
        <Repeat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune transaction récurrente</h3>
        <p className="text-gray-600 mb-4">
          {filterActive === true 
            ? 'Aucune transaction récurrente active' 
            : filterActive === false
              ? 'Aucune transaction récurrente inactive'
              : 'Commencez par créer votre première transaction récurrente'
          }
        </p>
        <button
          onClick={() => navigate('/add-transaction?recurring=true')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Créer une transaction récurrente
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {recurringTransactions.map((recurring) => (
          <div
            key={recurring.id}
            className="card hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/recurring/${recurring.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{recurring.description}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(recurring.type)}`}>
                    {recurring.type === 'income' ? 'Revenu' : 'Dépense'}
                  </span>
                  {!recurring.isActive && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Inactive
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900">{formatCurrency(recurring.amount)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Repeat className="w-4 h-4" />
                    <span>{formatFrequency(recurring.frequency)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Prochaine: {getNextOccurrenceLabel(recurring.nextGenerationDate)}</span>
                  </div>
                  
                  {recurring.endDate && (
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>Jusqu'au {recurring.endDate.toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(recurring.id, recurring.isActive);
                  }}
                  disabled={togglingId === recurring.id}
                  className={`p-2 rounded-lg transition-colors ${
                    recurring.isActive
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50`}
                  title={recurring.isActive ? 'Désactiver' : 'Activer'}
                >
                  {togglingId === recurring.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : recurring.isActive ? (
                    <Power className="w-4 h-4" />
                  ) : (
                    <PowerOff className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEdit) {
                      onEdit(recurring.id);
                    } else {
                      navigate(`/recurring/${recurring.id}/edit`);
                    }
                  }}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  title="Modifier"
                >
                  <Edit className="w-4 h-4" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(recurring.id);
                  }}
                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Supprimer la transaction récurrente"
        message="Êtes-vous sûr de vouloir supprimer cette transaction récurrente ? Toutes les transactions futures générées automatiquement seront également supprimées."
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
        loading={isDeleting}
      />
    </>
  );
};

export default RecurringTransactionsList;

