import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Wallet, CreditCard, PiggyBank, Smartphone, Eye, EyeOff, ArrowRightLeft, GripVertical } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import accountService from '../services/accountService';
import { ACCOUNT_TYPES } from '../constants';
import { CurrencyDisplay } from '../components/Currency';
import type { Currency } from '../components/Currency';
import type { Account } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
// import { toast } from 'react-hot-toast';

const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

// SortableAccountCard component for drag-and-drop
interface SortableAccountCardProps {
  account: Account;
  accountType: {
    name: string;
    color: string;
    bgColor: string;
  };
  IconComponent: React.ComponentType<{ className?: string }>;
  showBalances: boolean;
  displayCurrency: Currency;
  onNavigate: (path: string) => void;
}

const SortableAccountCard = ({
  account,
  accountType,
  IconComponent,
  showBalances,
  displayCurrency,
  onNavigate,
}: SortableAccountCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card hover:shadow-lg transition-shadow cursor-pointer group ${
        isDragging ? 'shadow-lg bg-gray-50' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>

        {/* Card Content - Clickable for navigation */}
        <div
          className="flex-1 flex items-center justify-between"
          onClick={() => onNavigate(`/transactions?account=${account.id}`)}
        >
          {/* Left side: Icon + Name */}
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

          {/* Right Section - Amount and manage button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔍 Navigating to account:', account.id, 'Account name:', account.name);
              onNavigate(`/account/${account.id}`);
            }}
            className="flex flex-col items-end text-right hover:bg-gray-50 p-1 rounded-lg transition-colors"
          >
            <p className="font-semibold text-gray-900">
              {showBalances ? (
                <CurrencyDisplay
                  amount={account.balance}
                  originalCurrency={account.currency || 'MGA'}
                  displayCurrency={displayCurrency}
                  size="md"
                  showConversion={true}
                />
              ) : (
                <span>•••• {displayCurrency === 'MGA' ? 'Ar' : '€'}</span>
              )}
            </p>
            {account.isDefault && (
              <span className="text-xs text-primary-600 font-medium">Par défaut</span>
            )}
            <span className="text-xs text-gray-600 hover:text-blue-600 transition-colors mt-5">
              Gérer le compte
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

const AccountsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppStore();
  const [showBalances, setShowBalances] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return (saved === 'EUR' || saved === 'MGA') ? saved : 'MGA';
  });

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

  // Écouter les changements de devise depuis Settings
  useEffect(() => {
    const handleCurrencyChange = (event: CustomEvent<{ currency: Currency }>) => {
      setDisplayCurrency(event.detail.currency);
    };
    window.addEventListener('currencyChanged', handleCurrencyChange as EventListener);
    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange as EventListener);
    };
  }, []);

  // Drag-and-drop sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 10 },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });

  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  // Handle drag end - reorder accounts
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = accounts.findIndex((acc) => acc.id === active.id);
      const newIndex = accounts.findIndex((acc) => acc.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newAccounts = arrayMove(accounts, oldIndex, newIndex);
        setAccounts(newAccounts);

        // Persist to database
        if (user) {
          try {
            const orderedIds = newAccounts.map(acc => acc.id);
            await accountService.updateAccountsOrder(user.id, orderedIds);
          } catch (error) {
            console.error('Failed to save account order:', error);
            // Revert on error
            setAccounts(accounts);
          }
        }
      }
    }
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
    <div className="p-4 pb-20 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes comptes</h1>
          <p className="text-gray-600">Gérez vos comptes et portefeuilles</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => navigate('/transfer')}
            className="btn-secondary flex items-center space-x-2 sm:px-3 sm:py-1.5 sm:text-sm"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfert</span>
          </button>
          <button 
            onClick={() => navigate('/add-account')}
            className="btn-primary flex items-center space-x-2 sm:px-3 sm:py-1.5 sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Solde total */}
      <div className="card-glass">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 leading-tight">Solde total</h3>
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
              size="xl"
              showConversion={true}
            />
          ) : (
            <span>•••••• {displayCurrency === 'MGA' ? 'Ar' : '€'}</span>
          )}
        </p>
      </div>

      {/* Liste des comptes avec drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        autoScroll={false}
      >
        <SortableContext
          items={accounts.map(acc => acc.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {accounts.map((account) => {
              const accountType = ACCOUNT_TYPES[account.type] || {
                name: account.type,
                color: 'text-gray-600',
                bgColor: 'bg-gray-50',
              };
              const IconComponent = getAccountIcon(account.type);

              return (
                <SortableAccountCard
                  key={account.id}
                  account={account}
                  accountType={accountType}
                  IconComponent={IconComponent}
                  showBalances={showBalances}
                  displayCurrency={displayCurrency}
                  onNavigate={navigate}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

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
            const percentage = totalBalance > 0 ? (account.balance / totalBalance) * 100 : 0;
            
            return (
              <div key={account.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{account.name}</span>
                  <span className="font-medium text-gray-900">
                    {showBalances ? (
                      <>
                        <CurrencyDisplay
                          amount={account.balance}
                          originalCurrency={account.currency || 'MGA'}
                          displayCurrency={displayCurrency}
                          size="sm"
                          showConversion={true}
                        />
                        {' '}({percentage.toFixed(1)}%)
                      </>
                    ) : (
                      <span>•••• {displayCurrency === 'MGA' ? 'Ar' : '€'} ({percentage.toFixed(1)}%)</span>
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
                    style={{ width: `${Math.min(percentage, 100)}%` }}
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
