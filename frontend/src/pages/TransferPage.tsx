import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Save, X, Settings, Repeat, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../stores/appStore';
import transactionService from '../services/transactionService';
import accountService from '../services/accountService';
import feeService from '../services/feeService';
import recurringTransactionService from '../services/recurringTransactionService';
import { CurrencyInput } from '../components/Currency';
import { useCurrency } from '../hooks/useCurrency';
import RecurringConfigSection from '../components/RecurringConfig/RecurringConfigSection';
import { validateRecurringData } from '../utils/recurringUtils';
import { ACCOUNT_TYPES } from '../constants';
import type { Account, CalculatedFees } from '../types';
import type { RecurrenceFrequency } from '../types/recurring';

// Interface for navigation state from GoalsPage
interface TransferNavigationState {
  destinationAccountId?: string;
  suggestedAmount?: number;
  goalId?: string;
  goalName?: string;
  returnTo?: string;
}

// LocalStorage key for last used source account
const LAST_SOURCE_ACCOUNT_KEY = 'bazarkely_last_transfer_source_account';

const TransferPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppStore();
  const { displayCurrency } = useCurrency();
  
  // Get navigation state from GoalsPage
  const transferState = location.state as TransferNavigationState | null;
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    fromAccountId: '',
    toAccountId: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Store goal name for display
  const [goalName, setGoalName] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [calculatedFees, setCalculatedFees] = useState<CalculatedFees | null>(null);
  const [includeWithdrawal, setIncludeWithdrawal] = useState(false);
  const [showFeeSettings, setShowFeeSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // État pour les transferts récurrents
  const [isRecurring, setIsRecurring] = useState(false);
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

  // Charger les comptes de l'utilisateur
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        console.log('🔍 Chargement des comptes depuis Supabase...');
        const userAccounts = await accountService.getAccounts();
        console.log('📊 Comptes récupérés:', userAccounts);
        setAccounts(userAccounts);
        
        // Step 1: Apply localStorage source account (if valid)
        const lastSourceId = localStorage.getItem(LAST_SOURCE_ACCOUNT_KEY);
        if (lastSourceId && userAccounts.some(acc => acc.id === lastSourceId)) {
          console.log('💾 [TransferPage] Compte source récupéré depuis localStorage:', lastSourceId);
          setFormData(prev => ({
            ...prev,
            fromAccountId: lastSourceId
          }));
        }
        
        // Step 2-5: Pre-fill form if navigation state exists
        if (transferState) {
          console.log('🎯 [TransferPage] State reçu depuis GoalsPage:', transferState);
          
          // Step 2: Pre-select destination account (overrides nothing, new field)
          if (transferState.destinationAccountId) {
            setFormData(prev => ({
              ...prev,
              toAccountId: transferState.destinationAccountId!
            }));
          }
          
          // Step 3: Pre-fill suggested amount (overrides nothing, new field)
          if (transferState.suggestedAmount) {
            setFormData(prev => ({
              ...prev,
              amount: transferState.suggestedAmount!.toString()
            }));
          }
          
          // Step 4: Auto-fill description with consistent format
          if (transferState.goalName) {
            setFormData(prev => ({
              ...prev,
              description: `Épargne - ${transferState.goalName}`
            }));
            
            // Store goal name for display banner
            setGoalName(transferState.goalName);
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des comptes:', error);
      }
    };
    loadAccounts();
  }, [transferState]);

  // Filtrer les comptes disponibles pour chaque dropdown
  const availableSourceAccounts = useMemo(() => {
    return accounts.filter(account => account.id !== formData.toAccountId);
  }, [accounts, formData.toAccountId]);

  const availableDestinationAccounts = useMemo(() => {
    return accounts.filter(account => account.id !== formData.fromAccountId);
  }, [accounts, formData.fromAccountId]);

  // Vider la sélection si elle devient invalide (même compte sélectionné)
  useEffect(() => {
    if (formData.fromAccountId && formData.toAccountId && formData.fromAccountId === formData.toAccountId) {
      // Si les deux comptes sont identiques, vider la destination
      setFormData(prev => ({
        ...prev,
        toAccountId: ''
      }));
      setError(null); // Clear any previous error
    }
  }, [formData.fromAccountId, formData.toAccountId]);

  // Calculer les frais de transfert
  useEffect(() => {
    const calculateFees = async () => {
      if (formData.amount && formData.fromAccountId && formData.toAccountId) {
        const amount = parseFloat(formData.amount);
        if (!isNaN(amount) && amount > 0) {
          const fromAccount = accounts.find(acc => acc.id === formData.fromAccountId);
          const toAccount = accounts.find(acc => acc.id === formData.toAccountId);
          
          if (fromAccount && toAccount) {
            try {
              const fees = await feeService.calculateFees(
                fromAccount.type,
                toAccount.type,
                amount,
                includeWithdrawal && toAccount.type === 'especes'
              );
              setCalculatedFees(fees);
            } catch (error) {
              console.error('Erreur lors du calcul des frais:', error);
              setCalculatedFees({
                transferFee: 0,
                withdrawalFee: 0,
                totalFees: 0,
                breakdown: {
                  transferFee: 0,
                  withdrawalFee: 0,
                  totalFees: 0
                }
              });
            }
          }
        }
      } else {
        setCalculatedFees(null);
      }
    };

    calculateFees();
  }, [formData.amount, formData.fromAccountId, formData.toAccountId, includeWithdrawal, accounts]);

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
    
    // ============================================================================
    // LOG #1 - Form submission entry point
    // ============================================================================
    console.group('💸 [TransferPage] Form Submission Started');
    const amount = parseFloat(formData.amount);
    console.log('📝 Form Data:', {
      amount: amount,
      displayCurrency: displayCurrency,
      fromAccountId: formData.fromAccountId,
      toAccountId: formData.toAccountId,
      description: formData.description,
      date: formData.date,
      isRecurring: isRecurring
    });
    
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      console.groupEnd();
      return;
    }

    // Validation
    if (!formData.amount || !formData.description || !formData.fromAccountId || !formData.toAccountId) {
      console.error('❌ Veuillez remplir tous les champs obligatoires');
      console.groupEnd();
      return;
    }

    if (formData.fromAccountId === formData.toAccountId) {
      const errorMessage = 'Le compte source et le compte destination doivent être différents';
      console.error('❌', errorMessage);
      console.groupEnd();
      setError(errorMessage);
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Le montant doit être un nombre positif');
      console.groupEnd();
      setError('❌ Le montant doit être un nombre positif');
      return;
    }

    // Vérifier le solde du compte source avec règles de découvert
    const fromAccount = accounts.find(acc => acc.id === formData.fromAccountId);
    const toAccount = accounts.find(acc => acc.id === formData.toAccountId);
    const totalAmount = amount + (calculatedFees?.totalFees || 0);
    
    if (!fromAccount || !toAccount) {
      const errorMessage = 'Compte source ou destination introuvable';
      console.error('❌', errorMessage);
      console.groupEnd();
      setError(errorMessage);
      return;
    }
    
    if (fromAccount) {
      const accountTypeConfig = ACCOUNT_TYPES[fromAccount.type as keyof typeof ACCOUNT_TYPES];
      const allowNegative = accountTypeConfig?.allowNegative ?? false;
      
      if (!allowNegative && fromAccount.balance < totalAmount) {
        const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';
        const errorMessage = `Solde insuffisant. Le compte "${fromAccount.name}" ne permet pas le découvert. Solde disponible: ${fromAccount.balance.toLocaleString('fr-FR')} ${currencySymbol}`;
        console.error(`❌ ${errorMessage}`);
        console.groupEnd();
        setError(errorMessage);
        return;
      }
    }
    
    // ============================================================================
    // LOG #2 - After account fetch and currency validation
    // ============================================================================
    console.log('📊 Accounts Loaded:', {
      sourceAccount: {
        id: fromAccount.id,
        name: fromAccount.name,
        currency: fromAccount.currency,
        balance: fromAccount.balance,
        type: fromAccount.type
      },
      targetAccount: {
        id: toAccount.id,
        name: toAccount.name,
        currency: toAccount.currency,
        balance: toAccount.balance,
        type: toAccount.type
      }
    });

    // ============================================================================
    // STRICT CURRENCY VALIDATION - Fix EUR transfer bug
    // ============================================================================
    // Validate that both accounts have currency defined
    if (!fromAccount.currency || fromAccount.currency.trim() === '') {
      const errorMessage = `Le compte source "${fromAccount.name}" n'a pas de devise définie. Veuillez définir la devise dans les paramètres du compte avant d'effectuer un transfert.`;
      console.error('❌ Currency validation failed - source account missing currency:', {
        accountId: fromAccount.id,
        accountName: fromAccount.name,
        currency: fromAccount.currency
      });
      console.groupEnd();
      toast.error(errorMessage, { duration: 6000 });
      setError(errorMessage);
      return;
    }

    if (!toAccount.currency || toAccount.currency.trim() === '') {
      const errorMessage = `Le compte destination "${toAccount.name}" n'a pas de devise définie. Veuillez définir la devise dans les paramètres du compte avant d'effectuer un transfert.`;
      console.error('❌ Currency validation failed - target account missing currency:', {
        accountId: toAccount.id,
        accountName: toAccount.name,
        currency: toAccount.currency
      });
      console.groupEnd();
      toast.error(errorMessage, { duration: 6000 });
      setError(errorMessage);
      return;
    }

    // ============================================================================
    // CURRENCY MISMATCH DETECTION - User warnings
    // ============================================================================
    // Warning: Display currency mismatch with source account
    if (displayCurrency !== fromAccount.currency) {
      console.warn('⚠️ Display currency mismatch:', {
        displayCurrency: displayCurrency,
        sourceAccountCurrency: fromAccount.currency
      });
      toast.warning(
        `La devise affichée (${displayCurrency}) ne correspond pas à la devise du compte source (${fromAccount.currency}). ` +
        `Le montant sera traité en ${fromAccount.currency}.`,
        { duration: 5000 }
      );
    }

    // Info: Cross-currency transfer detected
    if (fromAccount.currency !== toAccount.currency) {
      console.warn('⚠️ Cross-currency transfer detected:', {
        from: fromAccount.currency,
        to: toAccount.currency,
        amount: amount
      });
      toast.info(
        `Transfert entre devises différentes : ${fromAccount.currency} → ${toAccount.currency}. ` +
        `Le taux de change actuel sera appliqué.`,
        { duration: 5000 }
      );
    } else {
      console.log('✅ Same currency transfer - no conversion needed');
    }
    
    // Clear any previous error
    setError(null);

    // Validation spécifique pour les transferts récurrents
    if (isRecurring) {
      const validation = validateRecurringData({
        userId: user.id,
        accountId: formData.fromAccountId,
        targetAccountId: formData.toAccountId,
        type: 'transfer',
        amount: Math.abs(amount),
        description: formData.description,
        category: 'transfert',
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
        console.groupEnd();
        return;
      }
      setRecurringErrors({});
    }

    setIsLoading(true);

    try {
      if (isRecurring) {
        // ============================================================================
        // LOG #3 - Before recurring transaction service call
        // ============================================================================
        console.log('🚀 Creating recurring transfer with:', {
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          amount: Math.abs(amount),
          description: formData.description,
          frequency: recurringConfig.frequency,
          sourceCurrency: fromAccount.currency,
          targetCurrency: toAccount.currency
        });
        
        // Créer un transfert récurrent
        const recurringResult = await recurringTransactionService.create({
          userId: user.id,
          accountId: formData.fromAccountId,
          targetAccountId: formData.toAccountId,
          type: 'transfer',
          amount: Math.abs(amount),
          description: formData.description,
          category: 'transfert',
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

        // ============================================================================
        // LOG #4 - After successful recurring transfer creation
        // ============================================================================
        console.log('✅ Recurring transfer created successfully:', {
          recurringResult: recurringResult,
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          amount: Math.abs(amount)
        });
        console.log('✅ Transfert récurrent créé avec succès !');
        
        // Save source account to localStorage for next time
        localStorage.setItem(LAST_SOURCE_ACCOUNT_KEY, formData.fromAccountId);
        console.log('💾 [TransferPage] Compte source sauvegardé dans localStorage:', formData.fromAccountId);
        console.groupEnd();
        
        // Navigate back to returnTo path if provided, otherwise default to /recurring
        if (transferState?.returnTo) {
          // Clear location state
          window.history.replaceState({}, document.title);
          
          // Show success toast
          if (transferState.goalName) {
            toast.success('Épargne ajoutée avec succès !');
          }
          
          navigate(transferState.returnTo);
        } else {
          navigate('/recurring'); // Rediriger vers la page des transactions récurrentes
        }
      } else {
        console.log('📅 Transfer form date:', formData.date);
        
        // ============================================================================
        // LOG #3 - Before service call
        // ============================================================================
        console.log('🚀 Calling transactionService.createTransfer with:', {
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          amount: amount,
          description: formData.description,
          date: new Date(formData.date),
          notes: formData.notes,
          sourceCurrency: fromAccount.currency,
          targetCurrency: toAccount.currency,
          displayCurrency: displayCurrency
        });
        
        // Créer le transfert avec la méthode dédiée
        const transferResult = await transactionService.createTransfer(user.id, {
          amount: amount,
          description: formData.description,
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          notes: formData.notes,
          date: new Date(formData.date)
        });

        // Si il y a des frais, créer des transactions de frais
        if (calculatedFees && calculatedFees.totalFees > 0) {
          // Frais de transfert
          if (calculatedFees.transferFee > 0) {
            await transactionService.createTransaction(user.id, {
              type: 'expense',
              amount: -calculatedFees.transferFee,
              description: 'Frais de transfert',
              category: 'autres',
              accountId: formData.fromAccountId,
              date: new Date(formData.date),
              notes: 'Frais de transfert'
            });
          }

          // Frais de retrait
          if (calculatedFees.withdrawalFee > 0) {
            await transactionService.createTransaction(user.id, {
              type: 'expense',
              amount: -calculatedFees.withdrawalFee,
              description: 'Frais de retrait',
              category: 'autres',
              accountId: formData.fromAccountId,
              date: new Date(formData.date),
              notes: 'Frais de retrait'
            });
          }
        }

        // ============================================================================
        // LOG #4 - After successful transfer
        // ============================================================================
        console.log('✅ Transfer completed successfully:', {
          transferResult: transferResult,
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          amount: amount,
          sourceCurrency: fromAccount.currency,
          targetCurrency: toAccount.currency
        });
        console.log('✅ Transfert effectué avec succès !');
        
        // Save source account to localStorage for next time
        localStorage.setItem(LAST_SOURCE_ACCOUNT_KEY, formData.fromAccountId);
        console.log('💾 [TransferPage] Compte source sauvegardé dans localStorage:', formData.fromAccountId);
        console.groupEnd();
        
        // Navigate back to returnTo path if provided, otherwise default to /transactions
        if (transferState?.returnTo) {
          // Clear location state
          window.history.replaceState({}, document.title);
          
          // Show success toast
          if (transferState.goalName) {
            toast.success('Épargne ajoutée avec succès !');
          }
          
          navigate(transferState.returnTo);
        } else {
          navigate('/transactions');
        }
      }
      
    } catch (error) {
      // ============================================================================
      // LOG #5 - On error with enhanced error handling
      // ============================================================================
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error('❌ Transfer failed:', {
        error: errorMessage,
        errorObject: error,
        formData: {
          amount: formData.amount,
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          description: formData.description
        },
        accounts: {
          source: fromAccount ? {
            id: fromAccount.id,
            name: fromAccount.name,
            currency: fromAccount.currency
          } : null,
          target: toAccount ? {
            id: toAccount.id,
            name: toAccount.name,
            currency: toAccount.currency
          } : null
        }
      });
      console.groupEnd();
      
      // Enhanced error message for currency issues
      if (errorMessage.includes('devise') || errorMessage.includes('currency') || errorMessage.includes('Currency')) {
        toast.error(
          `Erreur de devise : ${errorMessage}. ` +
          `Vérifiez que les comptes ont une devise définie dans les paramètres.`,
          { duration: 6000 }
        );
        setError(`Erreur de devise : ${errorMessage}`);
      } else if (errorMessage.includes('Solde insuffisant') || errorMessage.includes('insufficient')) {
        toast.error(`Erreur : ${errorMessage}`, { duration: 5000 });
        setError(errorMessage);
      } else {
        toast.error(`Erreur lors du transfert : ${errorMessage}`, { duration: 5000 });
        setError(`Erreur lors du transfert : ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/transactions');
  };

  const fromAccount = accounts.find(acc => acc.id === formData.fromAccountId);
  const toAccount = accounts.find(acc => acc.id === formData.toAccountId);

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
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Transfert entre comptes</h1>
                <p className="text-sm text-gray-600">Transférez de l'argent entre vos comptes</p>
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
          {/* Info banner for goal contribution */}
          {goalName && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="text-blue-800 text-sm">
                Contribution vers l'objectif: <strong>{goalName}</strong>
              </span>
            </div>
          )}
          
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
                    Créer un transfert qui se répète automatiquement
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
              transactionType="transfer"
              errors={recurringErrors}
            />
          )}
          
          {/* Montant */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant à transférer *
            </label>
            <CurrencyInput
              id="amount"
              value={formData.amount}
              onChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  amount: value.toString()
                }));
              }}
              currency={displayCurrency}
              onCurrencyChange={() => {
                // Currency change is handled by the hook, no need to update formData
              }}
              placeholder="0"
              required
              className="text-lg font-semibold"
            />
          </div>

          {/* Compte source */}
          <div>
            <label htmlFor="fromAccountId" className="block text-sm font-medium text-gray-700 mb-2">
              Compte source *
            </label>
            <select
              id="fromAccountId"
              name="fromAccountId"
              value={formData.fromAccountId}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner le compte source</option>
              {availableSourceAccounts.map((account) => {
                const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';
                return (
                  <option key={account.id} value={account.id}>
                    {account.name} - {account.balance.toLocaleString('fr-FR')} {currencySymbol}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Compte de destination */}
          <div>
            <label htmlFor="toAccountId" className="block text-sm font-medium text-gray-700 mb-2">
              Compte de destination *
            </label>
            <select
              id="toAccountId"
              name="toAccountId"
              value={formData.toAccountId}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner le compte de destination</option>
              {accounts
                .filter(account => account.id !== formData.fromAccountId)
                .map((account) => {
                  const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';
                  return (
                    <option key={account.id} value={account.id}>
                      {account.name} - {account.balance.toLocaleString('fr-FR')} {currencySymbol}
                    </option>
                  );
                })}
            </select>
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
              placeholder="Ex: Virement vers épargne"
              maxLength={100}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Date */}
          {!isRecurring && (
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
          )}

          {/* Options de frais */}
          {formData.fromAccountId && formData.toAccountId && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Options de frais</h3>
              
              {/* Inclure les frais de retrait */}
              {accounts.find(acc => acc.id === formData.toAccountId)?.type === 'especes' && (
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="includeWithdrawal"
                    checked={includeWithdrawal}
                    onChange={(e) => setIncludeWithdrawal(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeWithdrawal" className="ml-2 block text-sm text-gray-900">
                    Inclure les frais de retrait en espèces
                  </label>
                </div>
              )}

              {/* Bouton de gestion des frais */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Les frais sont calculés automatiquement selon les configurations
                </span>
                <button
                  type="button"
                  onClick={() => setShowFeeSettings(true)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Settings className="w-4 h-4" />
                  <span>Gérer les frais</span>
                </button>
              </div>
            </div>
          )}

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

          {/* Résumé du transfert */}
          {formData.amount && formData.fromAccountId && formData.toAccountId && calculatedFees && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Résumé du transfert</h3>
              <div className="space-y-2 text-sm">
                {(() => {
                  const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Montant à transférer:</span>
                        <span className="font-medium">{parseFloat(formData.amount || '0').toLocaleString('fr-FR')} {currencySymbol}</span>
                      </div>
                      
                      {/* Frais de transfert */}
                      {calculatedFees.transferFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frais de transfert:</span>
                          <span className="font-medium text-red-600">-{calculatedFees.transferFee.toLocaleString('fr-FR')} {currencySymbol}</span>
                        </div>
                      )}

                      {/* Frais de retrait */}
                      {calculatedFees.withdrawalFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frais de retrait:</span>
                          <span className="font-medium text-red-600">-{calculatedFees.withdrawalFee.toLocaleString('fr-FR')} {currencySymbol}</span>
                        </div>
                      )}

                      <div className="flex justify-between border-t border-blue-200 pt-2">
                        <span className="text-gray-600">Total débité du compte source:</span>
                        <span className="font-semibold text-blue-900">{(parseFloat(formData.amount || '0') + calculatedFees.totalFees).toLocaleString('fr-FR')} {currencySymbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">De:</span>
                        <span className="font-medium">{fromAccount?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vers:</span>
                        <span className="font-medium">{toAccount?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Montant reçu:</span>
                        <span className="font-medium text-green-600">{parseFloat(formData.amount || '0').toLocaleString('fr-FR')} {currencySymbol}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              {/* Information sur les frais */}
              {calculatedFees.totalFees > 0 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  💡 Les frais sont calculés selon les configurations système. 
                  {includeWithdrawal && ' Frais de retrait inclus.'}
                </div>
              )}
            </div>
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
              disabled={isLoading || !formData.amount || !formData.fromAccountId || !formData.toAccountId}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span>
                {isLoading 
                  ? 'Transfert en cours...' 
                  : isRecurring 
                    ? 'Créer la récurrence' 
                    : 'Effectuer le transfert'
                }
              </span>
            </button>
          </div>
        </form>

        {/* Modal de gestion des frais */}
        {showFeeSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Gestion des frais</h2>
                  <button
                    onClick={() => setShowFeeSettings(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Configuration actuelle</h3>
                    <p className="text-sm text-blue-800">
                      Les frais sont calculés automatiquement selon les configurations système.
                      Seuls les administrateurs peuvent modifier ces paramètres.
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Frais calculés pour ce transfert</h3>
                    {calculatedFees ? (
                      (() => {
                        const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Frais de transfert:</span>
                              <span className="font-medium">{calculatedFees.transferFee.toLocaleString('fr-FR')} {currencySymbol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Frais de retrait:</span>
                              <span className="font-medium">{calculatedFees.withdrawalFee.toLocaleString('fr-FR')} {currencySymbol}</span>
                            </div>
                            <div className="flex justify-between border-t border-gray-200 pt-2">
                              <span className="text-gray-600 font-medium">Total des frais:</span>
                              <span className="font-bold text-red-600">{calculatedFees.totalFees.toLocaleString('fr-FR')} {currencySymbol}</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-sm text-gray-600">Aucun frais calculé</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowFeeSettings(false)}
                      className="btn-secondary"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => navigate('/fee-management')}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Gérer les configurations</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferPage;
