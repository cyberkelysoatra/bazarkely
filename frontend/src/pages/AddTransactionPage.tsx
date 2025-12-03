import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Save, X, HelpCircle, Repeat } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import transactionService from '../services/transactionService';
import recurringTransactionService from '../services/recurringTransactionService';
import accountService from '../services/accountService';
import CategoryHelpModal from '../components/Transaction/CategoryHelpModal';
import RecurringConfigSection from '../components/RecurringConfig/RecurringConfigSection';
import { usePracticeTracking } from '../hooks/usePracticeTracking';
import { validateRecurringData } from '../utils/recurringUtils';
import { CurrencyInput } from '../components/Currency';
import { ACCOUNT_TYPES } from '../constants';
import type { Account, TransactionCategory } from '../types';
import type { RecurrenceFrequency } from '../types/recurring';
import { getCategoriesByType } from '../services/categoryService';
import type { TransactionCategory as CategoryFromDB } from '../services/categoryService';

const AddTransactionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transactionType = searchParams.get('type') || 'expense';
  const isRecurringParam = searchParams.get('recurring') === 'true';
  const { user } = useAppStore();
  const { trackTransaction } = usePracticeTracking();
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    notes: ''
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [transactionCurrency, setTransactionCurrency] = useState<'MGA' | 'EUR'>('MGA');
  const [categories, setCategories] = useState<CategoryFromDB[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // État pour les transactions récurrentes
  const [isRecurring, setIsRecurring] = useState(isRecurringParam);
  const [recurringConfig, setRecurringConfig] = useState({
    frequency: 'monthly' as RecurrenceFrequency,
    startDate: new Date(),
    endDate: null as Date | null,
    dayOfMonth: new Date().getDate(),
    dayOfWeek: null as number | null,
    notifyBeforeDays: 1,
    autoCreate: false,
    linkedBudgetId: null as string | null
  });
  const [recurringErrors, setRecurringErrors] = useState<Record<string, string>>({});

  const isIncome = transactionType === 'income';
  const isExpense = transactionType === 'expense';

  // Charger les comptes de l'utilisateur
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        console.log('🔍 Chargement des comptes depuis Supabase...');
        const userAccounts = await accountService.getAccounts();
        console.log('📊 Comptes récupérés:', userAccounts);
        setAccounts(userAccounts);
      } catch (error) {
        console.error('Erreur lors du chargement des comptes:', error);
      }
    };
    loadAccounts();
  }, []);

  // Charger les catégories depuis Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      const type = isIncome ? 'income' : 'expense';
      
      // Reset category when transaction type changes
      setFormData(prev => ({ ...prev, category: '' }));
      
      try {
        const fetchedCategories = await getCategoriesByType(type);
        setCategories(fetchedCategories);
        
        // Set default category after loading
        if (fetchedCategories.length > 0) {
          setFormData(prev => {
            // Only set default if category is empty (was reset above)
            if (!prev.category) {
              return { ...prev, category: fetchedCategories[0].name };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    
    fetchCategories();
  }, [transactionType, isIncome]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user changes input
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    // Validation de base
    if (!formData.amount || !formData.description || !formData.category || !formData.accountId) {
      console.error('❌ Veuillez remplir tous les champs obligatoires');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Le montant doit être un nombre positif');
      setError('❌ Le montant doit être un nombre positif');
      return;
    }

    // Validation du solde pour les dépenses (sauf si le compte autorise le découvert)
    if (!isIncome && formData.accountId) {
      const selectedAccount = accounts.find(acc => acc.id === formData.accountId);
      if (selectedAccount) {
        const accountTypeConfig = ACCOUNT_TYPES[selectedAccount.type as keyof typeof ACCOUNT_TYPES];
        const allowNegative = accountTypeConfig?.allowNegative ?? false;
        const newBalance = selectedAccount.balance - amount;
        
        if (!allowNegative && newBalance < 0) {
          const errorMessage = `Solde insuffisant. Le compte "${selectedAccount.name}" ne permet pas le découvert. Solde disponible: ${selectedAccount.balance.toLocaleString('fr-FR')} Ar`;
          console.error(`❌ ${errorMessage}`);
          setError(errorMessage);
          return;
        }
      }
    }
    
    // Clear any previous error
    setError(null);

    // Store original currency and amount for multi-currency support
    const originalAmount = amount;
    const originalCurrency = transactionCurrency;

    // Validation spécifique pour les transactions récurrentes
    if (isRecurring) {
      const validation = validateRecurringData({
        userId: user.id,
        accountId: formData.accountId,
        type: transactionType as 'income' | 'expense',
        amount: Math.abs(amount),
        description: formData.description,
        category: formData.category,
        frequency: recurringConfig.frequency,
        startDate: recurringConfig.startDate,
        endDate: recurringConfig.endDate,
        dayOfMonth: recurringConfig.dayOfMonth,
        dayOfWeek: recurringConfig.dayOfWeek,
        notifyBeforeDays: recurringConfig.notifyBeforeDays,
        autoCreate: recurringConfig.autoCreate,
        linkedBudgetId: recurringConfig.linkedBudgetId,
        isActive: true
      });

      if (!validation.valid) {
        const errors: Record<string, string> = {};
        validation.errors.forEach(error => {
          // Extraire le nom du champ de l'erreur
          const fieldMatch = error.match(/^([^:]+):/);
          if (fieldMatch) {
            const field = fieldMatch[1].toLowerCase().replace(/\s+/g, '');
            errors[field] = error;
          }
        });
        setRecurringErrors(errors);
        console.error('❌ Erreurs de validation:', validation.errors);
        return;
      }
      setRecurringErrors({});
    }

    setIsLoading(true);

    try {
      if (isRecurring) {
        // Créer une transaction récurrente
        await recurringTransactionService.create({
          userId: user.id,
          accountId: formData.accountId,
          type: transactionType as 'income' | 'expense',
          amount: Math.abs(amount),
          description: formData.description,
          category: formData.category,
          frequency: recurringConfig.frequency,
          startDate: recurringConfig.startDate,
          endDate: recurringConfig.endDate,
          dayOfMonth: recurringConfig.dayOfMonth,
          dayOfWeek: recurringConfig.dayOfWeek,
          notifyBeforeDays: recurringConfig.notifyBeforeDays,
          autoCreate: recurringConfig.autoCreate,
          linkedBudgetId: recurringConfig.linkedBudgetId,
          isActive: true
        });

        console.log('✅ Transaction récurrente créée avec succès !');
        trackTransaction();
        navigate('/recurring'); // Rediriger vers la page des transactions récurrentes
      } else {
        // Créer une transaction normale
        await transactionService.createTransaction(user.id, {
          type: transactionType as 'income' | 'expense' | 'transfer',
          amount: isExpense ? -amount : amount,
          description: formData.description,
          category: formData.category as TransactionCategory,
          accountId: formData.accountId,
          date: new Date(formData.date),
          notes: formData.notes,
          originalCurrency: originalCurrency,
          originalAmount: originalAmount
        });

        console.log(`✅ ${isIncome ? 'Revenu' : 'Dépense'} ajouté avec succès !`);
        trackTransaction();
        navigate('/transactions'); // Rediriger vers la page des transactions
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création:', error);
      alert('❌ Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isIncome ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {isIncome ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Ajouter {isIncome ? 'un revenu' : 'une dépense'}
                </h1>
                <p className="text-sm text-gray-600">
                  {isIncome ? 'Enregistrez vos revenus' : 'Enregistrez vos dépenses'}
                </p>
              </div>
            </div>

            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          {/* Toggle Transaction récurrente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Repeat className="w-5 h-5 text-blue-600" />
                <div>
                  <label htmlFor="isRecurring" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Transaction récurrente
                  </label>
                  <p className="text-xs text-gray-600">
                    Créer une transaction qui se répète automatiquement
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Montant */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant *
            </label>
            <CurrencyInput
              id="amount"
              value={formData.amount}
              onChange={(value, currency) => {
                setFormData(prev => ({
                  ...prev,
                  amount: value.toString()
                }));
                // Currency is also updated via onCurrencyChange, but we keep it in sync here too
                if (currency !== transactionCurrency) {
                  setTransactionCurrency(currency);
                }
              }}
              currency={transactionCurrency}
              onCurrencyChange={(newCurrency) => {
                setTransactionCurrency(newCurrency);
              }}
              placeholder="0"
              required
              className="text-lg font-semibold"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Libellé *
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={isIncome ? "Ex: Salaire mars 2025" : "Ex: Courses Shoprite"}
              maxLength={100}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Catégorie */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie *
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="ml-2 inline-flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                title="Aide pour la catégorisation"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={categoriesLoading}
            >
              <option value="">Sélectionner une catégorie</option>
              {categoriesLoading ? (
                <option value="" disabled>Chargement...</option>
              ) : (
                categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.icon ? `${category.icon} ` : ''}{category.label}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Compte */}
          <div>
            <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-2">
              Compte *
            </label>
            <select
              id="accountId"
              name="accountId"
              value={formData.accountId}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner un compte</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.balance.toLocaleString('fr-FR')} MGA)
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Détails supplémentaires, mémo personnel..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Configuration récurrente (affichée seulement si isRecurring = true) */}
          {isRecurring && user && (
            <RecurringConfigSection
              frequency={recurringConfig.frequency}
              setFrequency={(freq) => setRecurringConfig(prev => ({ ...prev, frequency: freq }))}
              startDate={recurringConfig.startDate}
              setStartDate={(date) => setRecurringConfig(prev => ({ ...prev, startDate: date }))}
              endDate={recurringConfig.endDate}
              setEndDate={(date) => setRecurringConfig(prev => ({ ...prev, endDate: date }))}
              dayOfMonth={recurringConfig.dayOfMonth}
              setDayOfMonth={(day) => setRecurringConfig(prev => ({ ...prev, dayOfMonth: day }))}
              dayOfWeek={recurringConfig.dayOfWeek}
              setDayOfWeek={(day) => setRecurringConfig(prev => ({ ...prev, dayOfWeek: day }))}
              notifyBeforeDays={recurringConfig.notifyBeforeDays}
              setNotifyBeforeDays={(days) => setRecurringConfig(prev => ({ ...prev, notifyBeforeDays: days }))}
              autoCreate={recurringConfig.autoCreate}
              setAutoCreate={(auto) => setRecurringConfig(prev => ({ ...prev, autoCreate: auto }))}
              linkedBudgetId={recurringConfig.linkedBudgetId}
              setLinkedBudgetId={(id) => setRecurringConfig(prev => ({ ...prev, linkedBudgetId: id }))}
              userId={user.id}
              errors={recurringErrors}
            />
          )}

          {/* Boutons d'action */}
          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isIncome 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <Save className="w-5 h-5" />
              <span>
                {isLoading 
                  ? 'Enregistrement...' 
                  : isRecurring 
                    ? 'Créer la récurrence' 
                    : 'Enregistrer'
                }
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal d'aide pour la catégorisation */}
      <CategoryHelpModal 
        isOpen={showHelpModal} 
        onClose={() => setShowHelpModal(false)} 
      />
    </div>
  );
};

export default AddTransactionPage;
