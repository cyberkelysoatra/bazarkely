/**
 * receiptService — service offline-first du « Scan de ticket », calqué sur transactionService.
 *
 * Source primaire = IndexedDB (Dexie), Supabase pour la synchronisation. Toute écriture est
 * IDEMPOTENTE : id client conservé + upsert(onConflict: 'id'). Un envoi « expiré-mais-commité »
 * et le rejeu de la file convergent sur la même ligne (pas de doublon).
 *
 * Ne fait JAMAIS supabase.auth.getUser() (réseau) → getCurrentUserId() lit le store puis getSession().
 */

import apiService from './apiService';
import accountService from './accountService';
import transactionService from './transactionService';
import { db } from '../lib/database';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../stores/appStore';
import { SYNC_PRIORITY } from '../types';
import type { SyncOperation } from '../types';
import { computeReceiptTotal, signedReceiptAmount } from './receiptParser';
import type { ReceiptHeader, ReceiptItem, ParsedReceiptItem } from '../types/receipt';

type ReceiptTable = 'transaction_receipts' | 'transaction_items';

class ReceiptService {
  /** Récupère l'ID utilisateur — offline-safe (store Zustand puis getSession), jamais getUser(). */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const storeUser = useAppStore.getState().user;
      if (storeUser?.id) return storeUser.id;
    } catch {
      /* store pas encore initialisé */
    }
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) return data.session.user.id;
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur récupération utilisateur:', error);
    }
    return null;
  }

  /** Ajoute une opération à la file de synchronisation (offline / échec online). */
  private async queueSync(
    userId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    table_name: ReceiptTable,
    recordId: string,
    data: any
  ): Promise<void> {
    try {
      const syncOp: SyncOperation = {
        id: crypto.randomUUID(),
        userId,
        operation,
        table_name,
        data: { id: recordId, ...data },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
        priority: SYNC_PRIORITY.NORMAL,
        syncTag: 'bazarkely-sync',
        expiresAt: null,
      };
      await db.syncQueue.add(syncOp);
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur ajout à la file de sync:', error);
    }
  }

  // --- Mappers Dexie (camelCase) ⇄ Supabase (snake_case) ---

  private headerToRow(h: ReceiptHeader): Record<string, any> {
    return {
      id: h.id,
      transaction_id: h.transactionId,
      user_id: h.userId,
      supplier: h.supplier ?? null,
      receipt_md: h.receiptMd ?? null,
      ocr_engine: h.ocrEngine ?? null,
      ocr_confidence: h.ocrConfidence ?? null,
      scanned_at: h.scannedAt.toISOString(),
      created_at: h.createdAt.toISOString(),
    };
  }

  private rowToHeader(r: any): ReceiptHeader {
    return {
      id: r.id,
      transactionId: r.transaction_id,
      userId: r.user_id,
      supplier: r.supplier ?? undefined,
      receiptMd: r.receipt_md ?? undefined,
      ocrEngine: r.ocr_engine ?? undefined,
      ocrConfidence: r.ocr_confidence ?? undefined,
      scannedAt: new Date(r.scanned_at),
      createdAt: new Date(r.created_at),
    };
  }

  private itemToRow(it: ReceiptItem): Record<string, any> {
    return {
      id: it.id,
      transaction_id: it.transactionId,
      user_id: it.userId,
      label: it.label,
      quantity: it.quantity,
      unit_price: it.unitPrice ?? null,
      line_total: it.lineTotal,
      sort_order: it.sortOrder,
      created_at: it.createdAt.toISOString(),
    };
  }

  private rowToItem(r: any): ReceiptItem {
    return {
      id: r.id,
      transactionId: r.transaction_id,
      userId: r.user_id,
      label: r.label,
      quantity: Number(r.quantity ?? 1),
      unitPrice: r.unit_price ?? undefined,
      lineTotal: Number(r.line_total ?? 0),
      sortOrder: Number(r.sort_order ?? 0),
      createdAt: new Date(r.created_at),
    };
  }

  /**
   * Enregistre un ticket (en-tête + lignes) pour une transaction.
   * IndexedDB d'abord, puis Supabase si online (sinon file). Idempotent.
   */
  async saveReceipt(
    transactionId: string,
    headerData: {
      supplier?: string;
      receiptMd?: string;
      ocrEngine?: string;
      ocrConfidence?: number;
    },
    items: ParsedReceiptItem[]
  ): Promise<{ header: ReceiptHeader; items: ReceiptItem[] } | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.error('🧾 [ReceiptService] ❌ Utilisateur non authentifié');
        return null;
      }

      const now = new Date();
      const header: ReceiptHeader = {
        id: crypto.randomUUID(),
        transactionId,
        userId,
        supplier: headerData.supplier,
        receiptMd: headerData.receiptMd,
        ocrEngine: headerData.ocrEngine,
        ocrConfidence: headerData.ocrConfidence,
        scannedAt: now,
        createdAt: now,
      };
      const itemRecords: ReceiptItem[] = items.map((it, idx) => ({
        id: crypto.randomUUID(),
        transactionId,
        userId,
        label: it.label,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
        sortOrder: idx,
        createdAt: now,
      }));

      // STEP 1 : IndexedDB immédiatement (offline-first)
      await db.transactionReceipts.put(header);
      if (itemRecords.length > 0) await db.transactionItems.bulkPut(itemRecords);

      // STEP 2 : Supabase si online, sinon file
      if (navigator.onLine) {
        try {
          const resH = await apiService.upsertReceipt(this.headerToRow(header));
          const resI = await apiService.upsertReceiptItems(itemRecords.map((it) => this.itemToRow(it)));
          if (!resH.success) {
            await this.queueSync(userId, 'CREATE', 'transaction_receipts', header.id, this.headerToRow(header));
          }
          if (!resI.success) {
            for (const it of itemRecords) {
              await this.queueSync(userId, 'CREATE', 'transaction_items', it.id, this.itemToRow(it));
            }
          }
        } catch (error) {
          console.error('🧾 [ReceiptService] ⚠️ Sync immédiate échouée, mise en file:', error);
          await this.queueSync(userId, 'CREATE', 'transaction_receipts', header.id, this.headerToRow(header));
          for (const it of itemRecords) {
            await this.queueSync(userId, 'CREATE', 'transaction_items', it.id, this.itemToRow(it));
          }
        }
      } else {
        await this.queueSync(userId, 'CREATE', 'transaction_receipts', header.id, this.headerToRow(header));
        for (const it of itemRecords) {
          await this.queueSync(userId, 'CREATE', 'transaction_items', it.id, this.itemToRow(it));
        }
      }

      return { header, items: itemRecords };
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur saveReceipt:', error);
      return null;
    }
  }

  /** En-tête de ticket d'une transaction (Dexie d'abord, refresh background si online). */
  async getReceipt(transactionId: string): Promise<ReceiptHeader | null> {
    try {
      const local = await db.transactionReceipts.where('transactionId').equals(transactionId).first();
      if (navigator.onLine) {
        this.refreshFromSupabase(transactionId).catch(() => {});
      }
      if (local) return local;
      if (!navigator.onLine) return null;
      // Pas en local : tentative directe online
      const res = await apiService.getReceiptByTransaction(transactionId);
      if (res.success && res.data) {
        const header = this.rowToHeader(res.data);
        await db.transactionReceipts.put(header);
        return header;
      }
      return null;
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur getReceipt:', error);
      return null;
    }
  }

  /** Lignes d'article d'une transaction, triées par sortOrder. */
  async getItems(transactionId: string): Promise<ReceiptItem[]> {
    try {
      const local = await db.transactionItems.where('transactionId').equals(transactionId).toArray();
      if (navigator.onLine) {
        this.refreshFromSupabase(transactionId).catch(() => {});
      }
      if (local.length > 0) {
        return local.sort((a, b) => a.sortOrder - b.sortOrder);
      }
      if (!navigator.onLine) return [];
      const res = await apiService.getItemsByTransaction(transactionId);
      if (res.success && res.data) {
        const items = (res.data as any[]).map((r) => this.rowToItem(r));
        if (items.length > 0) await db.transactionItems.bulkPut(items);
        return items.sort((a, b) => a.sortOrder - b.sortOrder);
      }
      return [];
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur getItems:', error);
      return [];
    }
  }

  /** Rafraîchit le cache Dexie depuis Supabase (fire-and-forget). */
  private async refreshFromSupabase(transactionId: string): Promise<void> {
    try {
      const [resH, resI] = await Promise.all([
        apiService.getReceiptByTransaction(transactionId),
        apiService.getItemsByTransaction(transactionId),
      ]);
      if (resH.success && resH.data) {
        await db.transactionReceipts.put(this.rowToHeader(resH.data));
      }
      if (resI.success && resI.data) {
        const items = (resI.data as any[]).map((r) => this.rowToItem(r));
        if (items.length > 0) await db.transactionItems.bulkPut(items);
      }
    } catch {
      /* silencieux — l'UI a déjà ses données locales */
    }
  }

  /** Existe-t-il un ticket pour cette transaction ? (lecture Dexie rapide) */
  async hasReceipt(transactionId: string): Promise<boolean> {
    const header = await db.transactionReceipts.where('transactionId').equals(transactionId).first();
    return !!header;
  }

  /** Ajoute une ligne d'article + recalcule le total. */
  async addItem(
    transactionId: string,
    data: { label: string; quantity: number; unitPrice?: number; lineTotal: number }
  ): Promise<ReceiptItem | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;
      const existing = await db.transactionItems.where('transactionId').equals(transactionId).toArray();
      const sortOrder = existing.reduce((m, it) => Math.max(m, it.sortOrder), -1) + 1;
      const item: ReceiptItem = {
        id: crypto.randomUUID(),
        transactionId,
        userId,
        label: data.label,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        lineTotal: data.lineTotal,
        sortOrder,
        createdAt: new Date(),
      };
      await db.transactionItems.put(item);
      await this.syncItemWrite(userId, 'CREATE', item);
      await this.recomputeTotalAndSyncTransaction(transactionId);
      return item;
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur addItem:', error);
      return null;
    }
  }

  /** Met à jour une ligne (Dexie + sync) + recalcule le total. */
  async updateItem(
    id: string,
    patch: Partial<Pick<ReceiptItem, 'label' | 'quantity' | 'unitPrice' | 'lineTotal'>>
  ): Promise<ReceiptItem | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return null;
      const existing = await db.transactionItems.get(id);
      if (!existing) return null;
      const updated: ReceiptItem = { ...existing, ...patch };
      await db.transactionItems.put(updated);
      await this.syncItemWrite(userId, 'UPDATE', updated);
      await this.recomputeTotalAndSyncTransaction(updated.transactionId);
      return updated;
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur updateItem:', error);
      return null;
    }
  }

  /** Supprime une ligne (Dexie + sync) + recalcule le total. */
  async deleteItem(id: string): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) return false;
      const existing = await db.transactionItems.get(id);
      if (!existing) return false;
      await db.transactionItems.delete(id);
      if (navigator.onLine) {
        try {
          const res = await apiService.deleteReceiptItem(id);
          if (!res.success) await this.queueSync(userId, 'DELETE', 'transaction_items', id, {});
        } catch {
          await this.queueSync(userId, 'DELETE', 'transaction_items', id, {});
        }
      } else {
        await this.queueSync(userId, 'DELETE', 'transaction_items', id, {});
      }
      await this.recomputeTotalAndSyncTransaction(existing.transactionId);
      return true;
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur deleteItem:', error);
      return false;
    }
  }

  /** Écrit une ligne vers Supabase (online) ou la met en file (offline/échec). */
  private async syncItemWrite(
    userId: string,
    operation: 'CREATE' | 'UPDATE',
    item: ReceiptItem
  ): Promise<void> {
    const row = this.itemToRow(item);
    if (navigator.onLine) {
      try {
        const res = await apiService.upsertReceiptItems([row]);
        if (!res.success) await this.queueSync(userId, operation, 'transaction_items', item.id, row);
      } catch {
        await this.queueSync(userId, operation, 'transaction_items', item.id, row);
      }
    } else {
      await this.queueSync(userId, operation, 'transaction_items', item.id, row);
    }
  }

  /**
   * Recalcule le total (Σ lineTotal) et l'applique à la transaction pour garder
   * « débit total = somme des lignes ». Ajuste AUSSI le solde du compte du delta.
   */
  async recomputeTotalAndSyncTransaction(transactionId: string): Promise<void> {
    try {
      const items = await db.transactionItems.where('transactionId').equals(transactionId).toArray();
      const sum = computeReceiptTotal(items);
      const tx = await db.transactions.get(transactionId);
      if (!tx) return;

      const newAmount = signedReceiptAmount(tx.type, sum);
      if (newAmount === tx.amount) return;

      const delta = newAmount - tx.amount;
      await transactionService.updateTransaction(transactionId, { amount: newAmount });

      // Ajuster le solde du compte du delta (updateTransaction ne touche pas au solde).
      try {
        const account = await accountService.getAccount(tx.accountId, tx.userId);
        if (account) {
          await accountService.updateAccount(tx.accountId, tx.userId, {
            balance: account.balance + delta,
          });
        }
      } catch (balanceError) {
        console.error('🧾 [ReceiptService] ❌ Erreur ajustement du solde:', balanceError);
      }
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur recomputeTotal:', error);
    }
  }

  /**
   * Suggère une catégorie (jamais bloquant) :
   *  1) catégorie la plus utilisée pour des tickets du même fournisseur,
   *  2) sinon table de mots-clés (fournisseur),
   * en restant dans la liste des catégories disponibles (`availableNames`).
   */
  async suggestCategory(
    supplier: string | undefined,
    availableNames: string[]
  ): Promise<string | undefined> {
    try {
      const allowed = new Set(availableNames);

      // 1) Historique fournisseur
      if (supplier && supplier.trim()) {
        const key = supplier.trim().toLowerCase();
        const headers = await db.transactionReceipts.toArray();
        const sameSupplier = headers.filter((h) => (h.supplier || '').trim().toLowerCase() === key);
        if (sameSupplier.length > 0) {
          const counts = new Map<string, number>();
          for (const h of sameSupplier) {
            const tx = await db.transactions.get(h.transactionId);
            if (tx?.category && allowed.has(tx.category)) {
              counts.set(tx.category, (counts.get(tx.category) || 0) + 1);
            }
          }
          let best: string | undefined;
          let bestCount = 0;
          for (const [cat, c] of counts) {
            if (c > bestCount) {
              best = cat;
              bestCount = c;
            }
          }
          if (best) return best;
        }
      }

      // 2) Mots-clés fournisseur → catégorie
      if (supplier && supplier.trim()) {
        const s = supplier.toLowerCase();
        const keywordMap: Array<{ re: RegExp; category: string }> = [
          { re: /(supermarch|[ée]picerie|march[ée]|shoprite|leader|score|jumbo|bazar|alimentation|boulangerie|boucherie)/, category: 'alimentation' },
          { re: /(pharmaci|clinique|m[ée]dical|h[oô]pital|sant[ée]|docteur)/, category: 'sante' },
          { re: /(station|essence|carburant|taxi|transport|jirama)/, category: 'transport' },
          { re: /(librairie|[ée]cole|fourniture|papeterie)/, category: 'education' },
          { re: /(telma|orange|airtel|recharge|cr[ée]dit\s*t[ée]l)/, category: 'communication' },
          { re: /(boutique|v[eê]tement|pr[eê]t[\s-]?[àa][\s-]?porter|mode)/, category: 'vetements' },
        ];
        for (const { re, category } of keywordMap) {
          if (re.test(s) && allowed.has(category)) return category;
        }
      }

      return undefined;
    } catch (error) {
      console.error('🧾 [ReceiptService] ❌ Erreur suggestCategory:', error);
      return undefined;
    }
  }
}

export default new ReceiptService();
