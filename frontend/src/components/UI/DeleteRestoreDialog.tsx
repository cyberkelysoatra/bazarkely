import React from 'react'
import { Trash2 } from 'lucide-react'
import Modal from './Modal'

export type DeleteRestoreChoice = 'cancel' | 'delete' | 'restore'

export interface DeleteRestoreDialogProps {
  isOpen: boolean
  onChoice: (choice: DeleteRestoreChoice) => void
  title?: string
  message?: string
}

/**
 * Confirmation dialog for deleting a transaction with TWO confirm actions:
 * - "Supprimer": removes the transaction WITHOUT touching the account balance
 * - "Restituer": removes the transaction AND gives its amount back to the account
 */
const DeleteRestoreDialog: React.FC<DeleteRestoreDialogProps> = ({
  isOpen,
  onChoice,
  title = 'Supprimer cette transaction ?',
  message = 'Cette action est irréversible. Voulez-vous vraiment supprimer cette transaction ?'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => onChoice('cancel')}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 bg-red-100 rounded-lg flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-gray-600 flex-1">{message}</p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2 text-sm">
          <p className="text-gray-700">
            <span className="font-semibold">Supprimer</span> : retire l'opération mais
            <span className="font-medium"> ne modifie pas</span> le solde du compte.
          </p>
          <p className="text-gray-700">
            <span className="font-semibold text-green-700">Restituer</span> : retire l'opération
            <span className="font-medium"> et rend son montant au compte</span> (le solde est corrigé).
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => onChoice('cancel')}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onChoice('delete')}
            className="px-4 py-2 text-red-600 bg-white border border-red-300 hover:bg-red-50 rounded-lg font-medium transition-colors"
          >
            Supprimer
          </button>
          <button
            onClick={() => onChoice('restore')}
            className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-200"
          >
            Restituer
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteRestoreDialog
