/**
 * ReceiptItemsCard — carte « Articles du ticket » affichée sur le détail d'une transaction.
 *
 * Visible uniquement si un ticket existe pour la transaction. Affiche le fournisseur, les
 * lignes d'article et le total, avec édition inline (corriger un prix, modifier/supprimer une
 * ligne, en ajouter). Chaque modification passe par receiptService qui recalcule le total ET
 * ajuste le solde du compte. « Voir le ticket » affiche la trace markdown conservée.
 */

import { useEffect, useState } from 'react';
import { Store, Plus, Trash2, Pencil, Check, X, FileText, Info, ShoppingBag } from 'lucide-react';
import receiptService from '../../services/receiptService';
import type { ReceiptHeader, ReceiptItem } from '../../types/receipt';

interface ReceiptItemsCardProps {
  transactionId: string;
  formatCurrency: (n: number) => string;
  /** Appelé après toute modification (le total/solde a pu changer) pour rafraîchir le parent. */
  onChanged?: () => void;
}

const ReceiptItemsCard = ({ transactionId, formatCurrency, onChanged }: ReceiptItemsCardProps) => {
  const [header, setHeader] = useState<ReceiptHeader | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showMarkdown, setShowMarkdown] = useState(false);

  // Édition inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editQty, setEditQty] = useState('1');
  const [editPrice, setEditPrice] = useState('0');

  // Ajout de ligne
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [newPrice, setNewPrice] = useState('0');

  const load = async () => {
    const h = await receiptService.getReceipt(transactionId);
    setHeader(h);
    if (h) {
      const its = await receiptService.getItems(transactionId);
      setItems(its);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionId]);

  if (loading || !header) return null;

  const total = items.reduce((s, it) => s + (it.lineTotal || 0), 0);

  const startEdit = (it: ReceiptItem) => {
    setEditingId(it.id);
    setEditLabel(it.label);
    setEditQty(String(it.quantity));
    setEditPrice(String(it.lineTotal));
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id: string) => {
    const quantity = parseFloat(editQty) || 1;
    const lineTotal = parseFloat(editPrice) || 0;
    const unitPrice = quantity > 1 ? Math.round((lineTotal / quantity) * 100) / 100 : lineTotal;
    await receiptService.updateItem(id, { label: editLabel.trim() || '—', quantity, unitPrice, lineTotal });
    setEditingId(null);
    await load();
    onChanged?.();
  };

  const removeItem = async (id: string) => {
    await receiptService.deleteItem(id);
    await load();
    onChanged?.();
  };

  const addItem = async () => {
    const quantity = parseFloat(newQty) || 1;
    const lineTotal = parseFloat(newPrice) || 0;
    if (!newLabel.trim() || lineTotal <= 0) return;
    const unitPrice = quantity > 1 ? Math.round((lineTotal / quantity) * 100) / 100 : lineTotal;
    await receiptService.addItem(transactionId, { label: newLabel.trim(), quantity, unitPrice, lineTotal });
    setAdding(false);
    setNewLabel('');
    setNewQty('1');
    setNewPrice('0');
    await load();
    onChanged?.();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* Titre + aide */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-purple-600" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900">Articles du ticket</h3>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-expanded={showHelp}
            aria-label="Aide : articles du ticket"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {showHelp && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-gray-700 space-y-1">
          <p>
            Le détail des articles lus sur votre ticket. Vous pouvez corriger un prix, modifier ou
            supprimer une ligne, ou en ajouter une&nbsp;: le total de la dépense et le solde du compte
            s'ajustent automatiquement.
          </p>
        </div>
      )}

      {/* Fournisseur */}
      {header.supplier && (
        <div className="flex items-center gap-2 mb-4 text-gray-700">
          <Store className="w-4 h-4 text-gray-400" aria-hidden="true" />
          <span className="text-sm font-medium">{header.supplier}</span>
        </div>
      )}

      {/* Lignes */}
      <div className="divide-y divide-gray-100">
        {items.length === 0 && (
          <div className="flex flex-col items-center text-center py-6 text-gray-400">
            <ShoppingBag className="w-10 h-10 mb-2" aria-hidden="true" />
            <p className="text-sm">Aucune ligne. Ajoutez un article avec «&nbsp;Ajouter&nbsp;».</p>
          </div>
        )}

        {items.map((it) =>
          editingId === it.id ? (
            <div key={it.id} className="py-2 flex items-center gap-2">
              <input
                type="text"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 border border-slate-300 rounded text-sm"
                aria-label="Libellé"
              />
              <input
                type="number"
                min="1"
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                className="w-12 px-1 py-1.5 border border-slate-300 rounded text-sm text-center"
                aria-label="Quantité"
              />
              <input
                type="number"
                min="0"
                step="any"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm text-right"
                aria-label="Prix"
              />
              <button
                type="button"
                onClick={() => saveEdit(it.id)}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                aria-label="Enregistrer"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                aria-label="Annuler"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div key={it.id} className="py-2.5 flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-gray-300 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{it.label}</p>
                {it.quantity > 1 && (
                  <p className="text-xs text-gray-500">
                    {it.quantity} × {formatCurrency(it.unitPrice ?? it.lineTotal / it.quantity)}
                  </p>
                )}
              </div>
              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                {formatCurrency(it.lineTotal)}
              </span>
              <button
                type="button"
                onClick={() => startEdit(it)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                aria-label="Modifier la ligne"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => removeItem(it.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                aria-label="Supprimer la ligne"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        )}
      </div>

      {/* Ligne d'ajout */}
      {adding && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Article"
            className="flex-1 min-w-0 px-2 py-1.5 border border-slate-300 rounded text-sm"
          />
          <input
            type="number"
            min="1"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            className="w-12 px-1 py-1.5 border border-slate-300 rounded text-sm text-center"
            aria-label="Quantité"
          />
          <input
            type="number"
            min="0"
            step="any"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            className="w-24 px-2 py-1.5 border border-slate-300 rounded text-sm text-right"
            aria-label="Prix"
          />
          <button
            type="button"
            onClick={addItem}
            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
            aria-label="Ajouter la ligne"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
            aria-label="Annuler"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <span className="text-sm font-medium text-gray-700">Total</span>
        <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
      </div>

      {/* Voir le ticket (markdown) */}
      {header.receiptMd && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowMarkdown((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
            aria-expanded={showMarkdown}
          >
            <FileText className="w-4 h-4" /> {showMarkdown ? 'Masquer le ticket' : 'Voir le ticket'}
          </button>
          {showMarkdown && (
            <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
              {header.receiptMd}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceiptItemsCard;
