/**
 * ReviewReceipt — écran de relecture / correction d'un ticket scanné (« correction si doute »).
 *
 * Affiché quand la confiance OCR est basse OU que Σ(lignes) ≠ total lu. L'utilisateur
 * corrige fournisseur, lignes (libellé / quantité / prix), choisit compte, catégorie et date.
 * Le total se recalcule en direct (= Σ des prix de ligne). « Valider » renvoie les données
 * consolidées au parent qui crée la transaction + le ticket.
 */

import { useMemo, useState } from 'react';
import { Store, Plus, Trash2, Pencil, X, Check, ScanLine } from 'lucide-react';
import type { Account } from '../../types';
import type { ParsedReceiptItem } from '../../types/receipt';

interface EditableItem {
  label: string;
  quantity: number;
  lineTotal: number;
}

export interface ReviewReceiptResult {
  supplier: string;
  items: ParsedReceiptItem[];
  total: number;
  accountId: string;
  category: string;
  date: string; // YYYY-MM-DD
}

interface ReviewReceiptProps {
  initialSupplier?: string;
  initialItems: ParsedReceiptItem[];
  accounts: Account[];
  defaultAccountId?: string;
  categories: Array<{ name: string; label: string; icon?: string | null }>;
  suggestedCategory?: string;
  defaultDate: string; // YYYY-MM-DD
  formatCurrency: (n: number) => string;
  onCancel: () => void;
  onConfirm: (result: ReviewReceiptResult) => void;
  isSubmitting?: boolean;
}

const ReviewReceipt = ({
  initialSupplier,
  initialItems,
  accounts,
  defaultAccountId,
  categories,
  suggestedCategory,
  defaultDate,
  formatCurrency,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: ReviewReceiptProps) => {
  const [supplier, setSupplier] = useState(initialSupplier || '');
  const [items, setItems] = useState<EditableItem[]>(
    initialItems.length > 0
      ? initialItems.map((it) => ({ label: it.label, quantity: it.quantity, lineTotal: it.lineTotal }))
      : [{ label: '', quantity: 1, lineTotal: 0 }]
  );
  const [accountId, setAccountId] = useState(defaultAccountId || accounts[0]?.id || '');
  const [category, setCategory] = useState(suggestedCategory || categories[0]?.name || '');
  const [date, setDate] = useState(defaultDate);

  const total = useMemo(() => items.reduce((s, it) => s + (Number(it.lineTotal) || 0), 0), [items]);

  const updateItem = (idx: number, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, { label: '', quantity: 1, lineTotal: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit =
    accountId !== '' &&
    category !== '' &&
    total > 0 &&
    items.some((it) => it.label.trim() !== '' && Number(it.lineTotal) > 0);

  const handleConfirm = () => {
    const cleaned = items
      .filter((it) => it.label.trim() !== '' && Number(it.lineTotal) > 0)
      .map<ParsedReceiptItem>((it) => {
        const quantity = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
        const lineTotal = Number(it.lineTotal) || 0;
        const unitPrice = quantity > 1 ? Math.round((lineTotal / quantity) * 100) / 100 : lineTotal;
        return { label: it.label.trim(), quantity, unitPrice, lineTotal };
      });
    const computedTotal = cleaned.reduce((s, it) => s + it.lineTotal, 0);
    onConfirm({
      supplier: supplier.trim(),
      items: cleaned,
      total: computedTotal,
      accountId,
      category,
      date,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-blue-600" aria-hidden="true" />
            <h3 className="text-base font-semibold text-gray-900">Vérifier le ticket</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Annuler"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="overflow-y-auto px-4 py-4 space-y-4">
          {/* Fournisseur */}
          <div>
            <label htmlFor="receipt-supplier" className="block text-sm font-medium text-gray-700 mb-1">
              Fournisseur
            </label>
            <div className="relative">
              <Store className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                id="receipt-supplier"
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Nom du commerce"
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Lignes d'article */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Pencil className="w-4 h-4 text-gray-400" aria-hidden="true" /> Articles
              </span>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={it.label}
                    onChange={(e) => updateItem(idx, { label: e.target.value })}
                    placeholder="Article"
                    className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 1 })}
                    aria-label="Quantité"
                    className="w-12 px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-center"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={it.lineTotal}
                    onChange={(e) => updateItem(idx, { lineTotal: parseFloat(e.target.value) || 0 })}
                    aria-label="Prix"
                    className="w-24 px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-right"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total recalculé en direct */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Total</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Compte */}
          <div>
            <label htmlFor="receipt-account" className="block text-sm font-medium text-gray-700 mb-1">
              Compte
            </label>
            <select
              id="receipt-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un compte</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Catégorie */}
          <div>
            <label htmlFor="receipt-category" className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie
            </label>
            <select
              id="receipt-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.icon ? `${c.icon} ` : ''}
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="receipt-date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              id="receipt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Pied */}
        <div className="flex gap-3 px-4 py-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit || isSubmitting}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-5 h-5" />
            {isSubmitting ? 'Création...' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewReceipt;
