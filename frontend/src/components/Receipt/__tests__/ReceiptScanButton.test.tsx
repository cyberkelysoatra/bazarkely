import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Account } from '../../../types';

// Mocks des services : la carte ne doit dépendre d'aucun moteur OCR réel
// (Tesseract/Vision) ni d'IndexedDB pour être rendue.
vi.mock('../../../services/ocrService', () => ({
  recognize: vi.fn(),
}));
vi.mock('../../../services/receiptParser', () => ({
  parseReceipt: vi.fn(),
  buildReceiptMarkdown: vi.fn(),
}));
vi.mock('../../../services/receiptService', () => ({
  default: { saveReceipt: vi.fn(), suggestCategory: vi.fn() },
}));
vi.mock('../../../services/transactionService', () => ({
  default: { createTransaction: vi.fn() },
}));
vi.mock('../../../utils/receiptImage', () => ({
  preprocessReceiptImage: vi.fn(),
}));

import ReceiptScanButton from '../ReceiptScanButton';

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
