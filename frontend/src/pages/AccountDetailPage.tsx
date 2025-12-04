import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Star, StarOff, Wallet, CreditCard, PiggyBank, Smartphone } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import accountService from '../services/accountService';
import { ACCOUNT_TYPES } from '../constants';
import { useCurrency } from '../hooks/useCurrency';
import type { Account } from '../types';

const AccountDetailPage = () => {
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { user } = useAppStore();
  const { displayCurrency } = useCurrency();
  const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';
  
  const [account, setAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    type: 'especes' as 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money',
    balance: 0
  });

  // Charger le compte
  useEffect(() => {
    const loadAccount = async () => {
      if (user && accountId) {
        try {
          setIsLoading(true);
          console.log('🔄 Loading account detail from Supabase for ID:', accountId);
          const accountData = await accountService.getAccount(accountId, user.id);
          if (accountData) {
            console.log(`💰 Account loaded: ${accountData.name} (${accountData.type}): ${accountData.balance} ${currencySymbol}`);
            setAccount(accountData);
            setEditData({
              name: accountData.name,
              type: accountData.type,
              balance: accountData.balance
            });
          } else {
            console.error('❌ Account not found:', accountId);
            navigate('/accounts');
          }
        } catch (error) {
          console.error('Erreur lors du chargement du compte:', error);
          navigate('/accounts');
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadAccount();
  }, [user, accountId, navigate]);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'especes': return Wallet;
      case 'courant': return CreditCard;
      case 'epargne': return PiggyBank;
      default: return Smartphone;
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (account) {
      setEditData({
        name: account.name,
        type: account.type,
        balance: account.balance
      });
    }
  };

  const handleSave = async () => {
    if (!user || !account) return;

    try {
      const updatedAccount = await accountService.updateAccount(account.id, user.id, {
        name: editData.name,
        type: editData.type,
        balance: editData.balance
      });
      
      setAccount(updatedAccount);
      setIsEditing(false);
      console.log('✅ Compte mis à jour avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour:', error);
      console.error('❌ Erreur lors de la mise à jour du compte');
    }
  };

  const handleDelete = async () => {
    if (!user || !account) return;

    // Vérifier si le compte peut être supprimé
    if (account.type === 'especes' && account.isDefault) {
      console.error('❌ Ce compte Espèces par défaut ne peut pas être supprimé. Il est protégé par le système.');
      return;
    }

    try {
      setIsDeleting(true);
      await accountService.deleteAccount(account.id, user.id);
      console.log('✅ Compte supprimé avec succès !');
      navigate('/accounts');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      console.error('❌', error instanceof Error ? error.message : 'Erreur lors de la suppression du compte');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetDefault = async () => {
    if (!user || !account) return;

    try {
      await accountService.setDefaultAccount(account.id, user.id);
      setAccount({ ...account, isDefault: true });
      console.log('✅ Compte défini comme par défaut !');
    } catch (error) {
      console.error('❌ Erreur lors de la définition du compte par défaut:', error);
      console.error('❌ Erreur lors de la définition du compte par défaut');
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} ${currencySymbol}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du compte...</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Compte non trouvé</h1>
          <button
            onClick={() => navigate('/accounts')}
            className="btn-primary"
          >
            Retour aux comptes
          </button>
        </div>
      </div>
    );
  }

  const accountType = ACCOUNT_TYPES[account.type];
  const IconComponent = getAccountIcon(account.type);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/accounts')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accountType.bgColor}`}>
                <IconComponent className={`w-5 h-5 ${accountType.color}`} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{account.name}</h1>
                <p className="text-sm text-gray-600">{accountType.name}</p>
              </div>
            </div>

            <div className="flex space-x-2">
              {!isEditing && (
                <>
                  <button
                    onClick={handleEdit}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Modifier le compte"
                  >
                    <Edit className="w-5 h-5 text-gray-600" />
                  </button>
                  {!(account.type === 'especes' && account.isDefault) && (
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Supprimer le compte"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 space-y-6">
        {/* Informations du compte */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du compte</h3>
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du compte
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de compte
                </label>
                <select
                  value={editData.type}
                  onChange={(e) => setEditData({ ...editData, type: e.target.value as 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {Object.entries(ACCOUNT_TYPES).map(([key, type]) => (
                    <option key={key} value={key}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solde initial
                </label>
                <input
                  type="number"
                  value={editData.balance}
                  onChange={(e) => setEditData({ ...editData, balance: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  className="btn-primary flex-1"
                >
                  Enregistrer
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Nom:</span>
                <span className="font-medium">{account.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">{accountType.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Solde actuel:</span>
                <span className="font-semibold text-lg">{formatCurrency(account.balance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Devise:</span>
                <span className="font-medium">{account.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Créé le:</span>
                <span className="font-medium">{new Date(account.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="space-y-3">
            {!account.isDefault && (
              <button
                onClick={handleSetDefault}
                className="w-full btn-secondary flex items-center justify-center space-x-2"
              >
                <Star className="w-5 h-5" />
                <span>Définir comme compte par défaut</span>
              </button>
            )}

            {account.isDefault && (
              <div className="w-full btn-success flex items-center justify-center space-x-2">
                <StarOff className="w-5 h-5" />
                <span>Compte par défaut</span>
              </div>
            )}

            <button
              onClick={() => navigate('/transfer')}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <Wallet className="w-5 h-5" />
              <span>Effectuer un transfert</span>
            </button>
          </div>
        )}

        {/* Statistiques */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistiques</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Solde actuel:</span>
              <span className="font-semibold text-lg">{formatCurrency(account.balance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Statut:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                account.isDefault 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {account.isDefault ? 'Par défaut' : 'Normal'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailPage;
