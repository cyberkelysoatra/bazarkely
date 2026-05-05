import { useState, useEffect, useMemo } from 'react';
import { ArrowRightLeft, Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../UI/Modal';
import { CurrencyInput } from '../Currency';
import { useCurrency } from '../../hooks/useCurrency';
import { useFormatBalance } from '../../hooks/useFormatBalance';
import { useAppStore } from '../../stores/appStore';
import accountService from '../../services/accountService';
import transactionService from '../../services/transactionService';
import feeService from '../../services/feeService';
import { ACCOUNT_TYPES } from '../../constants';
import type { Account, CalculatedFees } from '../../types';

interface QuickTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationAccount: Account;
  shortfall: number;
  accounts: Account[];
  onSuccess: (refreshedAccounts: Account[]) => void;
}

const QuickTopUpModal: React.FC<QuickTopUpModalProps> = ({
  isOpen,
  onClose,
  destinationAccount,
  shortfall,
  accounts,
  onSuccess
}) => {
  const { user } = useAppStore();
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const { formatBalance } = useFormatBalance();

  const [fromAccountId, setFromAccountId] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [calculatedFees, setCalculatedFees] = useState<CalculatedFees | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleSources = useMemo(() => {
    return accounts.filter(acc => acc.id !== destinationAccount.id);
  }, [accounts, destinationAccount.id]);

  useEffect(() => {
    if (!isOpen) return;
    setAmount(shortfall.toString());
    setDescription(`Ravitaillement vers ${destinationAccount.name}`);
    setFromAccountId('');
    setCalculatedFees(null);
    setError(null);
  }, [isOpen, shortfall, destinationAccount.name]);

  useEffect(() => {
    const computeFees = async () => {
      if (!fromAccountId || !amount) {
        setCalculatedFees(null);
        return;
      }
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        setCalculatedFees(null);
        return;
      }
      const fromAccount = accounts.find(acc => acc.id === fromAccountId);
      if (!fromAccount) return;
      try {
        const fees = await feeService.calculateFees(
          fromAccount.type,
          destinationAccount.type,
          numAmount,
          false
        );
        setCalculatedFees(fees);
      } catch (err) {
        console.error('Erreur calcul frais:', err);
        setCalculatedFees(null);
      }
    };
    computeFees();
  }, [fromAccountId, amount, accounts, destinationAccount.type]);

  const fromAccount = accounts.find(acc => acc.id === fromAccountId);
  const numAmount = parseFloat(amount) || 0;
  const totalDebit = numAmount + (calculatedFees?.totalFees || 0);

  const sourceBalanceWarning = useMemo(() => {
    if (!fromAccount) return null;
    const accountTypeConfig = ACCOUNT_TYPES[fromAccount.type as keyof typeof ACCOUNT_TYPES];
    const allowNegative = accountTypeConfig?.allowNegative ?? false;
    if (allowNegative) return null;
    if (fromAccount.balance < totalDebit) {
      return `Solde insuffisant sur "${fromAccount.name}" (${formatBalance(fromAccount.balance)})`;
    }
    return null;
  }, [fromAccount, totalDebit, formatBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('Utilisateur non connecté');
      return;
    }
    if (!fromAccountId) {
      setError('Veuillez sélectionner un compte source');
      return;
    }
    if (numAmount <= 0) {
      setError('Le montant doit être positif');
      return;
    }
    if (numAmount < shortfall) {
      setError(`Le montant doit couvrir le manque (${formatBalance(shortfall)})`);
      return;
    }
    if (sourceBalanceWarning) {
      setError(sourceBalanceWarning);
      return;
    }

    setIsLoading(true);
    try {
      const result = await transactionService.createTransfer(user.id, {
        fromAccountId,
        toAccountId: destinationAccount.id,
        amount: numAmount,
        description,
        date: new Date(),
        originalCurrency: displayCurrency
      });

      if (!result.success) {
        const errMsg = result.error || 'Erreur lors du transfert';
        setError(errMsg);
        toast.error(errMsg, { duration: 5000 });
        return;
      }

      if (calculatedFees && calculatedFees.transferFee > 0) {
        await transactionService.createTransaction(user.id, {
          type: 'expense',
          amount: -calculatedFees.transferFee,
          description: 'Frais de transfert',
          category: 'autres',
          accountId: fromAccountId,
          date: new Date(),
          notes: 'Frais de ravitaillement',
          originalCurrency: displayCurrency,
          originalAmount: calculatedFees.transferFee
        });
      }

      const refreshedAccounts = await accountService.getAccounts();
      toast.success('Compte ravitaillé avec succès');
      onSuccess(refreshedAccounts);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ QuickTopUp failed:', err);
      setError(msg);
      toast.error(`Erreur : ${msg}`, { duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title="Ravitailler le compte"
      size="md"
      closeOnBackdropClick={!isLoading}
      closeOnEsc={!isLoading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            Le compte <strong>{destinationAccount.name}</strong> n'a pas assez de solde.
            Manque : <strong>{formatBalance(shortfall)}</strong>.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Compte de destination
          </label>
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{destinationAccount.name}</span>
            </div>
            <span className="text-sm text-gray-600">
              {formatBalance(destinationAccount.balance)}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="topup-from" className="block text-sm font-medium text-gray-700 mb-2">
            Compte source *
          </label>
          <select
            id="topup-from"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={isLoading}
          >
            <option value="">Sélectionner un compte source</option>
            {eligibleSources.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} - {formatBalance(acc.balance)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="topup-amount" className="block text-sm font-medium text-gray-700 mb-2">
            Montant à transférer *
          </label>
          <CurrencyInput
            id="topup-amount"
            value={amount}
            onChange={(value) => setAmount(value.toString())}
            currency={displayCurrency}
            onCurrencyChange={setDisplayCurrency}
            placeholder="0"
            required
            className="text-lg font-semibold"
          />
          <p className="text-xs text-gray-500 mt-1">
            Minimum : {formatBalance(shortfall)}
          </p>
        </div>

        <div>
          <label htmlFor="topup-desc" className="block text-sm font-medium text-gray-700 mb-2">
            Libellé
          </label>
          <input
            id="topup-desc"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={100}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>

        {fromAccount && numAmount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Montant transféré :</span>
              <span className="font-medium">{formatBalance(numAmount)}</span>
            </div>
            {calculatedFees && calculatedFees.totalFees > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Frais :</span>
                <span className="font-medium text-red-600">
                  -{formatBalance(calculatedFees.totalFees)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-blue-200 pt-1.5">
              <span className="text-gray-600">Total débité :</span>
              <span className="font-semibold text-blue-900">{formatBalance(totalDebit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nouveau solde destination :</span>
              <span className="font-semibold text-green-700">
                {formatBalance(destinationAccount.balance + numAmount)}
              </span>
            </div>
          </div>
        )}

        {sourceBalanceWarning && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {sourceBalanceWarning}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading || !fromAccountId || !!sourceBalanceWarning || numAmount < shortfall}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            <span>{isLoading ? 'Transfert...' : 'Ravitailler'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default QuickTopUpModal;
