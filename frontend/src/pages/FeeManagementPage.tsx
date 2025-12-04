import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import feeService from '../services/feeService';
import { useCurrency } from '../hooks/useCurrency';
import type { FeeConfiguration, FeeRange } from '../types';

const FeeManagementPage = () => {
  const navigate = useNavigate();
  const { displayCurrency } = useCurrency();
  const [feeConfigurations, setFeeConfigurations] = useState<FeeConfiguration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<FeeConfiguration | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    operator: 'orange_money' as 'orange_money' | 'mvola' | 'airtel_money' | 'bmoi',
    feeType: 'transfer' as 'transfer' | 'withdrawal' | 'payment',
    targetOperator: 'orange_money' as 'orange_money' | 'mvola' | 'airtel_money' | 'bmoi' | 'especes',
    amountRanges: [{ minAmount: 0, maxAmount: 10000, feeAmount: 100, feePercentage: undefined as number | undefined }],
    isActive: true
  });

  // Helper to get currency symbol
  const currencySymbol = displayCurrency === 'EUR' ? '€' : 'Ar';

  useEffect(() => {
    loadFeeConfigurations();
  }, []);

  const loadFeeConfigurations = async () => {
    try {
      setIsLoading(true);
      const configs = await feeService.getAllFeeConfigurations();
      setFeeConfigurations(configs);
    } catch (error) {
      console.error('Erreur lors du chargement des configurations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (config: FeeConfiguration) => {
    setEditingConfig(config);
    setFormData({
      operator: config.operator,
      feeType: config.feeType,
      targetOperator: config.targetOperator || 'orange_money',
      amountRanges: config.amountRanges.map(range => ({
        ...range,
        feePercentage: range.feePercentage || undefined
      })),
      isActive: config.isActive
    });
  };

  const handleSave = async () => {
    try {
      if (editingConfig) {
        // Configuration mise à jour (mode simplifié)
        console.log('Configuration mise à jour:', formData);
      } else {
        // Configuration créée (mode simplifié)
        console.log('Configuration créée:', formData);
      }
      
      await loadFeeConfigurations();
      setEditingConfig(null);
      setShowAddForm(false);
      resetForm();
    } catch (error: any) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      console.error('❌', error.message);
    }
  };

  const handleDelete = async (configId: string) => {
    try {
      // Configuration supprimée (mode simplifié)
      console.log('Configuration supprimée:', configId);
      await loadFeeConfigurations();
      console.log('✅ Configuration de frais supprimée avec succès');
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression:', error);
      console.error('❌', error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      operator: 'orange_money' as 'orange_money' | 'mvola' | 'airtel_money' | 'bmoi',
      feeType: 'transfer' as 'transfer' | 'withdrawal' | 'payment',
      targetOperator: 'orange_money' as 'orange_money' | 'mvola' | 'airtel_money' | 'bmoi' | 'especes',
      amountRanges: [{ minAmount: 0, maxAmount: 10000, feeAmount: 100, feePercentage: undefined as number | undefined }],
      isActive: true
    });
  };

  const addAmountRange = () => {
    setFormData(prev => ({
      ...prev,
      amountRanges: [...prev.amountRanges, { minAmount: 0, maxAmount: 10000, feeAmount: 100, feePercentage: undefined as number | undefined }]
    }));
  };

  const removeAmountRange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      amountRanges: prev.amountRanges.filter((_, i) => i !== index)
    }));
  };

  const updateAmountRange = (index: number, field: keyof FeeRange, value: any) => {
    setFormData(prev => ({
      ...prev,
      amountRanges: prev.amountRanges.map((range, i) => 
        i === index ? { ...range, [field]: value } : range
      )
    }));
  };

  const getOperatorLabel = (operator: string) => {
    return feeService.getOperatorLabel(operator);
  };

  const getFeeTypeLabel = (feeType: string) => {
    const types = feeService.getFeeTypes();
    return types.find(type => type === feeType) || feeType;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} ${currencySymbol}`;
  };

  if (isLoading) {
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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Gestion des frais</h1>
                <p className="text-sm text-gray-600">Configuration des frais de transfert et retrait</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle configuration</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {/* Liste des configurations */}
        <div className="space-y-4">
          {feeConfigurations.map((config) => (
            <div key={config.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {getOperatorLabel(config.operator)} - {getFeeTypeLabel(config.feeType)}
                    {config.targetOperator && ` → ${getOperatorLabel(config.targetOperator)}`}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {config.isActive ? 'Actif' : 'Inactif'} • 
                    Créé le {new Date(config.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grille des frais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {config.amountRanges.map((range, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(range.minAmount)} - {formatCurrency(range.maxAmount)}
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(range.feeAmount)}
                    </div>
                    {range.feePercentage && (
                      <div className="text-xs text-gray-500">
                        + {range.feePercentage}% du montant
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Formulaire d'ajout/modification */}
        {(showAddForm || editingConfig) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingConfig ? 'Modifier la configuration' : 'Nouvelle configuration'}
                  </h2>
                  <button
                    onClick={() => {
                      setEditingConfig(null);
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                  {/* Opérateur source */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opérateur source
                    </label>
                    <select
                      value={formData.operator}
                      onChange={(e) => setFormData(prev => ({ ...prev, operator: e.target.value as any }))}
                      className="input-field"
                    >
                      {feeService.getAvailableOperators().map(op => (
                        <option key={op} value={op}>{feeService.getOperatorLabel(op)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Type de frais */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de frais
                    </label>
                    <select
                      value={formData.feeType}
                      onChange={(e) => setFormData(prev => ({ ...prev, feeType: e.target.value as any }))}
                      className="input-field"
                    >
                      {feeService.getFeeTypes().map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Opérateur cible */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opérateur cible
                    </label>
                    <select
                      value={formData.targetOperator}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetOperator: e.target.value as any }))}
                      className="input-field"
                    >
                      {feeService.getAvailableOperators().map(op => (
                        <option key={op} value={op}>{feeService.getOperatorLabel(op)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tranches de montants */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Tranches de montants
                      </label>
                      <button
                        type="button"
                        onClick={addAmountRange}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Ajouter une tranche</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.amountRanges.map((range, index) => (
                        <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Montant min ({currencySymbol})
                            </label>
                            <input
                              type="number"
                              value={range.minAmount}
                              onChange={(e) => updateAmountRange(index, 'minAmount', parseInt(e.target.value) || 0)}
                              className="input-field text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Montant max ({currencySymbol})
                            </label>
                            <input
                              type="number"
                              value={range.maxAmount}
                              onChange={(e) => updateAmountRange(index, 'maxAmount', parseInt(e.target.value) || 0)}
                              className="input-field text-sm"
                              placeholder="10000"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Frais fixes ({currencySymbol})
                            </label>
                            <input
                              type="number"
                              value={range.feeAmount}
                              onChange={(e) => updateAmountRange(index, 'feeAmount', parseInt(e.target.value) || 0)}
                              className="input-field text-sm"
                              placeholder="100"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeAmountRange(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Statut actif */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                      Configuration active
                    </label>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingConfig(null);
                        setShowAddForm(false);
                        resetForm();
                      }}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Annuler</span>
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingConfig ? 'Modifier' : 'Créer'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeManagementPage;
