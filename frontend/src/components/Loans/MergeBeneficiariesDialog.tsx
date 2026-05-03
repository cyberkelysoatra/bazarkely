import { useState } from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';

export interface MergeBeneficiariesDialogProps {
  isOpen: boolean;
  anchor: {
    name: string;
    userId: string | null;
    phone: string;
  };
  target: {
    name: string;
    userId: string | null;
    phone: string;
    loanCount: number;
  };
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const MergeBeneficiariesDialog = ({
  isOpen,
  anchor,
  target,
  onClose,
  onConfirm
}: MergeBeneficiariesDialogProps) => {
  const [submitting, setSubmitting] = useState(false);

  const phonesDiffer = (anchor.phone || '').trim() !== (target.phone || '').trim();
  const userIdsDiffer = (anchor.userId || null) !== (target.userId || null)
    && anchor.userId !== null
    && target.userId !== null;

  const loanLabel = target.loanCount > 1 ? `${target.loanCount} prêts` : '1 prêt';

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('[MergeBeneficiariesDialog] Erreur confirmation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fusionner ces prêts ?"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {submitting ? 'Fusion en cours…' : 'Confirmer la fusion'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-gray-800">
            <span className="font-semibold">{loanLabel}</span> de
            {' '}<span className="font-semibold">&laquo;&nbsp;{target.name}&nbsp;&raquo;</span>
            {' '}seront renommés en
            {' '}<span className="font-semibold">&laquo;&nbsp;{anchor.name}&nbsp;&raquo;</span>.
          </p>
        </div>

        {(phonesDiffer || userIdsDiffer) && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-semibold text-amber-900">Êtes-vous certain qu'il s'agit de la même personne ?</p>
                {userIdsDiffer && (
                  <p className="text-amber-800 text-xs">
                    • Ce sont deux <span className="font-semibold">utilisateurs distincts</span> de l'application.
                  </p>
                )}
                {phonesDiffer && (
                  <p className="text-amber-800 text-xs">
                    • Les <span className="font-semibold">numéros de contact diffèrent</span>
                    {' '}(ancre&nbsp;: {anchor.phone || '—'} / cible&nbsp;: {target.phone || '—'}).
                  </p>
                )}
                <p className="text-amber-800 text-xs italic mt-2">
                  La fusion est irréversible côté base de données.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default MergeBeneficiariesDialog;
