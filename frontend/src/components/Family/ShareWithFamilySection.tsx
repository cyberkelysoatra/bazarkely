import React, { useState, useEffect } from 'react';
import { Users, Share2, Lock, AlertCircle } from 'lucide-react';
import * as familyGroupService from '../../services/familyGroupService';
import type { FamilyGroup } from '../../types/family';

interface ShareWithFamilySectionProps {
  transactionId?: string; // Optional for new transactions
  familyGroups: FamilyGroup[];
  selectedGroupId: string | null;
  onShareChange: (data: {
    isShared: boolean;
    groupId: string | null;
    requestReimbursement: boolean;
  }) => void;
  transactionType?: 'income' | 'expense' | 'transfer';
  transactionCategory?: string;
  userSharingMode?: 'selective' | 'share_all';
  disabled?: boolean;
}

const ShareWithFamilySection: React.FC<ShareWithFamilySectionProps> = ({
  transactionId,
  familyGroups,
  selectedGroupId: initialSelectedGroupId,
  onShareChange,
  transactionType = 'expense',
  transactionCategory,
  userSharingMode = 'selective',
  disabled = false,
}) => {
  const [isShared, setIsShared] = useState<boolean>(userSharingMode === 'share_all');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    initialSelectedGroupId || (familyGroups.length > 0 ? familyGroups[0].id : null)
  );
  const [requestReimbursement, setRequestReimbursement] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const isLoanFamilyContext = ['loan', 'loan_received', 'loan_repayment', 'loan_repayment_received'].includes(transactionCategory || '');
  const isLoanCreationContext = transactionCategory === 'loan' || transactionCategory === 'loan_received';

  // Update parent when state changes
  useEffect(() => {
    onShareChange({
      isShared,
      groupId: selectedGroupId,
      requestReimbursement: requestReimbursement && isShared,
    });
  }, [isShared, selectedGroupId, requestReimbursement, onShareChange]);

  const handleShareToggle = (checked: boolean) => {
    setIsShared(checked);
    if (!checked) {
      setRequestReimbursement(false);
    }
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value || null;
    setSelectedGroupId(groupId);
    if (groupId) {
      setIsShared(true);
    }
  };

  // For loan categories, hide privacy/reimbursement toggles and keep sharing on.
  useEffect(() => {
    if (isLoanFamilyContext) {
      if (selectedGroupId) {
        setIsShared(true);
      }
      setRequestReimbursement(false);
    }
  }, [isLoanFamilyContext, selectedGroupId]);

  // If user has no family groups
  if (familyGroups.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 mb-1">
              Partage avec la famille
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Créez ou rejoignez un groupe familial pour partager vos transactions.
            </p>
            <button
              type="button"
              onClick={() => {
                // Navigate to family groups page - adjust route as needed
                window.location.href = '/family';
              }}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              Gérer les groupes familiaux →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isShareAllMode = userSharingMode === 'share_all';
  const toggleLabel = isShareAllMode
    ? (isShared ? 'Garder privé' : 'Partager avec la famille')
    : (isShared ? 'Partager avec la famille' : 'Garder privé');

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-5 h-5 text-purple-600" />
        <h3 className="text-sm font-semibold text-gray-900">
          Partage avec la famille
        </h3>
      </div>
      {isLoanCreationContext && (
        <p className="text-xs text-purple-700 mb-4">
          Permettre aux membres sélectionnés de suivre ce prêt et ses remboursements.
        </p>
      )}

      {/* Family Group Selection */}
      <div className="mb-4">
        <label htmlFor="familyGroup" className="block text-xs font-medium text-gray-700 mb-2">
          Groupe familial
        </label>
        <select
          id="familyGroup"
          value={selectedGroupId || ''}
          onChange={handleGroupChange}
          disabled={disabled || isLoading}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <option value="">Sélectionner un groupe</option>
          {familyGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {/* Share Toggle */}
      {!isLoanFamilyContext && (
        <div className="mb-4">
          <label className="relative inline-flex items-center cursor-pointer w-full">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => handleShareToggle(e.target.checked)}
              disabled={disabled || isLoading || !selectedGroupId}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            <div className="ml-3 flex items-center gap-2 flex-1">
              {isShared ? (
                <Share2 className="w-4 h-4 text-purple-600" />
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
              <span className={`text-sm ${isShared ? 'text-purple-700 font-medium' : 'text-gray-600'}`}>
                {toggleLabel}
              </span>
            </div>
          </label>
          {!selectedGroupId && (
            <p className="text-xs text-gray-500 mt-1 ml-14">
              Sélectionnez d'abord un groupe familial
            </p>
          )}
        </div>
      )}

      {/* Request Reimbursement (only for expenses) */}
      {transactionType === 'expense' && !isLoanFamilyContext && (
        <div className="mb-2">
          <label className="relative inline-flex items-center cursor-pointer w-full">
            <input
              type="checkbox"
              checked={requestReimbursement}
              onChange={(e) => setRequestReimbursement(e.target.checked)}
              disabled={disabled || isLoading || !isShared}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            <div className="ml-3 flex items-center gap-2 flex-1">
              <span className={`text-sm ${requestReimbursement ? 'text-purple-700 font-medium' : 'text-gray-600'}`}>
                Demander un remboursement
              </span>
            </div>
          </label>
          {!isShared && (
            <p className="text-xs text-gray-500 mt-1 ml-14">
              Activez le partage pour demander un remboursement
            </p>
          )}
        </div>
      )}

      {/* Info message */}
      {isShareAllMode && isShared && (
        <div className="mt-3 flex items-start gap-2 p-2 bg-purple-100 rounded text-xs text-purple-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Mode "Tout partager" activé. Cette transaction sera partagée par défaut.
          </p>
        </div>
      )}
    </div>
  );
};

export default ShareWithFamilySection;

