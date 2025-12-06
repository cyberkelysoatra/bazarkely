/**
 * Modal pour créer un nouveau groupe familial
 * Affiche un formulaire pour créer un groupe et montre le code d'invitation après création
 */

import React, { useState } from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Modal from '../UI/Modal';
import { createFamilyGroup } from '../../services/familyGroupService';
import type { CreateFamilyGroupInput } from '../../types/family';
import InviteCodeDisplay from './InviteCodeDisplay';

interface CreateFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateFamilyModal: React.FC<CreateFamilyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<{
    inviteCode: string;
    name: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Réinitialiser l'état quand le modal se ferme
  React.useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setCreatedGroup(null);
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!groupName.trim()) {
      setError('Le nom du groupe est requis');
      return;
    }

    if (groupName.length > 50) {
      setError('Le nom du groupe ne peut pas dépasser 50 caractères');
      return;
    }

    setIsLoading(true);

    try {
      const input: CreateFamilyGroupInput = {
        name: groupName.trim(),
      };

      const result = await createFamilyGroup(input);

      // Afficher le code d'invitation
      setCreatedGroup({
        inviteCode: result.inviteCode,
        name: result.name,
      });

      toast.success('Groupe familial créé avec succès !', {
        duration: 3000,
        icon: '✅',
      });

      // Appeler onSuccess après un court délai pour laisser voir le code
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err: any) {
      console.error('Erreur lors de la création du groupe:', err);
      const errorMessage =
        err?.message || 'Erreur lors de la création du groupe';
      setError(errorMessage);
      toast.error(errorMessage, {
        duration: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      closeOnBackdropClick={!isLoading}
      closeOnEsc={!isLoading}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Créer un groupe familial
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!createdGroup ? (
          /* Formulaire de création */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="groupName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nom du groupe <span className="text-red-500">*</span>
              </label>
              <input
                id="groupName"
                type="text"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  setError(null);
                }}
                placeholder="Ex: Famille Dupont"
                maxLength={50}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                {groupName.length}/50 caractères
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading || !groupName.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <span>Créer le groupe</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Affichage du code d'invitation */
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <p className="text-sm font-medium text-green-800">
                  Groupe créé avec succès !
                </p>
              </div>
              <p className="text-sm text-green-700">
                Partagez ce code d'invitation avec les membres de votre famille
                pour qu'ils rejoignent le groupe.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Code d'invitation
              </label>
              <InviteCodeDisplay
                code={createdGroup.inviteCode}
                groupName={createdGroup.name}
              />
            </div>

            <div className="flex items-center justify-end pt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CreateFamilyModal;

