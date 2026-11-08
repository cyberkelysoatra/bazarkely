import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Account } from '../../../types';

// Mocks des services : la carte ne doit dépendre d'aucun moteur OCR réel
// (Tesseract/Vision) ni d'IndexedDB pour être rendue.
vi.mock('../../../services/ocrService', () => ({
  recognize: vi.fn(),
}));
// Parseur réel par défaut : chaque test peut forcer un résultat avec mockReturnValueOnce.
vi.mock('../../../services/receiptParser', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/receiptParser')>();
  return { ...actual, parseReceipt: vi.fn(actual.parseReceipt) };
});
vi.mock('../../../services/receiptService', () => ({
  default: { saveReceipt: vi.fn(), suggestCategory: vi.fn() },
}));
vi.mock('../../../services/transactionService', () => ({
  default: { createTransaction: vi.fn() },
}));
vi.mock('../../../utils/receiptImage', () => ({
  preprocessReceiptImage: vi.fn(),
}));
vi.mock('../ReviewReceipt', () => ({
  default: ({ defaultDate }: { defaultDate: string }) => (
    <div data-testid="review" data-date={defaultDate} />
  ),
}));

import ReceiptScanButton from '../ReceiptScanButton';
import { recognize } from '../../../services/ocrService';
import { parseReceipt } from '../../../services/receiptParser';
import receiptService from '../../../services/receiptService';
import transactionService from '../../../services/transactionService';
import { preprocessReceiptImage } from '../../../utils/receiptImage';

const accounts = [
  { id: 'acc1', name: 'Espèces', balance: 0 },
] as unknown as Account[];

const renderCard = () =>
  render(
    <ReceiptScanButton
      userId="u1"
      accounts={accounts}
      defaultAccountId="acc1"
      categories={[{ name: 'alimentation', label: 'Alimentation' }]}
      formatCurrency={(n) => `${n} Ar`}
      onCreated={vi.fn()}
    />
  );

const fileInputs = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));

describe('ReceiptScanButton — deux portes d\'entrée (caméra + galerie)', () => {
  it('rend exactement deux champs fichier', () => {
    const { container } = renderCard();
    expect(fileInputs(container)).toHaveLength(2);
  });

  it('a un champ caméra (capture="environment") et un champ galerie SANS capture', () => {
    const { container } = renderCard();
    const inputs = fileInputs(container);

    const camera = inputs.filter((i) => i.getAttribute('capture') === 'environment');
    const gallery = inputs.filter((i) => !i.hasAttribute('capture'));

    // AC1 : le chemin caméra historique est intact
    expect(camera).toHaveLength(1);
    // AC2 : la seconde porte n'impose PAS l'appareil photo
    expect(gallery).toHaveLength(1);
  });

  it('accepte uniquement des images sur les deux champs', () => {
    const { container } = renderCard();
    for (const input of fileInputs(container)) {
      expect(input.getAttribute('accept')).toBe('image/*');
    }
  });

  it('expose un bouton « Importer une photo enregistrée »', () => {
    renderCard();
    expect(
      screen.getByRole('button', { name: 'Importer une photo enregistrée' })
    ).toBeInTheDocument();
  });

  it('désactive les deux boutons de la même façon (état initial actif)', () => {
    renderCard();
    expect(screen.getByRole('button', { name: 'Importer une photo enregistrée' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Scanner$/ })).not.toBeDisabled();
  });
});

describe('ReceiptScanButton — décision insertion directe / revue', () => {
  const FLAN = { label: 'FLAN NATURE', quantity: 2, unitPrice: 7300, lineTotal: 14600 };

  /** Date du jour au format AAAA-MM-JJ local : toujours dans la fenêtre des 60 jours. */
  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const scan = (container: HTMLElement) =>
    fireEvent.change(fileInputs(container)[1], {
      target: { files: [new File(['x'], 'ticket.jpg', { type: 'image/jpeg' })] },
    });

  beforeEach(() => {
    vi.mocked(transactionService.createTransaction).mockReset();
    vi.mocked(transactionService.createTransaction).mockResolvedValue({ id: 't1' } as never);
    vi.mocked(receiptService.saveReceipt).mockReset();
    vi.mocked(receiptService.suggestCategory).mockReset();
    vi.mocked(receiptService.suggestCategory).mockResolvedValue('alimentation' as never);
    vi.mocked(preprocessReceiptImage).mockResolvedValue(new Blob(['x']));
    vi.mocked(recognize).mockReset();
  });

  it('C3 : aucun total lu, confiance élevée, catégorie suggérée → revue, aucune insertion', async () => {
    vi.mocked(recognize).mockResolvedValue({ text: 'x', confidence: 0.95, engine: 'tesseract' });
    vi.mocked(parseReceipt).mockReturnValueOnce({
      supplier: 'LEADER PRICE',
      items: [FLAN],
      total: undefined,
      totalRead: false,
      confidence: 0.95,
    });

    const { container } = renderCard();
    scan(container);

    expect(await screen.findByTestId('review')).toBeInTheDocument();
    expect(transactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('C3 : total déduit de la somme (non lu) → revue, aucune insertion', async () => {
    vi.mocked(recognize).mockResolvedValue({ text: 'x', confidence: 0.95, engine: 'tesseract' });
    vi.mocked(parseReceipt).mockReturnValueOnce({
      supplier: 'LEADER PRICE',
      items: [FLAN],
      total: 14600,
      totalRead: false,
      confidence: 0.95,
    });

    const { container } = renderCard();
    scan(container);

    expect(await screen.findByTestId('review')).toBeInTheDocument();
    expect(transactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('C2 : vrai parseur, ticket sans TOTAL et ligne abîmée → revue, aucune insertion', async () => {
    const text = ['LEADER PRICE', '2  FLAN NATURE', 'Prix: 7300 => 2'].join('\n');
    vi.mocked(recognize).mockResolvedValue({ text, confidence: 1, engine: 'tesseract' });

    const { container } = renderCard();
    scan(container);

    expect(await screen.findByTestId('review')).toBeInTheDocument();
    expect(transactionService.createTransaction).not.toHaveBeenCalled();
  });

  it('total lu et cohérent → insertion directe (repli Tesseract)', async () => {
    const text = ['LEADER PRICE', '2  FLAN NATURE', 'Prix: 7300 => 14600', 'TOTAL : 14600'].join('\n');
    vi.mocked(recognize).mockResolvedValue({ text, confidence: 0.9, engine: 'tesseract' });

    const { container } = renderCard();
    scan(container);

    await waitFor(() => expect(receiptService.saveReceipt).toHaveBeenCalled());
    expect(vi.mocked(transactionService.createTransaction).mock.calls[0][1]).toMatchObject({
      amount: -14600,
      description: 'LEADER PRICE',
    });
    expect(screen.queryByTestId('review')).toBeNull();
  });

  it('Gemini cohérent → insertion directe avec la date du ticket et ocr_engine gemini', async () => {
    const date = localToday();
    vi.mocked(recognize).mockResolvedValue({
      text: '',
      confidence: 0.9,
      engine: 'gemini',
      structured: { supplier: 'LEADER PRICE', date, currency: 'MGA', items: [{ ...FLAN }], total: 14600 },
    });

    const { container } = renderCard();
    scan(container);

    await waitFor(() => expect(receiptService.saveReceipt).toHaveBeenCalled());
    expect(parseReceipt).not.toHaveBeenCalledWith('', 0.9);
    const payload = vi.mocked(transactionService.createTransaction).mock.calls[0][1] as unknown as {
      amount: number;
      date: Date;
    };
    expect(payload.amount).toBe(-14600);
    expect(payload.date.toISOString().slice(0, 10)).toBe(date);
    expect(vi.mocked(receiptService.saveReceipt).mock.calls[0][1]).toMatchObject({
      ocrEngine: 'gemini',
      ocrConfidence: 1,
    });
  });

  it('Gemini sans total → revue, date du ticket proposée par défaut', async () => {
    const date = localToday();
    vi.mocked(recognize).mockResolvedValue({
      text: '',
      confidence: 0.9,
      engine: 'gemini',
      structured: { supplier: 'LEADER PRICE', date, currency: 'MGA', items: [{ ...FLAN }], total: null },
    });

    const { container } = renderCard();
    scan(container);

    const review = await screen.findByTestId('review');
    expect(review).toHaveAttribute('data-date', date);
    expect(transactionService.createTransaction).not.toHaveBeenCalled();
  });
});
