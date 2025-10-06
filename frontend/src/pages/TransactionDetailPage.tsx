import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Save, X, TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import transactionService from '../services/transactionService';
import accountService from '../services/accountService';
import { TRANSACTION_CATEGORIES } from '../constants';
import type { Transaction, Account } from '../types';

const TransactionDetailPage = () => {
  const navigate = useNavigate();
  const { transactionId } = useParams<{ transactionId: string }>();
  const { user } = useAppStore();
  
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
  
  const [editData, setEditData] = useState({
    description: '',
    amount: '',
    category: 'autres' as keyof typeof TRANSACTION_CATEGORIES,
    date: '',
    notes: '',
    accountId: ''
  });

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!transaction || !user) return;
    
    try {
      const updatedTransactionData = {
        description: editData.description,
        amount: transaction.type === 'income' ? parseFloat(editData.amount) : -parseFloat(editData.amount),
        category: editData.category,
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
      
      console.log('✅ Transaction mise à jour avec succès !');
      
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
      
      // 1. Supprimer de Supabase d'abord
      const deleteSuccess = await transactionService.deleteTransaction(transaction.id);
      if (!deleteSuccess) {
        throw new Error('Échec de la suppression dans Supabase');
      }
      console.log('✅ Transaction supprimée de Supabase');
      
      // 2. Restaurer le solde du compte
      await transactionService.updateAccountBalancePublic(transaction.accountId, -transaction.amount);
      console.log('✅ Solde du compte restauré');
      
      // 3. Supprimer de l'IndexedDB local
      await db.transactions.delete(transaction.id);
      console.log('✅ Transaction supprimée de l\'IndexedDB local');
      
      console.log('✅ Transaction supprimée avec succès !');
      navigate('/transactions');
      
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      console.error('❌ Erreur lors de la suppression de la transaction');
      // Ne pas naviguer si la suppression a échoué
    } finally {
      setIsDeleting(false);
    }
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
    } else {
      navigate('/transactions');
    }
  };

  const formatCurrency = (amount: number) => {
    return `${Math.abs(amount).toLocaleString('fr-FR')} Ar`;
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
    <div className="min-h-screen bg-gray-50 pb-20">
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
                  <button
                    onClick={handleEdit}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
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

      <div className="max-w-md mx-auto p-4">
        {/* Informations de la transaction */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTransactionBgColor(transaction.type, transaction.amount)}`}>
              {getTransactionIcon(transaction.type, transaction.amount)}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Montant</label>
              {isEditing ? (
                <div className="relative">
                  <input
                    type="number"
                    value={editData.amount}
                    onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                    Ar
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
              {isEditing ? (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              {isEditing ? (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Compte</label>
              {isEditing ? (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              {isEditing ? (
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
                  <h3 className="text-lg font-semibold text-gray-900">Supprimer la transaction</h3>
                  <p className="text-sm text-gray-600">Cette action est irréversible</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Êtes-vous sûr de vouloir supprimer la transaction "{transaction.description}" ?
                Le solde du compte sera mis à jour automatiquement.
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
                  <span>{isDeleting ? 'Suppression...' : 'Supprimer'}</span>
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
