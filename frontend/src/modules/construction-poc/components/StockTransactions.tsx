/**
 * Composant d'historique des mouvements de stock
 * Affiche l'historique complet des transactions de stock avec filtres et export
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  RefreshCw, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Edit, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  X
} from 'lucide-react';
import { useConstruction } from '../context/ConstructionContext';
import pocStockService, { type StockTransaction, type StockFilter } from '../services/pocStockService';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';

/**
 * Interface pour les filtres de transaction
 */
interface TransactionFilters {
  type: 'all' | 'entry' | 'exit' | 'adjustment';
  productId: string;
  referenceType: 'all' | 'purchase_order' | 'manual' | 'adjustment';
  dateFrom: string;
  dateTo: string;
}

/**
 * Interface pour les statistiques de période
 */
interface PeriodStats {
  totalEntries: number;
  totalExits: number;
  totalAdjustments: number;
  netChangeValue: number;
}

/**
 * Interface pour les détails d'une transaction enrichie
 */
interface EnrichedTransaction extends StockTransaction {
  productName?: string;
  userName?: string;
}

/**
 * Composant principal
 */
const StockTransactions: React.FC = () => {
  const { activeCompany } = useConstruction();
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<EnrichedTransaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);

  // Filtres
  const [filters, setFilters] = useState<TransactionFilters>({
    type: 'all',
    productId: '',
    referenceType: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // Charger les transactions
  useEffect(() => {
    if (activeCompany?.id) {
      loadTransactions();
    }
  }, [activeCompany?.id, filters]);

  /**
   * Charge les transactions depuis le service
   */
  const loadTransactions = async () => {
    if (!activeCompany?.id) return;

    setLoading(true);
    try {
      // Construire les filtres pour le service
      const serviceFilters: StockFilter = {
        transactionType: filters.type !== 'all' ? filters.type : undefined,
        productId: filters.productId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined
      };

      const result = await pocStockService.getStockHistory(activeCompany.id, serviceFilters);

      if (result.success && result.data) {
        // Enrichir les transactions avec les noms de produits
        const enriched = await enrichTransactions(result.data);
        
        // Filtrer par référence si nécessaire
        let filtered = enriched;
        if (filters.referenceType !== 'all') {
          filtered = enriched.filter(t => t.reference_type === filters.referenceType);
        }

        setTransactions(filtered);
      } else {
        toast.error(result.error || 'Erreur lors du chargement des transactions');
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('Erreur chargement transactions:', error);
      toast.error('Erreur lors du chargement des transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enrichit les transactions avec les noms de produits
   */
  const enrichTransactions = async (transactions: StockTransaction[]): Promise<EnrichedTransaction[]> => {
    const enriched: EnrichedTransaction[] = [];

    for (const transaction of transactions) {
      const enrichedTx: EnrichedTransaction = { ...transaction };

      // Récupérer le nom du produit depuis poc_internal_stock
      if (transaction.internal_stock_id) {
        try {
          const { data: stock } = await supabase
            .from('poc_internal_stock')
            .select('item_name')
            .eq('id', transaction.internal_stock_id)
            .single();

          if (stock) {
            enrichedTx.productName = stock.item_name;
          }
        } catch (error) {
          console.warn('Erreur récupération nom produit:', error);
        }
      }

      // Pour le POC, on affiche juste l'ID utilisateur (peut être amélioré plus tard)
      enrichedTx.userName = transaction.created_by.substring(0, 8) + '...';

      enriched.push(enrichedTx);
    }

    return enriched;
  };

  /**
   * Calcule les statistiques de la période
   */
  const periodStats = useMemo<PeriodStats>(() => {
    const stats: PeriodStats = {
      totalEntries: 0,
      totalExits: 0,
      totalAdjustments: 0,
      netChangeValue: 0
    };

    transactions.forEach(tx => {
      if (tx.transaction_type === 'entry') {
        stats.totalEntries++;
        // Pour le POC, on estime la valeur (peut être amélioré avec prix unitaire)
        stats.netChangeValue += tx.quantity * 1000; // Estimation
      } else if (tx.transaction_type === 'exit') {
        stats.totalExits++;
        stats.netChangeValue -= tx.quantity * 1000; // Estimation
      } else if (tx.transaction_type === 'adjustment') {
        stats.totalAdjustments++;
      }
    });

    return stats;
  }, [transactions]);

  /**
   * Exporte les transactions visibles en CSV
   */
  const exportToCSV = () => {
    const visibleTransactions = paginatedTransactions;

    const headers = [
      'Date & Heure',
      'Type',
      'Produit',
      'Quantité',
      'Unité',
      'Référence',
      'Utilisateur',
      'Notes'
    ];

    const rows = visibleTransactions.map(tx => [
      formatDateTime(tx.created_at),
      getTransactionTypeLabel(tx.transaction_type),
      tx.productName || 'N/A',
      tx.transaction_type === 'exit' ? `-${tx.quantity}` : `+${tx.quantity}`,
      tx.unit,
      getReferenceLabel(tx),
      tx.userName || tx.created_by,
      tx.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions-stock-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export CSV généré');
  };

  /**
   * Formate une date pour l'affichage
   */
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  /**
   * Obtient le label du type de transaction
   */
  const getTransactionTypeLabel = (type: string): string => {
    switch (type) {
      case 'entry': return 'Entrée';
      case 'exit': return 'Sortie';
      case 'adjustment': return 'Ajustement';
      case 'transfer': return 'Transfert';
      default: return type;
    }
  };

  /**
   * Obtient le label de référence
   */
  const getReferenceLabel = (tx: StockTransaction): string => {
    if (!tx.reference_type || !tx.reference_id) return 'Manuel';
    
    const refType = tx.reference_type === 'purchase_order' ? 'Bon de Commande' : 
                   tx.reference_type === 'adjustment' ? 'Ajustement' : 'Manuel';
    
    return `${refType} ${tx.reference_id.substring(0, 8)}...`;
  };

  /**
   * Transactions paginées
   */
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return transactions.slice(start, end);
  }, [transactions, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  /**
   * Réinitialise les filtres
   */
  const clearFilters = () => {
    setFilters({
      type: 'all',
      productId: '',
      referenceType: 'all',
      dateFrom: '',
      dateTo: ''
    });
  };

  if (!activeCompany) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Veuillez sélectionner une entreprise</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Historique Mouvements Stock</h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <span className="self-center text-gray-600">à</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              <Download className="w-4 h-4" />
              Exporter CSV
            </button>
            
            <button
              onClick={loadTransactions}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Entrées</p>
                <p className="text-2xl font-bold text-gray-900">{periodStats.totalEntries}</p>
              </div>
              <ArrowDownCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sorties</p>
                <p className="text-2xl font-bold text-gray-900">{periodStats.totalExits}</p>
              </div>
              <ArrowUpCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Ajustements</p>
                <p className="text-2xl font-bold text-gray-900">{periodStats.totalAdjustments}</p>
              </div>
              <Edit className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valeur Nette</p>
                <p className="text-2xl font-bold text-gray-900">
                  {periodStats.netChangeValue.toLocaleString('fr-MG')} MGA
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de mouvement</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Tous</option>
                <option value="entry">Entrées</option>
                <option value="exit">Sorties</option>
                <option value="adjustment">Ajustements</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
              <input
                type="text"
                value={filters.productId}
                onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                placeholder="ID produit (optionnel)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de référence</label>
              <select
                value={filters.referenceType}
                onChange={(e) => setFilters({ ...filters, referenceType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Tous</option>
                <option value="purchase_order">Bon de Commande</option>
                <option value="manual">Manuel</option>
                <option value="adjustment">Ajustement</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        {loading ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">Chargement des transactions...</p>
          </div>
        ) : paginatedTransactions.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600">
              {transactions.length === 0 
                ? 'Aucun mouvement enregistré' 
                : 'Aucun résultat pour vos filtres'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Heure</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantité</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilisateur</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{formatDateTime(tx.created_at)}</td>
                        <td className="px-4 py-3">
                          <TransactionTypeBadge type={tx.transaction_type} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{tx.productName || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={tx.transaction_type === 'exit' ? 'text-red-600' : 'text-green-600'}>
                            {tx.transaction_type === 'exit' ? '-' : '+'}{tx.quantity} {tx.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{getReferenceLabel(tx)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{tx.userName || tx.created_by.substring(0, 8)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={tx.notes || ''}>
                          {tx.notes || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedTransaction(tx)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {paginatedTransactions.map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex items-start justify-between mb-2">
                    <TransactionTypeBadge type={tx.transaction_type} />
                    <span className="text-xs text-gray-500">{formatDateTime(tx.created_at)}</span>
                  </div>
                  <p className="font-medium text-gray-900 mb-1">{tx.productName || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mb-2">
                    <span className={tx.transaction_type === 'exit' ? 'text-red-600' : 'text-green-600'}>
                      {tx.transaction_type === 'exit' ? '-' : '+'}{tx.quantity} {tx.unit}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 mb-1">Référence: {getReferenceLabel(tx)}</p>
                  <p className="text-xs text-gray-500 mb-2">Utilisateur: {tx.userName || tx.created_by.substring(0, 8)}</p>
                  {tx.notes && (
                    <p className="text-xs text-gray-600 mb-2">{tx.notes}</p>
                  )}
                  <button
                    onClick={() => setSelectedTransaction(tx)}
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    Voir détails
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Transaction Detail Modal */}
        {selectedTransaction && (
          <TransactionDetailModal
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
          />
        )}
      </div>
    </div>
  );
};

/**
 * Badge de type de transaction
 */
const TransactionTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const config = {
    entry: { label: 'Entrée', icon: ArrowDownCircle, color: 'bg-green-100 text-green-800' },
    exit: { label: 'Sortie', icon: ArrowUpCircle, color: 'bg-red-100 text-red-800' },
    adjustment: { label: 'Ajustement', icon: Edit, color: 'bg-blue-100 text-blue-800' },
    transfer: { label: 'Transfert', icon: ArrowDownCircle, color: 'bg-purple-100 text-purple-800' }
  };

  const cfg = config[type as keyof typeof config] || { label: type, icon: Edit, color: 'bg-gray-100 text-gray-800' };
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
};

/**
 * Modal de détails de transaction
 */
const TransactionDetailModal: React.FC<{
  transaction: EnrichedTransaction;
  onClose: () => void;
}> = ({ transaction, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Détails de la transaction</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <div className="mt-1">
                <TransactionTypeBadge type={transaction.transaction_type} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Date & Heure</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(transaction.created_at).toLocaleString('fr-FR')}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Produit</label>
              <p className="mt-1 text-sm text-gray-900">{transaction.productName || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Quantité</label>
              <p className="mt-1 text-sm text-gray-900">
                <span className={transaction.transaction_type === 'exit' ? 'text-red-600' : 'text-green-600'}>
                  {transaction.transaction_type === 'exit' ? '-' : '+'}{transaction.quantity} {transaction.unit}
                </span>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Référence</label>
              <p className="mt-1 text-sm text-gray-900">
                {transaction.reference_type || 'Manuel'} 
                {transaction.reference_id && ` - ${transaction.reference_id}`}
              </p>
            </div>

            {transaction.from_location && (
              <div>
                <label className="text-sm font-medium text-gray-700">Emplacement source</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.from_location}</p>
              </div>
            )}

            {transaction.to_location && (
              <div>
                <label className="text-sm font-medium text-gray-700">Emplacement destination</label>
                <p className="mt-1 text-sm text-gray-900">{transaction.to_location}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Utilisateur</label>
              <p className="mt-1 text-sm text-gray-900">{transaction.userName || transaction.created_by}</p>
            </div>

            {transaction.notes && (
              <div>
                <label className="text-sm font-medium text-gray-700">Notes</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{transaction.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTransactions;

