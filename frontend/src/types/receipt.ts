/**
 * Types pour la fonctionnalité « Scanner un ticket de caisse » (offline-first).
 *
 * Une trace légère du ticket est conservée :
 *  - ReceiptHeader : en-tête (fournisseur, markdown du ticket, moteur OCR, confiance)
 *  - ReceiptItem   : une ligne d'article (libellé, quantité, prix unitaire, total ligne)
 *
 * Aucune image n'est stockée — seul le markdown `receiptMd` sert de trace.
 * Tables Supabase miroir : transaction_receipts / transaction_items.
 */

export interface ReceiptHeader {
  id: string;
  transactionId: string;
  userId: string;
  supplier?: string;
  receiptMd?: string;
  ocrEngine?: string;
  ocrConfidence?: number;
  scannedAt: Date;
  createdAt: Date;
}

export interface ReceiptItem {
  id: string;
  transactionId: string;
  userId: string;
  label: string;
  quantity: number;
  unitPrice?: number;
  lineTotal: number;
  sortOrder: number;
  createdAt: Date;
}

/**
 * Résultat brut du parsing d'un ticket (sortie de `parseReceipt`).
 * Les `items` n'ont pas encore d'id/transactionId — ils sont matérialisés
 * en `ReceiptItem` au moment de la création de la transaction.
 */
export interface ParsedReceiptItem {
  label: string;
  quantity: number;
  unitPrice?: number;
  lineTotal: number;
}

export interface ParsedReceipt {
  supplier?: string;
  items: ParsedReceiptItem[];
  total?: number;
  /** Confiance globale [0..1] : combinaison confiance OCR + cohérence Σ lignes vs total lu. */
  confidence: number;
}
