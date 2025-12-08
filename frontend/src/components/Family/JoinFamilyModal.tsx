/**
 * Modal pour rejoindre un groupe familial existant
 * Permet de saisir un code d'invitation et affiche un aperçu du groupe avant de rejoindre
 */

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, CheckCircle, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../UI/Modal';
import {
  getFamilyGroupByCode,
  joinFamilyGroup,
} from '../../services/familyGroupService';
import type { JoinFamilyGroupInput } from '../../types/family';

interface JoinFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const JoinFamilyModal: React.FC<JoinFamilyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupPreview, setGroupPreview] = useState<{
    name: string;
    memberCount: number;
    id: string;
  } | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInviteCode('');
      setDisplayName('');
      setGroupPreview(null);
      setError(null);
      setIsLoading(false);
      setIsValidatingCode(false);
    }
  }, [isOpen]);

  // Valider le format du code (6 caractères, uppercase, pas I/O/0/1)
  const validateCodeFormat = (code: string): boolean => {
    if (code.length !== 6) return false;
    const invalidChars = /[IO01]/;
    return !invalidChars.test(code) && /^[A-Z0-9]{6}$/.test(code);
  };

  // Normaliser le code (uppercase, supprimer espaces)
  const normalizeCode = (code: string): string => {
    return code.toUpperCase().replace(/\s/g, '').replace(/[IO01]/g, '');
  };

  // Rechercher le groupe par code
  const handleCodeChange = async (code: string) => {
    const normalized = normalizeCode(code);
    setInviteCode(normalized);

    if (normalized.length === 6 && validateCodeFormat(normalized)) {
      setIsValidatingCode(true);
      setError(null);

      try {
        const group = await getFamilyGroupByCode(normalized);
        if (group) {
          setGroupPreview({
            name: group.name,
            memberCount: group.memberCount,
            id: group.id,
          });
        } else {
          setGroupPreview(null);
          setError('Code d\'invitation invalide ou expiré');
        }
      } catch (err: any) {
        console.error('❌ [JoinFamily] Error validating code:', err);
        setGroupPreview(null);
        setError('Erreur lors de la validation du code');
      } finally {
        setIsValidatingCode(false);
      }
    } else if (normalized.length > 0) {
      setGroupPreview(null);
      if (normalized.length < 6) {
        setError(null); // Pas d'erreur tant que le code n'est pas complet
      } else {
        setError('Format de code invalide (6 caractères, sans I/O/0/1)');
      }
    } else {
      setGroupPreview(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!inviteCode || !validateCodeFormat(inviteCode)) {
      setError('Veuillez saisir un code d\'invitation valide');
      return;
    }

    if (!groupPreview) {
      setError('Code d\'invitation invalide');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const input: JoinFamilyGroupInput = {
        familyGroupId: groupPreview.id,
        invitationCode: inviteCode,
      };

      await joinFamilyGroup(input);

      // Toast de succès
      toast.success(
        `Vous avez rejoint le groupe "${groupPreview.name}" avec succès !`,
        {
          duration: 3000,
        }
      );

      // Fermer le modal et appeler onSuccess pour rafraîchir les groupes
      onClose();
      if (onSuccess) {
        // Petit délai pour laisser voir le toast
        setTimeout(() => {
          onSuccess();
        }, 300);
      }
    } catch (err: any) {
      console.error('❌ [JoinFamily] Error:', err);
      console.error('❌ [JoinFamily] Error details:', {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
        fullError: err,
      });
      
      // Messages d'erreur spécifiques et user-friendly
      let errorMessage = 'Erreur lors de la jointure au groupe';
      
      if (err?.message) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes('déjà membre') || errMsg.includes('already member')) {
          errorMessage = 'Vous êtes déjà membre de ce groupe';
        } else if (errMsg.includes('invalide') || errMsg.includes('invalid') || errMsg.includes('expiré') || errMsg.includes('expired')) {
          errorMessage = 'Code d\'invitation invalide ou expiré';
        } else if (errMsg.includes('non authentifié') || errMsg.includes('not authenticated')) {
          errorMessage = 'Vous devez être connecté pour rejoindre un groupe';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isValidatingCode) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      closeOnBackdropClick={!isLoading && !isValidatingCode}
      closeOnEsc={!isLoading && !isValidatingCode}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Rejoindre un groupe familial
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading || isValidatingCode}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code d'invitation */}
          <div>
            <label
              htmlFor="inviteCode"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Code d'invitation <span className="text-red-500">*</span>
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABC123"
              maxLength={6}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-center text-lg tracking-widest uppercase"
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              6 caractères (sans I, O, 0, 1)
            </p>
          </div>

          {/* Aperçu du groupe */}
          {groupPreview && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {groupPreview.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {groupPreview.memberCount} membre
                    {groupPreview.memberCount > 1 ? 's' : ''}
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          )}

          {/* Nom d'affichage (optionnel) */}
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Nom d'affichage (optionnel)
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom dans le groupe"
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ce nom sera visible par les autres membres du groupe
            </p>
          </div>

          {/* Validation en cours */}
          {isValidatingCode && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Vérification du code...</span>
            </div>
          )}

          {/* Erreur */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading || isValidatingCode}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                isValidatingCode ||
                !groupPreview ||
                !validateCodeFormat(inviteCode)
              }
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rejoindre...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Rejoindre le groupe</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default JoinFamilyModal;


