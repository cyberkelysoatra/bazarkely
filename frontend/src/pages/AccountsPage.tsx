import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Wallet, CreditCard, PiggyBank, Smartphone, Eye, EyeOff, ArrowRightLeft } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import accountService from '../services/accountService';
import { ACCOUNT_TYPES } from '../constants';
import type { Account } from '../types';
import { CurrencyDisplay } from '../components/Currency';
import { useCurrency } from '../hooks/useCurrency';

const AccountsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppStore();
  const { displayCurrency } = useCurrency();
  const [showBalances, setShowBalances] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les comptes de l'utilisateur
  useEffect(() => {
    const loadAccounts = async () => {
      if (user) {
        try {
          setIsLoading(true);
          console.log('🔄 Loading accounts from Supabase...');
          const userAccounts = await accountService.getUserAccounts(user.id);
          console.log('📊 Accounts loaded:', userAccounts.length);
          userAccounts.forEach(account => {
            console.log(`💰 ${account.name} (${account.type}): ${account.balance} Ar`);
          });
          setAccounts(userAccounts);
        } catch (error) {
          console.error('Erreur lors du chargement des comptes:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadAccounts();
  }, [user, location.pathname]); // Refresh when returning from other pages

  // Note: For now, we use account.balance directly.
  // In the future, we could calculate balance from transactions using calculateBankAccountBalance()
  // for more accurate multi-currency display, but this requires loading all transactions.

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'especes': return Wallet;
      case 'courant': return CreditCard;
      case 'epargne': return PiggyBank;
      default: return Smartphone;
    }
  };

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);

  if (isLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des comptes...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Mes comptes</h1>
          <p className="text-gray-600">Gérez vos comptes et portefeuilles</p>
        </div>
        <div className="flex space-x-2"> {/* ADDED TRANSFERT BUTTON GROUP */}
          <button 
            onClick={() => navigate('/transfer')}
            className="btn-secondary flex items-center space-x-2 sm:px-3 sm:py-1.5 sm:text-sm"
          > {/* RESPONSIVE MOBILE SIZING */}
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfert</span>
          </button>
          <button 
            onClick={() => navigate('/add-account')}
            className="btn-primary flex items-center space-x-2 sm:px-3 sm:py-1.5 sm:text-sm"
          > {/* RESPONSIVE MOBILE SIZING */}
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Solde total */}
      <div className="card-glass">
        <div className="flex items-center justify-between"> {/* REMOVED MB-4 TO ELIMINATE SPACING */}
          <h3 className="text-lg font-semibold text-gray-900 leading-tight">Solde total</h3> {/* REDUCED LINE-HEIGHT FOR COMPACT TITLE */}
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-3xl font-bold text-primary-600 -mt-2">
          {showBalances ? (
            <CurrencyDisplay
              amount={totalBalance}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="xl"
            />
          ) : (
            <span className="text-gray-400">••••••</span>
          )}
        </p> {/* NEGATIVE 8PX MARGIN FOR ULTRA-CLOSE SPACING */}
      </div>

      {/* Liste des comptes */}
      <div className="space-y-3">
        {accounts.map((account) => {
          const accountType = ACCOUNT_TYPES[account.type] || {
            name: account.type,
            color: 'text-gray-600',
            bgColor: 'bg-gray-50'
          };
          const IconComponent = getAccountIcon(account.type);
          
          return (
            <div 
              key={account.id} 
              className="card hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div 
                onClick={() => navigate(`/transactions?account=${account.id}`)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accountType.bgColor}`}>
                    <IconComponent className={`w-5 h-5 ${accountType.color}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{account.name}</h4>
                    <p className="text-sm text-gray-500">{accountType.name}</p>
                    <p className="text-xs text-blue-600 group-hover:text-blue-700">
                      Cliquer pour voir les transactions
                    </p>
                  </div>
                </div>
                
                {/* NEW RIGHT SECTION STRUCTURE - Clickable container with amount and manage button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🔍 Navigating to account:', account.id, 'Account name:', account.name);
                    navigate(`/account/${account.id}`);
                  }}
                  className="flex flex-col items-end text-right hover:bg-gray-50 p-1 rounded-lg transition-colors" /* REDUCED BUTTON PADDING */
                >
                  <p className="font-semibold text-gray-900">
                    {showBalances ? (
                      // For wallet accounts (especes), we should use WalletBalanceDisplay with transactions
                      // For now, use CurrencyDisplay with account.balance
                      // TODO: Load transactions and use WalletBalanceDisplay for wallet accounts
                      account.type === 'especes' ? (
                        <span>{account.balance.toLocaleString('fr-FR')} Ar</span>
                      ) : (
                        <CurrencyDisplay
                          amount={account.balance}
                          originalCurrency={account.currency || 'MGA'}
                          displayCurrency={displayCurrency}
                          showConversion={true}
                          size="md"
                        />
                      )
                    ) : (
                      <span className="text-gray-400">••••</span>
                    )}
                  </p>
                  {account.isDefault && (
                    <span className="text-xs text-primary-600 font-medium">Par défaut</span>
                  )}
                  {/* SPACING MATCHED TO TEXT-SM LINE-HEIGHT 20PX - Changed from mt-1 to mt-5 to match Actions rapides text-sm line-height */}
                  <span className="text-xs text-gray-600 hover:text-blue-600 transition-colors mt-5">
                    Gérer le compte
                  </span>
                </button>
              </div>
              
              {/* REMOVED BOTTOM SECTION - Completely removed bordered section with separate button */}
            </div>
          );
        })}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => navigate('/add-account')}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Créer un nouveau compte"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Nouveau compte</p>
        </button>

        <button 
          onClick={() => navigate('/transfer')}
          className="card hover:shadow-lg transition-shadow text-center py-4 focus:outline-none focus:ring-2 focus:ring-green-200"
          aria-label="Effectuer un transfert"
        >
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Wallet className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-sm font-medium text-gray-900">Transfert</p>
        </button>
      </div>

      {/* Statistiques */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des fonds</h3>
        <div className="space-y-3">
          {accounts.map((account) => {
            const percentage = (account.balance / totalBalance) * 100;
            
            return (
              <div key={account.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{account.name}</span>
                  <span className="font-medium text-gray-900">
                    {showBalances ? (
                      account.type === 'especes' ? (
                        <span>{account.balance.toLocaleString('fr-FR')} Ar ({percentage.toFixed(1)}%)</span>
                      ) : (
                        <>
                          <CurrencyDisplay
                            amount={account.balance}
                            originalCurrency={account.currency || 'MGA'}
                            displayCurrency={displayCurrency}
                            showConversion={true}
                            size="sm"
                          />
                          <span className="text-gray-500"> ({percentage.toFixed(1)}%)</span>
                        </>
                      )
                    ) : (
                      <span className="text-gray-400">•••• ({percentage.toFixed(1)}%)</span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      account.type === 'orange_money' ? 'bg-orange-600' :
                      account.type === 'mvola' ? 'bg-red-500' :
                      account.type === 'airtel_money' ? 'bg-yellow-500' :
                      account.type === 'especes' ? 'bg-green-500' :
                      account.type === 'courant' ? 'bg-blue-500' :
                      account.type === 'epargne' ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default AccountsPage;
