import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Plus, Filter, Search, ArrowUpDown, TrendingUp, TrendingDown, ArrowRightLeft, X, Loader2, Download, Repeat, Users, UserCheck, Receipt, Clock, CheckCircle, Calendar, Edit, Trash2, ChevronDown } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import transactionService from '../services/transactionService';
import accountService from '../services/accountService';
import { db } from '../lib/database';
import { TRANSACTION_CATEGORIES } from '../constants';
import RecurringBadge from '../components/RecurringTransactions/RecurringBadge';
import { CurrencyDisplay } from '../components/Currency';
import type { Transaction, Account, TransactionCategory } from '../types';
import { useCurrency } from '../hooks/useCurrency';
import { getTransactionDisplayAmount } from '../utils/currencyConversion';
import Modal from '../components/UI/Modal';
import { shareTransaction, unshareTransaction, getFamilySharedTransactions } from '../services/familySharingService';
import * as familyGroupService from '../services/familyGroupService';
import { getReimbursementStatusByTransactionIds, getMemberBalances, createReimbursementRequest } from '../services/reimbursementService';
import { getLoanIdByTransactionId, getRepaymentHistory, recordPayment, getLoanByRepaymentTransactionId, getRepaymentIndexForTransaction } from '../services/loanService';
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
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [highlightedTransactionId, setHighlightedTransactionId] = useState<string | null>(null);
  const [showRepaymentModal, setShowRepaymentModal] = useState<string | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<string>('');
  const [repaymentAccountId, setRepaymentAccountId] = useState<string>('');
  const [repaymentDate, setRepaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [repaymentDescription, setRepaymentDescription] = useState<string>('');
  const [repaymentNotes, setRepaymentNotes] = useState<string>('');
  const [repaymentAccounts, setRepaymentAccounts] = useState<Account[]>([]);
  const [repaymentHistory, setRepaymentHistory] = useState<Array<{amount_paid: number; payment_date: string; notes?: string; transactionId?: string}>>([]);
  const [parentLoanInfo, setParentLoanInfo] = useState<{transactionId: string | null; amountInitial: number; createdAt: string} | null>(null);
  const [repaymentIndex, setRepaymentIndex] = useState<number>(1);
  const [loanProgress, setLoanProgress] = useState<{ totalRepaid: number; remaining: number; percentage: number } | null>(null);
  const [loanProgressLoading, setLoanProgressLoading] = useState<boolean>(false);
  
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

  useEffect(() => {
    const loadAccountsForRepayment = async () => {
      if (!user) {
        setRepaymentAccounts([]);
        return;
      }
      try {
        const localAccounts = await db.accounts.where('userId').equals(user.id).toArray();
        setRepaymentAccounts(localAccounts);
      } catch {
        setRepaymentAccounts([]);
      }
    };
    loadAccountsForRepayment();
  }, [user]);

  useEffect(() => {
    if (showRepaymentModal && !repaymentAccountId && repaymentAccounts.length > 0) {
      setRepaymentAccountId(repaymentAccounts[0].id);
    }
  }, [showRepaymentModal, repaymentAccounts]);

  useEffect(() => {
    const loadLoanProgressForDrawer = async () => {
      if (!selectedTransactionId) {
        setLoanProgress(null);
        setLoanProgressLoading(false);
        setParentLoanInfo(null);
        return;
      }

      const selectedTransaction = transactions.find(t => t.id === selectedTransactionId);
      const isSelectedLoanCategory = selectedTransaction
        ? ['loan', 'loan_received'].includes(selectedTransaction.category)
        : false;
      const isRepaymentCategory = selectedTransaction
        ? ['loan_repayment', 'loan_repayment_received'].includes(selectedTransaction.category)
        : false;

      if (selectedTransaction && isRepaymentCategory) {
        setLoanProgress(null);
        setLoanProgressLoading(false);
        setParentLoanInfo(null);
        try {
          const result: any = await getLoanByRepaymentTransactionId(selectedTransaction.id);
          setParentLoanInfo({
            transactionId: result?.loan?.transactionId || null,
            amountInitial: result?.loan?.amountInitial || 0,
            createdAt: result?.loan?.createdAt || ''
          });
        } catch {
          setParentLoanInfo(null);
        }
        return;
      }

      if (!selectedTransaction || !isSelectedLoanCategory) {
        setLoanProgress(null);
        setLoanProgressLoading(false);
        setParentLoanInfo(null);
        return;
      }

      setLoanProgressLoading(true);
      setLoanProgress(null);
      setParentLoanInfo(null);

      try {
        const loanId = await getLoanIdByTransactionId(selectedTransaction.id);

        if (!loanId) {
          setLoanProgress(null);
          return;
        }

        const repayments = await getRepaymentHistory(loanId);
        setRepaymentHistory(repayments.map((r: any) => ({ amount_paid: r.amountPaid ?? r.amount_paid, payment_date: r.paymentDate ?? r.payment_date, notes: r.notes, transactionId: r.transactionId ?? r.transaction_id ?? undefined })));
        const totalRepaid = repayments.reduce((sum, repayment: any) => {
          return sum + Number(repayment.amount_paid ?? repayment.amountPaid ?? 0);
        }, 0);
        const loanAmount = Math.abs(selectedTransaction.amount);
        const remaining = Math.max(loanAmount - totalRepaid, 0);
        const percentage = loanAmount > 0 ? Math.min((totalRepaid / loanAmount) * 100, 100) : 0;

        setLoanProgress({ totalRepaid, remaining, percentage });
      } catch {
        setLoanProgress(null);
      } finally {
        setLoanProgressLoading(false);
      }
    };

    loadLoanProgressForDrawer();
  }, [selectedTransactionId, transactions]);

  useEffect(() => {
    if (loanProgress && showRepaymentModal) {
      setRepaymentAmount(loanProgress.remaining.toString());
    }
  }, [loanProgress, showRepaymentModal]);
  
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
    }
  }, [periodFilter, customDateRange]);

  // Helper function to sort transactions by date (newest first)
  const sortTransactionsByDateDesc = (transactions: Transaction[]) => {
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const toggleTransactionDrawer = (transactionId: string) => {
    setSelectedTransactionId(prev => {
      const nextId = prev === transactionId ? null : transactionId;
      if (nextId) {
        setTimeout(() => {
          const el = document.getElementById(`transaction-${transactionId}`);
          if (el) {
            const header = document.querySelector('header');
            const headerOffset = header ? header.getBoundingClientRect().height + 8 : 72;
            const rect = el.getBoundingClientRect();
            window.scrollBy({ top: rect.top - headerOffset, behavior: 'smooth' });
          }
        }, 50);
      }
      return nextId;
    });
  };

  const handleDeleteTransaction = async (e: React.MouseEvent, transactionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer cette transaction ?')) {
      return;
    }

    try {
      const success = await transactionService.deleteTransaction(transactionId);
      if (!success) {
        toast.error('Erreur lors de la suppression de la transaction');
        return;
      }

      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      setTransferredTransactions(prev => prev.filter(t => t.id !== transactionId));
      setSharedTransactionIds(prev => {
        const updated = new Set(prev);
        updated.delete(transactionId);
        return updated;
      });
      setSharedTransactionsMap(prev => {
        const updated = new Map(prev);
        updated.delete(transactionId);
        return updated;
      });
      setReimbursementStatuses(prev => {
        const updated = new Map(prev);
        updated.delete(transactionId);
        return updated;
      });
      setSelectedTransactionId(prev => (prev === transactionId ? null : prev));
      toast.success('Transaction supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression de la transaction');
    }
  };

  const getRepaymentInfo = (category: string): { type: 'income' | 'expense'; category: string } => {
    switch (category) {
      case 'loan':
        return { type: 'income', category: 'loan_repayment_received' };
      case 'loan_received':
        return { type: 'expense', category: 'loan_repayment' };
      case 'loan_repayment':
        return { type: 'income', category: 'loan_repayment_received' };
      case 'loan_repayment_received':
      default:
        return { type: 'expense', category: 'loan_repayment' };
    }
  };

  const resetRepaymentForm = () => {
    setShowRepaymentModal(null);
    setRepaymentAmount('');
    setRepaymentAccountId('');
    setRepaymentDate(new Date().toISOString().split('T')[0]);
    setRepaymentDescription('');
    setRepaymentNotes('');
    setRepaymentHistory([]);
    setParentLoanInfo(null);
    setRepaymentIndex(1);
  };

  const getOrdinalLabel = (n: number): string => {
    if (n === 1) return '1er';
    return `${n}e`;
  };

  const openRepaymentModal = async (transaction: Transaction) => {
    setShowRepaymentModal(transaction.id);
    setRepaymentAmount(Math.abs(transaction.amount).toString());
    setRepaymentAccountId(transaction.accountId || '');
    setRepaymentDate(new Date().toISOString().split('T')[0]);
    const beneficiaryName = transaction.description
      ?.replace(/^Pr[eê]t\s+(?:[aà]|de)\s+/i, '')
      .trim();
    setRepaymentDescription(
      transaction.category === 'loan'
        ? `Remb. de ${beneficiaryName || transaction.description}`
        : `Remb. ${transaction.description}`
    );
    setRepaymentNotes('');
    setRepaymentIndex(1);

    setLoanProgressLoading(true);
    setLoanProgress(null);

    try {
      const loanId = await getLoanIdByTransactionId(transaction.id);

      if (!loanId) {
        setLoanProgress(null);
        setRepaymentIndex(1);
        return;
      }

      const currentRepaymentIndex = await getRepaymentIndexForTransaction(loanId, transaction.id);
      setRepaymentIndex((currentRepaymentIndex || 0) + 1);

      const repayments = await getRepaymentHistory(loanId);
      setRepaymentHistory(repayments.map((r: any) => ({ amount_paid: r.amountPaid ?? r.amount_paid, payment_date: r.paymentDate ?? r.payment_date, notes: r.notes, transactionId: r.transactionId ?? r.transaction_id ?? undefined })));
      const totalRepaid = repayments.reduce((sum, repayment: any) => {
        return sum + Number(repayment.amount_paid ?? repayment.amountPaid ?? 0);
      }, 0);
      const loanAmount = Math.abs(transaction.amount);
      const remaining = Math.max(loanAmount - totalRepaid, 0);
      const percentage = loanAmount > 0 ? Math.min((totalRepaid / loanAmount) * 100, 100) : 0;

      setLoanProgress({ totalRepaid, remaining, percentage });
    } catch {
      setLoanProgress(null);
    } finally {
      setLoanProgressLoading(false);
    }
  };

  const handleConfirmRepayment = async (transaction: Transaction) => {
    if (!user) {
      toast.error('Utilisateur non connecté');
      return;
    }
    const amountValue = parseFloat(repaymentAmount);
    if (!amountValue || amountValue <= 0) {
      toast.error('Montant invalide');
      return;
    }
    if (!repaymentAccountId) {
      toast.error('Veuillez sélectionner un compte');
      return;
    }
    try {
      const repayment = getRepaymentInfo(transaction.category);
      const createdRepaymentTransaction = await transactionService.createTransaction(user.id, {
        type: repayment.type,
        category: repayment.category as TransactionCategory,
        amount: amountValue,
        accountId: repaymentAccountId,
        date: new Date(repaymentDate),
        description: repaymentDescription || `Remb. ${transaction.description}`,
        notes: repaymentNotes || undefined,
      });
      console.log('[DEBUG-REPAYMENT] createdRepaymentTransaction:', createdRepaymentTransaction);
      const loanId = await getLoanIdByTransactionId(transaction.id);
      console.log('[DEBUG-REPAYMENT] transaction.id:', transaction.id, '| loanId found:', loanId);
      if (loanId && createdRepaymentTransaction?.id) {
        console.log('[DEBUG-REPAYMENT] Calling recordPayment with:', { loanId, amountValue, repaymentDate, notes: repaymentNotes, transactionId: createdRepaymentTransaction?.id });
        await recordPayment(
          loanId,
          amountValue,
          repaymentDate,
          repaymentNotes || undefined,
          createdRepaymentTransaction.id
        );
        console.log('[DEBUG-REPAYMENT] recordPayment completed successfully');
      }
      const refreshed = await transactionService.getUserTransactions(user.id);
      setTransactions(refreshed);
      toast.success('Remboursement enregistré');
      resetRepaymentForm();
    } catch (error: any) {
      console.log('[DEBUG-REPAYMENT] ERROR:', error);
      toast.error(error?.message || 'Erreur lors de l’enregistrement du remboursement');
    }
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
      
      // FIX: Handle empty splitDetails for 'paid_by_one' transactions
      // When splitDetails is empty, find all active members excluding the creditor
      const hasSplitDetails = sharedTransaction.splitDetails && sharedTransaction.splitDetails.length > 0;
      
      let promises: Promise<any>[];
      
      if (!hasSplitDetails) {
        // Case 1: Empty splitDetails (e.g., splitType 'paid_by_one')
        // Find all active family members excluding the creditor
        const debtorMembers = memberBalances.filter(
          member => member.userId !== sharedTransaction.paidBy
        );
        
        if (debtorMembers.length === 0) {
          toast.error('Aucun membre à rembourser pour cette transaction');
          setRequestingReimbursement(null);
          return;
        }
        
        // Calculate amount per member: split transaction amount equally among all debtors
        const transactionAmount = Math.abs(sharedTransaction.amount);
        const amountPerMember = transactionAmount / debtorMembers.length;
        
        // Create reimbursement request for each debtor member
        promises = debtorMembers.map(debtorMember =>
          createReimbursementRequest({
            sharedTransactionId: sharedTransaction.id,
            fromMemberId: debtorMember.memberId,
            toMemberId: creditorMember.memberId,
            amount: amountPerMember,
            currency: 'MGA',
            note: `Remboursement pour: ${sharedTransaction.description || 'Transaction partagée'}`,
          })
        );
      } else {
        // Case 2: splitDetails has values (existing behavior preserved)
        // Create reimbursement request for each debtor in splitDetails
        promises = (sharedTransaction.splitDetails || [])
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
      }
      
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
    const transactionDate = new Date(transaction.date);
    const { startDate, endDate } = getDateRange();
    const matchesPeriod = transactionDate >= startDate && transactionDate <= endDate;
    
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
          // Use original amount directly - let CurrencyDisplay handle conversion
          const rawDisplayAmount = transaction.originalAmount !== undefined
            ? transaction.originalAmount
            : transaction.amount;
          let displayAmount = rawDisplayAmount;
          let isDebit = false;
          let isCredit = false;
          let displayDescription = transaction.description;
          let transferLabel = '';
          
          if (isTransfer) {
            // Pour les transferts, se baser sur le signe du montant ORIGINAL (transaction.amount)
            // CRITICAL: Use transaction.amount (not converted amount) to determine debit/credit
            // The sign of transaction.amount determines the transaction direction:
            // - Negative amount = Debit (money going out)
            // - Positive amount = Credit (money coming in)
            // Le filtrage par compte est déjà géré par filteredTransactions
            isDebit = transaction.amount < 0;
            isCredit = transaction.amount > 0;
            displayAmount = Math.abs(rawDisplayAmount);
            displayDescription = isDebit ? `Sortie: ${transaction.description}` : `Entrée: ${transaction.description}`;
            transferLabel = isDebit ? 'Débit' : 'Crédit';
          } else {
            // For income/expense, use absolute value for display
            displayAmount = Math.abs(rawDisplayAmount);
          }
          
          // Determine original currency for CurrencyDisplay
          const originalCurrency = transaction.originalCurrency || 'MGA';
          
          const isDrawerOpen = selectedTransactionId === transaction.id;
          const isShared = sharedTransactionIds.has(transaction.id);
          const status = isLoadingReimbursementStatuses
            ? 'loading'
            : (reimbursementStatuses.get(transaction.id) || 'none');
          const isLoanCategory = ['loan', 'loan_received', 'loan_repayment', 'loan_repayment_received'].includes(transaction.category);
          const isRepaymentCat = ['loan_repayment', 'loan_repayment_received'].includes(transaction.category);

          return (
            <div key={transaction.id} className="space-y-2">
              <div
                id={`transaction-${transaction.id}`}
                onClick={() => toggleTransactionDrawer(transaction.id)}
                className={`card hover:shadow-lg transition-all cursor-pointer ${
                  isDrawerOpen
                    ? 'ring-2 ring-purple-200'
                    : highlightedTransactionId === transaction.id
                    ? 'ring-2 ring-green-400 ring-offset-2'
                    : ''
                }`}
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
                      {activeFamilyGroup && (
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
                      )}
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
                      originalCurrency={originalCurrency}
                      displayCurrency={displayCurrency}
                      showConversion={true}
                      size="md"
                      exchangeRateUsed={transaction.exchangeRateUsed}
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              </div>

              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: isDrawerOpen ? (showRepaymentModal === transaction.id ? '1800px' : '600px') : '0px' }}
              >
                <div className="card bg-gradient-to-br from-purple-50/80 to-white border-purple-100 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-semibold text-purple-700">Details transaction</h5>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTransactionId(null);
                      }}
                      className="p-1 rounded hover:bg-purple-100 transition-colors"
                      title="Fermer"
                    >
                      <X className="w-4 h-4 text-purple-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div className={`bg-white/80 rounded-lg p-2 ${isLoanCategory ? 'col-span-2' : ''}`}>
                      <p className="text-gray-500 text-xs">Montant</p>
                      {['loan', 'loan_received'].includes(transaction.category) ? (
                        loanProgressLoading ? (
                          <p className="text-xs font-medium text-gray-600">Chargement solde...</p>
                        ) : !loanProgress ? (
                          <p className="font-semibold text-gray-900">
                            <CurrencyDisplay
                              amount={displayAmount}
                              originalCurrency={originalCurrency}
                              displayCurrency={displayCurrency}
                              showConversion={true}
                              size="sm"
                              exchangeRateUsed={transaction.exchangeRateUsed}
                            />
                          </p>
                        ) : (
                          <div className="mt-1">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Remboursé: {loanProgress.totalRepaid.toLocaleString('fr-FR')} Ar</span>
                              <span>Restant: {loanProgress.remaining.toLocaleString('fr-FR')} Ar</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${loanProgress.percentage}%` }}
                              />
                            </div>
                            <div className="text-center text-xs font-semibold text-green-700 mt-1">
                              {loanProgress.percentage.toFixed(1)}% remboursé
                            </div>
                          </div>
                        )
                      ) : isRepaymentCat ? (
                        parentLoanInfo ? (
                          <div
                            className="cursor-pointer hover:bg-green-50 rounded p-1 -m-1 transition-colors flex justify-between items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (parentLoanInfo.transactionId) {
                                setSelectedTransactionId(null);
                                setTimeout(() => {
                                  const el = document.getElementById(`transaction-${parentLoanInfo.transactionId}`);
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    el.classList.add('ring-2', 'ring-green-400', 'ring-offset-2');
                                    setTimeout(() => el.classList.remove('ring-2', 'ring-green-400', 'ring-offset-2'), 2000);
                                  }
                                }, 150);
                              }
                            }}
                          >
                            <p className="text-xs text-gray-500">Dette initiale 🔗</p>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900 text-xs">{parentLoanInfo.amountInitial.toLocaleString('fr-FR')} Ar</p>
                              <p className="text-xs text-gray-400">{new Date(parentLoanInfo.createdAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-gray-600">Chargement...</p>
                        )
                      ) : (
                        <p className="font-semibold text-gray-900">
                          <CurrencyDisplay
                            amount={displayAmount}
                            originalCurrency={originalCurrency}
                            displayCurrency={displayCurrency}
                            showConversion={true}
                            size="sm"
                            exchangeRateUsed={transaction.exchangeRateUsed}
                          />
                        </p>
                      )}
                    </div>
                    {!(showRepaymentModal === transaction.id) && !isLoanCategory && (
                      <div className="bg-white/80 rounded-lg p-2">
                        <p className="text-gray-500 text-xs">Categorie</p>
                        <p className="font-semibold text-gray-900">{category.name}</p>
                      </div>
                    )}
                    {!isLoanCategory && (
                      <div className="bg-white/80 rounded-lg p-2">
                        <p className="text-gray-500 text-xs">Date</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(transaction.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                    {!(showRepaymentModal === transaction.id) && !isLoanCategory && (
                      <div className="bg-white/80 rounded-lg p-2">
                        <p className="text-gray-500 text-xs">Compte</p>
                        <p className="font-semibold text-gray-900 truncate">{transaction.accountId}</p>
                      </div>
                    )}
                  </div>

                  {isLoanCategory && repaymentHistory.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-600 mb-1">Historique des remboursements</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {repaymentHistory.map((r, i) => (
                          <div
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (r.transactionId) {
                                resetRepaymentForm();
                                setSelectedTransactionId(null);
                                setHighlightedTransactionId(r.transactionId);
                                setTimeout(() => {
                                  const el = document.getElementById(`transaction-${r.transactionId}`);
                                  if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    el.classList.add('ring-2', 'ring-green-400', 'ring-offset-2');
                                    setTimeout(() => {
                                      el.classList.remove('ring-2', 'ring-green-400', 'ring-offset-2');
                                      setHighlightedTransactionId(null);
                                    }, 2000);
                                  }
                                }, 150);
                              }
                            }}
                            className={`flex justify-between items-center px-3 py-1.5 bg-gray-50 rounded-lg text-xs ${r.transactionId ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                          >
                            <span className="text-gray-500">{new Date(r.payment_date).toLocaleDateString('fr-FR')}</span>
                            <span className="font-semibold text-green-700">+{r.amount_paid.toLocaleString('fr-FR')} Ar</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="bg-white/80 rounded-lg p-2">
                      <p className="text-gray-500 text-xs">Notes</p>
                      <p className="text-gray-800">{transaction.notes || 'Aucune note'}</p>
                    </div>

                    {!isLoanCategory && (
                      <div className="bg-white/80 rounded-lg p-2">
                        <p className="text-gray-500 text-xs">Partage famille</p>
                        <p className="text-gray-800">
                          {isShared ? `Partagee (${activeFamilyGroup?.name || 'groupe actif'})` : 'Non partagee'}
                        </p>
                      </div>
                    )}

                    {isShared && !isLoanCategory && (
                      <div className="bg-white/80 rounded-lg p-2">
                        <p className="text-gray-500 text-xs">Remboursement</p>
                        <p className="text-gray-800">
                          {status === 'loading'
                            ? 'Chargement...'
                            : status === 'none'
                            ? 'Aucune demande'
                            : status === 'pending'
                            ? 'En attente'
                            : 'Effectue'}
                        </p>
                      </div>
                    )}

                    {isLoanCategory && (
                      <div className="bg-purple-100/70 rounded-lg p-2 border border-purple-200">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="text-purple-700 text-xs font-medium">Informations pret</p>
                            <p className="text-purple-800">
                              Categorie: {transaction.category.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div className="flex-1 text-right">
                            <p className="text-purple-700 text-xs font-medium">Partage famille</p>
                            <p className="text-purple-800">
                              {isShared ? `Partagee (${activeFamilyGroup?.name || 'groupe actif'})` : 'Non partagee'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-100">
                    {isLoanCategory && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRepaymentModal(transaction);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        💸 Rembourser
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/transaction/${transaction.id}`, { state: { autoEdit: true } });
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button
                        onClick={(e) => handleDeleteTransaction(e, transaction.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                      <ChevronDown className={`w-4 h-4 text-purple-500 transition-transform ${isDrawerOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  {showRepaymentModal === transaction.id && (
                    <div onClick={(e) => { e.stopPropagation(); }} className="mt-2 p-3 bg-white rounded-lg border border-green-200 shadow-sm">
                      <h6 className="text-sm font-semibold text-green-700 mb-2">Initier {getOrdinalLabel(repaymentIndex)} remboursement</h6>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Montant</label>
                          <input
                            type="number"
                            value={repaymentAmount}
                            onChange={(e) => setRepaymentAmount(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Compte</label>
                          <select
                            value={repaymentAccountId}
                            onChange={(e) => setRepaymentAccountId(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          >
                            <option value="">Sélectionner un compte</option>
                            {repaymentAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Date</label>
                          <input
                            type="date"
                            value={repaymentDate}
                            onChange={(e) => setRepaymentDate(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Description</label>
                          <input
                            type="text"
                            value={repaymentDescription}
                            onChange={(e) => setRepaymentDescription(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Notes</label>
                          <textarea
                            rows={2}
                            value={repaymentNotes}
                            onChange={(e) => setRepaymentNotes(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              resetRepaymentForm();
                            }}
                            className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmRepayment(transaction);
                            }}
                            className="px-3 py-1.5 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            Confirmer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
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
