import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ReceiptItemsCard from '../ReceiptItemsCard';

// Mock du service : la carte ne doit dépendre que de receiptService.
vi.mock('../../../services/receiptService', () => ({
  default: {
    getReceipt: vi.fn(),
    getItems: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

import receiptService from '../../../services/receiptService';

const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} Ar`;

describe('ReceiptItemsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ne rend rien si aucun ticket n\'existe', async () => {
    (receiptService.getReceipt as any).mockResolvedValue(null);
    const { container } = render(
      <ReceiptItemsCard transactionId="tx1" formatCurrency={fmt} />
    );
    await waitFor(() => {
      expect(receiptService.getReceipt).toHaveBeenCalledWith('tx1');
    });
    expect(container.querySelector('h3')).toBeNull();
  });

  it('affiche fournisseur, lignes et total quand un ticket existe', async () => {
    (receiptService.getReceipt as any).mockResolvedValue({
      id: 'r1',
      transactionId: 'tx1',
      userId: 'u1',
      supplier: 'SHOPRITE',
      receiptMd: '# SHOPRITE\n\n| Article | Qté | Prix |',
      scannedAt: new Date(),
      createdAt: new Date(),
    });
    (receiptService.getItems as any).mockResolvedValue([
      { id: 'i1', transactionId: 'tx1', userId: 'u1', label: 'Riz 5kg', quantity: 1, unitPrice: 15000, lineTotal: 15000, sortOrder: 0, createdAt: new Date() },
      { id: 'i2', transactionId: 'tx1', userId: 'u1', label: 'Huile 1L', quantity: 1, unitPrice: 8000, lineTotal: 8000, sortOrder: 1, createdAt: new Date() },
    ]);

    render(<ReceiptItemsCard transactionId="tx1" formatCurrency={fmt} />);

    expect(await screen.findByText('Articles du ticket')).toBeInTheDocument();
    expect(screen.getByText('SHOPRITE')).toBeInTheDocument();
    expect(screen.getByText('Riz 5kg')).toBeInTheDocument();
    expect(screen.getByText('Huile 1L')).toBeInTheDocument();
    // Total = 15000 + 8000 = 23000
    expect(screen.getByText('23 000 Ar')).toBeInTheDocument();
    // Lien « Voir le ticket » présent (receiptMd fourni)
    expect(screen.getByText('Voir le ticket')).toBeInTheDocument();
  });
});
