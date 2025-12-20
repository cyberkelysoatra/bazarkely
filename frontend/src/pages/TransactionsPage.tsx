import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Plus, Filter, Search, ArrowUpDown, TrendingUp, TrendingDown, ArrowRightLeft, X, Loader2, Download, Repeat, Users, UserCheck, Receipt, Clock, CheckCircle, Calendar } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import transactionService from '../services/transactionService';
import accountService from '../services/accountService';
import { db } from '../lib/database';
import { TRANSACTION_CATEGORIES } from '../constants';
import RecurringBadge from '../components/RecurringTransactions/RecurringBadge';
import { CurrencyDisplay } from '../components/Currency';
import type { Transaction, Account, TransactionCategory } from '../types';
import { useCurrency } from '../hooks/useCurrency';
import Modal from '../components/UI/Modal';
import { shareTransaction, unshareTransaction, getFamilySharedTransactions } from '../services/familySharingService';
import * as familyGroupService from '../services/familyGroupService';
import { getReimbursementStatusByTransactionIds, getMemberBalances, createReimbursementRequest } from '../services/reimbursementService';
import { toast } from 'react-hot-toast';
import type { ShareTransactionInput, SplitType, FamilySharedTransaction, ReimbursementStatus } from '../types/family';
import type { FamilyGroup } from '../types/family';

const TransactionsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [filterCategory, setFilterCategory] = useState<TransactionCategory | 'all'>('all');
  const [filterRecurring, setFilterRecurring] = useState<boolean | null>(null);
  const [showTransferred, setShowTransferred] = useState(false);
  const [transferredTransactions, setTransferredTransactions] = useState<Transaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredAccount, setFilteredAccount] = useState<Account | null>(null);
  
  // Period filter state
  const [periodFilter, setPeriodFilter] = useState<'7d' | '30d' | '1y' | 'custom'>('7d');
  const [customDateRange, setCustomDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null
  });
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
  const [tempCustomDateRange, setTempCustomDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: ''
  });
  
  // localStorage keys for period filter persistence
  const PERIOD_FILTER_STORAGE_KEY = 'bazarkely_transactions_period_filter';
  const CUSTOM_DATE_RANGE_STORAGE_KEY = 'bazarkely_transactions_custom_date_range';
  const isInitialMount = useRef(true);
  
  // Currency display preference
  const { displayCurrency } = useCurrency();
  
  // Family group for sharing (loaded directly, no context required)
  const [activeFamilyGroup, setActiveFamilyGroup] = useState<FamilyGroup | null>(null);
  
  // State for sharing transactions
  const [sharingTransactionId, setSharingTransactionId] = useState<string | null>(null);
  
  // Track which transactions are already shared
  const [sharedTransactionIds, setSharedTransactionIds] = useState<Set<string>>(new Set());
  
  // Map of shared transactions (transactionId -> FamilySharedTransaction)
  const [sharedTransactionsMap, setSharedTransactionsMap] = useState<Map<string, FamilySharedTransaction>>(new Map());
  
  // Reimbursement statuses (transactionId -> ReimbursementStatus | 'none')
  const [reimbursementStatuses, setReimbursementStatuses] = useState<Map<string, ReimbursementStatus | 'none'>>(new Map());
  
  // Track loading state for reimbursement statuses to prevent race condition
  const [isLoadingReimbursementStatuses, setIsLoadingReimbursementStatuses] = useState<boolean>(true);
  
  // Track which transaction is currently requesting reimbursement
  const [requestingReimbursement, setRequestingReimbursement] = useState<string | null>(null);
  
  // Function to reload reimbursement statuses
  const loadReimbursementStatuses = useCallback(async () => {
    // Set loading state to true at the start
    setIsLoadingReimbursementStatuses(true);

    if (!activeFamilyGroup || sharedTransactionsMap.size === 0) {
      setReimbursementStatuses(new Map());
      setIsLoadingReimbursementStatuses(false);
      return;
    }
    
    try {
      const transactionIds = Array.from(sharedTransactionsMap.keys());

      const statuses = await getReimbursementStatusByTransactionIds(transactionIds, activeFamilyGroup.id);

      setReimbursementStatuses(statuses);
      // Set loading state to false after state is updated
      setIsLoadingReimbursementStatuses(false);
    } catch (err) {
      console.error('[LOAD REIMBURSEMENT] Error loading reimbursement statuses:', err);
      // Set loading state to false even on error
      setIsLoadingReimbursementStatuses(false);
    }
  }, [activeFamilyGroup, sharedTransactionsMap]);
  
  // Récupérer le filtre par compte depuis l'URL
  const accountId = searchParams.get('account');
  
  // Lire les paramètres de filtre et catégorie depuis l'URL et les appliquer
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const categoryParam = searchParams.get('category');
    
    // Traiter le paramètre de filtre de type
    if (filterParam) {
      if (filterParam === 'expense') {
        setFilterType('expense');
      } else if (filterParam === 'income') {
        setFilterType('income');
      } else if (filterParam === 'transfer') {
        setFilterType('transfer');
      } else if (filterParam === 'all') {
        setFilterType('all');
      }
    }
    
    // Traiter le paramètre de catégorie
    if (categoryParam) {
      // Validate that the category parameter is a valid TransactionCategory
      const validCategories: TransactionCategory[] = [
        'alimentation', 'logement', 'transport', 'sante', 
        'education', 'communication', 'vetements', 'loisirs', 
        'famille', 'solidarite', 'autres'
      ];
      
      // Convertir le paramètre en minuscules pour une comparaison insensible à la casse
      const lowerCategoryParam = categoryParam.toLowerCase();
      
      if (validCategories.includes(lowerCategoryParam as TransactionCategory)) {
        setFilterCategory(lowerCategoryParam as TransactionCategory);
      } else {
        setFilterCategory('all');
      }
    }
  }, [searchParams]);

  // Charger les transactions de l'utilisateur
  useEffect(() => {
    const loadTransactions = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const userTransactions = await transactionService.getUserTransactions(user.id);
          setTransactions(userTransactions);
        } catch (error) {
          console.error('Erreur lors du chargement des transactions:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadTransactions();
  }, [user, location.pathname]); // Refresh when returning from detail page

  // Scroll to transaction after navigation from edit page
  useEffect(() => {
    const scrollToTransactionId = (location.state as any)?.scrollToTransactionId;
    
    if (scrollToTransactionId && !isLoading && transactions.length > 0) {
      // Wait for DOM to render transactions
      setTimeout(() => {
        const element = document.getElementById(`transaction-${scrollToTransactionId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Add highlight effect
          element.classList.add('bg-purple-100');
          setTimeout(() => {
            element.classList.remove('bg-purple-100');
          }, 2000);
          
          // Clear state to prevent re-scrolling on subsequent renders
          window.history.replaceState({ ...location.state, scrollToTransactionId: undefined }, '');
        }
      }, 100);
    }
  }, [isLoading, transactions, location.state]);

  // Charger les transactions transférées
  useEffect(() => {
    const loadTransferredTransactions = async () => {
      if (user && showTransferred) {
        try {
          const transferred = await transactionService.getUserTransferredTransactions(user.id);
          setTransferredTransactions(transferred);
        } catch (error) {
          console.error('Erreur lors du chargement des transactions transférées:', error);
        }
      }
    };
    loadTransferredTransactions();
  }, [user, showTransferred]);

  // Charger le groupe familial actif (optionnel - ne bloque pas si pas de groupe)
  useEffect(() => {
    const loadFamilyGroup = async () => {
      if (!user) {
        setActiveFamilyGroup(null);
        return;
      }

      try {
        const groups = await familyGroupService.getUserFamilyGroups();
        if (groups.length > 0) {
          // Utiliser le premier groupe comme groupe actif
          setActiveFamilyGroup(groups[0]);
        } else {
          setActiveFamilyGroup(null);
        }
      } catch (error) {
        // Silently fail - family sharing is optional
        setActiveFamilyGroup(null);
      }
    };

    loadFamilyGroup();
  }, [user]);

  // Charger les transactions partagées pour déterminer quelles transactions sont déjà partagées
  useEffect(() => {
    const loadSharedTransactions = async () => {
      if (!activeFamilyGroup) {
        setSharedTransactionIds(new Set());
        setSharedTransactionsMap(new Map());
        return;
      }

      try {
        const shared = await getFamilySharedTransactions(activeFamilyGroup.id, { limit: 1000 });
        const ids = new Set(shared.map(t => t.transactionId).filter(Boolean) as string[]);
        setSharedTransactionIds(ids);
        
        // Create map: transactionId -> FamilySharedTransaction
        const map = new Map<string, FamilySharedTransaction>();
        shared.forEach(t => {
          if (t.transactionId) {
            map.set(t.transactionId, t);
          }
        });
        setSharedTransactionsMap(map);
      } catch (e) {
        setSharedTransactionIds(new Set());
        setSharedTransactionsMap(new Map());
      }
    };

    loadSharedTransactions();
  }, [activeFamilyGroup]);
  
  // Charger les statuts de remboursement pour les transactions partagées
  useEffect(() => {
    loadReimbursementStatuses();
  }, [loadReimbursementStatuses]);
  
  // Reload reimbursement statuses when window regains focus (user returns from detail page)
  useEffect(() => {
    const handleFocus = () => {
      // Reload reimbursement statuses when window regains focus
      loadReimbursementStatuses();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadReimbursementStatuses]);

  // Charger les informations du compte filtré
  useEffect(() => {
    const loadFilteredAccount = async () => {
      if (accountId && user) {
        try {
          const account = await db.accounts.get(accountId);
          if (account && account.userId === user.id) {
            setFilteredAccount(account);
          } else {
            setFilteredAccount(null);
          }
        } catch (error) {
          console.error('Erreur lors du chargement du compte:', error);
          setFilteredAccount(null);
        }
      } else {
        setFilteredAccount(null);
      }
    };
    loadFilteredAccount();
  }, [accountId, user]);

  // Load period filter from localStorage on mount
  useEffect(() => {
    try {
      const savedPeriod = localStorage.getItem(PERIOD_FILTER_STORAGE_KEY);
      if (savedPeriod && ['7d', '30d', '1y', 'custom'].includes(savedPeriod)) {
        setPeriodFilter(savedPeriod as '7d' | '30d' | '1y' | 'custom');
        if (savedPeriod === 'custom') {
          const savedRange = localStorage.getItem(CUSTOM_DATE_RANGE_STORAGE_KEY);
          if (savedRange) {
            const parsed = JSON.parse(savedRange);
            if (parsed.startDate && parsed.endDate) {
              setCustomDateRange({
                startDate: new Date(parsed.startDate),
                endDate: new Date(parsed.endDate)
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Error loading period filter from localStorage:', e);
    }
  }, []);

  // Save period filter to localStorage when it changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(PERIOD_FILTER_STORAGE_KEY, periodFilter);
      if (periodFilter === 'custom' && customDateRange.startDate && customDateRange.endDate) {
        localStorage.setItem(CUSTOM_DATE_RANGE_STORAGE_KEY, JSON.stringify({
          startDate: customDateRange.startDate.toISOString(),
          endDate: customDateRange.endDate.toISOString()
        }));
      } else if (periodFilter !== 'custom') {
        localStorage.removeItem(CUSTOM_DATE_RANGE_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error saving period filter to localStorage:', e);
    }
  }, [periodFilter, customDateRange]);

  // Helper function to sort transactions by date (newest first)
  const sortTransactionsByDateDesc = (transactions: Transaction[]) => {
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Handle sharing/unsharing transaction with family (toggle)
  const handleShareTransaction = async (e: React.MouseEvent, transaction: Transaction) => {
    e.stopPropagation(); // Prevent navigation to transaction detail
    
    if (!user) {
      toast.error('Vous devez être connecté pour partager une transaction');
      return;
    }

    // Check if transaction is already shared
    const isShared = sharedTransactionIds.has(transaction.id);

    // If not shared and no active family group, redirect to create family page
    if (!isShared && !activeFamilyGroup) {
      toast.error('Vous devez créer un groupe familial pour partager des transactions');
      navigate('/family', { 
        state: { pendingShareTransactionId: transaction.id } 
      });
      return;
    }

    // If not shared but has active family group, share the transaction
    if (!isShared && activeFamilyGroup) {
      setSharingTransactionId(transaction.id);

      try {
        const shareInput: ShareTransactionInput = {
          familyGroupId: activeFamilyGroup.id,
          transactionId: transaction.id,
          description: transaction.description,
          amount: Math.abs(transaction.amount),
          category: transaction.category,
          date: new Date(transaction.date),
          splitType: 'paid_by_one' as SplitType,
          paidBy: user.id,
          splitDetails: [], // Empty for paid_by_one
          notes: undefined,
        };

        const sharedTx = await shareTransaction(shareInput);
        toast.success('Transaction partagée avec votre famille !');
        // Add transaction ID to shared set
        setSharedTransactionIds(prev => new Set([...prev, transaction.id]));
        // Add to shared transactions map
        setSharedTransactionsMap(prev => {
          const newMap = new Map(prev);
          if (sharedTx.transactionId) {
            newMap.set(sharedTx.transactionId, sharedTx);
          }
          return newMap;
        });
      } catch (error: any) {
        console.error('Erreur lors du partage de la transaction:', error);
        const errorMessage = error?.message || 'Erreur lors du partage de la transaction';
        
        // Check if transaction is already shared
        if (errorMessage.includes('déjà partagée')) {
          toast.error('Cette transaction est déjà partagée');
        } else {
          toast.error(errorMessage);
        }
      } finally {
        setSharingTransactionId(null);
      }
      return;
    }

    // If shared, unshare the transaction
    if (isShared && activeFamilyGroup) {
      setSharingTransactionId(transaction.id);

      try {
        // Get the shared transaction ID from the map
        const sharedTx = sharedTransactionsMap.get(transaction.id);
        if (!sharedTx || !sharedTx.id) {
          toast.error('Transaction partagée introuvable');
          return;
        }

        await unshareTransaction(sharedTx.id);
        toast.success('Partage retiré avec succès');
        
        // Remove transaction ID from shared set
        setSharedTransactionIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(transaction.id);
          return newSet;
        });
        
        // Remove from shared transactions map
        setSharedTransactionsMap(prev => {
          const newMap = new Map(prev);
          newMap.delete(transaction.id);
          return newMap;
        });
      } catch (error: any) {
        console.error('Erreur lors du retrait du partage:', error);
        const errorMessage = error?.message || 'Erreur lors du retrait du partage';
        toast.error(errorMessage);
      } finally {
        setSharingTransactionId(null);
      }
    }
  };
  
  // Handle requesting reimbursement for a shared transaction
  const handleRequestReimbursement = async (transactionId: string) => {
    const sharedTransaction = sharedTransactionsMap.get(transactionId);
    if (!sharedTransaction || !user || !activeFamilyGroup) {
      toast.error('Transaction partagée introuvable');
      return;
    }
    
    setRequestingReimbursement(transactionId);
    
    try {
      // Get member balances to convert userId to memberId
      const memberBalances = await getMemberBalances(activeFamilyGroup.id);
      const creditorMember = memberBalances.find(b => b.userId === sharedTransaction.paidBy);
      
      if (!creditorMember) {
        toast.error('Membre créancier non trouvé');
        setRequestingReimbursement(null);
        return;
      }
      
      // Create reimbursement request for each debtor in splitDetails
      const promises = (sharedTransaction.splitDetails || [])
        .filter(split => {
          // Exclude the creditor (payer) from debtors
          const splitMember = memberBalances.find(b => b.memberId === split.memberId);
          return splitMember && splitMember.userId !== sharedTransaction.paidBy;
        })
        .map(split => createReimbursementRequest({
          sharedTransactionId: sharedTransaction.id,
          fromMemberId: split.memberId,
          toMemberId: creditorMember.memberId,
          amount: Math.abs(split.amount),
          currency: 'MGA',
          note: `Remboursement pour: ${sharedTransaction.description || 'Transaction partagée'}`,
        }));
      
      if (promises.length === 0) {
        toast.error('Aucun membre à rembourser pour cette transaction');
        setRequestingReimbursement(null);
        return;
      }
      
      await Promise.all(promises);
      
      // Update local status
      setReimbursementStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(transactionId, 'pending');
        return newMap;
      });
      
      toast.success('Demande de remboursement envoyée');
    } catch (err: any) {
      console.error('Error requesting reimbursement:', err);
      toast.error(err.message || 'Erreur lors de la demande de remboursement');
    } finally {
      setRequestingReimbursement(null);
    }
  };

  // Helper function to get date range based on period filter
  const getDateRange = (): { startDate: Date; endDate: Date } => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    switch (periodFilter) {
      case '7d': {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6); // Today minus 6 days = 7 days total
        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate: today };
      }
      case '30d': {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 29); // Today minus 29 days = 30 days total
        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate: today };
      }
      case '1y': {
        const startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate: today };
      }
      case 'custom': {
        const startDate = customDateRange.startDate 
          ? new Date(customDateRange.startDate)
          : new Date(0); // Very old date if not set
        startDate.setHours(0, 0, 0, 0);
        const endDate = customDateRange.endDate 
          ? new Date(customDateRange.endDate)
          : today;
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
      }
      default:
        // Default to 7 days
        const defaultStart = new Date(today);
        defaultStart.setDate(defaultStart.getDate() - 6);
        defaultStart.setHours(0, 0, 0, 0);
        return { startDate: defaultStart, endDate: today };
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || transaction.type === filterType;
    const matchesCategory = filterCategory === 'all' || transaction.category.toLowerCase() === filterCategory.toLowerCase();
    const matchesAccount = !accountId || transaction.accountId === accountId;
    const matchesRecurring = filterRecurring === null 
      ? true 
      : filterRecurring === true 
        ? transaction.isRecurring === true 
        : transaction.isRecurring !== true;
    
    // Period filter: filter by transaction date
    // Extract just the date part (YYYY-MM-DD) for comparison to avoid timezone issues
    // Use local date components to avoid UTC conversion issues
    const transactionDateObj = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
    const transactionYear = transactionDateObj.getFullYear();
    const transactionMonth = String(transactionDateObj.getMonth() + 1).padStart(2, '0');
    const transactionDay = String(transactionDateObj.getDate()).padStart(2, '0');
    const transactionDateStr = `${transactionYear}-${transactionMonth}-${transactionDay}`; // "2025-12-15"
    
    const { startDate, endDate } = getDateRange();
    const startYear = startDate.getFullYear();
    const startMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const startDay = String(startDate.getDate()).padStart(2, '0');
    const startDateStr = `${startYear}-${startMonth}-${startDay}`;
    
    const endYear = endDate.getFullYear();
    const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(endDate.getDate()).padStart(2, '0');
    const endDateStr = `${endYear}-${endMonth}-${endDay}`;
    
    const matchesPeriod = transactionDateStr >= startDateStr && transactionDateStr <= endDateStr;
    
    return matchesSearch && matchesFilter && matchesCategory && matchesAccount && matchesRecurring && matchesPeriod;
  });

  // Sort filtered transactions by date (newest first)
  // When showing transferred transactions, use transferredTransactions instead
  const displayTransactions = showTransferred 
    ? transferredTransactions 
    : filteredTransactions;
  const sortedTransactions = sortTransactionsByDateDesc(displayTransactions);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = Math.abs(transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0));

  // Fonction pour échapper les valeurs CSV
  const escapeCSV = (value: string): string => {
    // Si la valeur contient des virgules, des guillemets ou des sauts de ligne, l'entourer de guillemets
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // Remplacer les guillemets par des doubles guillemets
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Fonction pour formater la date en YYYY-MM-DD
  const formatDateForCSV = (date: Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fonction pour exporter les transactions filtrées en CSV
  const exportToCSV = async () => {
    if (!user || sortedTransactions.length === 0) {
      return;
    }

    try {
      // Charger tous les comptes de l'utilisateur pour obtenir les noms
      const accounts = await accountService.getUserAccounts(user.id);
      const accountMap = new Map<string, string>();
      accounts.forEach(account => {
        accountMap.set(account.id, account.name);
      });

      // En-têtes CSV
      const headers = ['Date', 'Description', 'Catégorie', 'Type', 'Montant', 'Compte'];
      const csvRows = [headers.map(h => escapeCSV(h)).join(',')];

      // Données CSV
      sortedTransactions.forEach(transaction => {
        const category = TRANSACTION_CATEGORIES[transaction.category] || {
          name: transaction.category
        };
        
        // Formater le type (traduire en français)
        let typeLabel = '';
        switch (transaction.type) {
          case 'income':
            typeLabel = 'Revenu';
            break;
          case 'expense':
            typeLabel = 'Dépense';
            break;
          case 'transfer':
            typeLabel = 'Transfert';
            break;
          default:
            typeLabel = transaction.type;
        }

        // Récupérer le nom du compte
        const accountName = accountMap.get(transaction.accountId) || 'Compte inconnu';

        // Formater le montant avec 2 décimales
        const formattedAmount = Math.abs(transaction.amount).toFixed(2);

        const row = [
          formatDateForCSV(new Date(transaction.date)),
          escapeCSV(transaction.description || ''),
          escapeCSV(category.name),
          escapeCSV(typeLabel),
          formattedAmount,
          escapeCSV(accountName)
        ];

        csvRows.push(row.join(','));
      });

      // Créer le contenu CSV
      const csvContent = csvRows.join('\n');

      // Créer le blob et télécharger
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM UTF-8 pour Excel
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Générer le nom de fichier avec la date actuelle
      const today = new Date();
      const filename = `transactions-${formatDateForCSV(today)}.csv`;
      link.setAttribute('download', filename);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Chargement des transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Suivez vos revenus et dépenses</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => navigate('/transfer')}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfert</span>
          </button>
          <button 
            onClick={() => navigate('/add-transaction')}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Filtre par compte */}
      {filteredAccount && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <ArrowUpDown className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Transactions du compte : {filteredAccount.name}
                </h3>
                <p className="text-xs text-blue-700">
                  {sortedTransactions.length} transaction(s) trouvée(s)
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="Voir toutes les transactions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-medium text-gray-600">Revenus</h3>
          </div>
          <div className="text-xl font-bold text-green-600">
            <CurrencyDisplay
              amount={totalIncome}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="lg"
            />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-medium text-gray-600">Dépenses</h3>
          </div>
          <div className="text-xl font-bold text-red-600">
            <CurrencyDisplay
              amount={totalExpenses}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="lg"
            />
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="space-y-4">
        {/* Row 1: Search input + Period chips */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher une transaction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          {/* Period filter chips - horizontally scrollable on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setPeriodFilter('7d')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                periodFilter === '7d'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              7j
            </button>
            <button
              onClick={() => setPeriodFilter('30d')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                periodFilter === '30d'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              30j
            </button>
            <button
              onClick={() => setPeriodFilter('1y')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                periodFilter === '1y'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              1an
            </button>
            <button
              onClick={() => {
                // Initialize temp values with current custom date range or empty
                setTempCustomDateRange({
                  startDate: customDateRange.startDate ? new Date(customDateRange.startDate).toISOString().split('T')[0] : '',
                  endDate: customDateRange.endDate ? new Date(customDateRange.endDate).toISOString().split('T')[0] : ''
                });
                setIsCustomDateModalOpen(true);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                periodFilter === 'custom'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: Type tabs + Sub-filters + Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setFilterType('all');
              setShowTransferred(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all' && !showTransferred
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => {
              setFilterType('income');
              setShowTransferred(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'income' && !showTransferred
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Revenus
          </button>
          <button
            onClick={() => {
              setFilterType('expense');
              setShowTransferred(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'expense' && !showTransferred
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Dépenses
          </button>
          <button
            onClick={() => {
              setFilterType('transfer');
              setShowTransferred(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'transfer' && !showTransferred
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Transferts
          </button>
          <button
            onClick={() => {
              setFilterRecurring(filterRecurring === true ? null : true);
              setShowTransferred(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
              filterRecurring === true 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Filtrer les transactions récurrentes"
          >
            <Repeat className="w-4 h-4" />
            <span>Récurrentes</span>
          </button>
          <button
            onClick={() => {
              setShowTransferred(!showTransferred);
              if (!showTransferred) {
                setFilterType('all');
                setFilterRecurring(null);
              }
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showTransferred
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Transférées
          </button>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={exportToCSV}
              className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exporter en CSV"
              disabled={sortedTransactions.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
            <button className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Category Filter Badge */}
        {filterCategory !== 'all' && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Filtre actif:</span>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              <span className="mr-2">
                {TRANSACTION_CATEGORIES[filterCategory]?.name || filterCategory}
              </span>
              <button
                onClick={() => setFilterCategory('all')}
                className="ml-1 text-purple-600 hover:text-purple-800 transition-colors"
                title="Supprimer le filtre de catégorie"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Liste des transactions */}
      {!isLoading && (
      <div className="space-y-3">
        {sortedTransactions.map((transaction) => {
          const category = TRANSACTION_CATEGORIES[transaction.category] || {
            name: transaction.category,
            icon: 'MoreHorizontal',
            color: 'text-gray-500',
            bgColor: 'bg-gray-50'
          };
          const isIncome = transaction.type === 'income';
          const isTransfer = transaction.type === 'transfer';
          
          // Pour les transferts, déterminer l'affichage selon le contexte du compte filtré
          let displayAmount = transaction.amount;
          let isDebit = false;
          let isCredit = false;
          let displayDescription = transaction.description;
          let transferLabel = '';
          
          if (isTransfer) {
            // Pour les transferts, se baser sur le signe du montant
            // Le filtrage par compte est déjà géré par filteredTransactions
            isDebit = transaction.amount < 0;
            isCredit = transaction.amount > 0;
            displayAmount = Math.abs(transaction.amount);
            displayDescription = isDebit ? `Sortie: ${transaction.description}` : `Entrée: ${transaction.description}`;
            transferLabel = isDebit ? 'Débit' : 'Crédit';
          }
          
          return (
            <div 
              key={transaction.id}
              id={`transaction-${transaction.id}`}
              onClick={() => {
                navigate(`/transaction/${transaction.id}`);
              }}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isIncome ? 'bg-green-100' : 
                    isDebit ? 'bg-red-100' : 
                    isCredit ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {isIncome ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : isDebit ? (
                      <ArrowRightLeft className="w-5 h-5 text-red-600" />
                    ) : isCredit ? (
                      <ArrowRightLeft className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {displayDescription}
                      </h4>
                      {transaction.isRecurring && transaction.recurringTransactionId && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/recurring/${transaction.recurringTransactionId}`);
                          }}
                        >
                          <RecurringBadge size="sm" />
                        </span>
                      )}
                      {activeFamilyGroup && (() => {
                        const isShared = sharedTransactionIds.has(transaction.id);
                        return (
                          <button
                            onClick={(e) => handleShareTransaction(e, transaction)}
                            disabled={sharingTransactionId === transaction.id}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              isShared 
                                ? 'text-purple-600 hover:bg-purple-50' 
                                : 'text-gray-400 hover:bg-gray-50'
                            }`}
                            title={isShared ? 'Retirer le partage' : 'Partager avec la famille'}
                            aria-label={isShared ? 'Retirer le partage' : 'Partager avec la famille'}
                          >
                            {sharingTransactionId === transaction.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isShared ? (
                              <UserCheck className="w-4 h-4" />
                            ) : (
                              <Users className="w-4 h-4" />
                            )}
                          </button>
                        );
                      })()}
                      {/* Reimbursement Request Icon - Only for creditor on shared transactions */}
                      {activeFamilyGroup && sharedTransactionsMap.has(transaction.id) && (() => {
                        const sharedTx = sharedTransactionsMap.get(transaction.id);
                        const isCreditor = sharedTx?.paidBy === user?.id;
                        // Only get status if not loading, otherwise default to 'none' for loading state
                        const status = isLoadingReimbursementStatuses 
                          ? 'loading' 
                          : (reimbursementStatuses.get(transaction.id) || 'none');
                        const isRequesting = requestingReimbursement === transaction.id;
                        
                        if (!isCreditor) return null;
                        
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (status === 'none') {
                                handleRequestReimbursement(transaction.id);
                              }
                            }}
                            disabled={status === 'loading' || isRequesting}
                            className={`p-1 rounded transition-colors ${
                              status === 'loading'
                                ? 'text-gray-300 cursor-wait'
                                : status === 'none' 
                                ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 cursor-pointer' 
                                : status === 'pending'
                                ? 'text-orange-500 cursor-default'
                                : 'text-green-500 cursor-default'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={
                              status === 'loading'
                                ? 'Chargement du statut...'
                                : status === 'none' 
                                ? 'Demander remboursement' 
                                : status === 'pending'
                                ? 'Remboursement en attente'
                                : 'Remboursement effectué'
                            }
                          >
                            {isRequesting ? (
                              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            ) : status === 'loading' ? (
                              <Receipt className="w-4 h-4 opacity-50 animate-pulse" />
                            ) : status === 'none' ? (
                              <Receipt className="w-4 h-4" />
                            ) : status === 'pending' ? (
                              <Clock className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                        );
                      })()}
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{category.name}</span>
                      <span>•</span>
                      <span>{new Date(transaction.date).toLocaleDateString('fr-FR')}</span>
                      {isTransfer && (
                        <>
                          <span>•</span>
                          <span className={isDebit ? 'text-red-600' : 'text-green-600'}>
                            {transferLabel}
                          </span>
                        </>
                      )}
                      {showTransferred && transaction.transferredAt && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            Transférée le {new Date(transaction.transferredAt).toLocaleDateString('fr-FR')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`font-semibold ${
                    isIncome ? 'text-green-600' :
                    isDebit ? 'text-red-600' :
                    isCredit ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span>{isIncome ? '+' : 
                     isDebit ? '-' : 
                     isCredit ? '+' : '-'}</span>
                    <CurrencyDisplay
                      amount={displayAmount}
                      originalCurrency="MGA"
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="md"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {!isLoading && sortedTransactions.length === 0 && (
        <div className="text-center py-8">
          <ArrowUpDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune transaction</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterType !== 'all' 
              ? 'Aucune transaction ne correspond à vos critères'
              : 'Commencez par ajouter votre première transaction'
            }
          </p>
          <button 
            onClick={() => navigate('/add-transaction')}
            className="btn-primary"
          >
            Ajouter une transaction
          </button>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-3 gap-4">
        <button 
          onClick={() => navigate('/add-transaction?type=income')}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-green-200"
          aria-label="Ajouter un revenu"
        >
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Ajouter revenu</p>
        </button>

        <button 
          onClick={() => navigate('/add-transaction?type=expense')}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-red-200"
          aria-label="Ajouter une dépense"
        >
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Ajouter dépense</p>
        </button>

        <button 
          onClick={() => navigate('/transfer')}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Transfert entre comptes"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Transfert</p>
        </button>
      </div>

      {/* Custom Date Range Modal */}
      <Modal
        isOpen={isCustomDateModalOpen}
        onClose={() => {
          setIsCustomDateModalOpen(false);
          // Reset temp values when closing without applying
          setTempCustomDateRange({
            startDate: customDateRange.startDate ? new Date(customDateRange.startDate).toISOString().split('T')[0] : '',
            endDate: customDateRange.endDate ? new Date(customDateRange.endDate).toISOString().split('T')[0] : ''
          });
        }}
        title="Sélectionner une période personnalisée"
        size="md"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsCustomDateModalOpen(false);
                setTempCustomDateRange({
                  startDate: customDateRange.startDate ? new Date(customDateRange.startDate).toISOString().split('T')[0] : '',
                  endDate: customDateRange.endDate ? new Date(customDateRange.endDate).toISOString().split('T')[0] : ''
                });
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (tempCustomDateRange.startDate && tempCustomDateRange.endDate) {
                  const startDate = new Date(tempCustomDateRange.startDate);
                  const endDate = new Date(tempCustomDateRange.endDate);
                  
                  if (startDate <= endDate) {
                    setCustomDateRange({
                      startDate,
                      endDate
                    });
                    setPeriodFilter('custom');
                    setIsCustomDateModalOpen(false);
                  } else {
                    toast.error('La date de début doit être antérieure à la date de fin');
                  }
                } else {
                  toast.error('Veuillez sélectionner les deux dates');
                }
              }}
              className="px-4 py-2 text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
            >
              Appliquer
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Du:
            </label>
            <input
              type="date"
              value={tempCustomDateRange.startDate}
              onChange={(e) => setTempCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="input-field w-full"
              max={tempCustomDateRange.endDate || undefined}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Au:
            </label>
            <input
              type="date"
              value={tempCustomDateRange.endDate}
              onChange={(e) => setTempCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="input-field w-full"
              min={tempCustomDateRange.startDate || undefined}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TransactionsPage;
