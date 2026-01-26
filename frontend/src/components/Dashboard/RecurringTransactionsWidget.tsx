/**
 * Widget pour le dashboard affichant les prochaines transactions récurrentes
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import recurringTransactionService from '../../services/recurringTransactionService';
import type { RecurringTransaction } from '../../types/recurring';
import { getNextOccurrenceLabel } from '../../utils/recurringUtils';
import { useCurrency } from '../../hooks/useCurrency';

interface RecurringTransactionsWidgetProps {
  userId: string;
}

const RecurringTransactionsWidget: React.FC<RecurringTransactionsWidgetProps> = ({ userId }) => {
  const navigate = useNavigate();
  const [upcomingRecurring, setUpcomingRecurring] = useState<RecurringTransaction[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Currency display preference
  const { displayCurrency } = useCurrency();
  const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';

  useEffect(() => {
    loadUpcomingRecurring();
  }, [userId]);

  const loadUpcomingRecurring = async () => {
    try {
      setIsLoading(true);
      // Récupérer les transactions récurrentes actives
      const active = await recurringTransactionService.getActive(userId);
      setActiveCount(active.length);
      
      // Récupérer les prochaines dans les 7 jours
      const upcoming = await recurringTransactionService.getUpcomingInDays(userId, 7);
      
      // Trier par date de prochaine génération
      upcoming.sort((a, b) => 
        a.nextGenerationDate.getTime() - b.nextGenerationDate.getTime()
      );
      
      // Prendre les 3 premières
      setUpcomingRecurring(upcoming.slice(0, 3));
    } catch (error) {
      console.error('Erreur lors du chargement des transactions récurrentes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} ${currencySymbol}`;
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (upcomingRecurring.length === 0 && activeCount === 0) {
    return null; // Ne rien afficher s'il n'y a pas de transactions récurrentes
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Repeat className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Transactions récurrentes</h3>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {activeCount}
            </span>
          )}
        </div>
      </div>

      {upcomingRecurring.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-600 text-sm">
            Aucune transaction récurrente à venir dans les 7 prochains jours
          </p>
          <button
            onClick={() => navigate('/add-transaction?recurring=true')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Créer une charge FIXE
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {upcomingRecurring.map((recurring) => (
            <div
              key={recurring.id}
              onClick={() => navigate(`/recurring/${recurring.id}`)}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">{recurring.description}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600">
                    {getNextOccurrenceLabel(recurring.nextGenerationDate)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold text-sm ${
                  recurring.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {recurring.type === 'income' ? '+' : '-'}{formatCurrency(recurring.amount)}
                </p>
                <ArrowRight className="w-4 h-4 text-gray-400 mt-1 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeCount > 3 && (
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => navigate('/recurring')}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Voir toutes les {activeCount} transactions récurrentes
          </button>
        </div>
      )}
    </div>
  );
};

export default RecurringTransactionsWidget;

