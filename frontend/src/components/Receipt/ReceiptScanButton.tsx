/**
 * ReceiptScanButton — point d'entrée « Scanner un ticket » dans le flux Transactions.
 *
 * Orchestre tout le flux HORS-LIGNE et gratuit (Phase 1) :
 *   capture caméra → pré-traitement → OCR Tesseract → parsing → décision
 *   (insertion directe si confiance haute & cohérent, sinon écran de revue) →
 *   création de la transaction (expense, montant = total) + lignes + trace markdown.
 *
 * Aucune image n'est persistée : le Blob est traité en mémoire puis libéré.
 */

import { useRef, useState } from 'react';
import { ScanLine, Camera, Info, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Account, TransactionCategory } from '../../types';
import transactionService from '../../services/transactionService';
import receiptService from '../../services/receiptService';
import { recognizeOffline } from '../../services/ocrService';
import { parseReceipt, buildReceiptMarkdown } from '../../services/receiptParser';
import { preprocessReceiptImage } from '../../utils/receiptImage';
import { RECEIPT_CONFIDENCE_THRESHOLD, RECEIPT_COHERENCE_TOLERANCE } from '../../constants/receipt';
import type { ParsedReceiptItem } from '../../types/receipt';
import ReviewReceipt, { type ReviewReceiptResult } from './ReviewReceipt';

interface ReceiptScanButtonProps {
  userId: string;
  accounts: Account[];
  defaultAccountId?: string;
  categories: Array<{ name: string; label: string; icon?: string | null }>;
  formatCurrency: (n: number) => string;
  currency?: 'MGA' | 'EUR';
  onCreated: (transactionId: string) => void;
}

interface ReviewState {
  supplier?: string;
  items: ParsedReceiptItem[];
  total?: number;
  suggestedCategory?: string;
  ocrConfidence: number;
}

const todayISO = () => new Date().toISOString().split('T')[0];

const ReceiptScanButton = ({
  userId,
  accounts,
  defaultAccountId,
  categories,
  formatCurrency,
  currency = 'MGA',
  onCreated,
}: ReceiptScanButtonProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openPicker = () => fileInputRef.current?.click();

  /** Crée la transaction (expense) + le ticket + les lignes, puis notifie le parent. */
  const createFromReceipt = async (args: {
    supplier?: string;
    items: ParsedReceiptItem[];
    total: number;
    accountId: string;
    category: string;
    date: string;
    ocrConfidence: number;
  }): Promise<boolean> => {
    const { supplier, items, total, accountId, category, date, ocrConfidence } = args;
    const transaction = await transactionService.createTransaction(userId, {
      type: 'expense',
      amount: -Math.abs(total),
      description: supplier?.trim() || 'Ticket',
      category: category as TransactionCategory,
      accountId,
      date: new Date(date),
      notes: undefined,
      originalCurrency: currency,
      originalAmount: Math.abs(total),
    });

    if (!transaction?.id) {
      toast.error('Erreur lors de la création de la transaction');
      return false;
    }

    const dateLabel = new Date(date).toLocaleDateString('fr-FR');
    const receiptMd = buildReceiptMarkdown(supplier, items, total, dateLabel);
    await receiptService.saveReceipt(
      transaction.id,
      { supplier, receiptMd, ocrEngine: 'tesseract', ocrConfidence },
      items
    );

    onCreated(transaction.id);
    return true;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Réinitialiser l'input pour autoriser le re-scan du même fichier
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    setIsProcessing(true);
    try {
      // 1) Pré-traitement léger (downscale + gris) — en mémoire, jamais stocké
      const processed = await preprocessReceiptImage(file);

      // 2) OCR hors-ligne
      const { text, confidence } = await recognizeOffline(processed);

      // 3) Parsing
      const parsed = parseReceipt(text, confidence);

      if (parsed.items.length === 0) {
        toast.error("Aucun article détecté. Réessayez avec une photo plus nette ou saisissez à la main.");
        // Ouvrir tout de même la revue (vide) pour saisie manuelle
        setReview({ supplier: parsed.supplier, items: [], total: parsed.total, ocrConfidence: confidence });
        return;
      }

      // 4) Suggestion de catégorie (jamais bloquante)
      const suggestedCategory = await receiptService.suggestCategory(
        parsed.supplier,
        categories.map((c) => c.name)
      );

      // 5) Décision : insertion directe vs revue
      const sumLines = parsed.items.reduce((s, it) => s + it.lineTotal, 0);
      const coherent =
        parsed.total === undefined ||
        (parsed.total > 0 && Math.abs(sumLines - parsed.total) / parsed.total <= RECEIPT_COHERENCE_TOLERANCE);
      const directAccountId = defaultAccountId || accounts[0]?.id;

      if (
        parsed.confidence >= RECEIPT_CONFIDENCE_THRESHOLD &&
        coherent &&
        directAccountId &&
        suggestedCategory
      ) {
        const total = parsed.total ?? sumLines;
        const ok = await createFromReceipt({
          supplier: parsed.supplier,
          items: parsed.items,
          total,
          accountId: directAccountId,
          category: suggestedCategory,
          date: todayISO(),
          ocrConfidence: confidence,
        });
        if (ok) toast.success('Ticket enregistré');
        return;
      }

      // Confiance basse / incohérent / pas de catégorie sûre → écran de revue
      setReview({
        supplier: parsed.supplier,
        items: parsed.items,
        total: parsed.total,
        suggestedCategory,
        ocrConfidence: confidence,
      });
    } catch (error) {
      console.error('🧾 [ReceiptScanButton] ❌ Erreur OCR/scan:', error);
      toast.error("Lecture du ticket impossible. Réessayez ou saisissez la dépense à la main.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewConfirm = async (result: ReviewReceiptResult) => {
    setIsSubmitting(true);
    try {
      const ok = await createFromReceipt({
        supplier: result.supplier,
        items: result.items,
        total: result.total,
        accountId: result.accountId,
        category: result.category,
        date: result.date,
        ocrConfidence: review?.ocrConfidence ?? 0,
      });
      if (ok) {
        toast.success('Ticket enregistré');
        setReview(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <ScanLine className="w-5 h-5 text-purple-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900">Scanner un ticket</span>
              <button
                type="button"
                onClick={() => setShowHelp((v) => !v)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-expanded={showHelp}
                aria-label="Aide : scanner un ticket"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600">Photographiez un reçu, les articles se remplissent tout seuls</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openPicker}
          disabled={isProcessing}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Lecture...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" /> Scanner
            </>
          )}
        </button>
      </div>

      {showHelp && (
        <div className="mt-3 pt-3 border-t border-purple-200 text-xs text-gray-700 space-y-2">
          <div>
            <p className="font-semibold text-gray-800">À quoi ça sert&nbsp;?</p>
            <p>
              Au lieu de tout retaper, prenez en photo le ticket de caisse&nbsp;: l'application lit le
              commerçant, les articles et le total, puis crée la dépense pour vous. Tout se passe sur
              votre téléphone, sans Internet et sans frais.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">Comment s'en servir&nbsp;?</p>
            <p>
              Touchez «&nbsp;Scanner&nbsp;», prenez le ticket bien à plat et bien éclairé. Vérifiez les
              lignes proposées (vous pouvez corriger un prix, ajouter ou retirer une ligne), choisissez
              le compte et la catégorie, puis validez. La dépense enregistrée vaut le total du ticket.
            </p>
          </div>
        </div>
      )}

      {review && (
        <ReviewReceipt
          initialSupplier={review.supplier}
          initialItems={review.items}
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          categories={categories}
          suggestedCategory={review.suggestedCategory}
          defaultDate={todayISO()}
          formatCurrency={formatCurrency}
          onCancel={() => setReview(null)}
          onConfirm={handleReviewConfirm}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default ReceiptScanButton;
