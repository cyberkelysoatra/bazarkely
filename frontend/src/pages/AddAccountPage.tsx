import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Wallet, CreditCard, PiggyBank, Smartphone } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import accountService from '../services/accountService';
import { ACCOUNT_TYPES } from '../constants';

const AddAccountPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'especes' as 'especes' | 'courant' | 'epargne' | 'orange_money' | 'mvola' | 'airtel_money',
    balance: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'balance' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      console.error('❌ Nom du compte requis');
      return;
    }

    if (formData.balance < 0) {
      console.error('❌ Le solde ne peut pas être négatif');
      return;
    }

    setIsLoading(true);

    try {
      await accountService.createAccount(user.id, {
        name: formData.name.trim(),
        type: formData.type,
        balance: formData.balance,
        isDefault: false, // Les nouveaux comptes ne sont pas par défaut
        currency: 'MGA' as const
      });

      if (formData.type === 'especes') {
        console.log('✅ Solde du compte Espèces mis à jour avec succès !');
      } else {
        console.log('✅ Compte créé avec succès !');
      }
      navigate('/accounts');
      
    } catch (error) {
      console.error('❌ Erreur lors de la création du compte:', error);
      console.error('❌', error instanceof Error ? error.message : 'Erreur lors de la création du compte');
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'especes': return Wallet;
      case 'courant': return CreditCard;
      case 'epargne': return PiggyBank;
      case 'orange_money':
      case 'mvola':
      case 'airtel_money': return Smartphone;
      default: return Wallet;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/accounts')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Retour aux comptes"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            
            <h1 className="text-lg font-semibold text-gray-900">Nouveau compte</h1>
            
            <div className="w-9" /> {/* Spacer pour centrer le titre */}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-md mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type de compte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de compte
            </label>
            {formData.type === 'especes' && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Compte Espèces :</strong> Si un compte Espèces existe déjà, le solde sera ajouté au compte existant.
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(ACCOUNT_TYPES).map(([key, accountType]) => {
                const IconComponent = getAccountIcon(key);
                const isSelected = formData.type === key;
                
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: key as any }))}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <IconComponent className={`w-4 h-4 ${
                          isSelected ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <span className={`text-xs font-medium ${
                        isSelected ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {accountType.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nom du compte */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom du compte
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ex: Mon portefeuille principal"
              className="input-field"
              required
            />
          </div>

          {/* Solde initial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Solde initial (MGA)
            </label>
            <input
              type="number"
              name="balance"
              value={formData.balance}
              onChange={handleInputChange}
              placeholder="0"
              min="0"
              step="1"
              className="input-field"
            />
            <p className="text-xs text-gray-500 mt-1">
              Laissez 0 si vous commencez avec un solde vide
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/accounts')}
              className="flex-1 btn-secondary flex items-center justify-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Annuler</span>
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isLoading ? 'Création...' : 'Créer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountPage;
