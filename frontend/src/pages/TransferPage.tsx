import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRightLeft, Save, X, Settings } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import transactionService from '../services/transactionService';
import feeService from '../services/feeService';
import { db } from '../lib/database';
import type { Account, CalculatedFees } from '../types';

const TransferPage = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    fromAccountId: '',
    toAccountId: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [calculatedFees, setCalculatedFees] = useState<CalculatedFees | null>(null);
  const [includeWithdrawal, setIncludeWithdrawal] = useState(false);
  const [showFeeSettings, setShowFeeSettings] = useState(false);

  // Charger les comptes de l'utilisateur
  useEffect(() => {
    const loadAccounts = async () => {
      if (user) {
        try {
          const userAccounts = await db.accounts
            .where('userId')
            .equals(user.id)
            .toArray();
          setAccounts(userAccounts);
        } catch (error) {
          console.error('Erreur lors du chargement des comptes:', error);
        }
      }
    };
    loadAccounts();
  }, [user]);

  // Calculer les frais de transfert
  useEffect(() => {
    const calculateFees = async () => {
      if (formData.amount && formData.fromAccountId && formData.toAccountId) {
        const amount = parseFloat(formData.amount);
        if (!isNaN(amount) && amount > 0) {
          const fromAccount = accounts.find(acc => acc.id === formData.fromAccountId);
          const toAccount = accounts.find(acc => acc.id === formData.toAccountId);
          
          if (fromAccount && toAccount) {
            try {
              const fees = await feeService.calculateFees(
                fromAccount.type,
                toAccount.type,
                amount,
                includeWithdrawal && toAccount.type === 'especes'
              );
              setCalculatedFees(fees);
            } catch (error) {
              console.error('Erreur lors du calcul des frais:', error);
              setCalculatedFees({
                transferFee: 0,
                withdrawalFee: 0,
                totalFees: 0,
                breakdown: {
                  transferFee: 0,
                  withdrawalFee: 0,
                  totalFees: 0
                }
              });
            }
          }
        }
      } else {
        setCalculatedFees(null);
      }
    };

    calculateFees();
  }, [formData.amount, formData.fromAccountId, formData.toAccountId, includeWithdrawal, accounts]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    // Validation
    if (!formData.amount || !formData.description || !formData.fromAccountId || !formData.toAccountId) {
      console.error('❌ Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.fromAccountId === formData.toAccountId) {
      console.error('❌ Le compte source et le compte de destination doivent être différents');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Le montant doit être un nombre positif');
      return;
    }

    // Vérifier le solde du compte source
    const fromAccount = accounts.find(acc => acc.id === formData.fromAccountId);
    const totalAmount = amount + (calculatedFees?.totalFees || 0);
    if (fromAccount && fromAccount.balance < totalAmount) {
      console.error(`❌ Solde insuffisant. Solde disponible: ${fromAccount.balance.toLocaleString('fr-FR')} MGA`);
      return;
    }

    setIsLoading(true);

    try {
      // Créer le transfert avec la méthode dédiée
      await transactionService.createTransfer(user.id, {
        amount: amount,
        description: formData.description,
        fromAccountId: formData.fromAccountId,
        toAccountId: formData.toAccountId,
        notes: formData.notes
      });

      // Si il y a des frais, créer des transactions de frais
      if (calculatedFees && calculatedFees.totalFees > 0) {
        // Frais de transfert
        if (calculatedFees.transferFee > 0) {
          await transactionService.createTransaction(user.id, {
            type: 'expense',
            amount: -calculatedFees.transferFee,
            description: 'Frais de transfert',
            category: 'autres',
            accountId: formData.fromAccountId,
            date: new Date(formData.date),
            notes: 'Frais de transfert'
          });
        }

        // Frais de retrait
        if (calculatedFees.withdrawalFee > 0) {
          await transactionService.createTransaction(user.id, {
            type: 'expense',
            amount: -calculatedFees.withdrawalFee,
            description: 'Frais de retrait',
            category: 'autres',
            accountId: formData.fromAccountId,
            date: new Date(formData.date),
            notes: 'Frais de retrait'
          });
        }
      }

      // Succès
      console.log('✅ Transfert effectué avec succès !');
      navigate('/transactions');
      
    } catch (error) {
      console.error('❌ Erreur lors du transfert:', error);
      console.error('❌ Erreur lors du transfert. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/transactions');
  };

  const fromAccount = accounts.find(acc => acc.id === formData.fromAccountId);
  const toAccount = accounts.find(acc => acc.id === formData.toAccountId);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Transfert entre comptes</h1>
                <p className="text-sm text-gray-600">Transférez de l'argent entre vos comptes</p>
              </div>
            </div>

            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Montant */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant à transférer *
            </label>
            <div className="relative">
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold"
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                Ar
              </div>
            </div>
          </div>

          {/* Compte source */}
          <div>
            <label htmlFor="fromAccountId" className="block text-sm font-medium text-gray-700 mb-2">
              Compte source *
            </label>
            <select
              id="fromAccountId"
              name="fromAccountId"
              value={formData.fromAccountId}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner le compte source</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.balance.toLocaleString('fr-FR')} MGA
                </option>
              ))}
            </select>
          </div>

          {/* Compte de destination */}
          <div>
            <label htmlFor="toAccountId" className="block text-sm font-medium text-gray-700 mb-2">
              Compte de destination *
            </label>
            <select
              id="toAccountId"
              name="toAccountId"
              value={formData.toAccountId}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner le compte de destination</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.balance.toLocaleString('fr-FR')} MGA
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Ex: Transfert vers Orange Money"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Options de frais */}
          {formData.fromAccountId && formData.toAccountId && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Options de frais</h3>
              
              {/* Inclure les frais de retrait */}
              {accounts.find(acc => acc.id === formData.toAccountId)?.type === 'especes' && (
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="includeWithdrawal"
                    checked={includeWithdrawal}
                    onChange={(e) => setIncludeWithdrawal(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeWithdrawal" className="ml-2 block text-sm text-gray-900">
                    Inclure les frais de retrait en espèces
                  </label>
                </div>
              )}

              {/* Bouton de gestion des frais */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Les frais sont calculés automatiquement selon les configurations
                </span>
                <button
                  type="button"
                  onClick={() => setShowFeeSettings(true)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Settings className="w-4 h-4" />
                  <span>Gérer les frais</span>
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optionnel)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Ajoutez des détails supplémentaires..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Résumé du transfert */}
          {formData.amount && formData.fromAccountId && formData.toAccountId && calculatedFees && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-3">Résumé du transfert</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant à transférer:</span>
                  <span className="font-medium">{parseFloat(formData.amount || '0').toLocaleString('fr-FR')} MGA</span>
                </div>
                
                {/* Frais de transfert */}
                {calculatedFees.transferFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frais de transfert:</span>
                    <span className="font-medium text-red-600">-{calculatedFees.transferFee.toLocaleString('fr-FR')} MGA</span>
                  </div>
                )}

                {/* Frais de retrait */}
                {calculatedFees.withdrawalFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Frais de retrait:</span>
                    <span className="font-medium text-red-600">-{calculatedFees.withdrawalFee.toLocaleString('fr-FR')} MGA</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-blue-200 pt-2">
                  <span className="text-gray-600">Total débité du compte source:</span>
                  <span className="font-semibold text-blue-900">{(parseFloat(formData.amount || '0') + calculatedFees.totalFees).toLocaleString('fr-FR')} MGA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">De:</span>
                  <span className="font-medium">{fromAccount?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vers:</span>
                  <span className="font-medium">{toAccount?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant reçu:</span>
                  <span className="font-medium text-green-600">{parseFloat(formData.amount || '0').toLocaleString('fr-FR')} MGA</span>
                </div>
              </div>
              
              {/* Information sur les frais */}
              {calculatedFees.totalFees > 0 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  💡 Les frais sont calculés selon les configurations système. 
                  {includeWithdrawal && ' Frais de retrait inclus.'}
                </div>
              )}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex space-x-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.amount || !formData.fromAccountId || !formData.toAccountId}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              <span>{isLoading ? 'Transfert en cours...' : 'Effectuer le transfert'}</span>
            </button>
          </div>
        </form>

        {/* Modal de gestion des frais */}
        {showFeeSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Gestion des frais</h2>
                  <button
                    onClick={() => setShowFeeSettings(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Configuration actuelle</h3>
                    <p className="text-sm text-blue-800">
                      Les frais sont calculés automatiquement selon les configurations système.
                      Seuls les administrateurs peuvent modifier ces paramètres.
                    </p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Frais calculés pour ce transfert</h3>
                    {calculatedFees ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frais de transfert:</span>
                          <span className="font-medium">{calculatedFees.transferFee.toLocaleString('fr-FR')} MGA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Frais de retrait:</span>
                          <span className="font-medium">{calculatedFees.withdrawalFee.toLocaleString('fr-FR')} MGA</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2">
                          <span className="text-gray-600 font-medium">Total des frais:</span>
                          <span className="font-bold text-red-600">{calculatedFees.totalFees.toLocaleString('fr-FR')} MGA</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Aucun frais calculé</p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowFeeSettings(false)}
                      className="btn-secondary"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => navigate('/fee-management')}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Gérer les configurations</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransferPage;
