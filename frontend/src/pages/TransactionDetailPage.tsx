import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Save, X, TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle, Users, Repeat } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import transactionService from '../services/transactionService';
import accountService from '../services/accountService';
import { TRANSACTION_CATEGORIES } from '../constants';
import { db } from '../lib/database';
import { useCurrency } from '../hooks/useCurrency';
import type { Transaction, Account, TransactionCategory } from '../types';
import * as familyGroupService from '../services/familyGroupService';
import { shareTransaction, unshareTransaction, getSharedTransactionByTransactionId, updateSharedTransaction } from '../services/familySharingService';
import { toast } from 'react-hot-toast';
import type { ShareTransactionInput, SplitType, FamilyGroup, FamilySharedTransaction } from '../types/family';
import RecurringConfigSection from '../components/RecurringConfig/RecurringConfigSection';
import { validateRecurringData } from '../utils/recurringUtils';
import recurringTransactionService from '../services/recurringTransactionService';
import type { RecurrenceFrequency } from '../types/recurring';

const TransactionDetailPage = () => {
  const navigate = useNavigate();
  const { transactionId } = useParams<{ transactionId: string }>();
  const { user } = useAppStore();
  const { displayCurrency } = useCurrency();
  const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';
  
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [targetAccount, setTargetAccount] = useState<Account | null>(null);
  const [userAccounts, setUserAccounts] = useState<Account[]>([]);
  const [originalAccountId, setOriginalAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAccountChangeWarning, setShowAccountChangeWarning] = useState(false);
  const [isTransfer, setIsTransfer] = useState(false);
  
  // Family sharing state
  const [activeFamilyGroup, setActiveFamilyGroup] = useState<FamilyGroup | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [sharedTransaction, setSharedTransaction] = useState<FamilySharedTransaction | null>(null);
  const [hasReimbursementRequest, setHasReimbursementRequest] = useState(false);
  const [initialHasReimbursementRequest, setInitialHasReimbursementRequest] = useState(false);
  const [isLoadingSharingStatus, setIsLoadingSharingStatus] = useState(false);
  
  // Custom reimbursement rate
  const [customReimbursementRate, setCustomReimbursementRate] = useState<number>(100);
  
  // Recurring transaction state
  const [isRecurring, setIsRecurring] = useState(false);
  const [existingRecurringId, setExistingRecurringId] = useState<string | null>(null);
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
  
  const [editData, setEditData] = useState({
    description: '',
    amount: '',
    category: 'autres' as keyof typeof TRANSACTION_CATEGORIES,
    date: '',
    notes: '',
    accountId: ''
  });

  // Scroll to top on mount to ensure content is visible below fixed header
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Charger la transaction
  useEffect(() => {
    const loadTransaction = async () => {
      if (!transactionId || !user) return;
      
      try {
        setIsLoading(true);
        console.log('🔍 Loading transaction with ID:', transactionId, 'for user:', user.id);
        
        // Utiliser le service de transaction au lieu d'IndexedDB direct
        const transactionData = await transactionService.getTransaction(transactionId, user.id);
        
        if (!transactionData || transactionData.userId !== user.id) {
          console.error('❌ Transaction non trouvée ou non autorisée');
          console.log('🔍 Query result:', transactionData);
          navigate('/transactions');
          return;
        }
        
        console.log('✅ Transaction loaded successfully:', transactionData);
        
        setTransaction(transactionData);
        setOriginalAccountId(transactionData.accountId);
        
        // Detect if this is a transfer transaction
        const isTransferTransaction = transactionData.type === 'transfer';
        setIsTransfer(isTransferTransaction);
        console.log('🔍 Transaction type:', transactionData.type, 'Is transfer:', isTransferTransaction);
        
        setEditData({
          description: transactionData.description,
          amount: Math.abs(transactionData.amount).toString(),
          category: transactionData.category,
          date: new Date(transactionData.date).toISOString().split('T')[0],
          notes: transactionData.notes || '',
          accountId: transactionData.accountId
        });
        
        // Charger tous les comptes de l'utilisateur
        const allAccounts = await accountService.getUserAccounts(user.id);
        setUserAccounts(allAccounts);
        console.log('✅ User accounts loaded:', allAccounts.length);
        
        // Charger le compte principal de la transaction
        const accountData = await accountService.getAccount(transactionData.accountId, user.id);
        setAccount(accountData);
        console.log('✅ Transaction account loaded:', accountData?.name || 'Not found');
        
        // Charger le compte de destination pour les transferts
        if (transactionData.targetAccountId) {
          const targetAccountData = await accountService.getAccount(transactionData.targetAccountId, user.id);
          setTargetAccount(targetAccountData);
          console.log('✅ Target account loaded:', targetAccountData?.name || 'Not found');
        }
        
      } catch (error) {
        console.error('❌ Erreur lors du chargement de la transaction:', error);
        console.error('❌ Erreur lors du chargement de la transaction');
        navigate('/transactions');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTransaction();
  }, [transactionId, user, navigate]);

  // Charger le groupe familial actif
  useEffect(() => {
    const loadFamilyGroup = async () => {
      if (!user) {
        setActiveFamilyGroup(null);
        return;
      }

      try {
        const groups = await familyGroupService.getUserFamilyGroups();
        if (groups.length > 0) {
          setActiveFamilyGroup(groups[0]);
        } else {
          setActiveFamilyGroup(null);
        }
      } catch (error) {
        console.log('No family group available:', error);
        setActiveFamilyGroup(null);
      }
    };

    loadFamilyGroup();
  }, [user]);

  // Charger l'état de partage de la transaction
  useEffect(() => {
    const loadSharingStatus = async () => {
      if (!transaction || !activeFamilyGroup || !user) {
        setIsShared(false);
        setSharedTransaction(null);
        return;
      }

      try {
        setIsLoadingSharingStatus(true);
        const shared = await getSharedTransactionByTransactionId(
          transaction.id,
          activeFamilyGroup.id
        );
        
        if (shared) {
          setIsShared(true);
          setSharedTransaction(shared);
          // Get has_reimbursement_request from the raw row data
          // The mapping function doesn't include it, so we need to fetch it separately
          try {
            const { supabase } = await import('../lib/supabase');
            const { data: rawData } = await supabase
              .from('family_shared_transactions')
              .select('has_reimbursement_request')
              .eq('id', shared.id)
              .single();
            const reimbursementStatus = (rawData as any)?.has_reimbursement_request || false;
            setHasReimbursementRequest(reimbursementStatus);
            setInitialHasReimbursementRequest(reimbursementStatus);
          } catch (error) {
            console.error('Error loading reimbursement request status:', error);
            setHasReimbursementRequest(false);
            setInitialHasReimbursementRequest(false);
          }
          
          // Initialize custom reimbursement rate
          // Try to get existing reimbursement request to calculate rate
          try {
            const { supabase } = await import('../lib/supabase');
            const { data: reimbursementData } = await supabase
              .from('reimbursement_requests')
              .select('amount')
              .eq('shared_transaction_id', shared.id)
              .eq('status', 'pending')
              .maybeSingle();
            
            if (reimbursementData && transaction) {
              // Calculate rate from existing reimbursement amount
              const transactionAmount = Math.abs(transaction.amount);
              const reimbursementAmount = reimbursementData.amount || 0;
              if (transactionAmount > 0) {
                const calculatedRate = Math.round((reimbursementAmount / transactionAmount) * 100);
                setCustomReimbursementRate(Math.min(100, Math.max(1, calculatedRate)));
              }
            } else if (activeFamilyGroup) {
              // Load from localStorage family setting
              const storedRate = localStorage.getItem(`bazarkely_family_${activeFamilyGroup.id}_reimbursement_rate`);
              if (storedRate) {
                setCustomReimbursementRate(parseInt(storedRate, 10));
              }
            }
          } catch (error) {
            console.error('Error loading reimbursement rate:', error);
            // Default to 100 or from localStorage
            if (activeFamilyGroup) {
              const storedRate = localStorage.getItem(`bazarkely_family_${activeFamilyGroup.id}_reimbursement_rate`);
              if (storedRate) {
                setCustomReimbursementRate(parseInt(storedRate, 10));
              }
            }
          }
        } else {
          setIsShared(false);
          setSharedTransaction(null);
          setHasReimbursementRequest(false);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du statut de partage:', error);
        setIsShared(false);
        setSharedTransaction(null);
      } finally {
        setIsLoadingSharingStatus(false);
      }
    };

    loadSharingStatus();
  }, [transaction, activeFamilyGroup, user]);

  // Check if this transaction has an associated recurring transaction
  useEffect(() => {
    const checkExistingRecurring = async () => {
      if (!transaction || !user) {
        setIsRecurring(false);
        setExistingRecurringId(null);
        return;
      }

      try {
        console.log('🔍 Checking for existing recurring transaction for transaction:', transaction.id);
        
        // Get all recurring transactions for this user
        const allRecurring = await recurringTransactionService.getAll(user.id);
        
        // Find if any recurring transaction matches this transaction
        // Match by: same description, same amount, same category, same account
        const matchingRecurring = allRecurring.find(rt => 
          rt.description === transaction.description &&
          Math.abs(rt.amount) === Math.abs(transaction.amount) &&
          rt.category === transaction.category &&
          rt.accountId === transaction.accountId &&
          rt.isActive
        );

        if (matchingRecurring) {
          console.log('🔄 Found existing recurring transaction:', matchingRecurring.id);
          setIsRecurring(true);
          setExistingRecurringId(matchingRecurring.id);
          
          // Load the recurring configuration
          setRecurringConfig({
            frequency: matchingRecurring.frequency || 'monthly',
            startDate: matchingRecurring.startDate ? new Date(matchingRecurring.startDate) : new Date(),
            endDate: matchingRecurring.endDate ? new Date(matchingRecurring.endDate) : null,
            dayOfMonth: matchingRecurring.dayOfMonth || new Date().getDate(),
            dayOfWeek: matchingRecurring.dayOfWeek || null,
            notifyBeforeDays: matchingRecurring.notifyBeforeDays || 1,
            autoCreate: matchingRecurring.autoCreate ?? false,
            linkedBudgetId: matchingRecurring.linkedBudgetId || null
          });
        } else {
          console.log('ℹ️ No matching recurring transaction found');
          setIsRecurring(false);
          setExistingRecurringId(null);
        }
      } catch (error) {
        console.error('❌ Error checking existing recurring transaction:', error);
        setIsRecurring(false);
        setExistingRecurringId(null);
      }
    };

    checkExistingRecurring();
  }, [transaction, user]);

  const handleEdit = () => {
    // Prevent editing transfers
    if (isTransfer) {
      console.log('⚠️ Transfer editing is not allowed');
      return;
    }
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!transaction || !user) return;
    
    try {
      const updatedTransactionData = {
        description: editData.description,
        amount: transaction.type === 'income' ? parseFloat(editData.amount) : -parseFloat(editData.amount),
        category: editData.category as TransactionCategory,
        date: new Date(editData.date),
        notes: editData.notes,
        accountId: editData.accountId
      };
      
      // Check if account was changed
      const accountChanged = editData.accountId !== originalAccountId;
      
      if (accountChanged) {
        console.log('🔄 Account change detected - implementing balance adjustment logic');
        console.log('📊 Original account ID:', originalAccountId);
        console.log('📊 New account ID:', editData.accountId);
        console.log('💰 Transaction amount:', updatedTransactionData.amount);
        
        // STEP 1: Get current account balances
        const oldAccount = await accountService.getAccount(originalAccountId, user.id);
        const newAccount = await accountService.getAccount(editData.accountId, user.id);
        
        if (!oldAccount || !newAccount) {
          throw new Error('Impossible de charger les comptes pour l\'ajustement des soldes');
        }
        
        console.log('💰 Old account balance before adjustment:', oldAccount.balance);
        console.log('💰 New account balance before adjustment:', newAccount.balance);
        
        // STEP 2: Calculate reverse amount to neutralize old account impact
        const reverseAmount = -transaction.amount; // Reverse the original transaction impact
        const newAmount = updatedTransactionData.amount; // Apply new transaction amount
        
        console.log('🔄 Reverse amount for old account:', reverseAmount);
        console.log('🔄 New amount for new account:', newAmount);
        
        // STEP 3: Update old account balance (reverse the original transaction)
        const oldAccountNewBalance = oldAccount.balance + reverseAmount;
        console.log('💰 Old account new balance after reverse:', oldAccountNewBalance);
        
        const oldAccountUpdate = await accountService.updateAccount(originalAccountId, user.id, {
          balance: oldAccountNewBalance
        });
        
        if (!oldAccountUpdate) {
          throw new Error('Échec de la mise à jour du solde de l\'ancien compte');
        }
        
        // STEP 4: Update new account balance (apply new transaction)
        const newAccountNewBalance = newAccount.balance + newAmount;
        console.log('💰 New account new balance after new transaction:', newAccountNewBalance);
        
        const newAccountUpdate = await accountService.updateAccount(editData.accountId, user.id, {
          balance: newAccountNewBalance
        });
        
        if (!newAccountUpdate) {
          // Rollback old account if new account update fails
          console.error('❌ Rolling back old account balance due to new account update failure');
          await accountService.updateAccount(originalAccountId, user.id, {
            balance: oldAccount.balance
          });
          throw new Error('Échec de la mise à jour du solde du nouveau compte');
        }
        
        console.log('✅ Balance adjustments completed successfully');
        console.log('✅ Old account final balance:', oldAccountNewBalance);
        console.log('✅ New account final balance:', newAccountNewBalance);
      }
      
      // STEP 5: Update transaction record with new accountId
      const updatedTransaction = await transactionService.updateTransaction(transaction.id, updatedTransactionData);
      
      if (!updatedTransaction) {
        // If account was changed, we need to rollback the balance changes
        if (accountChanged) {
          console.error('❌ Rolling back balance changes due to transaction update failure');
          const oldAccount = await accountService.getAccount(originalAccountId, user.id);
          const newAccount = await accountService.getAccount(editData.accountId, user.id);
          
          if (oldAccount && newAccount) {
            await accountService.updateAccount(originalAccountId, user.id, {
              balance: oldAccount.balance + transaction.amount
            });
            await accountService.updateAccount(editData.accountId, user.id, {
              balance: newAccount.balance - updatedTransactionData.amount
            });
          }
        }
        throw new Error('Échec de la mise à jour de la transaction');
      }
      
      // Update local state
      setTransaction(updatedTransaction);
      setOriginalAccountId(editData.accountId);
      setIsEditing(false);
      setShowAccountChangeWarning(false);
      
      // Update account display
      const newAccount = await accountService.getAccount(editData.accountId, user.id);
      setAccount(newAccount);
      
      // Handle family sharing changes
      if (activeFamilyGroup && user) {
        try {
          // If share toggle is ON and not already shared
          if (isShared && !sharedTransaction) {
            const shareInput: ShareTransactionInput = {
              familyGroupId: activeFamilyGroup.id,
              transactionId: updatedTransaction.id,
              description: updatedTransaction.description,
              amount: Math.abs(updatedTransaction.amount),
              category: updatedTransaction.category,
              date: new Date(updatedTransaction.date),
              splitType: 'paid_by_one' as SplitType,
              paidBy: user.id,
              splitDetails: [],
              notes: undefined,
            };
            const newSharedTransaction = await shareTransaction(shareInput);
            toast.success('Transaction partagée avec votre famille !');
            
            // Update local state with new shared transaction
            setSharedTransaction(newSharedTransaction);
            
            // If reimbursement is requested, update the amount with custom rate
            if (hasReimbursementRequest && newSharedTransaction) {
              try {
                const { supabase } = await import('../lib/supabase');
                const transactionAmount = Math.abs(updatedTransaction.amount);
                const customAmount = transactionAmount * (customReimbursementRate / 100);
                
                // Wait a bit for the reimbursement request to be created by the trigger
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Find and update the reimbursement request
                const { data: reimbursementRequest } = await supabase
                  .from('reimbursement_requests')
                  .select('id')
                  .eq('shared_transaction_id', newSharedTransaction.id)
                  .eq('status', 'pending')
                  .maybeSingle();
                
                if (reimbursementRequest) {
                  await supabase
                    .from('reimbursement_requests')
                    .update({ amount: customAmount })
                    .eq('id', reimbursementRequest.id);
                }
              } catch (error) {
                console.error('Error updating reimbursement amount:', error);
              }
            }
          }
          // If share toggle is OFF and already shared
          else if (!isShared && sharedTransaction) {
            await unshareTransaction(sharedTransaction.id);
            toast.success('Partage retiré');
          }
          // If shared and reimbursement request changed
          else if (isShared && sharedTransaction) {
            // Update reimbursement request status if changed from initial value OR rate changed
            const shouldUpdate = hasReimbursementRequest !== initialHasReimbursementRequest;
            
            if (shouldUpdate || hasReimbursementRequest) {
              // Pass custom reimbursement rate to updateSharedTransaction
              await updateSharedTransaction(sharedTransaction.id, {
                hasReimbursementRequest: hasReimbursementRequest,
                customReimbursementRate: customReimbursementRate
              } as any);
              
              // Also update amount directly if reimbursement is enabled (in case updateSharedTransaction doesn't handle it)
              if (hasReimbursementRequest && updatedTransaction) {
                try {
                  const { supabase } = await import('../lib/supabase');
                  const transactionAmount = Math.abs(updatedTransaction.amount);
                  const customAmount = transactionAmount * (customReimbursementRate / 100);
                  
                  // Wait a bit for the reimbursement request to be created/updated by updateSharedTransaction
                  await new Promise(resolve => setTimeout(resolve, 300));
                  
                  // Find existing reimbursement request
                  const { data: existingReimbursement } = await supabase
                    .from('reimbursement_requests')
                    .select('id')
                    .eq('shared_transaction_id', sharedTransaction.id)
                    .eq('status', 'pending')
                    .maybeSingle();
                  
                  if (existingReimbursement) {
                    // Update existing reimbursement amount with custom rate
                    const { error: updateError } = await supabase
                      .from('reimbursement_requests')
                      .update({ amount: customAmount })
                      .eq('id', existingReimbursement.id);
                    
                    if (updateError) {
                      console.error('Error updating reimbursement amount:', updateError);
                    } else {
                      console.log('✅ Reimbursement amount updated to:', customAmount, 'with rate:', customReimbursementRate + '%');
                    }
                  }
                } catch (error) {
                  console.error('Error updating reimbursement amount:', error);
                }
              }
              
              if (shouldUpdate) {
              toast.success('Demande de remboursement mise à jour');
              // Update initial value to current value
              setInitialHasReimbursementRequest(hasReimbursementRequest);
              } else {
                toast.success('Taux de remboursement mis à jour');
              }
            }
          }
        } catch (error: any) {
          console.error('Erreur lors de la gestion du partage:', error);
          const errorMessage = error?.message || 'Erreur lors de la gestion du partage';
          if (errorMessage.includes('déjà partagée')) {
            toast.error('Cette transaction est déjà partagée');
          } else {
            toast.error(errorMessage);
          }
        }
      }
      
      // Handle recurring transaction creation/update/deactivation
      if (isRecurring && user && updatedTransaction) {
        try {
          console.log('🔄 Processing recurring transaction, existing ID:', existingRecurringId);
          
          // Validate recurring data
          const validation = validateRecurringData({
            userId: user.id,
            accountId: updatedTransaction.accountId,
            type: updatedTransaction.type as 'income' | 'expense',
            amount: Math.abs(updatedTransaction.amount),
            description: updatedTransaction.description,
            category: updatedTransaction.category,
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
            console.error('❌ Recurring validation failed:', validation.errors);
            const errors: Record<string, string> = {};
            validation.errors.forEach(error => {
              const fieldMatch = error.match(/^([^:]+):/);
              if (fieldMatch) {
                const field = fieldMatch[1].toLowerCase().replace(/\s+/g, '');
                errors[field] = error;
              }
            });
            setRecurringErrors(errors);
            toast.error('Erreurs de validation pour la transaction récurrente');
            return;
          }
          
          setRecurringErrors({});
          
          if (existingRecurringId) {
            // Update existing recurring transaction
            console.log('🔄 Updating existing recurring transaction:', existingRecurringId);
            
            await recurringTransactionService.update(existingRecurringId, {
              accountId: updatedTransaction.accountId,
              type: updatedTransaction.type as 'income' | 'expense',
              amount: Math.abs(updatedTransaction.amount),
              description: updatedTransaction.description,
              category: updatedTransaction.category,
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
            
            console.log('✅ Recurring transaction updated successfully');
            toast.success('Transaction récurrente mise à jour !');
          } else {
            // Create new recurring transaction
            const recurringData = {
              userId: user.id,
              accountId: updatedTransaction.accountId,
              type: updatedTransaction.type as 'income' | 'expense',
              amount: Math.abs(updatedTransaction.amount),
              description: updatedTransaction.description,
              category: updatedTransaction.category,
              frequency: recurringConfig.frequency,
              startDate: recurringConfig.startDate,
              endDate: recurringConfig.endDate,
              dayOfMonth: recurringConfig.dayOfMonth,
              dayOfWeek: recurringConfig.dayOfWeek,
              notifyBeforeDays: recurringConfig.notifyBeforeDays,
              autoCreate: recurringConfig.autoCreate,
              linkedBudgetId: recurringConfig.linkedBudgetId,
              isActive: true
            };
            
            console.log('📝 Creating new recurring transaction with data:', recurringData);
            
            const createdRecurring = await recurringTransactionService.create(recurringData);
            
            if (createdRecurring) {
              console.log('✅ Recurring transaction created successfully:', createdRecurring.id);
              setExistingRecurringId(createdRecurring.id);
              toast.success('Transaction récurrente créée avec succès !');
            } else {
              throw new Error('Aucune transaction récurrente retournée après création');
            }
          }
        } catch (error: any) {
          console.error('❌ Error processing recurring transaction:', error);
          const errorMessage = error?.message || 'Erreur lors de la gestion de la transaction récurrente';
          toast.error(errorMessage);
          // Don't block navigation, just show error
        }
      } else if (!isRecurring && existingRecurringId) {
        // User disabled recurring - deactivate it
        try {
          console.log('🔄 Deactivating recurring transaction:', existingRecurringId);
          
          await recurringTransactionService.update(existingRecurringId, { isActive: false });
          
          console.log('✅ Recurring transaction deactivated successfully');
          setExistingRecurringId(null);
          toast.success('Récurrence désactivée');
        } catch (error: any) {
          console.error('❌ Error deactivating recurring transaction:', error);
          const errorMessage = error?.message || 'Erreur lors de la désactivation de la récurrence';
          toast.error(errorMessage);
        }
      }
      
      console.log('✅ Transaction mise à jour avec succès !');
      
      // Navigate to transactions list with transaction ID for scrolling
      if (transaction?.id) {
        navigate('/transactions', { state: { scrollToTransactionId: transaction.id } });
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      console.error('❌ Erreur lors de la mise à jour de la transaction');
    }
  };

  const handleDelete = async () => {
    if (!transaction || !user) return;
    
    try {
      setIsDeleting(true);
      console.log('🗑️ Starting transaction deletion for ID:', transaction.id);
      console.log('🔍 Transaction type:', transaction.type);
      
      // Check if this is a transfer transaction
      if (transaction.type === 'transfer') {
        console.log('💸 TRANSFER DELETION - Starting atomic deletion process');
        
        // 1. Find the paired transfer transaction
        const pairedTransaction = await transactionService.getPairedTransferTransaction(transaction);
        if (!pairedTransaction) {
          console.warn('⚠️ Paired transfer transaction not found - proceeding with single transaction deletion');
          // Fall back to single transaction deletion if paired transaction not found
          await handleSingleTransactionDeletion(transaction);
          return;
        }
        
        console.log('🔍 Found paired transaction:', pairedTransaction.id);
        console.log('💰 Source account (current):', transaction.accountId, 'Amount:', transaction.amount);
        console.log('💰 Destination account (paired):', pairedTransaction.accountId, 'Amount:', pairedTransaction.amount);
        
        // 2. Delete BOTH transactions from Supabase atomically
        console.log('🗑️ Deleting source transaction from Supabase:', transaction.id);
        const sourceDeleteSuccess = await transactionService.deleteTransaction(transaction.id);
        if (!sourceDeleteSuccess) {
          throw new Error('Échec de la suppression de la transaction source dans Supabase');
        }
        
        console.log('🗑️ Deleting paired transaction from Supabase:', pairedTransaction.id);
        const pairedDeleteSuccess = await transactionService.deleteTransaction(pairedTransaction.id);
        if (!pairedDeleteSuccess) {
          throw new Error('Échec de la suppression de la transaction jumelle dans Supabase');
        }
        
        console.log('✅ Both transactions deleted from Supabase');
        
        // 3. Restore balances for BOTH accounts
        console.log('💰 Restoring source account balance:', transaction.accountId, 'Amount:', -transaction.amount);
        await transactionService.updateAccountBalancePublic(transaction.accountId, -transaction.amount);
        
        console.log('💰 Restoring destination account balance:', pairedTransaction.accountId, 'Amount:', -pairedTransaction.amount);
        await transactionService.updateAccountBalancePublic(pairedTransaction.accountId, -pairedTransaction.amount);
        
        console.log('✅ Both account balances restored');
        
        // 4. Delete BOTH transactions from IndexedDB
        console.log('🗑️ Deleting source transaction from IndexedDB:', transaction.id);
        await db.transactions.delete(transaction.id);
        
        console.log('🗑️ Deleting paired transaction from IndexedDB:', pairedTransaction.id);
        await db.transactions.delete(pairedTransaction.id);
        
        console.log('✅ Both transactions deleted from IndexedDB');
        console.log('✅ TRANSFER DELETION COMPLETE - Both transactions and balances restored');
        
      } else {
        // Regular transaction deletion (non-transfer)
        console.log('📝 REGULAR TRANSACTION DELETION');
        await handleSingleTransactionDeletion(transaction);
      }
      
      console.log('✅ Transaction deletion completed successfully !');
      navigate('/transactions');
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      console.error('❌ Erreur lors de la suppression de la transaction');
      // Ne pas naviguer si la suppression a échoué
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper function for single transaction deletion (non-transfer)
  const handleSingleTransactionDeletion = async (transactionToDelete: Transaction) => {
    console.log('📝 Starting single transaction deletion for ID:', transactionToDelete.id);
    
    // 1. Supprimer de Supabase d'abord
    const deleteSuccess = await transactionService.deleteTransaction(transactionToDelete.id);
    if (!deleteSuccess) {
      throw new Error('Échec de la suppression dans Supabase');
    }
    console.log('✅ Transaction supprimée de Supabase');
    
    // 2. Restaurer le solde du compte
    await transactionService.updateAccountBalancePublic(transactionToDelete.accountId, -transactionToDelete.amount);
    console.log('✅ Solde du compte restauré');
    
    // 3. Supprimer de l'IndexedDB local
    await db.transactions.delete(transactionToDelete.id);
    console.log('✅ Transaction supprimée de l\'IndexedDB local');
  };

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false);
      setShowAccountChangeWarning(false);
      setEditData({
        description: transaction?.description || '',
        amount: transaction ? Math.abs(transaction.amount).toString() : '',
        category: transaction?.category || 'autres',
        date: transaction ? new Date(transaction.date).toISOString().split('T')[0] : '',
        notes: transaction?.notes || '',
        accountId: transaction?.accountId || ''
      });
    }
    
    // Navigate to transactions list with transaction ID for scrolling
    if (transaction?.id) {
      navigate('/transactions', { state: { scrollToTransactionId: transaction.id } });
      } else {
        navigate('/transactions');
    }
  };

  const formatCurrency = (amount: number) => {
    return `${Math.abs(amount).toLocaleString('fr-FR')} ${currencySymbol}`;
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'transfer') {
      // Pour les transferts, se baser sur le signe du montant
      const isDebit = amount < 0;
      return <ArrowRightLeft className={`w-6 h-6 ${isDebit ? 'text-red-600' : 'text-green-600'}`} />;
    }
    
    switch (type) {
      case 'income':
        return <TrendingUp className="w-6 h-6 text-green-600" />;
      case 'expense':
        return <TrendingDown className="w-6 h-6 text-red-600" />;
      default:
        return <TrendingUp className="w-6 h-6 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (type === 'transfer') {
      // Pour les transferts, se baser sur le signe du montant
      const isDebit = amount < 0;
      return isDebit ? 'text-red-600' : 'text-green-600';
    }
    
    switch (type) {
      case 'income':
        return 'text-green-600';
      case 'expense':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTransactionBgColor = (type: string, amount: number) => {
    if (type === 'transfer') {
      // Pour les transferts, se baser sur le signe du montant
      const isDebit = amount < 0;
      return isDebit ? 'bg-red-100' : 'bg-green-100';
    }
    
    switch (type) {
      case 'income':
        return 'bg-green-100';
      case 'expense':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  if (isLoading || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 pb-20 pt-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Modifier la transaction' : 'Détail de la transaction'}
            </h1>
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <>
                  {/* Hide Edit button for transfers */}
                  {!isTransfer && (
                    <button
                      onClick={handleEdit}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
              {isEditing && (
                <button
                  onClick={handleSave}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Sauvegarder"
                >
                  <Save className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning banner for transfers */}
      {isTransfer && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">⚠️ Les transferts ne peuvent pas être modifiés.</span>
                <br />
                Pour changer ce transfert, supprimez-le et recréez-le avec les bonnes informations.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto p-4">
        {/* Informations de la transaction */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTransactionBgColor(transaction.type, transaction.amount)}`}>
              {getTransactionIcon(transaction.type, transaction.amount)}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing && !isTransfer ? (
                  <input
                    type="text"
                    value={editData.description}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  transaction.type === 'transfer' ? 
                    (transaction.amount < 0 ? `Sortie: ${transaction.description}` : `Entrée: ${transaction.description}`) :
                    transaction.description
                )}
              </h2>
              <p className="text-sm text-gray-500">
                {TRANSACTION_CATEGORIES[transaction.category]?.name || transaction.category || 'Autres'} • {new Date(transaction.date).toLocaleDateString('fr-FR')}
                {transaction.type === 'transfer' && (
                  <span className={`ml-2 ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    • {transaction.amount < 0 ? 'Débit' : 'Crédit'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Montant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant
                {isTransfer && <span className="text-gray-500 text-xs ml-2">(Lecture seule)</span>}
              </label>
              {isEditing && !isTransfer ? (
                <div className="relative">
                  <input
                    type="number"
                    value={editData.amount}
                    onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    {currencySymbol}
                  </div>
                </div>
              ) : (
                <p className={`text-2xl font-bold ${getTransactionColor(transaction.type, transaction.amount)}`}>
                  {transaction.type === 'income' ? '+' : 
                   transaction.type === 'transfer' ? (transaction.amount < 0 ? '-' : '+') : '-'}{formatCurrency(transaction.amount)}
                </p>
              )}
            </div>

            {/* Catégorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catégorie
                {isTransfer && <span className="text-gray-500 text-xs ml-2">(Lecture seule)</span>}
              </label>
              {isEditing && !isTransfer ? (
                <select
                  value={editData.category}
                  onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(TRANSACTION_CATEGORIES).map(([key, value]) => (
                    <option key={key} value={key}>{value.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900">{TRANSACTION_CATEGORIES[transaction.category]?.name || transaction.category || 'Autres'}</p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
                {isTransfer && <span className="text-gray-500 text-xs ml-2">(Lecture seule)</span>}
              </label>
              {isEditing && !isTransfer ? (
                <input
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-900">{new Date(transaction.date).toLocaleDateString('fr-FR')}</p>
              )}
            </div>

            {/* Compte */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compte
                {isTransfer && <span className="text-gray-500 text-xs ml-2">(Lecture seule)</span>}
              </label>
              {isEditing && !isTransfer ? (
                <select
                  value={editData.accountId}
                  onChange={(e) => {
                    const newAccountId = e.target.value;
                    setEditData(prev => ({ ...prev, accountId: newAccountId }));
                    
                    // Show warning if account is being changed
                    if (newAccountId !== originalAccountId) {
                      setShowAccountChangeWarning(true);
                    } else {
                      setShowAccountChangeWarning(false);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {userAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900">{account?.name || 'Compte non trouvé'}</p>
              )}
              
              {/* Warning message for account change */}
              {isEditing && showAccountChangeWarning && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Changement de compte détecté</p>
                    <p>Les soldes des comptes seront ajustés automatiquement lors de la sauvegarde.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Compte de destination (pour les transferts) */}
            {transaction.type === 'transfer' && targetAccount && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Compte de destination</label>
                <p className="text-gray-900">{targetAccount?.name || 'Compte inconnu'}</p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
                {isTransfer && <span className="text-gray-500 text-xs ml-2">(Lecture seule)</span>}
              </label>
              {isEditing && !isTransfer ? (
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Ajoutez des notes..."
                />
              ) : (
                <p className="text-gray-900">{transaction.notes || 'Aucune note'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Partage famille section (only in edit mode) */}
        {isEditing && !isTransfer && activeFamilyGroup && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Partage famille</h3>
            </div>

            {isLoadingSharingStatus ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Toggle: Partager avec la famille */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Partager avec la famille
                    </label>
                    <p className="text-xs text-gray-500">
                      Partagez cette transaction avec votre groupe familial "{activeFamilyGroup.name}"
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isShared}
                      onChange={(e) => setIsShared(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Toggle: Demander remboursement (only if shared) */}
                {isShared && (
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Demander remboursement
                      </label>
                      <p className="text-xs text-gray-500">
                        Créez une demande de remboursement pour cette transaction partagée
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasReimbursementRequest}
                        onChange={(e) => setHasReimbursementRequest(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                )}

                {/* Custom Reimbursement Rate Input */}
                {isShared && hasReimbursementRequest && (
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-gray-200">
                    <label className="text-sm font-medium text-gray-700">
                      Taux de remboursement
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={customReimbursementRate}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 100;
                          setCustomReimbursementRate(Math.min(100, Math.max(1, value)));
                        }}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  </div>
                )}

                {/* Info message if already shared */}
                {isShared && sharedTransaction && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ✓ Cette transaction est déjà partagée avec votre famille
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recurring Transaction Toggle Section */}
        {isEditing && (
          <div className="mt-6">
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
                      Créer une récurrence basée sur cette transaction
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

            {/* Configuration récurrence */}
            {isRecurring && user && transaction && (
              <div className="mt-4">
                <RecurringConfigSection
                  frequency={recurringConfig.frequency}
                  setFrequency={(f) => setRecurringConfig(prev => ({ ...prev, frequency: f }))}
                  startDate={recurringConfig.startDate}
                  setStartDate={(d) => setRecurringConfig(prev => ({ ...prev, startDate: d }))}
                  endDate={recurringConfig.endDate}
                  setEndDate={(d) => setRecurringConfig(prev => ({ ...prev, endDate: d }))}
                  dayOfMonth={recurringConfig.dayOfMonth}
                  setDayOfMonth={(d) => setRecurringConfig(prev => ({ ...prev, dayOfMonth: d }))}
                  dayOfWeek={recurringConfig.dayOfWeek}
                  setDayOfWeek={(d) => setRecurringConfig(prev => ({ ...prev, dayOfWeek: d }))}
                  notifyBeforeDays={recurringConfig.notifyBeforeDays}
                  setNotifyBeforeDays={(n) => setRecurringConfig(prev => ({ ...prev, notifyBeforeDays: n }))}
                  autoCreate={recurringConfig.autoCreate}
                  setAutoCreate={(a) => setRecurringConfig(prev => ({ ...prev, autoCreate: a }))}
                  linkedBudgetId={recurringConfig.linkedBudgetId}
                  setLinkedBudgetId={(id) => setRecurringConfig(prev => ({ ...prev, linkedBudgetId: id }))}
                  userId={user.id}
                  transactionType={transaction.type || 'expense'}
                  errors={recurringErrors}
                />
              </div>
            )}
          </div>
        )}

        {/* Boutons d'action */}
        {isEditing && (
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="flex-1 btn-secondary flex items-center justify-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Annuler</span>
            </button>
            <button
              onClick={handleSave}
              className="flex-1 btn-primary flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Sauvegarder</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {transaction?.type === 'transfer' ? 'Supprimer le transfert' : 'Supprimer la transaction'}
                  </h3>
                  <p className="text-sm text-gray-600">Cette action est irréversible</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                {transaction?.type === 'transfer' ? (
                  <>
                    Êtes-vous sûr de vouloir supprimer le transfert "{transaction.description}" ?
                    <br /><br />
                    <span className="font-medium text-red-600">
                      ⚠️ Cette action supprimera les deux transactions du transfert (débit et crédit) 
                      et restaurera les soldes des deux comptes concernés.
                    </span>
                  </>
                ) : (
                  <>
                    Êtes-vous sûr de vouloir supprimer la transaction "{transaction.description}" ?
                    Le solde du compte sera mis à jour automatiquement.
                  </>
                )}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 btn-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isDeleting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>
                    {isDeleting 
                      ? (transaction?.type === 'transfer' ? 'Suppression du transfert...' : 'Suppression...') 
                      : (transaction?.type === 'transfer' ? 'Supprimer le transfert' : 'Supprimer')
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionDetailPage;
