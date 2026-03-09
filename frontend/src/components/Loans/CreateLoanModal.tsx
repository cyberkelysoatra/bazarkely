import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  createLoan,
  getLastUsedInterestSettings
} from '../../services/loanService';
import type {
  CreateLoanInput,
  InterestFrequency
} from '../../services/loanService';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Button from '../UI/Button';

export interface CreateLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateLoanModal = ({ isOpen, onClose, onSuccess }: CreateLoanModalProps) => {
  const [isITheBorrower, setIsITheBorrower] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [amountInitial, setAmountInitial] = useState('');
  const [currency, setCurrency] = useState<'MGA' | 'EUR'>('MGA');
  const [formRate, setFormRate] = useState('0');
  const [formFrequency, setFormFrequency] = useState<InterestFrequency>('monthly');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadLastSettings();
    }
  }, [isOpen]);

  const loadLastSettings = async () => {
    try {
      const settings = await getLastUsedInterestSettings();
      if (settings) {
        setFormRate(settings.rate.toString());
        setFormFrequency(settings.frequency);
      }
    } catch (error) {
      // Ignore errors, use defaults
    }
  };

  const resetForm = () => {
    setIsITheBorrower(false);
    setBorrowerName('');
    setBorrowerPhone('');
    setAmountInitial('');
    setCurrency('MGA');
    setDueDate('');
    setDescription('');
    setFormRate('0');
    setFormFrequency('monthly');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isITheBorrower && !borrowerName.trim() && !borrowerPhone.trim()) {
      toast.error('Nom ou téléphone du bénéficiaire requis');
      return;
    }

    if (!amountInitial || parseFloat(amountInitial) <= 0) {
      toast.error('Montant initial requis');
      return;
    }

    try {
      const input: CreateLoanInput = {
        isITheBorrower,
        borrowerName: borrowerName.trim() || undefined,
        borrowerPhone: borrowerPhone.trim() || undefined,
        amountInitial: parseFloat(amountInitial),
        currency,
        interestRate: parseFloat(formRate) || 0,
        interestFrequency: formFrequency,
        dueDate: dueDate || null,
        description: description.trim() || null
      };

      await createLoan(input);
      toast.success('Prêt créé avec succès');
      resetForm();
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la création du prêt');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouveau prêt"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
          <button
            type="button"
            onClick={() => setIsITheBorrower(false)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              !isITheBorrower
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Je prête
          </button>
          <button
            type="button"
            onClick={() => setIsITheBorrower(true)}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isITheBorrower
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            J'emprunte
          </button>
        </div>

        {!isITheBorrower && (
          <Input
            label="Nom du bénéficiaire"
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            placeholder="Nom complet"
            required={!borrowerPhone.trim()}
          />
        )}
        {isITheBorrower && (
          <Input
            label="Nom du prêteur"
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            placeholder="Nom complet"
          />
        )}

        <Input
          label="Téléphone (optionnel)"
          value={borrowerPhone}
          onChange={(e) => setBorrowerPhone(e.target.value)}
          placeholder="+261 XX XX XXX XX"
          type="tel"
        />

        <Input
          label="Montant"
          value={amountInitial}
          onChange={(e) => setAmountInitial(e.target.value)}
          placeholder="0"
          type="number"
          min="1"
          currency={currency}
          required
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Devise</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'MGA' | 'EUR')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="MGA">MGA (Ariary)</option>
            <option value="EUR">EUR (Euro)</option>
          </select>
        </div>

        <Input
          label="Taux d'intérêt (%)"
          value={formRate}
          onChange={(e) => setFormRate(e.target.value)}
          placeholder="0"
          type="number"
          step="0.01"
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Fréquence des intérêts</label>
          <select
            value={formFrequency}
            onChange={(e) => setFormFrequency(e.target.value as InterestFrequency)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="daily">Journalier</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuel</option>
          </select>
        </div>

        <Input
          label="Date d'échéance (optionnel)"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          type="date"
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Description (optionnel)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Notes sur ce prêt..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Annuler
          </Button>
          <Button type="submit" variant="primary">
            Créer le prêt
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateLoanModal;
