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
import { useCurrency } from '../hooks/useCurrency';
import { ACCOUNT_TYPES } from '../constants';
import type { Account, TransactionCategory } from '../types';
import type { RecurrenceFrequency } from '../types/recurring';
import { getCategoriesByType } from '../services/categoryService';
import type { TransactionCategory as CategoryFromDB } from '../services/categoryService';
import ShareWithFamilySection from '../components/Family/ShareWithFamilySection';
import * as familyGroupService from '../services/familyGroupService';
import * as familySharingService from '../services/familySharingService';
import type { FamilyGroup, FamilySharingRule } from '../types/family';
import { useBudgetGauge } from '../hooks/useBudgetGauge';
import BudgetGauge from '../components/BudgetGauge';
import { getActiveLoansForDropdown } from '../services/loanService';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

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
  const { displayCurrency: transactionCurrency, setDisplayCurrency: setTransactionCurrency } = useCurrency();
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

  // État pour le partage familial
  const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
  const [selectedFamilyGroupId, setSelectedFamilyGroupId] = useState<string | null>(null);
  const [shareWithFamily, setShareWithFamily] = useState<boolean>(false);
  const [requestReimbursement, setRequestReimbursement] = useState<boolean>(false);
  const [sharingRules, setSharingRules] = useState<FamilySharingRule[]>([]);
  const [familyGroupsLoading, setFamilyGroupsLoading] = useState<boolean>(false);

  // État pour les prêts
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('');
  const [durationMonths, setDurationMonths] = useState<string>('');
  const [activeLoans, setActiveLoans] = useState<Array<{ id: string; label: string; remainingBalance: number; currency: string; isITheBorrower: boolean }>>([]);
  const [activeLoansLoading, setActiveLoansLoading] = useState<boolean>(false);

  const isIncome = transactionType === 'income';
  const isExpense = transactionType === 'expense';

  // Budget gauge hook - called at top level, hook handles early return internally
  const {
    budgetAmount,
    spentAmount,
    projectedSpent,
    percentage,
    remaining,
    status,
    loading: budgetLoading,
    error: budgetError,
    hasBudget
  } = useBudgetGauge(
    formData.category,
    parseFloat(formData.amount) || 0,
    formData.date,
    isExpense
  );

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

  // Charger les groupes familiaux de l'utilisateur
  useEffect(() => {
    const loadFamilyGroups = async () => {
      if (!user) return;
      
      setFamilyGroupsLoading(true);
      try {
        const groups = await familyGroupService.getUserFamilyGroups(user.id);
        setFamilyGroups(groups);
        
        // Pré-sélectionner le premier groupe si disponible
        if (groups.length > 0 && !selectedFamilyGroupId) {
          setSelectedFamilyGroupId(groups[0].id);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des groupes familiaux:', error);
        setFamilyGroups([]);
      } finally {
        setFamilyGroupsLoading(false);
      }
    };
    
    loadFamilyGroups();
  }, [user]);

  // Charger les règles de partage quand le groupe sélectionné change
  useEffect(() => {
    const loadSharingRules = async () => {
      if (!selectedFamilyGroupId) {
        setSharingRules([]);
        return;
      }

      try {
        const rules = await familySharingService.getUserSharingRules(selectedFamilyGroupId);
        setSharingRules(rules);
      } catch (error) {
        console.error('Erreur lors du chargement des règles de partage:', error);
        setSharingRules([]);
      }
    };

    loadSharingRules();
  }, [selectedFamilyGroupId]);

  // Vérifier l'auto-partage selon la catégorie
  useEffect(() => {
    const checkAutoShare = async () => {
      if (!selectedFamilyGroupId || !formData.category) {
        return;
      }

      try {
        const shouldAutoShare = await familySharingService.shouldAutoShare(
          selectedFamilyGroupId,
          formData.category
        );
        
        // Activer le partage automatiquement si la règle l'exige
        if (shouldAutoShare && !shareWithFamily) {
          setShareWithFamily(true);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'auto-partage:', error);
      }
    };

    checkAutoShare();
  }, [formData.category, selectedFamilyGroupId, shareWithFamily]);

  // Charger les prêts actifs quand une catégorie de remboursement est sélectionnée
  useEffect(() => {
    const loadActiveLoans = async () => {
      const isRepaymentCategory = formData.category === 'loan_repayment' || formData.category === 'loan_repayment_received';
      
      if (!isRepaymentCategory) {
        setActiveLoans([]);
        setSelectedLoanId('');
        return;
      }

      setActiveLoansLoading(true);
      try {
        const loans = await getActiveLoansForDropdown();
        setActiveLoans(loans);
      } catch (error) {
        console.error('Erreur lors du chargement des prêts actifs:', error);
        setActiveLoans([]);
      } finally {
        setActiveLoansLoading(false);
      }
    };

    loadActiveLoans();
  }, [formData.category]);

  // Réinitialiser les champs de prêt quand la catégorie change
  useEffect(() => {
    const isLoanCategory = formData.category === 'loan' || formData.category === 'loan_received' || 
                          formData.category === 'loan_repayment' || formData.category === 'loan_repayment_received';
    
    if (!isLoanCategory) {
      setSelectedLoanId('');
      setBeneficiaryName('');
      setInterestRate('');
      setDurationMonths('');
    }
  }, [formData.category]);

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

  // Handler pour le partage familial
  const handleShareChange = (data: {
    isShared: boolean;
    groupId: string | null;
    requestReimbursement: boolean;
  }) => {
    setShareWithFamily(data.isShared);
    setSelectedFamilyGroupId(data.groupId);
    setRequestReimbursement(data.requestReimbursement);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    // Validation de base
    // For loan categories, description is auto-populated from beneficiary, so we handle it separately
    const isLoanCategory = ['loan', 'loan_received', 'loan_repayment', 'loan_repayment_received'].includes(formData.category);
    const descriptionRequired = !isLoanCategory;
    
    if (!formData.amount || (descriptionRequired && !formData.description) || !formData.category || !formData.accountId) {
      console.error('❌ Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validation spécifique pour les catégories de prêt
    if (formData.category === 'loan' || formData.category === 'loan_received') {
      if (!beneficiaryName.trim()) {
        setError(`❌ Le ${formData.category === 'loan' ? 'nom du bénéficiaire' : 'nom du prêteur'} est requis`);
        return;
      }
      // Ensure description is set from beneficiary if empty
      if (!formData.description.trim() && beneficiaryName.trim()) {
        const autoDescription = formData.category === 'loan' 
          ? `Prêt à ${beneficiaryName}` 
          : `Prêt de ${beneficiaryName}`;
        setFormData(prev => ({ ...prev, description: autoDescription }));
      }
    }
    
    if (formData.category === 'loan_repayment' || formData.category === 'loan_repayment_received') {
      if (!selectedLoanId) {
        setError('❌ Veuillez sélectionner un prêt');
        return;
      }
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
    
    console.log('📝 [AddTransactionPage] Submitting with currency toggle:', {
      displayCurrency: transactionCurrency,
      amount: originalAmount,
      note: 'This currency comes from form toggle, not /settings'
    });

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
        const recurringTransaction = await recurringTransactionService.create({
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
        
        // Partager la transaction récurrente si demandé
        if (shareWithFamily && selectedFamilyGroupId && recurringTransaction?.id) {
          try {
            await familySharingService.shareRecurringTransaction(
              selectedFamilyGroupId,
              recurringTransaction.id,
              false
            );
            console.log('✅ Transaction récurrente partagée avec la famille');
          } catch (shareError) {
            console.error('⚠️ Erreur lors du partage de la transaction récurrente:', shareError);
            // Ne pas bloquer la navigation en cas d'erreur de partage
          }
        }
        
        trackTransaction();
        navigate('/recurring'); // Rediriger vers la page des transactions récurrentes
      } else {
        // Créer une transaction normale
        const transaction = await transactionService.createTransaction(user.id, {
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
        
        // Gestion des prêts selon la catégorie
        if (transaction?.id) {
          const isLoanCategory = formData.category === 'loan' || formData.category === 'loan_received' || 
                                 formData.category === 'loan_repayment' || formData.category === 'loan_repayment_received';
          
          if (isLoanCategory) {
            try {
              // Catégorie "loan" (expense - prêt accordé)
              if (formData.category === 'loan') {
                if (!beneficiaryName.trim()) {
                  throw new Error('Le nom du bénéficiaire est requis');
                }
                
                // Calculer due_date si durationMonths fourni
                let dueDate = null;
                if (durationMonths) {
                  const months = parseInt(durationMonths);
                  if (!isNaN(months) && months > 0) {
                    const dueDateObj = new Date(formData.date);
                    dueDateObj.setMonth(dueDateObj.getMonth() + months);
                    dueDate = dueDateObj.toISOString().split('T')[0];
                  }
                }
                
                const { data: loanData, error: loanError } = await supabase
                  .from('personal_loans')
                  .insert({
                    lender_user_id: user.id,
                    borrower_user_id: null,
                    borrower_name: beneficiaryName.trim(),
                    borrower_phone: '',
                    is_i_the_borrower: false,
                    amount_initial: Math.abs(amount),
                    currency: originalCurrency,
                    interest_rate: parseFloat(interestRate) || 0,
                    interest_frequency: 'monthly',
                    current_capital: Math.abs(amount),
                    due_date: dueDate,
                    description: formData.description,
                    status: 'active',
                    transaction_id: transaction.id,
                    shared_with_family: shareWithFamily
                  })
                  .select()
                  .single();
                
                if (loanError) throw new Error(`Erreur création prêt: ${loanError.message}`);
                toast.success('Prêt créé avec succès');
              }
              
              // Catégorie "loan_received" (income - prêt reçu)
              else if (formData.category === 'loan_received') {
                if (!beneficiaryName.trim()) {
                  throw new Error('Le nom du prêteur est requis');
                }
                
                // Calculer due_date si durationMonths fourni
                let dueDate = null;
                if (durationMonths) {
                  const months = parseInt(durationMonths);
                  if (!isNaN(months) && months > 0) {
                    const dueDateObj = new Date(formData.date);
                    dueDateObj.setMonth(dueDateObj.getMonth() + months);
                    dueDate = dueDateObj.toISOString().split('T')[0];
                  }
                }
                
                const { data: loanData, error: loanError } = await supabase
                  .from('personal_loans')
                  .insert({
                    lender_user_id: null,
                    borrower_user_id: user.id,
                    lender_name: beneficiaryName.trim(),
                    borrower_name: '',
                    borrower_phone: '',
                    is_i_the_borrower: true,
                    amount_initial: Math.abs(amount),
                    currency: originalCurrency,
                    interest_rate: parseFloat(interestRate) || 0,
                    interest_frequency: 'monthly',
                    current_capital: Math.abs(amount),
                    due_date: dueDate,
                    description: formData.description,
                    status: 'active',
                    transaction_id: transaction.id,
                    shared_with_family: shareWithFamily
                  })
                  .select()
                  .single();
                
                if (loanError) throw new Error(`Erreur création dette: ${loanError.message}`);
                toast.success('Dette enregistrée avec succès');
              }
              
              // Catégories "loan_repayment" et "loan_repayment_received"
              else if (formData.category === 'loan_repayment' || formData.category === 'loan_repayment_received') {
                if (!selectedLoanId) {
                  throw new Error('Veuillez sélectionner un prêt');
                }
                
                // Insérer le remboursement
                const { error: repaymentError } = await supabase
                  .from('loan_repayments')
                  .insert({
                    loan_id: selectedLoanId,
                    transaction_id: transaction.id,
                    amount_paid: Math.abs(amount),
                    interest_portion: 0,
                    capital_portion: Math.abs(amount),
                    payment_date: formData.date
                  });
                
                if (repaymentError) throw new Error(`Erreur enregistrement remboursement: ${repaymentError.message}`);
                
                // Mettre à jour le capital restant du prêt
                const { data: loanData, error: loanFetchError } = await supabase
                  .from('personal_loans')
                  .select('current_capital')
                  .eq('id', selectedLoanId)
                  .single();
                
                if (loanFetchError) throw new Error(`Erreur récupération prêt: ${loanFetchError.message}`);
                
                const newCapital = Math.max(0, (loanData?.current_capital || 0) - Math.abs(amount));
                const newStatus = newCapital <= 0 ? 'closed' : 'active';
                
                const { error: updateError } = await supabase
                  .from('personal_loans')
                  .update({
                    current_capital: newCapital,
                    status: newStatus,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', selectedLoanId);
                
                if (updateError) throw new Error(`Erreur mise à jour prêt: ${updateError.message}`);
                
                toast.success(newCapital <= 0 ? 'Prêt remboursé intégralement' : 'Remboursement enregistré');
              }
              
              // Réinitialiser les champs de prêt après succès
              setSelectedLoanId('');
              setBeneficiaryName('');
              setInterestRate('');
              setDurationMonths('');
            } catch (loanError: any) {
              console.error('❌ Erreur lors de la gestion du prêt:', loanError);
              toast.error(loanError?.message || 'Erreur lors de la gestion du prêt');
              // Ne pas bloquer la navigation - la transaction est déjà créée
            }
          }
        }
        
        // Partager la transaction si demandé
        if (shareWithFamily && selectedFamilyGroupId && transaction?.id) {
          try {
            await familySharingService.shareTransaction({
              familyGroupId: selectedFamilyGroupId,
              transactionId: transaction.id,
              description: formData.description,
              amount: Math.abs(amount),
              category: formData.category,
              date: new Date(formData.date),
              splitType: 'split_equal',
              paidBy: user.id,
              splitDetails: [],
              notes: formData.notes || undefined
            });
            console.log('✅ Transaction partagée avec la famille');
          } catch (shareError) {
            console.error('⚠️ Erreur lors du partage de la transaction:', shareError);
            // Ne pas bloquer la navigation en cas d'erreur de partage
          }
        }
        
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
        <form onSubmit={handleSubmit} className="space-y-6" translate="no">
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
          {!['loan', 'loan_received', 'loan_repayment', 'loan_repayment_received'].includes(formData.category) && (
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
          )}

          {/* Catégorie */}
          <div>
            {/* Label and Budget Gauge Row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 flex-shrink-0">
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
              {/* Budget Gauge - Show only when category selected and transaction is expense */}
              {formData.category && isExpense && (
                <div className="flex-1 min-w-0">
                  <BudgetGauge
                    budgetAmount={budgetAmount}
                    spentAmount={spentAmount}
                    projectedSpent={projectedSpent}
                    percentage={percentage}
                    remaining={remaining}
                    status={status}
                    category={formData.category}
                    displayCurrency={transactionCurrency}
                    loading={budgetLoading}
                    error={budgetError}
                    hasBudget={hasBudget}
                    compact={false}
                  />
                </div>
              )}
            </div>
            {/* Select Element Row */}
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
                <>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.icon ? `${category.icon} ` : ''}{category.label}
                    </option>
                  ))}
                  {/* Séparateur et catégories de prêts */}
                  {isExpense && (
                    <>
                      <option value="" disabled>──────────</option>
                      <option value="loan">💰 Prêt accordé</option>
                      <option value="loan_repayment">💸 Remboursement dette</option>
                    </>
                  )}
                  {isIncome && (
                    <>
                      <option value="" disabled>──────────</option>
                      <option value="loan_repayment_received">💰 Remboursement prêt reçu</option>
                      <option value="loan_received">💵 Prêt reçu</option>
                    </>
                  )}
                </>
              )}
            </select>
          </div>

          {/* Partage familial */}
          <ShareWithFamilySection
            familyGroups={familyGroups}
            selectedGroupId={selectedFamilyGroupId}
            onShareChange={handleShareChange}
            transactionType={transactionType as 'income' | 'expense' | 'transfer'}
            transactionCategory={formData.category}
            disabled={isLoading || familyGroupsLoading}
          />

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

          {/* Champs conditionnels pour les prêts */}
          {(formData.category === 'loan' || formData.category === 'loan_received') && (
            <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Informations sur le prêt</h3>
              
              {/* Bénéficiaire / Prêteur */}
              <div>
                <label htmlFor="beneficiaryName" className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.category === 'loan' ? 'Bénéficiaire' : 'Prêteur'} *
                </label>
                <input
                  type="text"
                  id="beneficiaryName"
                  value={beneficiaryName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBeneficiaryName(value);
                    // Auto-populate description if empty
                    if (!formData.description.trim() && value.trim()) {
                      const autoDescription = formData.category === 'loan' 
                        ? `Prêt à ${value}` 
                        : `Prêt de ${value}`;
                      setFormData(prev => ({ ...prev, description: autoDescription }));
                    }
                  }}
                  placeholder={formData.category === 'loan' ? "Nom du bénéficiaire" : "Nom du prêteur"}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Libellé (optionnel) */}
              <div>
                <label htmlFor="descriptionLoan" className="block text-sm font-medium text-gray-700 mb-2">
                  Libellé (optionnel)
                </label>
                <input
                  type="text"
                  id="descriptionLoan"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Ex: Prêt pour réparation moto"
                  maxLength={100}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Taux d'intérêt */}
              <div>
                <label htmlFor="interestRate" className="block text-sm font-medium text-gray-700 mb-2">
                  Taux d'intérêt % / mois (optionnel)
                </label>
                <input
                  type="number"
                  id="interestRate"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="Ex: 2.5"
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Échéance */}
              <div>
                <label htmlFor="durationMonths" className="block text-sm font-medium text-gray-700 mb-2">
                  Échéance (mois) (optionnel)
                </label>
                <input
                  type="number"
                  id="durationMonths"
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(e.target.value)}
                  placeholder="Ex: 12"
                  min="1"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

            </div>
          )}

          {/* Champs conditionnels pour les remboursements */}
          {(formData.category === 'loan_repayment' || formData.category === 'loan_repayment_received') && (
            <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Informations sur le remboursement</h3>
              
              {/* Sélecteur de prêt */}
              <div>
                <label htmlFor="selectedLoanId" className="block text-sm font-medium text-gray-700 mb-2">
                  Prêt concerné *
                </label>
                <select
                  id="selectedLoanId"
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={activeLoansLoading}
                >
                  <option value="">{activeLoansLoading ? 'Chargement...' : 'Sélectionner un prêt'}</option>
                  {activeLoans.map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Affichage du solde restant */}
              {selectedLoanId && (
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Solde restant
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {(() => {
                      const selectedLoan = activeLoans.find(loan => loan.id === selectedLoanId);
                      if (selectedLoan) {
                        return `${selectedLoan.remainingBalance.toLocaleString('fr-FR')} ${selectedLoan.currency}`;
                      }
                      return '-';
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}

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
              transactionType={transactionType as 'income' | 'expense' | 'transfer'}
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
              translate="no"
              lang="fr"
              className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isIncome 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              <Save className="w-5 h-5" />
              <span translate="no" lang="fr" className="notranslate">
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
