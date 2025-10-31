import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Plus, Filter, Search, ArrowUpDown, TrendingUp, TrendingDown, ArrowRightLeft, X, Loader2, Download } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import transactionService from '../services/transactionService';
import accountService from '../services/accountService';
import { db } from '../lib/database';
import { TRANSACTION_CATEGORIES } from '../constants';
import type { Transaction, Account, TransactionCategory } from '../types';

const TransactionsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [filterCategory, setFilterCategory] = useState<TransactionCategory | 'all'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filteredAccount, setFilteredAccount] = useState<Account | null>(null);
  const [accountsMap, setAccountsMap] = useState<Map<string, Account>>(new Map());
  
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
          console.log('🔄 Loading transactions from Supabase...');
          const userTransactions = await transactionService.getUserTransactions(user.id);
          console.log('📊 Transactions loaded:', userTransactions.length);
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

  // Charger tous les comptes de l'utilisateur pour l'export CSV
  useEffect(() => {
    const loadAccounts = async () => {
      if (user) {
        try {
          const accounts = await db.accounts.where('userId').equals(user.id).toArray();
          const map = new Map(accounts.map(acc => [acc.id, acc]));
          setAccountsMap(map);
        } catch (error) {
          console.error('Erreur lors du chargement des comptes:', error);
        }
      }
    };
    loadAccounts();
  }, [user]);

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

  const formatCurrency = (amount: number) => {
    return `${Math.abs(amount).toLocaleString('fr-FR')} Ar`;
  };

  // Helper function to sort transactions by date (newest first)
  const sortTransactionsByDateDesc = (transactions: Transaction[]) => {
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || transaction.type === filterType;
    const matchesCategory = filterCategory === 'all' || transaction.category.toLowerCase() === filterCategory.toLowerCase();
    const matchesAccount = !accountId || transaction.accountId === accountId;
    
    // Log de débogage pour les transferts
    if (transaction.type === 'transfer' && accountId) {
      console.log('🔍 Filtrage transfert:', {
        transactionId: transaction.id,
        accountId: transaction.accountId,
        filteredAccountId: accountId,
        amount: transaction.amount,
        description: transaction.description,
        matchesAccount
      });
    }
    
    return matchesSearch && matchesFilter && matchesCategory && matchesAccount;
  });

  // Sort filtered transactions by date (newest first)
  const sortedTransactions = sortTransactionsByDateDesc(filteredTransactions);
  console.log('📅 Transactions sorted (newest first):', sortedTransactions.slice(0, 3).map(t => ({
    id: t.id,
    description: t.description,
    date: t.date,
    amount: t.amount
  })));

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
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <h3 className="text-sm font-medium text-gray-600">Dépenses</h3>
          </div>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="space-y-4">
        <div className="flex space-x-2">
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
          <button 
            onClick={exportToCSV}
            className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exporter en CSV"
            disabled={sortedTransactions.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
          <button className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all' 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'income' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Revenus
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'expense' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Dépenses
          </button>
          <button
            onClick={() => setFilterType('transfer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'transfer' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Transferts
          </button>
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
              onClick={() => {
                console.log('🔍 Navigating to transaction:', transaction.id, 'Transaction type:', transaction.type);
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
                    <h4 className="font-medium text-gray-900">
                      {displayDescription}
                    </h4>
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
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-semibold ${
                    isIncome ? 'text-green-600' :
                    isDebit ? 'text-red-600' :
                    isCredit ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isIncome ? '+' : 
                     isDebit ? '-' : 
                     isCredit ? '+' : '-'}{formatCurrency(displayAmount)}
                  </p>
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
    </div>
  );
};

export default TransactionsPage;
