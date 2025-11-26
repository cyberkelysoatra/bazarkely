/**
 * StockManager - Interface de gestion du stock interne
 * Affiche l'inventaire, les alertes stock faible, et permet les entrées/sorties/ajustements
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  Edit
} from 'lucide-react';
import { useConstruction } from '../context/ConstructionContext';
import pocStockService from '../services/pocStockService';
import type { InternalStock } from '../services/pocStockService';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

/**
 * Interface pour un item d'inventaire avec statut calculé
 */
interface InventoryItemWithStatus extends InternalStock {
  status: 'ok' | 'faible' | 'critique';
  unitPrice?: number;
  totalValue?: number;
  category?: string;
}

/**
 * Interface pour les statistiques d'inventaire
 */
interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  recentMovements: number;
}

/**
 * Composant principal StockManager
 */
const StockManager: React.FC = () => {
  const { activeCompany } = useConstruction();
  const [inventory, setInventory] = useState<InventoryItemWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    recentMovements: 0
  });

  // États des modales
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<InternalStock | null>(null);

  // États des filtres
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'faible' | 'critique'>('all');

  /**
   * Récupère l'inventaire complet depuis Supabase
   */
  const fetchInventory = async () => {
    if (!activeCompany) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: stockRecords, error: fetchError } = await supabase
        .from('poc_internal_stock')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('item_name');

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Mapper les données avec calcul du statut
      const itemsWithStatus: InventoryItemWithStatus[] = (stockRecords || []).map((item: any) => {
        const quantity = parseFloat(item.quantity.toString());
        const threshold = item.min_threshold ? parseFloat(item.min_threshold.toString()) : null;
        
        let status: 'ok' | 'faible' | 'critique' = 'ok';
        if (threshold !== null) {
          if (quantity < threshold) {
            status = 'critique';
          } else if (quantity < threshold * 2) {
            status = 'faible';
          }
        }

        return {
          ...item,
          status,
          unitPrice: 0, // À récupérer depuis le catalogue si product_id existe
          totalValue: 0,
          category: null
        } as InventoryItemWithStatus;
      });

      setInventory(itemsWithStatus);

      // Calculer les statistiques
      const lowStockCount = itemsWithStatus.filter(item => item.status !== 'ok').length;
      const totalValue = itemsWithStatus.reduce((sum, item) => sum + (item.totalValue || 0), 0);

      // Récupérer le nombre de mouvements récents (30 derniers jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: movementsCount } = await supabase
        .from('poc_stock_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      setStats({
        totalProducts: itemsWithStatus.length,
        totalValue,
        lowStockCount,
        recentMovements: movementsCount || 0
      });
    } catch (err: any) {
      console.error('Erreur récupération inventaire:', err);
      setError(err.message || 'Erreur lors de la récupération de l\'inventaire');
      toast.error('Erreur lors du chargement de l\'inventaire');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [activeCompany]);

  /**
   * Calcule le statut du stock
   */
  const calculateStatus = (quantity: number, threshold: number | null): 'ok' | 'faible' | 'critique' => {
    if (threshold === null) return 'ok';
    if (quantity < threshold) return 'critique';
    if (quantity < threshold * 2) return 'faible';
    return 'ok';
  };

  /**
   * Filtre l'inventaire selon les critères
   */
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      // Filtre par recherche textuelle
      if (searchText && !item.item_name.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }

      // Filtre par statut
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }

      // Filtre par catégorie (si disponible)
      if (filterCategory !== 'all' && item.category !== filterCategory) {
        return false;
      }

      return true;
    });
  }, [inventory, searchText, filterStatus, filterCategory]);

  /**
   * Récupère les items en stock faible
   */
  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.status !== 'ok');
  }, [inventory]);

  /**
   * Gère l'entrée de stock
   */
  const handleStockEntry = async (data: {
    productId: string | null;
    itemName: string;
    quantity: number;
    unit: string;
    location: string;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
  }) => {
    if (!activeCompany) return;

    const result = await pocStockService.addStock(
      activeCompany.id,
      data.productId,
      data.itemName,
      data.quantity,
      data.unit,
      data.location,
      data.referenceType,
      data.referenceId
    );

    if (result.success) {
      toast.success('Entrée de stock enregistrée avec succès');
      await fetchInventory();
      setShowEntryModal(false);
    } else {
      toast.error(result.error || 'Erreur lors de l\'enregistrement');
    }
  };

  /**
   * Gère la sortie de stock
   */
  const handleStockExit = async (data: {
    stockId: string;
    quantity: number;
    referenceType?: string;
    referenceId?: string;
    notes?: string;
  }) => {
    if (!activeCompany) return;

    const result = await pocStockService.removeStock(
      activeCompany.id,
      data.stockId,
      data.quantity,
      data.referenceType,
      data.referenceId
    );

    if (result.success) {
      toast.success('Sortie de stock enregistrée avec succès');
      await fetchInventory();
      setShowExitModal(false);
    } else {
      toast.error(result.error || 'Erreur lors de l\'enregistrement');
    }
  };

  /**
   * Gère l'ajustement de stock
   */
  const handleStockAdjust = async (data: {
    stockId: string;
    newQuantity: number;
    reason: string;
  }) => {
    if (!activeCompany) return;

    const result = await pocStockService.adjustStock(
      activeCompany.id,
      data.stockId,
      data.newQuantity,
      data.reason
    );

    if (result.success) {
      toast.success('Ajustement de stock enregistré avec succès');
      await fetchInventory();
      setShowAdjustModal(false);
    } else {
      toast.error(result.error || 'Erreur lors de l\'ajustement');
    }
  };

  if (!activeCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Veuillez sélectionner une entreprise</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Gestion du Stock</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEntryModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              <ArrowDown className="w-4 h-4" />
              Nouvelle Entrée
            </button>
            <button
              onClick={() => setShowExitModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              <ArrowUp className="w-4 h-4" />
              Nouvelle Sortie
            </button>
            <button
              onClick={fetchInventory}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">
              Alertes Stock Faible ({lowStockItems.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.slice(0, 6).map(item => (
              <div key={item.id} className="p-3 bg-white rounded border border-red-200">
                <p className="font-medium text-gray-900">{item.item_name}</p>
                <p className="text-sm text-gray-600">
                  Stock: {item.quantity} {item.unit}
                  {item.min_threshold && (
                    <span className="ml-2 text-red-600">
                      (Seuil: {item.min_threshold})
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Total Produits</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Valeur Totale</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats.totalValue.toLocaleString('fr-MG')} MGA
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Alertes Stock Faible</p>
          <p className="text-2xl font-bold text-red-600">
            {stats.lowStockCount > 0 ? (
              <span className="flex items-center gap-2">
                {stats.lowStockCount}
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  Alerte
                </span>
              </span>
            ) : (
              stats.lowStockCount
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600 mb-1">Mouvements (30j)</p>
          <p className="text-2xl font-bold text-gray-900">{stats.recentMovements}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">Toutes les catégories</option>
            {/* Catégories dynamiques à implémenter */}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="ok">OK</option>
            <option value="faible">Faible</option>
            <option value="critique">Critique</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      ) : filteredInventory.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Aucun produit en stock</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité Actuelle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seuil Minimum
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      État
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valeur
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dernière Mise à Jour
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInventory.map((item) => (
                    <InventoryRow
                      key={item.id}
                      item={item}
                      onAdjust={() => {
                        setSelectedStock(item);
                        setShowAdjustModal(true);
                      }}
                      onViewMovements={() => {
                        // TODO: Implémenter la vue des mouvements
                        toast.info('Fonctionnalité à venir');
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredInventory.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onAdjust={() => {
                  setSelectedStock(item);
                  setShowAdjustModal(true);
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Modals */}
      <StockEntryModal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        onSave={handleStockEntry}
        companyId={activeCompany.id}
      />

      <StockExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onSave={handleStockExit}
        inventory={inventory}
        companyId={activeCompany.id}
      />

      <AdjustQuantityModal
        isOpen={showAdjustModal}
        onClose={() => {
          setShowAdjustModal(false);
          setSelectedStock(null);
        }}
        stock={selectedStock}
        onSave={handleStockAdjust}
      />
    </div>
  );
};

/**
 * Composant ligne d'inventaire (Desktop)
 */
const InventoryRow: React.FC<{
  item: InventoryItemWithStatus;
  onAdjust: () => void;
  onViewMovements: () => void;
}> = ({ item, onAdjust, onViewMovements }) => {
  const getStatusBadge = () => {
    switch (item.status) {
      case 'ok':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            OK
          </span>
        );
      case 'faible':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Faible
          </span>
        );
      case 'critique':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Critique
          </span>
        );
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Package className="w-5 h-5 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
            {item.location && (
              <div className="text-xs text-gray-500">{item.location}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
          {item.category || '-'}
        </span>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.quantity} {item.unit}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {item.min_threshold ? `${item.min_threshold} ${item.unit}` : '-'}
      </td>
      <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge()}</td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
        {item.totalValue ? `${item.totalValue.toLocaleString('fr-MG')} MGA` : '-'}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
        {item.last_count_date
          ? new Date(item.last_count_date).toLocaleDateString('fr-FR')
          : '-'}
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex gap-2">
          <button
            onClick={onAdjust}
            className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
          >
            <Edit className="w-4 h-4" />
            Ajuster
          </button>
          <button
            onClick={onViewMovements}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            Mouvements
          </button>
        </div>
      </td>
    </tr>
  );
};

/**
 * Composant carte d'inventaire (Mobile)
 */
const InventoryCard: React.FC<{
  item: InventoryItemWithStatus;
  onAdjust: () => void;
}> = ({ item, onAdjust }) => {
  const getStatusBadge = () => {
    switch (item.status) {
      case 'ok':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            OK
          </span>
        );
      case 'faible':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Faible
          </span>
        );
      case 'critique':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Critique
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">{item.item_name}</h3>
            {item.location && (
              <p className="text-xs text-gray-500">{item.location}</p>
            )}
          </div>
        </div>
        {getStatusBadge()}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className="text-gray-600">Quantité:</span>
          <span className="ml-2 font-medium">{item.quantity} {item.unit}</span>
        </div>
        <div>
          <span className="text-gray-600">Seuil:</span>
          <span className="ml-2">
            {item.min_threshold ? `${item.min_threshold} ${item.unit}` : '-'}
          </span>
        </div>
      </div>
      <button
        onClick={onAdjust}
        className="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
      >
        Ajuster la quantité
      </button>
    </div>
  );
};

/**
 * Modal d'entrée de stock
 */
const StockEntryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  companyId: string;
}> = ({ isOpen, onClose, onSave, companyId }) => {
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('unité');
  const [location, setLocation] = useState('');
  const [referenceType, setReferenceType] = useState<'purchase_order' | 'manual'>('manual');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!itemName || !quantity || parseFloat(quantity) <= 0 || !location) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        productId: null,
        itemName,
        quantity: parseFloat(quantity),
        unit,
        location,
        referenceType,
        referenceId: referenceId || undefined,
        notes: notes || undefined
      });
      // Reset form
      setItemName('');
      setQuantity('');
      setUnit('unité');
      setLocation('');
      setReferenceType('manual');
      setReferenceId('');
      setNotes('');
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Entrée de Stock</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du produit *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Ex: Ciment Portland"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantité *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unité *
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="unité"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emplacement *
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Ex: Entrepôt Principal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Référence
            </label>
            <select
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 mb-2"
            >
              <option value="manual">Manuelle</option>
              <option value="purchase_order">Bon de commande</option>
            </select>
            {referenceType === 'purchase_order' && (
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="ID du bon de commande"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Notes optionnelles..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal de sortie de stock
 */
const StockExitModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  inventory: InventoryItemWithStatus[];
  companyId: string;
}> = ({ isOpen, onClose, onSave, inventory, companyId }) => {
  const [stockId, setStockId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [referenceType, setReferenceType] = useState<'project' | 'manual'>('manual');
  const [referenceId, setReferenceId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedStock = inventory.find(item => item.id === stockId);

  const handleSubmit = async () => {
    if (!stockId || !quantity || parseFloat(quantity) <= 0 || !reason) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    if (selectedStock && parseFloat(quantity) > selectedStock.quantity) {
      toast.error('Quantité supérieure au stock disponible');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        stockId,
        quantity: parseFloat(quantity),
        referenceType,
        referenceId: referenceId || undefined,
        notes: reason
      });
      // Reset form
      setStockId('');
      setQuantity('');
      setReferenceType('manual');
      setReferenceId('');
      setReason('');
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Sortie de Stock</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Produit *
            </label>
            <select
              value={stockId}
              onChange={(e) => setStockId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">Sélectionner un produit</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.item_name} ({item.quantity} {item.unit})
                </option>
              ))}
            </select>
          </div>
          {selectedStock && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Stock disponible: {selectedStock.quantity} {selectedStock.unit}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantité *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              min="0"
              step="0.01"
              max={selectedStock?.quantity}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Référence
            </label>
            <select
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-2"
            >
              <option value="manual">Manuelle</option>
              <option value="project">Utilisation Projet</option>
            </select>
            {referenceType === 'project' && (
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="ID du projet"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raison * (requis)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              placeholder="Expliquez la raison de la sortie..."
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal d'ajustement de quantité
 */
const AdjustQuantityModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  stock: InternalStock | null;
}> = ({ isOpen, onClose, onSave, stock }) => {
  const [newQuantity, setNewQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stock) {
      setNewQuantity(stock.quantity.toString());
    }
  }, [stock]);

  const handleSubmit = async () => {
    if (!stock || !newQuantity || parseFloat(newQuantity) < 0 || !reason) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        stockId: stock.id,
        newQuantity: parseFloat(newQuantity),
        reason
      });
      // Reset form
      setNewQuantity('');
      setReason('');
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          Ajuster Quantité - {stock.item_name}
        </h2>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Quantité actuelle</p>
            <p className="text-lg font-semibold text-gray-900">
              {stock.quantity} {stock.unit}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouvelle quantité *
            </label>
            <input
              type="number"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Raison * (requis)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Expliquez la raison de l'ajustement..."
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockManager;
