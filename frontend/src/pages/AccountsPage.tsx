import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wallet, CreditCard, PiggyBank, Smartphone, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import accountService from '../services/accountService';
import { ACCOUNT_TYPES } from '../constants';
import type { Account } from '../types';

const AccountsPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [showBalances, setShowBalances] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les comptes de l'utilisateur
  useEffect(() => {
    const loadAccounts = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const userAccounts = await accountService.getUserAccounts(user.id);
          setAccounts(userAccounts);
        } catch (error) {
          console.error('Erreur lors du chargement des comptes:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadAccounts();
  }, [user]);

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} Ar`;
  };

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
        <button 
          onClick={() => navigate('/add-account')}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter</span>
        </button>
      </div>

      {/* Solde total */}
      <div className="card-glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Solde total</h3>
          <button
            onClick={() => setShowBalances(!showBalances)}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {showBalances ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-3xl font-bold text-primary-600">
          {showBalances ? formatCurrency(totalBalance) : '•••••• Ar'}
        </p>
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
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {showBalances ? formatCurrency(account.balance) : '•••• Ar'}
                  </p>
                  {account.isDefault && (
                    <span className="text-xs text-primary-600 font-medium">Par défaut</span>
                  )}
                </div>
              </div>
              
              {/* Bouton de détail du compte */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/account/${account.id}`);
                  }}
                  className="w-full text-center text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  Gérer le compte
                </button>
              </div>
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
                    {showBalances ? formatCurrency(account.balance) : '•••• Ar'} ({percentage.toFixed(1)}%)
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
