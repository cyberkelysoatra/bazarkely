import React, { useState } from 'react';
import { Share2, Lock } from 'lucide-react';
import * as familySharingService from '../../services/familySharingService';

interface ShareTransactionToggleProps {
  transactionId: string;
  familyGroupId: string;
  isShared: boolean;
  onToggle?: (isShared: boolean) => void;
  disabled?: boolean;
  familyGroupName?: string;
}

const ShareTransactionToggle: React.FC<ShareTransactionToggleProps> = ({
  transactionId,
  familyGroupId,
  isShared: initialIsShared,
  onToggle,
  disabled = false,
  familyGroupName = 'Famille',
}) => {
  const [isShared, setIsShared] = useState(initialIsShared);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isLoading) return;

    const newValue = e.target.checked;
    setIsLoading(true);
    setError(null);

    try {
      if (newValue) {
        await familySharingService.shareTransaction(transactionId, familyGroupId);
      } else {
        await familySharingService.unshareTransaction(transactionId, familyGroupId);
      }

      setIsShared(newValue);
      onToggle?.(newValue);
    } catch (err) {
      console.error('Error toggling transaction share:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du partage');
      // Revert to previous state on error
      setIsShared(!newValue);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={isShared}
          onChange={handleToggle}
          disabled={disabled || isLoading}
          className="sr-only peer"
          aria-label={isShared ? `Ne plus partager avec ${familyGroupName}` : `Partager avec ${familyGroupName}`}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
      </label>

      <div className="flex items-center gap-2">
        {isShared ? (
          <Share2 className="w-4 h-4 text-purple-600" />
        ) : (
          <Lock className="w-4 h-4 text-gray-400" />
        )}
        <span className={`text-sm ${isShared ? 'text-purple-700 font-medium' : 'text-gray-600'}`}>
          {isShared ? `Partagé avec ${familyGroupName}` : `Privé`}
        </span>
        {isLoading && (
          <span className="text-xs text-gray-500 animate-pulse">...</span>
        )}
      </div>

      {error && (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};

export default ShareTransactionToggle;

